import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  Legend,
} from 'recharts';
import { BarChart3, TrendingUp, Calendar } from 'lucide-react';
import { useMantleUser, useExecutionHistory } from '@/hooks/useMantle';
import { formatUnits } from 'viem';

type ChartType = 'cumulative' | 'perExecution' | 'cost';
type TimeRange = '7d' | '30d' | 'all';

interface ChartDataPoint {
  date: string;
  timestamp: number;
  amountIn: number;
  amountOut: number;
  cumulativeIn: number;
  cumulativeOut: number;
  avgCost: number;
  executionNumber: number;
}

export function ExecutionChart() {
  const { user } = useMantleUser();
  const { executions, loading } = useExecutionHistory(user.address);
  const [chartType, setChartType] = useState<ChartType>('cumulative');
  const [timeRange, setTimeRange] = useState<TimeRange>('all');

  // Process execution data for charts
  const chartData = useMemo(() => {
    if (!executions || executions.length === 0) return [];

    // Sort by execution number
    const sorted = [...executions].sort(
      (a, b) => Number(a.executionNumber) - Number(b.executionNumber)
    );

    let cumulativeIn = 0;
    let cumulativeOut = 0;

    return sorted.map((exec, index) => {
      const amountIn = Number(formatUnits(exec.amountIn, 18));
      const amountOut = Number(formatUnits(exec.amountOut, 18));
      
      cumulativeIn += amountIn;
      cumulativeOut += amountOut;

      // Calculate average cost
      const avgCost = cumulativeOut > 0 ? cumulativeIn / cumulativeOut : 0;

      // Generate a date based on execution number (mock for demo)
      const baseDate = new Date();
      baseDate.setDate(baseDate.getDate() - (sorted.length - index - 1));

      return {
        date: baseDate.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' }),
        timestamp: baseDate.getTime(),
        amountIn,
        amountOut,
        cumulativeIn,
        cumulativeOut,
        avgCost,
        executionNumber: Number(exec.executionNumber),
      };
    });
  }, [executions]);

  // Filter data by time range
  const filteredData = useMemo(() => {
    if (timeRange === 'all') return chartData;

    const now = Date.now();
    const days = timeRange === '7d' ? 7 : 30;
    const cutoff = now - days * 24 * 60 * 60 * 1000;

    return chartData.filter((d) => d.timestamp >= cutoff);
  }, [chartData, timeRange]);

  // Custom tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload || !payload.length) return null;

    return (
      <div className="bg-background/95 backdrop-blur-sm border border-border rounded-lg p-3 shadow-lg">
        <p className="text-sm font-medium mb-2">{label}</p>
        {payload.map((entry: any, index: number) => (
          <div key={index} className="flex items-center gap-2 text-xs">
            <div
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-foreground/70">{entry.name}:</span>
            <span className="font-medium">
              {typeof entry.value === 'number' 
                ? entry.value < 1 
                  ? entry.value.toFixed(6) 
                  : entry.value.toFixed(2)
                : entry.value}
            </span>
          </div>
        ))}
      </div>
    );
  };

  const renderChart = () => {
    if (filteredData.length === 0) {
      return (
        <div className="h-[300px] flex items-center justify-center">
          <div className="text-center">
            <BarChart3 className="w-12 h-12 text-foreground/20 mx-auto mb-3" />
            <p className="text-sm text-foreground/50">暂无执行数据</p>
            <p className="text-xs text-foreground/40 mt-1">
              创建定投计划后，图表将在这里显示
            </p>
          </div>
        </div>
      );
    }

    switch (chartType) {
      case 'cumulative':
        return (
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={filteredData}>
              <defs>
                <linearGradient id="colorIn" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorOut" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#333" />
              <XAxis 
                dataKey="date" 
                stroke="#666" 
                fontSize={12}
                tickLine={false}
              />
              <YAxis 
                stroke="#666" 
                fontSize={12}
                tickLine={false}
                tickFormatter={(value) => `$${value}`}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Area
                type="monotone"
                dataKey="cumulativeIn"
                name="累计投入 (USD)"
                stroke="#8b5cf6"
                fill="url(#colorIn)"
                strokeWidth={2}
              />
              <Area
                type="monotone"
                dataKey="cumulativeOut"
                name="累计获得 (ETH)"
                stroke="#22c55e"
                fill="url(#colorOut)"
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        );

      case 'perExecution':
        return (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={filteredData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#333" />
              <XAxis 
                dataKey="executionNumber" 
                stroke="#666" 
                fontSize={12}
                tickLine={false}
                label={{ value: '执行次数', position: 'bottom', fill: '#666' }}
              />
              <YAxis 
                stroke="#666" 
                fontSize={12}
                tickLine={false}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Bar 
                dataKey="amountIn" 
                name="投入 (USD)" 
                fill="#8b5cf6" 
                radius={[4, 4, 0, 0]}
              />
              <Bar 
                dataKey="amountOut" 
                name="获得 (ETH)" 
                fill="#22c55e" 
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        );

      case 'cost':
        return (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={filteredData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#333" />
              <XAxis 
                dataKey="date" 
                stroke="#666" 
                fontSize={12}
                tickLine={false}
              />
              <YAxis 
                stroke="#666" 
                fontSize={12}
                tickLine={false}
                tickFormatter={(value) => `$${value}`}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Line
                type="monotone"
                dataKey="avgCost"
                name="平均成本 (USD/ETH)"
                stroke="#f59e0b"
                strokeWidth={2}
                dot={{ fill: '#f59e0b', strokeWidth: 2 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        );

      default:
        return null;
    }
  };

  return (
    <Card className="glass-card border border-border/30">
      <CardHeader>
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center glow-primary-sm">
              <BarChart3 className="w-5 h-5 text-primary" />
            </div>
            <div>
              <CardTitle className="tracking-tight">执行图表</CardTitle>
              <CardDescription className="text-foreground/60">
                定投执行数据可视化
              </CardDescription>
            </div>
          </div>

          {/* Chart Type Selector */}
          <div className="flex gap-2">
            <Button
              variant={chartType === 'cumulative' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setChartType('cumulative')}
              className="text-xs"
            >
              累计趋势
            </Button>
            <Button
              variant={chartType === 'perExecution' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setChartType('perExecution')}
              className="text-xs"
            >
              每次执行
            </Button>
            <Button
              variant={chartType === 'cost' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setChartType('cost')}
              className="text-xs"
            >
              平均成本
            </Button>
          </div>
        </div>

        {/* Time Range Selector */}
        {chartData.length > 0 && (
          <div className="flex gap-2 mt-4">
            <Badge
              variant={timeRange === '7d' ? 'default' : 'outline'}
              className="cursor-pointer"
              onClick={() => setTimeRange('7d')}
            >
              7天
            </Badge>
            <Badge
              variant={timeRange === '30d' ? 'default' : 'outline'}
              className="cursor-pointer"
              onClick={() => setTimeRange('30d')}
            >
              30天
            </Badge>
            <Badge
              variant={timeRange === 'all' ? 'default' : 'outline'}
              className="cursor-pointer"
              onClick={() => setTimeRange('all')}
            >
              全部
            </Badge>
          </div>
        )}
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="h-[300px] flex items-center justify-center">
            <p className="text-sm text-foreground/50">加载图表数据中...</p>
          </div>
        ) : (
          renderChart()
        )}
      </CardContent>
    </Card>
  );
}

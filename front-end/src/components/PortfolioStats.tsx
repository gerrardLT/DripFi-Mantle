import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  PieChart, 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Target,
  Activity,
  Percent
} from 'lucide-react';
import { useMantleUser, useUserPlans, useExecutionHistory } from '@/hooks/useMantle';
import { usePrices, formatPrice } from '@/hooks/usePrices';
import { publicClient, CONTRACTS } from '@/lib/mantle-config';
import { DCAStrategyABI } from '@/lib/abis';
import { formatUnits } from 'viem';

interface PlanStats {
  planId: bigint;
  totalAmountIn: bigint;
  totalAmountOut: bigint;
  executionCount: bigint;
}

interface PortfolioSummary {
  totalInvested: number;
  totalReceived: number;
  totalExecutions: number;
  averageCost: number;
  profitLoss: number;
  profitLossPercent: number;
}

export function PortfolioStats() {
  const { user } = useMantleUser();
  const { planIds } = useUserPlans(user.address);
  const { executions } = useExecutionHistory(user.address);
  const { prices } = usePrices();
  const [summary, setSummary] = useState<PortfolioSummary>({
    totalInvested: 0,
    totalReceived: 0,
    totalExecutions: 0,
    averageCost: 0,
    profitLoss: 0,
    profitLossPercent: 0,
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const calculateStats = async () => {
      if (!planIds || planIds.length === 0) {
        setSummary({
          totalInvested: 0,
          totalReceived: 0,
          totalExecutions: 0,
          averageCost: 0,
          profitLoss: 0,
          profitLossPercent: 0,
        });
        return;
      }

      setLoading(true);
      try {
        // Fetch plan details to get totalAmountIn and totalAmountOut
        const planPromises = planIds.map(async (planId) => {
          try {
            const plan = await publicClient.readContract({
              address: CONTRACTS.DCA_STRATEGY,
              abi: DCAStrategyABI,
              functionName: 'getPlan',
              args: [planId],
            }) as any;

            return {
              planId,
              totalAmountIn: plan.totalAmountIn || 0n,
              totalAmountOut: plan.totalAmountOut || 0n,
              executionCount: plan.executionCount || plan.totalExecutions || 0n,
            };
          } catch (error) {
            console.error(`Error fetching plan ${planId}:`, error);
            return null;
          }
        });

        const planResults = (await Promise.all(planPromises)).filter(Boolean) as PlanStats[];

        // Calculate totals
        let totalIn = 0n;
        let totalOut = 0n;
        let totalExecs = 0n;

        for (const plan of planResults) {
          totalIn += plan.totalAmountIn;
          totalOut += plan.totalAmountOut;
          totalExecs += plan.executionCount;
        }

        // Convert to numbers (assuming 18 decimals for simplicity)
        const totalInvested = Number(formatUnits(totalIn, 18));
        const totalReceived = Number(formatUnits(totalOut, 18));
        const totalExecutions = Number(totalExecs);

        // Calculate average cost (if we have received tokens)
        const averageCost = totalReceived > 0 ? totalInvested / totalReceived : 0;

        // Calculate profit/loss using current WETH price
        const currentPrice = prices['WETH']?.price || 3450;
        const currentValue = totalReceived * currentPrice;
        const profitLoss = currentValue - totalInvested;
        const profitLossPercent = totalInvested > 0 
          ? ((currentValue - totalInvested) / totalInvested) * 100 
          : 0;

        setSummary({
          totalInvested,
          totalReceived,
          totalExecutions,
          averageCost,
          profitLoss,
          profitLossPercent,
        });
      } catch (error) {
        console.error('Error calculating stats:', error);
      } finally {
        setLoading(false);
      }
    };

    calculateStats();
  }, [planIds, prices]);

  const isProfit = summary.profitLoss >= 0;

  return (
    <Card className="glass-card border border-border/30">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center glow-accent-sm">
            <PieChart className="w-5 h-5 text-accent" />
          </div>
          <div>
            <CardTitle className="tracking-tight">收益统计</CardTitle>
            <CardDescription className="text-foreground/60">
              您的定投收益概览
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Main Stats Grid */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          {/* Total Invested */}
          <div className="p-4 rounded-xl bg-secondary/30 border border-border/40">
            <div className="flex items-center gap-2 text-foreground/60 text-xs mb-2">
              <DollarSign className="w-3 h-3" />
              总投入
            </div>
            <div className="text-xl font-bold">
              ${formatPrice(summary.totalInvested)}
            </div>
          </div>

          {/* Total Received */}
          <div className="p-4 rounded-xl bg-secondary/30 border border-border/40">
            <div className="flex items-center gap-2 text-foreground/60 text-xs mb-2">
              <Target className="w-3 h-3" />
              总获得
            </div>
            <div className="text-xl font-bold">
              {summary.totalReceived.toFixed(6)} ETH
            </div>
          </div>

          {/* Average Cost */}
          <div className="p-4 rounded-xl bg-secondary/30 border border-border/40">
            <div className="flex items-center gap-2 text-foreground/60 text-xs mb-2">
              <Activity className="w-3 h-3" />
              平均成本
            </div>
            <div className="text-xl font-bold">
              ${formatPrice(summary.averageCost)}
            </div>
          </div>

          {/* Total Executions */}
          <div className="p-4 rounded-xl bg-secondary/30 border border-border/40">
            <div className="flex items-center gap-2 text-foreground/60 text-xs mb-2">
              <Percent className="w-3 h-3" />
              执行次数
            </div>
            <div className="text-xl font-bold">
              {summary.totalExecutions}
            </div>
          </div>
        </div>

        {/* Profit/Loss Card */}
        <div className={`p-5 rounded-xl border ${
          isProfit 
            ? 'bg-green-500/10 border-green-500/30' 
            : 'bg-red-500/10 border-red-500/30'
        }`}>
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-foreground/70">收益/亏损</span>
            <Badge
              variant={isProfit ? 'default' : 'destructive'}
              className={`${
                isProfit 
                  ? 'bg-green-500/20 text-green-400' 
                  : 'bg-red-500/20 text-red-400'
              }`}
            >
              {isProfit ? (
                <TrendingUp className="w-3 h-3 mr-1" />
              ) : (
                <TrendingDown className="w-3 h-3 mr-1" />
              )}
              {isProfit ? '+' : ''}{summary.profitLossPercent.toFixed(2)}%
            </Badge>
          </div>
          <div className={`text-3xl font-bold ${
            isProfit ? 'text-green-400' : 'text-red-400'
          }`}>
            {isProfit ? '+' : ''}${formatPrice(Math.abs(summary.profitLoss))}
          </div>
          <div className="text-xs text-foreground/50 mt-2">
            基于当前 ETH 价格计算
          </div>
        </div>

        {/* Info */}
        {summary.totalExecutions === 0 && (
          <div className="mt-4 p-4 rounded-xl bg-secondary/20 border border-border/30 text-center">
            <p className="text-sm text-foreground/60">
              暂无执行记录。创建定投计划后，收益数据将在这里显示。
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { History, ExternalLink, TrendingUp, Coins } from 'lucide-react';
import { useMantleUser, useExecutionHistory } from '@/hooks/useMantle';
import { Badge } from '@/components/ui/badge';
import { formatUnits } from 'viem';
import { CURRENT_CHAIN } from '@/lib/mantle-config';

export function ExecutionHistory() {
  const { user } = useMantleUser();
  const { executions, loading } = useExecutionHistory(user.address);

  const explorerUrl = CURRENT_CHAIN.blockExplorers.default.url;

  return (
    <Card className="glass-card border border-border/30">
      <CardHeader>
        <CardTitle className="flex items-center gap-3 tracking-tight">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center glow-primary-sm">
            <History className="w-5 h-5 text-primary" />
          </div>
          执行历史
        </CardTitle>
        <CardDescription className="text-foreground/60 tracking-wide">
          {executions.length > 0
            ? `已完成 ${executions.length} 次执行`
            : '暂无执行记录'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="p-8 text-center">
            <p className="text-sm text-foreground/60">加载执行历史中...</p>
          </div>
        ) : executions.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-sm text-foreground/60 mb-4">
              暂无执行记录。创建计划后，Chainlink Automation 将自动执行定投。
            </p>
            <a
              href={`${explorerUrl}/address/0x167Be96F03aBd2Ab7476bB4e38d5b17bCA1E2b7E`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline text-sm inline-flex items-center gap-1"
            >
              在 Mantlescan 查看合约 <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        ) : (
          <div className="space-y-3">
            {executions.map((execution, index) => {
              const amountIn = formatUnits(execution.amountIn, 18);
              const amountOut = formatUnits(execution.amountOut, 18);

              return (
                <div
                  key={`${execution.transactionHash}-${index}`}
                  className="p-4 rounded-xl border border-border/40 bg-secondary/20 hover:bg-secondary/30 transition-colors"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        计划 #{execution.planId.toString()}
                      </Badge>
                      <Badge variant="secondary" className="text-xs">
                        第 {execution.executionNumber.toString()} 次
                      </Badge>
                    </div>
                    <a
                      href={`${explorerUrl}/tx/${execution.transactionHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline text-xs inline-flex items-center gap-1"
                    >
                      查看交易 <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <div className="flex items-center text-foreground/60 text-xs mb-1">
                        <TrendingUp className="w-3 h-3 mr-1" />
                        支出
                      </div>
                      <div className="font-semibold">{parseFloat(amountIn).toFixed(4)}</div>
                    </div>
                    <div>
                      <div className="flex items-center text-foreground/60 text-xs mb-1">
                        <Coins className="w-3 h-3 mr-1" />
                        获得
                      </div>
                      <div className="font-semibold">{parseFloat(amountOut).toFixed(6)}</div>
                    </div>
                  </div>

                  <div className="mt-2 text-xs text-foreground/50">
                    区块 #{execution.blockNumber.toString()}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

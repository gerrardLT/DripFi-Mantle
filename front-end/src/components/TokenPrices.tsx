import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { TrendingUp, TrendingDown, RefreshCw, DollarSign } from 'lucide-react';
import { usePrices, formatPrice, formatChange } from '@/hooks/usePrices';
import { SUPPORTED_TOKENS } from '@/lib/tokens';

export function TokenPrices() {
  const { prices, loading, refetch } = usePrices(30000); // Refresh every 30s

  const tokenList = Object.entries(SUPPORTED_TOKENS).map(([symbol, token]) => ({
    ...token,
    price: prices[symbol]?.price || 0,
    change24h: prices[symbol]?.change24h || 0,
  }));

  return (
    <Card className="glass-card border border-border/30">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center glow-primary-sm">
              <DollarSign className="w-5 h-5 text-primary" />
            </div>
            <div>
              <CardTitle className="tracking-tight">实时价格</CardTitle>
              <CardDescription className="text-foreground/60">
                支持的代币价格
              </CardDescription>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={refetch}
            disabled={loading}
            className="h-8 w-8"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {tokenList.map((token) => {
            const isPositive = token.change24h >= 0;
            
            return (
              <div
                key={token.symbol}
                className="flex items-center justify-between p-3 rounded-xl border border-border/40 bg-secondary/20 hover:bg-secondary/30 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <img
                    src={token.logoUrl}
                    alt={token.symbol}
                    className="w-8 h-8 rounded-full"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = 'https://via.placeholder.com/32';
                    }}
                  />
                  <div>
                    <div className="font-semibold text-sm">{token.symbol}</div>
                    <div className="text-xs text-foreground/50">{token.name}</div>
                  </div>
                </div>
                
                <div className="text-right">
                  <div className="font-semibold">
                    ${formatPrice(token.price, token.price < 1 ? 4 : 2)}
                  </div>
                  <div className="flex items-center justify-end gap-1">
                    {isPositive ? (
                      <TrendingUp className="w-3 h-3 text-green-400" />
                    ) : (
                      <TrendingDown className="w-3 h-3 text-red-400" />
                    )}
                    <span
                      className={`text-xs font-medium ${
                        isPositive ? 'text-green-400' : 'text-red-400'
                      }`}
                    >
                      {formatChange(token.change24h)}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-4 text-center text-xs text-foreground/40">
          数据来源: CoinGecko API
        </div>
      </CardContent>
    </Card>
  );
}

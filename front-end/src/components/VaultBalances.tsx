import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Wallet, ArrowUpRight, ArrowDownLeft, RefreshCw, ExternalLink } from 'lucide-react';
import { useMantleUser } from '@/hooks/useMantle';
import { usePrices, formatPrice, formatChange } from '@/hooks/usePrices';
import { SUPPORTED_TOKENS, formatTokenAmount } from '@/lib/tokens';
import { publicClient, CONTRACTS, CURRENT_CHAIN } from '@/lib/mantle-config';
import { DCAVaultABI } from '@/lib/abis';
import type { Address } from 'viem';

interface VaultBalance {
  symbol: string;
  balance: bigint;
  decimals: number;
  usdValue: number;
}

export function VaultBalances() {
  const { user } = useMantleUser();
  const { prices, loading: pricesLoading, refetch: refetchPrices } = usePrices();
  const [balances, setBalances] = useState<VaultBalance[]>([]);
  const [loading, setLoading] = useState(false);
  const [totalUsdValue, setTotalUsdValue] = useState(0);

  const fetchBalances = async () => {
    if (!user.address) return;
    
    setLoading(true);
    try {
      const balancePromises = Object.entries(SUPPORTED_TOKENS).map(async ([symbol, token]) => {
        try {
          const balance = await publicClient.readContract({
            address: CONTRACTS.DCA_VAULT,
            abi: DCAVaultABI,
            functionName: 'getBalance',
            args: [user.address as Address, token.address],
          }) as bigint;

          const price = prices[symbol]?.price || 0;
          const balanceNum = Number(balance) / Math.pow(10, token.decimals);
          const usdValue = balanceNum * price;

          return {
            symbol,
            balance,
            decimals: token.decimals,
            usdValue,
          };
        } catch (error) {
          console.error(`Error fetching balance for ${symbol}:`, error);
          return {
            symbol,
            balance: 0n,
            decimals: token.decimals,
            usdValue: 0,
          };
        }
      });

      const results = await Promise.all(balancePromises);
      setBalances(results);
      
      const total = results.reduce((sum, b) => sum + b.usdValue, 0);
      setTotalUsdValue(total);
    } catch (error) {
      console.error('Error fetching balances:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user.address && Object.keys(prices).length > 0) {
      fetchBalances();
    }
  }, [user.address, prices]);

  const handleRefresh = () => {
    refetchPrices();
    fetchBalances();
  };

  const explorerUrl = CURRENT_CHAIN.blockExplorers.default.url;

  return (
    <Card className="glass-card border border-border/30">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center glow-accent-sm">
              <Wallet className="w-5 h-5 text-accent" />
            </div>
            <div>
              <CardTitle className="tracking-tight">Vault 余额</CardTitle>
              <CardDescription className="text-foreground/60">
                您在 DCA Vault 中的资产
              </CardDescription>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleRefresh}
            disabled={loading || pricesLoading}
            className="h-8 w-8"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {/* Total Value */}
        <div className="mb-6 p-4 rounded-xl bg-gradient-to-r from-primary/10 to-accent/10 border border-border/40">
          <div className="text-sm text-foreground/60 mb-1">总价值 (USD)</div>
          <div className="text-3xl font-bold gradient-text">
            ${formatPrice(totalUsdValue)}
          </div>
        </div>

        {/* Token Balances */}
        <div className="space-y-3">
          {balances.map((item) => {
            const token = SUPPORTED_TOKENS[item.symbol];
            const price = prices[item.symbol];
            const balanceFormatted = formatTokenAmount(item.balance, item.decimals, 6);
            const hasBalance = item.balance > 0n;

            return (
              <div
                key={item.symbol}
                className={`p-4 rounded-xl border transition-all ${
                  hasBalance 
                    ? 'border-border/40 bg-secondary/20 hover:bg-secondary/30' 
                    : 'border-border/20 bg-secondary/5'
                }`}
              >
                <div className="flex items-center justify-between">
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
                      <div className="font-semibold">{token.symbol}</div>
                      <div className="text-xs text-foreground/50">{token.name}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`font-semibold ${hasBalance ? '' : 'text-foreground/40'}`}>
                      {balanceFormatted}
                    </div>
                    <div className="text-xs text-foreground/50">
                      ≈ ${formatPrice(item.usdValue)}
                    </div>
                  </div>
                </div>

                {/* Price info */}
                {price && (
                  <div className="mt-3 pt-3 border-t border-border/20 flex items-center justify-between text-xs">
                    <span className="text-foreground/50">
                      当前价格: ${formatPrice(price.price, price.price < 1 ? 4 : 2)}
                    </span>
                    <Badge
                      variant={price.change24h >= 0 ? 'default' : 'destructive'}
                      className={`text-xs ${
                        price.change24h >= 0 
                          ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30' 
                          : 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
                      }`}
                    >
                      {formatChange(price.change24h)}
                    </Badge>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Actions */}
        <div className="mt-6 flex gap-3">
          <Button variant="outline" className="flex-1" disabled>
            <ArrowDownLeft className="w-4 h-4 mr-2" />
            存款
          </Button>
          <Button variant="outline" className="flex-1" disabled>
            <ArrowUpRight className="w-4 h-4 mr-2" />
            取款
          </Button>
        </div>

        <div className="mt-4 text-center">
          <a
            href={`${explorerUrl}/address/${CONTRACTS.DCA_VAULT}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline text-xs inline-flex items-center gap-1"
          >
            在 Mantlescan 查看 Vault 合约 <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </CardContent>
    </Card>
  );
}

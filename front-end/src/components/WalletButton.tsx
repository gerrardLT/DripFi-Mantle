import { useState } from 'react';
import { useMantleUser } from '@/hooks/useMantle';
import { Button } from './ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import { useToast } from './ui/use-toast';
import { CURRENT_CHAIN } from '@/lib/mantle-config';
import { Wallet, Loader2, ChevronDown, LogOut, Copy, ExternalLink } from 'lucide-react';

export const WalletButton = () => {
  const { user, loading, connect, disconnect } = useMantleUser();
  const [connecting, setConnecting] = useState(false);
  const { toast } = useToast();

  const handleConnect = async () => {
    setConnecting(true);
    try {
      await connect();
    } catch (error: any) {
      console.error('Connection error:', error);
      alert(error.message || '连接钱包失败');
    } finally {
      setConnecting(false);
    }
  };

  const copyAddress = () => {
    if (user.address) {
      navigator.clipboard.writeText(user.address);
      toast({
        title: "已复制地址",
        description: "钱包地址已复制到剪贴板",
      });
    }
  };

  if (loading) {
    return (
      <Button disabled className="btn-secondary-premium">
        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
        加载中...
      </Button>
    );
  }

  if (!user.connected) {
    return (
      <Button
        onClick={handleConnect}
        disabled={connecting}
        className="btn-premium group shadow-[0_0_20px_rgba(123,97,255,0.3)] hover:shadow-[0_0_30px_rgba(123,97,255,0.5)]"
      >
        {connecting ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            连接中...
          </>
        ) : (
          <>
            <Wallet className="w-4 h-4 mr-2 transition-transform group-hover:scale-110" />
            连接钱包
          </>
        )}
      </Button>
    );
  }

  return (
    <div className="flex items-center gap-3">
      {/* Network Badge */}
      <div className="hidden sm:flex items-center gap-2 px-3 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 backdrop-blur-md">
        <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_10px_#34d399]" />
        <span className="text-sm font-bold text-emerald-400 tracking-wide">{CURRENT_CHAIN.name}</span>
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            className="btn-secondary-premium group hover:bg-white/10 hover:border-white/30"
          >
            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-primary to-accent mr-3 flex items-center justify-center shadow-lg">
              <span className="text-[10px] font-bold text-black border border-white/20 rounded-full w-full h-full flex items-center justify-center bg-white/20 backdrop-blur-[2px]">
                {user.address?.slice(2, 4).toUpperCase()}
              </span>
            </div>
            <span className="font-mono text-white/90 group-hover:text-white transition-colors">
              {user.address ? `${user.address.slice(0, 6)}...${user.address.slice(-4)}` : '已连接'}
            </span>
            <ChevronDown className="w-4 h-4 ml-2 opacity-50 transition-transform group-hover:rotate-180 group-hover:opacity-100" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56 glass-card-strong border-white/10">
          <DropdownMenuLabel className="text-muted-foreground">我的钱包</DropdownMenuLabel>
          <DropdownMenuSeparator className="bg-white/10" />
          <DropdownMenuItem onClick={copyAddress} className="cursor-pointer focus:bg-white/10 focus:text-white">
            <Copy className="w-4 h-4 mr-2" />
            <span>复制地址</span>
          </DropdownMenuItem>
          <DropdownMenuItem
            className="cursor-pointer focus:bg-white/10 focus:text-white"
            onClick={() => window.open(`${CURRENT_CHAIN.blockExplorers?.default.url}/address/${user.address}`, '_blank')}
          >
            <ExternalLink className="w-4 h-4 mr-2" />
            <span>在浏览器中查看</span>
          </DropdownMenuItem>
          <DropdownMenuSeparator className="bg-white/10" />
          <DropdownMenuItem onClick={disconnect} className="cursor-pointer text-red-400 focus:text-red-300 focus:bg-red-500/10">
            <LogOut className="w-4 h-4 mr-2" />
            <span>断开连接</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};

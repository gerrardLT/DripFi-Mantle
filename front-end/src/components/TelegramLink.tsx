import { useState } from 'react';
import { useFlowUser } from '@/hooks/useFlow';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Send, Copy, Check, ExternalLink } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export function TelegramLink() {
  const user = useFlowUser();
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  const [botUsername] = useState('dca_flow_bot'); // Replace with your actual bot username

  // Generate Telegram deep link
  const getTelegramLink = () => {
    if (!user.addr) return '';
    return `https://t.me/${botUsername}?start=${user.addr}`;
  };

  const copyToClipboard = async () => {
    const link = getTelegramLink();
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      toast({
        title: "已复制!",
        description: "Telegram 链接已复制到剪贴板",
      });
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast({
        title: "复制失败",
        description: "请手动复制链接",
        variant: "destructive",
      });
    }
  };

  const openTelegram = () => {
    window.open(getTelegramLink(), '_blank');
  };

  if (!user.loggedIn) {
    return (
      <Card className="glass-card border border-border/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-3 tracking-tight">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Send className="w-5 h-5 text-primary" />
            </div>
            Telegram 通知
          </CardTitle>
          <CardDescription className="text-foreground/60 tracking-wide">
            连接钱包以启用 Telegram 通知
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className="glass-card border border-border/30 hover-glow-primary transition-all duration-300">
      <CardHeader>
        <CardTitle className="flex items-center gap-3 tracking-tight">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center glow-primary-sm">
            <Send className="w-5 h-5 text-primary" />
          </div>
          Telegram 通知
        </CardTitle>
        <CardDescription className="text-foreground/60 tracking-wide">
          当您的定投计划执行时获取即时通知
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Features */}
        <div className="space-y-3">
          <p className="text-sm font-medium tracking-wide text-foreground/80">您将获得：</p>
          <ul className="text-sm text-foreground/70 space-y-2">
            <li className="flex items-center gap-3">
              <Badge variant="outline" className="w-6 h-6 p-0 flex items-center justify-center bg-primary/10 border-primary/30 text-primary">✓</Badge>
              <span className="tracking-wide">即时执行通知</span>
            </li>
            <li className="flex items-center gap-3">
              <Badge variant="outline" className="w-6 h-6 p-0 flex items-center justify-center bg-primary/10 border-primary/30 text-primary">✓</Badge>
              <span className="tracking-wide">通过指令查看计划和历史</span>
            </li>
            <li className="flex items-center gap-3">
              <Badge variant="outline" className="w-6 h-6 p-0 flex items-center justify-center bg-primary/10 border-primary/30 text-primary">✓</Badge>
              <span className="tracking-wide">检查钱包余额和状态</span>
            </li>
          </ul>
        </div>

        {/* Link Input */}
        <div className="space-y-3">
          <label className="text-sm font-medium tracking-wide text-foreground/80">您的 Telegram 专属链接</label>
          <div className="flex gap-2">
            <Input
              value={getTelegramLink()}
              readOnly
              className="font-mono text-xs bg-secondary/30 border-border/40 rounded-xl"
            />
            <Button
              variant="outline"
              size="icon"
              onClick={copyToClipboard}
              className="shrink-0 rounded-xl border-border/40 hover:bg-primary/10 hover:border-primary/30"
            >
              {copied ? <Check className="w-4 h-4 text-primary" /> : <Copy className="w-4 h-4" />}
            </Button>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2">
          <Button
            onClick={openTelegram}
            className="flex-1 gap-2 btn-glow rounded-xl"
          >
            <Send className="w-4 h-4" />
            在 Telegram 中打开
          </Button>
        </div>

        {/* Instructions */}
        <div className="rounded-xl bg-secondary/30 border border-border/40 p-5 space-y-3 backdrop-blur-sm">
          <p className="text-sm font-medium tracking-wide text-foreground/80">如何连接：</p>
          <ol className="text-sm text-foreground/70 space-y-2 list-decimal list-inside tracking-wide leading-relaxed">
            <li>点击"在 Telegram 中打开"或复制链接</li>
            <li>开始与机器人对话</li>
            <li>您的钱包将自动连接</li>
            <li>开始接收通知！</li>
          </ol>
        </div>

        {/* Bot Commands */}
        <div className="rounded-xl border border-border/40 p-5 space-y-3 bg-secondary/20 backdrop-blur-sm">
          <p className="text-sm font-medium tracking-wide text-foreground/80">可用指令：</p>
          <div className="grid grid-cols-2 gap-3 text-xs font-mono">
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/30">/wallet</Badge>
              <span className="text-foreground/60">查看钱包</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/30">/plans</Badge>
              <span className="text-foreground/60">查看计划</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/30">/history</Badge>
              <span className="text-foreground/60">查看历史</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/30">/help</Badge>
              <span className="text-foreground/60">显示帮助</span>
            </div>
          </div>
        </div>

        {/* Bot Info */}
        <div className="flex items-center justify-between text-xs text-foreground/60 pt-3 border-t border-border/40">
          <span className="tracking-wide">机器人: @{botUsername}</span>
          <a
            href={`https://t.me/${botUsername}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 hover:text-primary transition-colors tracking-wide"
          >
            查看机器人
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </CardContent>
    </Card>
  );
}


import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { useMantleUser, createDCAPlan } from '@/hooks/useMantle';
import { INTERVALS } from '@/lib/abis';
import { toast } from 'sonner';
import { Plus, Zap, TrendingUp, Clock, Loader2, Sparkles } from 'lucide-react';
import { parseUnits, type Address } from 'viem';

// 示例代币地址 (需要根据实际部署更新)
const EXAMPLE_TOKENS = {
  USDT: '0x0000000000000000000000000000000000000001' as Address,
  WETH: '0x0000000000000000000000000000000000000002' as Address,
};

export const CreatePlanModal = () => {
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState('');
  const [maxExecutions, setMaxExecutions] = useState('10');
  const [interval, setInterval] = useState<'hourly' | 'four_hourly' | 'daily' | 'weekly'>('daily');
  const [isProcessing, setIsProcessing] = useState(false);
  const { user } = useMantleUser();

  const handleCreatePlan = async () => {
    if (!amount || !user.connected) return;

    setIsProcessing(true);
    try {
      const intervalMap = {
        'hourly': INTERVALS.HOURLY,
        'four_hourly': INTERVALS.FOUR_HOURLY,
        'daily': INTERVALS.DAILY,
        'weekly': INTERVALS.WEEKLY,
      };

      const amountWei = parseUnits(amount, 18);
      const maxExec = BigInt(maxExecutions || '0');

      await createDCAPlan(
        EXAMPLE_TOKENS.USDT,
        EXAMPLE_TOKENS.WETH,
        amountWei,
        intervalMap[interval],
        maxExec,
        0n,
        0n
      );

      toast.success('DCA 计划创建成功!');
      setOpen(false);
      setAmount('');
      setMaxExecutions('10');
      window.location.reload();
    } catch (error: any) {
      console.error('Create plan error:', error);
      toast.error(error.message || '创建计划失败');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="btn-premium group">
          <Plus className="w-4 h-4 mr-2 transition-transform group-hover:rotate-90" />
          创建定投计划
        </Button>
      </DialogTrigger>
      <DialogContent className="glass-card-premium border-0 sm:max-w-md">
        <DialogHeader className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-500/20 to-cyan-500/20 border border-violet-500/20 flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-violet-400" />
            </div>
            <div>
              <DialogTitle className="text-2xl font-bold text-white">创建 DCA 计划</DialogTitle>
              <DialogDescription className="text-slate-400">
                在 Mantle 网络上设置自动定投
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-5 py-4">
          {/* Amount Input */}
          <div className="space-y-2">
            <Label htmlFor="amount" className="text-sm font-medium text-slate-300 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-violet-400" />
              每次定投金额
            </Label>
            <Input
              id="amount"
              type="number"
              placeholder="10.0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="bg-slate-800/50 border-slate-700/50 text-white placeholder:text-slate-500 focus:border-violet-500/50 focus:ring-violet-500/20 rounded-xl h-12"
            />
            <p className="text-xs text-slate-500">
              每次执行时交换的代币数量
            </p>
          </div>

          {/* Max Executions Input */}
          <div className="space-y-2">
            <Label htmlFor="maxExecutions" className="text-sm font-medium text-slate-300 flex items-center gap-2">
              <Zap className="w-4 h-4 text-cyan-400" />
              最大执行次数
            </Label>
            <Input
              id="maxExecutions"
              type="number"
              placeholder="10"
              value={maxExecutions}
              onChange={(e) => setMaxExecutions(e.target.value)}
              className="bg-slate-800/50 border-slate-700/50 text-white placeholder:text-slate-500 focus:border-cyan-500/50 focus:ring-cyan-500/20 rounded-xl h-12"
            />
            <p className="text-xs text-slate-500">
              设置为 0 表示无限次执行
            </p>
          </div>

          {/* Interval Select */}
          <div className="space-y-2">
            <Label htmlFor="interval" className="text-sm font-medium text-slate-300 flex items-center gap-2">
              <Clock className="w-4 h-4 text-emerald-400" />
              执行间隔
            </Label>
            <Select value={interval} onValueChange={(v: 'hourly' | 'four_hourly' | 'daily' | 'weekly') => setInterval(v)}>
              <SelectTrigger className="bg-slate-800/50 border-slate-700/50 text-white focus:border-emerald-500/50 focus:ring-emerald-500/20 rounded-xl h-12">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-slate-900 border-slate-700/50 rounded-xl">
                <SelectItem value="hourly" className="text-slate-300 focus:bg-slate-800 focus:text-white">每小时</SelectItem>
                <SelectItem value="four_hourly" className="text-slate-300 focus:bg-slate-800 focus:text-white">每 4 小时</SelectItem>
                <SelectItem value="daily" className="text-slate-300 focus:bg-slate-800 focus:text-white">每天</SelectItem>
                <SelectItem value="weekly" className="text-slate-300 focus:bg-slate-800 focus:text-white">每周</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Info Box */}
          <div className="p-4 rounded-xl bg-gradient-to-r from-violet-500/5 to-cyan-500/5 border border-violet-500/10">
            <div className="flex items-start gap-3">
              <Zap className="w-5 h-5 text-violet-400 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-slate-400 leading-relaxed">
                创建计划后，Chainlink Automation 将自动执行定投。请确保 Vault 中有足够的代币余额。
              </p>
            </div>
          </div>

          {/* Submit Button */}
          <Button
            onClick={handleCreatePlan}
            disabled={!amount || !user.connected || isProcessing}
            className="w-full btn-premium h-12 text-base"
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                创建中...
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5 mr-2" />
                创建计划
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

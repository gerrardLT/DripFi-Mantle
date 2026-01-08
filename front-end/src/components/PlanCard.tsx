import { useState } from 'react';
import { Button } from './ui/button';
import { 
  usePlanDetails, 
  stopPlan, 
  pausePlan, 
  resumePlan, 
  formatInterval,
  formatPlanStatus,
} from '@/hooks/useMantle';
import { PlanStatus } from '@/lib/abis';
import { toast } from 'sonner';
import { Square, Clock, TrendingUp, Calendar, Pause, Play, Zap, Hash } from 'lucide-react';
import { formatUnits } from 'viem';

interface PlanCardProps {
  planId: bigint;
}

export const PlanCard = ({ planId }: PlanCardProps) => {
  const { plan, loading } = usePlanDetails(planId);
  const [isProcessing, setIsProcessing] = useState(false);

  if (loading || !plan) return null;

  const handleStop = async () => {
    setIsProcessing(true);
    try {
      await stopPlan(planId);
      toast.success('计划已停止!');
      window.location.reload();
    } catch (error: any) {
      console.error('Stop error:', error);
      toast.error(error.message || '停止计划失败');
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePause = async () => {
    setIsProcessing(true);
    try {
      await pausePlan(planId);
      toast.success('计划已暂停!');
      window.location.reload();
    } catch (error: any) {
      console.error('Pause error:', error);
      toast.error(error.message || '暂停计划失败');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleResume = async () => {
    setIsProcessing(true);
    try {
      await resumePlan(planId);
      toast.success('计划已恢复!');
      window.location.reload();
    } catch (error: any) {
      console.error('Resume error:', error);
      toast.error(error.message || '恢复计划失败');
    } finally {
      setIsProcessing(false);
    }
  };

  const formatTime = (timestamp: bigint) => {
    if (timestamp === 0n) return '尚未执行';
    const date = new Date(Number(timestamp) * 1000);
    return date.toLocaleString('zh-CN');
  };

  const amount = formatUnits(plan.amountPerExecution, 18);
  const interval = formatInterval(plan.interval);
  const statusText = formatPlanStatus(plan.status);

  const getStatusStyle = () => {
    switch (plan.status) {
      case PlanStatus.Active:
        return {
          bg: 'bg-emerald-500/10',
          border: 'border-emerald-500/30',
          text: 'text-emerald-400',
          dot: 'bg-emerald-400',
        };
      case PlanStatus.Paused:
        return {
          bg: 'bg-amber-500/10',
          border: 'border-amber-500/30',
          text: 'text-amber-400',
          dot: 'bg-amber-400',
        };
      default:
        return {
          bg: 'bg-slate-500/10',
          border: 'border-slate-500/30',
          text: 'text-slate-400',
          dot: 'bg-slate-400',
        };
    }
  };

  const statusStyle = getStatusStyle();

  return (
    <div className="glass-card-premium p-6 group cursor-pointer">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500/20 to-cyan-500/20 border border-violet-500/20 flex items-center justify-center">
            <Hash className="w-5 h-5 text-violet-400" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">计划 #{planId.toString()}</h3>
            <p className="text-xs text-slate-500">DCA Strategy</p>
          </div>
        </div>
        
        {/* Status Badge */}
        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full ${statusStyle.bg} ${statusStyle.border} border`}>
          <div className={`w-2 h-2 rounded-full ${statusStyle.dot} ${plan.status === PlanStatus.Active ? 'animate-pulse' : ''}`} />
          <span className={`text-sm font-medium ${statusStyle.text}`}>{statusText}</span>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="p-4 rounded-xl bg-slate-800/50 border border-slate-700/50">
          <div className="flex items-center gap-2 text-slate-400 text-sm mb-2">
            <TrendingUp className="w-4 h-4 text-violet-400" />
            每次金额
          </div>
          <p className="text-xl font-bold text-white font-mono">
            {parseFloat(amount).toFixed(4)}
          </p>
        </div>

        <div className="p-4 rounded-xl bg-slate-800/50 border border-slate-700/50">
          <div className="flex items-center gap-2 text-slate-400 text-sm mb-2">
            <Clock className="w-4 h-4 text-cyan-400" />
            执行间隔
          </div>
          <p className="text-xl font-bold text-white">{interval}</p>
        </div>

        <div className="p-4 rounded-xl bg-slate-800/50 border border-slate-700/50">
          <div className="flex items-center gap-2 text-slate-400 text-sm mb-2">
            <Calendar className="w-4 h-4 text-violet-400" />
            执行次数
          </div>
          <p className="text-xl font-bold text-white font-mono">
            {plan.executionCount.toString()}
            <span className="text-slate-500 text-sm font-normal">
              {' / '}{plan.maxExecutions === 0n ? '∞' : plan.maxExecutions.toString()}
            </span>
          </p>
        </div>

        <div className="p-4 rounded-xl bg-slate-800/50 border border-slate-700/50">
          <div className="flex items-center gap-2 text-slate-400 text-sm mb-2">
            <Zap className="w-4 h-4 text-emerald-400" />
            上次执行
          </div>
          <p className="text-sm font-medium text-white truncate">
            {formatTime(plan.lastExecutionTime)}
          </p>
        </div>
      </div>

      {/* Chainlink Info */}
      <div className="p-4 rounded-xl bg-gradient-to-r from-violet-500/5 to-cyan-500/5 border border-violet-500/10 mb-6">
        <div className="flex items-center justify-center gap-2">
          <Zap className="w-4 h-4 text-violet-400" />
          <p className="text-sm text-slate-400">
            Chainlink Automation 自动执行
          </p>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3">
        {plan.status === PlanStatus.Active && (
          <Button
            onClick={handlePause}
            disabled={isProcessing}
            className="flex-1 btn-secondary-premium"
          >
            <Pause className="w-4 h-4 mr-2" />
            暂停
          </Button>
        )}

        {plan.status === PlanStatus.Paused && (
          <Button
            onClick={handleResume}
            disabled={isProcessing}
            className="flex-1 btn-premium"
          >
            <Play className="w-4 h-4 mr-2" />
            恢复
          </Button>
        )}

        {(plan.status === PlanStatus.Active || plan.status === PlanStatus.Paused) && (
          <Button
            onClick={handleStop}
            disabled={isProcessing}
            className="flex-1 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 rounded-xl transition-all duration-200"
          >
            <Square className="w-4 h-4 mr-2" />
            停止
          </Button>
        )}
      </div>
    </div>
  );
};

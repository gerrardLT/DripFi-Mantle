import { useMantleUser, useUserPlans } from '@/hooks/useMantle';
import { Wallet, TrendingUp, Zap, ArrowUpRight } from 'lucide-react';

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  subtext: string;
  trend?: string;
  accentColor: 'violet' | 'cyan' | 'emerald';
}

const StatCard = ({ icon, label, value, subtext, trend, accentColor }: StatCardProps) => {
  const colorMap = {
    violet: {
      bg: 'bg-violet-500/10',
      border: 'border-violet-500/20',
      text: 'text-violet-400',
      glow: 'shadow-violet-500/20',
    },
    cyan: {
      bg: 'bg-cyan-500/10',
      border: 'border-cyan-500/20',
      text: 'text-cyan-400',
      glow: 'shadow-cyan-500/20',
    },
    emerald: {
      bg: 'bg-emerald-500/10',
      border: 'border-emerald-500/20',
      text: 'text-emerald-400',
      glow: 'shadow-emerald-500/20',
    },
  };

  const colors = colorMap[accentColor];

  return (
    <div className="glass-card-premium p-6 group cursor-pointer">
      <div className="flex items-start justify-between mb-4">
        <div className={`w-12 h-12 rounded-2xl ${colors.bg} ${colors.border} border flex items-center justify-center transition-all duration-300 group-hover:scale-110 group-hover:shadow-lg ${colors.glow}`}>
          <div className={colors.text}>{icon}</div>
        </div>
        {trend && (
          <div className="flex items-center gap-1 text-emerald-400 text-sm font-medium">
            <ArrowUpRight className="w-4 h-4" />
            {trend}
          </div>
        )}
      </div>
      
      <p className="text-sm text-slate-400 mb-2 tracking-wide">{label}</p>
      <p className="text-2xl font-bold text-white mb-1 tracking-tight font-mono truncate">{value}</p>
      <p className="text-xs text-slate-500">{subtext}</p>
    </div>
  );
};

export const DashboardStats = () => {
  const { user } = useMantleUser();
  const { planIds } = useUserPlans(user.address);

  const activePlans = planIds?.length || 0;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <StatCard
        icon={<Wallet className="w-5 h-5" />}
        label="钱包地址"
        value={user.address ? `${user.address.slice(0, 8)}...${user.address.slice(-6)}` : '-'}
        subtext="已连接 Mantle 网络"
        accentColor="cyan"
      />

      <StatCard
        icon={<TrendingUp className="w-5 h-5" />}
        label="活跃计划"
        value={activePlans}
        subtext="正在运行的策略"
        trend={activePlans > 0 ? 'Active' : undefined}
        accentColor="violet"
      />

      <StatCard
        icon={<Zap className="w-5 h-5" />}
        label="自动执行"
        value="Chainlink"
        subtext="Automation 驱动"
        accentColor="emerald"
      />
    </div>
  );
};

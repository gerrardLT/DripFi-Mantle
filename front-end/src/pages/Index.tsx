import { WalletButton } from '@/components/WalletButton';
import { CreatePlanModal } from '@/components/CreatePlanModal';
import { PlanCard } from '@/components/PlanCard';
import { DashboardStats } from '@/components/DashboardStats';
import { ExecutionHistory } from '@/components/ExecutionHistory';
import { TelegramLink } from '@/components/TelegramLink';
import { VaultBalances } from '@/components/VaultBalances';
import { TokenPrices } from '@/components/TokenPrices';
import { PortfolioStats } from '@/components/PortfolioStats';
import { ExecutionChart } from '@/components/ExecutionChart';
import { useMantleUser, useUserPlans } from '@/hooks/useMantle';
import { TrendingUp, Zap, Shield, Clock, ArrowRight, Sparkles, BarChart3, Wallet } from 'lucide-react';
import { CURRENT_CHAIN } from '@/lib/mantle-config';

const Index = () => {
  const { user } = useMantleUser();
  const { planIds } = useUserPlans(user.address);

  return (
    <div className="min-h-screen relative">
      {/* Background Grid Pattern */}
      <div className="fixed inset-0 grid-pattern pointer-events-none" />

      {/* Header */}
      <header className="border-b border-border/30 backdrop-blur-xl sticky top-0 z-50 glass-card-strong">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center animate-glow overflow-hidden">
                  <img src="/logo.png" alt="DripFi Logo" className="w-full h-full object-contain" />
                </div>
                <div className="absolute -inset-1 rounded-2xl bg-gradient-to-r from-primary/20 to-accent/20 blur-lg -z-10" />
              </div>
              <div>
                <h1 className="text-2xl font-bold gradient-text tracking-tight">DripFi</h1>
                <p className="text-xs text-muted-foreground tracking-wide">
                  Mantle 自动定投协议
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full bg-success/10 border border-success/20">
                <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_10px_#34d399]" />
                <span className="text-xs text-emerald-400 font-bold uppercase tracking-wider">{CURRENT_CHAIN.name}</span>
              </div>
              <WalletButton />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-6 py-12 relative z-10">
        {!user.connected ? (
          <HeroSection />
        ) : (
          <DashboardSection planIds={planIds} />
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-border/30 py-8 mt-20">
        <div className="container mx-auto px-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <img src="/logo.png" alt="DripFi" className="w-4 h-4 object-contain" />
              <span>DripFi 协议</span>
            </div>
            <div className="flex items-center gap-6 text-sm text-muted-foreground">
              <a href="https://docs.mantle.xyz" target="_blank" rel="noopener noreferrer"
                className="hover:text-primary transition-colors">文档</a>
              <a href="https://github.com" target="_blank" rel="noopener noreferrer"
                className="hover:text-primary transition-colors">GitHub</a>
              <a href="https://sepolia.mantlescan.xyz" target="_blank" rel="noopener noreferrer"
                className="hover:text-primary transition-colors">区块浏览器</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

// Hero Section Component
const HeroSection = () => {
  return (
    <div className="flex flex-col items-center justify-center min-h-[85vh] text-center relative px-4">
      {/* Background Glows */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary/20 rounded-full blur-[120px] -z-10 opacity-50" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-accent/10 rounded-full blur-[100px] -z-10" />

      {/* Floating Badge */}
      <div className="animate-fade-in-up mb-10">
        <div className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full glass-card border border-primary/30 hover:border-primary/50 transition-colors shadow-[0_0_20px_rgba(123,97,255,0.2)]">
          <Sparkles className="w-4 h-4 text-primary animate-pulse" />
          <span className="text-sm font-semibold tracking-wide text-white">由 Chainlink Automation 驱动</span>
        </div>
      </div>

      {/* Main Hero Icon / Visual */}
      <div className="animate-fade-in-up delay-100 relative mb-12 group">
        <div className="relative z-10 w-32 h-32 rounded-3xl flex items-center justify-center animate-float shadow-[0_20px_50px_rgba(123,97,255,0.4)] overflow-hidden">
          <img src="/logo.png" alt="DripFi Logo" className="w-full h-full object-contain" />
        </div>
        <div className="absolute -inset-8 bg-gradient-to-r from-primary to-accent opacity-40 blur-3xl group-hover:opacity-60 transition-opacity duration-700 animate-pulse-glow -z-10" />
      </div>

      {/* Hero Title */}
      <h1 className="animate-fade-in-up delay-200 text-6xl md:text-7xl lg:text-8xl font-bold mb-8 tracking-tight leading-[1.1] text-transparent bg-clip-text bg-gradient-to-b from-white via-white to-white/50 drop-shadow-sm">
        智能定投 <br />
        <span className="gradient-text-primary">积累加密财富</span>
      </h1>

      {/* Hero Description */}
      <p className="animate-fade-in-up delay-300 text-xl md:text-2xl text-muted-foreground mb-12 max-w-3xl leading-relaxed font-light">
        在 Mantle L2 上设置自动化 DCA 策略
        <span className="block mt-2 text-white/80 font-medium">低手续费 · 非托管 · 完全去中心化</span>
      </p>

      {/* CTA Button */}
      <div className="animate-fade-in-up delay-400 mb-20 flex flex-col sm:flex-row items-center gap-4">
        <WalletButton />
        <a href="https://docs.mantle.xyz" target="_blank" rel="noopener noreferrer" className="btn-secondary-premium">
          查看文档
        </a>
      </div>

      {/* Stats Row */}
      <div className="animate-fade-in-up delay-500 grid grid-cols-3 gap-8 md:gap-24 border-t border-white/5 pt-12">
        <StatItem value="$0" label="总交易量" />
        <StatItem value="0" label="活跃计划" />
        <StatItem value="<$0.01" label="平均 Gas" />
      </div>

      {/* Features Grid */}
      <div className="mt-32 w-full max-w-5xl">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">为什么选择 DripFi？</h2>
          <p className="text-muted-foreground text-lg">为去中心化金融的未来而生</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <FeatureCard
            icon={<Shield className="w-8 h-8" />}
            title="非托管"
            description="您的资金始终保存在智能合约保险库中，您随时拥有完全控制权。"
            delay="delay-100"
          />
          <FeatureCard
            icon={<Clock className="w-8 h-8" />}
            title="全自动化"
            description="只需设置一次计划，Chainlink Automation 将精准执行您的交易。"
            delay="delay-200"
          />
          <FeatureCard
            icon={<BarChart3 className="w-8 h-8" />}
            title="超低费用"
            description="基于 Mantle L2 构建，最大限度降低 Gas 成本，让更多资金用于投资。"
            delay="delay-300"
          />
        </div>
      </div>

      {/* Partners/Trust Section */}
      <div className="mt-32 animate-fade-in-up delay-500 pb-20">
        <p className="text-sm font-semibold text-muted-foreground mb-8 uppercase tracking-widest">技术支持</p>
        <div className="flex items-center justify-center gap-12 grayscale opacity-50 hover:grayscale-0 hover:opacity-100 transition-all duration-500">
          {/* Chainlink Logo Placeholder */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#375BD2] rounded-lg flex items-center justify-center text-white font-bold text-xl">CL</div>
            <span className="text-xl font-bold text-white">Chainlink</span>
          </div>
          {/* Mantle Logo Placeholder */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center text-black font-bold text-xl">M</div>
            <span className="text-xl font-bold text-white">Mantle</span>
          </div>
        </div>
      </div>
    </div>
  );
};

// Stat Item Component
const StatItem = ({ value, label }: { value: string; label: string }) => (
  <div className="text-center group">
    <div className="text-4xl md:text-5xl font-bold text-white mb-2 tracking-tight group-hover:scale-105 transition-transform duration-300">
      {value}
    </div>
    <div className="text-sm font-medium text-muted-foreground uppercase tracking-wider">{label}</div>
  </div>
);

// Feature Card Component
const FeatureCard = ({
  icon,
  title,
  description,
  delay
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  delay: string;
}) => (
  <div className={`animate-fade-in-up ${delay} glass-card-premium rounded-2xl p-8 hover-glow-primary cursor-pointer group`}>
    <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-6 text-primary group-hover:scale-110 transition-transform duration-300 border border-primary/20">
      {icon}
    </div>
    <h3 className="text-2xl font-bold mb-4 text-white">{title}</h3>
    <p className="text-muted-foreground leading-relaxed text-[15px]">{description}</p>
  </div>
);

// Dashboard Section Component
const DashboardSection = ({ planIds }: { planIds: bigint[] | undefined }) => {
  return (
    <div className="space-y-10">
      {/* Stats */}
      <DashboardStats />

      {/* Plans Section */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">您的定投计划</h2>
            <p className="text-foreground/50 mt-1">
              管理您的自动化投资策略
            </p>
          </div>
          <CreatePlanModal />
        </div>

        {planIds && planIds.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {planIds.map((planId) => (
              <PlanCard key={planId.toString()} planId={planId} />
            ))}
          </div>
        ) : (
          <EmptyPlansState />
        )}
      </div>

      {/* Execution History and Telegram */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <ExecutionHistory />
        </div>
        <div>
          <TelegramLink />
        </div>
      </div>

      {/* Charts and Stats Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ExecutionChart />
        <PortfolioStats />
      </div>

      {/* Vault Balances and Token Prices */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <VaultBalances />
        <TokenPrices />
      </div>

      {/* Info Cards */}
      <InfoCardsSection />
    </div>
  );
};

// Empty Plans State
const EmptyPlansState = () => (
  <div className="glass-card-premium rounded-2xl p-16 text-center">
    <div className="relative inline-block mb-8">
      <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center">
        <TrendingUp className="w-10 h-10 text-primary" />
      </div>
      <div className="absolute -inset-2 rounded-2xl bg-primary/20 blur-xl -z-10" />
    </div>
    <h3 className="text-2xl font-semibold mb-3">暂无活跃计划</h3>
    <p className="text-foreground/50 mb-8 max-w-md mx-auto">
      创建您的第一个自动定投计划，开启智能投资之旅
    </p>
    <CreatePlanModal />
  </div>
);

// Info Cards Section
const InfoCardsSection = () => (
  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-10">
    <div className="glass-card rounded-2xl p-8 border border-border/30 hover-glow-primary cursor-pointer">
      <h3 className="text-xl font-semibold mb-5 gradient-text-primary">如何运作</h3>
      <ul className="space-y-4 text-sm text-foreground/70 leading-relaxed">
        <li className="flex items-start gap-3">
          <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
            <span className="text-xs text-primary font-bold">1</span>
          </div>
          <span>创建计划，设置金额和执行间隔</span>
        </li>
        <li className="flex items-start gap-3">
          <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
            <span className="text-xs text-primary font-bold">2</span>
          </div>
          <span>向保险库充值代币</span>
        </li>
        <li className="flex items-start gap-3">
          <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
            <span className="text-xs text-primary font-bold">3</span>
          </div>
          <span>Chainlink 自动执行交易</span>
        </li>
        <li className="flex items-start gap-3">
          <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
            <span className="text-xs text-primary font-bold">4</span>
          </div>
          <span>代币自动存入您的钱包</span>
        </li>
      </ul>
    </div>

    <div className="glass-card rounded-2xl p-8 border border-border/30 hover-glow-accent cursor-pointer bg-accent/5">
      <h3 className="text-xl font-semibold mb-5 gradient-text-primary">获取测试代币</h3>
      <p className="text-sm text-foreground/70 mb-5 leading-relaxed">
        在 Mantle Sepolia 测试网上，您需要 MNT 代币支付 Gas 费用：
      </p>
      <a
        href="https://faucet.sepolia.mantle.xyz"
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-2 px-5 py-2.5 btn-premium text-white rounded-xl text-sm font-medium"
      >
        领取测试 MNT
        <ArrowRight className="w-4 h-4" />
      </a>
      <p className="text-xs text-foreground/40 mt-5">
        每笔交易约消耗 0.001 MNT
      </p>
    </div>

    <div className="glass-card rounded-2xl p-8 border border-border/30 hover-glow-primary cursor-pointer">
      <h3 className="text-xl font-semibold mb-5 gradient-text-primary">为什么选择定投</h3>
      <ul className="space-y-4 text-sm text-foreground/70 leading-relaxed">
        <li className="flex items-start gap-3">
          <div className="w-1.5 h-1.5 rounded-full bg-accent mt-2 flex-shrink-0" />
          <span>通过分批买入降低择时风险</span>
        </li>
        <li className="flex items-start gap-3">
          <div className="w-1.5 h-1.5 rounded-full bg-accent mt-2 flex-shrink-0" />
          <span>消除情绪化决策</span>
        </li>
        <li className="flex items-start gap-3">
          <div className="w-1.5 h-1.5 rounded-full bg-accent mt-2 flex-shrink-0" />
          <span>全自动化 - 设置后即可忘记</span>
        </li>
        <li className="flex items-start gap-3">
          <div className="w-1.5 h-1.5 rounded-full bg-accent mt-2 flex-shrink-0" />
          <span>随时可暂停或停止</span>
        </li>
      </ul>
    </div>
  </div>
);

export default Index;

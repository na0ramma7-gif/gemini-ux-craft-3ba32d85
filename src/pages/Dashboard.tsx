import { useMemo } from 'react';
import { useApp } from '@/context/AppContext';
import KPICard from '@/components/KPICard';
import GlobalDateFilter from '@/components/GlobalDateFilter';
import ProductAreaChart from '@/components/ProductAreaChart';
import StatusBadge from '@/components/StatusBadge';
import { formatCurrency } from '@/lib/utils';
import { Portfolio } from '@/types';
import RevenueAreaChart from '@/components/RevenueAreaChart';
import {
  PieChart,
  Package,
} from 'lucide-react';

interface DashboardProps {
  onPortfolioClick: (portfolio: Portfolio) => void;
}

const Dashboard = ({ onPortfolioClick }: DashboardProps) => {
  const { state, metrics, t, language, isRTL } = useApp();

  const portfolioMetrics = useMemo(() => {
    return state.portfolios.map(p => {
      const products = state.products.filter(pr => pr.portfolioId === p.id);
      let planned = 0;
      let actual = 0;
      products.forEach(pr => {
        const features = state.features.filter(f => f.productId === pr.id);
        features.forEach(f => {
          state.revenuePlan.filter(r => r.featureId === f.id).forEach(r => {
            planned += r.expected;
          });
          state.revenueActual.filter(r => r.featureId === f.id).forEach(r => {
            actual += r.actual;
          });
        });
      });
      const target = planned * 1.35;
      return { ...p, planned, actual, target, remaining: Math.max(0, target - actual), productCount: products.length };
    });
  }, [state]);


  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-foreground">{t('dashboard')}</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{t('businessOverview')}</p>
        </div>
        <GlobalDateFilter />
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
        <KPICard
          title={t('totalRevenue')}
          value={formatCurrency(metrics.revenue, language)}
          subtitle={t('expectedFromFeatures')}
          icon={<span className="text-lg">💰</span>}
          variant="green"
          progress={{
            label: t('targetYear'),
            target: formatCurrency(metrics.revenue * 1.35, language),
            percent: 74,
            status: 'negative',
            remaining: formatCurrency(metrics.revenue * 0.35, language)
          }}
        />
        
        <KPICard
          title={t('totalCost')}
          value={formatCurrency(metrics.cost, language)}
          subtitle={t('resourcesCapexOpex')}
          icon={<span className="text-lg">💸</span>}
          variant="red"
          progress={{
            label: t('budgetYear'),
            target: formatCurrency(metrics.cost * 1.18, language),
            percent: 85,
            status: 'positive',
            remaining: formatCurrency(metrics.cost * 0.18, language)
          }}
        />
        
        <KPICard
          title={t('netProfit')}
          value={formatCurrency(metrics.profit, language)}
          subtitle={`${t('margin')}: ${((metrics.profit / metrics.revenue) * 100).toFixed(1)}%`}
          icon={<span className="text-lg">✅</span>}
          variant={metrics.profit >= 0 ? 'green' : 'red'}
          progress={{
            label: t('targetYear'),
            target: formatCurrency(Math.abs(metrics.profit) * 2, language),
            percent: 50,
            status: metrics.profit >= 0 ? 'positive' : 'negative',
            remaining: formatCurrency(Math.abs(metrics.profit), language)
          }}
        />
        
        <KPICard
          title={t('targetVsAchieved')}
          value="74%"
          icon={<span className="text-lg">🎯</span>}
          variant="gradient"
          progress={{
            label: t('achievementRate'),
            target: formatCurrency(metrics.revenue, language),
            percent: 74,
            status: 'negative',
            remaining: `${formatCurrency(metrics.revenue * 0.35, language)} ${t('toGo')}`
          }}
        />
        
        <KPICard
          title={t('products')}
          value={metrics.products.toString()}
          subtitle={t('acrossPortfolios')}
          icon={<span className="text-lg">📦</span>}
          variant="purple"
          progress={{
            label: t('performanceStatus'),
            target: t('onTrack'),
            percent: 100,
            status: 'positive'
          }}
        />
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Revenue Area Chart */}
        <RevenueAreaChart />

        {/* Portfolio Distribution */}
        <div className="bg-card rounded-xl shadow-card p-5">
          <h3 className="text-foreground mb-4 flex items-center gap-2">
            <PieChart className="w-4 h-4 text-primary" />
            {t('portfolioDistribution')}
          </h3>
          <div className="space-y-4">
            {portfolioMetrics.map((portfolio, idx) => {
              const colors = ['bg-primary', 'bg-accent', 'bg-warning', 'bg-success'];
              const achievedPercent = portfolio.target > 0 ? Math.min((portfolio.actual / portfolio.target) * 100, 100) : 0;
              
              return (
                <div key={portfolio.id} className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-foreground">{portfolio.name}</span>
                    <div className="flex items-center gap-3 text-xs">
                      <span className="text-success font-semibold">{formatCurrency(portfolio.actual, language)}</span>
                      <span className="text-muted-foreground">/ {formatCurrency(portfolio.target, language)}</span>
                    </div>
                  </div>
                  <div className="w-full bg-secondary rounded-full h-2.5">
                    <div 
                      className={`h-2.5 rounded-full ${colors[idx % colors.length]} transition-all`}
                      style={{ width: `${achievedPercent}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[10px] text-muted-foreground">
                    <span>{t('actual')}: {achievedPercent.toFixed(0)}%</span>
                    <span>{t('variance')}: {formatCurrency(portfolio.remaining, language)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Products Ranking */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ProductAreaChart />
        <div className="bg-card rounded-xl shadow-card p-5">
          <h3 className="text-foreground mb-4 flex items-center gap-2">
            <Package className="w-4 h-4 text-primary" />
            {t('products')} {t('portfolioDistribution')}
          </h3>
          <div className="space-y-4">
            {(() => {
              const productMetrics = state.products.map(product => {
                const features = state.features.filter(f => f.productId === product.id);
                let actual = 0;
                let planned = 0;
                features.forEach(f => {
                  state.revenueActual.filter(r => r.featureId === f.id).forEach(r => { actual += r.actual; });
                  state.revenuePlan.filter(r => r.featureId === f.id).forEach(r => { planned += r.expected; });
                });
                const target = planned * 1.35;
                return { ...product, actual, target, remaining: Math.max(0, target - actual) };
              }).sort((a, b) => b.actual - a.actual);

              const colors = ['bg-primary', 'bg-accent', 'bg-warning', 'bg-success', 'bg-destructive', 'bg-muted-foreground'];

              return productMetrics.map((product, idx) => {
                const achievedPercent = product.target > 0 ? Math.min((product.actual / product.target) * 100, 100) : 0;
                return (
                  <div key={product.id} className="space-y-1.5">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-foreground">{product.name}</span>
                      <div className="flex items-center gap-3 text-xs">
                        <span className="text-success font-semibold">{formatCurrency(product.actual, language)}</span>
                        <span className="text-muted-foreground">/ {formatCurrency(product.target, language)}</span>
                      </div>
                    </div>
                    <div className="w-full bg-secondary rounded-full h-2.5">
                      <div
                        className={`h-2.5 rounded-full ${colors[idx % colors.length]} transition-all`}
                        style={{ width: `${achievedPercent}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-[10px] text-muted-foreground">
                      <span>{t('actual')}: {achievedPercent.toFixed(0)}%</span>
                      <span>{t('variance')}: {formatCurrency(product.remaining, language)}</span>
                    </div>
                  </div>
                );
              });
            })()}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
import { useMemo } from 'react';
import { useApp } from '@/context/AppContext';
import KPICard from '@/components/KPICard';
import GlobalDateFilter from '@/components/GlobalDateFilter';
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
      let revenue = 0;
      products.forEach(pr => {
        const features = state.features.filter(f => f.productId === pr.id);
        features.forEach(f => {
          state.revenuePlan.filter(r => r.featureId === f.id).forEach(r => {
            revenue += r.expected;
          });
        });
      });
      return { ...p, revenue, productCount: products.length };
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
          <div className="space-y-3">
            {portfolioMetrics.map((portfolio, idx) => {
              const colors = ['bg-primary', 'bg-accent', 'bg-warning', 'bg-success'];
              const maxRevenue = Math.max(...portfolioMetrics.map(p => p.revenue));
              const percentage = (portfolio.revenue / maxRevenue) * 100;
              
              return (
                <div key={portfolio.id} className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-foreground">{portfolio.name}</span>
                    <span className="text-sm font-semibold text-foreground">
                      {formatCurrency(portfolio.revenue, language)}
                    </span>
                  </div>
                  <div className="w-full bg-secondary rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full ${colors[idx % colors.length]} transition-all`}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Portfolio Cards */}
      <div>
        <h3 className="text-foreground mb-3">{t('activePortfolios')}</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {portfolioMetrics.map((portfolio) => (
            <div
              key={portfolio.id}
              onClick={() => onPortfolioClick(portfolio)}
              className="bg-card rounded-xl shadow-card p-4 cursor-pointer hover:shadow-card-hover transition-all duration-200 hover:-translate-y-0.5 border border-transparent hover:border-primary/20"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="min-w-0 flex-1">
                  <div className="text-xs text-muted-foreground mb-0.5">{portfolio.code}</div>
                  <h4 className="text-base font-semibold text-foreground truncate">{portfolio.name}</h4>
                </div>
                <Package className="w-6 h-6 text-primary/50 flex-shrink-0 ms-2" />
              </div>
              
              <p className="text-xs text-muted-foreground mb-3 line-clamp-2">
                {portfolio.description}
              </p>
              
              <div className="space-y-1.5 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t('products')}:</span>
                  <span className="font-semibold">{portfolio.productCount}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t('revenue')}:</span>
                  <span className="font-semibold text-revenue">
                    {formatCurrency(portfolio.revenue, language)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">{t('priority')}:</span>
                  <StatusBadge status={portfolio.priority} />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
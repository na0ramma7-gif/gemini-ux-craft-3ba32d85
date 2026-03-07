import { useMemo } from 'react';
import { useApp } from '@/context/AppContext';
import KPICard from '@/components/KPICard';
import GlobalDateFilter from '@/components/GlobalDateFilter';
import RevenueCostLineChart from '@/components/dashboard/RevenueCostLineChart';
import PortfolioDonutChart from '@/components/dashboard/PortfolioDonutChart';
import PortfolioBarChart from '@/components/dashboard/PortfolioBarChart';
import ProductTable from '@/components/dashboard/ProductTable';
import ForecastSummaryCards from '@/components/dashboard/ForecastSummaryCards';
import RevenuePipelineChart from '@/components/dashboard/RevenuePipelineChart';
import UpcomingRevenueDrivers from '@/components/dashboard/UpcomingRevenueDrivers';
import { formatCurrency } from '@/lib/utils';
import { Portfolio, Product } from '@/types';
import { TrendingUp, TrendingDown, Target, Package, DollarSign, Receipt, BarChart3 } from 'lucide-react';

interface DashboardProps {
  onPortfolioClick: (portfolio: Portfolio) => void;
}

const Dashboard = ({ onPortfolioClick }: DashboardProps) => {
  const { state, metrics, t, language, setView, setSelected } = useApp();

  const trend = useMemo(() => {
    const totalActual = state.revenueActual.reduce((s, r) => s + r.actual, 0);
    const target = metrics.revenue * 1.35;
    const achievePct = target > 0 ? Math.round((totalActual / target) * 100) : 0;
    return { achievePct, totalActual };
  }, [state, metrics]);

  const handleProductClick = (product: Product) => {
    setSelected(prev => ({
      ...prev,
      product,
      portfolio: state.portfolios.find(p => p.id === product.portfolioId) || null
    }));
    setView('product');
  };

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-foreground">{t('dashboard')}</h1>
          <p className="text-sm text-muted-foreground mt-1">{t('businessOverview')}</p>
        </div>
        <GlobalDateFilter />
      </div>

      {/* 1. Executive Summary KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        <KPICard
          title={t('totalRevenue')}
          value={formatCurrency(metrics.revenue, language)}
          subtitle="↑ 8% vs last month"
          icon={<DollarSign className="w-5 h-5 text-success" />}
          variant="green"
          progress={{
            label: t('targetYear'),
            target: formatCurrency(metrics.revenue * 1.35, language),
            percent: trend.achievePct,
            status: trend.achievePct >= 70 ? 'positive' : 'negative',
            remaining: formatCurrency(metrics.revenue * 0.35, language)
          }}
        />
        <KPICard
          title={t('totalCost')}
          value={formatCurrency(metrics.cost, language)}
          subtitle="↓ 3% vs last month"
          icon={<Receipt className="w-5 h-5 text-destructive" />}
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
          icon={metrics.profit >= 0 ? <TrendingUp className="w-5 h-5 text-profit" /> : <TrendingDown className="w-5 h-5 text-destructive" />}
          variant={metrics.profit >= 0 ? 'green' : 'red'}
        />
        <KPICard
          title={t('targetVsAchieved')}
          value={`${trend.achievePct}%`}
          subtitle={trend.achievePct >= 70 ? '↑ On Track' : '↓ Below Target'}
          icon={<Target className="w-5 h-5 text-primary-foreground" />}
          variant="gradient"
        />
        <KPICard
          title={t('products')}
          value={metrics.products.toString()}
          subtitle={t('acrossPortfolios')}
          icon={<Package className="w-5 h-5 text-accent" />}
          variant="purple"
        />
      </div>

      {/* 2. Revenue vs Cost Trend */}
      <RevenueCostLineChart />

      {/* 3. Portfolio Distribution + Target */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <PortfolioDonutChart />
        <PortfolioBarChart onPortfolioClick={onPortfolioClick} />
      </div>

      {/* 4. Product Performance Table */}
      <ProductTable onProductClick={handleProductClick} />

      {/* 5. Revenue Pipeline Section */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-primary" />
          <h2 className="text-foreground text-lg font-semibold">{t('revenuePipeline')}</h2>
        </div>
        <ForecastSummaryCards />
        <RevenuePipelineChart />
      </div>

      {/* 6. Upcoming Revenue Drivers */}
      <UpcomingRevenueDrivers onProductClick={handleProductClick} />
    </div>
  );
};

export default Dashboard;

import { useMemo } from 'react';
import { useApp } from '@/context/AppContext';
import KPICard from '@/components/KPICard';
import GlobalDateFilter from '@/components/GlobalDateFilter';
import RevenueCostLineChart from '@/components/dashboard/RevenueCostLineChart';
import PortfolioDonutChart from '@/components/dashboard/PortfolioDonutChart';
import PortfolioBarChart from '@/components/dashboard/PortfolioBarChart';
import ProductTable from '@/components/dashboard/ProductTable';
import InvestmentReturnChart from '@/components/dashboard/InvestmentReturnChart';
import InsightsPanel from '@/components/dashboard/InsightsPanel';
import { formatCurrency } from '@/lib/utils';
import { Portfolio, Product } from '@/types';

interface DashboardProps {
  onPortfolioClick: (portfolio: Portfolio) => void;
}

const Dashboard = ({ onPortfolioClick }: DashboardProps) => {
  const { state, metrics, t, language, setView, setSelected } = useApp();

  // Compute previous month trend (simplified mock: ~8% growth)
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
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-foreground">{t('dashboard')}</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{t('businessOverview')}</p>
        </div>
        <GlobalDateFilter />
      </div>

      {/* 1. Executive Summary KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
        <KPICard
          title={t('totalRevenue')}
          value={formatCurrency(metrics.revenue, language)}
          subtitle="↑ 8% vs last month"
          icon={<span className="text-lg">💰</span>}
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
        />
        <KPICard
          title={t('targetVsAchieved')}
          value={`${trend.achievePct}%`}
          subtitle={trend.achievePct >= 70 ? '↑ On Track' : '↓ Below Target'}
          icon={<span className="text-lg">🎯</span>}
          variant="gradient"
        />
        <KPICard
          title={t('products')}
          value={metrics.products.toString()}
          subtitle={t('acrossPortfolios')}
          icon={<span className="text-lg">📦</span>}
          variant="purple"
        />
      </div>

      {/* 2. Revenue vs Cost Trend (Line Chart) */}
      <RevenueCostLineChart />

      {/* 3 & 4. Portfolio Charts + Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <PortfolioDonutChart />
        <PortfolioBarChart onPortfolioClick={onPortfolioClick} />
        <InsightsPanel />
      </div>

      {/* 5. Product Performance Table */}
      <ProductTable onProductClick={handleProductClick} />

      {/* 6. Investment vs Return */}
      <InvestmentReturnChart />
    </div>
  );
};

export default Dashboard;

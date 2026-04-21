import { useMemo, useState } from 'react';
import { useApp } from '@/context/AppContext';
import KPICard from '@/components/KPICard';
import GlobalDateFilter from '@/components/GlobalDateFilter';
import PortfolioFormDialog from '@/components/PortfolioFormDialog';
import RevenueCostLineChart from '@/components/dashboard/RevenueCostLineChart';
import PortfolioDonutChart from '@/components/dashboard/PortfolioDonutChart';
import PortfolioBarChart from '@/components/dashboard/PortfolioBarChart';
import ProductTable from '@/components/dashboard/ProductTable';
import ForecastSummaryCards from '@/components/dashboard/ForecastSummaryCards';
import RevenuePipelineChart from '@/components/dashboard/RevenuePipelineChart';
import UpcomingRevenueDrivers from '@/components/dashboard/UpcomingRevenueDrivers';
import ScenarioConfigModal from '@/components/dashboard/ScenarioConfigModal';
import { formatCurrency } from '@/lib/utils';
import { Portfolio, Product } from '@/types';
import { ScenarioType, HorizonMonths } from '@/lib/forecastEngine';
import { useForecastSettings } from '@/hooks/useForecastSettings';
import { useHierarchicalMetrics } from '@/hooks/useHierarchicalMetrics';
import { TrendingUp, TrendingDown, Target, Package, DollarSign, Receipt, BarChart3, Settings2, Layers, Activity, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import CompareControls from '@/components/compare/CompareControls';
import CompareEmptyState from '@/components/compare/CompareEmptyState';
import KPIDelta from '@/components/compare/KPIDelta';
import ServiceBreakdownTable from '@/components/compare/ServiceBreakdownTable';
import { useCompareMetrics } from '@/hooks/useCompareMetrics';

export type PipelineHorizon = HorizonMonths;

interface DashboardProps {
  onPortfolioClick: (portfolio: Portfolio) => void;
}

const Dashboard = ({ onPortfolioClick }: DashboardProps) => {
  const { state, t, language, setView, setSelected, dateFilter } = useApp();
  const dept = useHierarchicalMetrics(state, dateFilter);
  const compare = useCompareMetrics({ scope: 'dashboard' });
  const [scenario, setScenario] = useState<ScenarioType>('baseline');
  const [horizon, setHorizon] = useState<HorizonMonths>(12);
  const [showPortfolioForm, setShowPortfolioForm] = useState(false);
  const [showConfig, setShowConfig] = useState(false);
  const { configs, setConfigs } = useForecastSettings();

  // Single source of truth: target & achievement come from the hook.
  const trend = useMemo(() => ({ achievePct: dept.achievementPct }), [dept.achievementPct]);

  const handleProductClick = (product: Product) => {
    setSelected(prev => ({
      ...prev,
      product,
      portfolio: state.portfolios.find(p => p.id === product.portfolioId) || null
    }));
    setView('product');
  };

  const scenarioKeys: ScenarioType[] = ['baseline', 'optimistic', 'conservative'];

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-foreground">{dept.departmentName} — {t('dashboard')}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {dept.totalPortfolios} {t('portfolios')} · {dept.totalProducts} {t('products')} · {dept.totalFeatures} {t('features')} · {dept.totalReleases} {t('releases')}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" onClick={() => setShowPortfolioForm(true)}>
            <Plus className="w-4 h-4 me-1.5" />{t('addPortfolio')}
          </Button>
          <GlobalDateFilter />
        </div>
      </div>

      {/* Compare controls — visible only when Compare is ON */}
      <CompareControls scope="dashboard" />

      {/* Compare validation / no-data banner */}
      {compare.active && (
        <CompareEmptyState validation={compare.validation} dataState={compare.dataState} />
      )}

      {/* Per-service revenue breakdown — visible always; gains Δ% column when Compare is ON */}
      <ServiceBreakdownTable
        current={compare.currentServices}
        comparison={compare.comparisonServices}
        active={compare.active}
      />

      {/* 1. Executive Summary KPIs — Department Level */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        <KPICard
          title={t('totalRevenue')}
          value={formatCurrency(dept.revenue, language)}
          icon={<DollarSign className="w-5 h-5 text-success" />}
          variant="green"
          progress={{
            label: t('targetYear'),
            target: formatCurrency(dept.target, language),
            percent: trend.achievePct,
            status: trend.achievePct >= 70 ? 'positive' : 'negative',
            remaining: formatCurrency(Math.max(0, dept.target - dept.revenue), language)
          }}
          extra={
            compare.active ? (
              <KPIDelta
                comparisonFormatted={formatCurrency(compare.comparison.revenue, language)}
                delta={compare.delta.revenue}
                format="currency"
              />
            ) : undefined
          }
        />
        <KPICard
          title={t('totalCost')}
          value={formatCurrency(dept.cost, language)}
          icon={<Receipt className="w-5 h-5 text-destructive" />}
          variant="red"
          extra={
            compare.active ? (
              <KPIDelta
                comparisonFormatted={formatCurrency(compare.comparison.cost, language)}
                delta={compare.delta.cost}
                lowerIsBetter
                format="currency"
              />
            ) : undefined
          }
        />
        <KPICard
          title={t('netProfit')}
          value={formatCurrency(dept.profit, language)}
          subtitle={`${t('margin')}: ${dept.margin.toFixed(1)}%`}
          icon={dept.profit >= 0 ? <TrendingUp className="w-5 h-5 text-profit" /> : <TrendingDown className="w-5 h-5 text-destructive" />}
          variant={dept.profit >= 0 ? 'green' : 'red'}
          extra={
            compare.active ? (
              <KPIDelta
                comparisonFormatted={formatCurrency(compare.comparison.profit, language)}
                delta={compare.delta.profit}
                format="currency"
              />
            ) : undefined
          }
        />
        <KPICard
          title={t('plannedVsAchieved')}
          value={`${trend.achievePct}%`}
          subtitle={trend.achievePct >= 70 ? '↑ On Track' : '↓ Below Target'}
          icon={<Target className="w-5 h-5 text-primary-foreground" />}
          variant="gradient"
          progress={{
            label: t('plannedYear'),
            target: formatCurrency(dept.target, language),
            percent: trend.achievePct,
            status: trend.achievePct >= 70 ? 'positive' : 'negative',
            remaining: formatCurrency(Math.max(0, dept.target - dept.revenue), language),
          }}
        />
        <KPICard
          title={t('products')}
          value={dept.totalProducts.toString()}
          subtitle={`${dept.totalPortfolios} ${t('portfolios')}`}
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
        {/* Section header with controls */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-primary" />
            <h2 className="text-foreground text-lg font-semibold">{t('revenuePipeline')}</h2>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {/* Scenario toggle — pill style */}
            <div className="flex items-center bg-muted rounded-lg p-1">
              {scenarioKeys.map(key => (
                <button
                  key={key}
                  onClick={() => setScenario(key)}
                  className={`px-4 py-1.5 rounded-md text-xs font-medium transition-all ${
                    scenario === key
                      ? 'bg-card text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {t(key)}
                </button>
              ))}
            </div>

            <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs" onClick={() => setShowConfig(true)}>
              <Settings2 className="w-3.5 h-3.5" />
              {t('configureForecast')}
            </Button>
          </div>
        </div>

        <ForecastSummaryCards scenario={scenario} horizon={horizon} config={configs[scenario]} />
        <RevenuePipelineChart scenario={scenario} horizon={horizon} config={configs[scenario]} />
      </div>

      {/* 6. Upcoming Revenue Drivers */}
      <UpcomingRevenueDrivers scenario={scenario} horizon={horizon} config={configs[scenario]} onProductClick={handleProductClick} />

      <PortfolioFormDialog
        open={showPortfolioForm}
        onOpenChange={setShowPortfolioForm}
        onCreated={onPortfolioClick}
      />

      <ScenarioConfigModal
        open={showConfig}
        onOpenChange={setShowConfig}
        configs={configs}
        activeScenario={scenario}
        horizon={horizon}
        onApply={({ configs: nextConfigs, horizon: nextHorizon, scenario: nextScenario }) => {
          setConfigs(nextConfigs);
          setHorizon(nextHorizon);
          setScenario(nextScenario);
        }}
      />
    </div>
  );
};

export default Dashboard;

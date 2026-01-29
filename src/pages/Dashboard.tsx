import { useMemo, useState } from 'react';
import { useApp } from '@/context/AppContext';
import KPICard from '@/components/KPICard';
import StatusBadge from '@/components/StatusBadge';
import { formatCurrency } from '@/lib/utils';
import { Portfolio } from '@/types';
import {
  TrendingUp,
  PieChart,
  Package,
  Calendar,
  Globe
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';

interface DashboardProps {
  onPortfolioClick: (portfolio: Portfolio) => void;
}

const Dashboard = ({ onPortfolioClick }: DashboardProps) => {
  const { state, metrics, t, language, setLanguage, isRTL } = useApp();
  const [timeView, setTimeView] = useState('year');
  const [selectedYear, setSelectedYear] = useState(2025);

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

  const chartData = useMemo(() => {
    const months = [t('jan'), t('feb'), t('mar'), t('apr'), t('may'), t('jun')];
    const revenue = [45000, 55000, 65000, 75000, 85000, 95000];
    const cost = [35000, 38000, 42000, 45000, 48000, 52000];
    return { labels: months, revenue, cost };
  }, [t]);

  return (
    <div className="space-y-6 lg:space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">{t('dashboard')}</h1>
          <p className="text-sm sm:text-base text-muted-foreground mt-1">{t('businessOverview')}</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-2 sm:gap-4">
          {/* Language Toggle */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setLanguage(language === 'en' ? 'ar' : 'en')}
            className="gap-2"
          >
            <Globe className="w-4 h-4" />
            {language === 'en' ? 'العربية' : 'English'}
          </Button>
          
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-muted-foreground hidden sm:block" />
            <Select value={timeView} onValueChange={setTimeView}>
              <SelectTrigger className="w-24 sm:w-32 h-9 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="year">{t('yearly')}</SelectItem>
                <SelectItem value="month">{t('monthly')}</SelectItem>
                <SelectItem value="week">{t('weekly')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <Select value={selectedYear.toString()} onValueChange={(v) => setSelectedYear(parseInt(v))}>
            <SelectTrigger className="w-20 sm:w-24 h-9 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="2024">2024</SelectItem>
              <SelectItem value="2025">2025</SelectItem>
              <SelectItem value="2026">2026</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3 sm:gap-4">
        <KPICard
          title={t('totalRevenue')}
          value={formatCurrency(metrics.revenue, language)}
          subtitle={t('expectedFromFeatures')}
          icon={<span className="text-xl sm:text-2xl">💰</span>}
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
          icon={<span className="text-xl sm:text-2xl">💸</span>}
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
          icon={<span className="text-xl sm:text-2xl">✅</span>}
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
          icon={<span className="text-xl sm:text-2xl">🎯</span>}
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
          icon={<span className="text-xl sm:text-2xl">📦</span>}
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
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Revenue vs Cost Chart */}
        <div className="bg-card rounded-xl sm:rounded-2xl shadow-card p-4 sm:p-6">
          <h3 className="text-base sm:text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
            {t('revenueCostTrend')}
          </h3>
          <div className="h-48 sm:h-64 flex items-end justify-between gap-1 sm:gap-2">
            {chartData.labels.map((month, idx) => (
              <div key={month} className="flex-1 flex flex-col items-center gap-1">
                <div className="w-full flex gap-0.5 sm:gap-1 h-36 sm:h-48 items-end justify-center">
                  <div 
                    className="w-3 sm:w-5 bg-emerald-500 rounded-t transition-all hover:bg-emerald-600"
                    style={{ height: `${(chartData.revenue[idx] / 100000) * 100}%` }}
                    title={`${t('revenue')}: ${formatCurrency(chartData.revenue[idx], language)}`}
                  />
                  <div 
                    className="w-3 sm:w-5 bg-red-400 rounded-t transition-all hover:bg-red-500"
                    style={{ height: `${(chartData.cost[idx] / 100000) * 100}%` }}
                    title={`${t('cost')}: ${formatCurrency(chartData.cost[idx], language)}`}
                  />
                </div>
                <span className="text-[10px] sm:text-xs text-muted-foreground">{month}</span>
              </div>
            ))}
          </div>
          <div className="flex items-center justify-center gap-4 sm:gap-6 mt-4">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 bg-emerald-500 rounded" />
              <span className="text-xs sm:text-sm text-muted-foreground">{t('revenue')}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 bg-red-400 rounded" />
              <span className="text-xs sm:text-sm text-muted-foreground">{t('cost')}</span>
            </div>
          </div>
        </div>

        {/* Portfolio Distribution */}
        <div className="bg-card rounded-xl sm:rounded-2xl shadow-card p-4 sm:p-6">
          <h3 className="text-base sm:text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
            <PieChart className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
            {t('portfolioDistribution')}
          </h3>
          <div className="space-y-3 sm:space-y-4">
            {portfolioMetrics.map((portfolio, idx) => {
              const colors = ['bg-primary', 'bg-violet-500', 'bg-amber-500', 'bg-emerald-500'];
              const maxRevenue = Math.max(...portfolioMetrics.map(p => p.revenue));
              const percentage = (portfolio.revenue / maxRevenue) * 100;
              
              return (
                <div key={portfolio.id} className="space-y-1.5 sm:space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-xs sm:text-sm font-medium text-foreground">{portfolio.name}</span>
                    <span className="text-xs sm:text-sm font-semibold text-foreground">
                      {formatCurrency(portfolio.revenue, language)}
                    </span>
                  </div>
                  <div className="w-full bg-secondary rounded-full h-2 sm:h-2.5">
                    <div 
                      className={`h-2 sm:h-2.5 rounded-full ${colors[idx % colors.length]} transition-all`}
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
        <h3 className="text-lg sm:text-xl font-semibold text-foreground mb-3 sm:mb-4">{t('activePortfolios')}</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
          {portfolioMetrics.map((portfolio) => (
            <div
              key={portfolio.id}
              onClick={() => onPortfolioClick(portfolio)}
              className="bg-card rounded-xl shadow-card p-4 sm:p-5 cursor-pointer hover:shadow-card-hover transition-all duration-300 hover:-translate-y-1 border border-transparent hover:border-primary/20"
            >
              <div className="flex items-start justify-between mb-3 sm:mb-4">
                <div className="min-w-0 flex-1">
                  <div className="text-[10px] sm:text-xs text-muted-foreground mb-1">{portfolio.code}</div>
                  <h4 className="text-base sm:text-lg font-semibold text-foreground truncate">{portfolio.name}</h4>
                </div>
                <Package className="w-6 h-6 sm:w-8 sm:h-8 text-primary/60 flex-shrink-0 ms-2" />
              </div>
              
              <p className="text-xs sm:text-sm text-muted-foreground mb-3 sm:mb-4 line-clamp-2">
                {portfolio.description}
              </p>
              
              <div className="space-y-1.5 sm:space-y-2 text-xs sm:text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t('products')}:</span>
                  <span className="font-semibold">{portfolio.productCount}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t('revenue')}:</span>
                  <span className="font-semibold text-emerald-600">
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

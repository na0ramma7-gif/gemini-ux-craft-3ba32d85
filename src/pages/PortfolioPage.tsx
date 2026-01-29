import { useState, useMemo } from 'react';
import { useApp } from '@/context/AppContext';
import { Portfolio, Product } from '@/types';
import StatusBadge from '@/components/StatusBadge';
import KPICard from '@/components/KPICard';
import { formatCurrency, formatDate, cn } from '@/lib/utils';
import {
  ArrowLeft,
  ArrowRight,
  LayoutGrid,
  Package,
  Users,
  DollarSign,
  Target
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface PortfolioPageProps {
  portfolio: Portfolio;
  onBack: () => void;
  onProductClick: (product: Product) => void;
}

const PortfolioPage = ({ portfolio, onBack, onProductClick }: PortfolioPageProps) => {
  const { state, t, language, isRTL } = useApp();
  const [activeTab, setActiveTab] = useState('overview');

  const products = useMemo(() => 
    state.products.filter(p => p.portfolioId === portfolio.id),
    [state.products, portfolio.id]
  );

  const portfolioMetrics = useMemo(() => {
    let totalRevenue = 0;
    let totalCost = 0;
    let totalFeatures = 0;

    products.forEach(product => {
      const productFeatures = state.features.filter(f => f.productId === product.id);
      totalFeatures += productFeatures.length;
      
      productFeatures.forEach(feature => {
        state.revenuePlan
          .filter(r => r.featureId === feature.id)
          .forEach(r => { totalRevenue += r.expected; });
      });

      state.costs
        .filter(c => c.productId === product.id)
        .forEach(c => {
          if (c.type === 'CAPEX' && c.total && c.amortization) {
            totalCost += (c.total / c.amortization) * 6;
          } else if (c.monthly) {
            totalCost += c.monthly * 6;
          }
        });
    });

    const profit = totalRevenue - totalCost;
    const margin = totalRevenue > 0 ? (profit / totalRevenue) * 100 : 0;

    return {
      totalRevenue,
      totalCost,
      profit,
      margin,
      productCount: products.length,
      featureCount: totalFeatures
    };
  }, [products, state]);

  const BackIcon = isRTL ? ArrowRight : ArrowLeft;

  return (
    <div className="space-y-4 sm:space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-3 sm:gap-4">
        <button
          onClick={onBack}
          className="p-2 hover:bg-secondary rounded-lg transition-colors"
        >
          <BackIcon className="w-5 h-5" />
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <span className="text-xs sm:text-sm text-muted-foreground bg-secondary px-2 py-1 rounded">
              {portfolio.code}
            </span>
            <h1 className="text-xl sm:text-2xl font-bold text-foreground truncate">{portfolio.name}</h1>
          </div>
          <p className="text-sm text-muted-foreground mt-1">{portfolio.description}</p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-4">
        <KPICard
          title={t('totalRevenue')}
          value={formatCurrency(portfolioMetrics.totalRevenue, language)}
          subtitle={t('expectedFromFeatures')}
          icon={<span className="text-lg sm:text-2xl">💰</span>}
          variant="green"
          progress={{
            label: t('targetYear'),
            target: formatCurrency(portfolioMetrics.totalRevenue * 1.35, language),
            percent: 74,
            status: 'negative'
          }}
        />
        
        <KPICard
          title={t('totalCost')}
          value={formatCurrency(portfolioMetrics.totalCost, language)}
          subtitle={t('resourcesCapexOpex')}
          icon={<span className="text-lg sm:text-2xl">💸</span>}
          variant="red"
          progress={{
            label: t('budgetYear'),
            target: formatCurrency(portfolioMetrics.totalCost * 1.18, language),
            percent: 85,
            status: 'positive'
          }}
        />
        
        <KPICard
          title={t('netProfit')}
          value={formatCurrency(portfolioMetrics.profit, language)}
          subtitle={`${t('margin')}: ${portfolioMetrics.margin.toFixed(1)}%`}
          icon={<span className="text-lg sm:text-2xl">✅</span>}
          variant={portfolioMetrics.profit >= 0 ? 'green' : 'red'}
        />
        
        <KPICard
          title={t('targetVsAchieved')}
          value="74%"
          icon={<span className="text-lg sm:text-2xl">🎯</span>}
          variant="gradient"
        />
        
        <KPICard
          title={t('products')}
          value={portfolioMetrics.productCount.toString()}
          subtitle={`${portfolioMetrics.featureCount} ${t('features')}`}
          icon={<span className="text-lg sm:text-2xl">📦</span>}
          variant="purple"
        />
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="bg-card rounded-xl shadow-card overflow-hidden">
          <TabsList className="w-full justify-start border-b rounded-none h-auto p-0 bg-transparent overflow-x-auto flex-nowrap">
            <TabsTrigger 
              value="overview" 
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm whitespace-nowrap"
            >
              <LayoutGrid className="w-4 h-4 me-1 sm:me-2" />
              {t('overview')}
            </TabsTrigger>
            <TabsTrigger 
              value="products"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm whitespace-nowrap"
            >
              <Package className="w-4 h-4 me-1 sm:me-2" />
              {t('products')}
            </TabsTrigger>
            <TabsTrigger 
              value="resources"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm whitespace-nowrap"
            >
              <Users className="w-4 h-4 me-1 sm:me-2" />
              {t('resources')}
            </TabsTrigger>
            <TabsTrigger 
              value="financials"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm whitespace-nowrap"
            >
              <DollarSign className="w-4 h-4 me-1 sm:me-2" />
              {t('financials')}
            </TabsTrigger>
          </TabsList>

          <div className="p-4 sm:p-6">
            <TabsContent value="overview" className="mt-0 space-y-6">
              <h3 className="text-base sm:text-lg font-semibold text-foreground">{t('productsOverview')}</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                {products.map(product => {
                  const productReleases = state.releases.filter(r => r.productId === product.id);
                  const productFeatures = state.features.filter(f => f.productId === product.id);
                  let productRevenue = 0;
                  productFeatures.forEach(f => {
                    state.revenuePlan.filter(r => r.featureId === f.id).forEach(r => {
                      productRevenue += r.expected;
                    });
                  });

                  return (
                    <div
                      key={product.id}
                      onClick={() => onProductClick(product)}
                      className="bg-card border border-border rounded-xl p-4 sm:p-5 hover:shadow-lg transition-all cursor-pointer hover:border-primary/30"
                    >
                      <div className="flex justify-between items-start mb-3">
                        <div className="min-w-0 flex-1">
                          <div className="text-[10px] sm:text-xs text-muted-foreground mb-1">{product.code}</div>
                          <h4 className="text-base sm:text-lg font-semibold text-foreground truncate">{product.name}</h4>
                        </div>
                        <StatusBadge status={product.status} />
                      </div>
                      
                      <div className="space-y-1.5 sm:space-y-2 text-xs sm:text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">{t('releases')}:</span>
                          <span className="font-semibold">{productReleases.length}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">{t('features')}:</span>
                          <span className="font-semibold">{productFeatures.length}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">{t('revenue')}:</span>
                          <span className="font-semibold text-emerald-600">{formatCurrency(productRevenue, language)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">{t('owner')}:</span>
                          <span className="font-medium">{product.owner}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </TabsContent>

            <TabsContent value="products" className="mt-0 space-y-4">
              <h3 className="text-base sm:text-lg font-semibold text-foreground">{t('allProducts')}</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                {products.map(product => (
                  <div
                    key={product.id}
                    onClick={() => onProductClick(product)}
                    className="bg-card border-2 border-border rounded-xl shadow-lg p-4 sm:p-6 hover:border-primary transition-all cursor-pointer"
                  >
                    <div className="flex justify-between items-start mb-3 sm:mb-4">
                      <div className="min-w-0 flex-1">
                        <div className="text-[10px] sm:text-xs text-muted-foreground mb-1">{product.code}</div>
                        <h4 className="text-lg sm:text-xl font-bold text-foreground mb-1 truncate">{product.name}</h4>
                        <StatusBadge status={product.status} />
                      </div>
                      <Target className="w-6 h-6 sm:w-8 sm:h-8 text-primary/60 flex-shrink-0 ms-2" />
                    </div>
                    <div className="space-y-1.5 sm:space-y-2">
                      <div className="flex justify-between text-xs sm:text-sm">
                        <span className="text-muted-foreground">{t('owner')}:</span>
                        <span className="font-medium">{product.owner}</span>
                      </div>
                    </div>
                    <div className="mt-3 sm:mt-4 text-center text-primary text-xs sm:text-sm font-medium">
                      {t('clickToView')}
                    </div>
                  </div>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="resources" className="mt-0">
              <h3 className="text-base sm:text-lg font-semibold text-foreground mb-4">{t('assignments')}</h3>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[600px]">
                  <thead className="bg-secondary">
                    <tr>
                      <th className="px-3 sm:px-4 py-2 sm:py-3 text-start text-[10px] sm:text-xs font-medium text-muted-foreground uppercase">{t('name')}</th>
                      <th className="px-3 sm:px-4 py-2 sm:py-3 text-start text-[10px] sm:text-xs font-medium text-muted-foreground uppercase">{t('role')}</th>
                      <th className="px-3 sm:px-4 py-2 sm:py-3 text-start text-[10px] sm:text-xs font-medium text-muted-foreground uppercase">{t('product')}</th>
                      <th className="px-3 sm:px-4 py-2 sm:py-3 text-start text-[10px] sm:text-xs font-medium text-muted-foreground uppercase">{t('period')}</th>
                      <th className="px-3 sm:px-4 py-2 sm:py-3 text-end text-[10px] sm:text-xs font-medium text-muted-foreground uppercase">{t('utilization')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {state.assignments
                      .filter(a => products.some(p => p.id === a.productId))
                      .map(assignment => {
                        const resource = state.resources.find(r => r.id === assignment.resourceId);
                        const product = products.find(p => p.id === assignment.productId);
                        
                        return (
                          <tr key={assignment.id} className="hover:bg-secondary/50">
                            <td className="px-3 sm:px-4 py-2 sm:py-3 font-medium text-xs sm:text-sm">{resource?.name}</td>
                            <td className="px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm text-muted-foreground">{resource?.role}</td>
                            <td className="px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm">{product?.name}</td>
                            <td className="px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm">
                              {formatDate(assignment.startDate, language)} → {formatDate(assignment.endDate, language)}
                            </td>
                            <td className="px-3 sm:px-4 py-2 sm:py-3 text-end font-semibold text-primary text-xs sm:text-sm">
                              {assignment.utilization}%
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            </TabsContent>

            <TabsContent value="financials" className="mt-0">
              <h3 className="text-base sm:text-lg font-semibold text-foreground mb-4">{t('financialOverview')}</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
                <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-xl p-4 sm:p-6 border border-emerald-200 dark:border-emerald-800">
                  <h4 className="text-xs sm:text-sm font-medium text-emerald-800 dark:text-emerald-400 mb-2">{t('totalRevenue')}</h4>
                  <div className="text-xl sm:text-3xl font-bold text-emerald-600">{formatCurrency(portfolioMetrics.totalRevenue, language)}</div>
                </div>
                <div className="bg-red-50 dark:bg-red-900/20 rounded-xl p-4 sm:p-6 border border-red-200 dark:border-red-800">
                  <h4 className="text-xs sm:text-sm font-medium text-red-800 dark:text-red-400 mb-2">{t('totalCost')}</h4>
                  <div className="text-xl sm:text-3xl font-bold text-red-600">{formatCurrency(portfolioMetrics.totalCost, language)}</div>
                </div>
                <div className={cn(
                  "rounded-xl p-4 sm:p-6 border",
                  portfolioMetrics.profit >= 0 
                    ? "bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800"
                    : "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800"
                )}>
                  <h4 className={cn(
                    "text-xs sm:text-sm font-medium mb-2",
                    portfolioMetrics.profit >= 0 ? "text-emerald-800 dark:text-emerald-400" : "text-red-800 dark:text-red-400"
                  )}>{t('netProfit')}</h4>
                  <div className={cn(
                    "text-xl sm:text-3xl font-bold",
                    portfolioMetrics.profit >= 0 ? "text-emerald-600" : "text-red-600"
                  )}>
                    {formatCurrency(portfolioMetrics.profit, language)}
                  </div>
                </div>
              </div>
            </TabsContent>
          </div>
        </div>
      </Tabs>
    </div>
  );
};

export default PortfolioPage;

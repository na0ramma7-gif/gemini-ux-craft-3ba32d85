import { useState, useMemo } from 'react';
import { useApp } from '@/context/AppContext';
import { Portfolio, Product } from '@/types';
import StatusBadge from '@/components/StatusBadge';
import KPICard from '@/components/KPICard';
import { Button } from '@/components/ui/button';
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

    return { totalRevenue, totalCost, profit, margin, productCount: products.length, featureCount: totalFeatures };
  }, [products, state]);

  const BackIcon = isRTL ? ArrowRight : ArrowLeft;

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="p-2 hover:bg-secondary rounded-lg transition-colors">
          <BackIcon className="w-5 h-5" />
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-muted-foreground bg-secondary px-2 py-0.5 rounded">{portfolio.code}</span>
            <h1 className="text-foreground truncate">{portfolio.name}</h1>
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">{portfolio.description}</p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <KPICard title={t('totalRevenue')} value={formatCurrency(portfolioMetrics.totalRevenue, language)} subtitle={t('expectedFromFeatures')} icon={<span className="text-lg">💰</span>} variant="green"
          progress={{ label: t('targetYear'), target: formatCurrency(portfolioMetrics.totalRevenue * 1.35, language), percent: 74, status: 'negative' }} />
        <KPICard title={t('totalCost')} value={formatCurrency(portfolioMetrics.totalCost, language)} subtitle={t('resourcesCapexOpex')} icon={<span className="text-lg">💸</span>} variant="red"
          progress={{ label: t('budgetYear'), target: formatCurrency(portfolioMetrics.totalCost * 1.18, language), percent: 85, status: 'positive' }} />
        <KPICard title={t('netProfit')} value={formatCurrency(portfolioMetrics.profit, language)} subtitle={`${t('margin')}: ${portfolioMetrics.margin.toFixed(1)}%`} icon={<span className="text-lg">✅</span>} variant={portfolioMetrics.profit >= 0 ? 'green' : 'red'} />
        <KPICard title={t('targetVsAchieved')} value="74%" icon={<span className="text-lg">🎯</span>} variant="gradient" />
        <KPICard title={t('products')} value={portfolioMetrics.productCount.toString()} subtitle={`${portfolioMetrics.featureCount} ${t('features')}`} icon={<span className="text-lg">📦</span>} variant="purple" />
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="bg-card rounded-xl shadow-card overflow-hidden">
          <TabsList className="w-full justify-start border-b rounded-none h-auto p-0 bg-transparent overflow-x-auto flex-nowrap">
            {[
              { value: 'overview', icon: <LayoutGrid className="w-4 h-4 me-1.5" />, label: t('overview') },
              { value: 'products', icon: <Package className="w-4 h-4 me-1.5" />, label: t('products') },
              { value: 'resources', icon: <Users className="w-4 h-4 me-1.5" />, label: t('resources') },
              { value: 'financials', icon: <DollarSign className="w-4 h-4 me-1.5" />, label: t('financials') },
            ].map(tab => (
              <TabsTrigger key={tab.value} value={tab.value}
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-5 py-3 text-sm whitespace-nowrap">
                {tab.icon}{tab.label}
              </TabsTrigger>
            ))}
          </TabsList>

          <div className="p-5">
            <TabsContent value="overview" className="mt-0 space-y-5">
              <h3 className="text-foreground">{t('productsOverview')}</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {products.map(product => {
                  const productFeatures = state.features.filter(f => f.productId === product.id);
                  let productRevenue = 0;
                  productFeatures.forEach(f => {
                    state.revenuePlan.filter(r => r.featureId === f.id).forEach(r => { productRevenue += r.expected; });
                  });

                  return (
                    <div key={product.id} onClick={() => onProductClick(product)}
                      className="bg-card border border-border rounded-xl p-4 hover:shadow-card-hover transition-all cursor-pointer hover:border-primary/30">
                      <div className="flex justify-between items-start mb-3">
                        <div className="min-w-0 flex-1">
                          <div className="text-xs text-muted-foreground mb-0.5">{product.code}</div>
                          <h4 className="text-base font-semibold text-foreground truncate">{product.name}</h4>
                        </div>
                        <StatusBadge status={product.status} />
                      </div>
                      <div className="space-y-1.5 text-sm">
                        <div className="flex justify-between"><span className="text-muted-foreground">{t('features')}:</span><span className="font-semibold">{productFeatures.length}</span></div>
                        <div className="flex justify-between"><span className="text-muted-foreground">{t('revenue')}:</span><span className="font-semibold text-revenue">{formatCurrency(productRevenue, language)}</span></div>
                        <div className="flex justify-between"><span className="text-muted-foreground">{t('owner')}:</span><span className="font-medium">{product.owner}</span></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </TabsContent>

            <TabsContent value="products" className="mt-0 space-y-4">
              <h3 className="text-foreground">{t('allProducts')}</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {products.map(product => (
                  <div key={product.id} onClick={() => onProductClick(product)}
                    className="bg-card border border-border rounded-xl p-5 hover:border-primary transition-all cursor-pointer shadow-card hover:shadow-card-hover">
                    <div className="flex justify-between items-start mb-3">
                      <div className="min-w-0 flex-1">
                        <div className="text-xs text-muted-foreground mb-0.5">{product.code}</div>
                        <h4 className="text-lg font-bold text-foreground mb-1 truncate">{product.name}</h4>
                        <StatusBadge status={product.status} />
                      </div>
                      <Target className="w-6 h-6 text-primary/50 flex-shrink-0 ms-2" />
                    </div>
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">{t('owner')}:</span>
                        <span className="font-medium">{product.owner}</span>
                      </div>
                    </div>
                    <div className="mt-3 text-center text-primary text-sm font-medium">{t('clickToView')}</div>
                  </div>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="resources" className="mt-0">
              <h3 className="text-foreground mb-4">{t('assignments')}</h3>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[600px]">
                  <thead className="bg-secondary/50">
                    <tr>
                      <th className="px-4 py-2.5 text-start text-xs font-medium text-muted-foreground uppercase">{t('name')}</th>
                      <th className="px-4 py-2.5 text-start text-xs font-medium text-muted-foreground uppercase">{t('role')}</th>
                      <th className="px-4 py-2.5 text-start text-xs font-medium text-muted-foreground uppercase">{t('product')}</th>
                      <th className="px-4 py-2.5 text-start text-xs font-medium text-muted-foreground uppercase">{t('period')}</th>
                      <th className="px-4 py-2.5 text-end text-xs font-medium text-muted-foreground uppercase">{t('utilization')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {state.assignments
                      .filter(a => products.some(p => p.id === a.productId))
                      .map(assignment => {
                        const resource = state.resources.find(r => r.id === assignment.resourceId);
                        const product = products.find(p => p.id === assignment.productId);
                        return (
                          <tr key={assignment.id} className="hover:bg-secondary/30">
                            <td className="px-4 py-2.5 font-medium text-sm">{resource?.name}</td>
                            <td className="px-4 py-2.5 text-sm text-muted-foreground">{resource?.role}</td>
                            <td className="px-4 py-2.5 text-sm">{product?.name}</td>
                            <td className="px-4 py-2.5 text-sm">{formatDate(assignment.startDate, language)} → {formatDate(assignment.endDate, language)}</td>
                            <td className="px-4 py-2.5 text-end font-semibold text-primary text-sm">{assignment.utilization}%</td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            </TabsContent>

            <TabsContent value="financials" className="mt-0 space-y-6">

              {/* Products Financial Table */}
              <div>
                <div className="border-b pb-3 mb-4">
                  <h3 className="text-base sm:text-lg font-bold text-foreground">💵 {t('revenue')}</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[800px]">
                    <thead className="bg-secondary">
                      <tr>
                        <th className="px-3 sm:px-4 py-2 sm:py-3 text-start text-[10px] sm:text-xs font-medium text-muted-foreground uppercase">{t('product')}</th>
                        <th className="px-3 sm:px-4 py-2 sm:py-3 text-start text-[10px] sm:text-xs font-medium text-muted-foreground uppercase">{t('portfolio')}</th>
                        <th className="px-3 sm:px-4 py-2 sm:py-3 text-center text-[10px] sm:text-xs font-medium text-muted-foreground uppercase">{t('status')}</th>
                        <th className="px-3 sm:px-4 py-2 sm:py-3 text-end text-[10px] sm:text-xs font-medium text-muted-foreground uppercase">{t('expected')}</th>
                        <th className="px-3 sm:px-4 py-2 sm:py-3 text-end text-[10px] sm:text-xs font-medium text-muted-foreground uppercase">{t('actual')}</th>
                        <th className="px-3 sm:px-4 py-2 sm:py-3 text-end text-[10px] sm:text-xs font-medium text-muted-foreground uppercase">{t('cost')}</th>
                        <th className="px-3 sm:px-4 py-2 sm:py-3 text-end text-[10px] sm:text-xs font-medium text-muted-foreground uppercase">{t('variance')}</th>
                        <th className="px-3 sm:px-4 py-2 sm:py-3 text-center text-[10px] sm:text-xs font-medium text-muted-foreground uppercase">{t('actions')}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {products.map(prod => {
                        const prodFeatures = state.features.filter(f => f.productId === prod.id);
                        let expected = 0, actual = 0, cost = 0;
                        prodFeatures.forEach(feature => {
                          state.revenuePlan.filter(r => r.featureId === feature.id).forEach(r => { expected += r.expected; });
                          state.revenueActual.filter(r => r.featureId === feature.id).forEach(r => { actual += r.actual; });
                        });
                        state.costs.filter(c => c.productId === prod.id).forEach(c => {
                          if (c.type === 'CAPEX' && c.total && c.amortization) {
                            cost += (c.total / c.amortization) * 6;
                          } else if (c.monthly) {
                            cost += c.monthly * 6;
                          }
                        });
                        const variance = actual - expected;
                        return (
                          <tr key={prod.id} className="hover:bg-secondary/50">
                            <td className="px-3 sm:px-4 py-2 sm:py-3 font-medium text-foreground text-xs sm:text-sm">{prod.name}</td>
                            <td className="px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm text-muted-foreground">{portfolio.name}</td>
                            <td className="px-3 sm:px-4 py-2 sm:py-3 text-center"><StatusBadge status={prod.status} /></td>
                            <td className="px-3 sm:px-4 py-2 sm:py-3 text-end font-semibold text-revenue text-xs sm:text-sm">{formatCurrency(expected, language)}</td>
                            <td className="px-3 sm:px-4 py-2 sm:py-3 text-end font-semibold text-foreground text-xs sm:text-sm">{formatCurrency(actual, language)}</td>
                            <td className="px-3 sm:px-4 py-2 sm:py-3 text-end font-semibold text-cost text-xs sm:text-sm">{formatCurrency(cost, language)}</td>
                            <td className={cn(
                              "px-3 sm:px-4 py-2 sm:py-3 text-end font-semibold text-xs sm:text-sm",
                              variance >= 0 ? "text-revenue" : "text-cost"
                            )}>
                              {variance >= 0 ? '+' : ''}{formatCurrency(variance, language)}
                            </td>
                            <td className="px-3 sm:px-4 py-2 sm:py-3 text-center">
                              <Button size="sm" onClick={() => onProductClick(prod)}>
                                {t('planFinancials')}
                              </Button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
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
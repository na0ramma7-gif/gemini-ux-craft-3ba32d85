import { useState, useMemo } from 'react';
import { useApp } from '@/context/AppContext';
import { Portfolio, Product } from '@/types';
import StatusBadge from '@/components/StatusBadge';
import KPICard from '@/components/KPICard';
import { formatCurrency, formatDate } from '@/lib/utils';
import { cn } from '@/lib/utils';
import {
  ArrowLeft,
  LayoutGrid,
  Package,
  Users,
  DollarSign,
  Target,
  TrendingUp
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface PortfolioPageProps {
  portfolio: Portfolio;
  onBack: () => void;
  onProductClick: (product: Product) => void;
}

const PortfolioPage = ({ portfolio, onBack, onProductClick }: PortfolioPageProps) => {
  const { state } = useApp();
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

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={onBack}
          className="p-2 hover:bg-secondary rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground bg-secondary px-2 py-1 rounded">
              {portfolio.code}
            </span>
            <h1 className="text-2xl font-bold text-foreground">{portfolio.name}</h1>
          </div>
          <p className="text-muted-foreground mt-1">{portfolio.description}</p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <KPICard
          title="Total Revenue"
          value={formatCurrency(portfolioMetrics.totalRevenue)}
          subtitle="Expected from features"
          icon={<span className="text-2xl">💰</span>}
          variant="green"
          progress={{
            label: "Target (year):",
            target: formatCurrency(portfolioMetrics.totalRevenue * 1.35),
            percent: 74,
            status: 'negative'
          }}
        />
        
        <KPICard
          title="Total Cost"
          value={formatCurrency(portfolioMetrics.totalCost)}
          subtitle="Resources + CAPEX + OPEX"
          icon={<span className="text-2xl">💸</span>}
          variant="red"
          progress={{
            label: "Budget (year):",
            target: formatCurrency(portfolioMetrics.totalCost * 1.18),
            percent: 85,
            status: 'positive'
          }}
        />
        
        <KPICard
          title="Net Profit"
          value={formatCurrency(portfolioMetrics.profit)}
          subtitle={`Margin: ${portfolioMetrics.margin.toFixed(1)}%`}
          icon={<span className="text-2xl">✅</span>}
          variant={portfolioMetrics.profit >= 0 ? 'green' : 'red'}
        />
        
        <KPICard
          title="Target vs Achieved"
          value="74%"
          icon={<span className="text-2xl">🎯</span>}
          variant="gradient"
        />
        
        <KPICard
          title="Products"
          value={portfolioMetrics.productCount.toString()}
          subtitle={`${portfolioMetrics.featureCount} features`}
          icon={<span className="text-2xl">📦</span>}
          variant="purple"
        />
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="bg-card rounded-xl shadow-card">
          <TabsList className="w-full justify-start border-b rounded-none h-auto p-0 bg-transparent">
            <TabsTrigger 
              value="overview" 
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-6 py-4"
            >
              <LayoutGrid className="w-4 h-4 mr-2" />
              Overview
            </TabsTrigger>
            <TabsTrigger 
              value="products"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-6 py-4"
            >
              <Package className="w-4 h-4 mr-2" />
              Products
            </TabsTrigger>
            <TabsTrigger 
              value="resources"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-6 py-4"
            >
              <Users className="w-4 h-4 mr-2" />
              Resources
            </TabsTrigger>
            <TabsTrigger 
              value="financials"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-6 py-4"
            >
              <DollarSign className="w-4 h-4 mr-2" />
              Financials
            </TabsTrigger>
          </TabsList>

          <div className="p-6">
            <TabsContent value="overview" className="mt-0 space-y-6">
              <h3 className="text-lg font-semibold text-foreground">Products Overview</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                      className="bg-card border border-border rounded-xl p-5 hover:shadow-lg transition-all cursor-pointer hover:border-primary/30"
                    >
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <div className="text-xs text-muted-foreground mb-1">{product.code}</div>
                          <h4 className="text-lg font-semibold text-foreground">{product.name}</h4>
                        </div>
                        <StatusBadge status={product.status} />
                      </div>
                      
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Releases:</span>
                          <span className="font-semibold">{productReleases.length}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Features:</span>
                          <span className="font-semibold">{productFeatures.length}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Revenue:</span>
                          <span className="font-semibold text-emerald-600">{formatCurrency(productRevenue)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Owner:</span>
                          <span className="font-medium">{product.owner}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </TabsContent>

            <TabsContent value="products" className="mt-0 space-y-4">
              <h3 className="text-lg font-semibold text-foreground">All Products</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {products.map(product => (
                  <div
                    key={product.id}
                    onClick={() => onProductClick(product)}
                    className="bg-card border-2 border-border rounded-xl shadow-lg p-6 hover:border-primary transition-all cursor-pointer"
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <div className="text-xs text-muted-foreground mb-1">{product.code}</div>
                        <h4 className="text-xl font-bold text-foreground mb-1">{product.name}</h4>
                        <StatusBadge status={product.status} />
                      </div>
                      <Target className="w-8 h-8 text-primary/60" />
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Owner:</span>
                        <span className="font-medium">{product.owner}</span>
                      </div>
                    </div>
                    <div className="mt-4 text-center text-primary text-sm font-medium">
                      Click to view details →
                    </div>
                  </div>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="resources" className="mt-0">
              <h3 className="text-lg font-semibold text-foreground mb-4">Resource Assignments</h3>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-secondary">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Resource</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Role</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Product</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Period</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase">Utilization</th>
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
                            <td className="px-4 py-3 font-medium">{resource?.name}</td>
                            <td className="px-4 py-3 text-sm text-muted-foreground">{resource?.role}</td>
                            <td className="px-4 py-3 text-sm">{product?.name}</td>
                            <td className="px-4 py-3 text-sm">
                              {formatDate(assignment.startDate)} → {formatDate(assignment.endDate)}
                            </td>
                            <td className="px-4 py-3 text-right font-semibold text-primary">
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
              <h3 className="text-lg font-semibold text-foreground mb-4">Financial Overview</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-xl p-6 border border-emerald-200 dark:border-emerald-800">
                  <h4 className="text-sm font-medium text-emerald-800 dark:text-emerald-400 mb-2">Total Revenue</h4>
                  <div className="text-3xl font-bold text-emerald-600">{formatCurrency(portfolioMetrics.totalRevenue)}</div>
                </div>
                <div className="bg-red-50 dark:bg-red-900/20 rounded-xl p-6 border border-red-200 dark:border-red-800">
                  <h4 className="text-sm font-medium text-red-800 dark:text-red-400 mb-2">Total Cost</h4>
                  <div className="text-3xl font-bold text-red-600">{formatCurrency(portfolioMetrics.totalCost)}</div>
                </div>
                <div className={cn(
                  "rounded-xl p-6 border",
                  portfolioMetrics.profit >= 0 
                    ? "bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800"
                    : "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800"
                )}>
                  <h4 className={cn(
                    "text-sm font-medium mb-2",
                    portfolioMetrics.profit >= 0 ? "text-emerald-800 dark:text-emerald-400" : "text-red-800 dark:text-red-400"
                  )}>Net Profit</h4>
                  <div className={cn(
                    "text-3xl font-bold",
                    portfolioMetrics.profit >= 0 ? "text-emerald-600" : "text-red-600"
                  )}>
                    {formatCurrency(portfolioMetrics.profit)}
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

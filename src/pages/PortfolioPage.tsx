import { useState, useMemo, useRef } from 'react';
import { useApp } from '@/context/AppContext';
import { Portfolio, Product } from '@/types';
import StatusBadge from '@/components/StatusBadge';
import KPICard from '@/components/KPICard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { formatCurrency, formatDate, cn } from '@/lib/utils';
import {
  ArrowLeft, ArrowRight, LayoutGrid, Package, Users, DollarSign, Target,
  Upload, X, TrendingUp, Activity, User, Pencil, Save, BarChart3,
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell,
} from 'recharts';

interface PortfolioPageProps {
  portfolio: Portfolio;
  onBack: () => void;
  onProductClick: (product: Product) => void;
}

const LIFECYCLE_COLORS: Record<string, string> = {
  Ideation: 'hsl(var(--muted-foreground))',
  Development: 'hsl(var(--primary))',
  Growth: 'hsl(142 71% 45%)',
  Mature: 'hsl(var(--accent-foreground))',
  Sunset: 'hsl(38 92% 50%)',
};

const PIE_COLORS = [
  'hsl(var(--primary))', 'hsl(142 71% 45%)', 'hsl(0 84% 60%)',
  'hsl(38 92% 50%)', 'hsl(262 83% 58%)', 'hsl(200 98% 39%)',
];

const ChartTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload) return null;
  return (
    <div className="bg-card border border-border rounded-lg p-2.5 shadow-lg text-xs">
      <p className="font-medium text-foreground mb-1">{label}</p>
      {payload.map((entry: any, i: number) => (
        <p key={i} style={{ color: entry.color }} className="flex justify-between gap-4">
          <span>{entry.name}:</span>
          <span className="font-semibold">{typeof entry.value === 'number' ? entry.value.toLocaleString() : entry.value}</span>
        </p>
      ))}
    </div>
  );
};

const PortfolioPage = ({ portfolio, onBack, onProductClick }: PortfolioPageProps) => {
  const { state, updatePortfolio, t, language, isRTL } = useApp();
  const [activeTab, setActiveTab] = useState('overview');
  const [showEditModal, setShowEditModal] = useState(false);
  const [editData, setEditData] = useState<Partial<Portfolio>>({});
  const logoInputRef = useRef<HTMLInputElement>(null);

  const products = useMemo(() => state.products.filter(p => p.portfolioId === portfolio.id), [state.products, portfolio.id]);

  const portfolioMetrics = useMemo(() => {
    let totalRevenue = 0, totalCost = 0, totalFeatures = 0, deliveredFeatures = 0, inProgressFeatures = 0, delayedFeatures = 0, activeReleases = 0;

    const productData = products.map(product => {
      const productFeatures = state.features.filter(f => f.productId === product.id);
      totalFeatures += productFeatures.length;
      deliveredFeatures += productFeatures.filter(f => f.status === 'Delivered').length;
      inProgressFeatures += productFeatures.filter(f => f.status === 'In Progress').length;

      const productReleases = state.releases.filter(r => r.productId === product.id);
      activeReleases += productReleases.filter(r => r.status === 'In Progress').length;

      let rev = 0, cost = 0, planned = 0;
      productFeatures.forEach(f => {
        state.revenueActual.filter(r => r.featureId === f.id).forEach(r => { rev += r.actual; });
        state.revenuePlan.filter(r => r.featureId === f.id).forEach(r => { planned += r.expected; });
      });
      state.costs.filter(c => c.productId === product.id).forEach(c => {
        if (c.type === 'CAPEX' && c.total && c.amortization) cost += (c.total / c.amortization) * 6;
        else if (c.monthly) cost += c.monthly * 6;
      });
      totalRevenue += rev;
      totalCost += cost;

      return { name: product.name, revenue: rev, cost, profit: rev - cost, lifecycle: product.lifecycleStage || 'Development' };
    });

    const profit = totalRevenue - totalCost;
    const margin = totalRevenue > 0 ? (profit / totalRevenue) * 100 : 0;

    return {
      totalRevenue, totalCost, profit, margin,
      productCount: products.length, featureCount: totalFeatures,
      deliveredFeatures, inProgressFeatures, delayedFeatures, activeReleases,
      productData,
    };
  }, [products, state]);

  // Lifecycle distribution
  const lifecycleDistribution = useMemo(() => {
    const counts: Record<string, number> = {};
    products.forEach(p => {
      const stage = p.lifecycleStage || 'Development';
      counts[stage] = (counts[stage] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [products]);

  // Revenue by product for bar chart
  const revenueByProduct = portfolioMetrics.productData;

  // Revenue heatmap data (product x month)
  const heatmapData = useMemo(() => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
    return products.map(product => {
      const features = state.features.filter(f => f.productId === product.id);
      const monthlyRev: Record<string, number> = {};
      months.forEach(m => { monthlyRev[m] = 0; });
      features.forEach(f => {
        state.revenueActual.filter(r => r.featureId === f.id).forEach(r => {
          const month = new Date(r.month + '-01').toLocaleString('en', { month: 'short' });
          if (monthlyRev[month] !== undefined) monthlyRev[month] += r.actual;
        });
      });
      return { product: product.name, ...monthlyRev };
    });
  }, [products, state]);

  // Strategic alignment
  const strategicAlignment = useMemo(() => {
    const objectives: Record<string, string[]> = {};
    products.forEach(p => {
      const obj = p.strategicObjective || 'No Objective Defined';
      const shortObj = obj.length > 50 ? obj.slice(0, 50) + '...' : obj;
      if (!objectives[shortObj]) objectives[shortObj] = [];
      objectives[shortObj].push(p.name);
    });
    return objectives;
  }, [products]);

  const BackIcon = isRTL ? ArrowRight : ArrowLeft;

  const openEditModal = () => {
    setEditData({
      name: portfolio.name, description: portfolio.description, purpose: portfolio.purpose,
      strategicObjective: portfolio.strategicObjective, businessValue: portfolio.businessValue,
      owner: portfolio.owner, technicalLead: portfolio.technicalLead,
      businessStakeholder: portfolio.businessStakeholder, priority: portfolio.priority,
    });
    setShowEditModal(true);
  };

  const handleSave = () => { updatePortfolio(portfolio.id, editData); setShowEditModal(false); };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => { updatePortfolio(portfolio.id, { logo: reader.result as string }); };
    reader.readAsDataURL(file);
  };

  const heatmapMonths = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
  const maxHeatmapVal = useMemo(() => {
    let max = 0;
    heatmapData.forEach(row => {
      heatmapMonths.forEach(m => {
        const v = (row as any)[m] || 0;
        if (v > max) max = v;
      });
    });
    return max || 1;
  }, [heatmapData]);

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
            <span className={cn("px-2 py-0.5 rounded-full text-[11px] font-semibold",
              portfolio.priority === 'High' ? 'bg-destructive/10 text-destructive' :
              portfolio.priority === 'Medium' ? 'bg-warning/10 text-warning' : 'bg-muted text-muted-foreground'
            )}>{portfolio.priority}</span>
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">{portfolio.description}</p>
        </div>
        <Button variant="outline" size="sm" onClick={openEditModal} className="gap-1.5">
          <Pencil className="w-3.5 h-3.5" /> {t('edit')}
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <KPICard title={t('totalRevenue')} value={formatCurrency(portfolioMetrics.totalRevenue, language)} icon={<span className="text-lg">💰</span>} variant="green" />
        <KPICard title={t('totalCost')} value={formatCurrency(portfolioMetrics.totalCost, language)} icon={<span className="text-lg">💸</span>} variant="red" />
        <KPICard title={t('netProfit')} value={formatCurrency(portfolioMetrics.profit, language)} subtitle={`${t('margin')}: ${portfolioMetrics.margin.toFixed(1)}%`} icon={<span className="text-lg">✅</span>} variant={portfolioMetrics.profit >= 0 ? 'green' : 'red'} />
        <KPICard title={t('products')} value={portfolioMetrics.productCount.toString()} subtitle={`${portfolioMetrics.featureCount} ${t('features')}`} icon={<span className="text-lg">📦</span>} variant="purple" />
        <KPICard title="Active Releases" value={portfolioMetrics.activeReleases.toString()} subtitle={`${portfolioMetrics.inProgressFeatures} in progress`} icon={<span className="text-lg">🚀</span>} variant="gradient" />
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
            {/* OVERVIEW / DASHBOARD TAB */}
            <TabsContent value="overview" className="mt-0 space-y-6">

              {/* Row 1: Revenue Contribution + Profitability */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Product Revenue Contribution — horizontal bar */}
                <div className="bg-secondary/30 rounded-xl p-5">
                  <h4 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-primary" /> Product Revenue Contribution
                  </h4>
                  <div className="h-56">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={[...revenueByProduct].sort((a, b) => b.revenue - a.revenue)} layout="vertical" margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                        <XAxis type="number" fontSize={10} stroke="hsl(var(--muted-foreground))" axisLine={false} tickLine={false} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
                        <YAxis dataKey="name" type="category" width={140} fontSize={11} stroke="hsl(var(--muted-foreground))" axisLine={false} tickLine={false} />
                        <Tooltip content={<ChartTooltip />} />
                        <Bar dataKey="revenue" name={t('revenue')} fill="hsl(var(--primary))" radius={[0, 6, 6, 0]} barSize={22} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Profitability by Product — with zero baseline */}
                <div className="bg-secondary/30 rounded-xl p-5">
                  <h4 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-primary" /> Profitability by Product
                  </h4>
                  <div className="h-56">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={revenueByProduct} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                        <XAxis dataKey="name" fontSize={10} stroke="hsl(var(--muted-foreground))" axisLine={false} tickLine={false} />
                        <YAxis fontSize={10} stroke="hsl(var(--muted-foreground))" axisLine={false} tickLine={false} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
                        <Tooltip content={<ChartTooltip />} />
                        {/* Zero baseline reference */}
                        <CartesianGrid strokeDasharray="0" stroke="hsl(var(--muted-foreground))" horizontal={false} vertical={false} />
                        <Bar dataKey="profit" name={t('netProfit')} radius={[4, 4, 4, 4]} barSize={32}>
                          {revenueByProduct.map((entry, idx) => (
                            <Cell key={idx} fill={entry.profit >= 0 ? 'hsl(142 71% 45%)' : 'hsl(0 84% 60%)'} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="flex items-center justify-center gap-5 mt-2 text-[11px] text-muted-foreground">
                    <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full inline-block" style={{ backgroundColor: 'hsl(142 71% 45%)' }} /> Profitable</span>
                    <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full inline-block" style={{ backgroundColor: 'hsl(0 84% 60%)' }} /> Loss</span>
                  </div>
                </div>
              </div>

              {/* Row 2: Lifecycle Distribution + Delivery Health + Strategic Alignment */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* Lifecycle Distribution — metric cards */}
                <div className="bg-secondary/30 rounded-xl p-5">
                  <h4 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
                    <Package className="w-4 h-4 text-primary" /> Products by Lifecycle
                  </h4>
                  <div className="grid grid-cols-2 gap-3">
                    {(['Ideation', 'Development', 'Growth', 'Mature'] as const).map(stage => {
                      const count = products.filter(p => (p.lifecycleStage || 'Development') === stage).length;
                      return (
                        <div key={stage} className="bg-card rounded-lg p-3 border border-border/50">
                          <div className="text-2xl font-bold text-foreground">{count}</div>
                          <div className="text-[10px] text-muted-foreground mt-1 flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: LIFECYCLE_COLORS[stage] || 'hsl(var(--muted-foreground))' }} />
                            {stage}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Delivery Health */}
                <div className="bg-secondary/30 rounded-xl p-5">
                  <h4 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
                    <Activity className="w-4 h-4 text-primary" /> Delivery Health
                  </h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-card rounded-lg p-3 border border-border/50 text-center">
                      <div className="text-2xl font-bold text-primary">{portfolioMetrics.activeReleases}</div>
                      <div className="text-[10px] text-muted-foreground mt-1">Active Releases</div>
                    </div>
                    <div className="bg-card rounded-lg p-3 border border-border/50 text-center">
                      <div className="text-2xl font-bold text-accent-foreground">{portfolioMetrics.inProgressFeatures}</div>
                      <div className="text-[10px] text-muted-foreground mt-1">In Progress</div>
                    </div>
                    <div className="bg-card rounded-lg p-3 border border-border/50 text-center">
                      <div className="text-2xl font-bold text-success">{portfolioMetrics.deliveredFeatures}</div>
                      <div className="text-[10px] text-muted-foreground mt-1">Completed</div>
                    </div>
                    <div className="bg-card rounded-lg p-3 border border-border/50 text-center">
                      <div className="text-2xl font-bold text-foreground">{portfolioMetrics.featureCount}</div>
                      <div className="text-[10px] text-muted-foreground mt-1">Total Features</div>
                    </div>
                  </div>
                </div>

                {/* Strategic Alignment */}
                <div className="bg-secondary/30 rounded-xl p-5">
                  <h4 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
                    <Target className="w-4 h-4 text-primary" /> Strategic Alignment
                  </h4>
                  <div className="space-y-3">
                    {Object.entries(strategicAlignment).map(([objective, prods]) => (
                      <div key={objective} className="bg-card rounded-lg p-3 border border-border/50">
                        <div className="text-[11px] text-muted-foreground font-medium mb-2 flex items-center gap-1.5">
                          <Target className="w-3 h-3 text-primary shrink-0" />
                          <span className="line-clamp-2">{objective}</span>
                        </div>
                        <div className="text-[10px] text-muted-foreground mb-1.5">Products contributing:</div>
                        <div className="flex flex-wrap gap-1">
                          {prods.map(p => (
                            <Badge key={p} variant="secondary" className="text-[10px]">{p}</Badge>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Revenue Contribution Heatmap */}
              {heatmapData.length > 0 && (
                <div className="bg-secondary/30 rounded-xl p-5">
                  <h4 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-primary" /> Revenue Contribution Heatmap
                  </h4>
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[600px]">
                      <thead>
                        <tr>
                          <th className="text-start text-[10px] font-medium text-muted-foreground uppercase px-3 py-2">Product</th>
                          {heatmapMonths.map(m => (
                            <th key={m} className="text-center text-[10px] font-medium text-muted-foreground uppercase px-3 py-2">{m}</th>
                          ))}
                          <th className="text-end text-[10px] font-medium text-muted-foreground uppercase px-3 py-2">Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {heatmapData.map((row: any) => {
                          const rowTotal = heatmapMonths.reduce((sum, m) => sum + ((row[m] as number) || 0), 0);
                          return (
                            <tr key={row.product}>
                              <td className="px-3 py-2 text-xs font-medium text-foreground">{row.product}</td>
                              {heatmapMonths.map(m => {
                                const val = row[m] || 0;
                                const intensity = maxHeatmapVal > 0 ? val / maxHeatmapVal : 0;
                                return (
                                  <td key={m} className="px-1 py-1.5" title={val > 0 ? formatCurrency(val, language) : '—'}>
                                    <div
                                      className="rounded-md h-9 flex items-center justify-center text-[10px] font-semibold transition-colors"
                                      style={{
                                        backgroundColor: val > 0 ? `hsla(142, 71%, 45%, ${0.15 + intensity * 0.7})` : 'hsl(var(--secondary))',
                                        color: intensity > 0.4 ? 'white' : 'hsl(var(--foreground))',
                                      }}
                                    >
                                      {val > 0 ? `${(val / 1000).toFixed(0)}k` : '—'}
                                    </div>
                                  </td>
                                );
                              })}
                              <td className="px-3 py-2 text-end text-xs font-bold text-foreground">{formatCurrency(rowTotal, language)}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Products Overview — expanded cards */}
              <div className="bg-secondary/30 rounded-xl p-5">
                <h4 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
                  <Package className="w-4 h-4 text-primary" /> {t('productsOverview')}
                </h4>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[700px]">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-start text-[10px] font-medium text-muted-foreground uppercase px-3 py-2.5">{t('product')}</th>
                        <th className="text-center text-[10px] font-medium text-muted-foreground uppercase px-3 py-2.5">Lifecycle</th>
                        <th className="text-end text-[10px] font-medium text-muted-foreground uppercase px-3 py-2.5">{t('revenue')}</th>
                        <th className="text-end text-[10px] font-medium text-muted-foreground uppercase px-3 py-2.5">{t('cost')}</th>
                        <th className="text-end text-[10px] font-medium text-muted-foreground uppercase px-3 py-2.5">{t('netProfit')}</th>
                        <th className="text-center text-[10px] font-medium text-muted-foreground uppercase px-3 py-2.5">{t('features')}</th>
                        <th className="text-center text-[10px] font-medium text-muted-foreground uppercase px-3 py-2.5">Releases</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/50">
                      {products.map(product => {
                        const pd = portfolioMetrics.productData.find(d => d.name === product.name);
                        const featureCount = state.features.filter(f => f.productId === product.id).length;
                        const activeFeatures = state.features.filter(f => f.productId === product.id && f.status === 'In Progress').length;
                        const releaseCount = state.releases.filter(r => r.productId === product.id).length;
                        const activeRelCount = state.releases.filter(r => r.productId === product.id && r.status === 'In Progress').length;
                        return (
                          <tr key={product.id} onClick={() => onProductClick(product)}
                            className="hover:bg-muted/50 cursor-pointer transition-colors">
                            <td className="px-3 py-3">
                              <div className="text-sm font-semibold text-foreground">{product.name}</div>
                              <div className="text-[10px] text-muted-foreground">{product.code}</div>
                            </td>
                            <td className="px-3 py-3 text-center">
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-primary/10 text-primary">
                                {product.lifecycleStage || 'Development'}
                              </span>
                            </td>
                            <td className="px-3 py-3 text-end text-sm font-semibold text-success">{formatCurrency(pd?.revenue || 0, language)}</td>
                            <td className="px-3 py-3 text-end text-sm font-semibold text-destructive">{formatCurrency(pd?.cost || 0, language)}</td>
                            <td className={cn("px-3 py-3 text-end text-sm font-semibold", (pd?.profit || 0) >= 0 ? 'text-primary' : 'text-destructive')}>
                              {formatCurrency(pd?.profit || 0, language)}
                            </td>
                            <td className="px-3 py-3 text-center text-sm">
                              <span className="font-semibold text-foreground">{activeFeatures}</span>
                              <span className="text-muted-foreground">/{featureCount}</span>
                            </td>
                            <td className="px-3 py-3 text-center text-sm">
                              <span className="font-semibold text-foreground">{activeRelCount}</span>
                              <span className="text-muted-foreground">/{releaseCount}</span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </TabsContent>

            {/* PRODUCTS TAB */}
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
                      <div className="flex justify-between text-sm"><span className="text-muted-foreground">{t('owner')}:</span><span className="font-medium">{product.owner}</span></div>
                    </div>
                    <div className="mt-3 text-center text-primary text-sm font-medium">{t('clickToView')}</div>
                  </div>
                ))}
              </div>
            </TabsContent>

            {/* RESOURCES TAB */}
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
                    {state.assignments.filter(a => products.some(p => p.id === a.productId)).map(assignment => {
                      const resource = state.resources.find(r => r.id === assignment.resourceId);
                      const prod = products.find(p => p.id === assignment.productId);
                      return (
                        <tr key={assignment.id} className="hover:bg-secondary/30">
                          <td className="px-4 py-2.5 font-medium text-sm">{resource?.name}</td>
                          <td className="px-4 py-2.5 text-sm text-muted-foreground">{resource?.role}</td>
                          <td className="px-4 py-2.5 text-sm">{prod?.name}</td>
                          <td className="px-4 py-2.5 text-sm">{formatDate(assignment.startDate, language)} → {formatDate(assignment.endDate, language)}</td>
                          <td className="px-4 py-2.5 text-end font-semibold text-primary text-sm">{assignment.utilization}%</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </TabsContent>

            {/* FINANCIALS TAB */}
            <TabsContent value="financials" className="mt-0 space-y-6">
              <div>
                <div className="border-b pb-3 mb-4">
                  <h3 className="text-base font-bold text-foreground">💵 {t('revenue')}</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[800px]">
                    <thead className="bg-secondary">
                      <tr>
                        <th className="px-3 py-2 text-start text-[10px] font-medium text-muted-foreground uppercase">{t('product')}</th>
                        <th className="px-3 py-2 text-center text-[10px] font-medium text-muted-foreground uppercase">{t('status')}</th>
                        <th className="px-3 py-2 text-end text-[10px] font-medium text-muted-foreground uppercase">{t('expected')}</th>
                        <th className="px-3 py-2 text-end text-[10px] font-medium text-muted-foreground uppercase">{t('actual')}</th>
                        <th className="px-3 py-2 text-end text-[10px] font-medium text-muted-foreground uppercase">{t('cost')}</th>
                        <th className="px-3 py-2 text-end text-[10px] font-medium text-muted-foreground uppercase">{t('variance')}</th>
                        <th className="px-3 py-2 text-center text-[10px] font-medium text-muted-foreground uppercase">{t('actions')}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {products.map(prod => {
                        const prodFeatures = state.features.filter(f => f.productId === prod.id);
                        let expected = 0, actual = 0, cost = 0;
                        prodFeatures.forEach(f => {
                          state.revenuePlan.filter(r => r.featureId === f.id).forEach(r => { expected += r.expected; });
                          state.revenueActual.filter(r => r.featureId === f.id).forEach(r => { actual += r.actual; });
                        });
                        state.costs.filter(c => c.productId === prod.id).forEach(c => {
                          if (c.type === 'CAPEX' && c.total && c.amortization) cost += (c.total / c.amortization) * 6;
                          else if (c.monthly) cost += c.monthly * 6;
                        });
                        const variance = actual - expected;
                        return (
                          <tr key={prod.id} className="hover:bg-secondary/50">
                            <td className="px-3 py-2.5 font-medium text-foreground text-sm">{prod.name}</td>
                            <td className="px-3 py-2.5 text-center"><StatusBadge status={prod.status} /></td>
                            <td className="px-3 py-2.5 text-end font-semibold text-revenue text-sm">{formatCurrency(expected, language)}</td>
                            <td className="px-3 py-2.5 text-end font-semibold text-foreground text-sm">{formatCurrency(actual, language)}</td>
                            <td className="px-3 py-2.5 text-end font-semibold text-cost text-sm">{formatCurrency(cost, language)}</td>
                            <td className={cn("px-3 py-2.5 text-end font-semibold text-sm", variance >= 0 ? "text-revenue" : "text-cost")}>
                              {variance >= 0 ? '+' : ''}{formatCurrency(variance, language)}
                            </td>
                            <td className="px-3 py-2.5 text-center">
                              <Button size="sm" onClick={() => onProductClick(prod)}>{t('planFinancials')}</Button>
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

      {/* Edit Portfolio Modal */}
      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent className="sm:max-w-xl max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Edit Portfolio Profile</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label className="text-xs">{t('name')}</Label><Input value={editData.name || ''} onChange={e => setEditData(prev => ({ ...prev, name: e.target.value }))} /></div>
              <div className="space-y-1.5"><Label className="text-xs">{t('owner')}</Label><Input value={editData.owner || ''} onChange={e => setEditData(prev => ({ ...prev, owner: e.target.value }))} placeholder="Portfolio Owner" /></div>
            </div>
            <div className="space-y-1.5"><Label className="text-xs">{t('description')}</Label><Input value={editData.description || ''} onChange={e => setEditData(prev => ({ ...prev, description: e.target.value }))} /></div>
            <div className="space-y-1.5"><Label className="text-xs">{t('purpose')}</Label><Input value={editData.purpose || ''} onChange={e => setEditData(prev => ({ ...prev, purpose: e.target.value }))} /></div>
            <div className="space-y-1.5"><Label className="text-xs">{t('strategicObjective')}</Label><Input value={editData.strategicObjective || ''} onChange={e => setEditData(prev => ({ ...prev, strategicObjective: e.target.value }))} /></div>
            <div className="space-y-1.5"><Label className="text-xs">{t('businessValueLabel')}</Label><Input value={editData.businessValue || ''} onChange={e => setEditData(prev => ({ ...prev, businessValue: e.target.value }))} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label className="text-xs">{t('technicalOwner')}</Label><Input value={editData.technicalLead || ''} onChange={e => setEditData(prev => ({ ...prev, technicalLead: e.target.value }))} /></div>
              <div className="space-y-1.5"><Label className="text-xs">{t('businessStakeholder')}</Label><Input value={editData.businessStakeholder || ''} onChange={e => setEditData(prev => ({ ...prev, businessStakeholder: e.target.value }))} /></div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditModal(false)}>{t('cancel')}</Button>
            <Button onClick={handleSave}><Save className="w-4 h-4 me-1.5" />{t('save')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PortfolioPage;

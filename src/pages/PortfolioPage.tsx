import { useState, useMemo, useRef } from 'react';
import { useApp } from '@/context/AppContext';
import { useHierarchicalMetrics } from '@/hooks/useHierarchicalMetrics';
import { Portfolio, Product } from '@/types';
import StatusBadge from '@/components/StatusBadge';
import KPICard from '@/components/KPICard';
import ProductFormDialog from '@/components/ProductFormDialog';
import PortfolioFormDialog from '@/components/PortfolioFormDialog';
import PortfolioStrategicAlignment from '@/components/PortfolioStrategicAlignment';
import AssignmentFormDialog from '@/components/AssignmentFormDialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { formatCurrency, formatDate, cn } from '@/lib/utils';
import CompareControls from '@/components/compare/CompareControls';
import CompareEmptyState from '@/components/compare/CompareEmptyState';
import KPIDelta from '@/components/compare/KPIDelta';
import DeltaChip from '@/components/compare/DeltaChip';
import { useCompareMetrics } from '@/hooks/useCompareMetrics';
import { computeWindowMetrics, computeDelta } from '@/lib/compare';
import {
  ArrowLeft, ArrowRight, LayoutGrid, Package, Users, DollarSign, Target,
  Upload, X, TrendingUp, Activity, User, Pencil, Save, BarChart3, Plus, Edit, Trash2,
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  const { state, updatePortfolio, deleteAssignment, t, language, isRTL, dateFilter, compareSelection } = useApp();
  const [activeTab, setActiveTab] = useState('overview');
  const [showEditModal, setShowEditModal] = useState(false);
  const [showProductForm, setShowProductForm] = useState(false);
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [assignResourceId, setAssignResourceId] = useState<number | null>(null);
  const [editingAssignmentId, setEditingAssignmentId] = useState<number | null>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);

  const products = useMemo(() => state.products.filter(p => p.portfolioId === portfolio.id), [state.products, portfolio.id]);

  const deptMetrics = useHierarchicalMetrics(state, dateFilter);
  const portMetrics = deptMetrics.portfolioMetrics.find(p => p.portfolioId === portfolio.id);

  const compare = useCompareMetrics({ scope: 'portfolio', portfolioId: portfolio.id });
  const compareEnabled = dateFilter.compareEnabled;
  const productFilter = compareSelection.productIds;

  // Per-product comparison metrics (for the overview product table).
  const compareByProductId = useMemo(() => {
    const map = new Map<number, { revenue: number; cost: number; profit: number }>();
    if (!compare.active || !compare.comparisonWindow) return map;
    products.forEach(p => {
      const m = computeWindowMetrics(state, compare.comparisonWindow!, {
        portfolioIds: [],
        productIds: [p.id],
        featureIds: [],
      });
      map.set(p.id, { revenue: m.revenue, cost: m.cost, profit: m.profit });
    });
    return map;
  }, [products, compare.active, compare.comparisonWindow, state]);

  // Backwards-compatible shape for charts
  const portfolioMetrics = useMemo(() => {
    if (!portMetrics) return {
      totalRevenue: 0, totalCost: 0, profit: 0, margin: 0,
      productCount: 0, featureCount: 0, deliveredFeatures: 0, inProgressFeatures: 0,
      delayedFeatures: 0, activeReleases: 0,
      productData: [] as { name: string; revenue: number; cost: number; profit: number; lifecycle: string }[],
    };
    return {
      totalRevenue: portMetrics.revenue,
      totalCost: portMetrics.cost,
      profit: portMetrics.profit,
      margin: portMetrics.margin,
      productCount: portMetrics.productCount,
      featureCount: portMetrics.totalFeatures,
      deliveredFeatures: portMetrics.featuresCompleted,
      inProgressFeatures: portMetrics.featuresInProgress,
      delayedFeatures: portMetrics.featuresPlanned,
      activeReleases: portMetrics.activeReleases,
      productData: portMetrics.productMetrics.map(pm => ({
        name: pm.productName,
        revenue: pm.revenue,
        cost: pm.cost,
        profit: pm.profit,
        lifecycle: pm.lifecycle,
      })),
    };
  }, [portMetrics]);

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

  // Strategic alignment is now managed via PortfolioStrategicAlignment component.

  const BackIcon = isRTL ? ArrowRight : ArrowLeft;

  const openEditModal = () => setShowEditModal(true);

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

      {/* Compare controls — visible only when Compare is ON */}
      <CompareControls scope="portfolio" portfolioId={portfolio.id} />

      {/* Compare validation / no-data banner */}
      {compare.active && (
        <CompareEmptyState validation={compare.validation} dataState={compare.dataState} />
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <KPICard title={t('totalRevenue')} value={formatCurrency(portfolioMetrics.totalRevenue, language)} icon={<span className="text-lg">💰</span>} variant="green"
          extra={compare.active ? (
            <KPIDelta comparisonFormatted={formatCurrency(compare.comparison.revenue, language)} delta={compare.delta.revenue} format="currency" />
          ) : undefined}
        />
        <KPICard title={t('totalCost')} value={formatCurrency(portfolioMetrics.totalCost, language)} icon={<span className="text-lg">💸</span>} variant="red"
          extra={compare.active ? (
            <KPIDelta comparisonFormatted={formatCurrency(compare.comparison.cost, language)} delta={compare.delta.cost} lowerIsBetter format="currency" />
          ) : undefined}
        />
        <KPICard title={t('netProfit')} value={formatCurrency(portfolioMetrics.profit, language)} subtitle={`${t('margin')}: ${portfolioMetrics.margin.toFixed(1)}%`} icon={<span className="text-lg">✅</span>} variant={portfolioMetrics.profit >= 0 ? 'green' : 'red'}
          extra={compare.active ? (
            <KPIDelta comparisonFormatted={formatCurrency(compare.comparison.profit, language)} delta={compare.delta.profit} format="currency" />
          ) : undefined}
        />
        <KPICard title={t('products')} value={portfolioMetrics.productCount.toString()} subtitle={`${portfolioMetrics.featureCount} ${t('features')}`} icon={<span className="text-lg">📦</span>} variant="purple" />
        <KPICard title={t('activeReleases')} value={portfolioMetrics.activeReleases.toString()} subtitle={`${portfolioMetrics.inProgressFeatures} ${t('inProgress').toLowerCase()}`} icon={<span className="text-lg">🚀</span>} variant="gradient" />
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

              {/* Portfolio Profile Information */}
              <div className="bg-secondary/30 rounded-xl p-5">
                <h4 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
                  <User className="w-4 h-4 text-primary" /> {(t as any)('portfolioProfile') || 'Portfolio Profile'}
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-card rounded-lg p-3 border border-border/50">
                    <div className="text-[10px] uppercase font-medium text-muted-foreground mb-1">{(t as any)('owner') || 'Owner'}</div>
                    <div className="text-sm font-semibold text-foreground break-words">{portfolio.owner || '—'}</div>
                  </div>
                  <div className="bg-card rounded-lg p-3 border border-border/50">
                    <div className="text-[10px] uppercase font-medium text-muted-foreground mb-1">{(t as any)('technicalLead') || 'Technical Lead'}</div>
                    <div className="text-sm font-semibold text-foreground break-words">{portfolio.technicalLead || '—'}</div>
                  </div>
                  <div className="bg-card rounded-lg p-3 border border-border/50">
                    <div className="text-[10px] uppercase font-medium text-muted-foreground mb-1">{(t as any)('businessStakeholder') || 'Business Stakeholder'}</div>
                    <div className="text-sm font-semibold text-foreground break-words">{portfolio.businessStakeholder || '—'}</div>
                  </div>
                  <div className="bg-card rounded-lg p-3 border border-border/50">
                    <div className="text-[10px] uppercase font-medium text-muted-foreground mb-1">{(t as any)('priority') || 'Priority'}</div>
                    <div className="text-sm font-semibold text-foreground">{portfolio.priority || '—'}</div>
                  </div>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
                  <div className="bg-card rounded-lg p-3 border border-border/50">
                    <div className="text-[10px] uppercase font-medium text-muted-foreground mb-1">{(t as any)('purpose') || 'Purpose'}</div>
                    <div className="text-sm text-foreground whitespace-pre-wrap break-words">{portfolio.purpose || '—'}</div>
                  </div>
                  <div className="bg-card rounded-lg p-3 border border-border/50">
                    <div className="text-[10px] uppercase font-medium text-muted-foreground mb-1">{(t as any)('businessValue') || 'Business Value'}</div>
                    <div className="text-sm text-foreground whitespace-pre-wrap break-words">{portfolio.businessValue || '—'}</div>
                  </div>
                </div>
              </div>

              {/* Row 1: Revenue Contribution + Profitability */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Product Revenue Contribution — horizontal bar */}
                <div className="bg-secondary/30 rounded-xl p-5">
                  <h4 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-primary" /> {t('productRevenueContribution')}
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
                    <TrendingUp className="w-4 h-4 text-primary" /> {t('profitabilityByProduct')}
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
                    <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full inline-block" style={{ backgroundColor: 'hsl(142 71% 45%)' }} /> {t('profitable')}</span>
                    <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full inline-block" style={{ backgroundColor: 'hsl(0 84% 60%)' }} /> {t('loss')}</span>
                  </div>
                </div>
              </div>

              {/* Row 2: Lifecycle Distribution + Delivery Health + Strategic Alignment */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* Lifecycle Distribution — metric cards */}
                <div className="bg-secondary/30 rounded-xl p-5">
                  <h4 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
                    <Package className="w-4 h-4 text-primary" /> {t('productsByLifecycle')}
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
                    <Activity className="w-4 h-4 text-primary" /> {t('deliveryHealth')}
                  </h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-card rounded-lg p-3 border border-border/50 text-center">
                      <div className="text-2xl font-bold text-primary">{portfolioMetrics.activeReleases}</div>
                      <div className="text-[10px] text-muted-foreground mt-1">{t('activeReleases')}</div>
                    </div>
                    <div className="bg-card rounded-lg p-3 border border-border/50 text-center">
                      <div className="text-2xl font-bold text-accent-foreground">{portfolioMetrics.inProgressFeatures}</div>
                      <div className="text-[10px] text-muted-foreground mt-1">{t('inProgress')}</div>
                    </div>
                    <div className="bg-card rounded-lg p-3 border border-border/50 text-center">
                      <div className="text-2xl font-bold text-success">{portfolioMetrics.deliveredFeatures}</div>
                      <div className="text-[10px] text-muted-foreground mt-1">{t('completed')}</div>
                    </div>
                    <div className="bg-card rounded-lg p-3 border border-border/50 text-center">
                      <div className="text-2xl font-bold text-foreground">{portfolioMetrics.featureCount}</div>
                      <div className="text-[10px] text-muted-foreground mt-1">{t('totalFeatures')}</div>
                    </div>
                  </div>
                </div>

                {/* Strategic Alignment (managed) */}
                <PortfolioStrategicAlignment portfolioId={portfolio.id} />
              </div>

              {/* Revenue Contribution Heatmap */}
              {heatmapData.length > 0 && (
                <div className="bg-secondary/30 rounded-xl p-5">
                  <h4 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-primary" /> {t('revenueContributionHeatmap')}
                  </h4>
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[600px]">
                      <thead>
                        <tr>
                          <th className="text-start text-[10px] font-medium text-muted-foreground uppercase px-3 py-2">{t('product')}</th>
                          {heatmapMonths.map(m => (
                            <th key={m} className="text-center text-[10px] font-medium text-muted-foreground uppercase px-3 py-2">{m}</th>
                          ))}
                          <th className="text-end text-[10px] font-medium text-muted-foreground uppercase px-3 py-2">{t('total')}</th>
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
                        <th className="text-center text-[10px] font-medium text-muted-foreground uppercase px-3 py-2.5">{t('lifecycle')}</th>
                        <th className="text-end text-[10px] font-medium text-muted-foreground uppercase px-3 py-2.5">{t('revenue')}</th>
                        <th className="text-end text-[10px] font-medium text-muted-foreground uppercase px-3 py-2.5">{t('cost')}</th>
                        <th className="text-end text-[10px] font-medium text-muted-foreground uppercase px-3 py-2.5">{t('netProfit')}</th>
                        {compareEnabled && (
                          <th className="text-end text-[10px] font-medium text-muted-foreground uppercase px-3 py-2.5">{t('vsCompare')}</th>
                        )}
                        <th className="text-center text-[10px] font-medium text-muted-foreground uppercase px-3 py-2.5">{t('features')}</th>
                        <th className="text-center text-[10px] font-medium text-muted-foreground uppercase px-3 py-2.5">{t('releases')}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/50">
                      {products
                        .filter(product => productFilter.length === 0 || productFilter.includes(product.id))
                        .map(product => {
                        const pd = portfolioMetrics.productData.find(d => d.name === product.name);
                        const featureCount = state.features.filter(f => f.productId === product.id).length;
                        const activeFeatures = state.features.filter(f => f.productId === product.id && f.status === 'In Progress').length;
                        const releaseCount = state.releases.filter(r => r.productId === product.id).length;
                        const activeRelCount = state.releases.filter(r => r.productId === product.id && r.status === 'In Progress').length;
                        const cmp = compareByProductId.get(product.id);
                        const dRev = cmp ? computeDelta(pd?.revenue || 0, cmp.revenue) : null;
                        const dCost = cmp ? computeDelta(pd?.cost || 0, cmp.cost, { lowerIsBetter: true }) : null;
                        const dProfit = cmp ? computeDelta(pd?.profit || 0, cmp.profit) : null;
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
                            {compareEnabled && (
                              <td className="px-3 py-3 text-end">
                                <div className="flex flex-col items-end gap-1">
                                  {dRev && <DeltaChip delta={dRev} format="currency" />}
                                  {dCost && <DeltaChip delta={dCost} format="currency" lowerIsBetter />}
                                  {dProfit && <DeltaChip delta={dProfit} format="currency" />}
                                </div>
                              </td>
                            )}
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
              <div className="flex items-center justify-between">
                <h3 className="text-foreground">{t('allProducts')}</h3>
                <Button size="sm" onClick={() => setShowProductForm(true)}>
                  <Plus className="w-4 h-4 me-1.5" />{t('addProduct')}
                </Button>
              </div>
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
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-foreground">{t('assignments')}</h3>
                {state.resources.length > 0 && (
                  <Button
                    size="sm"
                    onClick={() => {
                      setEditingAssignmentId(null);
                      setAssignResourceId(state.resources[0].id);
                      setAssignDialogOpen(true);
                    }}
                  >
                    <Plus className="w-4 h-4 me-1.5" />{t('addAssignment')}
                  </Button>
                )}
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[700px]">
                  <thead className="bg-secondary/50">
                    <tr>
                      <th className="px-4 py-2.5 text-start text-xs font-medium text-muted-foreground uppercase">{t('name')}</th>
                      <th className="px-4 py-2.5 text-start text-xs font-medium text-muted-foreground uppercase">{t('role')}</th>
                      <th className="px-4 py-2.5 text-start text-xs font-medium text-muted-foreground uppercase">{t('product')}</th>
                      <th className="px-4 py-2.5 text-start text-xs font-medium text-muted-foreground uppercase">{t('period')}</th>
                      <th className="px-4 py-2.5 text-end text-xs font-medium text-muted-foreground uppercase">{t('utilization')}</th>
                      <th className="px-4 py-2.5 text-center text-xs font-medium text-muted-foreground uppercase">{t('actions')}</th>
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
                          <td className="px-4 py-2.5 text-center">
                            <div className="flex justify-center gap-1">
                              <Button
                                size="sm" variant="ghost" className="h-8 w-8 p-0"
                                onClick={() => {
                                  setEditingAssignmentId(assignment.id);
                                  setAssignResourceId(assignment.resourceId);
                                  setAssignDialogOpen(true);
                                }}
                                aria-label={t('edit')}
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button
                                size="sm" variant="ghost"
                                className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                                onClick={() => deleteAssignment(assignment.id)}
                                aria-label={t('delete')}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {assignDialogOpen && assignResourceId !== null && (
                <AssignmentFormDialog
                  open={assignDialogOpen}
                  onOpenChange={(o) => {
                    setAssignDialogOpen(o);
                    if (!o) { setEditingAssignmentId(null); setAssignResourceId(null); }
                  }}
                  resourceId={assignResourceId}
                  assignment={editingAssignmentId ? state.assignments.find(a => a.id === editingAssignmentId) ?? null : null}
                  lockedPortfolioId={portfolio.id}
                />
              )}
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
                        // Single source of truth: pull from the hierarchical metrics
                        const prodMetric = portMetrics?.productMetrics.find(p => p.productId === prod.id);
                        const expected = prodMetric?.planned ?? 0;
                        const actual = prodMetric?.revenue ?? 0;
                        const cost = prodMetric?.cost ?? 0;
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
      <PortfolioFormDialog
        open={showEditModal}
        onOpenChange={setShowEditModal}
        portfolio={portfolio}
      />

      <ProductFormDialog
        open={showProductForm}
        onOpenChange={setShowProductForm}
        portfolioId={portfolio.id}
        portfolioName={portfolio.name}
        onCreated={(p) => onProductClick(p)}
      />
    </div>
  );
};

export default PortfolioPage;

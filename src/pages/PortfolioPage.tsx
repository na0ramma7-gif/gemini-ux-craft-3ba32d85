import { useState, useMemo, useRef } from 'react';
import { useApp } from '@/context/AppContext';
import { Portfolio, Product } from '@/types';
import StatusBadge from '@/components/StatusBadge';
import KPICard from '@/components/KPICard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { formatCurrency, formatDate, cn } from '@/lib/utils';
import {
  ArrowLeft, ArrowRight, LayoutGrid, Package, Users, DollarSign, Target,
  Edit, Upload, X, TrendingUp, Activity, User, Lightbulb, Star, Zap, Clock, Save, Pencil,
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';

interface PortfolioPageProps {
  portfolio: Portfolio;
  onBack: () => void;
  onProductClick: (product: Product) => void;
}

const OwnerRow = ({ label, name }: { label: string; name: string }) => (
  <div className="flex items-center gap-3 p-2.5 rounded-lg bg-card border border-border/50">
    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
      <User className="w-4 h-4 text-primary" />
    </div>
    <div className="min-w-0">
      <div className="text-[11px] text-muted-foreground">{label}</div>
      <div className="text-sm font-medium text-foreground truncate">{name}</div>
    </div>
  </div>
);

const HealthCard = ({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string; color: string }) => (
  <div className="bg-card border border-border/50 rounded-lg p-3 text-center">
    <div className="flex justify-center mb-1.5">{icon}</div>
    <div className={`text-base font-bold ${color}`}>{value}</div>
    <div className="text-[10px] text-muted-foreground mt-0.5">{label}</div>
  </div>
);

const ContextCard = ({ icon, label, value, placeholder }: { icon: React.ReactNode; label: string; value?: string; placeholder: string }) => (
  <div className="bg-card border border-border/50 rounded-lg p-4">
    <div className="flex items-center gap-2 mb-2">
      {icon}
      <span className="text-xs font-semibold text-foreground">{label}</span>
    </div>
    <p className="text-sm text-muted-foreground leading-relaxed">{value || placeholder}</p>
  </div>
);

const PortfolioPage = ({ portfolio, onBack, onProductClick }: PortfolioPageProps) => {
  const { state, updatePortfolio, t, language, isRTL } = useApp();
  const [activeTab, setActiveTab] = useState('overview');
  const [showEditModal, setShowEditModal] = useState(false);
  const [editData, setEditData] = useState<Partial<Portfolio>>({});
  const logoInputRef = useRef<HTMLInputElement>(null);

  const products = useMemo(() =>
    state.products.filter(p => p.portfolioId === portfolio.id),
    [state.products, portfolio.id]
  );

  const portfolioMetrics = useMemo(() => {
    let totalRevenue = 0;
    let totalCost = 0;
    let totalFeatures = 0;
    let deliveredFeatures = 0;
    let inProgressFeatures = 0;

    products.forEach(product => {
      const productFeatures = state.features.filter(f => f.productId === product.id);
      totalFeatures += productFeatures.length;
      deliveredFeatures += productFeatures.filter(f => f.status === 'Delivered').length;
      inProgressFeatures += productFeatures.filter(f => f.status === 'In Progress').length;

      productFeatures.forEach(feature => {
        state.revenuePlan.filter(r => r.featureId === feature.id).forEach(r => { totalRevenue += r.expected; });
      });

      state.costs.filter(c => c.productId === product.id).forEach(c => {
        if (c.type === 'CAPEX' && c.total && c.amortization) {
          totalCost += (c.total / c.amortization) * 6;
        } else if (c.monthly) {
          totalCost += c.monthly * 6;
        }
      });
    });

    const profit = totalRevenue - totalCost;
    const margin = totalRevenue > 0 ? (profit / totalRevenue) * 100 : 0;

    return { totalRevenue, totalCost, profit, margin, productCount: products.length, featureCount: totalFeatures, deliveredFeatures, inProgressFeatures };
  }, [products, state]);

  const BackIcon = isRTL ? ArrowRight : ArrowLeft;

  const openEditModal = () => {
    setEditData({
      name: portfolio.name,
      description: portfolio.description,
      purpose: portfolio.purpose,
      strategicObjective: portfolio.strategicObjective,
      businessValue: portfolio.businessValue,
      owner: portfolio.owner,
      technicalLead: portfolio.technicalLead,
      businessStakeholder: portfolio.businessStakeholder,
      priority: portfolio.priority,
    });
    setShowEditModal(true);
  };

  const handleSave = () => {
    updatePortfolio(portfolio.id, editData);
    setShowEditModal(false);
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      updatePortfolio(portfolio.id, { logo: reader.result as string });
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveLogo = () => {
    updatePortfolio(portfolio.id, { logo: undefined });
  };

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
            {/* OVERVIEW / PROFILE TAB */}
            <TabsContent value="overview" className="mt-0 space-y-6">
              {/* Section 1: Portfolio Identity */}
              <div className="bg-secondary/30 rounded-xl p-6">
                <div className="flex items-start justify-between mb-5">
                  <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <Package className="w-4 h-4 text-primary" />
                    Portfolio Identity
                  </h3>
                  <Button variant="outline" size="sm" onClick={openEditModal} className="gap-1.5">
                    <Pencil className="w-3.5 h-3.5" />
                    {t('edit')}
                  </Button>
                </div>

                <div className="flex items-start gap-5">
                  {/* Logo */}
                  <div className="flex-shrink-0">
                    <input ref={logoInputRef} type="file" accept="image/png,image/jpeg,image/svg+xml" className="hidden" onChange={handleLogoUpload} />
                    {portfolio.logo ? (
                      <div className="relative group">
                        <img src={portfolio.logo} alt={portfolio.name} className="w-20 h-20 rounded-xl object-cover border border-border" />
                        <div className="absolute inset-0 bg-black/50 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
                          <button onClick={() => logoInputRef.current?.click()} className="p-1.5 bg-white/20 rounded-lg hover:bg-white/30 transition-colors">
                            <Upload className="w-3.5 h-3.5 text-white" />
                          </button>
                          <button onClick={handleRemoveLogo} className="p-1.5 bg-white/20 rounded-lg hover:bg-white/30 transition-colors">
                            <X className="w-3.5 h-3.5 text-white" />
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button onClick={() => logoInputRef.current?.click()} className="w-20 h-20 rounded-xl border-2 border-dashed border-border hover:border-primary/50 flex flex-col items-center justify-center gap-1 transition-colors bg-card">
                        <Upload className="w-5 h-5 text-muted-foreground" />
                        <span className="text-[10px] text-muted-foreground">Logo</span>
                      </button>
                    )}
                  </div>

                  {/* Identity Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-1">
                      <h2 className="text-xl font-bold text-foreground">{portfolio.name}</h2>
                      <span className={cn(
                        "px-2.5 py-0.5 rounded-full text-[11px] font-semibold",
                        portfolio.priority === 'High' ? 'bg-destructive/10 text-destructive' :
                        portfolio.priority === 'Medium' ? 'bg-warning/10 text-warning' :
                        'bg-muted text-muted-foreground'
                      )}>
                        {portfolio.priority}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mb-3">
                      {portfolio.code} · {portfolioMetrics.productCount} {t('products')} · {portfolioMetrics.featureCount} {t('features')}
                    </p>
                    {portfolio.description && (
                      <div className="mb-3">
                        <div className="text-[11px] text-muted-foreground font-medium mb-0.5">{t('description')}</div>
                        <p className="text-sm text-foreground leading-relaxed">{portfolio.description}</p>
                      </div>
                    )}
                    {portfolio.purpose && (
                      <div>
                        <div className="text-[11px] text-muted-foreground font-medium mb-0.5">{t('purpose')}</div>
                        <p className="text-sm text-foreground leading-relaxed">{portfolio.purpose}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Section 2: Strategic Context */}
              <div className="bg-secondary/30 rounded-xl p-5">
                <h4 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
                  <Target className="w-4 h-4 text-primary" />
                  {t('strategicContext')}
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  <ContextCard icon={<Target className="w-4 h-4 text-primary" />} label={t('strategicObjective')} value={portfolio.strategicObjective} placeholder="No strategic objective defined yet." />
                  <ContextCard icon={<TrendingUp className="w-4 h-4 text-success" />} label={t('businessValueLabel')} value={portfolio.businessValue} placeholder="No business value defined yet." />
                  <ContextCard icon={<Lightbulb className="w-4 h-4 text-warning" />} label={t('purpose')} value={portfolio.purpose} placeholder="No purpose defined yet." />
                </div>
              </div>

              {/* Section 3: Ownership & Health */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Ownership */}
                <div className="bg-secondary/30 rounded-xl p-5">
                  <h4 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
                    <User className="w-4 h-4 text-primary" />
                    {t('productOwnership')}
                  </h4>
                  <div className="space-y-3">
                    {portfolio.owner && <OwnerRow label={t('owner')} name={portfolio.owner} />}
                    {portfolio.technicalLead && <OwnerRow label={t('technicalOwner')} name={portfolio.technicalLead} />}
                    {portfolio.businessStakeholder && <OwnerRow label={t('businessStakeholder')} name={portfolio.businessStakeholder} />}
                    {!portfolio.owner && !portfolio.technicalLead && !portfolio.businessStakeholder && (
                      <p className="text-xs text-muted-foreground italic py-4 text-center">No ownership defined yet. Click Edit to add.</p>
                    )}
                  </div>
                </div>

                {/* Health Indicators */}
                <div className="bg-secondary/30 rounded-xl p-5">
                  <h4 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
                    <Activity className="w-4 h-4 text-primary" />
                    {t('productHealth')}
                  </h4>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    <HealthCard icon={<DollarSign className="w-4 h-4 text-success" />} label={t('revenue')} value={formatCurrency(portfolioMetrics.totalRevenue, language)} color="text-success" />
                    <HealthCard icon={<DollarSign className="w-4 h-4 text-destructive" />} label={t('cost')} value={formatCurrency(portfolioMetrics.totalCost, language)} color="text-destructive" />
                    <HealthCard icon={<TrendingUp className="w-4 h-4 text-primary" />} label={t('netProfit')} value={formatCurrency(portfolioMetrics.profit, language)} color={portfolioMetrics.profit >= 0 ? 'text-success' : 'text-destructive'} />
                    <HealthCard icon={<Star className="w-4 h-4 text-accent" />} label={t('activeFeatures')} value={`${portfolioMetrics.inProgressFeatures}`} color="text-accent" />
                    <HealthCard icon={<Zap className="w-4 h-4 text-primary" />} label={t('features')} value={`${portfolioMetrics.deliveredFeatures}/${portfolioMetrics.featureCount}`} color="text-primary" />
                    <HealthCard icon={<Package className="w-4 h-4 text-foreground" />} label={t('products')} value={`${portfolioMetrics.productCount}`} color="text-foreground" />
                  </div>
                </div>
              </div>

              {/* Section 4: Products Overview */}
              <div className="bg-secondary/30 rounded-xl p-5">
                <h4 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
                  <Package className="w-4 h-4 text-primary" />
                  {t('productsOverview')}
                </h4>
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
                            <td className={cn("px-3 sm:px-4 py-2 sm:py-3 text-end font-semibold text-xs sm:text-sm", variance >= 0 ? "text-revenue" : "text-cost")}>
                              {variance >= 0 ? '+' : ''}{formatCurrency(variance, language)}
                            </td>
                            <td className="px-3 sm:px-4 py-2 sm:py-3 text-center">
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

      {/* Edit Portfolio Profile Modal */}
      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Portfolio Profile</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">{t('name')}</Label>
                <Input value={editData.name || ''} onChange={e => setEditData(prev => ({ ...prev, name: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">{t('owner')}</Label>
                <Input value={editData.owner || ''} onChange={e => setEditData(prev => ({ ...prev, owner: e.target.value }))} placeholder="Portfolio Owner" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">{t('description')}</Label>
              <Textarea rows={2} value={editData.description || ''} onChange={e => setEditData(prev => ({ ...prev, description: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">{t('purpose')}</Label>
              <Textarea rows={2} value={editData.purpose || ''} onChange={e => setEditData(prev => ({ ...prev, purpose: e.target.value }))} placeholder="What is this portfolio's purpose?" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">{t('strategicObjective')}</Label>
              <Textarea rows={2} value={editData.strategicObjective || ''} onChange={e => setEditData(prev => ({ ...prev, strategicObjective: e.target.value }))} placeholder="Define the strategic objective..." />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">{t('businessValueLabel')}</Label>
              <Textarea rows={2} value={editData.businessValue || ''} onChange={e => setEditData(prev => ({ ...prev, businessValue: e.target.value }))} placeholder="What business value does this portfolio deliver?" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">{t('technicalOwner')}</Label>
                <Input value={editData.technicalLead || ''} onChange={e => setEditData(prev => ({ ...prev, technicalLead: e.target.value }))} placeholder="Technical Lead" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">{t('businessStakeholder')}</Label>
                <Input value={editData.businessStakeholder || ''} onChange={e => setEditData(prev => ({ ...prev, businessStakeholder: e.target.value }))} placeholder="Business Stakeholder" />
              </div>
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

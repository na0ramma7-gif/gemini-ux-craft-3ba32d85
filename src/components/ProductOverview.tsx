import { useMemo, useState, useRef } from 'react';
import { useApp } from '@/context/AppContext';
import { Product } from '@/types';
import StatusBadge from '@/components/StatusBadge';
import { formatDate } from '@/lib/utils';
import { useHierarchicalMetrics } from '@/hooks/useHierarchicalMetrics';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  User, Target, TrendingUp, Activity, Zap, BarChart3, Pencil, Upload, X,
  Package, Lightbulb, AlertTriangle, CheckCircle2, AlertCircle,
  Users, Repeat, ArrowUpRight, ArrowRight, ArrowDownRight, Gauge,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ResponsiveContainer, Tooltip,
} from 'recharts';
import EditProductProfileDialog from '@/components/EditProductProfileDialog';

interface Props {
  product: Product;
}

const LIFECYCLE_COLORS: Record<string, string> = {
  Ideation: 'bg-muted text-muted-foreground',
  Development: 'bg-primary/10 text-primary',
  Growth: 'bg-success/10 text-success',
  Mature: 'bg-accent/10 text-accent',
  Sunset: 'bg-warning/10 text-warning',
};

const CAPABILITY_CATEGORIES: Record<string, string[]> = {
  'Core': ['User Authentication', 'License Application', 'Payment Processing', 'Auto-Renewal', 'Workflow Engine'],
  'Operational': ['Document Verification', 'Status Tracking', 'Compliance Checks', 'Audit Trail', 'Role Management'],
  'Analytics & Integration': ['Dashboard Analytics', 'Reporting', 'API Integration', 'Data Export', 'Notification Engine', 'Multi-language Support'],
};

const ProductOverview = ({ product }: Props) => {
  const { state, updateProduct, t, language, dateFilter } = useApp();
  const dept = useHierarchicalMetrics(state, dateFilter);
  const productMetric = useMemo(
    () => dept.portfolioMetrics.flatMap(pm => pm.productMetrics).find(p => p.productId === product.id),
    [dept, product.id],
  );
  const [showEditModal, setShowEditModal] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);

  const portfolio = state.portfolios.find(p => p.id === product.portfolioId);
  const releases = useMemo(() => state.releases.filter(r => r.productId === product.id), [state.releases, product.id]);
  const features = useMemo(() => state.features.filter(f => f.productId === product.id), [state.features, product.id]);

  // User-defined Product Health (qualitative, no financial data here)
  const health = product.health;

  // User-scored Product Maturity drives the radar — empty axes show as 0.
  const maturity = product.maturity;
  const hasMaturity = !!maturity && (
    [maturity.adoption, maturity.revenuePerformance, maturity.efficiency, maturity.stability, maturity.customerSatisfaction]
      .some(v => typeof v === 'number')
  );
  const radarData = useMemo(() => ([
    { dimension: t('maturityAdoption'),     value: maturity?.adoption ?? 0,            fullMark: 100 },
    { dimension: t('maturityRevenue'),      value: maturity?.revenuePerformance ?? 0,  fullMark: 100 },
    { dimension: t('maturityEfficiency'),   value: maturity?.efficiency ?? 0,          fullMark: 100 },
    { dimension: t('maturityStability'),    value: maturity?.stability ?? 0,           fullMark: 100 },
    { dimension: t('maturitySatisfaction'), value: maturity?.customerSatisfaction ?? 0,fullMark: 100 },
  ]), [maturity, t]);

  const healthBadgeStyle = (status?: string) => {
    switch (status) {
      case 'Healthy':  return { cls: 'bg-success/10 text-success border-success/30',         Icon: CheckCircle2 };
      case 'At Risk':  return { cls: 'bg-warning/10 text-warning border-warning/30',         Icon: AlertTriangle };
      case 'Critical': return { cls: 'bg-destructive/10 text-destructive border-destructive/30', Icon: AlertCircle };
      default:         return { cls: 'bg-muted text-muted-foreground border-border',         Icon: Activity };
    }
  };

  const indicatorRow = (label: string, value?: number) => (
    <div className="bg-card rounded-lg p-3 border border-border/50">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[11px] text-muted-foreground font-medium">{label}</span>
        <span className="text-xs font-semibold text-foreground tabular-nums">
          {typeof value === 'number' ? `${value}%` : '—'}
        </span>
      </div>
      <div className="w-full bg-secondary rounded-full h-1.5">
        <div
          className={cn('h-1.5 rounded-full transition-all',
            (value ?? 0) >= 70 ? 'bg-success' : (value ?? 0) >= 40 ? 'bg-warning' : 'bg-destructive')}
          style={{ width: `${Math.min(value ?? 0, 100)}%` }}
        />
      </div>
    </div>
  );

  const openEditModal = () => setShowEditModal(true);

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => { updateProduct(product.id, { logo: reader.result as string }); };
    reader.readAsDataURL(file);
  };

  // Group capabilities by category
  const groupedCapabilities = useMemo(() => {
    const caps = product.capabilities || [];
    const groups: Record<string, string[]> = {};
    const categorized = new Set<string>();

    Object.entries(CAPABILITY_CATEGORIES).forEach(([category, items]) => {
      const matched = caps.filter(c => items.includes(c));
      if (matched.length > 0) {
        groups[category] = matched;
        matched.forEach(m => categorized.add(m));
      }
    });

    const uncategorized = caps.filter(c => !categorized.has(c));
    if (uncategorized.length > 0) groups['Other'] = uncategorized;

    return groups;
  }, [product.capabilities]);

  return (
    <div className="space-y-6">
      {/* Section 1: Product Identity — compact */}
      <div className="bg-secondary/30 rounded-xl p-5">
        <div className="flex items-start justify-between mb-4">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Package className="w-4 h-4 text-primary" />
            {t('productIdentity')}
          </h3>
          <Button variant="outline" size="sm" onClick={openEditModal} className="gap-1.5">
            <Pencil className="w-3.5 h-3.5" /> {t('edit')}
          </Button>
        </div>

        <div className="flex items-start gap-5">
          {/* Logo */}
          <div className="flex-shrink-0">
            <input ref={logoInputRef} type="file" accept="image/png,image/jpeg,image/svg+xml" className="hidden" onChange={handleLogoUpload} />
            {product.logo ? (
              <div className="relative group">
                <img src={product.logo} alt={product.name} className="w-16 h-16 rounded-xl object-cover border border-border" />
                <div className="absolute inset-0 bg-black/50 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
                  <button aria-label="Replace logo" onClick={() => logoInputRef.current?.click()} className="p-1 bg-white/20 rounded-lg"><Upload className="w-3 h-3 text-white" /></button>
                  <button aria-label="Remove logo" onClick={() => updateProduct(product.id, { logo: undefined })} className="p-1 bg-white/20 rounded-lg"><X className="w-3 h-3 text-white" /></button>
                </div>
              </div>
            ) : (
              <button aria-label="Upload product logo" onClick={() => logoInputRef.current?.click()} className="w-16 h-16 rounded-xl border-2 border-dashed border-border hover:border-primary/50 flex flex-col items-center justify-center gap-0.5 bg-card">
                <Upload className="w-4 h-4 text-muted-foreground" />
                <span className="text-[9px] text-muted-foreground">Logo</span>
              </button>
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1.5">
              <h2 className="text-lg font-bold text-foreground">{product.name}</h2>
              <StatusBadge status={product.status} />
              {product.lifecycleStage && (
                <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${LIFECYCLE_COLORS[product.lifecycleStage]}`}>
                  {product.lifecycleStage}
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground mb-2">
              {product.code} · {portfolio?.name} · {t('owner')}: {product.owner}
            </p>
            {product.description && <p className="text-sm text-foreground leading-relaxed">{product.description}</p>}
            {product.purpose && <p className="text-xs text-muted-foreground mt-1">{product.purpose}</p>}
          </div>
        </div>

        {/* Ownership row — compact */}
        <div className="flex flex-wrap gap-4 mt-4 pt-4 border-t border-border/50">
          {([
            { label: t('owner'), name: product.owner },
            product.technicalOwner && { label: t('technicalOwner'), name: product.technicalOwner },
            product.deliveryManager && { label: t('deliveryManager'), name: product.deliveryManager },
          ].filter(Boolean) as Array<{ label: string; name: string }>).map((item) => (
            <div key={item.label} className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center">
                <User className="w-3.5 h-3.5 text-primary" />
              </div>
              <div>
                <div className="text-[10px] text-muted-foreground">{item.label}</div>
                <div className="text-xs font-medium text-foreground">{item.name}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Section 2: Strategic Context — compact insight cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[
          { icon: <Target className="w-4 h-4 text-primary" />, label: t('strategicObjective'), value: product.strategicObjective },
          { icon: <TrendingUp className="w-4 h-4 text-success" />, label: t('businessValueLabel'), value: product.businessValue || product.valueProposition },
          { icon: <Lightbulb className="w-4 h-4 text-warning" />, label: t('businessProblem'), value: product.businessProblem },
        ].map((card, i) => (
          <div key={i} className="bg-card rounded-xl border border-border/50 p-4">
            <div className="flex items-center gap-1.5 mb-2">{card.icon}<span className="text-[11px] text-muted-foreground font-medium">{card.label}</span></div>
            <p className={cn("text-sm leading-relaxed line-clamp-3", card.value ? 'text-foreground' : 'text-muted-foreground italic')}>
              {card.value || t('notDefinedYet')}
            </p>
          </div>
        ))}
      </div>

      {/* Section 3: Health & Maturity — side by side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Product Health — user-defined operational status (NOT financials) */}
        <div className="bg-secondary/30 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Activity className="w-4 h-4 text-primary" /> {t('productHealth')}
            </h4>
            {health?.updatedAt && (
              <span className="text-[10px] text-muted-foreground">
                {t('lastUpdated')}: {formatDate(health.updatedAt, language)}
              </span>
            )}
          </div>

          {!health ? (
            <p className="text-xs text-muted-foreground italic">{t('healthNotSet')}</p>
          ) : (
            <div className="space-y-3">
              {/* Status + Overall Score */}
              <div className="flex items-center gap-3 flex-wrap">
                {(() => {
                  const { cls, Icon } = healthBadgeStyle(health.status);
                  return (
                    <span className={cn('inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border', cls)}>
                      <Icon className="w-3.5 h-3.5" />
                      {t(`healthStatus${health.status === 'At Risk' ? 'AtRisk' : health.status}` as any) || health.status}
                    </span>
                  );
                })()}
                {typeof health.overallScore === 'number' && (
                  <span className="text-xs text-muted-foreground">
                    {t('overallScore')}: <span className="font-semibold text-foreground">{health.overallScore}%</span>
                  </span>
                )}
              </div>

              {/* Key Indicators */}
              <div>
                <div className="text-[11px] text-muted-foreground font-semibold uppercase tracking-wider mb-2">
                  {t('keyIndicators')}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {indicatorRow(t('adoptionLevel'), health.adoption)}
                  {indicatorRow(t('stability'), health.stability)}
                  {indicatorRow(t('customerSatisfaction'), health.satisfaction)}
                  {indicatorRow(t('operationalReadiness'), health.operationalReadiness)}
                </div>
              </div>

              {health.notes && (
                <div className="bg-card rounded-lg p-3 border border-border/50">
                  <div className="text-[11px] text-muted-foreground font-semibold uppercase tracking-wider mb-1">
                    {t('healthNotes')}
                  </div>
                  <p className="text-xs text-foreground leading-relaxed whitespace-pre-wrap">{health.notes}</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Maturity Radar */}
        <div className="bg-secondary/30 rounded-xl p-5">
          <h4 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-primary" /> {t('productMaturity')}
          </h4>
          {!hasMaturity ? (
            <p className="text-xs text-muted-foreground italic">{t('maturityNotSet')}</p>
          ) : (
            <div className="h-52">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="70%">
                  <PolarGrid stroke="hsl(var(--border))" />
                  <PolarAngleAxis dataKey="dimension" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
                  <PolarRadiusAxis angle={90} domain={[0, 100]} tick={false} axisLine={false} />
                  <Radar name="Maturity" dataKey="value" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.2} strokeWidth={2} />
                  <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12 }} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>

      {/* Section 4: Product Usage / User Behavior — user-defined */}
      {(() => {
        const usage = product.usage;
        const hasUsage = !!usage && (
          [usage.numberOfUsers, usage.yearlyTransactions, usage.activeUsersPct, usage.repeatUsagePct]
            .some(v => typeof v === 'number') || !!usage.engagementLevel || !!usage.usageTrend
        );
        const fmtInt = (n?: number) =>
          typeof n === 'number'
            ? new Intl.NumberFormat(language === 'ar' ? 'ar-EG' : 'en-US').format(n)
            : '—';
        const trendIcon = (t?: string) =>
          t === 'Increasing' ? <ArrowUpRight className="w-3.5 h-3.5 text-success" /> :
          t === 'Declining' ? <ArrowDownRight className="w-3.5 h-3.5 text-destructive" /> :
          t === 'Stable' ? <ArrowRight className="w-3.5 h-3.5 text-muted-foreground" /> : null;
        const engagementCls = (lvl?: string) =>
          lvl === 'High' ? 'bg-success/10 text-success border-success/30' :
          lvl === 'Medium' ? 'bg-warning/10 text-warning border-warning/30' :
          lvl === 'Low' ? 'bg-destructive/10 text-destructive border-destructive/30' :
          'bg-muted text-muted-foreground border-border';
        return (
          <div className="bg-secondary/30 rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Users className="w-4 h-4 text-primary" /> {t('sectionProductUsage')}
              </h4>
              {usage?.updatedAt && (
                <span className="text-[10px] text-muted-foreground">
                  {t('lastUpdated')}: {formatDate(usage.updatedAt, language)}
                </span>
              )}
            </div>
            {!hasUsage ? (
              <p className="text-xs text-muted-foreground italic">{t('usageNotSet')}</p>
            ) : (
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                <div className="bg-card rounded-lg p-3 border border-border/50">
                  <div className="flex items-center gap-1.5 mb-1">
                    <Users className="w-3.5 h-3.5 text-primary" />
                    <span className="text-[11px] text-muted-foreground font-medium">{t('numberOfUsers')}</span>
                  </div>
                  <div className="text-lg font-bold text-foreground tabular-nums">{fmtInt(usage?.numberOfUsers)}</div>
                </div>
                <div className="bg-card rounded-lg p-3 border border-border/50">
                  <div className="flex items-center gap-1.5 mb-1">
                    <Repeat className="w-3.5 h-3.5 text-primary" />
                    <span className="text-[11px] text-muted-foreground font-medium">{t('yearlyTransactions')}</span>
                  </div>
                  <div className="text-lg font-bold text-foreground tabular-nums">{fmtInt(usage?.yearlyTransactions)}</div>
                  <div className="text-[10px] text-muted-foreground mt-0.5">{t('yearlyHint')}</div>
                </div>
                <div className="bg-card rounded-lg p-3 border border-border/50">
                  <div className="flex items-center gap-1.5 mb-1">
                    <Activity className="w-3.5 h-3.5 text-primary" />
                    <span className="text-[11px] text-muted-foreground font-medium">{t('activeUsersPct')}</span>
                  </div>
                  <div className="text-lg font-bold text-foreground tabular-nums">
                    {typeof usage?.activeUsersPct === 'number' ? `${usage.activeUsersPct}%` : '—'}
                  </div>
                </div>
                <div className="bg-card rounded-lg p-3 border border-border/50">
                  <div className="flex items-center gap-1.5 mb-1">
                    <Repeat className="w-3.5 h-3.5 text-primary" />
                    <span className="text-[11px] text-muted-foreground font-medium">{t('repeatUsagePct')}</span>
                  </div>
                  <div className="text-lg font-bold text-foreground tabular-nums">
                    {typeof usage?.repeatUsagePct === 'number' ? `${usage.repeatUsagePct}%` : '—'}
                  </div>
                </div>
                <div className="bg-card rounded-lg p-3 border border-border/50">
                  <div className="flex items-center gap-1.5 mb-1">
                    <Gauge className="w-3.5 h-3.5 text-primary" />
                    <span className="text-[11px] text-muted-foreground font-medium">{t('engagementLevel')}</span>
                  </div>
                  {usage?.engagementLevel ? (
                    <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border', engagementCls(usage.engagementLevel))}>
                      {t(`engagement${usage.engagementLevel}` as any)}
                    </span>
                  ) : <span className="text-sm text-muted-foreground">—</span>}
                </div>
                <div className="bg-card rounded-lg p-3 border border-border/50">
                  <div className="flex items-center gap-1.5 mb-1">
                    <TrendingUp className="w-3.5 h-3.5 text-primary" />
                    <span className="text-[11px] text-muted-foreground font-medium">{t('usageTrend')}</span>
                  </div>
                  {usage?.usageTrend ? (
                    <span className="inline-flex items-center gap-1 text-sm font-semibold text-foreground">
                      {trendIcon(usage.usageTrend)}
                      {t(`trend${usage.usageTrend}` as any)}
                    </span>
                  ) : <span className="text-sm text-muted-foreground">—</span>}
                </div>
              </div>
            )}
          </div>
        );
      })()}

      {/* Section 5: Capabilities — grouped */}
      <div className="bg-secondary/30 rounded-xl p-5">
        <h4 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
          <Zap className="w-4 h-4 text-primary" /> {t('capabilities')}
        </h4>
        {Object.keys(groupedCapabilities).length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.entries(groupedCapabilities).map(([category, caps]) => (
              <div key={category}>
                <div className="text-[11px] text-muted-foreground font-semibold uppercase tracking-wider mb-2">{category}</div>
                <div className="flex flex-wrap gap-1.5">
                  {caps.map(cap => (
                    <Badge key={cap} variant="secondary" className="text-xs font-medium">{cap}</Badge>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground italic">{t('noCapabilitiesDefined')}</p>
        )}
      </div>

      {/* Section 5: Success Metrics */}
      {product.successMetrics && product.successMetrics.length > 0 && (
        <div className="bg-secondary/30 rounded-xl p-5">
          <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-primary" /> {t('successMetrics')}
          </h4>
          <div className="flex flex-wrap gap-2">
            {product.successMetrics.map((metric, idx) => (
              <span key={idx} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-card border border-border/50 rounded-lg text-xs text-foreground">
                <BarChart3 className="w-3 h-3 text-primary" /> {metric}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Edit Product Profile Modal */}
      <EditProductProfileDialog
        open={showEditModal}
        onOpenChange={setShowEditModal}
        product={product}
      />
    </div>
  );
};

export default ProductOverview;

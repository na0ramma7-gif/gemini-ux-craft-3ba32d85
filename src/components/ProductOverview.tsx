import { useMemo, useState, useRef } from 'react';
import { useApp } from '@/context/AppContext';
import { Product, LifecycleStage } from '@/types';
import StatusBadge from '@/components/StatusBadge';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  User, Target, TrendingUp, Activity, Zap, BarChart3, Pencil, Upload, X,
  DollarSign, Package, Star, Shield, Lightbulb, Plus, Check,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ResponsiveContainer, Tooltip,
} from 'recharts';

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

const LIFECYCLE_STAGES: LifecycleStage[] = ['Ideation', 'Development', 'Growth', 'Mature', 'Sunset'];

const PRESET_CAPABILITIES = [
  'User Authentication', 'License Application', 'Payment Processing', 'Document Verification',
  'Status Tracking', 'Dashboard Analytics', 'Notification Engine', 'Compliance Checks',
  'Auto-Renewal', 'Reporting', 'API Integration', 'Data Export', 'Audit Trail',
  'Multi-language Support', 'Role Management', 'Workflow Engine',
];

const PRESET_METRICS = [
  'Revenue Growth', 'Transaction Volume', 'Processing Time', 'User Satisfaction',
  'Adoption Rate', 'Renewal Rate', 'Compliance Score', 'Cost Reduction',
  'Uptime SLA', 'Feature Velocity', 'Customer Retention', 'NPS Score',
];

const CAPABILITY_CATEGORIES: Record<string, string[]> = {
  'Core': ['User Authentication', 'License Application', 'Payment Processing', 'Auto-Renewal', 'Workflow Engine'],
  'Operational': ['Document Verification', 'Status Tracking', 'Compliance Checks', 'Audit Trail', 'Role Management'],
  'Analytics & Integration': ['Dashboard Analytics', 'Reporting', 'API Integration', 'Data Export', 'Notification Engine', 'Multi-language Support'],
};

const ProductOverview = ({ product }: Props) => {
  const { state, updateProduct, t, language } = useApp();
  const [showEditModal, setShowEditModal] = useState(false);
  const [editData, setEditData] = useState<Partial<Product>>({});
  const [newCapability, setNewCapability] = useState('');
  const [newMetric, setNewMetric] = useState('');
  const logoInputRef = useRef<HTMLInputElement>(null);

  const portfolio = state.portfolios.find(p => p.id === product.portfolioId);
  const releases = useMemo(() => state.releases.filter(r => r.productId === product.id), [state.releases, product.id]);
  const features = useMemo(() => state.features.filter(f => f.productId === product.id), [state.features, product.id]);

  const health = useMemo(() => {
    let revenue = 0, cost = 0, planned = 0;
    features.forEach(f => {
      state.revenueActual.filter(r => r.featureId === f.id).forEach(r => { revenue += r.actual; });
      state.revenuePlan.filter(r => r.featureId === f.id).forEach(r => { planned += r.expected; });
    });
    state.costs.filter(c => c.productId === product.id).forEach(c => {
      if (c.type === 'CAPEX' && c.total && c.amortization) cost += (c.total / c.amortization) * 6;
      else if (c.monthly) cost += c.monthly * 6;
    });
    const target = planned * 1.35;
    const achievement = target > 0 ? Math.round((revenue / target) * 100) : 0;
    return {
      revenue, cost, profit: revenue - cost, achievement,
      deliveredFeatures: features.filter(f => f.status === 'Delivered').length,
      inProgressFeatures: features.filter(f => f.status === 'In Progress').length,
      featureCount: features.length,
      releaseCount: releases.length,
    };
  }, [state, features, releases, product.id]);

  // Maturity radar data
  const radarData = useMemo(() => {
    const adoption = Math.min(100, health.achievement);
    const revenueGrowth = health.revenue > 0 ? Math.min(100, Math.round((health.profit / health.revenue) * 100 + 50)) : 20;
    const opEfficiency = health.cost > 0 ? Math.min(100, Math.round(((health.revenue - health.cost) / health.cost) * 100)) : 30;
    const techStability = health.deliveredFeatures > 0 ? Math.min(100, Math.round((health.deliveredFeatures / Math.max(health.featureCount, 1)) * 100)) : 25;
    const userSatisfaction = Math.min(100, adoption * 0.8 + 20);
    return [
      { dimension: 'Adoption', value: adoption, fullMark: 100 },
      { dimension: 'Revenue', value: revenueGrowth, fullMark: 100 },
      { dimension: 'Efficiency', value: opEfficiency, fullMark: 100 },
      { dimension: 'Stability', value: techStability, fullMark: 100 },
      { dimension: 'Satisfaction', value: userSatisfaction, fullMark: 100 },
    ];
  }, [health]);

  const openEditModal = () => {
    setEditData({
      name: product.name, description: product.description, purpose: product.purpose,
      status: product.status, lifecycleStage: product.lifecycleStage, owner: product.owner,
      technicalOwner: product.technicalOwner, deliveryManager: product.deliveryManager,
      strategicObjective: product.strategicObjective, businessValue: product.businessValue,
      businessProblem: product.businessProblem,
      capabilities: product.capabilities ? [...product.capabilities] : [],
      successMetrics: product.successMetrics ? [...product.successMetrics] : [],
    });
    setNewCapability('');
    setNewMetric('');
    setShowEditModal(true);
  };

  const handleSave = () => { updateProduct(product.id, editData); setShowEditModal(false); };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => { updateProduct(product.id, { logo: reader.result as string }); };
    reader.readAsDataURL(file);
  };

  const toggleCapability = (cap: string) => {
    setEditData(prev => {
      const caps = prev.capabilities || [];
      return { ...prev, capabilities: caps.includes(cap) ? caps.filter(c => c !== cap) : [...caps, cap] };
    });
  };

  const addCustomCapability = () => {
    if (!newCapability.trim()) return;
    setEditData(prev => ({ ...prev, capabilities: [...(prev.capabilities || []), newCapability.trim()] }));
    setNewCapability('');
  };

  const toggleMetric = (metric: string) => {
    setEditData(prev => {
      const metrics = prev.successMetrics || [];
      return { ...prev, successMetrics: metrics.includes(metric) ? metrics.filter(m => m !== metric) : [...metrics, metric] };
    });
  };

  const addCustomMetric = () => {
    if (!newMetric.trim()) return;
    setEditData(prev => ({ ...prev, successMetrics: [...(prev.successMetrics || []), newMetric.trim()] }));
    setNewMetric('');
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
                  <button onClick={() => logoInputRef.current?.click()} className="p-1 bg-white/20 rounded-lg"><Upload className="w-3 h-3 text-white" /></button>
                  <button onClick={() => updateProduct(product.id, { logo: undefined })} className="p-1 bg-white/20 rounded-lg"><X className="w-3 h-3 text-white" /></button>
                </div>
              </div>
            ) : (
              <button onClick={() => logoInputRef.current?.click()} className="w-16 h-16 rounded-xl border-2 border-dashed border-border hover:border-primary/50 flex flex-col items-center justify-center gap-0.5 bg-card">
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
          {[
            { label: t('owner'), name: product.owner },
            product.technicalOwner && { label: t('technicalOwner'), name: product.technicalOwner },
            product.deliveryManager && { label: t('deliveryManager'), name: product.deliveryManager },
          ].filter(Boolean).map((item: any) => (
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
        {/* Health Metrics */}
        <div className="bg-secondary/30 rounded-xl p-5">
          <h4 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
            <Activity className="w-4 h-4 text-primary" /> {t('productHealth')}
          </h4>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { icon: <DollarSign className="w-4 h-4 text-success" />, label: t('revenue'), value: formatCurrency(health.revenue, language), color: 'text-success' },
              { icon: <DollarSign className="w-4 h-4 text-destructive" />, label: t('cost'), value: formatCurrency(health.cost, language), color: 'text-destructive' },
              { icon: <TrendingUp className="w-4 h-4 text-primary" />, label: t('netProfit'), value: formatCurrency(health.profit, language), color: health.profit >= 0 ? 'text-success' : 'text-destructive' },
              { icon: <Target className="w-4 h-4 text-primary" />, label: t('targetVsAchieved'), value: `${health.achievement}%`, color: health.achievement >= 70 ? 'text-success' : 'text-destructive' },
              { icon: <Star className="w-4 h-4 text-accent" />, label: t('activeFeatures'), value: `${health.inProgressFeatures}`, color: 'text-accent' },
              { icon: <Zap className="w-4 h-4 text-primary" />, label: t('features'), value: `${health.deliveredFeatures}/${health.featureCount}`, color: 'text-primary' },
              { icon: <Package className="w-4 h-4 text-foreground" />, label: t('releaseVelocity'), value: `${health.releaseCount}`, color: 'text-foreground' },
            ].map((m, i) => (
              <div key={i} className="bg-card rounded-lg p-3 border border-border/50 text-center">
                <div className="flex justify-center mb-1">{m.icon}</div>
                <div className={`text-base font-bold ${m.color}`}>{m.value}</div>
                <div className="text-[10px] text-muted-foreground mt-0.5">{m.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Maturity Radar */}
        <div className="bg-secondary/30 rounded-xl p-5">
          <h4 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-primary" /> {t('productMaturity')}
          </h4>
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
        </div>
      </div>

      {/* Section 4: Capabilities — grouped */}
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

      {/* Edit Product Profile Modal — simplified */}
      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Edit Product Profile</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            {/* Essential fields */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">{t('name')}</Label>
                <Input value={editData.name || ''} onChange={e => setEditData(prev => ({ ...prev, name: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">{t('owner')}</Label>
                <Input value={editData.owner || ''} onChange={e => setEditData(prev => ({ ...prev, owner: e.target.value }))} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">{t('status')}</Label>
                <Select value={editData.status} onValueChange={v => setEditData(prev => ({ ...prev, status: v as Product['status'] }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Active">Active</SelectItem>
                    <SelectItem value="Development">Development</SelectItem>
                    <SelectItem value="Planned">Planned</SelectItem>
                    <SelectItem value="Archived">Archived</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">{t('lifecycleStage')}</Label>
                <Select value={editData.lifecycleStage || ''} onValueChange={v => setEditData(prev => ({ ...prev, lifecycleStage: v as LifecycleStage }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {LIFECYCLE_STAGES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Ownership */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">{t('technicalOwner')}</Label>
                <Input value={editData.technicalOwner || ''} onChange={e => setEditData(prev => ({ ...prev, technicalOwner: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">{t('deliveryManager')}</Label>
                <Input value={editData.deliveryManager || ''} onChange={e => setEditData(prev => ({ ...prev, deliveryManager: e.target.value }))} />
              </div>
            </div>

            {/* Short text fields */}
            <div className="space-y-1.5">
              <Label className="text-xs">{t('description')} <span className="text-muted-foreground">(1-2 lines)</span></Label>
              <Input value={editData.description || ''} onChange={e => setEditData(prev => ({ ...prev, description: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">{t('purpose')} <span className="text-muted-foreground">(1-2 lines)</span></Label>
              <Input value={editData.purpose || ''} onChange={e => setEditData(prev => ({ ...prev, purpose: e.target.value }))} />
            </div>

            {/* Optional strategic — short inputs */}
            <div className="space-y-1.5">
              <Label className="text-xs">{t('strategicObjective')} <span className="text-muted-foreground">(optional)</span></Label>
              <Input value={editData.strategicObjective || ''} onChange={e => setEditData(prev => ({ ...prev, strategicObjective: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">{t('businessValueLabel')} <span className="text-muted-foreground">(optional)</span></Label>
              <Input value={editData.businessValue || ''} onChange={e => setEditData(prev => ({ ...prev, businessValue: e.target.value }))} />
            </div>

            {/* Capabilities — tag selector */}
            <div className="space-y-2">
              <Label className="text-xs">Capabilities</Label>
              <div className="flex flex-wrap gap-1.5">
                {PRESET_CAPABILITIES.map(cap => (
                  <button key={cap} onClick={() => toggleCapability(cap)}
                    className={cn("px-2.5 py-1 rounded-full text-xs font-medium border transition-colors",
                      (editData.capabilities || []).includes(cap)
                        ? 'bg-primary/10 text-primary border-primary/30'
                        : 'bg-secondary text-muted-foreground border-transparent hover:border-border'
                    )}>
                    {(editData.capabilities || []).includes(cap) && <Check className="w-3 h-3 inline me-1" />}
                    {cap}
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                <Input value={newCapability} onChange={e => setNewCapability(e.target.value)} placeholder="Add custom capability..." className="h-8 text-xs" onKeyDown={e => e.key === 'Enter' && addCustomCapability()} />
                <Button size="sm" variant="outline" className="h-8" onClick={addCustomCapability}><Plus className="w-3.5 h-3.5" /></Button>
              </div>
            </div>

            {/* Success Metrics — tag selector */}
            <div className="space-y-2">
              <Label className="text-xs">Success Metrics</Label>
              <div className="flex flex-wrap gap-1.5">
                {PRESET_METRICS.map(metric => (
                  <button key={metric} onClick={() => toggleMetric(metric)}
                    className={cn("px-2.5 py-1 rounded-full text-xs font-medium border transition-colors",
                      (editData.successMetrics || []).includes(metric)
                        ? 'bg-primary/10 text-primary border-primary/30'
                        : 'bg-secondary text-muted-foreground border-transparent hover:border-border'
                    )}>
                    {(editData.successMetrics || []).includes(metric) && <Check className="w-3 h-3 inline me-1" />}
                    {metric}
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                <Input value={newMetric} onChange={e => setNewMetric(e.target.value)} placeholder="Add custom metric..." className="h-8 text-xs" onKeyDown={e => e.key === 'Enter' && addCustomMetric()} />
                <Button size="sm" variant="outline" className="h-8" onClick={addCustomMetric}><Plus className="w-3.5 h-3.5" /></Button>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setShowEditModal(false)}>{t('cancel')}</Button>
            <Button size="sm" onClick={handleSave}>{t('saveChanges')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ProductOverview;

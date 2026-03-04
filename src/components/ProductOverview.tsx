import { useMemo, useState, useRef } from 'react';
import { useApp } from '@/context/AppContext';
import { Product, LifecycleStage } from '@/types';
import StatusBadge from '@/components/StatusBadge';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  User,
  Users,
  Target,
  Lightbulb,
  Shield,
  Activity,
  TrendingUp,
  Clock,
  Zap,
  BarChart3,
  Edit,
  Upload,
  X,
  DollarSign,
  Package,
  Star,
} from 'lucide-react';

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

const ProductOverview = ({ product }: Props) => {
  const { state, updateProduct, t, language } = useApp();
  const [showEditModal, setShowEditModal] = useState(false);
  const [editData, setEditData] = useState<Partial<Product>>({});
  const logoInputRef = useRef<HTMLInputElement>(null);

  const portfolio = state.portfolios.find(p => p.id === product.portfolioId);
  const releases = useMemo(() => state.releases.filter(r => r.productId === product.id), [state.releases, product.id]);
  const features = useMemo(() => state.features.filter(f => f.productId === product.id), [state.features, product.id]);

  const health = useMemo(() => {
    let revenue = 0;
    let cost = 0;
    features.forEach(f => {
      state.revenueActual.filter(r => r.featureId === f.id).forEach(r => { revenue += r.actual; });
    });
    state.costs.filter(c => c.productId === product.id).forEach(c => {
      if (c.type === 'CAPEX' && c.total && c.amortization) cost += (c.total / c.amortization) * 6;
      else if (c.monthly) cost += c.monthly * 6;
    });

    const latestRelease = [...releases].sort((a, b) => b.endDate.localeCompare(a.endDate))[0];
    const deliveredFeatures = features.filter(f => f.status === 'Delivered').length;
    const inProgressFeatures = features.filter(f => f.status === 'In Progress').length;
    const latestFeature = [...features].sort((a, b) => b.endDate.localeCompare(a.endDate))[0];

    return {
      revenue,
      cost,
      profit: revenue - cost,
      latestRelease,
      latestFeature,
      releaseCount: releases.length,
      deliveredFeatures,
      inProgressFeatures,
      featureCount: features.length,
    };
  }, [state, features, releases, product.id]);

  const openEditModal = () => {
    setEditData({
      name: product.name,
      description: product.description,
      purpose: product.purpose,
      businessProblem: product.businessProblem,
      strategicObjective: product.strategicObjective,
      businessValue: product.businessValue,
      targetClient: product.targetClient,
      endUser: product.endUser,
      lifecycleStage: product.lifecycleStage,
      status: product.status,
      owner: product.owner,
      technicalOwner: product.technicalOwner,
      deliveryManager: product.deliveryManager,
      businessStakeholder: product.businessStakeholder,
      capabilities: product.capabilities ? [...product.capabilities] : [],
      successMetrics: product.successMetrics ? [...product.successMetrics] : [],
      supportingTeams: product.supportingTeams ? [...product.supportingTeams] : [],
    });
    setShowEditModal(true);
  };

  const handleSave = () => {
    updateProduct(product.id, editData);
    setShowEditModal(false);
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      updateProduct(product.id, { logo: reader.result as string });
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveLogo = () => {
    updateProduct(product.id, { logo: undefined });
  };

  const updateArrayField = (field: 'capabilities' | 'successMetrics' | 'supportingTeams', value: string) => {
    const items = value.split(',').map(s => s.trim()).filter(Boolean);
    setEditData(prev => ({ ...prev, [field]: items }));
  };

  return (
    <div className="space-y-6">
      {/* Section 1: Product Identity */}
      <div className="bg-secondary/30 rounded-xl p-6">
        <div className="flex items-start justify-between mb-5">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Package className="w-4 h-4 text-primary" />
            {t('productIdentity')}
          </h3>
          <Button variant="outline" size="sm" onClick={openEditModal} className="gap-1.5">
            <Edit className="w-3.5 h-3.5" />
            {t('editProductProfile')}
          </Button>
        </div>

        <div className="flex items-start gap-5">
          {/* Logo */}
          <div className="flex-shrink-0">
            <input
              ref={logoInputRef}
              type="file"
              accept="image/png,image/jpeg,image/svg+xml"
              className="hidden"
              onChange={handleLogoUpload}
            />
            {product.logo ? (
              <div className="relative group">
                <img
                  src={product.logo}
                  alt={product.name}
                  className="w-20 h-20 rounded-xl object-cover border border-border"
                />
                <div className="absolute inset-0 bg-black/50 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
                  <button
                    onClick={() => logoInputRef.current?.click()}
                    className="p-1.5 bg-white/20 rounded-lg hover:bg-white/30 transition-colors"
                    title={t('changeLogo')}
                  >
                    <Upload className="w-3.5 h-3.5 text-white" />
                  </button>
                  <button
                    onClick={handleRemoveLogo}
                    className="p-1.5 bg-white/20 rounded-lg hover:bg-white/30 transition-colors"
                    title={t('removeLogo')}
                  >
                    <X className="w-3.5 h-3.5 text-white" />
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => logoInputRef.current?.click()}
                className="w-20 h-20 rounded-xl border-2 border-dashed border-border hover:border-primary/50 flex flex-col items-center justify-center gap-1 transition-colors bg-card"
              >
                <Upload className="w-5 h-5 text-muted-foreground" />
                <span className="text-[10px] text-muted-foreground">{t('uploadLogo')}</span>
              </button>
            )}
          </div>

          {/* Identity Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-1">
              <h2 className="text-xl font-bold text-foreground">{product.name}</h2>
              <StatusBadge status={product.status} />
              {product.lifecycleStage && (
                <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${LIFECYCLE_COLORS[product.lifecycleStage]}`}>
                  {product.lifecycleStage}
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground mb-3">
              {product.code} · {portfolio?.name} · {t('owner')}: {product.owner}
            </p>
            {product.description && (
              <div className="mb-3">
                <div className="text-[11px] text-muted-foreground font-medium mb-0.5">{t('description')}</div>
                <p className="text-sm text-foreground leading-relaxed">{product.description}</p>
              </div>
            )}
            {product.purpose && (
              <div>
                <div className="text-[11px] text-muted-foreground font-medium mb-0.5">{t('purpose')}</div>
                <p className="text-sm text-foreground leading-relaxed">{product.purpose}</p>
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
          <ContextCard
            icon={<Target className="w-4 h-4 text-primary" />}
            label={t('strategicObjective')}
            value={product.strategicObjective}
            placeholder="No strategic objective defined yet."
          />
          <ContextCard
            icon={<TrendingUp className="w-4 h-4 text-success" />}
            label={t('businessValueLabel')}
            value={product.businessValue || product.valueProposition}
            placeholder="No business value defined yet."
          />
          <ContextCard
            icon={<Lightbulb className="w-4 h-4 text-warning" />}
            label={t('businessProblem')}
            value={product.businessProblem}
            placeholder="No business problem defined yet."
          />
        </div>

        {/* Success Metrics */}
        <div className="mt-4">
          <div className="text-[11px] text-muted-foreground font-medium mb-2">{t('successMetrics')}</div>
          {product.successMetrics && product.successMetrics.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {product.successMetrics.map((metric, idx) => (
                <span key={idx} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-card border border-border/50 rounded-lg text-xs text-foreground">
                  <BarChart3 className="w-3 h-3 text-primary" />
                  {metric}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground italic">No success metrics defined yet.</p>
          )}
        </div>
      </div>

      {/* Section 3: Capabilities */}
      <div className="bg-secondary/30 rounded-xl p-5">
        <h4 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
          <Zap className="w-4 h-4 text-primary" />
          {t('productCapabilities')}
        </h4>
        {product.capabilities && product.capabilities.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
            {product.capabilities.map((cap, idx) => (
              <div key={idx} className="bg-card border border-border/50 rounded-lg px-3 py-2.5 text-center">
                <span className="text-xs font-medium text-foreground">{cap}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground italic">No capabilities defined yet.</p>
        )}
      </div>

      {/* Section 4: Ownership & Health side by side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Ownership */}
        <div className="bg-secondary/30 rounded-xl p-5">
          <h4 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
            <User className="w-4 h-4 text-primary" />
            {t('productOwnership')}
          </h4>
          <div className="space-y-3">
            <OwnerRow label={t('owner')} name={product.owner} />
            {product.technicalOwner && <OwnerRow label={t('technicalOwner')} name={product.technicalOwner} />}
            {product.deliveryManager && <OwnerRow label={t('deliveryManager')} name={product.deliveryManager} />}
            {product.businessStakeholder && <OwnerRow label={t('businessStakeholder')} name={product.businessStakeholder} />}
          </div>
          {product.supportingTeams && product.supportingTeams.length > 0 && (
            <div className="mt-4 pt-3 border-t border-border/50">
              <div className="text-[11px] text-muted-foreground font-medium mb-2">{t('supportingTeams')}</div>
              <div className="flex flex-wrap gap-1.5">
                {product.supportingTeams.map(team => (
                  <span key={team} className="px-2 py-0.5 bg-primary/10 text-primary text-[11px] font-medium rounded-full">
                    {team}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Health Indicators */}
        <div className="bg-secondary/30 rounded-xl p-5">
          <h4 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
            <Activity className="w-4 h-4 text-primary" />
            {t('productHealth')}
          </h4>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <HealthCard icon={<DollarSign className="w-4 h-4 text-success" />} label={t('revenue')} value={formatCurrency(health.revenue, language)} color="text-success" />
            <HealthCard icon={<DollarSign className="w-4 h-4 text-destructive" />} label={t('cost')} value={formatCurrency(health.cost, language)} color="text-destructive" />
            <HealthCard icon={<TrendingUp className="w-4 h-4 text-primary" />} label={t('netProfit')} value={formatCurrency(health.profit, language)} color={health.profit >= 0 ? 'text-success' : 'text-destructive'} />
            <HealthCard icon={<Star className="w-4 h-4 text-accent" />} label={t('activeFeatures')} value={`${health.inProgressFeatures}`} color="text-accent" />
            <HealthCard icon={<Zap className="w-4 h-4 text-primary" />} label={t('features')} value={`${health.deliveredFeatures}/${health.featureCount}`} color="text-primary" />
            <HealthCard icon={<Package className="w-4 h-4 text-foreground" />} label={t('releaseVelocity')} value={`${health.releaseCount}`} color="text-foreground" />
          </div>
        </div>
      </div>

      {/* Section 5: Recent Activity */}
      <div className="bg-secondary/30 rounded-xl p-5">
        <h4 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
          <Clock className="w-4 h-4 text-primary" />
          {t('recentActivity')}
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {health.latestRelease && (
            <ActivityCard
              label={t('latestRelease')}
              title={`${health.latestRelease.version} — ${health.latestRelease.name}`}
              sub={`${formatDate(health.latestRelease.startDate, language)} → ${formatDate(health.latestRelease.endDate, language)}`}
              status={health.latestRelease.status}
            />
          )}
          {health.latestFeature && (
            <ActivityCard
              label={t('latestFeatureUpdate')}
              title={health.latestFeature.name}
              sub={`${formatDate(health.latestFeature.startDate, language)} → ${formatDate(health.latestFeature.endDate, language)}`}
              status={health.latestFeature.status}
            />
          )}
          <ActivityCard
            label={t('latestFinancialUpdate')}
            title={`${t('revenue')}: ${formatCurrency(health.revenue, language)}`}
            sub={`${t('netProfit')}: ${formatCurrency(health.profit, language)}`}
            status={health.profit >= 0 ? 'Active' : 'Inactive'}
          />
        </div>
      </div>

      {/* Edit Product Profile Modal */}
      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t('editProductProfile')}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Name & Code */}
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

            <div className="space-y-1.5">
              <Label className="text-xs">{t('description')}</Label>
              <Textarea rows={2} value={editData.description || ''} onChange={e => setEditData(prev => ({ ...prev, description: e.target.value }))} />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">{t('purpose')}</Label>
              <Textarea rows={2} value={editData.purpose || ''} onChange={e => setEditData(prev => ({ ...prev, purpose: e.target.value }))} />
            </div>

            {/* Status & Lifecycle */}
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

            {/* Strategic */}
            <div className="space-y-1.5">
              <Label className="text-xs">{t('strategicObjective')}</Label>
              <Textarea rows={2} value={editData.strategicObjective || ''} onChange={e => setEditData(prev => ({ ...prev, strategicObjective: e.target.value }))} />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">{t('businessValueLabel')}</Label>
              <Textarea rows={2} value={editData.businessValue || ''} onChange={e => setEditData(prev => ({ ...prev, businessValue: e.target.value }))} />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">{t('businessProblem')}</Label>
              <Textarea rows={2} value={editData.businessProblem || ''} onChange={e => setEditData(prev => ({ ...prev, businessProblem: e.target.value }))} />
            </div>

            {/* Target Users */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">{t('targetUsers')}</Label>
                <Input value={editData.endUser || ''} onChange={e => setEditData(prev => ({ ...prev, endUser: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">{t('targetClient')}</Label>
                <Input value={editData.targetClient || ''} onChange={e => setEditData(prev => ({ ...prev, targetClient: e.target.value }))} />
              </div>
            </div>

            {/* Ownership */}
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">{t('technicalOwner')}</Label>
                <Input value={editData.technicalOwner || ''} onChange={e => setEditData(prev => ({ ...prev, technicalOwner: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">{t('deliveryManager')}</Label>
                <Input value={editData.deliveryManager || ''} onChange={e => setEditData(prev => ({ ...prev, deliveryManager: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">{t('businessStakeholder')}</Label>
                <Input value={editData.businessStakeholder || ''} onChange={e => setEditData(prev => ({ ...prev, businessStakeholder: e.target.value }))} />
              </div>
            </div>

            {/* Array fields */}
            <div className="space-y-1.5">
              <Label className="text-xs">{t('productCapabilities')} <span className="text-muted-foreground">(comma-separated)</span></Label>
              <Input
                value={(editData.capabilities || []).join(', ')}
                onChange={e => updateArrayField('capabilities', e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">{t('successMetrics')} <span className="text-muted-foreground">(comma-separated)</span></Label>
              <Input
                value={(editData.successMetrics || []).join(', ')}
                onChange={e => updateArrayField('successMetrics', e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">{t('supportingTeams')} <span className="text-muted-foreground">(comma-separated)</span></Label>
              <Input
                value={(editData.supportingTeams || []).join(', ')}
                onChange={e => updateArrayField('supportingTeams', e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setShowEditModal(false)}>
              {t('cancel')}
            </Button>
            <Button size="sm" onClick={handleSave}>
              {t('saveChanges')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

// Sub-components

const OwnerRow = ({ label, name }: { label: string; name: string }) => (
  <div className="flex items-center gap-3">
    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-bold">
      {name.split(' ').map(n => n[0]).join('').slice(0, 2)}
    </div>
    <div>
      <div className="text-[11px] text-muted-foreground">{label}</div>
      <div className="text-sm font-medium text-foreground">{name}</div>
    </div>
  </div>
);

const ContextCard = ({ icon, label, value, placeholder }: { icon: React.ReactNode; label: string; value?: string; placeholder: string }) => (
  <div className="bg-card rounded-lg p-4 border border-border/50">
    <div className="flex items-center gap-1.5 mb-2">
      {icon}
      <span className="text-[11px] text-muted-foreground font-medium">{label}</span>
    </div>
    <p className={`text-sm leading-relaxed ${value ? 'text-foreground' : 'text-muted-foreground italic'}`}>
      {value || placeholder}
    </p>
  </div>
);

const HealthCard = ({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string; color: string }) => (
  <div className="bg-card rounded-lg p-3 border border-border/50">
    <div className="flex items-center gap-1.5 mb-1">
      {icon}
      <span className="text-[11px] text-muted-foreground">{label}</span>
    </div>
    <div className={`text-base font-bold ${color}`}>{value}</div>
  </div>
);

const ActivityCard = ({ label, title, sub, status }: { label: string; title: string; sub: string; status: string }) => (
  <div className="bg-card rounded-lg p-4 border border-border/50">
    <div className="flex items-start justify-between mb-2">
      <span className="text-[11px] text-muted-foreground font-medium">{label}</span>
      <StatusBadge status={status} />
    </div>
    <div className="text-sm font-medium text-foreground truncate">{title}</div>
    <div className="text-[11px] text-muted-foreground mt-0.5">{sub}</div>
  </div>
);

export default ProductOverview;

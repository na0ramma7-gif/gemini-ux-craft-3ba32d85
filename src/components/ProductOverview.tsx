import { useMemo } from 'react';
import { useApp } from '@/context/AppContext';
import { Product } from '@/types';
import StatusBadge from '@/components/StatusBadge';
import { formatCurrency, formatDate } from '@/lib/utils';
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

const ProductOverview = ({ product }: Props) => {
  const { state, t, language } = useApp();

  const portfolio = state.portfolios.find(p => p.id === product.portfolioId);
  const releases = state.releases.filter(r => r.productId === product.id);
  const features = state.features.filter(f => f.productId === product.id);

  const health = useMemo(() => {
    let revenue = 0;
    features.forEach(f => {
      state.revenueActual.filter(r => r.featureId === f.id).forEach(r => { revenue += r.actual; });
    });
    const latestRelease = releases.sort((a, b) => b.endDate.localeCompare(a.endDate))[0];
    const deliveredFeatures = features.filter(f => f.status === 'Delivered').length;

    return { revenue, latestRelease, releaseCount: releases.length, deliveredFeatures, featureCount: features.length };
  }, [state, features, releases]);

  const InfoField = ({ label, value, icon }: { label: string; value?: string | null; icon?: React.ReactNode }) => {
    if (!value) return null;
    return (
      <div className="flex items-start gap-3 py-2.5 border-b border-border/50 last:border-0">
        {icon && <div className="mt-0.5 text-muted-foreground">{icon}</div>}
        <div className="flex-1 min-w-0">
          <div className="text-[11px] text-muted-foreground font-medium mb-0.5">{label}</div>
          <div className="text-sm text-foreground">{value}</div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Section 1: Product Profile */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Main Profile */}
        <div className="lg:col-span-2 bg-secondary/30 rounded-xl p-5 space-y-1">
          <div className="flex items-center gap-3 mb-4">
            <h3 className="text-base font-semibold text-foreground">{t('productProfile')}</h3>
            {product.lifecycleStage && (
              <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${LIFECYCLE_COLORS[product.lifecycleStage] || 'bg-secondary text-foreground'}`}>
                {product.lifecycleStage}
              </span>
            )}
          </div>
          
          {product.description && (
            <p className="text-sm text-foreground leading-relaxed mb-4">{product.description}</p>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6">
            <InfoField label={t('purpose')} value={product.purpose} icon={<Lightbulb className="w-3.5 h-3.5" />} />
            <InfoField label={t('businessProblem')} value={product.businessProblem} icon={<Target className="w-3.5 h-3.5" />} />
            <InfoField label={t('targetUsers')} value={product.endUser} icon={<Users className="w-3.5 h-3.5" />} />
            <InfoField label={t('portfolio')} value={portfolio?.name} icon={<Shield className="w-3.5 h-3.5" />} />
            {product.startDate && (
              <InfoField label={t('startDate')} value={formatDate(product.startDate, language)} icon={<Clock className="w-3.5 h-3.5" />} />
            )}
            <InfoField label={t('status')} value={product.status} icon={<Activity className="w-3.5 h-3.5" />} />
          </div>
        </div>

        {/* Ownership Card */}
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
      </div>

      {/* Section 2: Strategic Context */}
      <div className="bg-secondary/30 rounded-xl p-5">
        <h4 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
          <Target className="w-4 h-4 text-primary" />
          {t('strategicContext')}
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {product.strategicObjective && (
            <div className="bg-card rounded-lg p-4 border border-border/50">
              <div className="text-[11px] text-muted-foreground font-medium mb-1.5">{t('strategicObjective')}</div>
              <p className="text-sm text-foreground leading-relaxed">{product.strategicObjective}</p>
            </div>
          )}
          {(product.businessValue || product.valueProposition) && (
            <div className="bg-card rounded-lg p-4 border border-border/50">
              <div className="text-[11px] text-muted-foreground font-medium mb-1.5">{t('businessValueLabel')}</div>
              <p className="text-sm text-foreground leading-relaxed">{product.businessValue || product.valueProposition}</p>
            </div>
          )}
        </div>

        {/* Success Metrics */}
        {product.successMetrics && product.successMetrics.length > 0 && (
          <div className="mt-4">
            <div className="text-[11px] text-muted-foreground font-medium mb-2">{t('successMetrics')}</div>
            <div className="flex flex-wrap gap-2">
              {product.successMetrics.map((metric, idx) => (
                <span key={idx} className="inline-flex items-center gap-1 px-2.5 py-1 bg-card border border-border/50 rounded-lg text-xs text-foreground">
                  <BarChart3 className="w-3 h-3 text-primary" />
                  {metric}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Section 3: Capabilities */}
      {product.capabilities && product.capabilities.length > 0 && (
        <div className="bg-secondary/30 rounded-xl p-5">
          <h4 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
            <Zap className="w-4 h-4 text-primary" />
            {t('productCapabilities')}
          </h4>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
            {product.capabilities.map((cap, idx) => (
              <div key={idx} className="bg-card border border-border/50 rounded-lg px-3 py-2.5 text-center">
                <span className="text-xs font-medium text-foreground">{cap}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Section 4: Health Indicators + Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Health */}
        <div className="bg-secondary/30 rounded-xl p-5">
          <h4 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
            <Activity className="w-4 h-4 text-primary" />
            {t('productHealth')}
          </h4>
          <div className="grid grid-cols-2 gap-3">
            <HealthCard label={t('revenue')} value={formatCurrency(health.revenue, language)} color="text-success" />
            <HealthCard label={t('features')} value={`${health.deliveredFeatures}/${health.featureCount}`} color="text-primary" />
            <HealthCard label={t('releaseVelocity')} value={`${health.releaseCount} ${t('releases')}`} color="text-accent" />
            <HealthCard label={t('status')} value={product.status} color="text-foreground" badge />
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-secondary/30 rounded-xl p-5">
          <h4 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
            <Clock className="w-4 h-4 text-primary" />
            {t('recentActivity')}
          </h4>
          <div className="space-y-3">
            {health.latestRelease && (
              <ActivityRow
                label={t('latestRelease')}
                value={`${health.latestRelease.version} — ${health.latestRelease.name}`}
                sub={`${formatDate(health.latestRelease.startDate, language)} → ${formatDate(health.latestRelease.endDate, language)}`}
                status={health.latestRelease.status}
              />
            )}
            {features.slice(-2).reverse().map(f => (
              <ActivityRow
                key={f.id}
                label={t('feature')}
                value={f.name}
                sub={`${formatDate(f.startDate, language)} → ${formatDate(f.endDate, language)}`}
                status={f.status}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

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

const HealthCard = ({ label, value, color, badge }: { label: string; value: string; color: string; badge?: boolean }) => (
  <div className="bg-card rounded-lg p-3 border border-border/50">
    <div className="text-[11px] text-muted-foreground mb-1">{label}</div>
    {badge ? (
      <StatusBadge status={value} />
    ) : (
      <div className={`text-base font-bold ${color}`}>{value}</div>
    )}
  </div>
);

const ActivityRow = ({ label, value, sub, status }: { label: string; value: string; sub: string; status: string }) => (
  <div className="flex items-start justify-between p-3 bg-card rounded-lg border border-border/50">
    <div className="min-w-0 flex-1">
      <div className="text-[11px] text-muted-foreground">{label}</div>
      <div className="text-sm font-medium text-foreground truncate">{value}</div>
      <div className="text-[11px] text-muted-foreground mt-0.5">{sub}</div>
    </div>
    <StatusBadge status={status} />
  </div>
);

export default ProductOverview;

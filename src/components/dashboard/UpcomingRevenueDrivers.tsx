import { useMemo } from 'react';
import { useApp } from '@/context/AppContext';
import { formatCurrency, formatDate } from '@/lib/utils';
import { ScenarioType, ScenarioConfig } from '@/lib/forecastEngine';
import { PipelineHorizon } from '@/pages/Dashboard';
import { Rocket } from 'lucide-react';
import { Product } from '@/types';
import { addMonths, format } from 'date-fns';

interface UpcomingRevenueDriversProps {
  scenario: ScenarioType;
  horizon: PipelineHorizon;
  config: ScenarioConfig;
  onProductClick: (product: Product) => void;
}

const UpcomingRevenueDrivers = ({ scenario, horizon, config, onProductClick }: UpcomingRevenueDriversProps) => {
  const { state, t, language } = useApp();

  const drivers = useMemo(() => {
    const now = new Date(2024, 3, 1);
    const cutoffDate = addMonths(now, horizon);
    const cutoffKey = format(cutoffDate, 'yyyy-MM');
    // Effective scenario multiplier derived from config
    const adj = 1 + config.revenueAdjustment / 100;
    const conv = config.conversionRate / 100;
    const buf = 1 - config.riskBuffer / 100;
    const multiplier = adj * conv * buf;

    const upcoming = state.features
      .filter(f => f.status === 'In Progress' || f.status === 'To Do')
      .filter(f => f.endDate <= cutoffKey + '-31')
      .map(feature => {
        const product = state.products.find(p => p.id === feature.productId);
        const portfolio = product ? state.portfolios.find(pf => pf.id === product.portfolioId) : null;

        const baseRevenue = state.revenuePlan
          .filter(r => r.featureId === feature.id)
          .reduce((s, r) => s + r.expected, 0);

        const projectedRevenue = Math.round(baseRevenue * multiplier);

        // Top subscription/service driving this feature's revenue (by planned)
        const byService = new Map<number, number>();
        state.revenueLines
          .filter(l => l.featureId === feature.id)
          .forEach(l => {
            const v = l.rate * (l.plannedTransactions || 0);
            byService.set(l.serviceId, (byService.get(l.serviceId) ?? 0) + v);
          });
        let topServiceId: number | null = null;
        let topServiceVal = 0;
        byService.forEach((v, k) => { if (v > topServiceVal) { topServiceVal = v; topServiceId = k; } });
        const topService = topServiceId != null ? state.revenueServices.find(s => s.id === topServiceId) : null;
        const topShare = baseRevenue > 0 ? (topServiceVal / baseRevenue) * 100 : 0;

        return {
          id: feature.id,
          product: product?.name || '-',
          productObj: product,
          portfolio: portfolio?.name || '-',
          feature: feature.name,
          startDate: feature.startDate,
          endDate: feature.endDate,
          projectedRevenue,
          topServiceName: topService?.name ?? null,
          topServiceShare: topShare,
        };
      })
      .filter(d => d.projectedRevenue > 0)
      .sort((a, b) => b.projectedRevenue - a.projectedRevenue)
      .slice(0, 6);

    return upcoming;
  }, [state, scenario, horizon, config]);

  const totalProjected = drivers.reduce((s, d) => s + d.projectedRevenue, 0);

  return (
    <div className="bg-card rounded-xl shadow-[var(--shadow-card)] p-6">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <Rocket className="w-5 h-5 text-primary" />
          <h3 className="text-foreground">{t('upcomingRevenueDrivers')}</h3>
        </div>
        <div className="text-xs text-muted-foreground">
          {t('total')}: <span className="font-bold text-success">{formatCurrency(totalProjected, language)}</span>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground uppercase tracking-wide">{t('product')}</th>
              <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground uppercase tracking-wide">{t('feature')}</th>
              <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground uppercase tracking-wide">{t('portfolio')}</th>
              <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground uppercase tracking-wide">{t('duration')}</th>
              <th className="text-right py-3 px-4 text-xs font-medium text-muted-foreground uppercase tracking-wide">{t('projectedRevenue')}</th>
            </tr>
          </thead>
          <tbody>
            {drivers.map(d => (
              <tr
                key={d.id}
                className="border-b border-border/50 hover:bg-muted/30 cursor-pointer transition-colors"
                onClick={() => d.productObj && onProductClick(d.productObj)}
              >
                <td className="py-3 px-4 font-medium text-foreground">{d.product}</td>
                <td className="py-3 px-4 text-muted-foreground">
                  <div>{d.feature}</div>
                  {d.topServiceName && (
                    <div className="text-[10px] text-muted-foreground/80 mt-0.5">
                      {t('topService')}: <span className="font-medium text-foreground/80">{d.topServiceName}</span>
                      {d.topServiceShare > 0 && <span className="ms-1">({d.topServiceShare.toFixed(0)}%)</span>}
                    </div>
                  )}
                </td>
                <td className="py-3 px-4">
                  <span className="text-xs px-2 py-1 rounded-md bg-muted text-muted-foreground">{d.portfolio}</span>
                </td>
                <td className="py-3 px-4 text-muted-foreground">
                  {formatDate(d.startDate, language)} → {formatDate(d.endDate, language)}
                </td>
                <td className="py-3 px-4 text-right font-bold text-success">
                  {formatCurrency(d.projectedRevenue, language)}
                </td>
              </tr>
            ))}
            {drivers.length === 0 && (
              <tr>
                <td colSpan={5} className="py-8 text-center text-muted-foreground text-sm">
                  No upcoming revenue drivers in this period
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default UpcomingRevenueDrivers;

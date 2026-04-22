import { useMemo } from 'react';
import { useApp } from '@/context/AppContext';
import { formatCurrency } from '@/lib/utils';
import {
  ScenarioConfig,
  buildServiceBaselines,
  projectServiceSeries,
} from '@/lib/forecastEngine';
import { PipelineHorizon } from '@/pages/Dashboard';
import { Sparkles } from 'lucide-react';

interface Props {
  horizon: PipelineHorizon;
  config: ScenarioConfig;
  /** Optional limit on rows displayed (default 8). */
  maxRows?: number;
}

/**
 * Per-service forecast for the current scenario/horizon.
 * Builds baselines from observed actual revenue lines (avg per observed
 * month), projects each service independently using the same scenario
 * config, and shows the top N drivers with their projected total + share.
 */
const ForecastByService = ({ horizon, config, maxRows = 8 }: Props) => {
  const { state, t, language } = useApp();

  const { rows, total } = useMemo(() => {
    const nameById = new Map<number, string>();
    state.revenueServices.forEach(s => nameById.set(s.id, s.name));

    // Distinct months observed in actual lines (any non-zero actual tx).
    const monthSet = new Set<string>();
    state.revenueLines.forEach(l => {
      if ((l.actualTransactions || 0) > 0) monthSet.add(l.month);
    });
    const monthsObserved = monthSet.size;

    const enriched = state.revenueLines
      .filter(l => (l.actualTransactions || 0) > 0)
      .map(l => ({
        rate: l.rate,
        actualTransactions: l.actualTransactions,
        serviceName: nameById.get(l.serviceId) ?? 'Unknown',
      }));

    const baselines = buildServiceBaselines(enriched, monthsObserved);
    return projectServiceSeries(baselines, horizon, config);
  }, [state.revenueLines, state.revenueServices, horizon, config]);

  const top = rows.slice(0, maxRows);
  const tail = Math.max(0, rows.length - top.length);

  return (
    <div className="bg-card rounded-xl shadow-[var(--shadow-card)] p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-primary" />
          {t('forecastByService')}
          <span className="text-[10px] uppercase tracking-wide text-muted-foreground bg-muted px-1.5 py-0.5 rounded ms-1">
            {horizon}{t('months').slice(0, 1)}
          </span>
        </h3>
        <span className="text-[11px] text-muted-foreground">
          {t('totalProjected')}: <span className="font-semibold text-foreground">{formatCurrency(total, language)}</span>
        </span>
      </div>
      {top.length === 0 ? (
        <div className="text-xs text-muted-foreground py-6 text-center">{t('noServiceData')}</div>
      ) : (
        <>
        {/* Mobile cards */}
        <div className="md:hidden space-y-2">
          {top.map(r => (
            <div key={r.name} className="border border-border rounded-lg p-3">
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="font-medium text-sm text-foreground truncate flex-1">{r.name}</div>
                <div className="text-end shrink-0">
                  <div className="font-semibold text-sm text-foreground tabular-nums">{formatCurrency(r.totalProjected, language)}</div>
                  <div className="text-[10px] text-muted-foreground">{t('projected')}</div>
                </div>
              </div>
              <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                <span>{t('avgMonthly')}: <span className="text-foreground tabular-nums">{formatCurrency(r.avgMonthlyRevenue, language)}</span></span>
                <span>{(r.share * 100).toFixed(1)}%</span>
              </div>
            </div>
          ))}
          {tail > 0 && (
            <p className="text-[11px] text-muted-foreground mt-2">+{tail} {t('moreServices')}</p>
          )}
        </div>
        {/* Desktop table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border text-[11px] uppercase tracking-wide text-muted-foreground">
                <th className="text-start py-2 ps-1">{t('service')}</th>
                <th className="text-end py-2">{t('avgMonthly')}</th>
                <th className="text-end py-2">{t('projected')}</th>
                <th className="text-end py-2 pe-1">{t('shareOfTotal')}</th>
              </tr>
            </thead>
            <tbody>
              {top.map(r => (
                <tr key={r.name} className="border-b border-border/50">
                  <td className="py-2 ps-1 font-medium text-foreground">{r.name}</td>
                  <td className="py-2 text-end text-muted-foreground">{formatCurrency(r.avgMonthlyRevenue, language)}</td>
                  <td className="py-2 text-end font-semibold text-foreground">{formatCurrency(r.totalProjected, language)}</td>
                  <td className="py-2 pe-1 text-end text-muted-foreground">{(r.share * 100).toFixed(1)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
          {tail > 0 && (
            <p className="text-[11px] text-muted-foreground mt-2">
              +{tail} {t('moreServices')}
            </p>
          )}
        </div>
        </>
      )}
    </div>
  );
};

export default ForecastByService;

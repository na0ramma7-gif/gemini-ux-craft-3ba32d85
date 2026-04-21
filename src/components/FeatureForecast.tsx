// Feature-level Forecast (Phase A: Simple mode, per-service growth, multi-scenario).
//
// Architecture:
//   - Reads per-service historical baseline (avg monthly Tx, highest Tx, current rate)
//     from `state.revenueLines` + `state.revenueServices` for THIS feature.
//   - Reads cost baseline from `costEntries` prop (Financial Planning workspace).
//   - Per-feature scenarios live in localStorage via `useFeatureForecastSettings`.
//   - The Assumptions Panel edits a DRAFT and only commits on Apply.
import { useEffect, useMemo, useState } from 'react';
import { useApp } from '@/context/AppContext';
import { Feature } from '@/types';
import { formatCurrency, cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  ReferenceLine,
} from 'recharts';
import {
  TrendingUp,
  Settings2,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  DollarSign,
} from 'lucide-react';
import {
  ForecastScenario,
  ServiceBaselineInput,
  TONE_CLASSES,
  materialiseLegacyScenario,
  projectForecast,
} from '@/lib/featureForecast';
import { useFeatureForecastSettings } from '@/hooks/useFeatureForecastSettings';
import ForecastAssumptionsPanel from '@/components/forecast/ForecastAssumptionsPanel';

const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

interface FeatureForecastProps {
  feature: Feature;
  revenueEntries: Array<{ month: number; year: number; planned: number; actual: number }>;
  costEntries: Array<{ month: number; year: number; planned: number; actual: number; calculatedCost?: number }>;
}

const FeatureForecast = ({ feature, revenueEntries, costEntries }: FeatureForecastProps) => {
  const { state, t, language } = useApp();
  const { settings, setActiveScenario, applyDraft, replaceSettings } = useFeatureForecastSettings(feature.id);
  const [showAssumptions, setShowAssumptions] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [migrationDismissed, setMigrationDismissed] = useState(false);

  const activeScenario: ForecastScenario =
    settings.scenarios.find(s => s.id === settings.activeScenarioId) ?? settings.scenarios[0];

  // ── Per-service baseline for THIS feature ─────────────────────
  // baseTx = avg historical monthly transactions per service
  // rate   = the service's current default rate (Financial Planning Step 1)
  const serviceBaselines = useMemo<ServiceBaselineInput[]>(() => {
    const services = state.revenueServices.filter(s => s.featureId === feature.id);
    if (services.length === 0) return [];
    const lines = state.revenueLines.filter(l => l.featureId === feature.id);
    return services
      .map(svc => {
        const svcLines = lines.filter(l => l.serviceId === svc.id);
        // Distinct months observed for THIS service.
        const monthsObserved = new Set(svcLines.map(l => l.month)).size;
        const totalTx = svcLines.reduce(
          (s, l) => s + (l.actualTransactions || l.plannedTransactions || 0),
          0,
        );
        const highestTx = svcLines.reduce(
          (m, l) => Math.max(m, l.actualTransactions || l.plannedTransactions || 0),
          0,
        );
        const baseTx = monthsObserved > 0 ? totalTx / monthsObserved : 0;
        return {
          serviceId: svc.id,
          serviceName: svc.name,
          rate: svc.defaultRate,
          baseTx,
          highestHistoricalTx: highestTx,
        };
      })
      // Drop services with zero history — nothing meaningful to forecast.
      .filter(b => b.baseTx > 0);
  }, [state.revenueServices, state.revenueLines, feature.id]);

  // ── Cost baseline from Financial Planning workspace ───────────
  const costBaseline = useMemo(() => {
    // Aggregate by month: cost = actual fallback to planned/calculated.
    const byMonth: Record<string, number> = {};
    costEntries.forEach(e => {
      const key = `${e.year}-${e.month}`;
      const v = e.actual > 0 ? e.actual : e.calculatedCost ?? e.planned;
      byMonth[key] = (byMonth[key] || 0) + v;
    });
    const monthsWithCost = Object.values(byMonth).filter(v => v > 0);
    const total = monthsWithCost.reduce((s, v) => s + v, 0);
    const baseMonthlyCost = monthsWithCost.length > 0 ? total / monthsWithCost.length : 0;
    return { baseMonthlyCost, hasCostData: monthsWithCost.length > 0 };
  }, [costEntries]);

  // First forecast month = month after the last historical month.
  const forecastStartDate = useMemo(() => {
    // Determined later via historicalChart; recomputed below.
    return new Date();
  }, []);

  // Compute the actual first forecast month from history (used for both
  // projection start date and legacy migration materialisation).
  const computedForecastStartDate = useMemo(() => {
    const months = new Set<string>();
    revenueEntries.forEach(e => months.add(`${e.year}-${String(e.month + 1).padStart(2, '0')}`));
    costEntries.forEach(e => months.add(`${e.year}-${String(e.month + 1).padStart(2, '0')}`));
    state.revenueActual.filter(r => r.featureId === feature.id).forEach(r => months.add(r.month));
    const sorted = Array.from(months).sort();
    if (sorted.length === 0) return new Date();
    const [y, m] = sorted[sorted.length - 1].split('-').map(Number);
    return new Date(y, m, 1); // month after last historical
  }, [revenueEntries, costEntries, state.revenueActual, feature.id]);

  // One-shot legacy materialisation: when the loader signals migratedFromLegacy,
  // replay the legacy assumptions into explicit per-month transactions.
  useEffect(() => {
    if (!settings.migratedFromLegacy) return;
    if (serviceBaselines.length === 0) return; // wait for baselines to be ready
    const next = {
      ...settings,
      scenarios: settings.scenarios.map(s =>
        materialiseLegacyScenario(s, serviceBaselines, settings.horizon, computedForecastStartDate),
      ),
    };
    delete (next as any).migratedFromLegacy;
    replaceSettings(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings.migratedFromLegacy, serviceBaselines.length]);

  // ── Live projection for the active scenario ───────────────────
  const projection = useMemo(
    () => projectForecast(serviceBaselines, costBaseline, activeScenario, settings.horizon, forecastStartDate),
    [serviceBaselines, costBaseline, activeScenario, settings.horizon, forecastStartDate],
  );

  // ── Historical chart series ───────────────────────────────────
  const historicalChart = useMemo(() => {
    const monthMap: Record<string, { revenue: number; cost: number }> = {};
    revenueEntries.forEach(e => {
      const key = `${e.year}-${String(e.month + 1).padStart(2, '0')}`;
      if (!monthMap[key]) monthMap[key] = { revenue: 0, cost: 0 };
      monthMap[key].revenue += e.actual > 0 ? e.actual : e.planned;
    });
    costEntries.forEach(e => {
      const key = `${e.year}-${String(e.month + 1).padStart(2, '0')}`;
      if (!monthMap[key]) monthMap[key] = { revenue: 0, cost: 0 };
      monthMap[key].cost += e.actual > 0 ? e.actual : e.calculatedCost ?? e.planned;
    });
    state.revenueActual
      .filter(r => r.featureId === feature.id)
      .forEach(r => {
        if (!monthMap[r.month]) monthMap[r.month] = { revenue: 0, cost: 0 };
        monthMap[r.month].revenue += r.actual;
      });
    return Object.keys(monthMap)
      .sort()
      .map(key => {
        const [y, m] = key.split('-');
        return {
          name: `${MONTHS_SHORT[parseInt(m) - 1]} ${y.slice(2)}`,
          month: key,
          revenue: monthMap[key].revenue,
          cost: monthMap[key].cost,
          profit: monthMap[key].revenue - monthMap[key].cost,
        };
      });
  }, [revenueEntries, costEntries, state.revenueActual, feature.id]);

  // ── Combined chart data: actuals + forecast lines ─────────────
  const chartData = useMemo(() => {
    const last = historicalChart[historicalChart.length - 1];
    const startDate = last
      ? (() => {
          const [y, m] = last.month.split('-').map(Number);
          return new Date(y, m - 1 + 1, 1);
        })()
      : new Date();

    const historical = historicalChart.map(d => ({
      name: d.name,
      actualRevenue: d.revenue,
      actualCost: d.cost,
      actualProfit: d.profit,
      forecastRevenue: undefined as number | undefined,
      forecastCost: undefined as number | undefined,
      forecastProfit: undefined as number | undefined,
    }));

    const forecast = projection.monthly.map((m, i) => {
      const date = new Date(startDate.getFullYear(), startDate.getMonth() + i, 1);
      return {
        name: `${MONTHS_SHORT[date.getMonth()]} ${String(date.getFullYear()).slice(2)}`,
        actualRevenue: i === 0 && last ? last.revenue : (undefined as number | undefined),
        actualCost: i === 0 && last ? last.cost : (undefined as number | undefined),
        actualProfit: i === 0 && last ? last.profit : (undefined as number | undefined),
        forecastRevenue: m.revenue,
        forecastCost: projection.hasCostData ? m.cost : (undefined as number | undefined),
        forecastProfit: projection.hasCostData ? m.profit : m.revenue,
      };
    });
    return [...historical, ...forecast];
  }, [historicalChart, projection]);

  const tone = TONE_CLASSES[activeScenario.tone];

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="bg-card border border-border rounded-lg shadow-lg p-3 text-xs space-y-1 max-w-xs">
        <p className="font-semibold text-foreground">{label}</p>
        {payload.filter((e: any) => e.value != null).map((entry: any) => (
          <div key={entry.dataKey} className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full" style={{ background: entry.color }} />
            <span className="text-muted-foreground">{entry.name}:</span>
            <span className="font-semibold text-foreground tabular-nums">
              {formatCurrency(entry.value, language)}
            </span>
          </div>
        ))}
      </div>
    );
  };

  const hasAnyServices = serviceBaselines.length > 0;

  return (
    <div className="space-y-6">
      {/* Header with scenario tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h3 className="text-base sm:text-lg font-semibold text-foreground flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-primary" />
            {t('forecast')} — {feature.name}
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            {activeScenario.name} · {settings.horizon} {t('months')} · {activeScenario.costGrowthRate}% {t('cost')}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex bg-secondary rounded-lg p-1 gap-0.5">
            {settings.scenarios.map(s => {
              const sTone = TONE_CLASSES[s.tone];
              const active = s.id === settings.activeScenarioId;
              return (
                <button
                  key={s.id}
                  onClick={() => setActiveScenario(s.id)}
                  className={cn(
                    'inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[11px] font-medium transition-colors',
                    active
                      ? `${sTone.bg} ${sTone.text} shadow-sm`
                      : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  <span className={cn('w-1.5 h-1.5 rounded-full', sTone.dot)} />
                  {s.name}
                </button>
              );
            })}
          </div>
          <Button variant="outline" size="sm" onClick={() => setShowAssumptions(true)} className="gap-1.5">
            <Settings2 className="w-3.5 h-3.5" />
            {t('forecastAssumptions')}
          </Button>
        </div>
      </div>

      {/* No-cost banner */}
      {!projection.hasCostData && (
        <div className="flex items-start gap-2 bg-warning/10 border border-warning/30 rounded-lg px-3 py-2.5 text-xs">
          <AlertTriangle className="w-4 h-4 text-warning shrink-0 mt-0.5" />
          <p className="text-foreground">{t('noCostBannerLong')}</p>
        </div>
      )}

      {/* No-services banner */}
      {!hasAnyServices && (
        <div className="flex items-start gap-2 bg-muted border border-border rounded-lg px-3 py-2.5 text-xs">
          <AlertTriangle className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
          <p className="text-foreground">{t('noServicesForForecastBanner')}</p>
        </div>
      )}

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <SummaryCard
          label={`${t('projectedRevenue')} (${settings.horizon} ${t('months')})`}
          value={formatCurrency(projection.totalRevenue, language)}
          tone="success"
        />
        <SummaryCard
          label={`${t('projectedCost')} (${settings.horizon} ${t('months')})`}
          value={projection.hasCostData ? formatCurrency(projection.totalCost, language) : '—'}
          tone="destructive"
          hint={!projection.hasCostData ? t('noCostData') : undefined}
        />
        <SummaryCard
          label={`${t('projectedProfit')} (${settings.horizon} ${t('months')})`}
          value={formatCurrency(projection.totalProfit, language)}
          tone={projection.totalProfit >= 0 ? 'success' : 'destructive'}
        />
        <SummaryCard
          label={t('projectedMargin')}
          value={projection.hasCostData ? `${projection.margin.toFixed(1)}%` : '—'}
          tone="primary"
          hint={!projection.hasCostData ? t('noCostData') : undefined}
        />
      </div>

      {/* Per-service baseline + assumptions */}
      {hasAnyServices && (
        <div className="bg-card rounded-xl shadow-[var(--shadow-card)] p-5">
          <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-primary" />
            {t('perServiceBaseline')}
          </h4>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border text-[11px] uppercase tracking-wide text-muted-foreground">
                  <th className="text-start py-2 ps-1">{t('service')}</th>
                  <th className="text-end py-2">{t('rate')}</th>
                  <th className="text-end py-2">{t('forecast')} {t('transactionsShort')}</th>
                  <th className="text-end py-2">{t('forecast')} {t('revenue')}</th>
                  <th className="text-end py-2 pe-1">{t('shareOfTotal')}</th>
                </tr>
              </thead>
              <tbody>
                {projection.services.map(s => {
                  const share = projection.totalRevenue > 0 ? (s.totalRevenue / projection.totalRevenue) * 100 : 0;
                  return (
                    <tr key={s.serviceId} className="border-b border-border/50">
                      <td className="py-2 ps-1 font-medium text-foreground">
                        {s.serviceName}
                      </td>
                      <td className="py-2 text-end tabular-nums text-muted-foreground">
                        {formatCurrency(s.defaultRate, language)}
                      </td>
                      <td className="py-2 text-end tabular-nums text-foreground">
                        {Math.round(s.totalTx).toLocaleString()}
                      </td>
                      <td className="py-2 text-end tabular-nums font-medium text-foreground">
                        {formatCurrency(Math.round(s.totalRevenue), language)}
                      </td>
                      <td className="py-2 pe-1 text-end text-muted-foreground tabular-nums">{share.toFixed(1)}%</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Charts */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <ChartCard title={t('revenueForecast')}>
          <LineChart data={chartData} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
            <XAxis dataKey="name" tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
            <Tooltip content={<CustomTooltip />} />
            <Line type="monotone" dataKey="actualRevenue" stroke="hsl(var(--revenue))" strokeWidth={2} dot={false} name={`${t('actual')} ${t('revenue')}`} connectNulls={false} />
            <Line type="monotone" dataKey="forecastRevenue" stroke={tone.hex} strokeWidth={2} strokeDasharray="6 3" strokeOpacity={0.85} dot={false} name={`${t('forecast')} ${t('revenue')}`} connectNulls={false} />
            <Legend iconType="circle" iconSize={6} wrapperStyle={{ fontSize: 9, paddingTop: 4 }} />
          </LineChart>
        </ChartCard>
        <ChartCard title={t('costForecast')}>
          <LineChart data={chartData} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
            <XAxis dataKey="name" tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
            <Tooltip content={<CustomTooltip />} />
            <Line type="monotone" dataKey="actualCost" stroke="hsl(var(--cost))" strokeWidth={2} dot={false} name={`${t('actual')} ${t('cost')}`} connectNulls={false} />
            <Line type="monotone" dataKey="forecastCost" stroke="hsl(var(--cost))" strokeWidth={2} strokeDasharray="6 3" strokeOpacity={0.7} dot={false} name={`${t('forecast')} ${t('cost')}`} connectNulls={false} />
            <Legend iconType="circle" iconSize={6} wrapperStyle={{ fontSize: 9, paddingTop: 4 }} />
          </LineChart>
        </ChartCard>
        <ChartCard title={t('profitProjection')}>
          <LineChart data={chartData} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
            <XAxis dataKey="name" tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
            <Tooltip content={<CustomTooltip />} />
            <ReferenceLine y={0} stroke="hsl(var(--border))" strokeDasharray="3 3" />
            <Line type="monotone" dataKey="actualProfit" stroke="hsl(var(--profit))" strokeWidth={2} dot={false} name={`${t('actual')} ${t('netProfit')}`} connectNulls={false} />
            <Line type="monotone" dataKey="forecastProfit" stroke="hsl(var(--profit))" strokeWidth={2} strokeDasharray="6 3" strokeOpacity={0.7} dot={false} name={`${t('forecast')} ${t('netProfit')}`} connectNulls={false} />
            <Legend iconType="circle" iconSize={6} wrapperStyle={{ fontSize: 9, paddingTop: 4 }} />
          </LineChart>
        </ChartCard>
      </div>

      {/* Forecast Details (per-service, per-month) */}
      <Collapsible open={showDetails} onOpenChange={setShowDetails}>
        <CollapsibleTrigger asChild>
          <Button variant="outline" className="w-full justify-between gap-2">
            <span className="text-sm font-medium">{t('forecastDetails')}</span>
            {showDetails ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="bg-card rounded-xl shadow-[var(--shadow-card)] overflow-hidden mt-3">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-muted/40">
                  <tr>
                    <th className="text-start p-3 font-medium text-muted-foreground sticky start-0 bg-muted/40 z-10">{t('service')}</th>
                    {projection.monthly.map((_, i) => (
                      <th key={i} className="text-end p-3 font-medium text-muted-foreground tabular-nums">
                        {monthLabel(i, historicalChart[historicalChart.length - 1]?.month)}
                      </th>
                    ))}
                    <th className="text-end p-3 font-medium text-muted-foreground tabular-nums">{t('total')}</th>
                  </tr>
                </thead>
                <tbody>
                  {projection.services.map(s => (
                    <tr key={s.serviceId} className="border-t border-border/60">
                      <td className="p-3 font-medium text-foreground sticky start-0 bg-card z-10">{s.serviceName}</td>
                      {s.monthly.map((m, i) => (
                        <td
                          key={i}
                          className="p-3 text-end tabular-nums text-foreground"
                        >
                          {formatCurrency(Math.round(m.revenue), language)}
                        </td>
                      ))}
                      <td className="p-3 text-end font-semibold text-foreground tabular-nums">
                        {formatCurrency(Math.round(s.totalRevenue), language)}
                      </td>
                    </tr>
                  ))}
                  <tr className="border-t-2 border-border bg-muted/30">
                    <td className="p-3 font-semibold sticky start-0 bg-muted/30 z-10">{t('totalRevenue')}</td>
                    {projection.monthly.map((m, i) => (
                      <td key={i} className="p-3 text-end font-semibold text-success tabular-nums">
                        {formatCurrency(Math.round(m.revenue), language)}
                      </td>
                    ))}
                    <td className="p-3 text-end font-bold text-success tabular-nums">
                      {formatCurrency(Math.round(projection.totalRevenue), language)}
                    </td>
                  </tr>
                  {projection.hasCostData && (
                    <>
                      <tr className="border-t border-border/60">
                        <td className="p-3 font-semibold sticky start-0 bg-card z-10">{t('totalCost')}</td>
                        {projection.monthly.map((m, i) => (
                          <td key={i} className="p-3 text-end text-destructive tabular-nums">
                            {formatCurrency(Math.round(m.cost), language)}
                          </td>
                        ))}
                        <td className="p-3 text-end font-semibold text-destructive tabular-nums">
                          {formatCurrency(Math.round(projection.totalCost), language)}
                        </td>
                      </tr>
                      <tr className="border-t border-border/60 bg-muted/30">
                        <td className="p-3 font-semibold sticky start-0 bg-muted/30 z-10">{t('forecastProfit')}</td>
                        {projection.monthly.map((m, i) => (
                          <td
                            key={i}
                            className={cn(
                              'p-3 text-end font-semibold tabular-nums',
                              m.profit >= 0 ? 'text-success' : 'text-destructive',
                            )}
                          >
                            {formatCurrency(Math.round(m.profit), language)}
                          </td>
                        ))}
                        <td
                          className={cn(
                            'p-3 text-end font-bold tabular-nums',
                            projection.totalProfit >= 0 ? 'text-success' : 'text-destructive',
                          )}
                        >
                          {formatCurrency(Math.round(projection.totalProfit), language)}
                        </td>
                      </tr>
                    </>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>

      <ForecastAssumptionsPanel
        open={showAssumptions}
        onOpenChange={setShowAssumptions}
        initialSettings={settings}
        serviceBaselines={serviceBaselines}
        costBaseline={costBaseline}
        onApply={applyDraft}
        forecastStartDate={(() => {
          const last = historicalChart[historicalChart.length - 1];
          if (!last) return new Date();
          const [y, m] = last.month.split('-').map(Number);
          return new Date(y, m, 1);
        })()}
      />
    </div>
  );
};

const SummaryCard = ({
  label, value, tone, hint,
}: {
  label: string;
  value: string;
  tone: 'success' | 'destructive' | 'primary';
  hint?: string;
}) => {
  const bg = tone === 'success' ? 'bg-success/10' : tone === 'destructive' ? 'bg-destructive/10' : 'bg-primary/10';
  const txt = tone === 'success' ? 'text-success' : tone === 'destructive' ? 'text-destructive' : 'text-primary';
  return (
    <div className={cn('rounded-xl p-4', bg)}>
      <div className="text-[11px] text-muted-foreground mb-1">{label}</div>
      <div className={cn('text-base font-bold tabular-nums', txt)}>{value}</div>
      {hint && <div className="text-[10px] text-muted-foreground mt-0.5">{hint}</div>}
    </div>
  );
};

const ChartCard = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div className="bg-card rounded-xl shadow-[var(--shadow-card)] p-5">
    <h4 className="text-sm font-semibold text-foreground mb-3">{title}</h4>
    <div className="h-52">
      <ResponsiveContainer width="100%" height="100%">
        {children as any}
      </ResponsiveContainer>
    </div>
  </div>
);

/** Build a "Mar 25" style label for the i-th forecast month, given the last historical month. */
const monthLabel = (i: number, lastMonth?: string) => {
  const start = lastMonth
    ? (() => {
        const [y, m] = lastMonth.split('-').map(Number);
        return new Date(y, m - 1 + 1, 1);
      })()
    : new Date();
  const d = new Date(start.getFullYear(), start.getMonth() + i, 1);
  return `${MONTHS_SHORT[d.getMonth()]} ${String(d.getFullYear()).slice(2)}`;
};

export default FeatureForecast;

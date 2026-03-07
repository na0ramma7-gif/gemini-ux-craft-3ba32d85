import { useMemo, useState, useCallback } from 'react';
import { useApp } from '@/context/AppContext';
import { Product } from '@/types';
import { formatCurrency } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import ForecastConfigModal, {
  ForecastConfig,
  ScenarioType,
  SCENARIO_DEFAULTS,
} from '@/components/ForecastConfigModal';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  ReferenceLine,
} from 'recharts';
import { format, addMonths } from 'date-fns';
import {
  TrendingUp,
  Settings2,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  Pencil,
} from 'lucide-react';

interface ProductForecastProps {
  product: Product;
}

interface ForecastRow {
  name: string;
  month: string;
  revenue: number;
  cost: number;
  profit: number;
  isHistorical: boolean;
  isManualRevenue?: boolean;
  isManualCost?: boolean;
}

const ProductForecast = ({ product }: ProductForecastProps) => {
  const { state, t, language } = useApp();
  const [showConfig, setShowConfig] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [config, setConfig] = useState<ForecastConfig>({
    horizon: 12,
    scenario: 'baseline',
    ...SCENARIO_DEFAULTS['baseline'],
  });
  const [manualOverrides, setManualOverrides] = useState<
    Record<string, { revenue?: number; cost?: number }>
  >({});

  // Build historical data
  const historicalData = useMemo(() => {
    const features = state.features.filter(f => f.productId === product.id);
    const featureIds = new Set(features.map(f => f.id));

    const actualByMonth: Record<string, number> = {};
    state.revenueActual.filter(r => featureIds.has(r.featureId)).forEach(r => {
      actualByMonth[r.month] = (actualByMonth[r.month] || 0) + r.actual;
    });

    const productCosts = state.costs.filter(c => c.productId === product.id);
    const monthlyCostBase = productCosts.reduce((sum, c) => {
      if (c.type === 'CAPEX' && c.total && c.amortization) return sum + c.total / c.amortization;
      if (c.monthly) return sum + c.monthly;
      return sum;
    }, 0);

    const months = Object.keys(actualByMonth).sort();
    return months.map(month => ({
      name: format(new Date(month + '-01'), 'MMM yy'),
      month,
      revenue: actualByMonth[month] || 0,
      cost: monthlyCostBase,
      profit: (actualByMonth[month] || 0) - monthlyCostBase,
      isHistorical: true,
    }));
  }, [state, product.id]);

  // Generate forecast
  const forecastRows = useMemo((): ForecastRow[] => {
    const lastHistorical = historicalData[historicalData.length - 1];
    if (!lastHistorical) return [];

    const lastDate = new Date(lastHistorical.month + '-01');
    let projRevenue = lastHistorical.revenue;
    let projCost = lastHistorical.cost;

    const monthlyRevenueGrowth = config.revenueGrowthRate / 100;
    const monthlyCostGrowth = config.costGrowthRate / 100;
    const growthCap = config.revenueGrowthCap / 100;

    const rows: ForecastRow[] = [];

    for (let i = 1; i <= config.horizon; i++) {
      const forecastDate = addMonths(lastDate, i);
      const monthKey = format(forecastDate, 'yyyy-MM');

      // Apply growth with cap
      const effectiveRevenueGrowth = Math.min(monthlyRevenueGrowth, growthCap);
      projRevenue = projRevenue * (1 + effectiveRevenueGrowth);
      projCost = projCost * (1 + monthlyCostGrowth);

      const override = manualOverrides[monthKey];
      const finalRevenue = override?.revenue ?? Math.round(projRevenue);
      const finalCost = override?.cost ?? Math.round(projCost);

      rows.push({
        name: format(forecastDate, 'MMM yy'),
        month: monthKey,
        revenue: finalRevenue,
        cost: finalCost,
        profit: finalRevenue - finalCost,
        isHistorical: false,
        isManualRevenue: override?.revenue !== undefined,
        isManualCost: override?.cost !== undefined,
      });

      // Use overridden values as base for next projection
      if (override?.revenue !== undefined) projRevenue = override.revenue;
      if (override?.cost !== undefined) projCost = override.cost;
    }

    return rows;
  }, [historicalData, config, manualOverrides]);

  // Combined data for charts
  const chartData = useMemo(() => {
    const historical: any[] = historicalData.map(d => ({
      ...d,
      actualRevenue: d.revenue,
      actualCost: d.cost,
      actualProfit: d.profit,
      forecastRevenue: undefined,
      forecastCost: undefined,
      forecastProfit: undefined,
    }));

    // Bridge: last historical point appears in both series for continuity
    const bridge = historicalData[historicalData.length - 1];

    const forecast: any[] = forecastRows.map((d, idx) => ({
      name: d.name,
      month: d.month,
      actualRevenue: idx === 0 && bridge ? bridge.revenue : undefined,
      actualCost: idx === 0 && bridge ? bridge.cost : undefined,
      actualProfit: idx === 0 && bridge ? bridge.profit : undefined,
      forecastRevenue: d.revenue,
      forecastCost: d.cost,
      forecastProfit: d.profit,
    }));

    return [...historical, ...forecast];
  }, [historicalData, forecastRows]);

  // Summary
  const summary = useMemo(() => {
    const totalRevenue = forecastRows.reduce((s, r) => s + r.revenue, 0);
    const totalCost = forecastRows.reduce((s, r) => s + r.cost, 0);
    const totalProfit = totalRevenue - totalCost;
    const margin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;

    // Break-even month (first month where cumulative profit > 0)
    let cumProfit = 0;
    let breakEven: string | null = null;
    for (const row of forecastRows) {
      cumProfit += row.profit;
      if (cumProfit > 0 && !breakEven) {
        breakEven = row.name;
      }
    }

    // Alerts
    const alerts: string[] = [];
    const lastForecast = forecastRows[forecastRows.length - 1];
    if (lastForecast && lastForecast.revenue > historicalData[historicalData.length - 1]?.revenue * 5) {
      alerts.push('Revenue projection exceeds 5x current level — review assumptions');
    }
    if (margin < 0) {
      alerts.push('Projected margin is negative — costs exceed revenue');
    }

    return { totalRevenue, totalCost, totalProfit, margin, breakEven, alerts };
  }, [forecastRows, historicalData]);

  const handleOverride = useCallback((monthKey: string, field: 'revenue' | 'cost', value: number) => {
    setManualOverrides(prev => ({
      ...prev,
      [monthKey]: {
        ...prev[monthKey],
        [field]: value,
      },
    }));
  }, []);

  const clearOverride = useCallback((monthKey: string, field: 'revenue' | 'cost') => {
    setManualOverrides(prev => {
      const updated = { ...prev };
      if (updated[monthKey]) {
        const { [field]: _, ...rest } = updated[monthKey];
        if (Object.keys(rest).length === 0) {
          delete updated[monthKey];
        } else {
          updated[monthKey] = rest;
        }
      }
      return updated;
    });
  }, []);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="bg-card border border-border rounded-lg shadow-lg p-3 text-xs space-y-1 max-w-xs">
        <p className="font-semibold text-foreground">{label}</p>
        {payload.filter((e: any) => e.value != null).map((entry: any) => (
          <div key={entry.dataKey} className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full" style={{ background: entry.color }} />
            <span className="text-muted-foreground">{entry.name}:</span>
            <span className="font-semibold text-foreground">
              {formatCurrency(entry.value, language)}
            </span>
          </div>
        ))}
      </div>
    );
  };

  const scenarioLabel = t(config.scenario as any);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h3 className="text-base sm:text-lg font-semibold text-foreground flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-primary" />
            {t('forecast')} — {product.name}
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            {scenarioLabel} · {config.horizon} {t('months')} · {config.revenueGrowthRate}% {t('revenue')} / {config.costGrowthRate}% {t('cost')}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Scenario Quick Switch */}
          <div className="flex bg-secondary rounded-lg p-1">
            {(['baseline', 'optimistic', 'conservative'] as ScenarioType[]).map(s => (
              <button
                key={s}
                onClick={() => setConfig(prev => ({
                  ...prev,
                  scenario: s,
                  ...SCENARIO_DEFAULTS[s],
                }))}
                className={`px-2.5 py-1.5 rounded-md text-[11px] font-medium transition-colors ${
                  config.scenario === s
                    ? 'bg-card text-primary shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {t(s as any)}
              </button>
            ))}
          </div>
          <Button variant="outline" size="sm" onClick={() => setShowConfig(true)} className="gap-1.5">
            <Settings2 className="w-3.5 h-3.5" />
            {t('configureForecast')}
          </Button>
        </div>
      </div>

      {/* Alerts */}
      {summary.alerts.length > 0 && (
        <div className="space-y-2">
          {summary.alerts.map((alert, idx) => (
            <div key={idx} className="flex items-center gap-2 bg-warning/10 border border-warning/20 rounded-lg px-3 py-2 text-xs text-foreground">
              <AlertTriangle className="w-4 h-4 text-warning flex-shrink-0" />
              {alert}
            </div>
          ))}
        </div>
      )}

      {/* Section 1: Charts */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {/* Revenue Chart */}
        <div className="bg-card rounded-xl shadow-card p-5">
          <h4 className="text-sm font-semibold text-foreground mb-3">{t('revenue')} — {t('actual')} vs {t('forecast')}</h4>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="fGradActualRev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--revenue))" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="hsl(var(--revenue))" stopOpacity={0.02} />
                  </linearGradient>
                  <linearGradient id="fGradForecastRev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--forecast))" stopOpacity={0.2} />
                    <stop offset="100%" stopColor="hsl(var(--forecast))" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} tickFormatter={v => `${(v/1000).toFixed(0)}k`} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="actualRevenue" stroke="hsl(var(--revenue))" strokeWidth={2} fill="url(#fGradActualRev)" dot={false} name={`${t('actual')} ${t('revenue')}`} connectNulls={false} />
                <Area type="monotone" dataKey="forecastRevenue" stroke="hsl(var(--forecast))" strokeWidth={2} strokeDasharray="6 3" fill="url(#fGradForecastRev)" dot={false} name={`${t('forecast')} ${t('revenue')}`} connectNulls={false} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 10, paddingTop: 4 }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Cost & Profit Chart */}
        <div className="bg-card rounded-xl shadow-card p-5">
          <h4 className="text-sm font-semibold text-foreground mb-3">{t('cost')} & {t('netProfit')}</h4>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="fGradActualCost" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--cost))" stopOpacity={0.2} />
                    <stop offset="100%" stopColor="hsl(var(--cost))" stopOpacity={0.02} />
                  </linearGradient>
                  <linearGradient id="fGradForecastProfit" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--profit))" stopOpacity={0.2} />
                    <stop offset="100%" stopColor="hsl(var(--profit))" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} tickFormatter={v => `${(v/1000).toFixed(0)}k`} />
                <Tooltip content={<CustomTooltip />} />
                <ReferenceLine y={0} stroke="hsl(var(--border))" strokeDasharray="3 3" />
                <Area type="monotone" dataKey="actualCost" stroke="hsl(var(--cost))" strokeWidth={1.5} fill="url(#fGradActualCost)" dot={false} name={`${t('actual')} ${t('cost')}`} connectNulls={false} />
                <Area type="monotone" dataKey="forecastCost" stroke="hsl(var(--cost))" strokeWidth={1.5} strokeDasharray="6 3" fill="none" dot={false} name={`${t('forecast')} ${t('cost')}`} connectNulls={false} />
                <Area type="monotone" dataKey="actualProfit" stroke="hsl(var(--profit))" strokeWidth={2} fill="none" dot={false} name={`${t('actual')} ${t('netProfit')}`} connectNulls={false} />
                <Area type="monotone" dataKey="forecastProfit" stroke="hsl(var(--profit))" strokeWidth={2} strokeDasharray="6 3" fill="url(#fGradForecastProfit)" dot={false} name={`${t('forecast')} ${t('netProfit')}`} connectNulls={false} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 10, paddingTop: 4 }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Section 2: Summary KPIs */}
      <div>
        <h4 className="text-sm font-semibold text-foreground mb-3">{t('forecastSummary')}</h4>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <div className="bg-success/10 rounded-xl p-4">
            <div className="text-[11px] text-muted-foreground mb-1">{t('projectedRevenue')}</div>
            <div className="text-base font-bold text-success">{formatCurrency(summary.totalRevenue, language)}</div>
          </div>
          <div className="bg-destructive/10 rounded-xl p-4">
            <div className="text-[11px] text-muted-foreground mb-1">{t('projectedCost')}</div>
            <div className="text-base font-bold text-destructive">{formatCurrency(summary.totalCost, language)}</div>
          </div>
          <div className="bg-primary/10 rounded-xl p-4">
            <div className="text-[11px] text-muted-foreground mb-1">{t('projectedProfit')}</div>
            <div className={`text-base font-bold ${summary.totalProfit >= 0 ? 'text-success' : 'text-destructive'}`}>
              {formatCurrency(summary.totalProfit, language)}
            </div>
          </div>
          <div className="bg-accent/10 rounded-xl p-4">
            <div className="text-[11px] text-muted-foreground mb-1">{t('projectedMargin')}</div>
            <div className="text-base font-bold text-primary">{summary.margin.toFixed(1)}%</div>
          </div>
          <div className="bg-secondary rounded-xl p-4">
            <div className="text-[11px] text-muted-foreground mb-1">{t('breakEvenMonth')}</div>
            <div className="text-base font-bold text-foreground">{summary.breakEven || '—'}</div>
          </div>
        </div>
      </div>

      {/* Section 3: Expandable Detail Table */}
      <Collapsible open={showDetails} onOpenChange={setShowDetails}>
        <CollapsibleTrigger asChild>
          <Button variant="outline" className="w-full justify-between gap-2">
            <span className="text-sm font-medium">{t('forecastDetails')}</span>
            {showDetails ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="bg-card rounded-xl shadow-card overflow-hidden mt-3">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-secondary/50">
                    <th className="text-start p-3 font-medium text-muted-foreground">{t('month')}</th>
                    <th className="text-start p-3 font-medium text-muted-foreground">{t('type')}</th>
                    <th className="text-end p-3 font-medium text-muted-foreground">{t('revenue')}</th>
                    <th className="text-end p-3 font-medium text-muted-foreground">{t('cost')}</th>
                    <th className="text-end p-3 font-medium text-muted-foreground">{t('netProfit')}</th>
                    <th className="text-center p-3 font-medium text-muted-foreground w-20"></th>
                  </tr>
                </thead>
                <tbody>
                  {/* Historical Rows */}
                  {historicalData.map((row, idx) => (
                    <tr key={`h-${idx}`} className="border-t border-border bg-secondary/20">
                      <td className="p-3 font-medium text-foreground">{row.name}</td>
                      <td className="p-3">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-success/10 text-success">
                          {t('actual')}
                        </span>
                      </td>
                      <td className="p-3 text-end text-foreground font-medium">{formatCurrency(row.revenue, language)}</td>
                      <td className="p-3 text-end text-foreground font-medium">{formatCurrency(row.cost, language)}</td>
                      <td className={`p-3 text-end font-medium ${row.profit >= 0 ? 'text-success' : 'text-destructive'}`}>
                        {formatCurrency(row.profit, language)}
                      </td>
                      <td className="p-3"></td>
                    </tr>
                  ))}

                  {/* Divider */}
                  {historicalData.length > 0 && forecastRows.length > 0 && (
                    <tr>
                      <td colSpan={6} className="p-0">
                        <div className="border-t-2 border-dashed border-primary/30 my-0" />
                      </td>
                    </tr>
                  )}

                  {/* Forecast Rows */}
                  {forecastRows.map((row, idx) => (
                    <tr key={`f-${idx}`} className="border-t border-border hover:bg-secondary/10 group">
                      <td className="p-3 font-medium text-foreground">{row.name}</td>
                      <td className="p-3">
                        <div className="flex items-center gap-1">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-primary/10 text-primary">
                            {t('forecast')}
                          </span>
                          {(row.isManualRevenue || row.isManualCost) && (
                            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-warning/10 text-warning">
                              <Pencil className="w-2.5 h-2.5" />
                              {t('manualAdjustment')}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="p-3 text-end">
                        <EditableCell
                          value={row.revenue}
                          isManual={row.isManualRevenue}
                          language={language}
                          onSave={(v) => handleOverride(row.month, 'revenue', v)}
                          onClear={() => clearOverride(row.month, 'revenue')}
                        />
                      </td>
                      <td className="p-3 text-end">
                        <EditableCell
                          value={row.cost}
                          isManual={row.isManualCost}
                          language={language}
                          onSave={(v) => handleOverride(row.month, 'cost', v)}
                          onClear={() => clearOverride(row.month, 'cost')}
                        />
                      </td>
                      <td className={`p-3 text-end font-medium ${row.profit >= 0 ? 'text-success' : 'text-destructive'}`}>
                        {formatCurrency(row.profit, language)}
                      </td>
                      <td className="p-3"></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* Config Modal */}
      <ForecastConfigModal
        open={showConfig}
        onOpenChange={setShowConfig}
        config={config}
        onApply={setConfig}
      />
    </div>
  );
};

// Inline editable cell for manual overrides
const EditableCell = ({
  value,
  isManual,
  language,
  onSave,
  onClear,
}: {
  value: number;
  isManual?: boolean;
  language: string;
  onSave: (v: number) => void;
  onClear: () => void;
}) => {
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState(value.toString());

  if (editing) {
    return (
      <Input
        type="number"
        value={editValue}
        onChange={(e) => setEditValue(e.target.value)}
        onBlur={() => {
          const parsed = parseFloat(editValue);
          if (!isNaN(parsed)) onSave(Math.round(parsed));
          setEditing(false);
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            const parsed = parseFloat(editValue);
            if (!isNaN(parsed)) onSave(Math.round(parsed));
            setEditing(false);
          }
          if (e.key === 'Escape') setEditing(false);
        }}
        className="h-6 text-xs w-28 text-end"
        autoFocus
      />
    );
  }

  return (
    <span
      className={`cursor-pointer hover:underline inline-flex items-center gap-1 font-medium ${
        isManual ? 'text-warning' : 'text-foreground'
      }`}
      onClick={() => {
        setEditValue(value.toString());
        setEditing(true);
      }}
      onDoubleClick={() => {
        if (isManual) onClear();
      }}
      title={isManual ? 'Double-click to reset to calculated value' : 'Click to edit'}
    >
      {formatCurrency(value, language)}
      {isManual && <Pencil className="w-2.5 h-2.5 text-warning" />}
    </span>
  );
};

export default ProductForecast;

import { useMemo, useState, useCallback } from 'react';
import { useApp } from '@/context/AppContext';
import { Feature } from '@/types';
import { formatCurrency, cn } from '@/lib/utils';
import { parseGrowthRate, parseNumber } from '@/lib/validation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  AreaChart,
  Area,
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
  Pencil,
  DollarSign,
  BarChart3,
  Zap,
  Target,
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

// Types
type ScenarioType = 'baseline' | 'optimistic' | 'conservative';
type HorizonMonths = 12 | 24 | 36;

interface ForecastAssumptions {
  revenueGrowthRate: number;
  costGrowthRate: number;
  resourceExpansion: number;
  manualRevenueAdj: number;
  manualCostAdj: number;
}

const SCENARIO_DEFAULTS: Record<ScenarioType, ForecastAssumptions> = {
  baseline: { revenueGrowthRate: 5, costGrowthRate: 2, resourceExpansion: 3, manualRevenueAdj: 0, manualCostAdj: 0 },
  optimistic: { revenueGrowthRate: 10, costGrowthRate: 1.5, resourceExpansion: 5, manualRevenueAdj: 0, manualCostAdj: 0 },
  conservative: { revenueGrowthRate: 2, costGrowthRate: 3, resourceExpansion: 1, manualRevenueAdj: 0, manualCostAdj: 0 },
};

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

interface FeatureForecastProps {
  feature: Feature;
  revenueEntries: Array<{ month: number; year: number; planned: number; actual: number }>;
  costEntries: Array<{ month: number; year: number; planned: number; actual: number; calculatedCost?: number }>;
}

const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const FeatureForecast = ({ feature, revenueEntries, costEntries }: FeatureForecastProps) => {
  const { state, t, language } = useApp();
  const [horizon, setHorizon] = useState<HorizonMonths>(12);
  const [scenario, setScenario] = useState<ScenarioType>('baseline');
  const [assumptions, setAssumptions] = useState<ForecastAssumptions>(SCENARIO_DEFAULTS['baseline']);
  const [showAssumptions, setShowAssumptions] = useState(false);
  const [showTable, setShowTable] = useState(false);
  const [manualOverrides, setManualOverrides] = useState<Record<string, { revenue?: number; cost?: number }>>({});

  // Build historical data from entries
  const historicalData = useMemo(() => {
    const monthMap: Record<string, { revenue: number; cost: number }> = {};

    revenueEntries.forEach(e => {
      const key = `${e.year}-${String(e.month + 1).padStart(2, '0')}`;
      if (!monthMap[key]) monthMap[key] = { revenue: 0, cost: 0 };
      monthMap[key].revenue += e.actual > 0 ? e.actual : e.planned;
    });

    costEntries.forEach(e => {
      const key = `${e.year}-${String(e.month + 1).padStart(2, '0')}`;
      if (!monthMap[key]) monthMap[key] = { revenue: 0, cost: 0 };
      monthMap[key].cost += e.actual > 0 ? e.actual : (e.calculatedCost || e.planned);
    });

    // Also pull from global state
    const featureRevActual = state.revenueActual.filter(r => r.featureId === feature.id);
    featureRevActual.forEach(r => {
      const key = r.month;
      if (!monthMap[key]) monthMap[key] = { revenue: 0, cost: 0 };
      monthMap[key].revenue += r.actual;
    });

    const featureRevPlan = state.revenuePlan.filter(r => r.featureId === feature.id);
    featureRevPlan.forEach(r => {
      const key = r.month;
      if (!monthMap[key]) monthMap[key] = { revenue: 0, cost: 0 };
      if (monthMap[key].revenue === 0) monthMap[key].revenue += r.expected;
    });

    const months = Object.keys(monthMap).sort();
    return months.map(key => {
      const [y, m] = key.split('-');
      return {
        name: `${MONTHS_SHORT[parseInt(m) - 1]} ${y.slice(2)}`,
        month: key,
        revenue: monthMap[key].revenue,
        cost: monthMap[key].cost,
        profit: monthMap[key].revenue - monthMap[key].cost,
        isHistorical: true,
      };
    });
  }, [revenueEntries, costEntries, state, feature.id]);

  // Generate forecast rows
  const forecastRows = useMemo((): ForecastRow[] => {
    const lastHistorical = historicalData[historicalData.length - 1];
    if (!lastHistorical) {
      // No historical data: use base values
      const baseRevenue = 10000;
      const baseCost = 6000;
      const rows: ForecastRow[] = [];
      const now = new Date();
      let projRev = baseRevenue;
      let projCost = baseCost;

      for (let i = 0; i < horizon; i++) {
        const forecastDate = new Date(now.getFullYear(), now.getMonth() + i + 1, 1);
        const monthKey = `${forecastDate.getFullYear()}-${String(forecastDate.getMonth() + 1).padStart(2, '0')}`;
        projRev *= (1 + assumptions.revenueGrowthRate / 100);
        projCost *= (1 + assumptions.costGrowthRate / 100);
        const adjRev = projRev + assumptions.manualRevenueAdj;
        const adjCost = projCost + assumptions.manualCostAdj;
        const override = manualOverrides[monthKey];
        const finalRev = override?.revenue ?? Math.round(adjRev);
        const finalCost = override?.cost ?? Math.round(adjCost);
        rows.push({
          name: `${MONTHS_SHORT[forecastDate.getMonth()]} ${String(forecastDate.getFullYear()).slice(2)}`,
          month: monthKey,
          revenue: finalRev,
          cost: finalCost,
          profit: finalRev - finalCost,
          isHistorical: false,
          isManualRevenue: override?.revenue !== undefined,
          isManualCost: override?.cost !== undefined,
        });
        if (override?.revenue !== undefined) projRev = override.revenue;
        if (override?.cost !== undefined) projCost = override.cost;
      }
      return rows;
    }

    const [y, m] = lastHistorical.month.split('-').map(Number);
    let projRevenue = lastHistorical.revenue;
    let projCost = lastHistorical.cost;
    const rows: ForecastRow[] = [];

    for (let i = 1; i <= horizon; i++) {
      const forecastDate = new Date(y, m - 1 + i, 1);
      const monthKey = `${forecastDate.getFullYear()}-${String(forecastDate.getMonth() + 1).padStart(2, '0')}`;

      projRevenue *= (1 + assumptions.revenueGrowthRate / 100);
      projCost *= (1 + assumptions.costGrowthRate / 100);

      const adjRev = projRevenue + assumptions.manualRevenueAdj;
      const adjCost = projCost + assumptions.manualCostAdj;

      const override = manualOverrides[monthKey];
      const finalRev = override?.revenue ?? Math.round(adjRev);
      const finalCost = override?.cost ?? Math.round(adjCost);

      rows.push({
        name: `${MONTHS_SHORT[forecastDate.getMonth()]} ${String(forecastDate.getFullYear()).slice(2)}`,
        month: monthKey,
        revenue: finalRev,
        cost: finalCost,
        profit: finalRev - finalCost,
        isHistorical: false,
        isManualRevenue: override?.revenue !== undefined,
        isManualCost: override?.cost !== undefined,
      });

      if (override?.revenue !== undefined) projRevenue = override.revenue;
      if (override?.cost !== undefined) projCost = override.cost;
    }

    return rows;
  }, [historicalData, horizon, assumptions, manualOverrides]);

  // Chart data
  const chartData = useMemo(() => {
    const historical = historicalData.map(d => ({
      ...d,
      actualRevenue: d.revenue,
      actualCost: d.cost,
      actualProfit: d.profit,
      forecastRevenue: undefined as number | undefined,
      forecastCost: undefined as number | undefined,
      forecastProfit: undefined as number | undefined,
    }));

    const bridge = historicalData[historicalData.length - 1];
    const forecast = forecastRows.map((d, idx) => ({
      name: d.name,
      month: d.month,
      actualRevenue: idx === 0 && bridge ? bridge.revenue : undefined as number | undefined,
      actualCost: idx === 0 && bridge ? bridge.cost : undefined as number | undefined,
      actualProfit: idx === 0 && bridge ? bridge.profit : undefined as number | undefined,
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

    let cumProfit = 0;
    let breakEven: string | null = null;
    for (const row of forecastRows) {
      cumProfit += row.profit;
      if (cumProfit > 0 && !breakEven) breakEven = row.name;
    }

    const alerts: string[] = [];
    if (margin < 0) alerts.push(t('projectedMargin') + ' < 0%');

    return { totalRevenue, totalCost, totalProfit, margin, breakEven, alerts };
  }, [forecastRows, t]);

  // Revenue pipeline
  const revenuePipeline = useMemo(() => {
    const product = state.products.find(p => p.id === feature.productId);
    const features = state.features.filter(f => f.productId === feature.productId && f.status !== 'Delivered');
    return features.map(f => {
      const expectedRevenue = state.revenuePlan.filter(r => r.featureId === f.id).reduce((s, r) => s + r.expected, 0);
      return {
        product: product?.name || '',
        feature: f.name,
        launchDate: f.endDate,
        estimatedRevenue: expectedRevenue,
      };
    });
  }, [state, feature.productId]);

  const handleOverride = useCallback((monthKey: string, field: 'revenue' | 'cost', value: number) => {
    setManualOverrides(prev => ({ ...prev, [monthKey]: { ...prev[monthKey], [field]: value } }));
  }, []);

  const clearOverride = useCallback((monthKey: string, field: 'revenue' | 'cost') => {
    setManualOverrides(prev => {
      const updated = { ...prev };
      if (updated[monthKey]) {
        const { [field]: _, ...rest } = updated[monthKey];
        if (Object.keys(rest).length === 0) delete updated[monthKey];
        else updated[monthKey] = rest;
      }
      return updated;
    });
  }, []);

  const handleScenarioChange = (s: ScenarioType) => {
    setScenario(s);
    setAssumptions({ ...SCENARIO_DEFAULTS[s] });
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="bg-card border border-border rounded-lg shadow-lg p-3 text-xs space-y-1 max-w-xs">
        <p className="font-semibold text-foreground">{label}</p>
        {payload.filter((e: any) => e.value != null).map((entry: any) => (
          <div key={entry.dataKey} className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full" style={{ background: entry.color }} />
            <span className="text-muted-foreground">{entry.name}:</span>
            <span className="font-semibold text-foreground">{formatCurrency(entry.value, language)}</span>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header with controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h3 className="text-base sm:text-lg font-semibold text-foreground flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-primary" />
            {t('forecast')} — {feature.name}
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            {t(scenario as any)} · {horizon} {t('months')} · {assumptions.revenueGrowthRate}% {t('revenue')} / {assumptions.costGrowthRate}% {t('cost')}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Scenario Quick Switch */}
          <div className="flex bg-secondary rounded-lg p-1">
            {(['baseline', 'optimistic', 'conservative'] as ScenarioType[]).map(s => (
              <button
                key={s}
                onClick={() => handleScenarioChange(s)}
                className={`px-2.5 py-1.5 rounded-md text-[11px] font-medium transition-colors ${
                  scenario === s ? 'bg-card text-primary shadow-sm' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {t(s as any)}
              </button>
            ))}
          </div>
          {/* Horizon select */}
          <Select value={String(horizon)} onValueChange={v => setHorizon(Number(v) as HorizonMonths)}>
            <SelectTrigger className="w-28 h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="12">12 {t('months')}</SelectItem>
              <SelectItem value="24">24 {t('months')}</SelectItem>
              <SelectItem value="36">36 {t('months')}</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={() => setShowAssumptions(true)} className="gap-1.5">
            <Settings2 className="w-3.5 h-3.5" />
            {t('forecastAssumptions')}
          </Button>
        </div>
      </div>

      {/* Forecast Assumptions Dialog */}
      <Dialog open={showAssumptions} onOpenChange={setShowAssumptions}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{t('forecastAssumptions')}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">{t('revenueGrowthRate')}</Label>
              <div className="relative">
                <Input type="number" step="0.5" min={-100} max={100} value={assumptions.revenueGrowthRate} className="pe-8 h-9 text-sm"
                  onChange={e => setAssumptions({ ...assumptions, revenueGrowthRate: parseGrowthRate(e.target.value) })} />
                <span className="absolute end-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">%</span>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">{t('costGrowthRate')}</Label>
              <div className="relative">
                <Input type="number" step="0.5" min={-100} max={100} value={assumptions.costGrowthRate} className="pe-8 h-9 text-sm"
                  onChange={e => setAssumptions({ ...assumptions, costGrowthRate: parseGrowthRate(e.target.value) })} />
                <span className="absolute end-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">%</span>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">{t('resourceExpansion')}</Label>
              <div className="relative">
                <Input type="number" step="0.5" min={-100} max={100} value={assumptions.resourceExpansion} className="pe-8 h-9 text-sm"
                  onChange={e => setAssumptions({ ...assumptions, resourceExpansion: parseGrowthRate(e.target.value) })} />
                <span className="absolute end-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">%</span>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">{t('manualRevenueAdj')}</Label>
              <Input type="number" step="1" value={assumptions.manualRevenueAdj || ''} placeholder="0" className="h-9 text-sm"
                onChange={e => setAssumptions({ ...assumptions, manualRevenueAdj: parseNumber(e.target.value, { min: -1e10, max: 1e10 }) })} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">{t('manualCostAdj')}</Label>
              <Input type="number" step="1" value={assumptions.manualCostAdj || ''} placeholder="0" className="h-9 text-sm"
                onChange={e => setAssumptions({ ...assumptions, manualCostAdj: parseNumber(e.target.value, { min: -1e10, max: 1e10 }) })} />
            </div>
          </div>
          <DialogFooter>
            <Button size="sm" onClick={() => setShowAssumptions(false)}>
              {t('applyConfig')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-success/10 rounded-xl p-4">
          <div className="text-[11px] text-muted-foreground mb-1">{t('projectedRevenue')} ({horizon} {t('months')})</div>
          <div className="text-base font-bold text-success">{formatCurrency(summary.totalRevenue, language)}</div>
        </div>
        <div className="bg-destructive/10 rounded-xl p-4">
          <div className="text-[11px] text-muted-foreground mb-1">{t('projectedCost')} ({horizon} {t('months')})</div>
          <div className="text-base font-bold text-destructive">{formatCurrency(summary.totalCost, language)}</div>
        </div>
        <div className="bg-primary/10 rounded-xl p-4">
          <div className="text-[11px] text-muted-foreground mb-1">{t('projectedProfit')} ({horizon} {t('months')})</div>
          <div className={`text-base font-bold ${summary.totalProfit >= 0 ? 'text-success' : 'text-destructive'}`}>
            {formatCurrency(summary.totalProfit, language)}
          </div>
        </div>
        <div className="bg-accent/10 rounded-xl p-4">
          <div className="text-[11px] text-muted-foreground mb-1">{t('projectedMargin')}</div>
          <div className="text-base font-bold text-primary">{summary.margin.toFixed(1)}%</div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {/* Revenue Forecast */}
        <div className="bg-card rounded-xl shadow-[var(--shadow-card)] p-5">
          <h4 className="text-sm font-semibold text-foreground mb-3">{t('revenueForecast')}</h4>
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} tickFormatter={v => `${(v/1000).toFixed(0)}k`} />
                <Tooltip content={<CustomTooltip />} />
                <Line type="monotone" dataKey="actualRevenue" stroke="hsl(var(--revenue))" strokeWidth={2} dot={false} name={`${t('actual')} ${t('revenue')}`} connectNulls={false} />
                <Line type="monotone" dataKey="forecastRevenue" stroke="hsl(var(--revenue))" strokeWidth={2} strokeDasharray="6 3" strokeOpacity={0.7} dot={false} name={`${t('forecast')} ${t('revenue')}`} connectNulls={false} />
                <Legend iconType="circle" iconSize={6} wrapperStyle={{ fontSize: 9, paddingTop: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Cost Forecast */}
        <div className="bg-card rounded-xl shadow-[var(--shadow-card)] p-5">
          <h4 className="text-sm font-semibold text-foreground mb-3">{t('costForecast')}</h4>
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} tickFormatter={v => `${(v/1000).toFixed(0)}k`} />
                <Tooltip content={<CustomTooltip />} />
                <Line type="monotone" dataKey="actualCost" stroke="hsl(var(--cost))" strokeWidth={2} dot={false} name={`${t('actual')} ${t('cost')}`} connectNulls={false} />
                <Line type="monotone" dataKey="forecastCost" stroke="hsl(var(--cost))" strokeWidth={2} strokeDasharray="6 3" strokeOpacity={0.7} dot={false} name={`${t('forecast')} ${t('cost')}`} connectNulls={false} />
                <Legend iconType="circle" iconSize={6} wrapperStyle={{ fontSize: 9, paddingTop: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Profit Projection */}
        <div className="bg-card rounded-xl shadow-[var(--shadow-card)] p-5">
          <h4 className="text-sm font-semibold text-foreground mb-3">{t('profitProjection')}</h4>
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} tickFormatter={v => `${(v/1000).toFixed(0)}k`} />
                <Tooltip content={<CustomTooltip />} />
                <ReferenceLine y={0} stroke="hsl(var(--border))" strokeDasharray="3 3" />
                <Line type="monotone" dataKey="actualProfit" stroke="hsl(var(--profit))" strokeWidth={2} dot={false} name={`${t('actual')} ${t('netProfit')}`} connectNulls={false} />
                <Line type="monotone" dataKey="forecastProfit" stroke="hsl(var(--profit))" strokeWidth={2} strokeDasharray="6 3" strokeOpacity={0.7} dot={false} name={`${t('forecast')} ${t('netProfit')}`} connectNulls={false} />
                <Legend iconType="circle" iconSize={6} wrapperStyle={{ fontSize: 9, paddingTop: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Editable Forecast Table */}
      <Collapsible open={showTable} onOpenChange={setShowTable}>
        <CollapsibleTrigger asChild>
          <Button variant="outline" className="w-full justify-between gap-2">
            <span className="text-sm font-medium">{t('forecastDetails')}</span>
            {showTable ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="bg-card rounded-xl shadow-[var(--shadow-card)] overflow-hidden mt-3">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-secondary/50">
                    <th className="text-start p-3 font-medium text-muted-foreground">{t('month')}</th>
                    <th className="text-start p-3 font-medium text-muted-foreground">{t('type')}</th>
                    <th className="text-end p-3 font-medium text-muted-foreground">{t('forecastRevenue')}</th>
                    <th className="text-end p-3 font-medium text-muted-foreground">{t('forecastCost')}</th>
                    <th className="text-end p-3 font-medium text-muted-foreground">{t('forecastProfit')}</th>
                  </tr>
                </thead>
                <tbody>
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
                    </tr>
                  ))}

                  {historicalData.length > 0 && forecastRows.length > 0 && (
                    <tr>
                      <td colSpan={5} className="p-0">
                        <div className="border-t-2 border-dashed border-primary/30" />
                      </td>
                    </tr>
                  )}

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
                        <EditableCell value={row.revenue} isManual={row.isManualRevenue} language={language}
                          onSave={v => handleOverride(row.month, 'revenue', v)} onClear={() => clearOverride(row.month, 'revenue')} />
                      </td>
                      <td className="p-3 text-end">
                        <EditableCell value={row.cost} isManual={row.isManualCost} language={language}
                          onSave={v => handleOverride(row.month, 'cost', v)} onClear={() => clearOverride(row.month, 'cost')} />
                      </td>
                      <td className={`p-3 text-end font-medium ${row.profit >= 0 ? 'text-success' : 'text-destructive'}`}>
                        {formatCurrency(row.profit, language)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* Revenue Pipeline */}
      {revenuePipeline.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-foreground mb-3">{t('revenuePipeline')}</h4>
          <div className="bg-card rounded-xl shadow-[var(--shadow-card)] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-secondary/50">
                    <th className="text-start p-3 font-medium text-muted-foreground">{t('product')}</th>
                    <th className="text-start p-3 font-medium text-muted-foreground">{t('feature')}</th>
                    <th className="text-start p-3 font-medium text-muted-foreground">{t('expectedLaunch')}</th>
                    <th className="text-end p-3 font-medium text-muted-foreground">{t('estimatedRevenueImpact')}</th>
                  </tr>
                </thead>
                <tbody>
                  {revenuePipeline.map((item, idx) => (
                    <tr key={idx} className="border-t border-border hover:bg-secondary/10">
                      <td className="p-3 text-foreground font-medium">{item.product}</td>
                      <td className="p-3 text-foreground">{item.feature}</td>
                      <td className="p-3 text-muted-foreground">{item.launchDate}</td>
                      <td className="p-3 text-end font-semibold text-success">{formatCurrency(item.estimatedRevenue, language)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Inline editable cell
const EditableCell = ({
  value, isManual, language, onSave, onClear,
}: {
  value: number; isManual?: boolean; language: string; onSave: (v: number) => void; onClear: () => void;
}) => {
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState(value.toString());

  if (editing) {
    return (
      <Input type="number" value={editValue} onChange={e => setEditValue(e.target.value)}
        onBlur={() => { const p = parseFloat(editValue); if (!isNaN(p)) onSave(Math.round(p)); setEditing(false); }}
        onKeyDown={e => {
          if (e.key === 'Enter') { const p = parseFloat(editValue); if (!isNaN(p)) onSave(Math.round(p)); setEditing(false); }
          if (e.key === 'Escape') setEditing(false);
        }}
        className="h-6 text-xs w-28 text-end" autoFocus />
    );
  }

  return (
    <span
      className={`cursor-pointer hover:underline inline-flex items-center gap-1 font-medium ${isManual ? 'text-warning' : 'text-foreground'}`}
      onClick={() => { setEditValue(value.toString()); setEditing(true); }}
      onDoubleClick={() => { if (isManual) onClear(); }}
      title={isManual ? 'Double-click to reset' : 'Click to edit'}
    >
      {formatCurrency(value, language)}
      {isManual && <Pencil className="w-2.5 h-2.5 text-warning" />}
    </span>
  );
};

export default FeatureForecast;

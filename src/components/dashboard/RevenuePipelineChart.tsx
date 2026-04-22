import { useMemo } from 'react';
import { useApp } from '@/context/AppContext';
import { formatCurrency } from '@/lib/utils';
import { ScenarioType, ScenarioConfig, projectMonth } from '@/lib/forecastEngine';
import { PipelineHorizon } from '@/pages/Dashboard';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { addMonths, format } from 'date-fns';
import AccessibleFigure from '@/components/a11y/AccessibleFigure';

const PORTFOLIO_COLORS = [
  '#111827',  // Licensing — Black
  '#1E3A8A',  // Track and Trace — Dark Blue
  '#6B7280',  // Practitioner Services — Grey
  '#D1D5DB',  // Insurance Services — Light Grey
];

interface Props {
  scenario: ScenarioType;
  horizon: PipelineHorizon;
  config: ScenarioConfig;
}

const RevenuePipelineChart = ({ scenario, horizon, config }: Props) => {
  const { state, t, language } = useApp();

  const { chartData, portfolioNames } = useMemo(() => {
    const now = new Date(2024, 3, 1);
    const futureMonths = Array.from({ length: horizon }, (_, i) => addMonths(now, i));
    const portfolioNames = state.portfolios.map(p => p.name);

    const productPortfolio: Record<number, string> = {};
    state.products.forEach(p => {
      const port = state.portfolios.find(pf => pf.id === p.portfolioId);
      if (port) productPortfolio[p.id] = port.name;
    });

    const featureProduct: Record<number, number> = {};
    state.features.forEach(f => { featureProduct[f.id] = f.productId; });

    const chartData = futureMonths.map((month, monthIdx) => {
      const monthKey = format(month, 'yyyy-MM');
      const label = format(month, 'MMM yy');
      const row: Record<string, any> = { name: label };
      const baseByPortfolio: Record<string, number> = {};

      portfolioNames.forEach(pn => { row[pn] = 0; });

      state.revenuePlan.forEach(r => {
        if (r.month === monthKey) {
          const productId = featureProduct[r.featureId];
          const portfolioName = productPortfolio[productId];
          if (portfolioName) {
            baseByPortfolio[portfolioName] = (baseByPortfolio[portfolioName] || 0) + r.expected;
          }
        }
      });

      const hasData = portfolioNames.some(pn => (baseByPortfolio[pn] || 0) > 0);
      if (!hasData) {
        const baseRevenues: Record<string, number> = {
          'Licensing': 45000,
          'Track and Trace': 25000,
          'Practitioner Services': 18000,
          'Insurance Services': 22000,
        };
        portfolioNames.forEach(pn => {
          baseByPortfolio[pn] = baseRevenues[pn] || 15000;
        });
      }

      // Apply scenario projection per portfolio so totals & tooltip stay consistent.
      let totalBase = 0, totalAdjusted = 0, totalConverted = 0;
      let appliedGrowthPct = 0, appliedConversionPct = 0;
      portfolioNames.forEach(pn => {
        const base = baseByPortfolio[pn] || 0;
        const proj = projectMonth(base, monthIdx, config, month.getMonth());
        row[pn] = Math.round(proj.converted);
        row[`__base_${pn}`] = base;
        row[`__adjusted_${pn}`] = proj.adjusted;
        totalBase += base;
        totalAdjusted += proj.adjusted;
        totalConverted += proj.converted;
        appliedGrowthPct = proj.appliedGrowthPct;
        appliedConversionPct = proj.appliedConversionPct;
      });
      row.__totalBase = totalBase;
      row.__totalAdjusted = totalAdjusted;
      row.__totalConverted = totalConverted;
      row.__appliedGrowthPct = appliedGrowthPct;
      row.__appliedConversionPct = appliedConversionPct;

      return row;
    });

    return { chartData, portfolioNames };
  }, [state, scenario, horizon, config]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    const row = payload[0].payload || {};
    const total = payload.reduce((s: number, p: any) => s + p.value, 0);
    return (
      <div className="bg-card border border-border rounded-xl shadow-[var(--shadow-lg)] p-3.5 text-xs space-y-1.5 min-w-[240px]">
        <div className="flex items-center justify-between">
          <p className="font-semibold text-foreground text-sm">{label}</p>
          <span className="text-[10px] uppercase tracking-wide text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
            {t(scenario)}
          </span>
        </div>
        {payload.map((entry: any) => (
          <div key={entry.dataKey} className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full" style={{ background: entry.color }} />
            <span className="text-muted-foreground">{entry.name}:</span>
            <span className="font-semibold text-foreground">{formatCurrency(entry.value, language)}</span>
          </div>
        ))}
        <div className="border-t border-border pt-1.5 mt-1 space-y-1">
          <div className="flex justify-between">
            <span className="font-bold text-foreground">{t('total')}</span>
            <span className="font-bold text-foreground">{formatCurrency(total, language)}</span>
          </div>
          {row.__totalBase !== undefined && (
            <>
              <div className="flex justify-between text-muted-foreground">
                <span>{t('base')}</span>
                <span>{formatCurrency(Math.round(row.__totalBase), language)}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>{t('adjusted')}</span>
                <span>{formatCurrency(Math.round(row.__totalAdjusted), language)}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>{t('appliedGrowth')}</span>
                <span>{row.__appliedGrowthPct.toFixed(1)}%</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>{t('appliedConversion')}</span>
                <span>{row.__appliedConversionPct.toFixed(0)}%</span>
              </div>
            </>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="bg-card rounded-xl shadow-[var(--shadow-card)] p-6">
      <AccessibleFigure
        title={`${t('revenue')} ${t('pipeline') ?? ''} — ${t(scenario)}`}
        summary={`${chartData.length} ${t('months')}, ${portfolioNames.length} ${t('portfolios')}`}
        tableHeaders={[t('month'), ...portfolioNames, t('total')]}
        tableRows={chartData.map(row => {
          const total = portfolioNames.reduce((s, n) => s + (Number(row[n]) || 0), 0);
          return [
            String(row.name),
            ...portfolioNames.map(n => formatCurrency(Number(row[n]) || 0, language)),
            formatCurrency(total, language),
          ];
        })}
        className="h-80"
      >
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
            <XAxis
              dataKey="name"
              tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
              axisLine={false}
              tickLine={false}
              dy={8}
            />
            <YAxis
              tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
              dx={-4}
            />
            <Tooltip content={<CustomTooltip />} />
            {portfolioNames.map((name, idx) => (
              <Bar
                key={name}
                dataKey={name}
                stackId="pipeline"
                fill={PORTFOLIO_COLORS[idx % PORTFOLIO_COLORS.length]}
                radius={idx === portfolioNames.length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]}
              />
            ))}
            <Legend iconType="circle" iconSize={10} wrapperStyle={{ fontSize: 12, paddingTop: 12 }} />
          </BarChart>
        </ResponsiveContainer>
      </AccessibleFigure>
    </div>
  );
};

export default RevenuePipelineChart;

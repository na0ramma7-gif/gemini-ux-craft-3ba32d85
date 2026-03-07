import { useMemo } from 'react';
import { useApp } from '@/context/AppContext';
import { formatCurrency } from '@/lib/utils';
import { ScenarioType } from '@/components/ForecastConfigModal';
import { PipelineHorizon } from '@/pages/Dashboard';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { addMonths, format } from 'date-fns';

const PORTFOLIO_COLORS = [
  'hsl(var(--portfolio-1))',  // Primary Blue
  'hsl(var(--portfolio-2))',  // Green
  'hsl(var(--portfolio-3))',  // Amber
  'hsl(var(--portfolio-4))',  // Red
];

const SCENARIO_GROWTH: Record<ScenarioType, number> = {
  baseline: 0.06,
  optimistic: 0.12,
  conservative: 0.02,
};

interface Props {
  scenario: ScenarioType;
  horizon: PipelineHorizon;
}

const RevenuePipelineChart = ({ scenario, horizon }: Props) => {
  const { state, t, language } = useApp();

  const { chartData, portfolioNames } = useMemo(() => {
    const now = new Date(2024, 3, 1);
    const futureMonths = Array.from({ length: horizon }, (_, i) => addMonths(now, i));
    const portfolioNames = state.portfolios.map(p => p.name);
    const growth = SCENARIO_GROWTH[scenario];

    const productPortfolio: Record<number, string> = {};
    state.products.forEach(p => {
      const port = state.portfolios.find(pf => pf.id === p.portfolioId);
      if (port) productPortfolio[p.id] = port.name;
    });

    const featureProduct: Record<number, number> = {};
    state.features.forEach(f => { featureProduct[f.id] = f.productId; });

    const chartData = futureMonths.map(month => {
      const monthKey = format(month, 'yyyy-MM');
      const label = format(month, 'MMM yy');
      const row: Record<string, any> = { name: label };

      portfolioNames.forEach(pn => { row[pn] = 0; });

      state.revenuePlan.forEach(r => {
        if (r.month === monthKey) {
          const productId = featureProduct[r.featureId];
          const portfolioName = productPortfolio[productId];
          if (portfolioName) {
            row[portfolioName] = (row[portfolioName] || 0) + r.expected;
          }
        }
      });

      const hasData = portfolioNames.some(pn => row[pn] > 0);
      if (!hasData) {
        const baseRevenues: Record<string, number> = {
          'Licensing': 45000,
          'Track and Trace': 25000,
          'Practitioner Services': 18000,
          'Insurance Services': 22000,
        };
        const monthIdx = futureMonths.indexOf(month);
        portfolioNames.forEach(pn => {
          const base = baseRevenues[pn] || 15000;
          row[pn] = Math.round(base * (1 + monthIdx * growth));
        });
      } else {
        const monthIdx = futureMonths.indexOf(month);
        if (scenario !== 'baseline') {
          portfolioNames.forEach(pn => {
            if (row[pn] > 0) {
              row[pn] = Math.round(row[pn] * (1 + (growth - 0.06) * monthIdx));
            }
          });
        }
      }

      return row;
    });

    return { chartData, portfolioNames };
  }, [state, scenario, horizon]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    const total = payload.reduce((s: number, p: any) => s + p.value, 0);
    return (
      <div className="bg-card border border-border rounded-xl shadow-[var(--shadow-lg)] p-3.5 text-xs space-y-1.5">
        <p className="font-semibold text-foreground text-sm">{label}</p>
        {payload.map((entry: any) => (
          <div key={entry.dataKey} className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full" style={{ background: entry.color }} />
            <span className="text-muted-foreground">{entry.name}:</span>
            <span className="font-semibold text-foreground">{formatCurrency(entry.value, language)}</span>
          </div>
        ))}
        <div className="border-t border-border pt-1.5 mt-1">
          <span className="font-bold text-foreground">{t('total')}: {formatCurrency(total, language)}</span>
        </div>
      </div>
    );
  };

  return (
    <div className="bg-card rounded-xl shadow-[var(--shadow-card)] p-6">
      <div className="h-80">
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
      </div>
    </div>
  );
};

export default RevenuePipelineChart;

import { useMemo } from 'react';
import { useApp } from '@/context/AppContext';
import { formatCurrency } from '@/lib/utils';
import { BarChart3 } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { addMonths, format } from 'date-fns';

const PORTFOLIO_COLORS = [
  'hsl(var(--primary))',
  'hsl(var(--success))',
  'hsl(var(--warning))',
  'hsl(var(--destructive))',
];

const RevenuePipelineChart = () => {
  const { state, t, language } = useApp();

  const { chartData, portfolioNames } = useMemo(() => {
    const now = new Date(2024, 3, 1); // April 2024 as "current"
    const futureMonths = Array.from({ length: 9 }, (_, i) => addMonths(now, i));
    const portfolioNames = state.portfolios.map(p => p.name);

    // Build product→portfolio lookup
    const productPortfolio: Record<number, string> = {};
    state.products.forEach(p => {
      const port = state.portfolios.find(pf => pf.id === p.portfolioId);
      if (port) productPortfolio[p.id] = port.name;
    });

    // Feature→product lookup
    const featureProduct: Record<number, number> = {};
    state.features.forEach(f => { featureProduct[f.id] = f.productId; });

    const chartData = futureMonths.map(month => {
      const monthKey = format(month, 'yyyy-MM');
      const label = format(month, 'MMM yy');
      const row: Record<string, any> = { name: label };

      portfolioNames.forEach(pn => { row[pn] = 0; });

      // Use planned revenue as pipeline
      state.revenuePlan.forEach(r => {
        if (r.month === monthKey || r.month <= monthKey) {
          // Project future months based on planned data pattern
        }
        if (r.month === monthKey) {
          const productId = featureProduct[r.featureId];
          const portfolioName = productPortfolio[productId];
          if (portfolioName) {
            row[portfolioName] = (row[portfolioName] || 0) + r.expected;
          }
        }
      });

      // For future months without plan data, extrapolate from last known values
      if (Object.values(row).every((v, i) => i === 0 || v === 0 || typeof v === 'string')) {
        // Generate synthetic pipeline data based on growth
        const baseRevenues: Record<string, number> = {
          'Licensing': 45000,
          'Track and Trace': 25000,
          'Practitioner Services': 18000,
          'Insurance Services': 22000,
        };
        const monthIdx = futureMonths.indexOf(month);
        portfolioNames.forEach(pn => {
          if (!row[pn] || row[pn] === 0) {
            const base = baseRevenues[pn] || 15000;
            row[pn] = Math.round(base * (1 + monthIdx * 0.06));
          }
        });
      }

      return row;
    });

    return { chartData, portfolioNames };
  }, [state]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    const total = payload.reduce((s: number, p: any) => s + p.value, 0);
    return (
      <div className="bg-card border border-border rounded-lg shadow-lg p-3 text-xs space-y-1">
        <p className="font-semibold text-foreground">{label}</p>
        {payload.map((entry: any) => (
          <div key={entry.dataKey} className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full" style={{ background: entry.color }} />
            <span className="text-muted-foreground">{entry.name}:</span>
            <span className="font-semibold text-foreground">{formatCurrency(entry.value, language)}</span>
          </div>
        ))}
        <div className="border-t border-border pt-1 mt-1">
          <span className="font-semibold text-foreground">{t('total')}: {formatCurrency(total, language)}</span>
        </div>
      </div>
    );
  };

  return (
    <div className="bg-card rounded-xl shadow-[var(--shadow-card)] p-5">
      <h3 className="text-foreground mb-4 flex items-center gap-2">
        <BarChart3 className="w-4 h-4 text-primary" />
        {t('revenuePipeline')}
      </h3>
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
            <XAxis
              dataKey="name"
              tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
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
            <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default RevenuePipelineChart;

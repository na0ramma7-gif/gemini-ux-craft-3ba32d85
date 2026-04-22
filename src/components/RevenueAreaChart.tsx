import { useMemo } from 'react';
import { useApp } from '@/context/AppContext';
import { formatCurrency } from '@/lib/utils';
import { TrendingUp } from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { format, eachMonthOfInterval } from 'date-fns';
import AccessibleFigure from '@/components/a11y/AccessibleFigure';

const RevenueAreaChart = () => {
  const { state, dateFilter, t, language } = useApp();

  const chartData = useMemo(() => {
    const { startDate, endDate } = dateFilter;
    const months = eachMonthOfInterval({ start: startDate, end: endDate });

    return months.map(month => {
      const monthKey = format(month, 'yyyy-MM');
      const label = format(month, 'MMM');

      let planned = 0;
      let actual = 0;

      state.revenuePlan.forEach(r => {
        if (r.month === monthKey) planned += r.expected;
      });

      state.revenueActual.forEach(r => {
        if (r.month === monthKey) actual += r.actual;
      });

      // Target = sum of feature Target Revenue (no multiplier).
      // Feature level is the single source of truth.
      return { name: label, planned, actual, target: Math.round(planned) };
    });
  }, [state, dateFilter]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="bg-card border border-border rounded-lg shadow-lg p-3 text-xs space-y-1">
        <p className="font-semibold text-foreground">{label}</p>
        {payload.map((entry: any) => (
          <div key={entry.dataKey} className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full" style={{ background: entry.color }} />
            <span className="text-muted-foreground capitalize">{entry.dataKey}:</span>
            <span className="font-semibold text-foreground">
              {formatCurrency(entry.value, language)}
            </span>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="bg-card rounded-xl shadow-card p-5">
      <h3 className="text-foreground mb-4 flex items-center gap-2">
        <TrendingUp className="w-4 h-4 text-primary" />
        {t('revenueCostTrend')}
      </h3>
      <AccessibleFigure
        title={t('revenueCostTrend')}
        summary={`${chartData.length} ${t('months')}`}
        tableHeaders={[t('month'), t('targetYear'), t('totalRevenue'), t('actual')]}
        tableRows={chartData.map(r => [
          r.name,
          formatCurrency(r.target, language),
          formatCurrency(r.planned, language),
          formatCurrency(r.actual, language),
        ])}
        className="h-64"
      >
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="gradTarget" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="hsl(var(--target))" stopOpacity={0.3} />
                <stop offset="100%" stopColor="hsl(var(--target))" stopOpacity={0.02} />
              </linearGradient>
              <linearGradient id="gradPlanned" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="hsl(var(--accent))" stopOpacity={0.4} />
                <stop offset="100%" stopColor="hsl(var(--accent))" stopOpacity={0.05} />
              </linearGradient>
              <linearGradient id="gradActual" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="hsl(var(--revenue))" stopOpacity={0.4} />
                <stop offset="100%" stopColor="hsl(var(--revenue))" stopOpacity={0.05} />
              </linearGradient>
            </defs>
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
            <Area
              type="monotone"
              dataKey="target"
              stroke="hsl(var(--target))"
              strokeWidth={2}
              fill="url(#gradTarget)"
              dot={false}
              name={t('targetYear')}
            />
            <Area
              type="monotone"
              dataKey="planned"
              stroke="hsl(var(--accent))"
              strokeWidth={2}
              fill="url(#gradPlanned)"
              dot={false}
              name={t('totalRevenue')}
            />
            <Area
              type="monotone"
              dataKey="actual"
              stroke="hsl(var(--revenue))"
              strokeWidth={2.5}
              fill="url(#gradActual)"
              dot={{ r: 3, fill: 'hsl(var(--revenue))', strokeWidth: 0 }}
              activeDot={{ r: 5, strokeWidth: 2, stroke: 'white' }}
              name={t('actual')}
            />
            <Legend
              iconType="circle"
              iconSize={8}
              wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </AccessibleFigure>
    </div>
  );
};

export default RevenueAreaChart;

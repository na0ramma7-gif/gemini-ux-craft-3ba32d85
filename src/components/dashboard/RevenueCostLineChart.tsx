import { useMemo } from 'react';
import { useApp } from '@/context/AppContext';
import { formatCurrency } from '@/lib/utils';
import { TrendingUp } from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { format, eachMonthOfInterval } from 'date-fns';

const RevenueCostLineChart = () => {
  const { state, dateFilter, t, language } = useApp();

  const chartData = useMemo(() => {
    const { startDate, endDate } = dateFilter;
    const months = eachMonthOfInterval({ start: startDate, end: endDate });

    return months.map(month => {
      const monthKey = format(month, 'yyyy-MM');
      const label = format(month, 'MMM');

      let revenue = 0;
      let cost = 0;

      state.revenueActual.forEach(r => {
        if (r.month === monthKey) revenue += r.actual;
      });

      // Spread costs evenly across months
      state.costs.forEach(c => {
        if (c.type === 'CAPEX' && c.total && c.amortization) {
          cost += c.total / c.amortization;
        } else if (c.monthly) {
          cost += c.monthly;
        }
      });

      const profit = revenue - cost;
      return { name: label, revenue, cost, profit };
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
            <span className="text-muted-foreground capitalize">{entry.name}:</span>
            <span className="font-semibold text-foreground">{formatCurrency(entry.value, language)}</span>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="bg-card rounded-xl shadow-[var(--shadow-card)] p-5">
      <h3 className="text-foreground mb-4 flex items-center gap-2">
        <TrendingUp className="w-4 h-4 text-primary" />
        {t('revenueCostTrend')}
      </h3>
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
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
            <Line
              type="monotone"
              dataKey="revenue"
              stroke="hsl(var(--success))"
              strokeWidth={2.5}
              dot={{ r: 4, fill: 'hsl(var(--success))', strokeWidth: 0 }}
              activeDot={{ r: 6, strokeWidth: 2, stroke: 'white' }}
              name={t('revenue')}
            />
            <Line
              type="monotone"
              dataKey="cost"
              stroke="hsl(var(--destructive))"
              strokeWidth={2.5}
              dot={{ r: 4, fill: 'hsl(var(--destructive))', strokeWidth: 0 }}
              activeDot={{ r: 6, strokeWidth: 2, stroke: 'white' }}
              name={t('cost')}
            />
            <Line
              type="monotone"
              dataKey="profit"
              stroke="hsl(var(--profit))"
              strokeWidth={2}
              strokeDasharray="5 5"
              dot={{ r: 3, fill: 'hsl(var(--profit))', strokeWidth: 0 }}
              name={t('netProfit')}
            />
            <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default RevenueCostLineChart;

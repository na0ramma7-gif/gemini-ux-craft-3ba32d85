import { useMemo } from 'react';
import { useApp } from '@/context/AppContext';
import { formatCurrency, monthlyCostForRow } from '@/lib/utils';
import { TrendingUp } from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { format, eachMonthOfInterval } from 'date-fns';
import CompareLegend from '@/components/compare/CompareLegend';
import AccessibleFigure from '@/components/a11y/AccessibleFigure';

const RevenueCostLineChart = () => {
  const { state, dateFilter, t, language } = useApp();

  const chartData = useMemo(() => {
    const buildSeries = (start: Date, end: Date) => {
      const months = eachMonthOfInterval({ start, end });
      return months.map(month => {
        const monthKey = format(month, 'yyyy-MM');
        let revenue = 0;
        let planned = 0;
        let cost = 0;
        state.revenueActual.forEach(r => {
          if (r.month === monthKey) revenue += r.actual;
        });
        state.revenuePlan.forEach(r => {
          if (r.month === monthKey) planned += r.expected;
        });
        state.costs.forEach(c => {
          const monthly = monthlyCostForRow(c);
          if (monthly === 0) return;
          const cs = c.startDate ? c.startDate.slice(0, 7) : null;
          const ce = c.endDate ? c.endDate.slice(0, 7) : null;
          if (cs && monthKey < cs) return;
          if (ce && monthKey > ce) return;
          cost += monthly;
        });
        return { monthKey, label: format(month, 'MMM'), revenue, planned, cost, profit: revenue - cost };
      });
    };

    const primary = buildSeries(dateFilter.startDate, dateFilter.endDate);
    const compare = dateFilter.compareEnabled
      ? buildSeries(dateFilter.compareStartDate, dateFilter.compareEndDate)
      : null;

    // Align by month index. Longer window defines the X axis.
    const length = compare ? Math.max(primary.length, compare.length) : primary.length;
    const out: Array<Record<string, any>> = [];
    for (let i = 0; i < length; i++) {
      const p = primary[i];
      const c = compare?.[i];
      out.push({
        name: p?.label ?? c?.label ?? '',
        revenue: p?.revenue ?? null,
        planned: p?.planned ?? null,
        cost: p?.cost ?? null,
        profit: p?.profit ?? null,
        revenueCmp: c?.revenue ?? null,
        costCmp: c?.cost ?? null,
        cmpLabel: c?.label ?? null,
      });
    }
    return out;
  }, [state, dateFilter]);

  const compareEnabled = dateFilter.compareEnabled;

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    const row = payload[0]?.payload ?? {};
    const cmpLabel = row.cmpLabel;
    const actual = typeof row.revenue === 'number' ? row.revenue : null;
    const planned = typeof row.planned === 'number' ? row.planned : null;
    const diff = actual != null && planned != null ? actual - planned : null;
    const achievement = actual != null && planned && planned > 0 ? (actual / planned) * 100 : null;
    return (
      <div className="bg-card border border-border rounded-xl shadow-[var(--shadow-lg)] p-3.5 text-xs space-y-1.5">
        <p className="font-semibold text-foreground text-sm">{label}</p>
        {payload
          .filter((entry: any) => entry.value !== null && entry.value !== undefined)
          .map((entry: any) => (
          <div key={entry.dataKey} className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full" style={{ background: entry.color }} />
            <span className="text-muted-foreground">{entry.name}:</span>
            <span className="font-semibold text-foreground">{formatCurrency(entry.value, language)}</span>
          </div>
        ))}
        {(diff != null || achievement != null) && (
          <div className="pt-1.5 mt-1 border-t border-border space-y-1">
            {diff != null && (
              <div className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground">Δ {t('actual')} − {t('planned')}:</span>
                <span className={`font-semibold ${diff >= 0 ? 'text-success' : 'text-destructive'}`}>
                  {diff >= 0 ? '+' : '−'}{formatCurrency(Math.abs(diff), language)}
                </span>
              </div>
            )}
            {achievement != null && (
              <div className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground">{t('achievement')}:</span>
                <span className={`font-semibold ${achievement >= 100 ? 'text-success' : 'text-warning'}`}>
                  {achievement.toFixed(1)}%
                </span>
              </div>
            )}
          </div>
        )}
        {compareEnabled && cmpLabel && (
          <p className="text-[10px] text-muted-foreground pt-1 border-t border-border">
            {t('comparison')}: {cmpLabel}
          </p>
        )}
      </div>
    );
  };

  return (
    <div className="bg-card rounded-xl shadow-[var(--shadow-card)] p-6">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-5">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-primary" />
          <h3 className="text-foreground">{t('revenueCostTrend')}</h3>
        </div>
        {compareEnabled && <CompareLegend />}
      </div>
      <AccessibleFigure
        title={t('revenueCostTrend')}
        summary={`${chartData.length} ${t('months')}${compareEnabled ? ` · ${t('comparison')}` : ''}`}
        tableHeaders={[t('month'), t('revenue'), t('plannedRevenue'), t('cost'), t('netProfit')]}
        tableRows={chartData.map(r => [
          String(r.name),
          r.revenue != null ? formatCurrency(r.revenue, language) : '—',
          r.planned != null ? formatCurrency(r.planned, language) : '—',
          r.cost != null ? formatCurrency(r.cost, language) : '—',
          r.profit != null ? formatCurrency(r.profit, language) : '—',
        ])}
        className="h-80"
      >
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
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
            <Line
              type="monotone"
              dataKey="revenue"
              stroke="hsl(var(--revenue))"
              strokeWidth={2.5}
              dot={{ r: 4, fill: 'hsl(var(--revenue))', strokeWidth: 0 }}
              activeDot={{ r: 7, strokeWidth: 2, stroke: 'white' }}
              name={t('revenue')}
              connectNulls
            />
            <Line
              type="monotone"
              dataKey="planned"
              stroke="hsl(var(--target))"
              strokeWidth={2}
              strokeDasharray="6 4"
              dot={{ r: 3, fill: 'hsl(var(--target))', strokeWidth: 0 }}
              activeDot={{ r: 6, strokeWidth: 2, stroke: 'white' }}
              name={t('plannedRevenue')}
              connectNulls
            />
            <Line
              type="monotone"
              dataKey="cost"
              stroke="hsl(var(--cost))"
              strokeWidth={2.5}
              dot={{ r: 4, fill: 'hsl(var(--cost))', strokeWidth: 0 }}
              activeDot={{ r: 7, strokeWidth: 2, stroke: 'white' }}
              name={t('cost')}
              connectNulls
            />
            <Line
              type="monotone"
              dataKey="profit"
              stroke="hsl(var(--profit))"
              strokeWidth={2}
              strokeDasharray="6 4"
              dot={{ r: 3, fill: 'hsl(var(--profit))', strokeWidth: 0 }}
              name={t('netProfit')}
              connectNulls
            />
            {compareEnabled && (
              <>
                <Line
                  type="monotone"
                  dataKey="revenueCmp"
                  stroke="hsl(var(--revenue))"
                  strokeWidth={1.5}
                  strokeDasharray="4 4"
                  strokeOpacity={0.7}
                  dot={false}
                  name={`${t('revenue')} (${t('comparison')})`}
                  connectNulls
                />
                <Line
                  type="monotone"
                  dataKey="costCmp"
                  stroke="hsl(var(--cost))"
                  strokeWidth={1.5}
                  strokeDasharray="4 4"
                  strokeOpacity={0.7}
                  dot={false}
                  name={`${t('cost')} (${t('comparison')})`}
                  connectNulls
                />
              </>
            )}
            <Legend
              iconType="circle"
              iconSize={10}
              wrapperStyle={{ fontSize: 12, paddingTop: 12 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </AccessibleFigure>
    </div>
  );
};

export default RevenueCostLineChart;

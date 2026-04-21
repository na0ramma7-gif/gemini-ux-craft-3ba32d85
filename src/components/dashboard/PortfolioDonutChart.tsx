import { useMemo } from 'react';
import { useApp } from '@/context/AppContext';
import { formatCurrency } from '@/lib/utils';
import { useHierarchicalMetrics } from '@/hooks/useHierarchicalMetrics';
import { PieChart as PieChartIcon } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';

const PORTFOLIO_COLORS = [
  '#111827',  // Black
  '#1E3A8A',  // Dark Blue
  '#6B7280',  // Grey
  '#D1D5DB',  // Light Grey
  '#374151',  // Fallback — Dark Grey
];

const PortfolioDonutChart = () => {
  const { state, t, language, dateFilter } = useApp();
  const dept = useHierarchicalMetrics(state, dateFilter);

  // Use shared hook so donut totals match the dashboard KPI total.
  const data = useMemo(() => {
    return dept.portfolioMetrics
      .map(pm => ({ name: pm.portfolioName, value: pm.revenue, id: pm.portfolioId }))
      .filter(d => d.value > 0);
  }, [dept]);

  const total = data.reduce((s, d) => s + d.value, 0);

  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload?.length) return null;
    const d = payload[0];
    const pct = total > 0 ? ((d.value / total) * 100).toFixed(1) : '0';
    return (
      <div className="bg-card border border-border rounded-xl shadow-[var(--shadow-lg)] p-3.5 text-xs space-y-1">
        <p className="font-semibold text-foreground text-sm">{d.name}</p>
        <p className="text-muted-foreground">{formatCurrency(d.value, language)} ({pct}%)</p>
      </div>
    );
  };

  return (
    <div className="bg-card rounded-xl shadow-[var(--shadow-card)] p-6">
      <div className="flex items-center gap-2 mb-5">
        <PieChartIcon className="w-5 h-5 text-primary" />
        <h3 className="text-foreground">{t('portfolioDistribution')}</h3>
      </div>
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="45%"
              innerRadius={65}
              outerRadius={100}
              paddingAngle={3}
              dataKey="value"
              stroke="none"
              label={({ cx, cy, midAngle, outerRadius, index }) => {
                const RADIAN = Math.PI / 180;
                const radius = outerRadius + 18;
                const x = cx + radius * Math.cos(-midAngle * RADIAN);
                const y = cy + radius * Math.sin(-midAngle * RADIAN);
                const pct = total > 0 ? Math.round((data[index].value / total) * 100) : 0;
                return (
                  <text x={x} y={y} textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central" className="fill-foreground text-[11px] font-semibold">
                    {pct}%
                  </text>
                );
              }}
              labelLine={false}
            >
              {data.map((_, idx) => (
                <Cell key={idx} fill={PORTFOLIO_COLORS[idx % PORTFOLIO_COLORS.length]} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
            <Legend
              iconType="circle"
              iconSize={10}
              wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
              formatter={(value: string, entry: any) => {
                const pct = total > 0 ? ((entry.payload.value / total) * 100).toFixed(0) : '0';
                return <span className="text-muted-foreground">{value} ({pct}%)</span>;
              }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default PortfolioDonutChart;

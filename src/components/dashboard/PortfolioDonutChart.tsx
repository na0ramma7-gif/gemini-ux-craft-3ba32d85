import { useMemo } from 'react';
import { useApp } from '@/context/AppContext';
import { formatCurrency } from '@/lib/utils';
import { PieChart as PieChartIcon } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';

const COLORS = [
  'hsl(234, 55%, 30%)',
  'hsl(142, 71%, 45%)',
  'hsl(45, 93%, 47%)',
  'hsl(0, 84%, 60%)',
  'hsl(222, 100%, 59%)',
];

const PortfolioDonutChart = () => {
  const { state, t, language } = useApp();

  const data = useMemo(() => {
    return state.portfolios.map(p => {
      const products = state.products.filter(pr => pr.portfolioId === p.id);
      let actual = 0;
      products.forEach(pr => {
        const features = state.features.filter(f => f.productId === pr.id);
        features.forEach(f => {
          state.revenueActual.filter(r => r.featureId === f.id).forEach(r => {
            actual += r.actual;
          });
        });
      });
      return { name: p.name, value: actual, id: p.id };
    }).filter(d => d.value > 0);
  }, [state]);

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

  const renderCustomLabel = ({ cx, cy }: any) => (
    <text x={cx} y={cy} textAnchor="middle" dominantBaseline="middle">
      <tspan x={cx} dy="-8" className="text-lg font-bold" fill="hsl(var(--foreground))">{formatCurrency(total, language)}</tspan>
      <tspan x={cx} dy="20" className="text-xs" fill="hsl(var(--muted-foreground))">{t('totalRevenue')}</tspan>
    </text>
  );

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
              cy="50%"
              innerRadius={65}
              outerRadius={100}
              paddingAngle={3}
              dataKey="value"
              stroke="none"
              label={false}
            >
              {data.map((_, idx) => (
                <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
              ))}
            </Pie>
            {/* Center label */}
            <Pie data={[{ value: 1 }]} cx="50%" cy="50%" innerRadius={0} outerRadius={0} dataKey="value">
              {renderCustomLabel({ cx: '50%', cy: '50%' })}
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

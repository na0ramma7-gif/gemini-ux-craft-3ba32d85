import { useMemo } from 'react';
import { useApp } from '@/context/AppContext';
import { formatCurrency } from '@/lib/utils';
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
      <div className="bg-card border border-border rounded-lg shadow-lg p-3 text-xs space-y-1">
        <p className="font-semibold text-foreground">{d.name}</p>
        <p className="text-muted-foreground">{formatCurrency(d.value, language)} ({pct}%)</p>
      </div>
    );
  };

  return (
    <div className="bg-card rounded-xl shadow-[var(--shadow-card)] p-5">
      <h3 className="text-foreground mb-4">{t('portfolioDistribution')}</h3>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={55}
              outerRadius={90}
              paddingAngle={3}
              dataKey="value"
              stroke="none"
            >
              {data.map((_, idx) => (
                <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
            <Legend
              iconType="circle"
              iconSize={8}
              wrapperStyle={{ fontSize: 11 }}
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

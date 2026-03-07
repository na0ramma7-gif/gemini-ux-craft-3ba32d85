import { useMemo } from 'react';
import { useApp } from '@/context/AppContext';
import { formatCurrency } from '@/lib/utils';
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ZAxis } from 'recharts';

const InvestmentReturnChart = () => {
  const { state, t, language } = useApp();

  const data = useMemo(() => {
    return state.products.map(product => {
      const features = state.features.filter(f => f.productId === product.id);
      let actual = 0;
      features.forEach(f => {
        state.revenueActual.filter(r => r.featureId === f.id).forEach(r => { actual += r.actual; });
      });

      let cost = 0;
      state.costs.filter(c => c.productId === product.id).forEach(c => {
        if (c.type === 'CAPEX' && c.total && c.amortization) {
          cost += (c.total / c.amortization) * 6;
        } else if (c.monthly) {
          cost += c.monthly * 6;
        }
      });

      const profit = Math.max(actual - cost, 1000);
      return { name: product.name, cost, revenue: actual, profit, z: profit };
    });
  }, [state]);

  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload?.length) return null;
    const d = payload[0].payload;
    return (
      <div className="bg-card border border-border rounded-lg shadow-lg p-3 text-xs space-y-1">
        <p className="font-semibold text-foreground">{d.name}</p>
        <p className="text-destructive">{t('cost')}: {formatCurrency(d.cost, language)}</p>
        <p className="text-success">{t('revenue')}: {formatCurrency(d.revenue, language)}</p>
        <p className="text-profit">{t('netProfit')}: {formatCurrency(d.revenue - d.cost, language)}</p>
      </div>
    );
  };

  return (
    <div className="bg-card rounded-xl shadow-[var(--shadow-card)] p-5">
      <h3 className="text-foreground mb-1">{t('cost')} vs {t('revenue')}</h3>
      <p className="text-xs text-muted-foreground mb-4">Bubble size = profit</p>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis
              dataKey="cost"
              type="number"
              name="Cost"
              tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
              label={{ value: t('cost'), position: 'insideBottom', offset: -5, fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
            />
            <YAxis
              dataKey="revenue"
              type="number"
              name="Revenue"
              tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
              label={{ value: t('revenue'), angle: -90, position: 'insideLeft', fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
            />
            <ZAxis dataKey="z" range={[200, 2000]} />
            <Tooltip content={<CustomTooltip />} />
            <Scatter data={data} fill="hsl(var(--primary))" fillOpacity={0.7} />
          </ScatterChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default InvestmentReturnChart;

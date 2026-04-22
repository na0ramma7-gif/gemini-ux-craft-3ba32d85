import { useMemo } from 'react';
import { useApp } from '@/context/AppContext';
import { formatCurrency } from '@/lib/utils';
import { useHierarchicalMetrics } from '@/hooks/useHierarchicalMetrics';
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ZAxis } from 'recharts';
import AccessibleFigure from '@/components/a11y/AccessibleFigure';

const InvestmentReturnChart = () => {
  const { state, t, language, dateFilter } = useApp();
  const dept = useHierarchicalMetrics(state, dateFilter);

  const data = useMemo(() => {
    return dept.portfolioMetrics.flatMap(pm =>
      pm.productMetrics.map(p => ({
        name: p.productName,
        cost: p.cost,
        revenue: p.revenue,
        profit: Math.max(p.profit, 1000),
        z: Math.max(p.profit, 1000),
      })),
    );
  }, [dept]);

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
      <AccessibleFigure
        title={`${t('cost')} vs ${t('revenue')}`}
        summary={`${data.length} ${t('products')}`}
        tableHeaders={[t('name'), t('cost'), t('revenue'), t('netProfit')]}
        tableRows={data.map(d => [
          d.name,
          formatCurrency(d.cost, language),
          formatCurrency(d.revenue, language),
          formatCurrency(d.revenue - d.cost, language),
        ])}
        className="h-64"
      >
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

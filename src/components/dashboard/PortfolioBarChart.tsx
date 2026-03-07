import { useMemo } from 'react';
import { useApp } from '@/context/AppContext';
import { formatCurrency } from '@/lib/utils';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Cell } from 'recharts';
import { Portfolio } from '@/types';

interface Props {
  onPortfolioClick?: (portfolio: Portfolio) => void;
}

const PortfolioBarChart = ({ onPortfolioClick }: Props) => {
  const { state, t, language } = useApp();

  const data = useMemo(() => {
    return state.portfolios.map(p => {
      const products = state.products.filter(pr => pr.portfolioId === p.id);
      let actual = 0;
      let planned = 0;
      products.forEach(pr => {
        const features = state.features.filter(f => f.productId === pr.id);
        features.forEach(f => {
          state.revenueActual.filter(r => r.featureId === f.id).forEach(r => { actual += r.actual; });
          state.revenuePlan.filter(r => r.featureId === f.id).forEach(r => { planned += r.expected; });
        });
      });
      const target = planned * 1.35;
      const pct = target > 0 ? Math.round((actual / target) * 100) : 0;
      return { name: p.name, actual, target, pct, portfolio: p };
    });
  }, [state]);

  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload?.length) return null;
    const d = payload[0].payload;
    return (
      <div className="bg-card border border-border rounded-lg shadow-lg p-3 text-xs space-y-1">
        <p className="font-semibold text-foreground">{d.name}</p>
        <p className="text-success">{t('actual')}: {formatCurrency(d.actual, language)}</p>
        <p className="text-muted-foreground">{t('targetYear')} {formatCurrency(d.target, language)}</p>
        <p className="font-semibold text-foreground">{d.pct}%</p>
      </div>
    );
  };

  return (
    <div className="bg-card rounded-xl shadow-[var(--shadow-card)] p-5">
      <h3 className="text-foreground mb-4">{t('portfolios')} — {t('targetVsAchieved')}</h3>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ top: 5, right: 30, left: 10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
            <XAxis
              type="number"
              tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
            />
            <YAxis
              dataKey="name"
              type="category"
              width={120}
              tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip content={<CustomTooltip />} />
            <Bar
              dataKey="actual"
              radius={[0, 4, 4, 0]}
              barSize={20}
              cursor="pointer"
              onClick={(d: any) => onPortfolioClick?.(d.portfolio)}
            >
              {data.map((entry, idx) => (
                <Cell key={idx} fill={entry.pct >= 80 ? 'hsl(var(--success))' : entry.pct >= 50 ? 'hsl(var(--warning))' : 'hsl(var(--destructive))'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default PortfolioBarChart;

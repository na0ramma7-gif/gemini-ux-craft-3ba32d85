import { useMemo } from 'react';
import { useApp } from '@/context/AppContext';
import { formatCurrency } from '@/lib/utils';
import { BarChart3 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
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
      <div className="bg-card border border-border rounded-xl shadow-[var(--shadow-lg)] p-3.5 text-xs space-y-1.5">
        <p className="font-semibold text-foreground text-sm">{d.name}</p>
        <p className="text-success">{t('revenue')}: {formatCurrency(d.actual, language)}</p>
        <p className="text-muted-foreground">{t('targetYear')} {formatCurrency(d.target, language)}</p>
        <p className="font-semibold text-foreground">{t('achievementRate')}: {d.pct}%</p>
      </div>
    );
  };

  return (
    <div className="bg-card rounded-xl shadow-[var(--shadow-card)] p-6">
      <div className="flex items-center gap-2 mb-5">
        <BarChart3 className="w-5 h-5 text-primary" />
        <h3 className="text-foreground">{t('portfolios')} — {t('targetVsAchieved')}</h3>
      </div>
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ top: 5, right: 30, left: 10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
            <XAxis
              type="number"
              tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
            />
            <YAxis
              dataKey="name"
              type="category"
              width={130}
              tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip content={<CustomTooltip />} />
            <Bar
              dataKey="actual"
              radius={[0, 6, 6, 0]}
              barSize={24}
              cursor="pointer"
              onClick={(d: any) => onPortfolioClick?.(d.portfolio)}
            >
              {data.map((entry, idx) => (
                <Cell
                  key={idx}
                  fill={
                    entry.pct >= 80
                      ? 'hsl(var(--success))'
                      : entry.pct >= 50
                        ? 'hsl(var(--warning))'
                        : 'hsl(var(--destructive))'
                  }
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      {/* Legend */}
      <div className="flex items-center justify-center gap-5 mt-3 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full inline-block bg-success" /> ≥ 80%</span>
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full inline-block bg-warning" /> 50–79%</span>
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full inline-block bg-destructive" /> &lt; 50%</span>
      </div>
    </div>
  );
};

export default PortfolioBarChart;

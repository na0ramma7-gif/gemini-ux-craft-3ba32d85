import { useMemo } from 'react';
import { useApp } from '@/context/AppContext';
import { formatCurrency } from '@/lib/utils';
import { Package } from 'lucide-react';
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

const PRODUCT_COLORS = [
  { stroke: 'hsl(234, 55%, 30%)', fill: 'hsl(234, 55%, 30%)' },
  { stroke: 'hsl(221, 100%, 59%)', fill: 'hsl(221, 100%, 59%)' },
  { stroke: 'hsl(142, 71%, 45%)', fill: 'hsl(142, 71%, 45%)' },
  { stroke: 'hsl(38, 92%, 50%)', fill: 'hsl(38, 92%, 50%)' },
  { stroke: 'hsl(0, 84%, 60%)', fill: 'hsl(0, 84%, 60%)' },
  { stroke: 'hsl(270, 60%, 55%)', fill: 'hsl(270, 60%, 55%)' },
  { stroke: 'hsl(190, 80%, 45%)', fill: 'hsl(190, 80%, 45%)' },
  { stroke: 'hsl(330, 70%, 55%)', fill: 'hsl(330, 70%, 55%)' },
];

const ProductAreaChart = () => {
  const { state, dateFilter, t, language } = useApp();

  const { chartData, products } = useMemo(() => {
    const { startDate, endDate } = dateFilter;
    const months = eachMonthOfInterval({ start: startDate, end: endDate });

    const products = state.products.map(p => p);

    const chartData = months.map(month => {
      const monthKey = format(month, 'yyyy-MM');
      const label = format(month, 'MMM');
      const entry: Record<string, any> = { name: label };

      products.forEach(product => {
        const features = state.features.filter(f => f.productId === product.id);
        let actual = 0;
        features.forEach(f => {
          state.revenueActual.filter(r => r.featureId === f.id && r.month === monthKey).forEach(r => {
            actual += r.actual;
          });
        });
        entry[product.code] = actual;
      });

      return entry;
    });

    return { chartData, products };
  }, [state, dateFilter]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="bg-card border border-border rounded-lg shadow-lg p-3 text-xs space-y-1">
        <p className="font-semibold text-foreground">{label}</p>
        {payload.filter((e: any) => e.value > 0).map((entry: any) => (
          <div key={entry.dataKey} className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full" style={{ background: entry.color }} />
            <span className="text-muted-foreground">{entry.dataKey}:</span>
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
        <Package className="w-4 h-4 text-primary" />
        {t('products')} — {t('actual')}
      </h3>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <defs>
              {products.map((product, idx) => (
                <linearGradient key={product.id} id={`gradProduct${product.id}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={PRODUCT_COLORS[idx % PRODUCT_COLORS.length].fill} stopOpacity={0.3} />
                  <stop offset="100%" stopColor={PRODUCT_COLORS[idx % PRODUCT_COLORS.length].fill} stopOpacity={0.02} />
                </linearGradient>
              ))}
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
            {products.map((product, idx) => (
              <Area
                key={product.id}
                type="monotone"
                dataKey={product.code}
                stroke={PRODUCT_COLORS[idx % PRODUCT_COLORS.length].stroke}
                strokeWidth={2}
                fill={`url(#gradProduct${product.id})`}
                dot={false}
                stackId="1"
                name={product.code}
              />
            ))}
            <Legend
              iconType="circle"
              iconSize={8}
              wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default ProductAreaChart;

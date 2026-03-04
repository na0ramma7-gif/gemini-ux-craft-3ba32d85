import { useMemo, useState } from 'react';
import { useApp } from '@/context/AppContext';
import { Product } from '@/types';
import { formatCurrency } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  ReferenceLine,
} from 'recharts';
import { format, addMonths } from 'date-fns';
import { TrendingUp } from 'lucide-react';

interface ProductForecastProps {
  product: Product;
}

type HorizonMonths = 12 | 24 | 36;

const ProductForecast = ({ product }: ProductForecastProps) => {
  const { state, t, language } = useApp();
  const [horizon, setHorizon] = useState<HorizonMonths>(12);

  const forecastData = useMemo(() => {
    // Gather historical monthly data for this product
    const features = state.features.filter(f => f.productId === product.id);
    const featureIds = new Set(features.map(f => f.id));

    // Aggregate historical revenue by month
    const revenueByMonth: Record<string, number> = {};
    state.revenuePlan.filter(r => featureIds.has(r.featureId)).forEach(r => {
      revenueByMonth[r.month] = (revenueByMonth[r.month] || 0) + r.expected;
    });

    const actualByMonth: Record<string, number> = {};
    state.revenueActual.filter(r => featureIds.has(r.featureId)).forEach(r => {
      actualByMonth[r.month] = (actualByMonth[r.month] || 0) + r.actual;
    });

    // Aggregate historical cost by month
    const productCosts = state.costs.filter(c => c.productId === product.id);
    const costByMonth: Record<string, number> = {};
    const sortedMonths = Object.keys({ ...revenueByMonth, ...actualByMonth }).sort();

    sortedMonths.forEach(month => {
      let monthlyCost = 0;
      productCosts.forEach(c => {
        if (c.type === 'CAPEX' && c.total && c.amortization) {
          monthlyCost += c.total / c.amortization;
        } else if (c.monthly) {
          monthlyCost += c.monthly;
        }
      });
      costByMonth[month] = monthlyCost;
    });

    // Calculate growth rates from historical data
    const historicalRevenues = sortedMonths.map(m => revenueByMonth[m] || 0).filter(v => v > 0);
    const historicalActuals = sortedMonths.map(m => actualByMonth[m] || 0).filter(v => v > 0);

    let revenueGrowthRate = 0.05; // default 5% monthly growth
    if (historicalRevenues.length >= 2) {
      const rates: number[] = [];
      for (let i = 1; i < historicalRevenues.length; i++) {
        if (historicalRevenues[i - 1] > 0) {
          rates.push((historicalRevenues[i] - historicalRevenues[i - 1]) / historicalRevenues[i - 1]);
        }
      }
      if (rates.length > 0) {
        revenueGrowthRate = rates.reduce((a, b) => a + b, 0) / rates.length;
      }
    }

    let costGrowthRate = 0.02; // default 2% monthly cost growth

    // Build chart data: historical + forecast
    const lastHistoricalMonth = sortedMonths[sortedMonths.length - 1] || '2024-04';
    const lastDate = new Date(lastHistoricalMonth + '-01');
    const lastPlannedRevenue = revenueByMonth[lastHistoricalMonth] || historicalRevenues[historicalRevenues.length - 1] || 10000;
    const lastActualRevenue = actualByMonth[lastHistoricalMonth] || historicalActuals[historicalActuals.length - 1] || lastPlannedRevenue * 0.9;
    const lastCost = costByMonth[lastHistoricalMonth] || 25000;

    // Historical entries
    const data: Array<{
      name: string;
      month: string;
      revenue?: number;
      actual?: number;
      cost?: number;
      forecastRevenue?: number;
      forecastCost?: number;
      forecastProfit?: number;
      isHistorical: boolean;
    }> = [];

    sortedMonths.forEach(month => {
      const rev = revenueByMonth[month] || 0;
      const act = actualByMonth[month] || 0;
      const cst = costByMonth[month] || 0;
      data.push({
        name: format(new Date(month + '-01'), 'MMM yy'),
        month,
        revenue: rev,
        actual: act,
        cost: cst,
        isHistorical: true,
      });
    });

    // Forecast entries
    let projRevenue = lastPlannedRevenue;
    let projCost = lastCost;

    for (let i = 1; i <= horizon; i++) {
      const forecastDate = addMonths(lastDate, i);
      const monthKey = format(forecastDate, 'yyyy-MM');

      projRevenue = projRevenue * (1 + revenueGrowthRate);
      projCost = projCost * (1 + costGrowthRate);

      data.push({
        name: format(forecastDate, 'MMM yy'),
        month: monthKey,
        forecastRevenue: Math.round(projRevenue),
        forecastCost: Math.round(projCost),
        forecastProfit: Math.round(projRevenue - projCost),
        isHistorical: false,
      });
    }

    // Summary metrics
    const forecastEntries = data.filter(d => !d.isHistorical);
    const totalForecastRevenue = forecastEntries.reduce((sum, d) => sum + (d.forecastRevenue || 0), 0);
    const totalForecastCost = forecastEntries.reduce((sum, d) => sum + (d.forecastCost || 0), 0);
    const totalForecastProfit = totalForecastRevenue - totalForecastCost;

    return {
      data,
      summary: {
        totalForecastRevenue,
        totalForecastCost,
        totalForecastProfit,
        revenueGrowthRate: (revenueGrowthRate * 100).toFixed(1),
        costGrowthRate: (costGrowthRate * 100).toFixed(1),
        margin: totalForecastRevenue > 0 ? ((totalForecastProfit / totalForecastRevenue) * 100).toFixed(1) : '0',
      },
      dividerMonth: sortedMonths[sortedMonths.length - 1] || '',
    };
  }, [state, product.id, horizon]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="bg-card border border-border rounded-lg shadow-lg p-3 text-xs space-y-1">
        <p className="font-semibold text-foreground">{label}</p>
        {payload.map((entry: any) => (
          <div key={entry.dataKey} className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full" style={{ background: entry.color }} />
            <span className="text-muted-foreground">{entry.name}:</span>
            <span className="font-semibold text-foreground">
              {formatCurrency(entry.value, language)}
            </span>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Horizon Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h3 className="text-base sm:text-lg font-semibold text-foreground flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-primary" />
            {t('forecast')} — {product.name}
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            {t('forecastComingSoon').includes('Coming') 
              ? `Projections based on ${forecastData.summary.revenueGrowthRate}% monthly revenue growth rate`
              : `توقعات بناءً على معدل نمو شهري ${forecastData.summary.revenueGrowthRate}%`
            }
          </p>
        </div>
        <div className="flex bg-secondary rounded-lg p-1">
          {([12, 24, 36] as HorizonMonths[]).map(h => (
            <button
              key={h}
              onClick={() => setHorizon(h)}
              className={`px-3 py-1.5 rounded-md text-xs sm:text-sm font-medium transition-colors ${
                horizon === h ? 'bg-card text-primary shadow-sm' : 'text-muted-foreground'
              }`}
            >
              {h} {t('month') || 'mo'}
            </button>
          ))}
        </div>
      </div>

      {/* Summary KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-success/10 rounded-xl p-4 text-center">
          <div className="text-xs text-muted-foreground mb-1">{t('totalRevenue')} ({horizon}m)</div>
          <div className="text-lg font-bold text-success">
            {formatCurrency(forecastData.summary.totalForecastRevenue, language)}
          </div>
        </div>
        <div className="bg-destructive/10 rounded-xl p-4 text-center">
          <div className="text-xs text-muted-foreground mb-1">{t('totalCost')} ({horizon}m)</div>
          <div className="text-lg font-bold text-destructive">
            {formatCurrency(forecastData.summary.totalForecastCost, language)}
          </div>
        </div>
        <div className="bg-primary/10 rounded-xl p-4 text-center">
          <div className="text-xs text-muted-foreground mb-1">{t('netProfit')} ({horizon}m)</div>
          <div className={`text-lg font-bold ${forecastData.summary.totalForecastProfit >= 0 ? 'text-success' : 'text-destructive'}`}>
            {formatCurrency(forecastData.summary.totalForecastProfit, language)}
          </div>
        </div>
        <div className="bg-accent/10 rounded-xl p-4 text-center">
          <div className="text-xs text-muted-foreground mb-1">{t('margin')}</div>
          <div className="text-lg font-bold text-primary">
            {forecastData.summary.margin}%
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="bg-card rounded-xl shadow-card p-5">
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={forecastData.data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="gradHistRevenue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(142, 71%, 45%)" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="hsl(142, 71%, 45%)" stopOpacity={0.02} />
                </linearGradient>
                <linearGradient id="gradHistActual" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(221, 100%, 59%)" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="hsl(221, 100%, 59%)" stopOpacity={0.02} />
                </linearGradient>
                <linearGradient id="gradForecastRevenue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(142, 71%, 45%)" stopOpacity={0.2} />
                  <stop offset="100%" stopColor="hsl(142, 71%, 45%)" stopOpacity={0.02} />
                </linearGradient>
                <linearGradient id="gradForecastCost" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(0, 84%, 60%)" stopOpacity={0.2} />
                  <stop offset="100%" stopColor="hsl(0, 84%, 60%)" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                axisLine={false}
                tickLine={false}
                interval="preserveStartEnd"
              />
              <YAxis
                tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
              />
              <Tooltip content={<CustomTooltip />} />
              {/* Historical */}
              <Area type="monotone" dataKey="revenue" stroke="hsl(142, 71%, 45%)" strokeWidth={2} fill="url(#gradHistRevenue)" dot={false} name={t('plannedRevenue')} />
              <Area type="monotone" dataKey="actual" stroke="hsl(221, 100%, 59%)" strokeWidth={2} fill="url(#gradHistActual)" dot={false} name={t('actualRevenue')} />
              <Area type="monotone" dataKey="cost" stroke="hsl(0, 84%, 60%)" strokeWidth={1.5} fill="none" dot={false} name={t('totalCost')} strokeDasharray="4 2" />
              {/* Forecast */}
              <Area type="monotone" dataKey="forecastRevenue" stroke="hsl(142, 71%, 45%)" strokeWidth={2} strokeDasharray="6 3" fill="url(#gradForecastRevenue)" dot={false} name={`${t('forecast')} ${t('revenue')}`} />
              <Area type="monotone" dataKey="forecastCost" stroke="hsl(0, 84%, 60%)" strokeWidth={2} strokeDasharray="6 3" fill="url(#gradForecastCost)" dot={false} name={`${t('forecast')} ${t('cost')}`} />
              <Area type="monotone" dataKey="forecastProfit" stroke="hsl(234, 55%, 30%)" strokeWidth={2} strokeDasharray="6 3" fill="none" dot={false} name={`${t('forecast')} ${t('netProfit')}`} />
              <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 10, paddingTop: 8 }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Monthly Projection Table */}
      <div className="bg-card rounded-xl shadow-card overflow-hidden">
        <div className="p-4 border-b border-border">
          <h4 className="font-semibold text-foreground text-sm">{t('forecast')} — {t('month')}ly</h4>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-secondary/50">
                <th className="text-start p-3 font-medium text-muted-foreground">{t('month')}</th>
                <th className="text-end p-3 font-medium text-muted-foreground">{t('revenue')}</th>
                <th className="text-end p-3 font-medium text-muted-foreground">{t('cost')}</th>
                <th className="text-end p-3 font-medium text-muted-foreground">{t('netProfit')}</th>
              </tr>
            </thead>
            <tbody>
              {forecastData.data.filter(d => !d.isHistorical).map((row, idx) => (
                <tr key={idx} className="border-t border-border hover:bg-secondary/30">
                  <td className="p-3 font-medium text-foreground">{row.name}</td>
                  <td className="p-3 text-end text-success font-semibold">{formatCurrency(row.forecastRevenue || 0, language)}</td>
                  <td className="p-3 text-end text-destructive font-semibold">{formatCurrency(row.forecastCost || 0, language)}</td>
                  <td className={`p-3 text-end font-semibold ${(row.forecastProfit || 0) >= 0 ? 'text-primary' : 'text-destructive'}`}>
                    {formatCurrency(row.forecastProfit || 0, language)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ProductForecast;

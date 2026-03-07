import { useMemo } from 'react';
import { useApp } from '@/context/AppContext';
import { formatCurrency } from '@/lib/utils';
import { TrendingUp } from 'lucide-react';

const ForecastSummaryCards = () => {
  const { state, t, language } = useApp();

  const projections = useMemo(() => {
    // Calculate average monthly revenue from actuals
    const monthlyRevenues: Record<string, number> = {};
    state.revenueActual.forEach(r => {
      monthlyRevenues[r.month] = (monthlyRevenues[r.month] || 0) + r.actual;
    });
    const months = Object.keys(monthlyRevenues).sort();
    const avgMonthly = months.length > 0
      ? Object.values(monthlyRevenues).reduce((s, v) => s + v, 0) / months.length
      : 0;

    // Simple growth projection (8% monthly growth)
    const growthRate = 1.08;
    let rev3 = 0, rev6 = 0, rev12 = 0;
    let base = avgMonthly;
    for (let i = 1; i <= 12; i++) {
      base *= growthRate;
      if (i <= 3) rev3 += base;
      if (i <= 6) rev6 += base;
      rev12 += base;
    }

    return { rev3, rev6, rev12 };
  }, [state]);

  const cards = [
    { label: t('projected3Months'), value: projections.rev3 },
    { label: t('projected6Months'), value: projections.rev6 },
    { label: t('projected12Months'), value: projections.rev12 },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      {cards.map((card, idx) => (
        <div key={idx} className="bg-card rounded-xl shadow-[var(--shadow-card)] p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <TrendingUp className="w-5 h-5 text-primary" />
          </div>
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground truncate">{card.label}</p>
            <p className="text-lg font-bold text-foreground">{formatCurrency(card.value, language)}</p>
          </div>
        </div>
      ))}
    </div>
  );
};

export default ForecastSummaryCards;

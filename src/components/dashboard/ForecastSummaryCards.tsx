import { useMemo } from 'react';
import { useApp } from '@/context/AppContext';
import { formatCurrency } from '@/lib/utils';
import { ScenarioType, ScenarioConfig, projectSeries } from '@/lib/forecastEngine';
import { PipelineHorizon } from '@/pages/Dashboard';
import { TrendingUp, Calendar, Zap } from 'lucide-react';

interface Props {
  scenario: ScenarioType;
  horizon: PipelineHorizon;
  config: ScenarioConfig;
}

const ForecastSummaryCards = ({ scenario, horizon, config }: Props) => {
  const { state, t, language } = useApp();

  const projections = useMemo(() => {
    const monthlyRevenues: Record<string, number> = {};
    state.revenueActual.forEach(r => {
      monthlyRevenues[r.month] = (monthlyRevenues[r.month] || 0) + r.actual;
    });
    const months = Object.keys(monthlyRevenues).sort();
    const avgMonthly = months.length > 0
      ? Object.values(monthlyRevenues).reduce((s, v) => s + v, 0) / months.length
      : 0;

    const series = projectSeries(avgMonthly, horizon, config);
    const sumTo = (n: number) => series.slice(0, n).reduce((s, m) => s + m.converted, 0);
    return {
      rev3: sumTo(Math.min(3, horizon)),
      rev6: sumTo(Math.min(6, horizon)),
      revH: sumTo(horizon),
    };
  }, [state, scenario, horizon, config]);

  const cards = [
    { label: t('projected3Months'), value: projections.rev3, icon: TrendingUp, accent: 'bg-success/10 text-success' },
    { label: t('projected6Months'), value: projections.rev6, icon: Calendar, accent: 'bg-primary/10 text-primary' },
    { label: `${t('projectedRevenue')} (${horizon} ${t('months')})`, value: projections.revH, icon: Zap, accent: 'bg-accent/10 text-accent' },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      {cards.map((card, idx) => {
        const Icon = card.icon;
        return (
          <div key={idx} className="bg-card rounded-xl shadow-[var(--shadow-card)] p-5 flex items-center gap-4">
            <div className={`w-12 h-12 rounded-xl ${card.accent} flex items-center justify-center shrink-0`}>
              <Icon className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground truncate mb-1">{card.label}</p>
              <p className="text-xl font-bold text-foreground tracking-tight">{formatCurrency(card.value, language)}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default ForecastSummaryCards;

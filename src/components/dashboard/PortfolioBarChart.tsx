import { useMemo } from 'react';
import { useApp } from '@/context/AppContext';
import { useHierarchicalMetrics } from '@/hooks/useHierarchicalMetrics';
import { formatCurrency, cn } from '@/lib/utils';
import { BarChart3, Target, TrendingUp, DollarSign } from 'lucide-react';
import { Portfolio } from '@/types';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { computeWindowMetrics, computeDelta } from '@/lib/compare';
import DeltaChip from '@/components/compare/DeltaChip';
import CompareLegend from '@/components/compare/CompareLegend';

interface Props {
  onPortfolioClick?: (portfolio: Portfolio) => void;
}

const PortfolioBarChart = ({ onPortfolioClick }: Props) => {
  const { state, t, language, dateFilter, compareSelection } = useApp();
  const dept = useHierarchicalMetrics(state, dateFilter);
  const compareEnabled = dateFilter.compareEnabled;
  const portfolioFilter = compareSelection.portfolioIds;

  const data = useMemo(() => {
    const filterIds = portfolioFilter.length > 0 ? new Set(portfolioFilter) : null;
    const cmpWindow = compareEnabled
      ? { startDate: dateFilter.compareStartDate, endDate: dateFilter.compareEndDate }
      : null;
    return dept.portfolioMetrics
      .filter(pm => !filterIds || filterIds.has(pm.portfolioId))
      .map(pm => {
      const target = pm.target;
      const achieved = pm.revenue;
      const remaining = Math.max(0, target - achieved);
      const pct = pm.achievementPct;
      const portfolio = state.portfolios.find(p => p.id === pm.portfolioId)!;

      // Compute comparison revenue for this single portfolio if Compare is ON.
      let cmpAchieved = 0;
      let delta = null as ReturnType<typeof computeDelta> | null;
      if (cmpWindow) {
        const m = computeWindowMetrics(state, cmpWindow, {
          portfolioIds: [pm.portfolioId],
          productIds: [],
          featureIds: [],
        });
        cmpAchieved = m.revenue;
        delta = computeDelta(achieved, cmpAchieved);
      }
      return { name: pm.portfolioName, target, achieved, remaining, pct, portfolio, cmpAchieved, delta };
    }).sort((a, b) => b.target - a.target);
  }, [dept, state, portfolioFilter, compareEnabled, dateFilter.compareStartDate, dateFilter.compareEndDate]);

  const totals = useMemo(() => {
    const totalTarget = data.reduce((s, d) => s + d.target, 0);
    const totalAchieved = data.reduce((s, d) => s + d.achieved, 0);
    const overallPct = totalTarget > 0 ? Math.round((totalAchieved / totalTarget) * 100) : 0;
    return { totalTarget, totalAchieved, overallPct };
  }, [data]);

  const getColor = (pct: number) => {
    if (pct >= 80) return { bar: 'bg-success', text: 'text-success', bg: 'bg-success/10' };
    if (pct >= 50) return { bar: 'bg-warning', text: 'text-warning', bg: 'bg-warning/10' };
    return { bar: 'bg-destructive', text: 'text-destructive', bg: 'bg-destructive/10' };
  };

  const maxTarget = Math.max(...data.map(d => d.target), 1);

  return (
    <div className="bg-card rounded-xl shadow-[var(--shadow-card)] p-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-primary" />
          <h3 className="text-foreground font-semibold">{t('portfolios')} — {t('targetVsAchieved')}</h3>
        </div>
        {compareEnabled && <CompareLegend />}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="bg-secondary/50 rounded-lg p-3 text-center">
          <div className="flex items-center justify-center gap-1.5 mb-1">
            <Target className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium">{t('totalTarget')}</span>
          </div>
          <div className="text-sm font-bold text-foreground">{formatCurrency(totals.totalTarget, language)}</div>
        </div>
        <div className="bg-secondary/50 rounded-lg p-3 text-center">
          <div className="flex items-center justify-center gap-1.5 mb-1">
            <DollarSign className="w-3.5 h-3.5 text-success" />
            <span className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium">{t('totalAchieved')}</span>
          </div>
          <div className="text-sm font-bold text-success">{formatCurrency(totals.totalAchieved, language)}</div>
        </div>
        <div className="bg-secondary/50 rounded-lg p-3 text-center">
          <div className="flex items-center justify-center gap-1.5 mb-1">
            <TrendingUp className="w-3.5 h-3.5 text-primary" />
            <span className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium">{t('overallAchievement')}</span>
          </div>
          <div className={cn("text-sm font-bold", getColor(totals.overallPct).text)}>{totals.overallPct}%</div>
        </div>
      </div>

      {/* Portfolio Bars */}
      <div className="space-y-4">
        {data.map((d) => {
          const color = getColor(d.pct);
          const barWidthPct = maxTarget > 0 ? (d.target / maxTarget) * 100 : 0;
          const filledPct = Math.min(d.pct, 100);

          return (
            <Tooltip key={d.name}>
              <TooltipTrigger asChild>
                <div
                  className="cursor-pointer group"
                  onClick={() => onPortfolioClick?.(d.portfolio)}
                >
                  {/* Portfolio name + percentage */}
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">{d.name}</span>
                    <span className="text-sm font-bold text-foreground">{d.pct}%</span>
                  </div>

                  {/* Progress bar */}
                  <div className="relative" style={{ width: `${Math.max(barWidthPct, 30)}%` }}>
                    <div className="h-7 rounded-md bg-secondary/60 overflow-hidden relative">
                      <div
                        className={cn("h-full rounded-md transition-all duration-500", color.bar)}
                        style={{ width: `${filledPct}%` }}
                      />
                    </div>
                  </div>

                  {/* Values row */}
                  <div className="flex items-center gap-4 mt-1 text-[11px] text-muted-foreground">
                    <span>{t('achieved')}: <span className="font-semibold text-foreground">{formatCurrency(d.achieved, language)}</span></span>
                    <span>{t('targetYear')}: <span className="font-medium">{formatCurrency(d.target, language)}</span></span>
                    <span>{t('remaining')}: <span className="font-medium text-foreground">{formatCurrency(d.remaining, language)}</span></span>
                  </div>
                </div>
              </TooltipTrigger>
              <TooltipContent side="right" className="p-3.5 space-y-1.5 text-xs max-w-xs">
                <p className="font-semibold text-sm">{d.name}</p>
                <div className="space-y-1 pt-1 border-t border-border">
                  <p>{t('targetYear')}: <span className="font-semibold">{formatCurrency(d.target, language)}</span></p>
                  <p className="text-success">{t('achieved')}: <span className="font-semibold">{formatCurrency(d.achieved, language)}</span></p>
                  <p>{t('remaining')}: <span className="font-semibold">{formatCurrency(d.remaining, language)}</span></p>
                  <p className={cn("font-semibold", color.text)}>{t('achievementRate')}: {d.pct}%</p>
                </div>
              </TooltipContent>
            </Tooltip>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-5 mt-5 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full inline-block bg-success" /> ≥ 80%</span>
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full inline-block bg-warning" /> 50–79%</span>
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full inline-block bg-destructive" /> &lt; 50%</span>
      </div>
    </div>
  );
};

export default PortfolioBarChart;

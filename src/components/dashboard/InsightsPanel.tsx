import { useMemo } from 'react';
import { useApp } from '@/context/AppContext';
import { formatCurrency } from '@/lib/utils';
import { useHierarchicalMetrics } from '@/hooks/useHierarchicalMetrics';
import { Lightbulb, TrendingUp, TrendingDown, AlertTriangle } from 'lucide-react';

const InsightsPanel = () => {
  const { state, t, language, dateFilter } = useApp();
  const dept = useHierarchicalMetrics(state, dateFilter);

  const insights = useMemo(() => {
    const results: { text: string; icon: 'up' | 'down' | 'alert'; }[] = [];

    // Portfolio revenue contributions — use the shared hook.
    const totalRevenue = dept.revenue;
    const topPortfolio = [...dept.portfolioMetrics].sort((a, b) => b.revenue - a.revenue)[0];
    if (topPortfolio && totalRevenue > 0) {
      const pct = ((topPortfolio.revenue / totalRevenue) * 100).toFixed(0);
      results.push({ text: `${topPortfolio.portfolioName} ${t('contributes')} ${pct}% ${t('ofDepartmentRevenue')}`, icon: 'up' });
    }

    const highMargin = [...dept.portfolioMetrics].sort((a, b) => b.margin - a.margin)[0];
    if (highMargin) {
      results.push({ text: `${highMargin.portfolioName} ${t('highestProfitMargin')} (${highMargin.margin.toFixed(0)}%)`, icon: 'up' });
    }

    // Products with low achievement — use shared hook.
    const productMetrics = dept.portfolioMetrics.flatMap(pm =>
      pm.productMetrics.map(p => ({ name: p.productName, pct: p.achievementPct })),
    );

    const weakProducts = productMetrics.filter(p => p.pct < 50);
    if (weakProducts.length > 0) {
      results.push({ text: `${weakProducts.length} ${t('belowTargetAchievement')}`, icon: 'alert' });
    }

    // Active features count
    const inProgress = state.features.filter(f => f.status === 'In Progress').length;
    results.push({ text: `${inProgress} ${t('featuresInProgressCount')}`, icon: 'up' });

    // Top performing product
    const topProduct = [...productMetrics].sort((a, b) => b.pct - a.pct)[0];
    if (topProduct) {
      results.push({ text: `${topProduct.name} ${t('leadsWithAchievement')} ${topProduct.pct.toFixed(0)}% ${t('targetAchievement')}`, icon: 'up' });
    }

    return results;
  }, [state, dept, t]);

  const Icon = ({ type }: { type: string }) => {
    if (type === 'up') return <TrendingUp className="w-4 h-4 text-success shrink-0" />;
    if (type === 'down') return <TrendingDown className="w-4 h-4 text-destructive shrink-0" />;
    return <AlertTriangle className="w-4 h-4 text-warning shrink-0" />;
  };

  return (
    <div className="bg-card rounded-xl shadow-[var(--shadow-card)] p-5">
      <h3 className="text-foreground mb-4 flex items-center gap-2">
        <Lightbulb className="w-4 h-4 text-warning" />
        {t('quickInsights')}
      </h3>
      <div className="space-y-3">
        {insights.map((insight, idx) => (
          <div key={idx} className="flex items-start gap-3 p-2.5 rounded-lg bg-muted/50">
            <Icon type={insight.icon} />
            <span className="text-sm text-foreground leading-snug">{insight.text}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default InsightsPanel;

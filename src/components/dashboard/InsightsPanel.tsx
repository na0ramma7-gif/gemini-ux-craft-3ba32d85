import { useMemo } from 'react';
import { useApp } from '@/context/AppContext';
import { formatCurrency } from '@/lib/utils';
import { Lightbulb, TrendingUp, TrendingDown, AlertTriangle } from 'lucide-react';

const InsightsPanel = () => {
  const { state, t, language } = useApp();

  const insights = useMemo(() => {
    const results: { text: string; icon: 'up' | 'down' | 'alert'; }[] = [];

    // Portfolio revenue contributions
    const portfolioRevenues = state.portfolios.map(p => {
      const products = state.products.filter(pr => pr.portfolioId === p.id);
      let actual = 0;
      products.forEach(pr => {
        const features = state.features.filter(f => f.productId === pr.id);
        features.forEach(f => {
          state.revenueActual.filter(r => r.featureId === f.id).forEach(r => { actual += r.actual; });
        });
      });
      return { name: p.name, actual };
    });

    const totalRevenue = portfolioRevenues.reduce((s, p) => s + p.actual, 0);
    const topPortfolio = [...portfolioRevenues].sort((a, b) => b.actual - a.actual)[0];
    if (topPortfolio && totalRevenue > 0) {
      const pct = ((topPortfolio.actual / totalRevenue) * 100).toFixed(0);
      results.push({ text: `${topPortfolio.name} contributes ${pct}% of department revenue`, icon: 'up' });
    }

    // Highest profit margin portfolio
    const portfolioProfit = state.portfolios.map(p => {
      const products = state.products.filter(pr => pr.portfolioId === p.id);
      let actual = 0;
      let cost = 0;
      products.forEach(pr => {
        const features = state.features.filter(f => f.productId === pr.id);
        features.forEach(f => {
          state.revenueActual.filter(r => r.featureId === f.id).forEach(r => { actual += r.actual; });
        });
        state.costs.filter(c => c.productId === pr.id).forEach(c => {
          if (c.type === 'CAPEX' && c.total && c.amortization) cost += (c.total / c.amortization) * 6;
          else if (c.monthly) cost += c.monthly * 6;
        });
      });
      const margin = actual > 0 ? ((actual - cost) / actual) * 100 : 0;
      return { name: p.name, margin };
    });

    const highMargin = [...portfolioProfit].sort((a, b) => b.margin - a.margin)[0];
    if (highMargin) {
      results.push({ text: `${highMargin.name} has the highest profit margin (${highMargin.margin.toFixed(0)}%)`, icon: 'up' });
    }

    // Products with low achievement
    const productMetrics = state.products.map(product => {
      const features = state.features.filter(f => f.productId === product.id);
      let actual = 0;
      let planned = 0;
      features.forEach(f => {
        state.revenueActual.filter(r => r.featureId === f.id).forEach(r => { actual += r.actual; });
        state.revenuePlan.filter(r => r.featureId === f.id).forEach(r => { planned += r.expected; });
      });
      const target = planned * 1.35;
      const pct = target > 0 ? (actual / target) * 100 : 0;
      return { name: product.name, pct };
    });

    const weakProducts = productMetrics.filter(p => p.pct < 50);
    if (weakProducts.length > 0) {
      results.push({ text: `${weakProducts.length} product(s) below 50% target achievement`, icon: 'alert' });
    }

    // Active features count
    const inProgress = state.features.filter(f => f.status === 'In Progress').length;
    results.push({ text: `${inProgress} features currently in progress`, icon: 'up' });

    // Top performing product
    const topProduct = [...productMetrics].sort((a, b) => b.pct - a.pct)[0];
    if (topProduct) {
      results.push({ text: `${topProduct.name} leads with ${topProduct.pct.toFixed(0)}% target achievement`, icon: 'up' });
    }

    return results;
  }, [state]);

  const Icon = ({ type }: { type: string }) => {
    if (type === 'up') return <TrendingUp className="w-4 h-4 text-success shrink-0" />;
    if (type === 'down') return <TrendingDown className="w-4 h-4 text-destructive shrink-0" />;
    return <AlertTriangle className="w-4 h-4 text-warning shrink-0" />;
  };

  return (
    <div className="bg-card rounded-xl shadow-[var(--shadow-card)] p-5">
      <h3 className="text-foreground mb-4 flex items-center gap-2">
        <Lightbulb className="w-4 h-4 text-warning" />
        Quick Insights
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

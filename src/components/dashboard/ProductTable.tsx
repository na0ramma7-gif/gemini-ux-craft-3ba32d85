import { useMemo, useState } from 'react';
import { useApp } from '@/context/AppContext';
import { formatCurrency } from '@/lib/utils';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Product } from '@/types';
import { ChevronDown, ChevronUp, Trophy } from 'lucide-react';

interface Props {
  onProductClick?: (product: Product) => void;
}

const ProductTable = ({ onProductClick }: Props) => {
  const { state, t, language } = useApp();

  const products = useMemo(() => {
    return state.products.map(product => {
      const portfolio = state.portfolios.find(p => p.id === product.portfolioId);
      const features = state.features.filter(f => f.productId === product.id);
      let actual = 0;
      let planned = 0;
      features.forEach(f => {
        state.revenueActual.filter(r => r.featureId === f.id).forEach(r => { actual += r.actual; });
        state.revenuePlan.filter(r => r.featureId === f.id).forEach(r => { planned += r.expected; });
      });

      let cost = 0;
      state.costs.filter(c => c.productId === product.id).forEach(c => {
        if (c.type === 'CAPEX' && c.total && c.amortization) {
          cost += (c.total / c.amortization) * 6;
        } else if (c.monthly) {
          cost += c.monthly * 6;
        }
      });

      const target = planned * 1.35;
      const profit = actual - cost;
      const pct = target > 0 ? Math.round((actual / target) * 100) : 0;

      return { ...product, portfolioName: portfolio?.name || '', actual, cost, profit, pct };
    }).sort((a, b) => b.actual - a.actual);
  }, [state]);

  const getColor = (pct: number) => {
    if (pct >= 80) return 'text-success';
    if (pct >= 50) return 'text-warning-foreground';
    return 'text-destructive';
  };

  const getBg = (pct: number) => {
    if (pct >= 80) return 'bg-success/10';
    if (pct >= 50) return 'bg-warning/10';
    return 'bg-destructive/10';
  };

  const [expanded, setExpanded] = useState(false);
  const visibleProducts = expanded ? products : products.slice(0, 5);

  return (
    <div className="bg-card rounded-xl shadow-[var(--shadow-card)] p-6">
      <div className="flex items-center gap-2 mb-5">
        <Trophy className="w-5 h-5 text-primary" />
        <h3 className="text-foreground">{t('products')} — {t('targetVsAchieved')}</h3>
      </div>
      <div className="overflow-auto">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="text-xs uppercase tracking-wide">{t('product')}</TableHead>
              <TableHead className="text-xs uppercase tracking-wide">{t('portfolio')}</TableHead>
              <TableHead className="text-xs uppercase tracking-wide text-end">{t('revenue')}</TableHead>
              <TableHead className="text-xs uppercase tracking-wide text-end">{t('cost')}</TableHead>
              <TableHead className="text-xs uppercase tracking-wide text-end">{t('netProfit')}</TableHead>
              <TableHead className="text-xs uppercase tracking-wide text-center">{t('achievementRate')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {visibleProducts.map((p, idx) => (
              <TableRow
                key={p.id}
                className="cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => onProductClick?.(p)}
              >
                <TableCell className="font-medium text-foreground">
                  <div className="flex items-center gap-2">
                    {idx === 0 && !expanded && <span className="text-warning text-xs">🥇</span>}
                    {idx === 1 && !expanded && <span className="text-muted-foreground text-xs">🥈</span>}
                    {idx === 2 && !expanded && <span className="text-muted-foreground text-xs">🥉</span>}
                    {p.name}
                  </div>
                </TableCell>
                <TableCell>
                  <span className="text-xs px-2 py-1 rounded-md bg-muted text-muted-foreground">{p.portfolioName}</span>
                </TableCell>
                <TableCell className="text-end text-success font-semibold">{formatCurrency(p.actual, language)}</TableCell>
                <TableCell className="text-end text-destructive font-semibold">{formatCurrency(p.cost, language)}</TableCell>
                <TableCell className={`text-end font-semibold ${p.profit >= 0 ? 'text-profit' : 'text-destructive'}`}>
                  {formatCurrency(p.profit, language)}
                </TableCell>
                <TableCell className="text-center">
                  <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-bold ${getBg(p.pct)} ${getColor(p.pct)}`}>
                    {p.pct}%
                  </span>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      {products.length > 5 && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="mt-4 w-full flex items-center justify-center gap-1.5 text-sm font-medium text-primary hover:text-primary/80 transition-colors py-2.5 rounded-lg hover:bg-primary/5"
        >
          {expanded ? (
            <>Show Top 5 <ChevronUp className="w-4 h-4" /></>
          ) : (
            <>Show All {products.length} Products <ChevronDown className="w-4 h-4" /></>
          )}
        </button>
      )}
    </div>
  );
};

export default ProductTable;

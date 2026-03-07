import { useMemo, useState } from 'react';
import { useApp } from '@/context/AppContext';
import { formatCurrency } from '@/lib/utils';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Product } from '@/types';

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
    <div className="bg-card rounded-xl shadow-[var(--shadow-card)] p-5">
      <h3 className="text-foreground mb-4">{t('products')} — {t('targetVsAchieved')}</h3>
      <div className="overflow-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('product')}</TableHead>
              <TableHead>{t('portfolio')}</TableHead>
              <TableHead className="text-end">{t('revenue')}</TableHead>
              <TableHead className="text-end">{t('cost')}</TableHead>
              <TableHead className="text-end">{t('netProfit')}</TableHead>
              <TableHead className="text-center">{t('achievementRate')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {visibleProducts.map(p => (
              <TableRow
                key={p.id}
                className="cursor-pointer hover:bg-muted/50"
                onClick={() => onProductClick?.(p)}
              >
                <TableCell className="font-medium text-foreground">{p.name}</TableCell>
                <TableCell className="text-muted-foreground">{p.portfolioName}</TableCell>
                <TableCell className="text-end text-success font-medium">{formatCurrency(p.actual, language)}</TableCell>
                <TableCell className="text-end text-destructive font-medium">{formatCurrency(p.cost, language)}</TableCell>
                <TableCell className={`text-end font-medium ${p.profit >= 0 ? 'text-profit' : 'text-destructive'}`}>
                  {formatCurrency(p.profit, language)}
                </TableCell>
                <TableCell className="text-center">
                  <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${getBg(p.pct)} ${getColor(p.pct)}`}>
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
          className="mt-3 w-full text-center text-sm font-medium text-primary hover:text-primary/80 transition-colors py-2 rounded-lg hover:bg-primary/5"
        >
          {expanded ? `Show Top 5 ▲` : `Show All ${products.length} Products ▼`}
        </button>
      )}
    </div>
  );
};

export default ProductTable;

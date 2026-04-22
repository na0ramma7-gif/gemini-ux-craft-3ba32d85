import { useMemo, useState } from 'react';
import { useApp } from '@/context/AppContext';
import { formatCurrency } from '@/lib/utils';
import { useHierarchicalMetrics } from '@/hooks/useHierarchicalMetrics';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Product } from '@/types';
import { ChevronDown, ChevronUp, Trophy } from 'lucide-react';
import { computeWindowMetrics, computeDelta } from '@/lib/compare';
import DeltaChip from '@/components/compare/DeltaChip';

interface Props {
  onProductClick?: (product: Product) => void;
}

const ProductTable = ({ onProductClick }: Props) => {
  const { state, t, language, dateFilter, compareSelection } = useApp();
  const dept = useHierarchicalMetrics(state, dateFilter);
  const compareEnabled = dateFilter.compareEnabled;
  const productFilter = compareSelection.productIds;
  const portfolioFilter = compareSelection.portfolioIds;

  // Use the hierarchical hook as the single source of truth.
  const products = useMemo(() => {
    const productAllow = productFilter.length > 0 ? new Set(productFilter) : null;
    const portfolioAllow = portfolioFilter.length > 0 ? new Set(portfolioFilter) : null;
    const cmpWindow = compareEnabled
      ? { startDate: dateFilter.compareStartDate, endDate: dateFilter.compareEndDate }
      : null;

    return dept.portfolioMetrics
      .filter(pm => !portfolioAllow || portfolioAllow.has(pm.portfolioId))
      .flatMap(pm =>
        pm.productMetrics
          .filter(prod => !productAllow || productAllow.has(prod.productId))
          .map(prod => {
          const fullProduct = state.products.find(p => p.id === prod.productId);

          let cmpRevenue = 0, cmpCost = 0, cmpProfit = 0;
          let dRev = null as ReturnType<typeof computeDelta> | null;
          let dCost = null as ReturnType<typeof computeDelta> | null;
          let dProfit = null as ReturnType<typeof computeDelta> | null;
          if (cmpWindow) {
            const m = computeWindowMetrics(state, cmpWindow, {
              portfolioIds: [],
              productIds: [prod.productId],
              featureIds: [],
            });
            cmpRevenue = m.revenue;
            cmpCost = m.cost;
            cmpProfit = m.profit;
            dRev = computeDelta(prod.revenue, cmpRevenue);
            dCost = computeDelta(prod.cost, cmpCost, { lowerIsBetter: true });
            dProfit = computeDelta(prod.profit, cmpProfit);
          }

          return {
            ...(fullProduct as Product),
            portfolioName: pm.portfolioName,
            actual: prod.revenue,
            cost: prod.cost,
            profit: prod.profit,
            pct: prod.achievementPct,
            cmpRevenue, cmpCost, cmpProfit,
            dRev, dCost, dProfit,
          };
        }),
      )
      .sort((a, b) => b.actual - a.actual);
  }, [dept, state, productFilter, portfolioFilter, compareEnabled, dateFilter.compareStartDate, dateFilter.compareEndDate]);

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

      {/* Mobile cards (< md). On md+ when compare adds an extra column the table can still scroll. */}
      <div className="md:hidden space-y-3">
        {visibleProducts.map((p, idx) => (
          <button
            key={p.id}
            type="button"
            onClick={() => onProductClick?.(p)}
            className="w-full text-start bg-muted/30 hover:bg-muted/60 transition-colors rounded-xl p-4 border border-border min-h-[44px]"
          >
            <div className="flex items-start justify-between gap-3 mb-2">
              <div className="min-w-0 flex-1">
                <div className="font-medium text-foreground text-sm flex items-center gap-1.5">
                  {idx === 0 && !expanded && <span className="text-warning text-xs">🥇</span>}
                  {idx === 1 && !expanded && <span className="text-muted-foreground text-xs">🥈</span>}
                  {idx === 2 && !expanded && <span className="text-muted-foreground text-xs">🥉</span>}
                  <span className="truncate">{p.name}</span>
                </div>
                <span className="text-[11px] px-2 py-0.5 rounded-md bg-muted text-muted-foreground inline-block mt-1">
                  {p.portfolioName}
                </span>
              </div>
              <span className={`shrink-0 inline-flex px-2.5 py-1 rounded-full text-xs font-bold ${getBg(p.pct)} ${getColor(p.pct)}`}>
                {p.pct}%
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2 text-xs">
              <div>
                <div className="text-[10px] uppercase text-muted-foreground tracking-wide">{t('revenue')}</div>
                <div className="text-success font-semibold tabular-nums">{formatCurrency(p.actual, language)}</div>
              </div>
              <div>
                <div className="text-[10px] uppercase text-muted-foreground tracking-wide">{t('cost')}</div>
                <div className="text-destructive font-semibold tabular-nums">{formatCurrency(p.cost, language)}</div>
              </div>
              <div>
                <div className="text-[10px] uppercase text-muted-foreground tracking-wide">{t('netProfit')}</div>
                <div className={`font-semibold tabular-nums ${p.profit >= 0 ? 'text-profit' : 'text-destructive'}`}>
                  {formatCurrency(p.profit, language)}
                </div>
              </div>
            </div>
            {compareEnabled && (p.dRev || p.dCost || p.dProfit) && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {p.dRev && <DeltaChip delta={p.dRev} format="currency" />}
                {p.dCost && <DeltaChip delta={p.dCost} format="currency" lowerIsBetter />}
                {p.dProfit && <DeltaChip delta={p.dProfit} format="currency" />}
              </div>
            )}
          </button>
        ))}
      </div>

      <div className="hidden md:block overflow-auto">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="text-xs uppercase tracking-wide">{t('product')}</TableHead>
              <TableHead className="text-xs uppercase tracking-wide">{t('portfolio')}</TableHead>
              <TableHead className="text-xs uppercase tracking-wide text-end">{t('revenue')}</TableHead>
              <TableHead className="text-xs uppercase tracking-wide text-end">{t('cost')}</TableHead>
              <TableHead className="text-xs uppercase tracking-wide text-end">{t('netProfit')}</TableHead>
              {compareEnabled && (
                <TableHead className="text-xs uppercase tracking-wide text-end">{t('vsCompare')}</TableHead>
              )}
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
                {compareEnabled && (
                  <TableCell className="text-end">
                    <div className="flex flex-col items-end gap-1">
                      {p.dRev && <DeltaChip delta={p.dRev} format="currency" />}
                      {p.dCost && <DeltaChip delta={p.dCost} format="currency" lowerIsBetter />}
                      {p.dProfit && <DeltaChip delta={p.dProfit} format="currency" />}
                    </div>
                  </TableCell>
                )}
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

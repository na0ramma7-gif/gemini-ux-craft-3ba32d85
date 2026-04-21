import { useApp } from '@/context/AppContext';
import EntityMultiSelectChips, { EntityOption } from './EntityMultiSelectChips';
import { ComparePageScope } from '@/hooks/useCompareMetrics';
import { useMemo } from 'react';
import { resolveProductIds } from '@/lib/compare';

interface CompareControlsProps {
  scope: ComparePageScope;
  /** When scope === 'portfolio', restrict product picker to this portfolio. */
  portfolioId?: number;
  /** When scope === 'product', restrict feature picker to this product. */
  productId?: number;
}

/**
 * Renders the entity selector strip shown ONLY when Compare is ON.
 * - Dashboard scope: portfolios + products (products filtered by portfolio selection)
 * - Portfolio scope: products (within the portfolio)
 * - Product scope: features (within the product)
 *
 * Returns null when Compare is OFF — keeps the page header clean.
 */
const CompareControls = ({ scope, portfolioId, productId }: CompareControlsProps) => {
  const { state, dateFilter, compareSelection, setCompareSelection, t } = useApp();

  // Hooks must run unconditionally — compute options before any early return.
  const portfolioOptions: EntityOption[] = useMemo(
    () => state.portfolios.map(p => ({ id: p.id, label: p.name, hint: p.code })),
    [state.portfolios],
  );

  const productOptions: EntityOption[] = useMemo(() => {
    let products = state.products;
    if (scope === 'portfolio' && portfolioId != null) {
      products = products.filter(p => p.portfolioId === portfolioId);
    } else if (scope === 'dashboard' && compareSelection.portfolioIds.length > 0) {
      const inScope = new Set(
        resolveProductIds(state, { portfolioIds: compareSelection.portfolioIds, productIds: [], featureIds: [] }),
      );
      products = products.filter(p => inScope.has(p.id));
    }
    return products.map(p => ({
      id: p.id,
      label: p.name,
      hint: state.portfolios.find(po => po.id === p.portfolioId)?.code,
    }));
  }, [state, scope, portfolioId, compareSelection.portfolioIds]);

  const featureOptions: EntityOption[] = useMemo(() => {
    if (scope !== 'product' || productId == null) return [];
    return state.features
      .filter(f => f.productId === productId)
      .map(f => ({ id: f.id, label: f.name }));
  }, [state.features, scope, productId]);

  if (!dateFilter.compareEnabled) return null;

  return (
    <div className="rounded-xl border border-border bg-card/60 px-3 py-2.5 flex flex-wrap items-center gap-x-4 gap-y-2">
      {scope === 'dashboard' && (
        <>
          <EntityMultiSelectChips
            label={t('selectPortfolios')}
            options={portfolioOptions}
            selectedIds={compareSelection.portfolioIds}
            onChange={ids =>
              setCompareSelection(prev => ({
                ...prev,
                portfolioIds: ids,
                // Drop product picks no longer in scope.
                productIds: ids.length === 0
                  ? prev.productIds
                  : prev.productIds.filter(pid => {
                      const prod = state.products.find(p => p.id === pid);
                      return prod ? ids.includes(prod.portfolioId) : false;
                    }),
              }))
            }
          />
          <span className="text-border">·</span>
          <EntityMultiSelectChips
            label={t('selectProducts')}
            options={productOptions}
            selectedIds={compareSelection.productIds}
            onChange={ids => setCompareSelection(prev => ({ ...prev, productIds: ids }))}
          />
        </>
      )}

      {scope === 'portfolio' && (
        <EntityMultiSelectChips
          label={t('selectProducts')}
          options={productOptions}
          selectedIds={compareSelection.productIds}
          onChange={ids => setCompareSelection(prev => ({ ...prev, productIds: ids }))}
        />
      )}

      {scope === 'product' && (
        <EntityMultiSelectChips
          label={t('selectFeatures')}
          options={featureOptions}
          selectedIds={compareSelection.featureIds}
          onChange={ids => setCompareSelection(prev => ({ ...prev, featureIds: ids }))}
        />
      )}
    </div>
  );
};

export default CompareControls;

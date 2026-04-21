import { useMemo } from 'react';
import { useApp } from '@/context/AppContext';
import {
  CompareSelection,
  EMPTY_SELECTION,
  WindowMetrics,
  Delta,
  computeWindowMetrics,
  computeDelta,
  validateCompareWindows,
  classifyDataState,
  CompareDataState,
  CompareValidation,
} from '@/lib/compare';
import { DateWindow } from '@/lib/utils';

export type ComparePageScope = 'dashboard' | 'portfolio' | 'product';

export interface UseCompareMetricsOptions {
  /** Page-specific scope. Constrains the selection used. */
  scope: ComparePageScope;
  /** When scope === 'portfolio', restricts to a single portfolio. */
  portfolioId?: number;
  /** When scope === 'product', restricts to a single product. */
  productId?: number;
  /** Override the active selection (defaults to context selection). */
  selectionOverride?: Partial<CompareSelection>;
}

export interface UseCompareMetricsResult {
  active: boolean;
  primaryWindow: DateWindow;
  comparisonWindow: DateWindow | null;
  selection: CompareSelection;
  current: WindowMetrics;
  comparison: WindowMetrics;
  delta: {
    revenue: Delta;
    cost: Delta;
    profit: Delta;
    margin: Delta;
  };
  validation: CompareValidation;
  dataState: CompareDataState;
}

/**
 * Page-aware compare hook. Always returns current metrics; when
 * compare is OFF, comparison metrics are zeroed and `active` is false.
 *
 * Selection is automatically constrained to the page scope so that, e.g.,
 * a Portfolio page can never accidentally include products from other portfolios.
 */
export function useCompareMetrics(opts: UseCompareMetricsOptions): UseCompareMetricsResult {
  const { state, dateFilter, compareSelection } = useApp();

  return useMemo(() => {
    const primaryWindow: DateWindow = {
      startDate: dateFilter.startDate,
      endDate: dateFilter.endDate,
    };
    const comparisonWindow: DateWindow | null = dateFilter.compareEnabled
      ? { startDate: dateFilter.compareStartDate, endDate: dateFilter.compareEndDate }
      : null;

    // Build a scope-constrained selection.
    const base: CompareSelection = {
      portfolioIds: [...compareSelection.portfolioIds],
      productIds: [...compareSelection.productIds],
      featureIds: [...compareSelection.featureIds],
      ...opts.selectionOverride,
    };

    let selection: CompareSelection = base;
    if (opts.scope === 'portfolio' && opts.portfolioId != null) {
      // Lock to this portfolio; ignore portfolio-level selection.
      selection = {
        portfolioIds: [opts.portfolioId],
        productIds: base.productIds,
        featureIds: [],
      };
    } else if (opts.scope === 'product' && opts.productId != null) {
      selection = {
        portfolioIds: [],
        productIds: [opts.productId],
        featureIds: base.featureIds,
      };
    }

    const current = computeWindowMetrics(state, primaryWindow, selection);
    const comparison = comparisonWindow
      ? computeWindowMetrics(state, comparisonWindow, selection)
      : { ...current, revenue: 0, cost: 0, profit: 0, margin: 0, hasData: false };

    const validation = validateCompareWindows(primaryWindow, comparisonWindow);
    const active = !!comparisonWindow && validation.ok;

    return {
      active,
      primaryWindow,
      comparisonWindow,
      selection,
      current,
      comparison,
      delta: {
        revenue: computeDelta(current.revenue, comparison.revenue),
        cost: computeDelta(current.cost, comparison.cost, { lowerIsBetter: true }),
        profit: computeDelta(current.profit, comparison.profit),
        margin: computeDelta(current.margin, comparison.margin),
      },
      validation,
      dataState: active ? classifyDataState(current, comparison) : 'ok',
    };
  }, [state, dateFilter, compareSelection, opts.scope, opts.portfolioId, opts.productId, opts.selectionOverride]);
}

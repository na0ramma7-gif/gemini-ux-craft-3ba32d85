/**
 * Compare by Duration — pure logic helpers.
 * Single source of truth for entity-scoped, window-scoped metrics
 * and for current-vs-comparison delta computation.
 *
 * Reuses monthlyCostForRow / monthsInDateRange / DateWindow from utils.
 * Do NOT duplicate financial formulas anywhere else.
 */
import { AppState } from '@/types';
import {
  DateWindow,
  monthsInDateRange,
  monthlyCostForRow,
} from '@/lib/utils';

// ── Selection scope ───────────────────────────────────────────
// Empty array = "All" for that entity dimension.
export interface CompareSelection {
  portfolioIds: number[];
  productIds: number[];
  featureIds: number[];
}

export const EMPTY_SELECTION: CompareSelection = {
  portfolioIds: [],
  productIds: [],
  featureIds: [],
};

// ── Window metrics ────────────────────────────────────────────
export interface WindowMetrics {
  revenue: number;
  cost: number;
  profit: number;
  margin: number;
  productCount: number;
  featureCount: number;
  monthCount: number;
  /** True if at least one revenue or cost data point fell in the window for the selection. */
  hasData: boolean;
}

const EMPTY_METRICS: WindowMetrics = {
  revenue: 0,
  cost: 0,
  profit: 0,
  margin: 0,
  productCount: 0,
  featureCount: 0,
  monthCount: 0,
  hasData: false,
};

/**
 * Resolve which product IDs are in scope given a selection.
 * Precedence: explicit productIds > portfolioIds > all products.
 */
export function resolveProductIds(
  state: AppState,
  selection: CompareSelection,
): number[] {
  if (selection.productIds.length > 0) return [...selection.productIds];
  if (selection.portfolioIds.length > 0) {
    const set = new Set(selection.portfolioIds);
    return state.products.filter(p => set.has(p.portfolioId)).map(p => p.id);
  }
  return state.products.map(p => p.id);
}

/**
 * Resolve in-scope feature IDs given a selection. Features can be
 * selected directly, or implied by selected products / portfolios.
 */
export function resolveFeatureIds(
  state: AppState,
  selection: CompareSelection,
): number[] {
  if (selection.featureIds.length > 0) return [...selection.featureIds];
  const productIds = new Set(resolveProductIds(state, selection));
  return state.features.filter(f => productIds.has(f.productId)).map(f => f.id);
}

/**
 * Compute revenue / cost / profit for a date window, scoped by selection.
 * Mirrors the logic used in useHierarchicalMetrics — this is the
 * single source for compare-mode aggregations.
 */
export function computeWindowMetrics(
  state: AppState,
  window: DateWindow | null | undefined,
  selection: CompareSelection = EMPTY_SELECTION,
): WindowMetrics {
  if (!window) return EMPTY_METRICS;
  const monthKeys = monthsInDateRange(window);
  if (monthKeys.length === 0) return EMPTY_METRICS;
  const monthSet = new Set(monthKeys);

  const productIds = resolveProductIds(state, selection);
  const productSet = new Set(productIds);
  const featureIds = resolveFeatureIds(state, selection);
  const featureSet = new Set(featureIds);

  // Revenue: sum revenueActual for in-scope features within window.
  let revenue = 0;
  let revenueRows = 0;
  state.revenueActual.forEach(r => {
    if (featureSet.has(r.featureId) && monthSet.has(r.month)) {
      revenue += r.actual;
      revenueRows++;
    }
  });

  // Cost: sum monthlyCostForRow for in-scope products, honoring each row's window.
  let cost = 0;
  let costRows = 0;
  state.costs.forEach(c => {
    if (!productSet.has(c.productId)) return;
    const monthly = monthlyCostForRow(c);
    if (monthly === 0) return;
    const cs = c.startDate ? c.startDate.slice(0, 7) : null;
    const ce = c.endDate ? c.endDate.slice(0, 7) : null;
    monthKeys.forEach(mk => {
      if (cs && mk < cs) return;
      if (ce && mk > ce) return;
      cost += monthly;
      costRows++;
    });
  });

  const profit = revenue - cost;
  return {
    revenue,
    cost,
    profit,
    margin: revenue > 0 ? (profit / revenue) * 100 : 0,
    productCount: productIds.length,
    featureCount: featureIds.length,
    monthCount: monthKeys.length,
    hasData: revenueRows > 0 || costRows > 0,
  };
}

// ── Delta ─────────────────────────────────────────────────────
export type Trend = 'up' | 'down' | 'flat' | 'na';

export interface Delta {
  abs: number;
  pct: number | null; // null when comparison is 0 and current is non-zero (undefined %)
  trend: Trend;
  /** True when comparison value is zero — the percentage is undefined. */
  comparisonZero: boolean;
}

/**
 * Compute delta between current and comparison.
 * `lowerIsBetter` flips the trend semantic so that, e.g., a cost
 * decrease shows as a positive trend.
 */
export function computeDelta(
  current: number,
  comparison: number,
  opts: { lowerIsBetter?: boolean } = {},
): Delta {
  const abs = current - comparison;
  const lowerIsBetter = opts.lowerIsBetter === true;

  if (comparison === 0 && current === 0) {
    return { abs: 0, pct: 0, trend: 'flat', comparisonZero: true };
  }
  if (comparison === 0) {
    // Cannot express as percentage; report direction only.
    const rising = current > 0;
    return {
      abs,
      pct: null,
      trend: rising ? (lowerIsBetter ? 'down' : 'up') : (lowerIsBetter ? 'up' : 'down'),
      comparisonZero: true,
    };
  }

  const pct = (abs / Math.abs(comparison)) * 100;
  let trend: Trend = 'flat';
  if (Math.abs(pct) < 0.05) trend = 'flat';
  else if (abs > 0) trend = lowerIsBetter ? 'down' : 'up';
  else trend = lowerIsBetter ? 'up' : 'down';

  return { abs, pct, trend, comparisonZero: false };
}

// ── Window validation ─────────────────────────────────────────
export interface CompareValidation {
  ok: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Validate primary + comparison windows. Returns translation keys
 * (callers translate them) so the lib stays UI-agnostic.
 */
export function validateCompareWindows(
  primary: DateWindow | null | undefined,
  comparison: DateWindow | null | undefined,
): CompareValidation {
  const errors: string[] = [];
  const warnings: string[] = [];

  const checkWindow = (w: DateWindow | null | undefined, prefix: 'primary' | 'comparison') => {
    if (!w) {
      errors.push(`${prefix}.missing`);
      return;
    }
    const start = w.startDate?.getTime();
    const end = w.endDate?.getTime();
    if (!Number.isFinite(start) || !Number.isFinite(end)) {
      errors.push(`${prefix}.invalidDate`);
      return;
    }
    if (end < start) errors.push(`${prefix}.endBeforeStart`);
    if (end === start) errors.push(`${prefix}.zeroLength`);
  };

  checkWindow(primary, 'primary');
  checkWindow(comparison, 'comparison');

  if (primary && comparison && errors.length === 0) {
    const ps = primary.startDate.getTime();
    const pe = primary.endDate.getTime();
    const cs = comparison.startDate.getTime();
    const ce = comparison.endDate.getTime();

    if (ps === cs && pe === ce) {
      warnings.push('windowsIdentical');
    } else if (cs <= pe && ps <= ce) {
      warnings.push('windowsOverlap');
    }
  }

  return { ok: errors.length === 0, errors, warnings };
}

// ── No-data classification ────────────────────────────────────
export type CompareDataState =
  | 'ok'
  | 'no-current'
  | 'no-comparison'
  | 'no-both'
  | 'partial';

export function classifyDataState(
  current: WindowMetrics,
  comparison: WindowMetrics,
): CompareDataState {
  if (!current.hasData && !comparison.hasData) return 'no-both';
  if (!current.hasData) return 'no-current';
  if (!comparison.hasData) return 'no-comparison';
  // Partial = both have *some* data but one side has zero revenue+cost.
  const cur = current.revenue + current.cost;
  const cmp = comparison.revenue + comparison.cost;
  if ((cur === 0) !== (cmp === 0)) return 'partial';
  return 'ok';
}

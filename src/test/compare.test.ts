/**
 * Unit tests for src/lib/compare.ts — Round 12 (test-coverage sweep).
 *
 * Covers the pure-logic surface:
 *   - computeDelta (positive, negative, zero, lowerIsBetter, comparisonZero)
 *   - validateCompareWindows (errors, warnings, identical/overlap)
 *   - classifyDataState (no-current, no-comparison, no-both, partial, ok)
 *   - resolveProductIds / resolveFeatureIds (precedence rules)
 *   - computeWindowMetrics (selection scoping, empty window, EMPTY metrics)
 *
 * Uses INITIAL_STATE for realistic data + handcrafted minimal states for edge cases.
 */
import { describe, it, expect } from 'vitest';
import { INITIAL_STATE } from '@/data/initialData';
import {
  computeDelta,
  validateCompareWindows,
  classifyDataState,
  resolveProductIds,
  resolveFeatureIds,
  computeWindowMetrics,
  EMPTY_SELECTION,
  type WindowMetrics,
} from '@/lib/compare';
import type { AppState } from '@/types';

const state = INITIAL_STATE as AppState;

const win = (s: string, e: string) => ({
  startDate: new Date(s),
  endDate: new Date(e),
});

// ─────────────────────────────────────────────────────────────
describe('computeDelta', () => {
  it('returns positive trend when current > comparison', () => {
    const d = computeDelta(150, 100);
    expect(d.abs).toBe(50);
    expect(d.pct).toBeCloseTo(50, 5);
    expect(d.trend).toBe('up');
    expect(d.comparisonZero).toBe(false);
  });

  it('returns negative trend when current < comparison', () => {
    const d = computeDelta(80, 100);
    expect(d.abs).toBe(-20);
    expect(d.pct).toBeCloseTo(-20, 5);
    expect(d.trend).toBe('down');
  });

  it('returns flat for tiny percentage changes (<0.05%)', () => {
    const d = computeDelta(100.00001, 100);
    expect(d.trend).toBe('flat');
  });

  it('returns flat when both values are zero', () => {
    const d = computeDelta(0, 0);
    expect(d).toEqual({ abs: 0, pct: 0, trend: 'flat', comparisonZero: true });
  });

  it('returns null pct + comparisonZero when comparison is 0 and current > 0', () => {
    const d = computeDelta(50, 0);
    expect(d.pct).toBeNull();
    expect(d.comparisonZero).toBe(true);
    expect(d.trend).toBe('up');
  });

  it('flips trend semantics when lowerIsBetter is true', () => {
    // Cost went UP — that is BAD when lowerIsBetter.
    const worse = computeDelta(150, 100, { lowerIsBetter: true });
    expect(worse.trend).toBe('down');
    // Cost went DOWN — that is GOOD when lowerIsBetter.
    const better = computeDelta(80, 100, { lowerIsBetter: true });
    expect(better.trend).toBe('up');
  });

  it('uses |comparison| in pct denominator (handles negative comparison)', () => {
    const d = computeDelta(-50, -100);
    // abs = 50, pct = 50/100 = 50 → rising → up
    expect(d.abs).toBe(50);
    expect(d.pct).toBeCloseTo(50, 5);
    expect(d.trend).toBe('up');
  });
});

// ─────────────────────────────────────────────────────────────
describe('validateCompareWindows', () => {
  const a = win('2024-01-01', '2024-06-30');
  const b = win('2023-01-01', '2023-06-30');

  it('passes for two valid non-overlapping windows', () => {
    const v = validateCompareWindows(a, b);
    expect(v.ok).toBe(true);
    expect(v.errors).toHaveLength(0);
    expect(v.warnings).toHaveLength(0);
  });

  it('reports primary.missing when primary is null', () => {
    const v = validateCompareWindows(null, b);
    expect(v.ok).toBe(false);
    expect(v.errors).toContain('primary.missing');
  });

  it('reports comparison.missing when comparison is null', () => {
    const v = validateCompareWindows(a, null);
    expect(v.errors).toContain('comparison.missing');
  });

  it('reports endBeforeStart when end < start', () => {
    const bad = win('2024-12-31', '2024-01-01');
    const v = validateCompareWindows(bad, b);
    expect(v.errors).toContain('primary.endBeforeStart');
  });

  it('reports zeroLength when start === end', () => {
    const same = win('2024-06-15', '2024-06-15');
    const v = validateCompareWindows(same, b);
    expect(v.errors).toContain('primary.zeroLength');
  });

  it('reports invalidDate when dates are NaN', () => {
    const bad = { startDate: new Date('not-a-date'), endDate: new Date('2024-01-01') };
    const v = validateCompareWindows(bad, b);
    expect(v.errors).toContain('primary.invalidDate');
  });

  it('warns windowsIdentical when both ranges exactly match', () => {
    const v = validateCompareWindows(a, a);
    expect(v.ok).toBe(true);
    expect(v.warnings).toContain('windowsIdentical');
  });

  it('warns windowsOverlap when ranges intersect', () => {
    const overlap = win('2024-04-01', '2024-09-30');
    const v = validateCompareWindows(a, overlap);
    expect(v.warnings).toContain('windowsOverlap');
  });

  it('does NOT warn overlap when windows are adjacent but disjoint', () => {
    // primary: Jan-Jun; comparison: Jul-Dec — no overlap.
    const next = win('2024-07-01', '2024-12-31');
    const v = validateCompareWindows(a, next);
    expect(v.warnings).toHaveLength(0);
  });
});

// ─────────────────────────────────────────────────────────────
describe('classifyDataState', () => {
  const mk = (rev: number, cost: number, hasData: boolean): WindowMetrics => ({
    revenue: rev, cost, profit: rev - cost,
    margin: rev > 0 ? ((rev - cost) / rev) * 100 : 0,
    productCount: 0, featureCount: 0, monthCount: 0, hasData,
  });

  it('returns no-both when neither window has data', () => {
    expect(classifyDataState(mk(0, 0, false), mk(0, 0, false))).toBe('no-both');
  });

  it('returns no-current when only current is empty', () => {
    expect(classifyDataState(mk(0, 0, false), mk(100, 50, true))).toBe('no-current');
  });

  it('returns no-comparison when only comparison is empty', () => {
    expect(classifyDataState(mk(100, 50, true), mk(0, 0, false))).toBe('no-comparison');
  });

  it('returns partial when one side has zero rev+cost despite hasData=true', () => {
    expect(classifyDataState(mk(0, 0, true), mk(100, 50, true))).toBe('partial');
  });

  it('returns ok when both sides have meaningful financial data', () => {
    expect(classifyDataState(mk(100, 50, true), mk(80, 40, true))).toBe('ok');
  });
});

// ─────────────────────────────────────────────────────────────
describe('resolveProductIds / resolveFeatureIds — precedence', () => {
  it('explicit productIds win over portfolioIds', () => {
    const ids = resolveProductIds(state, {
      portfolioIds: [state.portfolios[0].id],
      productIds: [state.products[0].id],
      featureIds: [],
    });
    expect(ids).toEqual([state.products[0].id]);
  });

  it('portfolioIds expand to all products in those portfolios', () => {
    const pf = state.portfolios[0].id;
    const expected = state.products.filter(p => p.portfolioId === pf).map(p => p.id);
    const ids = resolveProductIds(state, {
      portfolioIds: [pf], productIds: [], featureIds: [],
    });
    expect(ids.sort()).toEqual(expected.sort());
  });

  it('empty selection resolves to ALL products', () => {
    const ids = resolveProductIds(state, EMPTY_SELECTION);
    expect(ids.length).toBe(state.products.length);
  });

  it('explicit featureIds win in resolveFeatureIds', () => {
    const ids = resolveFeatureIds(state, {
      portfolioIds: [], productIds: [], featureIds: [state.features[0].id],
    });
    expect(ids).toEqual([state.features[0].id]);
  });

  it('resolveFeatureIds derives features from selected products', () => {
    const product = state.products[0];
    const expected = state.features.filter(f => f.productId === product.id).map(f => f.id);
    const ids = resolveFeatureIds(state, {
      portfolioIds: [], productIds: [product.id], featureIds: [],
    });
    expect(ids.sort()).toEqual(expected.sort());
  });
});

// ─────────────────────────────────────────────────────────────
describe('computeWindowMetrics — edge cases & scoping', () => {
  const fullWin = win('2020-01-01', '2030-12-31');

  it('returns EMPTY metrics when window is null', () => {
    const m = computeWindowMetrics(state, null);
    expect(m.revenue).toBe(0);
    expect(m.cost).toBe(0);
    expect(m.hasData).toBe(false);
  });

  it('returns EMPTY metrics when window has zero months', () => {
    // start === end on first day of month → at most 1 month, not zero.
    // To get zero months, end < start.
    const inverted = win('2025-12-01', '2024-01-01');
    const m = computeWindowMetrics(state, inverted);
    expect(m.revenue).toBe(0);
    expect(m.hasData).toBe(false);
  });

  it('profit = revenue − cost; margin = profit/revenue*100 when revenue>0', () => {
    const m = computeWindowMetrics(state, fullWin, EMPTY_SELECTION);
    expect(m.profit).toBeCloseTo(m.revenue - m.cost, 5);
    if (m.revenue > 0) {
      expect(m.margin).toBeCloseTo((m.profit / m.revenue) * 100, 5);
    }
  });

  it('summed portfolio-scoped revenue equals dept-wide revenue', () => {
    const dept = computeWindowMetrics(state, fullWin, EMPTY_SELECTION);
    const sum = state.portfolios.reduce((acc, pf) => {
      return acc + computeWindowMetrics(state, fullWin, {
        portfolioIds: [pf.id], productIds: [], featureIds: [],
      }).revenue;
    }, 0);
    expect(sum).toBeCloseTo(dept.revenue, 2);
  });

  it('product-scoped revenue ≤ portfolio-scoped revenue containing it', () => {
    const product = state.products[0];
    const pf = state.portfolios.find(p => p.id === product.portfolioId)!;
    const prodM = computeWindowMetrics(state, fullWin, {
      portfolioIds: [], productIds: [product.id], featureIds: [],
    });
    const pfM = computeWindowMetrics(state, fullWin, {
      portfolioIds: [pf.id], productIds: [], featureIds: [],
    });
    expect(prodM.revenue).toBeLessThanOrEqual(pfM.revenue + 0.01);
  });

  it('reports zero revenue for a far-future window with no revenue rows', () => {
    // Cost rows without endDate may extend forward, so we only assert revenue.
    const far = win('2099-01-01', '2099-12-31');
    const m = computeWindowMetrics(state, far);
    expect(m.revenue).toBe(0);
  });

  it('reports correct productCount and featureCount for selection', () => {
    const product = state.products[0];
    const m = computeWindowMetrics(state, fullWin, {
      portfolioIds: [], productIds: [product.id], featureIds: [],
    });
    const expectedFeatures = state.features.filter(f => f.productId === product.id).length;
    expect(m.productCount).toBe(1);
    expect(m.featureCount).toBe(expectedFeatures);
  });
});

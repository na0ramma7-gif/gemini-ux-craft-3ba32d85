import { describe, it, expect } from 'vitest';
import { INITIAL_STATE as initialState } from '@/data/initialData';
import { computeServiceBreakdown, computeWindowMetrics, computeDelta, EMPTY_SELECTION } from '@/lib/compare';

const allWin = { startDate: new Date('2020-01-01'), endDate: new Date('2030-12-31') };
const h1 = { startDate: new Date('2024-01-01'), endDate: new Date('2024-06-30') };
const h2 = { startDate: new Date('2024-07-01'), endDate: new Date('2024-12-31') };

describe('Phase 2 — service breakdown validation', () => {
  const state = initialState as any;
  const deptBreak = computeServiceBreakdown(state, allWin, EMPTY_SELECTION);
  const sumPlanned = deptBreak.reduce((s, r) => s + r.planned, 0);
  const sumActual = deptBreak.reduce((s, r) => s + r.actual, 0);
  const rawPlanned = state.revenueLines.reduce((s: number, l: any) => s + l.rate * (l.plannedTransactions || 0), 0);
  const rawActual = state.revenueLines.reduce((s: number, l: any) => s + l.rate * (l.actualTransactions || 0), 0);

  it('dept breakdown totals = raw revenueLines totals', () => {
    expect(sumPlanned).toBeCloseTo(rawPlanned, 2);
    expect(sumActual).toBeCloseTo(rawActual, 2);
    console.log('[dept] planned=', sumPlanned, 'actual=', sumActual, 'rows=', deptBreak.length);
    console.log('[services]', deptBreak.map(r => `${r.name}:${r.actual}`).join(', '));
  });

  it('no duplicated service names (case-insensitive)', () => {
    const lower = deptBreak.map(r => r.name.toLowerCase());
    expect(lower.length).toBe(new Set(lower).size);
  });

  it('feature-sum === product, product-sum === dept', () => {
    let prodSumP = 0, prodSumA = 0;
    state.products.forEach((prod: any) => {
      const fids = state.features.filter((f: any) => f.productId === prod.id).map((f: any) => f.id);
      const fRows = computeServiceBreakdown(state, allWin, { ...EMPTY_SELECTION, featureIds: fids });
      const pRows = computeServiceBreakdown(state, allWin, { ...EMPTY_SELECTION, productIds: [prod.id] });
      const fA = fRows.reduce((s,r)=>s+r.actual,0);
      const pA = pRows.reduce((s,r)=>s+r.actual,0);
      expect(fA).toBeCloseTo(pA, 2);
      prodSumP += pRows.reduce((s,r)=>s+r.planned,0);
      prodSumA += pA;
    });
    expect(prodSumP).toBeCloseTo(sumPlanned, 2);
    expect(prodSumA).toBeCloseTo(sumActual, 2);
  });

  it('portfolio-sum === dept', () => {
    let pP = 0, pA = 0;
    state.portfolios.forEach((pf: any) => {
      const r = computeServiceBreakdown(state, allWin, { ...EMPTY_SELECTION, portfolioIds: [pf.id] });
      pP += r.reduce((s,x)=>s+x.planned,0);
      pA += r.reduce((s,x)=>s+x.actual,0);
    });
    expect(pP).toBeCloseTo(sumPlanned, 2);
    expect(pA).toBeCloseTo(sumActual, 2);
  });

  it('WindowMetrics.revenue === breakdown actual sum', () => {
    const wm = computeWindowMetrics(state, allWin, EMPTY_SELECTION);
    expect(wm.revenue).toBeCloseTo(sumActual, 2);
  });

  it('delta edge cases', () => {
    expect(computeDelta(0,0)).toMatchObject({ abs: 0, pct: 0, trend: 'flat', comparisonZero: true });
    const fromZero = computeDelta(100,0);
    expect(fromZero.pct).toBeNull();
    expect(fromZero.trend).toBe('up');
    expect(fromZero.comparisonZero).toBe(true);
    const toZero = computeDelta(0,100);
    expect(toZero.pct).toBeCloseTo(-100, 2);
    expect(toZero.trend).toBe('down');
    const cost = computeDelta(80,100,{lowerIsBetter:true});
    expect(cost.trend).toBe('up'); // lower cost = positive
    const flat = computeDelta(100.0001, 100);
    expect(flat.trend).toBe('flat');
  });

  it('H2 vs H1 deltas computable for every current service', () => {
    const cur = computeServiceBreakdown(state, h2, EMPTY_SELECTION);
    const cmp = computeServiceBreakdown(state, h1, EMPTY_SELECTION);
    cur.forEach(r => {
      const c = cmp.find(x => x.name.toLowerCase() === r.name.toLowerCase());
      const d = computeDelta(r.actual, c?.actual ?? 0);
      expect(['up','down','flat','na']).toContain(d.trend);
      console.log(`[H2 vs H1] ${r.name}: cur=${r.actual} cmp=${c?.actual ?? 0} Δ%=${d.pct?.toFixed(1) ?? '—'} trend=${d.trend}`);
    });
  });

  it('empty-window returns no rows', () => {
    const empty = computeServiceBreakdown(state, { startDate: new Date('1990-01-01'), endDate: new Date('1990-12-31') }, EMPTY_SELECTION);
    expect(empty).toEqual([]);
  });

  it('zero-transaction lines do not create phantom services', () => {
    const rows = computeServiceBreakdown(state, allWin, EMPTY_SELECTION);
    rows.forEach(r => {
      // Either has revenue or has counted lines
      expect(r.lineCount).toBeGreaterThan(0);
    });
  });
});

import { useMemo } from 'react';
import { AppState, Product, Portfolio } from '@/types';
import { DateWindow, monthsInDateRange, computeCostForMonths } from '@/lib/utils';

// ── Feature-level metrics ──
export interface FeatureMetrics {
  featureId: number;
  featureName: string;
  revenue: number;
  planned: number;
  status: string;
}

// ── Product-level metrics (aggregated from features + costs) ──
export interface ProductMetrics {
  productId: number;
  productName: string;
  productCode: string;
  portfolioId: number;
  lifecycle: string;
  status: string;
  revenue: number;
  planned: number;
  cost: number;
  profit: number;
  margin: number;
  /** Full-year planned revenue (used for fixed annual target — ignores window) */
  annualPlanned: number;
  /** Target = annualPlanned * 1.35 */
  target: number;
  /** revenue / target * 100 */
  achievementPct: number;
  totalFeatures: number;
  featuresInProgress: number;
  featuresCompleted: number;
  featuresPlanned: number;
  totalReleases: number;
  activeReleases: number;
  completedReleases: number;
}

// ── Portfolio-level metrics (aggregated from products) ──
export interface PortfolioMetrics {
  portfolioId: number;
  portfolioName: string;
  portfolioCode: string;
  priority: string;
  revenue: number;
  planned: number;
  cost: number;
  profit: number;
  margin: number;
  annualPlanned: number;
  target: number;
  achievementPct: number;
  productCount: number;
  totalFeatures: number;
  featuresInProgress: number;
  featuresCompleted: number;
  featuresPlanned: number;
  totalReleases: number;
  activeReleases: number;
  completedReleases: number;
  productMetrics: ProductMetrics[];
}

// ── Department-level metrics (aggregated from portfolios) ──
export interface DepartmentMetrics {
  departmentName: string;
  revenue: number;
  planned: number;
  cost: number;
  profit: number;
  margin: number;
  annualPlanned: number;
  target: number;
  achievementPct: number;
  totalPortfolios: number;
  totalProducts: number;
  totalFeatures: number;
  featuresInProgress: number;
  featuresCompleted: number;
  featuresPlanned: number;
  totalReleases: number;
  activeReleases: number;
  completedReleases: number;
  portfolioMetrics: PortfolioMetrics[];
}

// ── Compute product-level metrics ──
// `monthKeys` = months in the active date window (for revenue + cost).
// `annualMonthKeys` = full-year month keys (for fixed annual target/planned).
function computeProductMetrics(
  product: Product,
  state: AppState,
  monthKeys: string[],
  annualMonthKeys: string[],
): ProductMetrics {
  const features = state.features.filter(f => f.productId === product.id);
  const releases = state.releases.filter(r => r.productId === product.id);
  const featureIds = new Set(features.map(f => f.id));

  // Filtered (window) revenue + planned
  const monthSet = new Set(monthKeys);
  let revenue = 0;
  let planned = 0;
  state.revenueActual.forEach(r => {
    if (featureIds.has(r.featureId) && monthSet.has(r.month)) revenue += r.actual;
  });
  state.revenuePlan.forEach(r => {
    if (featureIds.has(r.featureId) && monthSet.has(r.month)) planned += r.expected;
  });

  // Full-year planned for fixed annual target
  const annualSet = new Set(annualMonthKeys);
  let annualPlanned = 0;
  state.revenuePlan.forEach(r => {
    if (featureIds.has(r.featureId) && annualSet.has(r.month)) annualPlanned += r.expected;
  });

  // Cost over the active window (uses shared helper)
  const productCosts = state.costs.filter(c => c.productId === product.id);
  const cost = computeCostForMonths(productCosts, monthKeys);

  // Target = sum of feature Target Revenue for the active window (no multiplier).
  // Feature level is the single source of truth.
  const target = planned;
  const profit = revenue - cost;
  const achievementPct = target > 0 ? Math.round((revenue / target) * 100) : 0;

  return {
    productId: product.id,
    productName: product.name,
    productCode: product.code,
    portfolioId: product.portfolioId,
    lifecycle: product.lifecycleStage || 'Development',
    status: product.status,
    revenue,
    planned,
    cost,
    profit,
    margin: revenue > 0 ? (profit / revenue) * 100 : 0,
    annualPlanned,
    target,
    achievementPct,
    totalFeatures: features.length,
    featuresInProgress: features.filter(f => f.status === 'In Progress').length,
    featuresCompleted: features.filter(f => f.status === 'Delivered').length,
    featuresPlanned: features.filter(f => f.status === 'To Do').length,
    totalReleases: releases.length,
    activeReleases: releases.filter(r => r.status === 'In Progress').length,
    completedReleases: releases.filter(r => r.status === 'Released').length,
  };
}

// ── Aggregate product metrics into portfolio metrics ──
function computePortfolioMetrics(portfolio: Portfolio, productMetrics: ProductMetrics[]): PortfolioMetrics {
  const pm = productMetrics.filter(p => p.portfolioId === portfolio.id);

  const revenue = pm.reduce((s, p) => s + p.revenue, 0);
  const planned = pm.reduce((s, p) => s + p.planned, 0);
  const cost = pm.reduce((s, p) => s + p.cost, 0);
  const annualPlanned = pm.reduce((s, p) => s + p.annualPlanned, 0);
  // Roll-up: Portfolio target = sum of product targets (= sum of feature targets in window).
  const target = planned;
  const profit = revenue - cost;
  const achievementPct = target > 0 ? Math.round((revenue / target) * 100) : 0;

  return {
    portfolioId: portfolio.id,
    portfolioName: portfolio.name,
    portfolioCode: portfolio.code,
    priority: portfolio.priority,
    revenue,
    planned,
    cost,
    profit,
    margin: revenue > 0 ? (profit / revenue) * 100 : 0,
    annualPlanned,
    target,
    achievementPct,
    productCount: pm.length,
    totalFeatures: pm.reduce((s, p) => s + p.totalFeatures, 0),
    featuresInProgress: pm.reduce((s, p) => s + p.featuresInProgress, 0),
    featuresCompleted: pm.reduce((s, p) => s + p.featuresCompleted, 0),
    featuresPlanned: pm.reduce((s, p) => s + p.featuresPlanned, 0),
    totalReleases: pm.reduce((s, p) => s + p.totalReleases, 0),
    activeReleases: pm.reduce((s, p) => s + p.activeReleases, 0),
    completedReleases: pm.reduce((s, p) => s + p.completedReleases, 0),
    productMetrics: pm,
  };
}

// ── Main hook: computes full hierarchy ──
// Pass `dateFilter` to honor the global date window. Without it, defaults
// to the current calendar year so behaviour is deterministic.
export function useHierarchicalMetrics(
  state: AppState,
  dateFilter?: DateWindow | null,
): DepartmentMetrics {
  return useMemo(() => {
    // Resolve active window (default: current calendar year)
    const now = new Date();
    const window: DateWindow = dateFilter ?? {
      startDate: new Date(now.getFullYear(), 0, 1),
      endDate: new Date(now.getFullYear(), 11, 31),
    };
    const monthKeys = monthsInDateRange(window);

    // Annual window for fixed target = full calendar year of the filter's start date
    const annualWindow: DateWindow = {
      startDate: new Date(window.startDate.getFullYear(), 0, 1),
      endDate: new Date(window.startDate.getFullYear(), 11, 31),
    };
    const annualMonthKeys = monthsInDateRange(annualWindow);

    // Level 1: Product metrics
    const allProductMetrics = state.products.map(p =>
      computeProductMetrics(p, state, monthKeys, annualMonthKeys),
    );

    // Level 2: Portfolio metrics
    const allPortfolioMetrics = state.portfolios.map(port =>
      computePortfolioMetrics(port, allProductMetrics),
    );

    // Level 3: Department metrics
    const revenue = allPortfolioMetrics.reduce((s, p) => s + p.revenue, 0);
    const planned = allPortfolioMetrics.reduce((s, p) => s + p.planned, 0);
    const cost = allPortfolioMetrics.reduce((s, p) => s + p.cost, 0);
    const annualPlanned = allPortfolioMetrics.reduce((s, p) => s + p.annualPlanned, 0);
    // Roll-up: Department target = sum of portfolio targets.
    const target = planned;
    const profit = revenue - cost;
    const achievementPct = target > 0 ? Math.round((revenue / target) * 100) : 0;

    return {
      departmentName: state.department.name,
      revenue,
      planned,
      cost,
      profit,
      margin: revenue > 0 ? (profit / revenue) * 100 : 0,
      annualPlanned,
      target,
      achievementPct,
      totalPortfolios: state.portfolios.length,
      totalProducts: state.products.length,
      totalFeatures: allPortfolioMetrics.reduce((s, p) => s + p.totalFeatures, 0),
      featuresInProgress: allPortfolioMetrics.reduce((s, p) => s + p.featuresInProgress, 0),
      featuresCompleted: allPortfolioMetrics.reduce((s, p) => s + p.featuresCompleted, 0),
      featuresPlanned: allPortfolioMetrics.reduce((s, p) => s + p.featuresPlanned, 0),
      totalReleases: allPortfolioMetrics.reduce((s, p) => s + p.totalReleases, 0),
      activeReleases: allPortfolioMetrics.reduce((s, p) => s + p.activeReleases, 0),
      completedReleases: allPortfolioMetrics.reduce((s, p) => s + p.completedReleases, 0),
      portfolioMetrics: allPortfolioMetrics,
    };
  }, [state, dateFilter]);
}

// ── Convenience hooks for specific levels ──
export function usePortfolioMetrics(
  state: AppState,
  portfolioId: number,
  dateFilter?: DateWindow | null,
): PortfolioMetrics | undefined {
  const dept = useHierarchicalMetrics(state, dateFilter);
  return dept.portfolioMetrics.find(p => p.portfolioId === portfolioId);
}

export function useProductMetrics(
  state: AppState,
  productId: number,
  dateFilter?: DateWindow | null,
): ProductMetrics | undefined {
  const dept = useHierarchicalMetrics(state, dateFilter);
  for (const port of dept.portfolioMetrics) {
    const found = port.productMetrics.find(p => p.productId === productId);
    if (found) return found;
  }
  return undefined;
}

import { useMemo } from 'react';
import { AppState, Product, Portfolio } from '@/types';

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
function computeProductMetrics(product: Product, state: AppState): ProductMetrics {
  const features = state.features.filter(f => f.productId === product.id);
  const releases = state.releases.filter(r => r.productId === product.id);

  let revenue = 0, planned = 0, cost = 0;

  features.forEach(f => {
    state.revenueActual.filter(r => r.featureId === f.id).forEach(r => { revenue += r.actual; });
    state.revenuePlan.filter(r => r.featureId === f.id).forEach(r => { planned += r.expected; });
  });

  state.costs.filter(c => c.productId === product.id).forEach(c => {
    if (c.type === 'CAPEX' && c.total && c.amortization) {
      cost += (c.total / c.amortization) * 6;
    } else if (c.monthly) {
      cost += c.monthly * 6;
    }
  });

  const profit = revenue - cost;

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
    totalFeatures: features.length,
    featuresInProgress: features.filter(f => f.status === 'In Progress').length,
    featuresCompleted: features.filter(f => f.status === 'Delivered').length,
    featuresPlanned: features.filter(f => f.status === 'Planned').length,
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
  const profit = revenue - cost;

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
export function useHierarchicalMetrics(state: AppState): DepartmentMetrics {
  return useMemo(() => {
    // Level 1: Product metrics (from features + costs)
    const allProductMetrics = state.products.map(p => computeProductMetrics(p, state));

    // Level 2: Portfolio metrics (from products)
    const allPortfolioMetrics = state.portfolios.map(port => computePortfolioMetrics(port, allProductMetrics));

    // Level 3: Department metrics (from portfolios)
    const revenue = allPortfolioMetrics.reduce((s, p) => s + p.revenue, 0);
    const planned = allPortfolioMetrics.reduce((s, p) => s + p.planned, 0);
    const cost = allPortfolioMetrics.reduce((s, p) => s + p.cost, 0);
    const profit = revenue - cost;

    return {
      departmentName: state.department.name,
      revenue,
      planned,
      cost,
      profit,
      margin: revenue > 0 ? (profit / revenue) * 100 : 0,
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
  }, [state]);
}

// ── Convenience hooks for specific levels ──
export function usePortfolioMetrics(state: AppState, portfolioId: number): PortfolioMetrics | undefined {
  const dept = useHierarchicalMetrics(state);
  return dept.portfolioMetrics.find(p => p.portfolioId === portfolioId);
}

export function useProductMetrics(state: AppState, productId: number): ProductMetrics | undefined {
  const dept = useHierarchicalMetrics(state);
  for (const port of dept.portfolioMetrics) {
    const found = port.productMetrics.find(p => p.productId === productId);
    if (found) return found;
  }
  return undefined;
}

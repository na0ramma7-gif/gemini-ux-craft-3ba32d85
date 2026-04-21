// Per-feature, per-service forecast engine.
//
// Phase A: Simple mode (per-service compound growth).
// Phase B: Seasonal mode (12-value multiplier presets) + Matrix mode
//          (per-cell overrides). Each scenario stores its own mode
//          independently. Storage key bumped to v2; v1 data migrates
//          forward as Simple mode with no data loss.

export type ForecastScenarioId = string;
export type ForecastMode = 'simple' | 'seasonal' | 'matrix';

/** Built-in seasonal preset ids. 'custom' uses the user-defined multipliers. */
export type SeasonalPresetId =
  | 'flat'
  | 'ramadan'
  | 'summer'
  | 'yearEnd'
  | 'backToSchool'
  | 'custom';

export interface ServiceAssumption {
  /** RevenueService.id this assumption maps to. */
  serviceId: number;
  /** Monthly growth rate in %. Compounds each month. */
  growthRate: number;
  /** Seasonal preset for this service (when scenario.mode === 'seasonal'). */
  pattern?: SeasonalPresetId;
  /**
   * 12 multipliers (Jan..Dec). Used when pattern === 'custom'. Defaults to all
   * 1.0 if missing. Multiplier 1 = no change, 0.7 = 30% dip, 1.3 = 30% boost.
   */
  customPattern?: number[];
}

/**
 * A single per-cell override for Matrix mode.
 * - serviceId: row
 * - monthIndex: 0..horizon-1 column
 * - tx: the user-specified Tx value for that cell.
 *   Semantics: override wins for that month; subsequent months continue
 *   compounding growth from the override value.
 */
export interface MatrixOverride {
  serviceId: number;
  monthIndex: number;
  tx: number;
}

export interface ForecastScenario {
  id: ForecastScenarioId;
  name: string;
  /** Visual color tag — semantic key, not raw hex. */
  tone: 'neutral' | 'success' | 'warning' | 'primary' | 'accent';
  mode: ForecastMode;
  /** Per-service growth %. Missing services fall back to defaultGrowthRate. */
  services: ServiceAssumption[];
  /** Default growth applied to services without an explicit entry. */
  defaultGrowthRate: number;
  /** Cost growth %, compounded monthly. */
  costGrowthRate: number;
  /** Manual per-cell overrides (Matrix mode). */
  cellOverrides?: MatrixOverride[];
  /**
   * Optional manual override of which Gregorian month (0..11) Ramadan
   * falls in for this scenario. When unset, the auto-detect lookup is used
   * based on the forecast start year.
   */
  ramadanMonthOverride?: number | null;
  /** Built-in tabs cannot be deleted. Custom scenarios can. */
  builtIn?: boolean;
}

export interface FeatureForecastSettings {
  /** Bumped to 2 with Phase B. */
  schemaVersion: 2;
  scenarios: ForecastScenario[];
  activeScenarioId: ForecastScenarioId;
  horizon: 6 | 12 | 24;
}

export const FEATURE_FORECAST_KEY = (featureId: number) =>
  `forecast.feature.${featureId}.v2`;

/** Legacy v1 key retained for one-time migration. */
const FEATURE_FORECAST_KEY_V1 = (featureId: number) =>
  `forecast.feature.${featureId}.v1`;

export const MAX_SCENARIOS = 5;

/** Default scenarios bootstrap a fresh feature. */
export const buildDefaultSettings = (): FeatureForecastSettings => ({
  horizon: 12,
  activeScenarioId: 'baseline',
  scenarios: [
    {
      id: 'baseline',
      name: 'Baseline',
      tone: 'neutral',
      mode: 'simple',
      services: [],
      defaultGrowthRate: 5,
      costGrowthRate: 2,
      builtIn: true,
    },
    {
      id: 'optimistic',
      name: 'Optimistic',
      tone: 'success',
      mode: 'simple',
      services: [],
      defaultGrowthRate: 10,
      costGrowthRate: 1.5,
      builtIn: true,
    },
    {
      id: 'conservative',
      name: 'Conservative',
      tone: 'warning',
      mode: 'simple',
      services: [],
      defaultGrowthRate: 2,
      costGrowthRate: 3,
      builtIn: true,
    },
  ],
});

export const loadFeatureForecastSettings = (
  featureId: number,
): FeatureForecastSettings => {
  if (typeof window === 'undefined') return buildDefaultSettings();
  try {
    const raw = window.localStorage.getItem(FEATURE_FORECAST_KEY(featureId));
    if (!raw) return buildDefaultSettings();
    const parsed = JSON.parse(raw) as Partial<FeatureForecastSettings>;
    const defaults = buildDefaultSettings();
    const scenarios =
      Array.isArray(parsed.scenarios) && parsed.scenarios.length > 0
        ? (parsed.scenarios as ForecastScenario[]).map(s => ({
            ...s,
            services: Array.isArray(s.services) ? s.services : [],
            mode: 'simple' as const,
          }))
        : defaults.scenarios;
    return {
      scenarios,
      activeScenarioId:
        scenarios.find(s => s.id === parsed.activeScenarioId)?.id ?? scenarios[0].id,
      horizon: (parsed.horizon as 6 | 12 | 24) ?? 12,
    };
  } catch {
    return buildDefaultSettings();
  }
};

export const saveFeatureForecastSettings = (
  featureId: number,
  settings: FeatureForecastSettings,
) => {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(
      FEATURE_FORECAST_KEY(featureId),
      JSON.stringify(settings),
    );
  } catch {
    // ignore quota / privacy mode
  }
};

// ── Projection ────────────────────────────────────────────────

export interface ServiceBaselineInput {
  serviceId: number;
  serviceName: string;
  /** SAR per transaction — current default rate (post-Financial Planning Step 1). */
  rate: number;
  /** Avg historical monthly transactions for this service. */
  baseTx: number;
  /** Highest single-month historical Tx — used for sanity flag. */
  highestHistoricalTx: number;
}

export interface ProjectedServiceMonth {
  monthIndex: number;
  tx: number;
  revenue: number;
  /** True if tx > 3 × highestHistoricalTx — soft warning, never blocks. */
  sanityFlag: boolean;
}

export interface ProjectedService {
  serviceId: number;
  serviceName: string;
  rate: number;
  baseTx: number;
  growthRate: number;
  monthly: ProjectedServiceMonth[];
  totalTx: number;
  totalRevenue: number;
}

export interface ForecastProjection {
  services: ProjectedService[];
  monthly: Array<{ monthIndex: number; revenue: number; cost: number; profit: number }>;
  totalRevenue: number;
  totalCost: number;
  totalProfit: number;
  margin: number; // %
  hasCostData: boolean;
}

export const getServiceGrowthRate = (
  scenario: ForecastScenario,
  serviceId: number,
): number => {
  const found = scenario.services.find(s => s.serviceId === serviceId);
  return found ? found.growthRate : scenario.defaultGrowthRate;
};

/**
 * Compound projection of a service's monthly transactions over `horizon`.
 * Month 0 is the FIRST forecast month (already grown from baseTx).
 */
export const projectService = (
  baseline: ServiceBaselineInput,
  growthRate: number,
  horizon: number,
): ProjectedService => {
  const g = growthRate / 100;
  const monthly: ProjectedServiceMonth[] = [];
  let totalTx = 0;
  let totalRevenue = 0;
  for (let i = 0; i < horizon; i++) {
    const tx = Math.max(0, baseline.baseTx) * Math.pow(1 + g, i + 1);
    const revenue = tx * baseline.rate;
    const sanityFlag =
      baseline.highestHistoricalTx > 0 && tx > 3 * baseline.highestHistoricalTx;
    monthly.push({ monthIndex: i, tx, revenue, sanityFlag });
    totalTx += tx;
    totalRevenue += revenue;
  }
  return {
    serviceId: baseline.serviceId,
    serviceName: baseline.serviceName,
    rate: baseline.rate,
    baseTx: baseline.baseTx,
    growthRate,
    monthly,
    totalTx,
    totalRevenue,
  };
};

export interface CostBaselineInput {
  /** Avg historical monthly cost (planned or actual fallback). */
  baseMonthlyCost: number;
  /** True if there is ANY non-zero cost in history. Drives the banner. */
  hasCostData: boolean;
}

export const projectForecast = (
  serviceBaselines: ServiceBaselineInput[],
  costBaseline: CostBaselineInput,
  scenario: ForecastScenario,
  horizon: number,
): ForecastProjection => {
  const services = serviceBaselines.map(b =>
    projectService(b, getServiceGrowthRate(scenario, b.serviceId), horizon),
  );

  const cg = scenario.costGrowthRate / 100;
  const monthly = Array.from({ length: horizon }, (_, i) => {
    const revenue = services.reduce((s, svc) => s + svc.monthly[i].revenue, 0);
    const cost = costBaseline.hasCostData
      ? costBaseline.baseMonthlyCost * Math.pow(1 + cg, i + 1)
      : 0;
    return { monthIndex: i, revenue, cost, profit: revenue - cost };
  });

  const totalRevenue = monthly.reduce((s, m) => s + m.revenue, 0);
  const totalCost = monthly.reduce((s, m) => s + m.cost, 0);
  const totalProfit = totalRevenue - totalCost;
  const margin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;

  return {
    services,
    monthly,
    totalRevenue,
    totalCost,
    totalProfit,
    margin,
    hasCostData: costBaseline.hasCostData,
  };
};

/** Color classes used by scenario chips/badges. Semantic tokens only. */
export const TONE_CLASSES: Record<
  ForecastScenario['tone'],
  { dot: string; bg: string; text: string; border: string; hex: string }
> = {
  neutral: {
    dot: 'bg-muted-foreground',
    bg: 'bg-muted',
    text: 'text-foreground',
    border: 'border-border',
    hex: 'hsl(var(--muted-foreground))',
  },
  success: {
    dot: 'bg-success',
    bg: 'bg-success/10',
    text: 'text-success',
    border: 'border-success/30',
    hex: 'hsl(var(--success))',
  },
  warning: {
    dot: 'bg-warning',
    bg: 'bg-warning/10',
    text: 'text-warning',
    border: 'border-warning/30',
    hex: 'hsl(var(--warning))',
  },
  primary: {
    dot: 'bg-primary',
    bg: 'bg-primary/10',
    text: 'text-primary',
    border: 'border-primary/30',
    hex: 'hsl(var(--primary))',
  },
  accent: {
    dot: 'bg-accent',
    bg: 'bg-accent/10',
    text: 'text-accent',
    border: 'border-accent/30',
    hex: 'hsl(var(--accent))',
  },
};

/** Tones available when creating a custom scenario, in cycle order. */
export const CUSTOM_TONE_CYCLE: ForecastScenario['tone'][] = [
  'primary',
  'accent',
  'warning',
  'success',
  'neutral',
];

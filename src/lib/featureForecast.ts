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
  schemaVersion: 2,
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

/** Normalize a parsed scenario, filling in Phase B fields with safe defaults. */
const normalizeScenario = (raw: any): ForecastScenario => {
  const mode: ForecastMode =
    raw?.mode === 'seasonal' || raw?.mode === 'matrix' ? raw.mode : 'simple';
  const services: ServiceAssumption[] = Array.isArray(raw?.services)
    ? raw.services.map((s: any) => ({
        serviceId: Number(s.serviceId),
        growthRate: Number.isFinite(s.growthRate) ? s.growthRate : 5,
        pattern: typeof s.pattern === 'string' ? (s.pattern as SeasonalPresetId) : 'flat',
        customPattern:
          Array.isArray(s.customPattern) && s.customPattern.length === 12
            ? s.customPattern.map((n: any) => (Number.isFinite(n) ? n : 1))
            : undefined,
      }))
    : [];
  const cellOverrides: MatrixOverride[] = Array.isArray(raw?.cellOverrides)
    ? raw.cellOverrides
        .filter((c: any) => Number.isFinite(c?.serviceId) && Number.isFinite(c?.monthIndex) && Number.isFinite(c?.tx))
        .map((c: any) => ({ serviceId: c.serviceId, monthIndex: c.monthIndex, tx: c.tx }))
    : [];
  return {
    id: String(raw.id),
    name: String(raw.name ?? 'Untitled'),
    tone: ['neutral', 'success', 'warning', 'primary', 'accent'].includes(raw.tone)
      ? raw.tone
      : 'neutral',
    mode,
    services,
    defaultGrowthRate: Number.isFinite(raw.defaultGrowthRate) ? raw.defaultGrowthRate : 5,
    costGrowthRate: Number.isFinite(raw.costGrowthRate) ? raw.costGrowthRate : 2,
    cellOverrides,
    ramadanMonthOverride:
      typeof raw.ramadanMonthOverride === 'number' ? raw.ramadanMonthOverride : null,
    builtIn: !!raw.builtIn,
  };
};

export const loadFeatureForecastSettings = (
  featureId: number,
): FeatureForecastSettings => {
  if (typeof window === 'undefined') return buildDefaultSettings();
  try {
    // Try v2 first, then migrate from v1.
    let raw = window.localStorage.getItem(FEATURE_FORECAST_KEY(featureId));
    if (!raw) {
      const legacy = window.localStorage.getItem(FEATURE_FORECAST_KEY_V1(featureId));
      if (legacy) raw = legacy; // we'll re-save as v2 on next change
    }
    if (!raw) return buildDefaultSettings();
    const parsed = JSON.parse(raw) as Partial<FeatureForecastSettings>;
    const defaults = buildDefaultSettings();
    const scenarios =
      Array.isArray(parsed.scenarios) && parsed.scenarios.length > 0
        ? parsed.scenarios.map(normalizeScenario)
        : defaults.scenarios;
    return {
      schemaVersion: 2,
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

// ── Hijri / Ramadan lookup ────────────────────────────────────

/**
 * Hardcoded Gregorian month (0..11) in which Ramadan PRIMARILY falls per year.
 * Ramadan straddles two Gregorian months; we pick the month that contains
 * the majority (≥ 15) of Ramadan days. Source: Umm al-Qura calendar.
 */
export const RAMADAN_GREGORIAN_MONTH: Record<number, number> = {
  2024: 2,  // Mar 2024
  2025: 1,  // Feb / Mar 2025 — majority in Mar (idx 2)? Actually Mar 1–29 → use 2
  2026: 1,  // Feb 2026
  2027: 1,  // Feb 2027
  2028: 0,  // Jan 2028
  2029: 0,  // Jan 2029
  2030: 11, // Dec 2029 / Jan 2030 — majority in Jan but for year=2030 use Jan(0)
};
// Corrected: 2025 Ramadan = Mar 1 → idx 2; 2026 = Feb 17 → idx 1.
RAMADAN_GREGORIAN_MONTH[2025] = 2;

export const getRamadanMonth = (
  scenario: ForecastScenario,
  year: number,
): number => {
  if (typeof scenario.ramadanMonthOverride === 'number') {
    return Math.max(0, Math.min(11, scenario.ramadanMonthOverride));
  }
  return RAMADAN_GREGORIAN_MONTH[year] ?? 2;
};

// ── Seasonal presets ──────────────────────────────────────────

/**
 * Returns a 12-element multiplier array (Jan..Dec) for a preset.
 * Multipliers center around 1.0; sum is approximately 12 so annual totals
 * are roughly preserved relative to the Simple-mode projection.
 */
export const buildSeasonalMultipliers = (
  preset: SeasonalPresetId,
  custom: number[] | undefined,
  ramadanMonthIdx: number,
): number[] => {
  if (preset === 'flat') return Array(12).fill(1);
  if (preset === 'custom') {
    if (Array.isArray(custom) && custom.length === 12) {
      return custom.map(n => (Number.isFinite(n) && n >= 0 ? n : 1));
    }
    return Array(12).fill(1);
  }
  if (preset === 'summer') {
    // Reduced Jun (5), Jul (6), Aug (7).
    const m = Array(12).fill(1.05);
    m[5] = 0.75; m[6] = 0.7; m[7] = 0.75;
    return m;
  }
  if (preset === 'yearEnd') {
    const m = Array(12).fill(0.96);
    m[10] = 1.25; m[11] = 1.4; // Nov, Dec
    return m;
  }
  if (preset === 'backToSchool') {
    const m = Array(12).fill(0.97);
    m[7] = 1.25; m[8] = 1.3; // Aug, Sep
    return m;
  }
  if (preset === 'ramadan') {
    // Dip in Ramadan month, rebound in the month after Eid (Ramadan + 1).
    const m = Array(12).fill(1.02);
    m[ramadanMonthIdx] = 0.65;
    m[(ramadanMonthIdx + 1) % 12] = 1.25;
    return m;
  }
  return Array(12).fill(1);
};

/**
 * Convenience: get the multipliers for a given service in a scenario for
 * a particular calendar year (used for Ramadan auto-detect).
 */
export const getServiceSeasonalMultipliers = (
  scenario: ForecastScenario,
  serviceId: number,
  year: number,
): number[] => {
  const sa = scenario.services.find(s => s.serviceId === serviceId);
  const preset: SeasonalPresetId = sa?.pattern ?? 'flat';
  const ramadan = getRamadanMonth(scenario, year);
  return buildSeasonalMultipliers(preset, sa?.customPattern, ramadan);
};

/**
 * Compound projection of a service's monthly transactions over `horizon`.
 * Month 0 is the FIRST forecast month (already grown from baseTx).
 *
 * Phase B additions:
 *  - When `mode === 'seasonal'`, applies a 12-month multiplier (looked up by
 *    the Gregorian month of the forecast slot).
 *  - When `mode === 'matrix'`, applies any per-cell override; subsequent
 *    months continue compounding growth from the override value
 *    (override-wins-then-resume semantics).
 */
export interface ProjectServiceOptions {
  /** Forecast mode for this projection. */
  mode?: ForecastMode;
  /** First forecast month as a Date (year + 0-indexed month). */
  forecastStartDate?: Date;
  /** 12-element multiplier array, indexed by calendar month (Jan..Dec). */
  seasonalMultipliers?: (year: number) => number[];
  /** monthIndex → tx override for THIS service. */
  overridesByMonth?: Map<number, number>;
}

export const projectService = (
  baseline: ServiceBaselineInput,
  growthRate: number,
  horizon: number,
  opts: ProjectServiceOptions = {},
): ProjectedService => {
  const g = growthRate / 100;
  const monthly: ProjectedServiceMonth[] = [];
  let totalTx = 0;
  let totalRevenue = 0;
  const start = opts.forecastStartDate ?? new Date();
  // Track the rolling "current" tx so overrides become the new growth base.
  let currentTx = Math.max(0, baseline.baseTx);
  for (let i = 0; i < horizon; i++) {
    const date = new Date(start.getFullYear(), start.getMonth() + i, 1);
    const calMonth = date.getMonth();
    const calYear = date.getFullYear();

    const overrideTx = opts.overridesByMonth?.get(i);
    let tx: number;
    if (overrideTx != null && Number.isFinite(overrideTx)) {
      tx = Math.max(0, overrideTx);
      currentTx = tx; // new baseline for compounding
    } else {
      currentTx = currentTx * (1 + g);
      tx = currentTx;
      if (opts.mode === 'seasonal' && opts.seasonalMultipliers) {
        const mults = opts.seasonalMultipliers(calYear);
        const mult = mults[calMonth] ?? 1;
        tx = tx * mult;
        // NB: we do NOT reset currentTx — seasonal swing should not bleed
        // into next month's compounded baseline. Only overrides re-baseline.
      }
    }

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
  forecastStartDate: Date = new Date(),
): ForecastProjection => {
  const overridesByService = new Map<number, Map<number, number>>();
  if (scenario.mode === 'matrix' && scenario.cellOverrides) {
    for (const o of scenario.cellOverrides) {
      if (!overridesByService.has(o.serviceId)) {
        overridesByService.set(o.serviceId, new Map());
      }
      overridesByService.get(o.serviceId)!.set(o.monthIndex, o.tx);
    }
  }
  const services = serviceBaselines.map(b =>
    projectService(b, getServiceGrowthRate(scenario, b.serviceId), horizon, {
      mode: scenario.mode,
      forecastStartDate,
      seasonalMultipliers:
        scenario.mode === 'seasonal'
          ? (year: number) => getServiceSeasonalMultipliers(scenario, b.serviceId, year)
          : undefined,
      overridesByMonth: overridesByService.get(b.serviceId),
    }),
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

// Forecast scenario engine — single source of truth for the
// Department Dashboard "Revenue Pipeline" projections.
//
// All scenario maths (Baseline / Optimistic / Conservative) live here so
// that summary cards, the stacked pipeline chart, the tooltip and the
// upcoming revenue drivers table always agree.

export type ScenarioType = 'baseline' | 'optimistic' | 'conservative';
export type GrowthMode = 'compound' | 'linear';
export type HorizonMonths = 12 | 24 | 36;

export interface ScenarioConfig {
  // Core
  growthMode: GrowthMode;
  growthRate: number;          // % per month
  revenueAdjustment: number;   // % +/- applied to base
  conversionRate: number;      // % of pipeline expected to convert (1..100)
  rampFactor: number;          // % ramp/slowdown per month (compounded)
  // Advanced
  riskBuffer: number;          // % reduction applied at the end
  spikeMonthIndex: number | null; // 0-based index inside horizon, null = off
  spikeAmount: number;         // % uplift on that single month
  monthlyCap: number | null;   // absolute monthly ceiling, null = off
  seasonality: number[];       // length 12 multipliers (1 = neutral). Optional.
}

export interface ScenarioConfigs {
  baseline: ScenarioConfig;
  optimistic: ScenarioConfig;
  conservative: ScenarioConfig;
}

const flatSeasonality = (): number[] => Array(12).fill(1);

export const SCENARIO_PRESETS: ScenarioConfigs = {
  baseline: {
    growthMode: 'compound',
    growthRate: 5,
    revenueAdjustment: 0,
    conversionRate: 80,
    rampFactor: 0,
    riskBuffer: 0,
    spikeMonthIndex: null,
    spikeAmount: 0,
    monthlyCap: null,
    seasonality: flatSeasonality(),
  },
  optimistic: {
    growthMode: 'compound',
    growthRate: 10,
    revenueAdjustment: 8,
    conversionRate: 90,
    rampFactor: 1.5,
    riskBuffer: 0,
    spikeMonthIndex: null,
    spikeAmount: 0,
    monthlyCap: null,
    seasonality: flatSeasonality(),
  },
  conservative: {
    growthMode: 'compound',
    growthRate: 2,
    revenueAdjustment: -5,
    conversionRate: 65,
    rampFactor: -1,
    riskBuffer: 10,
    spikeMonthIndex: null,
    spikeAmount: 0,
    monthlyCap: null,
    seasonality: flatSeasonality(),
  },
};

export const DEFAULT_HORIZON: HorizonMonths = 12;

export interface ValidationIssue {
  field: keyof ScenarioConfig | 'general';
  message: string;
}

export const validateScenarioConfig = (cfg: ScenarioConfig): ValidationIssue[] => {
  const issues: ValidationIssue[] = [];
  const inRange = (v: number, min: number, max: number) => v >= min && v <= max;

  if (!Number.isFinite(cfg.growthRate) || !inRange(cfg.growthRate, -50, 50)) {
    issues.push({ field: 'growthRate', message: 'Growth rate must be between -50% and 50% per month.' });
  }
  if (!Number.isFinite(cfg.revenueAdjustment) || !inRange(cfg.revenueAdjustment, -100, 100)) {
    issues.push({ field: 'revenueAdjustment', message: 'Revenue adjustment must be between -100% and 100%.' });
  }
  if (!Number.isFinite(cfg.conversionRate) || !inRange(cfg.conversionRate, 1, 100)) {
    issues.push({ field: 'conversionRate', message: 'Conversion rate must be between 1% and 100%.' });
  }
  if (!Number.isFinite(cfg.rampFactor) || !inRange(cfg.rampFactor, -20, 20)) {
    issues.push({ field: 'rampFactor', message: 'Ramp factor must be between -20% and 20% per month.' });
  }
  if (!Number.isFinite(cfg.riskBuffer) || !inRange(cfg.riskBuffer, 0, 50)) {
    issues.push({ field: 'riskBuffer', message: 'Risk buffer must be between 0% and 50%.' });
  }
  if (cfg.spikeMonthIndex !== null) {
    if (cfg.spikeMonthIndex < 0 || cfg.spikeMonthIndex > 35) {
      issues.push({ field: 'spikeMonthIndex', message: 'Spike month is out of range.' });
    }
    if (!Number.isFinite(cfg.spikeAmount) || !inRange(cfg.spikeAmount, -100, 200)) {
      issues.push({ field: 'spikeAmount', message: 'Spike amount must be between -100% and 200%.' });
    }
  }
  if (cfg.monthlyCap !== null && (!Number.isFinite(cfg.monthlyCap) || cfg.monthlyCap <= 0)) {
    issues.push({ field: 'monthlyCap', message: 'Monthly cap must be a positive number.' });
  }

  return issues;
};

export interface MonthProjection {
  monthIndex: number;          // 0-based from forecast start
  base: number;                // raw base revenue for that month
  adjusted: number;            // after adjustment + growth + ramp + spike
  converted: number;           // after conversion + risk buffer + cap
  appliedGrowthPct: number;    // cumulative growth %
  appliedConversionPct: number;
}

/**
 * Project a single month's revenue from a base value.
 * monthIndex is 0-based.
 */
export const projectMonth = (
  base: number,
  monthIndex: number,
  cfg: ScenarioConfig,
  seasonalIndex = 0,
): MonthProjection => {
  const g = cfg.growthRate / 100;
  const r = cfg.rampFactor / 100;

  // Growth multiplier
  const growthMul =
    cfg.growthMode === 'compound'
      ? Math.pow(1 + g, monthIndex)
      : 1 + g * monthIndex;

  // Ramp compounds on top of growth
  const rampMul = Math.pow(1 + r, monthIndex);

  // Adjustment
  const adjMul = 1 + cfg.revenueAdjustment / 100;

  // Seasonality (12-month cycle)
  const seasonMul = cfg.seasonality?.[seasonalIndex % 12] ?? 1;

  // Spike (single month)
  const spikeMul =
    cfg.spikeMonthIndex !== null && cfg.spikeMonthIndex === monthIndex
      ? 1 + cfg.spikeAmount / 100
      : 1;

  let adjusted = Math.max(0, base) * growthMul * rampMul * adjMul * seasonMul * spikeMul;

  // Conversion + risk buffer
  const convMul = cfg.conversionRate / 100;
  const bufferMul = 1 - cfg.riskBuffer / 100;
  let converted = adjusted * convMul * bufferMul;

  // Monthly cap
  if (cfg.monthlyCap && cfg.monthlyCap > 0) {
    converted = Math.min(converted, cfg.monthlyCap);
  }

  const appliedGrowthPct = (growthMul * rampMul - 1) * 100;

  return {
    monthIndex,
    base,
    adjusted,
    converted,
    appliedGrowthPct,
    appliedConversionPct: cfg.conversionRate * (1 - cfg.riskBuffer / 100),
  };
};

/**
 * Project a series of months from a base monthly average.
 * Returns one entry per month from index 0 → horizon-1.
 */
export const projectSeries = (
  baseMonthly: number,
  horizon: number,
  cfg: ScenarioConfig,
  startSeasonIndex = 0,
): MonthProjection[] => {
  const out: MonthProjection[] = [];
  for (let i = 0; i < horizon; i++) {
    out.push(projectMonth(baseMonthly, i, cfg, startSeasonIndex + i));
  }
  return out;
};

export const sumConverted = (series: MonthProjection[]): number =>
  series.reduce((s, m) => s + m.converted, 0);

export const STORAGE_KEY = 'forecast.scenarioConfigs.v1';

export const loadScenarioConfigs = (): ScenarioConfigs => {
  try {
    const raw = typeof window !== 'undefined' ? window.localStorage.getItem(STORAGE_KEY) : null;
    if (!raw) return SCENARIO_PRESETS;
    const parsed = JSON.parse(raw) as Partial<ScenarioConfigs>;
    return {
      baseline: { ...SCENARIO_PRESETS.baseline, ...(parsed.baseline ?? {}) },
      optimistic: { ...SCENARIO_PRESETS.optimistic, ...(parsed.optimistic ?? {}) },
      conservative: { ...SCENARIO_PRESETS.conservative, ...(parsed.conservative ?? {}) },
    };
  } catch {
    return SCENARIO_PRESETS;
  }
};

export const saveScenarioConfigs = (cfgs: ScenarioConfigs) => {
  try {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(cfgs));
    }
  } catch {
    // ignore
  }
};
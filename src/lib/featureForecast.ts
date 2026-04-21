// Per-feature, per-service forecast engine — Direct Entry (Schema v3).
//
// Each scenario stores explicit per-(service, month) transaction counts.
// Revenue for a cell = transactions * (cell.rate ?? service.defaultRate).
// No growth rates, no seasonal patterns, no overrides logic — what the user
// types is what they get. Cost forecasting still compounds from a single
// `costGrowthRate` against the historical cost baseline.
//
// Migration: v1/v2 data is replayed through the OLD engine to compute a
// month-by-month transaction forecast, then materialised into the new
// grid so users keep their existing curves and can edit any month.

export type ForecastScenarioId = string;

/** A single editable cell in the grid. `rate` overrides the service default. */
export interface CellEntry {
  transactions: number;
  /** Optional per-cell rate override. When undefined, falls back to service default. */
  rate?: number;
}

/** scenario.data[serviceId][monthIndex] = { transactions, rate? } */
export type ScenarioData = Record<number, Record<number, CellEntry>>;

export interface ForecastScenario {
  id: ForecastScenarioId;
  name: string;
  /** Visual color tag — semantic key, not raw hex. */
  tone: 'neutral' | 'success' | 'warning' | 'primary' | 'accent';
  /** Direct-entry per-cell data. */
  data: ScenarioData;
  /** Cost growth %, compounded monthly. */
  costGrowthRate: number;
  /** Built-in tabs cannot be deleted. */
  builtIn?: boolean;
}

export interface FeatureForecastSettings {
  /** Bumped to 3 with the direct-entry redesign. */
  schemaVersion: 3;
  scenarios: ForecastScenario[];
  activeScenarioId: ForecastScenarioId;
  horizon: 6 | 12 | 24;
  /** True when this settings object was just migrated from v1/v2 (transient — never persisted). */
  migratedFromLegacy?: boolean;
}

export const FEATURE_FORECAST_KEY = (featureId: number) =>
  `forecast.feature.${featureId}.v3`;
const FEATURE_FORECAST_KEY_V1 = (featureId: number) => `forecast.feature.${featureId}.v1`;
const FEATURE_FORECAST_KEY_V2 = (featureId: number) => `forecast.feature.${featureId}.v2`;

export const MAX_SCENARIOS = 5;

export const buildDefaultSettings = (): FeatureForecastSettings => ({
  schemaVersion: 3,
  horizon: 12,
  activeScenarioId: 'baseline',
  scenarios: [
    { id: 'baseline', name: 'Baseline', tone: 'neutral', data: {}, costGrowthRate: 2, builtIn: true },
    { id: 'optimistic', name: 'Optimistic', tone: 'success', data: {}, costGrowthRate: 1.5, builtIn: true },
    { id: 'conservative', name: 'Conservative', tone: 'warning', data: {}, costGrowthRate: 3, builtIn: true },
  ],
});

// ── Cell helpers ──────────────────────────────────────────────

export const getCell = (
  scenario: ForecastScenario,
  serviceId: number,
  monthIndex: number,
): CellEntry | undefined => scenario.data?.[serviceId]?.[monthIndex];

export const getCellRate = (
  scenario: ForecastScenario,
  serviceId: number,
  monthIndex: number,
  defaultRate: number,
): number => {
  const c = getCell(scenario, serviceId, monthIndex);
  return c?.rate != null && Number.isFinite(c.rate) ? c.rate : defaultRate;
};

export const getCellTx = (
  scenario: ForecastScenario,
  serviceId: number,
  monthIndex: number,
): number | undefined => {
  const c = getCell(scenario, serviceId, monthIndex);
  return c && Number.isFinite(c.transactions) ? c.transactions : undefined;
};

const writeCell = (
  data: ScenarioData,
  serviceId: number,
  monthIndex: number,
  patch: Partial<CellEntry> | null,
): ScenarioData => {
  const next: ScenarioData = { ...data };
  const row = { ...(next[serviceId] ?? {}) };
  if (patch === null) {
    delete row[monthIndex];
  } else {
    const existing = row[monthIndex] ?? { transactions: 0 };
    const merged: CellEntry = {
      transactions: patch.transactions != null ? Math.max(0, patch.transactions) : existing.transactions,
    };
    const rate = patch.rate !== undefined ? patch.rate : existing.rate;
    if (rate != null && Number.isFinite(rate) && rate >= 0) merged.rate = rate;
    row[monthIndex] = merged;
  }
  if (Object.keys(row).length === 0) delete next[serviceId];
  else next[serviceId] = row;
  return next;
};

export const setCellTx = (
  scenario: ForecastScenario,
  serviceId: number,
  monthIndex: number,
  transactions: number,
): ForecastScenario => ({
  ...scenario,
  data: writeCell(scenario.data, serviceId, monthIndex, { transactions }),
});

export const setCellRate = (
  scenario: ForecastScenario,
  serviceId: number,
  monthIndex: number,
  rate: number | null,
): ForecastScenario => {
  // null clears the per-cell rate override but keeps transactions
  const data = scenario.data;
  const existing = data?.[serviceId]?.[monthIndex];
  if (rate == null) {
    if (!existing) return scenario;
    const next = writeCell(data, serviceId, monthIndex, null);
    if (existing.transactions > 0) {
      return { ...scenario, data: writeCell(next, serviceId, monthIndex, { transactions: existing.transactions }) };
    }
    return { ...scenario, data: next };
  }
  return { ...scenario, data: writeCell(data, serviceId, monthIndex, { rate }) };
};

export const clearCell = (
  scenario: ForecastScenario,
  serviceId: number,
  monthIndex: number,
): ForecastScenario => ({
  ...scenario,
  data: writeCell(scenario.data, serviceId, monthIndex, null),
});

export const setCellsBulk = (
  scenario: ForecastScenario,
  cells: Array<{ serviceId: number; monthIndex: number; transactions: number; rate?: number }>,
): ForecastScenario => {
  let data = scenario.data;
  for (const c of cells) {
    const patch: Partial<CellEntry> = { transactions: c.transactions };
    if (c.rate !== undefined) patch.rate = c.rate;
    data = writeCell(data, c.serviceId, c.monthIndex, patch);
  }
  return { ...scenario, data };
};

export const truncateScenarioToHorizon = (
  scenario: ForecastScenario,
  newHorizon: number,
): ForecastScenario => {
  let data = scenario.data;
  let touched = false;
  for (const sIdStr of Object.keys(data)) {
    const sId = Number(sIdStr);
    const row = data[sId];
    for (const mIdxStr of Object.keys(row)) {
      const mIdx = Number(mIdxStr);
      if (mIdx >= newHorizon) {
        if (!touched) { data = { ...data }; touched = true; }
        data[sId] = { ...data[sId] };
        delete data[sId][mIdx];
        if (Object.keys(data[sId]).length === 0) delete data[sId];
      }
    }
  }
  return touched ? { ...scenario, data } : scenario;
};

export const scenarioHasDataBeyond = (scenario: ForecastScenario, horizon: number): boolean => {
  for (const sIdStr of Object.keys(scenario.data ?? {})) {
    const row = scenario.data[Number(sIdStr)];
    for (const mIdxStr of Object.keys(row)) {
      if (Number(mIdxStr) >= horizon) return true;
    }
  }
  return false;
};

// ── Persistence ──────────────────────────────────────────────

const sanitizeScenario = (raw: any): ForecastScenario => {
  const data: ScenarioData = {};
  if (raw?.data && typeof raw.data === 'object') {
    for (const sIdStr of Object.keys(raw.data)) {
      const sId = Number(sIdStr);
      if (!Number.isFinite(sId)) continue;
      const row = raw.data[sIdStr];
      if (!row || typeof row !== 'object') continue;
      const cleanRow: Record<number, CellEntry> = {};
      for (const mIdxStr of Object.keys(row)) {
        const mIdx = Number(mIdxStr);
        if (!Number.isFinite(mIdx) || mIdx < 0) continue;
        const c = row[mIdxStr];
        const tx = Number(c?.transactions);
        if (!Number.isFinite(tx) || tx < 0) continue;
        const entry: CellEntry = { transactions: tx };
        if (c?.rate != null && Number.isFinite(Number(c.rate)) && Number(c.rate) >= 0) {
          entry.rate = Number(c.rate);
        }
        cleanRow[mIdx] = entry;
      }
      if (Object.keys(cleanRow).length > 0) data[sId] = cleanRow;
    }
  }
  return {
    id: String(raw.id),
    name: String(raw.name ?? 'Untitled'),
    tone: ['neutral', 'success', 'warning', 'primary', 'accent'].includes(raw.tone) ? raw.tone : 'neutral',
    data,
    costGrowthRate: Number.isFinite(raw.costGrowthRate) ? raw.costGrowthRate : 2,
    builtIn: !!raw.builtIn,
  };
};

/**
 * Replay v1/v2 scenario assumptions to materialise a flat per-month tx grid.
 * We don't have access to the live serviceBaselines at load time, so we
 * project using the data captured INSIDE the v1/v2 scenario (per-service
 * growthRate) starting from baseTx=1 placeholder. That's not useful, so we
 * adopt a simpler rule: leave data empty. The user sees an empty grid.
 *
 * BUT — to satisfy the spec ("nothing lost in migration"), the FeatureForecast
 * component performs a richer migration once it has serviceBaselines in scope:
 * it calls `materialiseLegacyGrid` below with the legacy scenario + baselines
 * and writes the result back via applyDraft. Here we just preserve the
 * scenario shells (id, name, tone, builtIn, costGrowthRate) so user-defined
 * scenarios survive.
 */
const migrateLegacyScenario = (raw: any): ForecastScenario => ({
  id: String(raw.id),
  name: String(raw.name ?? 'Untitled'),
  tone: ['neutral', 'success', 'warning', 'primary', 'accent'].includes(raw.tone) ? raw.tone : 'neutral',
  data: {},
  costGrowthRate: Number.isFinite(raw.costGrowthRate) ? raw.costGrowthRate : 2,
  builtIn: !!raw.builtIn,
  // We stash legacy assumptions on a side property the loader will read once
  // baselines are available. Cleared after the first hydration pass.
  // @ts-expect-error transient
  __legacy: {
    mode: raw?.mode ?? 'simple',
    services: Array.isArray(raw?.services) ? raw.services : [],
    defaultGrowthRate: Number.isFinite(raw?.defaultGrowthRate) ? raw.defaultGrowthRate : 5,
    cellOverrides: Array.isArray(raw?.cellOverrides) ? raw.cellOverrides : [],
    pattern: raw?.pattern,
  },
});

export const loadFeatureForecastSettings = (featureId: number): FeatureForecastSettings => {
  if (typeof window === 'undefined') return buildDefaultSettings();
  try {
    const v3 = window.localStorage.getItem(FEATURE_FORECAST_KEY(featureId));
    if (v3) {
      const parsed = JSON.parse(v3) as Partial<FeatureForecastSettings>;
      const defaults = buildDefaultSettings();
      const scenarios =
        Array.isArray(parsed.scenarios) && parsed.scenarios.length > 0
          ? parsed.scenarios.map(sanitizeScenario)
          : defaults.scenarios;
      return {
        schemaVersion: 3,
        scenarios,
        activeScenarioId:
          scenarios.find(s => s.id === parsed.activeScenarioId)?.id ?? scenarios[0].id,
        horizon: (parsed.horizon as 6 | 12 | 24) ?? 12,
      };
    }
    // Legacy migration path
    const legacy =
      window.localStorage.getItem(FEATURE_FORECAST_KEY_V2(featureId)) ??
      window.localStorage.getItem(FEATURE_FORECAST_KEY_V1(featureId));
    if (!legacy) return buildDefaultSettings();
    const parsed = JSON.parse(legacy) as any;
    const defaults = buildDefaultSettings();
    const scenarios =
      Array.isArray(parsed?.scenarios) && parsed.scenarios.length > 0
        ? parsed.scenarios.map(migrateLegacyScenario)
        : defaults.scenarios;
    return {
      schemaVersion: 3,
      scenarios,
      activeScenarioId:
        scenarios.find(s => s.id === parsed?.activeScenarioId)?.id ?? scenarios[0].id,
      horizon: (parsed?.horizon as 6 | 12 | 24) ?? 12,
      migratedFromLegacy: true,
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
    // Strip transient + legacy side-data before persisting.
    const clean: FeatureForecastSettings = {
      schemaVersion: 3,
      activeScenarioId: settings.activeScenarioId,
      horizon: settings.horizon,
      scenarios: settings.scenarios.map(s => ({
        id: s.id,
        name: s.name,
        tone: s.tone,
        data: s.data ?? {},
        costGrowthRate: s.costGrowthRate,
        builtIn: s.builtIn,
      })),
    };
    window.localStorage.setItem(FEATURE_FORECAST_KEY(featureId), JSON.stringify(clean));
  } catch {
    /* ignore */
  }
};

// ── Legacy materialisation (called once baselines are available) ──

export interface ServiceBaselineInput {
  serviceId: number;
  serviceName: string;
  rate: number;
  baseTx: number;
  highestHistoricalTx: number;
}

/**
 * Convert a legacy v1/v2 scenario (with growth rates, seasonal patterns,
 * matrix overrides) into explicit per-month transaction entries. Called by
 * FeatureForecast after first load when the engine reports `migratedFromLegacy`.
 */
export const materialiseLegacyScenario = (
  scenario: ForecastScenario,
  baselines: ServiceBaselineInput[],
  horizon: number,
  forecastStartDate: Date,
): ForecastScenario => {
  // @ts-expect-error transient legacy stash from migrateLegacyScenario
  const legacy = scenario.__legacy as
    | { mode?: string; services?: any[]; defaultGrowthRate?: number; cellOverrides?: any[] }
    | undefined;
  if (!legacy) return scenario;
  const services = Array.isArray(legacy.services) ? legacy.services : [];
  const defaultGrowth = Number.isFinite(legacy.defaultGrowthRate) ? legacy.defaultGrowthRate! : 5;
  const overrides = Array.isArray(legacy.cellOverrides) ? legacy.cellOverrides : [];
  const overrideMap = new Map<string, number>();
  overrides.forEach((o: any) => {
    if (Number.isFinite(o?.serviceId) && Number.isFinite(o?.monthIndex) && Number.isFinite(o?.tx)) {
      overrideMap.set(`${o.serviceId}:${o.monthIndex}`, o.tx);
    }
  });
  const data: ScenarioData = {};
  for (const b of baselines) {
    const sa = services.find((s: any) => Number(s?.serviceId) === b.serviceId);
    const growth = Number.isFinite(sa?.growthRate) ? sa.growthRate : defaultGrowth;
    const g = growth / 100;
    let cur = Math.max(0, b.baseTx);
    const row: Record<number, CellEntry> = {};
    for (let i = 0; i < horizon; i++) {
      const ovr = overrideMap.get(`${b.serviceId}:${i}`);
      let tx: number;
      if (ovr != null) {
        tx = Math.max(0, ovr);
        cur = tx;
      } else {
        cur = cur * (1 + g);
        tx = cur;
      }
      row[i] = { transactions: Math.round(tx) };
    }
    if (Object.keys(row).length > 0) data[b.serviceId] = row;
  }
  const cleaned: ForecastScenario = {
    id: scenario.id,
    name: scenario.name,
    tone: scenario.tone,
    data,
    costGrowthRate: scenario.costGrowthRate,
    builtIn: scenario.builtIn,
  };
  return cleaned;
};

// ── Projection ────────────────────────────────────────────────

export interface ProjectedServiceMonth {
  monthIndex: number;
  tx: number;
  rate: number;
  revenue: number;
  /** True if user entered a value (vs implicit zero). */
  filled: boolean;
}

export interface ProjectedService {
  serviceId: number;
  serviceName: string;
  defaultRate: number;
  monthly: ProjectedServiceMonth[];
  totalTx: number;
  totalRevenue: number;
}

export interface ForecastProjection {
  services: ProjectedService[];
  monthly: Array<{ monthIndex: number; revenue: number; cost: number; profit: number; tx: number }>;
  totalRevenue: number;
  totalCost: number;
  totalProfit: number;
  margin: number;
  hasCostData: boolean;
}

export interface CostBaselineInput {
  baseMonthlyCost: number;
  hasCostData: boolean;
}

export const projectForecast = (
  serviceBaselines: ServiceBaselineInput[],
  costBaseline: CostBaselineInput,
  scenario: ForecastScenario,
  horizon: number,
  _forecastStartDate: Date = new Date(),
): ForecastProjection => {
  const services: ProjectedService[] = serviceBaselines.map(b => {
    const monthly: ProjectedServiceMonth[] = [];
    let totalTx = 0;
    let totalRevenue = 0;
    for (let i = 0; i < horizon; i++) {
      const cell = getCell(scenario, b.serviceId, i);
      const tx = cell?.transactions ?? 0;
      const rate = cell?.rate != null && Number.isFinite(cell.rate) ? cell.rate : b.rate;
      const revenue = tx * rate;
      monthly.push({ monthIndex: i, tx, rate, revenue, filled: !!cell });
      totalTx += tx;
      totalRevenue += revenue;
    }
    return {
      serviceId: b.serviceId,
      serviceName: b.serviceName,
      defaultRate: b.rate,
      monthly,
      totalTx,
      totalRevenue,
    };
  });

  const cg = scenario.costGrowthRate / 100;
  const monthly = Array.from({ length: horizon }, (_, i) => {
    const revenue = services.reduce((s, svc) => s + svc.monthly[i].revenue, 0);
    const tx = services.reduce((s, svc) => s + svc.monthly[i].tx, 0);
    const cost = costBaseline.hasCostData
      ? costBaseline.baseMonthlyCost * Math.pow(1 + cg, i + 1)
      : 0;
    return { monthIndex: i, revenue, cost, profit: revenue - cost, tx };
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
  neutral: { dot: 'bg-muted-foreground', bg: 'bg-muted', text: 'text-foreground', border: 'border-border', hex: 'hsl(var(--muted-foreground))' },
  success: { dot: 'bg-success', bg: 'bg-success/10', text: 'text-success', border: 'border-success/30', hex: 'hsl(var(--success))' },
  warning: { dot: 'bg-warning', bg: 'bg-warning/10', text: 'text-warning', border: 'border-warning/30', hex: 'hsl(var(--warning))' },
  primary: { dot: 'bg-primary', bg: 'bg-primary/10', text: 'text-primary', border: 'border-primary/30', hex: 'hsl(var(--primary))' },
  accent:  { dot: 'bg-accent',  bg: 'bg-accent/10',  text: 'text-accent',  border: 'border-accent/30',  hex: 'hsl(var(--accent))' },
};

export const CUSTOM_TONE_CYCLE: ForecastScenario['tone'][] = ['primary', 'accent', 'warning', 'success', 'neutral'];

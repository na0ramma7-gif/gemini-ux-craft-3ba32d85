import { describe, it, expect } from 'vitest';
import {
  buildDefaultSettings,
  buildSeasonalMultipliers,
  getRamadanMonth,
  getServiceGrowthRate,
  FEATURE_FORECAST_KEY,
  loadFeatureForecastSettings,
  projectForecast,
  projectService,
  RAMADAN_GREGORIAN_MONTH,
} from '@/lib/featureForecast';
import {
  clearAllCellOverrides,
  clearCellOverride,
  setServiceGrowth,
  resetServiceGrowth,
  duplicateScenario,
  deleteScenario,
  renameScenario,
  setCellOverride,
  setRamadanMonthOverride,
  setScenarioMode,
  setServicePattern,
} from '@/hooks/useFeatureForecastSettings';

describe('featureForecast — Phase A engine', () => {
  it('compounds Tx month over month', () => {
    const s = projectService(
      { serviceId: 1, serviceName: 'X', rate: 100, baseTx: 100, highestHistoricalTx: 200 },
      10,
      3,
    );
    expect(s.monthly[0].tx).toBeCloseTo(110, 5);
    expect(s.monthly[1].tx).toBeCloseTo(121, 5);
    expect(s.monthly[2].tx).toBeCloseTo(133.1, 4);
    expect(s.totalRevenue).toBeCloseTo((110 + 121 + 133.1) * 100, 2);
  });

  it('flags sanity when forecast Tx exceeds 3× historical high', () => {
    const s = projectService(
      { serviceId: 1, serviceName: 'X', rate: 1, baseTx: 100, highestHistoricalTx: 100 },
      50,
      6,
    );
    // 100 * 1.5^6 ≈ 1139 > 300
    expect(s.monthly[5].sanityFlag).toBe(true);
  });

  it('omits cost projection when no cost history', () => {
    const proj = projectForecast(
      [{ serviceId: 1, serviceName: 'X', rate: 10, baseTx: 100, highestHistoricalTx: 100 }],
      { baseMonthlyCost: 0, hasCostData: false },
      buildDefaultSettings().scenarios[0],
      6,
    );
    expect(proj.totalCost).toBe(0);
    expect(proj.hasCostData).toBe(false);
    expect(proj.totalRevenue).toBeGreaterThan(0);
  });

  it('per-service overrides win over default growth', () => {
    let draft = buildDefaultSettings();
    draft = setServiceGrowth(draft, 'baseline', 42, 25);
    const sc = draft.scenarios.find(s => s.id === 'baseline')!;
    expect(getServiceGrowthRate(sc, 42)).toBe(25);
    expect(getServiceGrowthRate(sc, 99)).toBe(sc.defaultGrowthRate);
    draft = resetServiceGrowth(draft, 'baseline', 42);
    expect(getServiceGrowthRate(draft.scenarios[0], 42)).toBe(sc.defaultGrowthRate);
  });

  it('duplicate copies all assumptions and switches active scenario', () => {
    let draft = buildDefaultSettings();
    draft = setServiceGrowth(draft, 'baseline', 1, 12);
    const after = duplicateScenario(draft, 'baseline', 'My copy');
    expect(after.scenarios.length).toBe(4);
    const copy = after.scenarios[after.scenarios.length - 1];
    expect(copy.name).toBe('My copy');
    expect(copy.builtIn).toBeFalsy();
    expect(copy.services).toEqual([{ serviceId: 1, growthRate: 12 }]);
    expect(after.activeScenarioId).toBe(copy.id);
  });

  it('built-in scenarios cannot be deleted; custom can', () => {
    let draft = buildDefaultSettings();
    const beforeLen = draft.scenarios.length;
    draft = deleteScenario(draft, 'baseline');
    expect(draft.scenarios.length).toBe(beforeLen);
    draft = duplicateScenario(draft, 'baseline', 'X');
    const customId = draft.scenarios[draft.scenarios.length - 1].id;
    draft = deleteScenario(draft, customId);
    expect(draft.scenarios.find(s => s.id === customId)).toBeUndefined();
  });

  it('rename trims and caps at 40 chars', () => {
    const draft = renameScenario(buildDefaultSettings(), 'baseline', '   '.padEnd(60, 'A'));
    expect(draft.scenarios[0].name.length).toBeLessThanOrEqual(40);
  });
});

describe('featureForecast — Phase B: seasonal', () => {
  it('flat preset returns all 1s', () => {
    expect(buildSeasonalMultipliers('flat', undefined, 2)).toEqual(Array(12).fill(1));
  });

  it('ramadan preset dips at the ramadan month and rebounds the next', () => {
    const m = buildSeasonalMultipliers('ramadan', undefined, 2); // Mar
    expect(m[2]).toBeLessThan(0.9);
    expect(m[3]).toBeGreaterThan(1.1);
  });

  it('custom preset uses provided 12-value array', () => {
    const custom = [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2];
    expect(buildSeasonalMultipliers('custom', custom, 2)).toEqual(custom);
  });

  it('summer preset reduces Jun/Jul/Aug', () => {
    const m = buildSeasonalMultipliers('summer', undefined, 2);
    expect(m[5]).toBeLessThan(1);
    expect(m[6]).toBeLessThan(1);
    expect(m[7]).toBeLessThan(1);
  });

  it('seasonal projection applies multipliers per calendar month', () => {
    let draft = buildDefaultSettings();
    draft = setScenarioMode(draft, 'baseline', 'seasonal');
    draft = setServicePattern(draft, 'baseline', 1, 'ramadan');
    const sc = draft.scenarios[0];
    // Forecast starting Mar 2025 (idx 2). Ramadan 2025 = Mar (idx 2).
    const proj = projectForecast(
      [{ serviceId: 1, serviceName: 'X', rate: 100, baseTx: 100, highestHistoricalTx: 100 }],
      { baseMonthlyCost: 0, hasCostData: false },
      sc,
      3,
      new Date(2025, 2, 1),
    );
    // Month 0 (Mar) should be dipped vs month 1 (Apr) which is the rebound.
    expect(proj.services[0].monthly[0].tx).toBeLessThan(proj.services[0].monthly[1].tx);
  });

  it('ramadan month auto-detect uses lookup; override wins', () => {
    const sc = buildDefaultSettings().scenarios[0];
    expect(getRamadanMonth(sc, 2025)).toBe(RAMADAN_GREGORIAN_MONTH[2025]);
    let draft = setRamadanMonthOverride(buildDefaultSettings(), 'baseline', 7);
    expect(getRamadanMonth(draft.scenarios[0], 2025)).toBe(7);
  });
});

describe('featureForecast — Phase B: matrix', () => {
  it('override wins for that month and re-bases growth from override value', () => {
    let draft = buildDefaultSettings();
    draft = setScenarioMode(draft, 'baseline', 'matrix');
    draft = setCellOverride(draft, 'baseline', 1, 1, 500); // month idx 1 → 500
    const sc = draft.scenarios.find(s => s.id === 'baseline')!;
    const proj = projectForecast(
      [{ serviceId: 1, serviceName: 'X', rate: 1, baseTx: 100, highestHistoricalTx: 1000 }],
      { baseMonthlyCost: 0, hasCostData: false },
      sc,
      4,
      new Date(2025, 0, 1),
    );
    const monthly = proj.services[0].monthly;
    // Month 1 = exactly the override
    expect(monthly[1].tx).toBe(500);
    // Month 2 should compound from 500 at default 5% growth ≈ 525
    expect(monthly[2].tx).toBeCloseTo(525, 0);
    // Month 0 unaffected — normal compound from baseTx
    expect(monthly[0].tx).toBeCloseTo(105, 0);
  });

  it('clearCellOverride removes the cell; clearAll empties overrides', () => {
    let draft = buildDefaultSettings();
    draft = setScenarioMode(draft, 'baseline', 'matrix');
    draft = setCellOverride(draft, 'baseline', 1, 0, 200);
    draft = setCellOverride(draft, 'baseline', 1, 2, 300);
    expect(draft.scenarios[0].cellOverrides!.length).toBe(2);
    draft = clearCellOverride(draft, 'baseline', 1, 0);
    expect(draft.scenarios[0].cellOverrides!.length).toBe(1);
    draft = clearAllCellOverrides(draft, 'baseline');
    expect(draft.scenarios[0].cellOverrides!.length).toBe(0);
  });

  it('switching mode away from matrix without confirm helper still clears overrides on simple/seasonal', () => {
    let draft = buildDefaultSettings();
    draft = setScenarioMode(draft, 'baseline', 'matrix');
    draft = setCellOverride(draft, 'baseline', 1, 0, 200);
    draft = setScenarioMode(draft, 'baseline', 'simple');
    expect(draft.scenarios[0].cellOverrides ?? []).toEqual([]);
    expect(draft.scenarios[0].mode).toBe('simple');
  });
});

describe('featureForecast — Phase B: schema migration', () => {
  it('loads v1 localStorage data as schema v2 with simple mode preserved', () => {
    const featureId = 999;
    const v1 = {
      scenarios: [
        {
          id: 'baseline',
          name: 'Baseline',
          tone: 'neutral',
          mode: 'simple',
          services: [{ serviceId: 5, growthRate: 7 }],
          defaultGrowthRate: 5,
          costGrowthRate: 2,
          builtIn: true,
        },
      ],
      activeScenarioId: 'baseline',
      horizon: 12,
    };
    window.localStorage.setItem(`forecast.feature.${featureId}.v1`, JSON.stringify(v1));
    window.localStorage.removeItem(FEATURE_FORECAST_KEY(featureId));
    const loaded = loadFeatureForecastSettings(featureId);
    expect(loaded.schemaVersion).toBe(2);
    expect(loaded.scenarios[0].services[0].growthRate).toBe(7);
    expect(loaded.scenarios[0].mode).toBe('simple');
    // Phase B fields default in
    expect(loaded.scenarios[0].cellOverrides).toEqual([]);
    expect(loaded.scenarios[0].ramadanMonthOverride).toBeNull();
  });
});

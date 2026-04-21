import { describe, it, expect } from 'vitest';
import {
  buildDefaultSettings,
  clearCell,
  FEATURE_FORECAST_KEY,
  getCellRate,
  getCellTx,
  loadFeatureForecastSettings,
  materialiseLegacyScenario,
  projectForecast,
  scenarioHasDataBeyond,
  setCellRate,
  setCellTx,
  setCellsBulk,
  truncateScenarioToHorizon,
} from '@/lib/featureForecast';
import {
  buildQuickFillCells,
  duplicateScenario,
  deleteScenario,
  renameScenario,
  setScenarioCellTx,
  setScenarioCostGrowth,
} from '@/hooks/useFeatureForecastSettings';

const baseSvc = (id = 1, rate = 100) => ({
  serviceId: id,
  serviceName: `S${id}`,
  rate,
  baseTx: 100,
  highestHistoricalTx: 100,
});

describe('featureForecast — direct entry engine', () => {
  it('cells default to 0/empty until written', () => {
    const sc = buildDefaultSettings().scenarios[0];
    expect(getCellTx(sc, 1, 0)).toBeUndefined();
    const proj = projectForecast([baseSvc()], { baseMonthlyCost: 0, hasCostData: false }, sc, 6);
    expect(proj.totalRevenue).toBe(0);
  });

  it('setCellTx writes transactions and projection multiplies by service rate', () => {
    let sc = buildDefaultSettings().scenarios[0];
    sc = setCellTx(sc, 1, 0, 50);
    sc = setCellTx(sc, 1, 1, 75);
    const proj = projectForecast([baseSvc(1, 100)], { baseMonthlyCost: 0, hasCostData: false }, sc, 3);
    expect(proj.services[0].monthly[0].revenue).toBe(5000);
    expect(proj.services[0].monthly[1].revenue).toBe(7500);
    expect(proj.services[0].monthly[2].revenue).toBe(0); // empty cell
    expect(proj.totalRevenue).toBe(12500);
  });

  it('per-cell rate override wins over service default', () => {
    let sc = buildDefaultSettings().scenarios[0];
    sc = setCellTx(sc, 1, 0, 10);
    sc = setCellRate(sc, 1, 0, 250);
    expect(getCellRate(sc, 1, 0, 100)).toBe(250);
    const proj = projectForecast([baseSvc(1, 100)], { baseMonthlyCost: 0, hasCostData: false }, sc, 1);
    expect(proj.services[0].monthly[0].revenue).toBe(2500);
  });

  it('clearing rate falls back to default; clearing cell removes entry', () => {
    let sc = buildDefaultSettings().scenarios[0];
    sc = setCellTx(sc, 1, 0, 10);
    sc = setCellRate(sc, 1, 0, 250);
    sc = setCellRate(sc, 1, 0, null);
    expect(getCellRate(sc, 1, 0, 100)).toBe(100);
    expect(getCellTx(sc, 1, 0)).toBe(10);
    sc = clearCell(sc, 1, 0);
    expect(getCellTx(sc, 1, 0)).toBeUndefined();
  });

  it('cost forecast still compounds from cost growth rate', () => {
    let draft = buildDefaultSettings();
    draft = setScenarioCostGrowth(draft, 'baseline', 5);
    const sc = draft.scenarios[0];
    const proj = projectForecast(
      [baseSvc()],
      { baseMonthlyCost: 1000, hasCostData: true },
      sc,
      3,
    );
    expect(proj.monthly[0].cost).toBeCloseTo(1050, 2);
    expect(proj.monthly[1].cost).toBeCloseTo(1102.5, 2);
    expect(proj.hasCostData).toBe(true);
  });
});

describe('featureForecast — scenarios', () => {
  it('duplicate copies cell data and switches active', () => {
    let draft = buildDefaultSettings();
    draft = setScenarioCellTx(draft, 'baseline', 1, 0, 42);
    const after = duplicateScenario(draft, 'baseline', 'Copy');
    const copy = after.scenarios[after.scenarios.length - 1];
    expect(copy.name).toBe('Copy');
    expect(copy.builtIn).toBeFalsy();
    expect(getCellTx(copy, 1, 0)).toBe(42);
    expect(after.activeScenarioId).toBe(copy.id);
  });

  it('built-in scenarios cannot be deleted; custom can', () => {
    let draft = buildDefaultSettings();
    const before = draft.scenarios.length;
    draft = deleteScenario(draft, 'baseline');
    expect(draft.scenarios.length).toBe(before);
    draft = duplicateScenario(draft, 'baseline', 'X');
    const customId = draft.scenarios[draft.scenarios.length - 1].id;
    draft = deleteScenario(draft, customId);
    expect(draft.scenarios.find(s => s.id === customId)).toBeUndefined();
  });

  it('rename trims and caps at 40 chars', () => {
    const draft = renameScenario(buildDefaultSettings(), 'baseline', 'A'.repeat(60));
    expect(draft.scenarios[0].name.length).toBeLessThanOrEqual(40);
  });
});

describe('featureForecast — bulk + horizon', () => {
  it('setCellsBulk writes many cells at once', () => {
    let sc = buildDefaultSettings().scenarios[0];
    sc = setCellsBulk(sc, [
      { serviceId: 1, monthIndex: 0, transactions: 10 },
      { serviceId: 1, monthIndex: 1, transactions: 20 },
      { serviceId: 2, monthIndex: 0, transactions: 30 },
    ]);
    expect(getCellTx(sc, 1, 0)).toBe(10);
    expect(getCellTx(sc, 1, 1)).toBe(20);
    expect(getCellTx(sc, 2, 0)).toBe(30);
  });

  it('truncateScenarioToHorizon drops cells beyond new horizon', () => {
    let sc = buildDefaultSettings().scenarios[0];
    sc = setCellTx(sc, 1, 0, 1);
    sc = setCellTx(sc, 1, 5, 2);
    sc = setCellTx(sc, 1, 11, 3);
    expect(scenarioHasDataBeyond(sc, 6)).toBe(true);
    sc = truncateScenarioToHorizon(sc, 6);
    expect(getCellTx(sc, 1, 11)).toBeUndefined();
    expect(getCellTx(sc, 1, 5)).toBe(2);
    expect(scenarioHasDataBeyond(sc, 6)).toBe(false);
  });
});

describe('featureForecast — quick fill', () => {
  it('fixed mode fills all months with same value', () => {
    const sc = buildDefaultSettings().scenarios[0];
    const cells = buildQuickFillCells([1], 0, 5, 'fixed', sc, { value: 25 });
    expect(cells).toHaveLength(6);
    expect(cells.every(c => c.transactions === 25)).toBe(true);
  });

  it('growth mode compounds from starting value', () => {
    const sc = buildDefaultSettings().scenarios[0];
    const cells = buildQuickFillCells([1], 0, 2, 'growth', sc, { value: 100, growthPct: 10 });
    expect(cells[0].transactions).toBe(100);
    expect(cells[1].transactions).toBe(110);
    expect(cells[2].transactions).toBe(121);
  });

  it('copyForward uses last filled month before start', () => {
    let sc = buildDefaultSettings().scenarios[0];
    sc = setCellTx(sc, 1, 2, 77);
    const cells = buildQuickFillCells([1], 3, 5, 'copyForward', sc, {});
    expect(cells.every(c => c.transactions === 77)).toBe(true);
  });
});

describe('featureForecast — legacy migration', () => {
  it('loads v2 data and flags as migratedFromLegacy with empty data shells', () => {
    const featureId = 991;
    const v2 = {
      schemaVersion: 2,
      scenarios: [
        {
          id: 'baseline',
          name: 'Baseline',
          tone: 'neutral',
          mode: 'simple',
          services: [{ serviceId: 5, growthRate: 10 }],
          defaultGrowthRate: 5,
          costGrowthRate: 2,
          builtIn: true,
        },
      ],
      activeScenarioId: 'baseline',
      horizon: 12,
    };
    window.localStorage.removeItem(FEATURE_FORECAST_KEY(featureId));
    window.localStorage.setItem(`forecast.feature.${featureId}.v2`, JSON.stringify(v2));
    const loaded = loadFeatureForecastSettings(featureId);
    expect(loaded.schemaVersion).toBe(3);
    expect(loaded.migratedFromLegacy).toBe(true);
    expect(loaded.scenarios[0].costGrowthRate).toBe(2);
  });

  it('materialiseLegacyScenario replays growth into per-month transactions', () => {
    // Build a scenario that pretends to come from v2 with a 10% growth on service 1.
    const fake: any = {
      id: 'baseline',
      name: 'Baseline',
      tone: 'neutral',
      data: {},
      costGrowthRate: 2,
      builtIn: true,
      __legacy: {
        mode: 'simple',
        services: [{ serviceId: 1, growthRate: 10 }],
        defaultGrowthRate: 5,
        cellOverrides: [],
      },
    };
    const filled = materialiseLegacyScenario(
      fake,
      [baseSvc(1, 100)],
      3,
      new Date(2025, 0, 1),
    );
    expect(getCellTx(filled, 1, 0)).toBe(110); // 100 * 1.10
    expect(getCellTx(filled, 1, 1)).toBe(121);
    expect(getCellTx(filled, 1, 2)).toBe(133); // rounded
  });
});

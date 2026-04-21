import { describe, it, expect } from 'vitest';
import {
  buildDefaultSettings,
  getServiceGrowthRate,
  projectForecast,
  projectService,
} from '@/lib/featureForecast';
import {
  setServiceGrowth,
  resetServiceGrowth,
  duplicateScenario,
  deleteScenario,
  renameScenario,
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

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  CUSTOM_TONE_CYCLE,
  CellEntry,
  FeatureForecastSettings,
  ForecastScenario,
  ForecastScenarioId,
  MAX_SCENARIOS,
  ScenarioData,
  buildDefaultSettings,
  clearCell,
  loadFeatureForecastSettings,
  saveFeatureForecastSettings,
  setCellRate,
  setCellTx,
  setCellsBulk,
  truncateScenarioToHorizon,
} from '@/lib/featureForecast';

/**
 * Per-feature forecast settings hook. Persists to localStorage keyed by featureId.
 * The assumptions panel maintains its own DRAFT (not in this hook) so edits don't
 * update the live forecast until Apply.
 */
export const useFeatureForecastSettings = (featureId: number) => {
  const [settings, setSettings] = useState<FeatureForecastSettings>(() =>
    loadFeatureForecastSettings(featureId),
  );

  const lastFeatureRef = useRef(featureId);
  useEffect(() => {
    if (lastFeatureRef.current !== featureId) {
      lastFeatureRef.current = featureId;
      setSettings(loadFeatureForecastSettings(featureId));
    }
  }, [featureId]);

  useEffect(() => {
    saveFeatureForecastSettings(featureId, settings);
  }, [featureId, settings]);

  const setActiveScenario = useCallback((id: ForecastScenarioId) => {
    setSettings(prev =>
      prev.scenarios.some(s => s.id === id) ? { ...prev, activeScenarioId: id } : prev,
    );
  }, []);

  const setHorizon = useCallback((h: 6 | 12 | 24) => {
    setSettings(prev => ({ ...prev, horizon: h }));
  }, []);

  const applyDraft = useCallback((draft: FeatureForecastSettings) => {
    // Strip transient flag once committed.
    const { migratedFromLegacy: _ignored, ...rest } = draft;
    setSettings(rest as FeatureForecastSettings);
  }, []);

  const resetAll = useCallback(() => {
    setSettings(buildDefaultSettings());
  }, []);

  /** Replace the whole settings object — used after legacy materialisation. */
  const replaceSettings = useCallback((next: FeatureForecastSettings) => {
    const { migratedFromLegacy: _ignored, ...rest } = next;
    setSettings(rest as FeatureForecastSettings);
  }, []);

  return { settings, setActiveScenario, setHorizon, applyDraft, resetAll, replaceSettings };
};

// ── Pure helpers for editing a DRAFT FeatureForecastSettings ──

export const updateScenario = (
  draft: FeatureForecastSettings,
  scenarioId: ForecastScenarioId,
  patch: Partial<ForecastScenario>,
): FeatureForecastSettings => ({
  ...draft,
  scenarios: draft.scenarios.map(s => (s.id === scenarioId ? { ...s, ...patch } : s)),
});

export const setScenarioCellTx = (
  draft: FeatureForecastSettings,
  scenarioId: ForecastScenarioId,
  serviceId: number,
  monthIndex: number,
  transactions: number,
): FeatureForecastSettings => {
  const sc = draft.scenarios.find(s => s.id === scenarioId);
  if (!sc) return draft;
  return updateScenario(draft, scenarioId, setCellTx(sc, serviceId, monthIndex, transactions));
};

export const setScenarioCellRate = (
  draft: FeatureForecastSettings,
  scenarioId: ForecastScenarioId,
  serviceId: number,
  monthIndex: number,
  rate: number | null,
): FeatureForecastSettings => {
  const sc = draft.scenarios.find(s => s.id === scenarioId);
  if (!sc) return draft;
  return updateScenario(draft, scenarioId, setCellRate(sc, serviceId, monthIndex, rate));
};

export const clearScenarioCell = (
  draft: FeatureForecastSettings,
  scenarioId: ForecastScenarioId,
  serviceId: number,
  monthIndex: number,
): FeatureForecastSettings => {
  const sc = draft.scenarios.find(s => s.id === scenarioId);
  if (!sc) return draft;
  return updateScenario(draft, scenarioId, clearCell(sc, serviceId, monthIndex));
};

export const setScenarioCellsBulk = (
  draft: FeatureForecastSettings,
  scenarioId: ForecastScenarioId,
  cells: Array<{ serviceId: number; monthIndex: number; transactions: number; rate?: number }>,
): FeatureForecastSettings => {
  const sc = draft.scenarios.find(s => s.id === scenarioId);
  if (!sc) return draft;
  return updateScenario(draft, scenarioId, setCellsBulk(sc, cells));
};

export const setScenarioCostGrowth = (
  draft: FeatureForecastSettings,
  scenarioId: ForecastScenarioId,
  costGrowthRate: number,
): FeatureForecastSettings => updateScenario(draft, scenarioId, { costGrowthRate });

export const setHorizonOnDraft = (
  draft: FeatureForecastSettings,
  newHorizon: 6 | 12 | 24,
  truncateScenarios: boolean,
): FeatureForecastSettings => {
  if (!truncateScenarios || newHorizon >= draft.horizon) {
    return { ...draft, horizon: newHorizon };
  }
  return {
    ...draft,
    horizon: newHorizon,
    scenarios: draft.scenarios.map(s => truncateScenarioToHorizon(s, newHorizon)),
  };
};

export const renameScenario = (
  draft: FeatureForecastSettings,
  scenarioId: ForecastScenarioId,
  name: string,
): FeatureForecastSettings =>
  updateScenario(draft, scenarioId, { name: name.trim().slice(0, 40) || 'Untitled' });

export const duplicateScenario = (
  draft: FeatureForecastSettings,
  fromId: ForecastScenarioId,
  newName: string,
): FeatureForecastSettings => {
  if (draft.scenarios.length >= MAX_SCENARIOS) return draft;
  const src = draft.scenarios.find(s => s.id === fromId);
  if (!src) return draft;
  const tone = CUSTOM_TONE_CYCLE[draft.scenarios.length % CUSTOM_TONE_CYCLE.length];
  const id = `custom-${Date.now()}`;
  // Deep copy data
  const data: ScenarioData = {};
  for (const sIdStr of Object.keys(src.data ?? {})) {
    const sId = Number(sIdStr);
    data[sId] = { ...src.data[sId] };
  }
  const copy: ForecastScenario = {
    id,
    name: newName.trim().slice(0, 40) || `${src.name} (copy)`,
    tone,
    data,
    costGrowthRate: src.costGrowthRate,
    builtIn: false,
  };
  return { ...draft, scenarios: [...draft.scenarios, copy], activeScenarioId: id };
};

export const deleteScenario = (
  draft: FeatureForecastSettings,
  scenarioId: ForecastScenarioId,
): FeatureForecastSettings => {
  const target = draft.scenarios.find(s => s.id === scenarioId);
  if (!target || target.builtIn) return draft;
  const remaining = draft.scenarios.filter(s => s.id !== scenarioId);
  return {
    ...draft,
    scenarios: remaining,
    activeScenarioId:
      draft.activeScenarioId === scenarioId ? remaining[0].id : draft.activeScenarioId,
  };
};

export const resetScenarioToDefaults = (
  draft: FeatureForecastSettings,
  scenarioId: ForecastScenarioId,
): FeatureForecastSettings => {
  const defaults = buildDefaultSettings().scenarios.find(s => s.id === scenarioId);
  return updateScenario(draft, scenarioId, {
    data: {},
    costGrowthRate: defaults?.costGrowthRate ?? 2,
  });
};

// ── Quick-fill helpers ─────────────────────────────────────────

export type QuickFillMode = 'fixed' | 'growth' | 'copyForward';

export const buildQuickFillCells = (
  serviceIds: number[],
  startMonth: number,
  endMonth: number,
  mode: QuickFillMode,
  scenario: ForecastScenario,
  options: { value?: number; growthPct?: number },
): Array<{ serviceId: number; monthIndex: number; transactions: number }> => {
  const cells: Array<{ serviceId: number; monthIndex: number; transactions: number }> = [];
  for (const sId of serviceIds) {
    if (mode === 'fixed') {
      const v = Math.max(0, options.value ?? 0);
      for (let m = startMonth; m <= endMonth; m++) {
        cells.push({ serviceId: sId, monthIndex: m, transactions: v });
      }
    } else if (mode === 'growth') {
      const start = Math.max(0, options.value ?? 0);
      const g = (options.growthPct ?? 0) / 100;
      let cur = start;
      for (let m = startMonth; m <= endMonth; m++) {
        cells.push({ serviceId: sId, monthIndex: m, transactions: Math.round(cur) });
        cur = cur * (1 + g);
      }
    } else if (mode === 'copyForward') {
      // Find the last filled month strictly before startMonth
      let seed = 0;
      const row = scenario.data?.[sId] ?? {};
      for (let m = startMonth - 1; m >= 0; m--) {
        if (row[m]) { seed = row[m].transactions; break; }
      }
      for (let m = startMonth; m <= endMonth; m++) {
        cells.push({ serviceId: sId, monthIndex: m, transactions: seed });
      }
    }
  }
  return cells;
};

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  CUSTOM_TONE_CYCLE,
  FeatureForecastSettings,
  ForecastScenario,
  ForecastScenarioId,
  MAX_SCENARIOS,
  ForecastMode,
  MatrixOverride,
  SeasonalPresetId,
  ServiceAssumption,
  buildDefaultSettings,
  loadFeatureForecastSettings,
  saveFeatureForecastSettings,
} from '@/lib/featureForecast';

/**
 * Per-feature forecast settings hook. Persists to localStorage
 * keyed by featureId. The assumptions panel maintains its own DRAFT
 * (not in this hook) so edits don't update the live forecast until Apply.
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
    setSettings(draft);
  }, []);

  const resetAll = useCallback(() => {
    setSettings(buildDefaultSettings());
  }, []);

  return { settings, setActiveScenario, setHorizon, applyDraft, resetAll };
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

// ── Mode switching ─────────────────────────────────────────────

/**
 * Switch a scenario's mode. Caller is responsible for confirming with the
 * user when overrides will be discarded (see `scenarioHasOverrides`).
 * Switching to a different mode clears mode-specific data that no longer
 * applies, to keep the model consistent.
 */
export const setScenarioMode = (
  draft: FeatureForecastSettings,
  scenarioId: ForecastScenarioId,
  nextMode: ForecastMode,
): FeatureForecastSettings => {
  const sc = draft.scenarios.find(s => s.id === scenarioId);
  if (!sc || sc.mode === nextMode) return draft;
  let services = sc.services;
  let cellOverrides = sc.cellOverrides ?? [];
  if (nextMode === 'simple') {
    services = services.map(s => ({ serviceId: s.serviceId, growthRate: s.growthRate }));
    cellOverrides = [];
  } else if (nextMode === 'seasonal') {
    services = services.map(s => ({
      ...s,
      pattern: s.pattern ?? 'flat',
    }));
    cellOverrides = [];
  }
  // Matrix mode keeps existing services (with patterns) and starts with no
  // overrides; cells will autopopulate from the prior mode's projection.
  return updateScenario(draft, scenarioId, { mode: nextMode, services, cellOverrides });
};

export const scenarioHasOverrides = (
  draft: FeatureForecastSettings,
  scenarioId: ForecastScenarioId,
): boolean => {
  const sc = draft.scenarios.find(s => s.id === scenarioId);
  return !!sc && Array.isArray(sc.cellOverrides) && sc.cellOverrides.length > 0;
};

// ── Seasonal helpers ───────────────────────────────────────────

export const setServicePattern = (
  draft: FeatureForecastSettings,
  scenarioId: ForecastScenarioId,
  serviceId: number,
  pattern: SeasonalPresetId,
): FeatureForecastSettings => {
  const sc = draft.scenarios.find(s => s.id === scenarioId);
  if (!sc) return draft;
  const exists = sc.services.some(s => s.serviceId === serviceId);
  const services: ServiceAssumption[] = exists
    ? sc.services.map(s => (s.serviceId === serviceId ? { ...s, pattern } : s))
    : [...sc.services, { serviceId, growthRate: sc.defaultGrowthRate, pattern }];
  return updateScenario(draft, scenarioId, { services });
};

export const setServiceCustomPattern = (
  draft: FeatureForecastSettings,
  scenarioId: ForecastScenarioId,
  serviceId: number,
  customPattern: number[],
): FeatureForecastSettings => {
  const sc = draft.scenarios.find(s => s.id === scenarioId);
  if (!sc) return draft;
  const safe = customPattern.slice(0, 12);
  while (safe.length < 12) safe.push(1);
  const exists = sc.services.some(s => s.serviceId === serviceId);
  const services: ServiceAssumption[] = exists
    ? sc.services.map(s =>
        s.serviceId === serviceId ? { ...s, pattern: 'custom', customPattern: safe } : s,
      )
    : [
        ...sc.services,
        { serviceId, growthRate: sc.defaultGrowthRate, pattern: 'custom', customPattern: safe },
      ];
  return updateScenario(draft, scenarioId, { services });
};

export const setRamadanMonthOverride = (
  draft: FeatureForecastSettings,
  scenarioId: ForecastScenarioId,
  monthIdx: number | null,
): FeatureForecastSettings =>
  updateScenario(draft, scenarioId, { ramadanMonthOverride: monthIdx });

// ── Matrix helpers ─────────────────────────────────────────────

const dedupeOverrides = (list: MatrixOverride[]): MatrixOverride[] => {
  const map = new Map<string, MatrixOverride>();
  list.forEach(o => map.set(`${o.serviceId}:${o.monthIndex}`, o));
  return Array.from(map.values());
};

export const setCellOverride = (
  draft: FeatureForecastSettings,
  scenarioId: ForecastScenarioId,
  serviceId: number,
  monthIndex: number,
  tx: number,
): FeatureForecastSettings => {
  const sc = draft.scenarios.find(s => s.id === scenarioId);
  if (!sc) return draft;
  const existing = sc.cellOverrides ?? [];
  const next = dedupeOverrides([...existing, { serviceId, monthIndex, tx: Math.max(0, tx) }]);
  return updateScenario(draft, scenarioId, { cellOverrides: next });
};

export const clearCellOverride = (
  draft: FeatureForecastSettings,
  scenarioId: ForecastScenarioId,
  serviceId: number,
  monthIndex: number,
): FeatureForecastSettings => {
  const sc = draft.scenarios.find(s => s.id === scenarioId);
  if (!sc) return draft;
  const next = (sc.cellOverrides ?? []).filter(
    o => !(o.serviceId === serviceId && o.monthIndex === monthIndex),
  );
  return updateScenario(draft, scenarioId, { cellOverrides: next });
};

export const setCellOverridesBulk = (
  draft: FeatureForecastSettings,
  scenarioId: ForecastScenarioId,
  cells: MatrixOverride[],
): FeatureForecastSettings => {
  const sc = draft.scenarios.find(s => s.id === scenarioId);
  if (!sc) return draft;
  const next = dedupeOverrides([...(sc.cellOverrides ?? []), ...cells.map(c => ({ ...c, tx: Math.max(0, c.tx) }))]);
  return updateScenario(draft, scenarioId, { cellOverrides: next });
};

export const clearAllCellOverrides = (
  draft: FeatureForecastSettings,
  scenarioId: ForecastScenarioId,
): FeatureForecastSettings => updateScenario(draft, scenarioId, { cellOverrides: [] });

export const setServiceGrowth = (
  draft: FeatureForecastSettings,
  scenarioId: ForecastScenarioId,
  serviceId: number,
  growthRate: number,
): FeatureForecastSettings => {
  const sc = draft.scenarios.find(s => s.id === scenarioId);
  if (!sc) return draft;
  const exists = sc.services.some(s => s.serviceId === serviceId);
  const services: ServiceAssumption[] = exists
    ? sc.services.map(s => (s.serviceId === serviceId ? { ...s, growthRate } : s))
    : [...sc.services, { serviceId, growthRate }];
  return updateScenario(draft, scenarioId, { services });
};

export const resetServiceGrowth = (
  draft: FeatureForecastSettings,
  scenarioId: ForecastScenarioId,
  serviceId: number,
): FeatureForecastSettings => {
  const sc = draft.scenarios.find(s => s.id === scenarioId);
  if (!sc) return draft;
  return updateScenario(draft, scenarioId, {
    services: sc.services.filter(s => s.serviceId !== serviceId),
  });
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
  const copy: ForecastScenario = {
    ...src,
    id,
    name: newName.trim().slice(0, 40) || `${src.name} (copy)`,
    tone,
    builtIn: false,
    services: src.services.map(s => ({ ...s })),
  };
  return {
    ...draft,
    scenarios: [...draft.scenarios, copy],
    activeScenarioId: id,
  };
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
  if (!defaults) {
    return updateScenario(draft, scenarioId, {
      services: [],
      defaultGrowthRate: 5,
      costGrowthRate: 2,
    });
  }
  return updateScenario(draft, scenarioId, {
    services: [],
    defaultGrowthRate: defaults.defaultGrowthRate,
    costGrowthRate: defaults.costGrowthRate,
  });
};

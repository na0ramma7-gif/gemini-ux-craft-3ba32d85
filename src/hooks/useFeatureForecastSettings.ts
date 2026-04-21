import { useCallback, useEffect, useRef, useState } from 'react';
import {
  CUSTOM_TONE_CYCLE,
  FeatureForecastSettings,
  ForecastScenario,
  ForecastScenarioId,
  MAX_SCENARIOS,
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

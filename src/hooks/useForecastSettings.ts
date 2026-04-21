import { useCallback, useEffect, useState } from 'react';
import {
  HorizonMonths,
  SCENARIO_PRESETS,
  ScenarioConfig,
  ScenarioConfigs,
  ScenarioType,
  loadScenarioConfigs,
  saveScenarioConfigs,
} from '@/lib/forecastEngine';

/**
 * Shared store-like hook for the Configure Forecast experience.
 * Persists the per-scenario configurations in localStorage so the
 * leadership view is stable across reloads.
 */
export const useForecastSettings = () => {
  const [configs, setConfigs] = useState<ScenarioConfigs>(() => loadScenarioConfigs());

  useEffect(() => {
    saveScenarioConfigs(configs);
  }, [configs]);

  const updateScenario = useCallback((scenario: ScenarioType, next: ScenarioConfig) => {
    setConfigs(prev => ({ ...prev, [scenario]: next }));
  }, []);

  const resetScenario = useCallback((scenario: ScenarioType) => {
    setConfigs(prev => ({ ...prev, [scenario]: SCENARIO_PRESETS[scenario] }));
  }, []);

  const resetAll = useCallback(() => setConfigs(SCENARIO_PRESETS), []);

  return { configs, updateScenario, resetScenario, resetAll, setConfigs };
};

export type { HorizonMonths };
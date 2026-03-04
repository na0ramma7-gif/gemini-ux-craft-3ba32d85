import { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export type ScenarioType = 'baseline' | 'optimistic' | 'conservative';
export type HorizonMonths = 12 | 24 | 36;

export interface ForecastConfig {
  horizon: HorizonMonths;
  revenueGrowthRate: number;
  costGrowthRate: number;
  revenueGrowthCap: number;
  scenario: ScenarioType;
}

const SCENARIO_DEFAULTS: Record<ScenarioType, Omit<ForecastConfig, 'horizon' | 'scenario'>> = {
  baseline: { revenueGrowthRate: 5, costGrowthRate: 2, revenueGrowthCap: 15 },
  optimistic: { revenueGrowthRate: 10, costGrowthRate: 1.5, revenueGrowthCap: 25 },
  conservative: { revenueGrowthRate: 2, costGrowthRate: 3, revenueGrowthCap: 8 },
};

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  config: ForecastConfig;
  onApply: (config: ForecastConfig) => void;
}

const ForecastConfigModal = ({ open, onOpenChange, config, onApply }: Props) => {
  const { t } = useApp();
  const [local, setLocal] = useState<ForecastConfig>(config);

  const handleScenarioChange = (scenario: ScenarioType) => {
    setLocal({
      ...local,
      scenario,
      ...SCENARIO_DEFAULTS[scenario],
    });
  };

  const handleReset = () => {
    setLocal({
      horizon: 12,
      scenario: 'baseline',
      ...SCENARIO_DEFAULTS['baseline'],
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t('configureForecast')}</DialogTitle>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* Scenario */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-muted-foreground">{t('scenario')}</Label>
            <div className="flex bg-secondary rounded-lg p-1 gap-1">
              {(['baseline', 'optimistic', 'conservative'] as ScenarioType[]).map(s => (
                <button
                  key={s}
                  onClick={() => handleScenarioChange(s)}
                  className={`flex-1 px-3 py-2 rounded-md text-xs font-medium transition-colors ${
                    local.scenario === s
                      ? 'bg-card text-primary shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {t(s as any)}
                </button>
              ))}
            </div>
          </div>

          {/* Horizon */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-muted-foreground">{t('forecastHorizon')}</Label>
            <Select
              value={local.horizon.toString()}
              onValueChange={(v) => setLocal({ ...local, horizon: Number(v) as HorizonMonths })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="12">12 {t('months')}</SelectItem>
                <SelectItem value="24">24 {t('months')}</SelectItem>
                <SelectItem value="36">36 {t('months')}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Growth Rates */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground">{t('revenueGrowthRate')}</Label>
              <div className="relative">
                <Input
                  type="number"
                  step="0.5"
                  value={local.revenueGrowthRate}
                  onChange={(e) => setLocal({ ...local, revenueGrowthRate: parseFloat(e.target.value) || 0 })}
                  className="pe-8"
                />
                <span className="absolute end-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">%</span>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground">{t('costGrowthRate')}</Label>
              <div className="relative">
                <Input
                  type="number"
                  step="0.5"
                  value={local.costGrowthRate}
                  onChange={(e) => setLocal({ ...local, costGrowthRate: parseFloat(e.target.value) || 0 })}
                  className="pe-8"
                />
                <span className="absolute end-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">%</span>
              </div>
            </div>
          </div>

          {/* Growth Cap */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-muted-foreground">{t('revenueGrowthCap')}</Label>
            <div className="relative">
              <Input
                type="number"
                step="1"
                value={local.revenueGrowthCap}
                onChange={(e) => setLocal({ ...local, revenueGrowthCap: parseFloat(e.target.value) || 0 })}
                className="pe-8"
              />
              <span className="absolute end-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">%</span>
            </div>
            <p className="text-[10px] text-muted-foreground">
              Maximum monthly revenue growth to prevent unrealistic projections
            </p>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" size="sm" onClick={handleReset}>
            {t('resetDefaults')}
          </Button>
          <Button size="sm" onClick={() => { onApply(local); onOpenChange(false); }}>
            {t('applyConfig')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ForecastConfigModal;
export { SCENARIO_DEFAULTS };

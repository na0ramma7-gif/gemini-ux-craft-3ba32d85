import { useEffect, useMemo, useState } from 'react';
import { useApp } from '@/context/AppContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Collapsible, CollapsibleContent, CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { ChevronDown, AlertCircle, RotateCcw } from 'lucide-react';
import {
  HorizonMonths,
  SCENARIO_PRESETS,
  ScenarioConfig,
  ScenarioConfigs,
  ScenarioType,
  validateScenarioConfig,
} from '@/lib/forecastEngine';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  configs: ScenarioConfigs;
  activeScenario: ScenarioType;
  horizon: HorizonMonths;
  onApply: (next: { configs: ScenarioConfigs; horizon: HorizonMonths; scenario: ScenarioType }) => void;
}

const SCENARIOS: ScenarioType[] = ['baseline', 'optimistic', 'conservative'];

const numberOrEmpty = (v: number | null) => (v === null ? '' : String(v));

const NumField = ({
  label, value, onChange, suffix = '%', step = 0.5, min, max, error,
}: {
  label: string; value: number; onChange: (n: number) => void;
  suffix?: string; step?: number; min?: number; max?: number; error?: string;
}) => (
  <div className="space-y-1.5">
    <Label className="text-xs font-medium text-muted-foreground">{label}</Label>
    <div className="relative">
      <Input
        type="number"
        step={step}
        min={min}
        max={max}
        value={Number.isFinite(value) ? value : 0}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className={`pe-10 ${error ? 'border-destructive focus-visible:ring-destructive' : ''}`}
      />
      <span className="absolute end-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">{suffix}</span>
    </div>
    {error && (
      <p className="text-[11px] text-destructive flex items-center gap-1">
        <AlertCircle className="w-3 h-3" />{error}
      </p>
    )}
  </div>
);

const ScenarioConfigModal = ({
  open, onOpenChange, configs, activeScenario, horizon, onApply,
}: Props) => {
  const { t } = useApp();
  const [local, setLocal] = useState<ScenarioConfigs>(configs);
  const [tab, setTab] = useState<ScenarioType>(activeScenario);
  const [localHorizon, setLocalHorizon] = useState<HorizonMonths>(horizon);
  const [advancedOpen, setAdvancedOpen] = useState(false);

  useEffect(() => { if (open) { setLocal(configs); setTab(activeScenario); setLocalHorizon(horizon); } }, [open, configs, activeScenario, horizon]);

  const cfg = local[tab];
  const update = (patch: Partial<ScenarioConfig>) =>
    setLocal(prev => ({ ...prev, [tab]: { ...prev[tab], ...patch } }));

  const issuesByScenario = useMemo(() => {
    const out = {} as Record<ScenarioType, ReturnType<typeof validateScenarioConfig>>;
    SCENARIOS.forEach(s => { out[s] = validateScenarioConfig(local[s]); });
    return out;
  }, [local]);

  const errorFor = (field: keyof ScenarioConfig) =>
    issuesByScenario[tab].find(i => i.field === field)?.message;

  const totalIssues = SCENARIOS.reduce((n, s) => n + issuesByScenario[s].length, 0);

  const resetCurrent = () => setLocal(prev => ({ ...prev, [tab]: SCENARIO_PRESETS[tab] }));

  const apply = () => {
    if (totalIssues > 0) return;
    onApply({ configs: local, horizon: localHorizon, scenario: tab });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t('configureForecast')}</DialogTitle>
          <DialogDescription className="text-xs">
            {t('forecastConfigDesc')}
          </DialogDescription>
        </DialogHeader>

        {/* Horizon */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-muted-foreground">{t('forecastHorizon')}</Label>
            <Select
              value={String(localHorizon)}
              onValueChange={(v) => setLocalHorizon(Number(v) as HorizonMonths)}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="12">12 {t('months')}</SelectItem>
                <SelectItem value="24">24 {t('months')}</SelectItem>
                <SelectItem value="36">36 {t('months')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-muted-foreground">{t('growthMode')}</Label>
            <Select value={cfg.growthMode} onValueChange={(v: any) => update({ growthMode: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="compound">{t('compound')}</SelectItem>
                <SelectItem value="linear">{t('linear')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Scenario tabs */}
        <Tabs value={tab} onValueChange={(v) => setTab(v as ScenarioType)} className="mt-2">
          <TabsList className="grid grid-cols-3 w-full">
            {SCENARIOS.map(s => (
              <TabsTrigger key={s} value={s} className="text-xs">
                {t(s)}
                {issuesByScenario[s].length > 0 && (
                  <span className="ms-1.5 inline-flex items-center justify-center w-4 h-4 rounded-full bg-destructive/15 text-destructive text-[10px] font-bold">
                    {issuesByScenario[s].length}
                  </span>
                )}
              </TabsTrigger>
            ))}
          </TabsList>

          {SCENARIOS.map(s => (
            <TabsContent key={s} value={s} className="space-y-4 pt-4">
              <div className="grid grid-cols-2 gap-3">
                <NumField
                  label={t('monthlyGrowthRate')}
                  value={cfg.growthRate}
                  onChange={(n) => update({ growthRate: n })}
                  step={0.5} min={-50} max={50}
                  error={errorFor('growthRate')}
                />
                <NumField
                  label={t('revenueAdjustment')}
                  value={cfg.revenueAdjustment}
                  onChange={(n) => update({ revenueAdjustment: n })}
                  step={1} min={-100} max={100}
                  error={errorFor('revenueAdjustment')}
                />
                <NumField
                  label={t('pipelineConversionRate')}
                  value={cfg.conversionRate}
                  onChange={(n) => update({ conversionRate: n })}
                  step={1} min={1} max={100}
                  error={errorFor('conversionRate')}
                />
                <NumField
                  label={t('rampFactor')}
                  value={cfg.rampFactor}
                  onChange={(n) => update({ rampFactor: n })}
                  step={0.5} min={-20} max={20}
                  error={errorFor('rampFactor')}
                />
              </div>

              <Collapsible open={advancedOpen} onOpenChange={setAdvancedOpen}>
                <CollapsibleTrigger asChild>
                  <button
                    type="button"
                    className="flex items-center gap-1.5 text-xs font-medium text-primary hover:underline"
                  >
                    <ChevronDown className={`w-3.5 h-3.5 transition-transform ${advancedOpen ? 'rotate-180' : ''}`} />
                    {t('advancedSettings')}
                  </button>
                </CollapsibleTrigger>
                <CollapsibleContent className="pt-4 space-y-4 border-t border-border mt-3">
                  <div className="grid grid-cols-2 gap-3">
                    <NumField
                      label={t('riskBuffer')}
                      value={cfg.riskBuffer}
                      onChange={(n) => update({ riskBuffer: n })}
                      step={1} min={0} max={50}
                      error={errorFor('riskBuffer')}
                    />
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium text-muted-foreground">{t('monthlyCap')}</Label>
                      <div className="flex gap-2">
                        <Switch
                          checked={cfg.monthlyCap !== null}
                          onCheckedChange={(on) => update({ monthlyCap: on ? 100000 : null })}
                        />
                        <Input
                          type="number"
                          min={0}
                          step={1000}
                          disabled={cfg.monthlyCap === null}
                          value={numberOrEmpty(cfg.monthlyCap)}
                          onChange={(e) => update({ monthlyCap: e.target.value === '' ? null : parseFloat(e.target.value) })}
                          className={errorFor('monthlyCap') ? 'border-destructive' : ''}
                        />
                      </div>
                      {errorFor('monthlyCap') && (
                        <p className="text-[11px] text-destructive flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" />{errorFor('monthlyCap')}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-muted-foreground">{t('oneTimeSpike')}</Label>
                    <div className="grid grid-cols-2 gap-2">
                      <Select
                        value={cfg.spikeMonthIndex === null ? 'off' : String(cfg.spikeMonthIndex)}
                        onValueChange={(v) => update({ spikeMonthIndex: v === 'off' ? null : Number(v) })}
                      >
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="off">{t('off')}</SelectItem>
                          {Array.from({ length: localHorizon }).map((_, i) => (
                            <SelectItem key={i} value={String(i)}>{t('month')} {i + 1}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <NumField
                        label=""
                        value={cfg.spikeAmount}
                        onChange={(n) => update({ spikeAmount: n })}
                        step={1} min={-100} max={200}
                        error={errorFor('spikeAmount')}
                      />
                    </div>
                  </div>
                </CollapsibleContent>
              </Collapsible>
            </TabsContent>
          ))}
        </Tabs>

        <DialogFooter className="gap-2 sm:justify-between">
          <Button variant="ghost" size="sm" onClick={resetCurrent} className="gap-1.5">
            <RotateCcw className="w-3.5 h-3.5" />
            {t('resetScenario')}
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>{t('cancel')}</Button>
            <Button size="sm" onClick={apply} disabled={totalIssues > 0}>
              {t('applyConfig')}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ScenarioConfigModal;
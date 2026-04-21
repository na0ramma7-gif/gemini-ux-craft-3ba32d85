import { useMemo, useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Copy, Trash2, RotateCcw, Pencil, AlertCircle } from 'lucide-react';
import { cn, formatCurrency } from '@/lib/utils';
import {
  FeatureForecastSettings,
  ForecastMode,
  ForecastScenarioId,
  MAX_SCENARIOS,
  SeasonalPresetId,
  ServiceBaselineInput,
  TONE_CLASSES,
  buildSeasonalMultipliers,
  getRamadanMonth,
  getServiceGrowthRate,
  projectForecast,
} from '@/lib/featureForecast';
import {
  clearAllCellOverrides,
  clearCellOverride,
  duplicateScenario,
  deleteScenario,
  renameScenario,
  resetScenarioToDefaults,
  resetServiceGrowth,
  scenarioHasOverrides,
  setCellOverride,
  setCellOverridesBulk,
  setRamadanMonthOverride,
  setScenarioMode,
  setServiceGrowth,
  setServicePattern,
  updateScenario,
} from '@/hooks/useFeatureForecastSettings';
import { useApp } from '@/context/AppContext';
import ForecastMatrixGrid from '@/components/forecast/ForecastMatrixGrid';

const MONTH_LABEL_KEYS_FALLBACK = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

const SEASONAL_PRESETS: { id: SeasonalPresetId; key: string }[] = [
  { id: 'flat', key: 'presetFlat' },
  { id: 'ramadan', key: 'presetRamadan' },
  { id: 'summer', key: 'presetSummer' },
  { id: 'yearEnd', key: 'presetYearEnd' },
  { id: 'backToSchool', key: 'presetBackToSchool' },
  { id: 'custom', key: 'presetCustom' },
];

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  initialSettings: FeatureForecastSettings;
  serviceBaselines: ServiceBaselineInput[];
  costBaseline: { baseMonthlyCost: number; hasCostData: boolean };
  onApply: (next: FeatureForecastSettings) => void;
  forecastStartDate: Date;
}

const ForecastAssumptionsPanel = ({
  open,
  onOpenChange,
  initialSettings,
  serviceBaselines,
  costBaseline,
  onApply,
  forecastStartDate,
}: Props) => {
  const { t, language } = useApp();
  const [draft, setDraft] = useState<FeatureForecastSettings>(initialSettings);
  const [activeId, setActiveId] = useState<ForecastScenarioId>(initialSettings.activeScenarioId);
  const [renamingId, setRenamingId] = useState<ForecastScenarioId | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [confirmDelete, setConfirmDelete] = useState<ForecastScenarioId | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);
  const [pendingModeSwitch, setPendingModeSwitch] = useState<ForecastMode | null>(null);

  useEffect(() => {
    if (open) {
      setDraft(initialSettings);
      setActiveId(initialSettings.activeScenarioId);
    }
  }, [open, initialSettings]);

  const activeScenario = useMemo(
    () => draft.scenarios.find(s => s.id === activeId) ?? draft.scenarios[0],
    [draft, activeId],
  );

  const projection = useMemo(
    () => projectForecast(serviceBaselines, costBaseline, activeScenario, draft.horizon, forecastStartDate),
    [serviceBaselines, costBaseline, activeScenario, draft.horizon, forecastStartDate],
  );

  const dirty = useMemo(
    () => JSON.stringify(draft) !== JSON.stringify(initialSettings),
    [draft, initialSettings],
  );

  const handleApply = () => {
    onApply({ ...draft, activeScenarioId: activeId });
    onOpenChange(false);
  };

  const handleDuplicate = () => {
    const next = duplicateScenario(draft, activeId, `${activeScenario.name} (copy)`);
    setDraft(next);
    setActiveId(next.activeScenarioId);
  };

  const handleDelete = (id: ForecastScenarioId) => {
    const next = deleteScenario(draft, id);
    setDraft(next);
    setActiveId(next.activeScenarioId);
    setConfirmDelete(null);
  };

  const startRename = (id: ForecastScenarioId, current: string) => {
    setRenamingId(id);
    setRenameValue(current);
  };
  const commitRename = () => {
    if (renamingId) setDraft(d => renameScenario(d, renamingId, renameValue));
    setRenamingId(null);
  };

  const updateActive = (patch: any) => {
    setDraft(d => updateScenario(d, activeId, patch));
  };

  const requestModeSwitch = (next: ForecastMode) => {
    if (next === activeScenario.mode) return;
    // Warn only when overrides would be lost (Matrix → other) or when leaving
    // Seasonal would lose patterns. Per spec, the warning text is generic.
    const wouldLoseOverrides =
      activeScenario.mode === 'matrix' && scenarioHasOverrides(draft, activeId);
    if (wouldLoseOverrides) {
      setPendingModeSwitch(next);
    } else {
      setDraft(d => setScenarioMode(d, activeId, next));
    }
  };

  const confirmModeSwitch = () => {
    if (pendingModeSwitch) {
      setDraft(d => setScenarioMode(d, activeId, pendingModeSwitch));
      setPendingModeSwitch(null);
    }
  };

  const handleResetScenario = () => {
    setDraft(d => resetScenarioToDefaults(d, activeId));
    setConfirmReset(false);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-[1200px] w-[95vw] h-[90vh] p-0 flex flex-col gap-0 overflow-hidden">
          <DialogHeader className="px-6 py-4 border-b border-border shrink-0">
            <DialogTitle className="text-lg font-semibold">{t('forecastAssumptions')}</DialogTitle>
            <DialogDescription className="text-xs">{t('forecastAssumptionsDesc')}</DialogDescription>
          </DialogHeader>

          <div className="flex items-center gap-2 px-6 py-3 border-b border-border bg-muted/30 shrink-0 flex-wrap">
            <div className="flex items-center gap-1 flex-wrap">
              {draft.scenarios.map(s => {
                const tone = TONE_CLASSES[s.tone];
                const isActive = s.id === activeId;
                const isRenaming = renamingId === s.id;
                return (
                  <div
                    key={s.id}
                    className={cn(
                      'group flex items-center gap-1.5 rounded-full ps-3 pe-1.5 py-1 border text-xs transition-all cursor-pointer',
                      isActive
                        ? `${tone.bg} ${tone.text} ${tone.border} shadow-sm`
                        : 'bg-background border-border text-muted-foreground hover:bg-muted',
                    )}
                    onClick={() => !isRenaming && setActiveId(s.id)}
                  >
                    <span className={cn('w-2 h-2 rounded-full', tone.dot)} />
                    {isRenaming ? (
                      <Input
                        autoFocus
                        value={renameValue}
                        onChange={e => setRenameValue(e.target.value)}
                        onBlur={commitRename}
                        onKeyDown={e => {
                          if (e.key === 'Enter') commitRename();
                          if (e.key === 'Escape') setRenamingId(null);
                        }}
                        className="h-6 w-32 text-xs px-2"
                      />
                    ) : (
                      <span className="font-medium">{s.name}</span>
                    )}
                    {isActive && !isRenaming && (
                      <div className="flex items-center">
                        <button
                          type="button"
                          aria-label={t('rename')}
                          className="p-1 rounded-full hover:bg-background/50"
                          onClick={e => { e.stopPropagation(); startRename(s.id, s.name); }}
                        >
                          <Pencil className="w-3 h-3" />
                        </button>
                        {!s.builtIn && (
                          <button
                            type="button"
                            aria-label={t('delete')}
                            className="p-1 rounded-full hover:bg-background/50"
                            onClick={e => { e.stopPropagation(); setConfirmDelete(s.id); }}
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
              {draft.scenarios.length < MAX_SCENARIOS && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-xs gap-1"
                  onClick={handleDuplicate}
                  title={t('startFromActive')}
                >
                  <Copy className="w-3 h-3" />
                  {t('duplicateScenario')}
                </Button>
              )}
            </div>

            <div className="flex-1" />

            <Label className="text-xs text-muted-foreground">{t('forecastHorizon')}</Label>
            <Select
              value={String(draft.horizon)}
              onValueChange={v => setDraft(d => ({ ...d, horizon: Number(v) as 6 | 12 | 24 }))}
            >
              <SelectTrigger className="w-32 h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="6">6 {t('months')}</SelectItem>
                <SelectItem value="12">12 {t('months')}</SelectItem>
                <SelectItem value="24">24 {t('months')}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-[1fr_320px] overflow-hidden">
            <div className="overflow-auto p-6 space-y-5">
              {/* Mode selector + Ramadan override */}
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="inline-flex bg-muted rounded-lg p-1 gap-1" role="tablist" aria-label={t('mode')}>
                  {(['simple', 'seasonal', 'matrix'] as ForecastMode[]).map(m => {
                    const active = activeScenario.mode === m;
                    const label = t(m === 'simple' ? 'modeSimple' : m === 'seasonal' ? 'modeSeasonal' : 'modeMatrix');
                    return (
                      <button
                        key={m}
                        type="button"
                        role="tab"
                        aria-selected={active}
                        onClick={() => requestModeSwitch(m)}
                        className={cn(
                          'px-3 py-1.5 rounded-md text-xs font-medium transition-colors',
                          active ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground',
                        )}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
                <p className="text-[11px] text-muted-foreground flex-1 min-w-[160px]">
                  {t(activeScenario.mode === 'simple' ? 'modeSimpleHelp' : activeScenario.mode === 'seasonal' ? 'modeSeasonalHelp' : 'modeMatrixHelp')}
                </p>
                {activeScenario.mode === 'seasonal' && (
                  <div className="flex items-center gap-2">
                    <Label className="text-xs text-muted-foreground">{t('ramadanMonth')}</Label>
                    <Select
                      value={activeScenario.ramadanMonthOverride == null ? 'auto' : String(activeScenario.ramadanMonthOverride)}
                      onValueChange={v =>
                        setDraft(d => setRamadanMonthOverride(d, activeId, v === 'auto' ? null : Number(v)))
                      }
                    >
                      <SelectTrigger className="w-32 h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="auto">
                          {t('autoDetect')} ({MONTH_LABEL_KEYS_FALLBACK[getRamadanMonth(activeScenario, forecastStartDate.getFullYear())]})
                        </SelectItem>
                        {MONTH_LABEL_KEYS_FALLBACK.map((m, i) => (
                          <SelectItem key={i} value={String(i)}>{m}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-xl border border-border bg-muted/20">
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">{t('defaultRevenueGrowth')}</Label>
                  <p className="text-[11px] text-muted-foreground">{t('defaultRevenueGrowthHelp')}</p>
                  <div className="relative max-w-[160px]">
                    <Input
                      type="number"
                      step="0.5"
                      value={activeScenario.defaultGrowthRate}
                      onChange={e => updateActive({ defaultGrowthRate: Number(e.target.value) || 0 })}
                      className="pe-8 h-9 text-sm"
                    />
                    <span className="absolute end-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">%</span>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">{t('costGrowthRate')}</Label>
                  <p className="text-[11px] text-muted-foreground">{t('costGrowthHelp')}</p>
                  <div className="relative max-w-[160px]">
                    <Input
                      type="number"
                      step="0.5"
                      value={activeScenario.costGrowthRate}
                      onChange={e => updateActive({ costGrowthRate: Number(e.target.value) || 0 })}
                      className="pe-8 h-9 text-sm"
                    />
                    <span className="absolute end-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">%</span>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="text-sm font-semibold mb-2">{t('perServiceGrowth')}</h4>
                {serviceBaselines.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                    {t('noServicesForForecast')}
                  </div>
                ) : (
                  <div className="rounded-xl border border-border overflow-hidden">
                    <table className="w-full text-xs">
                      <thead className="bg-muted/40 text-[11px] uppercase tracking-wide text-muted-foreground">
                        <tr>
                          <th className="text-start px-3 py-2 font-medium">{t('service')}</th>
                          <th className="text-end px-3 py-2 font-medium">{t('baseTx')}</th>
                          <th className="text-end px-3 py-2 font-medium">{t('rate')}</th>
                          <th className="text-end px-3 py-2 font-medium">{t('growthPercent')}</th>
                          <th className="text-end px-3 py-2 font-medium">{t('forecastTxEnd')}</th>
                          <th className="text-end px-3 py-2 font-medium w-10"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {serviceBaselines.map(b => {
                          const overridden = activeScenario.services.some(s => s.serviceId === b.serviceId);
                          const growth = getServiceGrowthRate(activeScenario, b.serviceId);
                          const last = b.baseTx * Math.pow(1 + growth / 100, draft.horizon);
                          const sanity = b.highestHistoricalTx > 0 && last > 3 * b.highestHistoricalTx;
                          return (
                            <tr key={b.serviceId} className={cn('border-t border-border/60', overridden && 'bg-warning/5')}>
                              <td className="px-3 py-2 font-medium text-foreground">
                                <div className="flex items-center gap-2">
                                  {overridden && <span className="w-1.5 h-1.5 rounded-full bg-warning" title={t('overridden')} />}
                                  {b.serviceName}
                                </div>
                              </td>
                              <td className="px-3 py-2 text-end tabular-nums text-muted-foreground">
                                {Math.round(b.baseTx).toLocaleString()}
                              </td>
                              <td className="px-3 py-2 text-end tabular-nums text-muted-foreground">
                                {formatCurrency(b.rate, language)}
                              </td>
                              <td className="px-3 py-2 text-end">
                                <div className="relative inline-block">
                                  <Input
                                    type="number"
                                    step="0.5"
                                    value={growth}
                                    onChange={e => setDraft(d => setServiceGrowth(d, activeId, b.serviceId, Number(e.target.value) || 0))}
                                    className="h-8 w-24 text-end text-xs pe-6 tabular-nums"
                                  />
                                  <span className="absolute end-2 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground">%</span>
                                </div>
                              </td>
                              <td className="px-3 py-2 text-end tabular-nums">
                                <span className={cn('inline-flex items-center gap-1', sanity ? 'text-warning' : 'text-foreground')}>
                                  {sanity && <AlertCircle className="w-3 h-3" aria-label={t('sanitySpike')} />}
                                  {Math.round(last).toLocaleString()}
                                </span>
                              </td>
                              <td className="px-3 py-2 text-end">
                                {overridden && (
                                  <button
                                    type="button"
                                    className="text-[11px] text-primary hover:underline"
                                    onClick={() => setDraft(d => resetServiceGrowth(d, activeId, b.serviceId))}
                                    title={t('resetToDefault')}
                                  >
                                    {t('reset')}
                                  </button>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
                <p className="text-[11px] text-muted-foreground mt-2">{t('overrideHint')}</p>
              </div>
            </div>

            <aside className="border-t lg:border-t-0 lg:border-s border-border bg-muted/20 overflow-auto p-5 space-y-4">
              <div>
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground mb-1">{t('livePreview')}</p>
                <h4 className="text-sm font-semibold flex items-center gap-2">
                  <span className={cn('w-2 h-2 rounded-full', TONE_CLASSES[activeScenario.tone].dot)} />
                  {activeScenario.name} · {draft.horizon} {t('months')}
                </h4>
              </div>

              <div className="space-y-2">
                <PreviewCard label={t('projectedRevenue')} value={formatCurrency(projection.totalRevenue, language)} tone="success" />
                <PreviewCard
                  label={t('projectedCost')}
                  value={projection.hasCostData ? formatCurrency(projection.totalCost, language) : '—'}
                  tone="destructive"
                  hint={!projection.hasCostData ? t('noCostData') : undefined}
                />
                <PreviewCard
                  label={t('projectedProfit')}
                  value={formatCurrency(projection.totalProfit, language)}
                  tone={projection.totalProfit >= 0 ? 'success' : 'destructive'}
                />
                <PreviewCard
                  label={t('projectedMargin')}
                  value={projection.hasCostData ? `${projection.margin.toFixed(1)}%` : '—'}
                  tone="primary"
                />
              </div>

              <Sparkline
                values={projection.monthly.map(m => m.revenue)}
                color={TONE_CLASSES[activeScenario.tone].hex}
                label={t('monthlyRevenueTrend')}
              />

              {dirty && (
                <div className="text-[11px] text-warning bg-warning/10 border border-warning/30 rounded-md px-2 py-1.5">
                  {t('unsavedChanges')}
                </div>
              )}
            </aside>
          </div>

          <div className="border-t border-border px-6 py-3 flex items-center justify-between gap-3 shrink-0 bg-background">
            <Button
              variant="ghost"
              size="sm"
              className="text-destructive hover:text-destructive gap-1.5"
              onClick={() => setConfirmReset(true)}
            >
              <RotateCcw className="w-3.5 h-3.5" />
              {t('resetScenarioToDefaults')}
            </Button>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>{t('cancel')}</Button>
              <Button size="sm" onClick={handleApply} disabled={!dirty}>{t('applyConfig')}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!confirmDelete} onOpenChange={v => !v && setConfirmDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('deleteScenarioTitle')}</AlertDialogTitle>
            <AlertDialogDescription>{t('deleteScenarioDesc')}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => confirmDelete && handleDelete(confirmDelete)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t('delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={confirmReset} onOpenChange={setConfirmReset}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('resetScenarioToDefaults')}</AlertDialogTitle>
            <AlertDialogDescription>{t('resetScenarioDesc')}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleResetScenario}>{t('reset')}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

const PreviewCard = ({
  label, value, tone, hint,
}: { label: string; value: string; tone: 'success' | 'destructive' | 'primary'; hint?: string }) => {
  const toneCls = tone === 'success' ? 'text-success' : tone === 'destructive' ? 'text-destructive' : 'text-primary';
  return (
    <div className="rounded-lg border border-border bg-card p-3">
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <p className={cn('text-base font-bold tabular-nums', toneCls)}>{value}</p>
      {hint && <p className="text-[10px] text-muted-foreground mt-0.5">{hint}</p>}
    </div>
  );
};

const Sparkline = ({ values, color, label }: { values: number[]; color: string; label: string }) => {
  if (values.length === 0) return null;
  const w = 280;
  const h = 60;
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const span = max - min || 1;
  const points = values
    .map((v, i) => {
      const x = (i / Math.max(values.length - 1, 1)) * w;
      const y = h - ((v - min) / span) * h;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');
  return (
    <div className="rounded-lg border border-border bg-card p-3">
      <p className="text-[11px] text-muted-foreground mb-1">{label}</p>
      <svg viewBox={`0 0 ${w} ${h}`} width="100%" height={h} preserveAspectRatio="none">
        <polyline fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" points={points} />
      </svg>
    </div>
  );
};

export default ForecastAssumptionsPanel;

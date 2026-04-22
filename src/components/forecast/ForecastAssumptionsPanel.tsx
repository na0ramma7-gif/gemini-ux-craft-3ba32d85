// Forecast Assumptions — direct-entry redesign.
//
// One view: scenario tabs + horizon selector + Quick fill helper + grid.
// Each cell is a transaction count the user types. Revenue auto-calculates.
// No modes, no growth rates, no seasonal patterns. Cost growth rate stays.

import { useEffect, useMemo, useState } from 'react';
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
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Copy, Trash2, RotateCcw, Pencil, Wand2 } from 'lucide-react';
import { cn, formatCurrency } from '@/lib/utils';
import {
  FeatureForecastSettings,
  ForecastScenarioId,
  MAX_SCENARIOS,
  ServiceBaselineInput,
  TONE_CLASSES,
  projectForecast,
  scenarioHasDataBeyond,
} from '@/lib/featureForecast';
import {
  buildQuickFillCells,
  clearScenarioCell,
  duplicateScenario,
  deleteScenario,
  renameScenario,
  resetScenarioToDefaults,
  setHorizonOnDraft,
  setScenarioCellRate,
  setScenarioCellTx,
  setScenarioCellsBulk,
  setScenarioCostGrowth,
} from '@/hooks/useFeatureForecastSettings';
import { useApp } from '@/context/AppContext';
import ForecastDirectEntryGrid from '@/components/forecast/ForecastMatrixGrid';

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
  const [pendingHorizon, setPendingHorizon] = useState<6 | 12 | 24 | null>(null);
  const [quickFillOpen, setQuickFillOpen] = useState(false);

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

  const handleHorizonChange = (v: string) => {
    const next = Number(v) as 6 | 12 | 24;
    if (next >= draft.horizon) {
      setDraft(d => setHorizonOnDraft(d, next, false));
      return;
    }
    // Shrinking: warn if any scenario has data beyond the new horizon
    const wouldDiscard = draft.scenarios.some(s => scenarioHasDataBeyond(s, next));
    if (wouldDiscard) setPendingHorizon(next);
    else setDraft(d => setHorizonOnDraft(d, next, false));
  };
  const confirmHorizonShrink = () => {
    if (pendingHorizon != null) {
      setDraft(d => setHorizonOnDraft(d, pendingHorizon, true));
      setPendingHorizon(null);
    }
  };

  const handleResetScenario = () => {
    setDraft(d => resetScenarioToDefaults(d, activeId));
    setConfirmReset(false);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-[1280px] w-[96vw] h-[90vh] p-0 flex flex-col gap-0 overflow-hidden">
          <DialogHeader className="px-6 py-4 border-b border-border shrink-0">
            <DialogTitle className="text-lg font-semibold">{t('forecastAssumptions')}</DialogTitle>
            <DialogDescription className="text-xs">{t('forecastDirectEntryDesc')}</DialogDescription>
          </DialogHeader>

          {/* Scenario tabs + horizon */}
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
            <Select value={String(draft.horizon)} onValueChange={handleHorizonChange}>
              <SelectTrigger className="w-32 h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="6">6 {t('months')}</SelectItem>
                <SelectItem value="12">12 {t('months')}</SelectItem>
                <SelectItem value="24">24 {t('months')}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Compact summary strip — visible below lg where the aside would otherwise stack at the bottom. */}
          <div className="lg:hidden shrink-0 border-b border-border bg-card px-4 py-2 flex items-center gap-2 overflow-x-auto">
            <span className={cn('w-2 h-2 rounded-full shrink-0', TONE_CLASSES[activeScenario.tone].dot)} />
            <span className="text-[10px] uppercase tracking-wide text-muted-foreground whitespace-nowrap">{activeScenario.name}</span>
            <span className="text-muted-foreground/40">·</span>
            <div className="flex items-baseline gap-1.5 whitespace-nowrap">
              <span className="text-[10px] uppercase tracking-wide text-muted-foreground">{t('projectedRevenue')}</span>
              <span className="text-sm font-bold text-success tabular-nums">{formatCurrency(projection.totalRevenue, language)}</span>
            </div>
            <span className="text-muted-foreground/40">·</span>
            <div className="flex items-baseline gap-1.5 whitespace-nowrap">
              <span className="text-[10px] uppercase tracking-wide text-muted-foreground">{t('projectedCost')}</span>
              <span className="text-sm font-bold text-destructive tabular-nums">
                {projection.hasCostData ? formatCurrency(projection.totalCost, language) : '—'}
              </span>
            </div>
            <span className="text-muted-foreground/40">·</span>
            <div className="flex items-baseline gap-1.5 whitespace-nowrap">
              <span className="text-[10px] uppercase tracking-wide text-muted-foreground">{t('projectedProfit')}</span>
              <span className={cn("text-sm font-bold tabular-nums", projection.totalProfit >= 0 ? "text-success" : "text-destructive")}>
                {formatCurrency(projection.totalProfit, language)}
              </span>
            </div>
          </div>

          {/* Body: grid + live preview */}
          <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-[1fr_320px] overflow-hidden">
            <div className="overflow-auto p-6 space-y-4">
              {/* Cost growth + Quick fill toolbar */}
              <div className="flex items-end justify-between gap-3 flex-wrap">
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">{t('costGrowthRate')}</Label>
                  <div className="relative max-w-[180px]">
                    <Input
                      type="number"
                      step="0.5"
                      value={activeScenario.costGrowthRate}
                      onChange={e =>
                        setDraft(d => setScenarioCostGrowth(d, activeId, Number(e.target.value) || 0))
                      }
                      className="pe-8 h-9 text-sm"
                    />
                    <span className="absolute end-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">%</span>
                  </div>
                  <p className="text-[10px] text-muted-foreground">{t('costGrowthHelp')}</p>
                </div>
                <QuickFillButton
                  open={quickFillOpen}
                  onOpenChange={setQuickFillOpen}
                  baselines={serviceBaselines}
                  horizon={draft.horizon}
                  onApply={(cells) => {
                    setDraft(d => setScenarioCellsBulk(d, activeId, cells));
                    setQuickFillOpen(false);
                  }}
                  scenario={activeScenario}
                />
              </div>

              {serviceBaselines.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                  {t('noServicesForForecast')}
                </div>
              ) : (
                <ForecastDirectEntryGrid
                  scenario={activeScenario}
                  baselines={serviceBaselines}
                  projectedServices={projection.services}
                  forecastStartDate={forecastStartDate}
                  horizon={draft.horizon}
                  onSetCell={(sId, mIdx, tx) => setDraft(d => setScenarioCellTx(d, activeId, sId, mIdx, tx))}
                  onSetCellRate={(sId, mIdx, rate) => setDraft(d => setScenarioCellRate(d, activeId, sId, mIdx, rate))}
                  onClearCell={(sId, mIdx) => setDraft(d => clearScenarioCell(d, activeId, sId, mIdx))}
                  onBulkSet={(cells) => setDraft(d => setScenarioCellsBulk(d, activeId, cells))}
                />
              )}
            </div>

            <aside className="hidden lg:block lg:border-s border-border bg-muted/20 overflow-auto p-5 space-y-4">
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

      <AlertDialog open={pendingHorizon != null} onOpenChange={v => !v && setPendingHorizon(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('horizonShrinkTitle')}</AlertDialogTitle>
            <AlertDialogDescription>{t('horizonShrinkDesc')}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmHorizonShrink}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t('discardAndShrink')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

// ── Quick-fill popover ────────────────────────────────────────

interface QuickFillProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  baselines: ServiceBaselineInput[];
  horizon: number;
  scenario: import('@/lib/featureForecast').ForecastScenario;
  onApply: (cells: Array<{ serviceId: number; monthIndex: number; transactions: number }>) => void;
}

const QuickFillButton = ({ open, onOpenChange, baselines, horizon, scenario, onApply }: QuickFillProps) => {
  const { t } = useApp();
  const [serviceId, setServiceId] = useState<string>('all');
  const [startMonth, setStartMonth] = useState(0);
  const [mode, setMode] = useState<'fixed' | 'growth' | 'copyForward'>('fixed');
  const [value, setValue] = useState('100');
  const [growthPct, setGrowthPct] = useState('5');

  const apply = () => {
    const ids = serviceId === 'all' ? baselines.map(b => b.serviceId) : [Number(serviceId)];
    const cells = buildQuickFillCells(
      ids,
      Math.max(0, Math.min(horizon - 1, startMonth)),
      horizon - 1,
      mode,
      scenario,
      { value: Number(value) || 0, growthPct: Number(growthPct) || 0 },
    );
    onApply(cells);
  };

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="h-9 gap-1.5" disabled={baselines.length === 0}>
          <Wand2 className="w-3.5 h-3.5" />
          {t('quickFill')}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-4 space-y-3" align="end">
        <div className="space-y-1.5">
          <Label className="text-xs">{t('service')}</Label>
          <Select value={serviceId} onValueChange={setServiceId}>
            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('allServices')}</SelectItem>
              {baselines.map(b => (
                <SelectItem key={b.serviceId} value={String(b.serviceId)}>{b.serviceName}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">{t('startingMonth')}</Label>
          <Select value={String(startMonth)} onValueChange={v => setStartMonth(Number(v))}>
            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              {Array.from({ length: horizon }, (_, i) => (
                <SelectItem key={i} value={String(i)}>{`${t('month')} ${i + 1}`}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">{t('fillMode')}</Label>
          <Select value={mode} onValueChange={v => setMode(v as any)}>
            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="fixed">{t('fillFixed')}</SelectItem>
              <SelectItem value="growth">{t('fillGrowth')}</SelectItem>
              <SelectItem value="copyForward">{t('copyForward')}</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {mode !== 'copyForward' && (
          <div className="space-y-1.5">
            <Label className="text-xs">
              {mode === 'fixed' ? t('value') : t('startingValue')}
            </Label>
            <Input type="number" value={value} onChange={e => setValue(e.target.value)} className="h-8 text-sm" />
          </div>
        )}
        {mode === 'growth' && (
          <div className="space-y-1.5">
            <Label className="text-xs">{t('monthlyGrowthPct')}</Label>
            <Input type="number" step="0.5" value={growthPct} onChange={e => setGrowthPct(e.target.value)} className="h-8 text-sm" />
          </div>
        )}
        <div className="flex justify-end gap-2 pt-1">
          <Button variant="outline" size="sm" className="h-8" onClick={() => onOpenChange(false)}>{t('cancel')}</Button>
          <Button size="sm" className="h-8" onClick={apply}>{t('apply')}</Button>
        </div>
      </PopoverContent>
    </Popover>
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
  const w = 280; const h = 60;
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

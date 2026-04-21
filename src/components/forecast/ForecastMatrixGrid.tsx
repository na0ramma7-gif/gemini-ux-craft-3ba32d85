// Matrix mode editor: services × forecast months grid.
//
// Behavior:
//   - Cells autopopulate from the live projection (which already accounts for
//     overrides via the engine's "override-wins-then-resume" semantics).
//   - Edited cells get a subtle amber left-border + dot indicator.
//   - Hover on an overridden cell reveals a "Reset to auto" link.
//   - Keyboard nav: arrows, Tab, Enter, Escape.
//   - Bulk actions: select a range with shift+click, then apply Copy /
//     Increase % / Reset to auto from the toolbar.
//
// We render a single sticky-header / sticky-first-column table inside an
// overflow-x-auto wrapper. Cell width is fixed (~96px) so totals always
// align and copy/paste of values stays predictable.
import { useMemo, useRef, useState, useEffect, KeyboardEvent } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
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
import { RotateCcw, Copy, Percent } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import {
  ForecastScenario,
  ProjectedService,
  MatrixOverride,
  ServiceBaselineInput,
} from '@/lib/featureForecast';

const MONTH_KEYS = [
  'monthJanShort', 'monthFebShort', 'monthMarShort', 'monthAprShort',
  'monthMayShort', 'monthJunShort', 'monthJulShort', 'monthAugShort',
  'monthSepShort', 'monthOctShort', 'monthNovShort', 'monthDecShort',
] as const;

interface Props {
  scenario: ForecastScenario;
  baselines: ServiceBaselineInput[];
  projectedServices: ProjectedService[];
  forecastStartDate: Date;
  horizon: number;
  onSetCell: (serviceId: number, monthIndex: number, tx: number) => void;
  onClearCell: (serviceId: number, monthIndex: number) => void;
  onBulkSet: (cells: MatrixOverride[]) => void;
  onClearAll: () => void;
}

interface CellPos {
  rowIdx: number;
  colIdx: number;
}

const ForecastMatrixGrid = ({
  scenario,
  baselines,
  projectedServices,
  forecastStartDate,
  horizon,
  onSetCell,
  onClearCell,
  onBulkSet,
  onClearAll,
}: Props) => {
  const { t } = useApp();
  const [editingCell, setEditingCell] = useState<CellPos | null>(null);
  const [editValue, setEditValue] = useState('');
  const [focusCell, setFocusCell] = useState<CellPos>({ rowIdx: 0, colIdx: 0 });
  const [selection, setSelection] = useState<Set<string>>(new Set());
  const [confirmReset, setConfirmReset] = useState(false);
  const [bulkInputOpen, setBulkInputOpen] = useState<null | 'copy' | 'pct'>(null);
  const [bulkValue, setBulkValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const overrideMap = useMemo(() => {
    const m = new Map<string, number>();
    (scenario.cellOverrides ?? []).forEach(o =>
      m.set(`${o.serviceId}:${o.monthIndex}`, o.tx),
    );
    return m;
  }, [scenario.cellOverrides]);

  const overrideCount = scenario.cellOverrides?.length ?? 0;

  const monthHeaders = useMemo(
    () =>
      Array.from({ length: horizon }, (_, i) => {
        const d = new Date(
          forecastStartDate.getFullYear(),
          forecastStartDate.getMonth() + i,
          1,
        );
        return {
          label: `${t(MONTH_KEYS[d.getMonth()])} '${String(d.getFullYear()).slice(2)}`,
          year: d.getFullYear(),
        };
      }),
    [forecastStartDate, horizon, t],
  );

  useEffect(() => {
    if (editingCell && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editingCell]);

  const cellKey = (s: number, m: number) => `${s}:${m}`;

  const startEdit = (rowIdx: number, colIdx: number) => {
    const svc = projectedServices[rowIdx];
    if (!svc) return;
    const current = svc.monthly[colIdx]?.tx ?? 0;
    setEditingCell({ rowIdx, colIdx });
    setEditValue(String(Math.round(current)));
  };

  const commitEdit = (advance: 'down' | 'right' | 'none') => {
    if (!editingCell) return;
    const { rowIdx, colIdx } = editingCell;
    const svc = projectedServices[rowIdx];
    const num = Number(editValue);
    if (svc && Number.isFinite(num)) {
      onSetCell(svc.serviceId, colIdx, Math.max(0, num));
    }
    setEditingCell(null);
    if (advance === 'down') {
      const next = Math.min(rowIdx + 1, projectedServices.length - 1);
      setFocusCell({ rowIdx: next, colIdx });
    } else if (advance === 'right') {
      let nextCol = colIdx + 1;
      let nextRow = rowIdx;
      if (nextCol >= horizon) { nextCol = 0; nextRow = Math.min(rowIdx + 1, projectedServices.length - 1); }
      setFocusCell({ rowIdx: nextRow, colIdx: nextCol });
    }
  };

  const handleGridKey = (e: KeyboardEvent<HTMLDivElement>) => {
    if (editingCell) return;
    const { rowIdx, colIdx } = focusCell;
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      setFocusCell({ rowIdx, colIdx: Math.min(horizon - 1, colIdx + 1) });
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      setFocusCell({ rowIdx, colIdx: Math.max(0, colIdx - 1) });
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setFocusCell({ rowIdx: Math.min(projectedServices.length - 1, rowIdx + 1), colIdx });
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setFocusCell({ rowIdx: Math.max(0, rowIdx - 1), colIdx });
    } else if (e.key === 'Enter' || e.key === 'F2') {
      e.preventDefault();
      startEdit(rowIdx, colIdx);
    } else if (e.key === 'Tab') {
      e.preventDefault();
      let nextCol = colIdx + (e.shiftKey ? -1 : 1);
      let nextRow = rowIdx;
      if (nextCol >= horizon) { nextCol = 0; nextRow = Math.min(rowIdx + 1, projectedServices.length - 1); }
      if (nextCol < 0) { nextCol = horizon - 1; nextRow = Math.max(0, rowIdx - 1); }
      setFocusCell({ rowIdx: nextRow, colIdx: nextCol });
    } else if (e.key === 'Delete' || e.key === 'Backspace') {
      e.preventDefault();
      const svc = projectedServices[rowIdx];
      if (svc && overrideMap.has(cellKey(svc.serviceId, colIdx))) {
        onClearCell(svc.serviceId, colIdx);
      }
    }
  };

  const toggleSelect = (rowIdx: number, colIdx: number, shift: boolean) => {
    const svc = projectedServices[rowIdx];
    if (!svc) return;
    const k = cellKey(svc.serviceId, colIdx);
    setSelection(prev => {
      const next = new Set(shift ? prev : []);
      if (next.has(k)) next.delete(k);
      else next.add(k);
      return next;
    });
  };

  const applyBulk = (kind: 'copy' | 'pct' | 'reset') => {
    if (selection.size === 0) return;
    if (kind === 'reset') {
      Array.from(selection).forEach(k => {
        const [sId, mIdx] = k.split(':').map(Number);
        onClearCell(sId, mIdx);
      });
      setSelection(new Set());
      return;
    }
    setBulkValue('');
    setBulkInputOpen(kind);
  };

  const submitBulkValue = () => {
    const num = Number(bulkValue);
    if (!Number.isFinite(num) || !bulkInputOpen) return;
    const cells: MatrixOverride[] = [];
    Array.from(selection).forEach(k => {
      const [sId, mIdx] = k.split(':').map(Number);
      const svc = projectedServices.find(s => s.serviceId === sId);
      const baseTx = svc?.monthly[mIdx]?.tx ?? 0;
      const tx = bulkInputOpen === 'copy' ? num : baseTx * (1 + num / 100);
      cells.push({ serviceId: sId, monthIndex: mIdx, tx: Math.max(0, tx) });
    });
    onBulkSet(cells);
    setBulkInputOpen(null);
    setSelection(new Set());
  };

  if (projectedServices.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
        {t('noServicesForForecast')}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="text-xs text-muted-foreground">
          {overrideCount > 0 ? (
            <span className="inline-flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-warning" />
              {overrideCount} {t('overriddenCells')}
            </span>
          ) : (
            t('matrixHelp')
          )}
        </div>
        <div className="flex items-center gap-1.5 flex-wrap">
          {selection.size > 0 && (
            <>
              <span className="text-[11px] text-muted-foreground me-1">{selection.size} sel.</span>
              <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={() => applyBulk('copy')}>
                <Copy className="w-3 h-3" /> {t('copyValue')}
              </Button>
              <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={() => applyBulk('pct')}>
                <Percent className="w-3 h-3" /> {t('increaseByPct')}
              </Button>
              <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={() => applyBulk('reset')}>
                <RotateCcw className="w-3 h-3" /> {t('resetSelection')}
              </Button>
            </>
          )}
          {overrideCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs text-destructive hover:text-destructive gap-1"
              onClick={() => setConfirmReset(true)}
            >
              <RotateCcw className="w-3 h-3" />
              {t('resetAllOverrides')}
            </Button>
          )}
        </div>
      </div>

      {/* Grid */}
      <div
        ref={containerRef}
        tabIndex={0}
        onKeyDown={handleGridKey}
        className="rounded-xl border border-border overflow-x-auto focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <table className="text-xs border-separate border-spacing-0">
          <thead>
            <tr>
              <th className="sticky start-0 top-0 z-20 bg-muted/60 border-b border-e border-border px-3 py-2 text-start text-[11px] uppercase tracking-wide text-muted-foreground min-w-[180px]">
                {t('service')}
              </th>
              {monthHeaders.map((h, i) => (
                <th
                  key={i}
                  className="sticky top-0 z-10 bg-muted/60 border-b border-border px-2 py-2 text-end text-[11px] uppercase tracking-wide text-muted-foreground tabular-nums w-[96px] min-w-[96px]"
                >
                  {h.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {projectedServices.map((svc, rIdx) => (
              <tr key={svc.serviceId}>
                <td className="sticky start-0 z-10 bg-card border-b border-e border-border px-3 py-2 font-medium text-foreground min-w-[180px]">
                  {svc.serviceName}
                </td>
                {svc.monthly.map((m, cIdx) => {
                  const k = cellKey(svc.serviceId, cIdx);
                  const overridden = overrideMap.has(k);
                  const selected = selection.has(k);
                  const isFocus = focusCell.rowIdx === rIdx && focusCell.colIdx === cIdx;
                  const isEditing = editingCell?.rowIdx === rIdx && editingCell.colIdx === cIdx;
                  return (
                    <td
                      key={cIdx}
                      className={cn(
                        'group relative border-b border-border/60 px-2 py-1.5 text-end tabular-nums w-[96px] min-w-[96px] cursor-cell select-none',
                        overridden && 'bg-warning/5 border-s-2 border-s-warning',
                        selected && 'bg-primary/10',
                        isFocus && !isEditing && 'ring-1 ring-inset ring-primary',
                      )}
                      onClick={e => {
                        setFocusCell({ rowIdx: rIdx, colIdx: cIdx });
                        if (e.shiftKey || e.metaKey || e.ctrlKey) {
                          toggleSelect(rIdx, cIdx, true);
                        }
                      }}
                      onDoubleClick={() => startEdit(rIdx, cIdx)}
                    >
                      {isEditing ? (
                        <input
                          ref={inputRef}
                          type="number"
                          value={editValue}
                          onChange={e => setEditValue(e.target.value)}
                          onBlur={() => commitEdit('none')}
                          onKeyDown={e => {
                            if (e.key === 'Enter') { e.preventDefault(); commitEdit('down'); }
                            else if (e.key === 'Tab') { e.preventDefault(); commitEdit('right'); }
                            else if (e.key === 'Escape') { e.preventDefault(); setEditingCell(null); }
                          }}
                          className="w-full h-7 text-end text-xs bg-background border border-input rounded px-1 tabular-nums"
                        />
                      ) : (
                        <span className={cn(overridden ? 'text-warning font-semibold' : 'text-foreground')}>
                          {Math.round(m.tx).toLocaleString()}
                        </span>
                      )}
                      {overridden && !isEditing && (
                        <button
                          type="button"
                          aria-label={t('resetToAuto')}
                          title={t('resetToAuto')}
                          onClick={e => { e.stopPropagation(); onClearCell(svc.serviceId, cIdx); }}
                          className="opacity-0 group-hover:opacity-100 absolute top-0.5 end-0.5 text-[9px] text-primary hover:underline transition-opacity"
                        >
                          {t('reset')}
                        </button>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <AlertDialog open={confirmReset} onOpenChange={setConfirmReset}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('resetAllOverrides')}</AlertDialogTitle>
            <AlertDialogDescription>{t('confirmModeSwitchDesc')}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => { onClearAll(); setConfirmReset(false); setSelection(new Set()); }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t('reset')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!bulkInputOpen} onOpenChange={v => !v && setBulkInputOpen(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {bulkInputOpen === 'copy' ? t('copyValue') : t('increaseByPct')}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {selection.size} {t('overriddenCells')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <input
            type="number"
            autoFocus
            value={bulkValue}
            onChange={e => setBulkValue(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') submitBulkValue(); }}
            placeholder={t('enterValue')}
            className="w-full h-10 px-3 text-sm border border-input bg-background rounded-md tabular-nums"
          />
          <AlertDialogFooter>
            <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={submitBulkValue}>{t('applyConfig')}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ForecastMatrixGrid;
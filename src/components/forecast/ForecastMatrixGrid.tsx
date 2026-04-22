// Direct-entry forecast grid.
//
// Rows = services (sticky first column). Columns = months across the horizon
// (sticky header). Each cell holds an editable transaction count and shows
// the auto-derived revenue underneath. Hovering a cell reveals a "Set rate"
// link that expands a per-month rate override input.
//
// Keyboard nav: arrows / Tab / Enter / Esc / Delete (clears cell).
// Range select: Shift+click extends a rectangular selection from the anchor.
// While a selection is active, typing a number opens a fill prompt that
// applies to every cell in the selection.

import { useEffect, useMemo, useRef, useState } from 'react';
import { cn, formatCurrency } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useApp } from '@/context/AppContext';
import {
  ForecastScenario,
  ProjectedService,
  ServiceBaselineInput,
  getCellRate,
  getCellTx,
} from '@/lib/featureForecast';

const MONTH_KEYS = [
  'monthJanShort','monthFebShort','monthMarShort','monthAprShort',
  'monthMayShort','monthJunShort','monthJulShort','monthAugShort',
  'monthSepShort','monthOctShort','monthNovShort','monthDecShort',
] as const;

interface Props {
  scenario: ForecastScenario;
  baselines: ServiceBaselineInput[];
  projectedServices: ProjectedService[];
  forecastStartDate: Date;
  horizon: number;
  onSetCell: (serviceId: number, monthIndex: number, tx: number) => void;
  onSetCellRate: (serviceId: number, monthIndex: number, rate: number | null) => void;
  onClearCell: (serviceId: number, monthIndex: number) => void;
  onBulkSet: (cells: Array<{ serviceId: number; monthIndex: number; transactions: number }>) => void;
}

interface CellPos { rowIdx: number; colIdx: number }

const ForecastDirectEntryGrid = ({
  scenario,
  baselines,
  projectedServices,
  forecastStartDate,
  horizon,
  onSetCell,
  onSetCellRate,
  onClearCell,
  onBulkSet,
}: Props) => {
  const { t, language } = useApp();
  const [editing, setEditing] = useState<CellPos | null>(null);
  const [editValue, setEditValue] = useState('');
  const [focusCell, setFocusCell] = useState<CellPos>({ rowIdx: 0, colIdx: 0 });
  const [anchor, setAnchor] = useState<CellPos | null>(null);
  const [selection, setSelection] = useState<Set<string>>(new Set());
  const [bulkPrompt, setBulkPrompt] = useState<string | null>(null);
  const [ratePopoverFor, setRatePopoverFor] = useState<CellPos | null>(null);
  const [rateDraft, setRateDraft] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const monthHeaders = useMemo(
    () =>
      Array.from({ length: horizon }, (_, i) => {
        const d = new Date(forecastStartDate.getFullYear(), forecastStartDate.getMonth() + i, 1);
        return { label: `${t(MONTH_KEYS[d.getMonth()])} '${String(d.getFullYear()).slice(2)}`, year: d.getFullYear() };
      }),
    [forecastStartDate, horizon, t],
  );

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editing]);

  const cellKey = (s: number, m: number) => `${s}:${m}`;

  // Keep selection rectangular (anchor → focus)
  const computeRectSelection = (a: CellPos, b: CellPos): Set<string> => {
    const r0 = Math.min(a.rowIdx, b.rowIdx);
    const r1 = Math.max(a.rowIdx, b.rowIdx);
    const c0 = Math.min(a.colIdx, b.colIdx);
    const c1 = Math.max(a.colIdx, b.colIdx);
    const out = new Set<string>();
    for (let r = r0; r <= r1; r++) {
      const svc = projectedServices[r];
      if (!svc) continue;
      for (let c = c0; c <= c1; c++) out.add(cellKey(svc.serviceId, c));
    }
    return out;
  };

  const startEdit = (rowIdx: number, colIdx: number, seed?: string) => {
    const svc = projectedServices[rowIdx];
    if (!svc) return;
    const tx = getCellTx(scenario, svc.serviceId, colIdx);
    setEditing({ rowIdx, colIdx });
    setEditValue(seed != null ? seed : tx != null ? String(Math.round(tx)) : '');
  };

  const commitEdit = (advance: 'down' | 'right' | 'none') => {
    if (!editing) return;
    const { rowIdx, colIdx } = editing;
    const svc = projectedServices[rowIdx];
    if (svc) {
      const trimmed = editValue.trim();
      if (trimmed === '') {
        onClearCell(svc.serviceId, colIdx);
      } else {
        const num = Number(trimmed);
        if (Number.isFinite(num)) onSetCell(svc.serviceId, colIdx, Math.max(0, num));
      }
    }
    setEditing(null);
    if (advance === 'down') {
      setFocusCell({ rowIdx: Math.min(rowIdx + 1, projectedServices.length - 1), colIdx });
    } else if (advance === 'right') {
      let nextCol = colIdx + 1;
      let nextRow = rowIdx;
      if (nextCol >= horizon) { nextCol = 0; nextRow = Math.min(rowIdx + 1, projectedServices.length - 1); }
      setFocusCell({ rowIdx: nextRow, colIdx: nextCol });
    }
  };

  const handleGridKey = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (editing) return;
    if (bulkPrompt != null) return;
    const { rowIdx, colIdx } = focusCell;

    // Selection-fill: if selection size > 1 and user types a digit, open prompt
    if (selection.size > 1 && /^[0-9]$/.test(e.key)) {
      e.preventDefault();
      setBulkPrompt(e.key);
      return;
    }

    if (e.key === 'ArrowRight') { e.preventDefault(); setFocusCell({ rowIdx, colIdx: Math.min(horizon - 1, colIdx + 1) }); setSelection(new Set()); }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); setFocusCell({ rowIdx, colIdx: Math.max(0, colIdx - 1) }); setSelection(new Set()); }
    else if (e.key === 'ArrowDown') { e.preventDefault(); setFocusCell({ rowIdx: Math.min(projectedServices.length - 1, rowIdx + 1), colIdx }); setSelection(new Set()); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setFocusCell({ rowIdx: Math.max(0, rowIdx - 1), colIdx }); setSelection(new Set()); }
    else if (e.key === 'Enter' || e.key === 'F2') { e.preventDefault(); startEdit(rowIdx, colIdx); }
    else if (e.key === 'Tab') {
      e.preventDefault();
      let nextCol = colIdx + (e.shiftKey ? -1 : 1);
      let nextRow = rowIdx;
      if (nextCol >= horizon) { nextCol = 0; nextRow = Math.min(rowIdx + 1, projectedServices.length - 1); }
      if (nextCol < 0) { nextCol = horizon - 1; nextRow = Math.max(0, rowIdx - 1); }
      setFocusCell({ rowIdx: nextRow, colIdx: nextCol });
      setSelection(new Set());
    } else if (e.key === 'Delete' || e.key === 'Backspace') {
      e.preventDefault();
      if (selection.size > 0) {
        Array.from(selection).forEach(k => {
          const [sId, mIdx] = k.split(':').map(Number);
          onClearCell(sId, mIdx);
        });
        setSelection(new Set());
      } else {
        const svc = projectedServices[rowIdx];
        if (svc) onClearCell(svc.serviceId, colIdx);
      }
    } else if (/^[0-9]$/.test(e.key)) {
      e.preventDefault();
      startEdit(rowIdx, colIdx, e.key);
    }
  };

  const handleCellClick = (rowIdx: number, colIdx: number, shift: boolean) => {
    if (shift && anchor) {
      setFocusCell({ rowIdx, colIdx });
      setSelection(computeRectSelection(anchor, { rowIdx, colIdx }));
    } else {
      setFocusCell({ rowIdx, colIdx });
      setAnchor({ rowIdx, colIdx });
      setSelection(new Set());
    }
    containerRef.current?.focus();
  };

  const submitBulk = (raw: string) => {
    const num = Number(raw);
    if (!Number.isFinite(num)) { setBulkPrompt(null); return; }
    const cells: Array<{ serviceId: number; monthIndex: number; transactions: number }> = [];
    Array.from(selection).forEach(k => {
      const [sId, mIdx] = k.split(':').map(Number);
      cells.push({ serviceId: sId, monthIndex: mIdx, transactions: Math.max(0, num) });
    });
    onBulkSet(cells);
    setBulkPrompt(null);
    setSelection(new Set());
  };

  const openRatePopover = (rowIdx: number, colIdx: number) => {
    const svc = projectedServices[rowIdx];
    if (!svc) return;
    const current = getCellRate(scenario, svc.serviceId, colIdx, svc.defaultRate);
    setRateDraft(String(current));
    setRatePopoverFor({ rowIdx, colIdx });
  };

  if (projectedServices.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
        {t('noServicesForForecast')}
      </div>
    );
  }

  // Totals
  const monthlyTotalsTx = Array.from({ length: horizon }, (_, i) =>
    projectedServices.reduce((s, svc) => s + svc.monthly[i].tx, 0),
  );
  const monthlyTotalsRev = Array.from({ length: horizon }, (_, i) =>
    projectedServices.reduce((s, svc) => s + svc.monthly[i].revenue, 0),
  );
  const grandTotalTx = monthlyTotalsTx.reduce((a, b) => a + b, 0);
  const grandTotalRev = monthlyTotalsRev.reduce((a, b) => a + b, 0);

  return (
    <div className="space-y-2">
      {/* Mobile hint — the matrix is intentionally kept as a horizontal grid
          (rows = services, cols = months) because a stacked card list would
          destroy month-over-month comparison and break range-fill / keyboard
          nav. The first column is sticky so context is preserved while
          swiping. */}
      <p className="md:hidden text-[11px] text-muted-foreground flex items-center gap-1.5">
        <span aria-hidden>←</span>
        {t('swipeToSeeMoreMonths') !== 'swipeToSeeMoreMonths'
          ? t('swipeToSeeMoreMonths')
          : 'Swipe horizontally to see more months. The service column stays in view.'}
        <span aria-hidden>→</span>
      </p>
      {/* Grid */}
      <div
        ref={containerRef}
        tabIndex={0}
        onKeyDown={handleGridKey}
        className="rounded-xl border border-border overflow-x-auto overscroll-x-contain [-webkit-overflow-scrolling:touch] focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <table className="text-xs border-separate border-spacing-0">
          <thead>
            <tr>
              <th className="sticky start-0 top-0 z-20 bg-muted/60 border-b border-e border-border px-3 py-2 text-start text-[11px] uppercase tracking-wide text-muted-foreground min-w-[200px]">
                {t('service')}
              </th>
              {monthHeaders.map((h, i) => (
                <th
                  key={i}
                  className="sticky top-0 z-10 bg-muted/60 border-b border-border px-2 py-2 text-end text-[11px] uppercase tracking-wide text-muted-foreground tabular-nums w-[110px] min-w-[110px]"
                >
                  {h.label}
                </th>
              ))}
              <th className="sticky top-0 z-10 bg-muted/60 border-b border-s border-border px-2 py-2 text-end text-[11px] uppercase tracking-wide text-muted-foreground tabular-nums w-[120px] min-w-[120px]">
                {t('total')}
              </th>
            </tr>
          </thead>
          <tbody>
            {projectedServices.map((svc, rIdx) => (
              <tr key={svc.serviceId}>
                <td className="sticky start-0 z-10 bg-card border-b border-e border-border px-3 py-2 align-top min-w-[200px]">
                  <div className="font-medium text-foreground">{svc.serviceName}</div>
                  <div className="text-[10px] text-muted-foreground tabular-nums mt-0.5">
                    {formatCurrency(svc.defaultRate, language)} / {t('transactionsShort')}
                  </div>
                </td>
                {svc.monthly.map((m, cIdx) => {
                  const k = cellKey(svc.serviceId, cIdx);
                  const isFocus = focusCell.rowIdx === rIdx && focusCell.colIdx === cIdx;
                  const isEditing = editing?.rowIdx === rIdx && editing.colIdx === cIdx;
                  const selected = selection.has(k);
                  const cellTx = getCellTx(scenario, svc.serviceId, cIdx);
                  const filled = cellTx != null;
                  const rateOverridden = scenario.data?.[svc.serviceId]?.[cIdx]?.rate != null;
                  return (
                    <td
                      key={cIdx}
                      className={cn(
                        'group relative border-b border-border/60 px-2 py-1.5 text-end tabular-nums w-[110px] min-w-[110px] h-14 cursor-cell select-none align-top',
                        selected && 'bg-primary/10',
                        isFocus && !isEditing && 'ring-1 ring-inset ring-primary',
                      )}
                      onClick={e => handleCellClick(rIdx, cIdx, e.shiftKey)}
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
                            else if (e.key === 'Escape') { e.preventDefault(); setEditing(null); }
                          }}
                          className="w-full h-7 text-end text-sm bg-background border border-input rounded px-1 tabular-nums"
                        />
                      ) : (
                        <div>
                          <div className={cn('text-sm leading-tight', filled ? 'text-foreground font-medium' : 'text-muted-foreground/60')}>
                            {filled ? Math.round(cellTx!).toLocaleString() : '—'}
                          </div>
                          <div className="text-[10px] text-muted-foreground tabular-nums leading-tight">
                            {filled ? formatCurrency(Math.round(m.revenue), language) : '\u00A0'}
                          </div>
                        </div>
                      )}
                      {!isEditing && (
                        <Popover
                          open={ratePopoverFor?.rowIdx === rIdx && ratePopoverFor?.colIdx === cIdx}
                          onOpenChange={open => { if (!open) setRatePopoverFor(null); }}
                        >
                          <PopoverTrigger asChild>
                            <button
                              type="button"
                              onClick={e => { e.stopPropagation(); openRatePopover(rIdx, cIdx); }}
                              className={cn(
                                'absolute bottom-0.5 start-1 text-[9px] hover:underline transition-opacity',
                                rateOverridden
                                  ? 'opacity-100 text-primary'
                                  : 'opacity-0 group-hover:opacity-100 text-muted-foreground',
                              )}
                              title={t('setRateForMonth')}
                            >
                              {rateOverridden ? `@ ${Math.round(getCellRate(scenario, svc.serviceId, cIdx, svc.defaultRate))}` : t('setRate')}
                            </button>
                          </PopoverTrigger>
                          <PopoverContent className="w-56 p-3" onClick={e => e.stopPropagation()}>
                            <Label className="text-xs">{t('cellRateOverride')}</Label>
                            <p className="text-[10px] text-muted-foreground mb-2">
                              {t('defaultRateLabel')}: {formatCurrency(svc.defaultRate, language)}
                            </p>
                            <Input
                              type="number"
                              step="0.01"
                              autoFocus
                              value={rateDraft}
                              onChange={e => setRateDraft(e.target.value)}
                              onKeyDown={e => {
                                if (e.key === 'Enter') {
                                  const num = Number(rateDraft);
                                  if (Number.isFinite(num) && num >= 0) onSetCellRate(svc.serviceId, cIdx, num);
                                  setRatePopoverFor(null);
                                } else if (e.key === 'Escape') {
                                  setRatePopoverFor(null);
                                }
                              }}
                              className="h-8 text-sm"
                            />
                            <div className="flex justify-between gap-2 mt-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 text-xs"
                                onClick={() => { onSetCellRate(svc.serviceId, cIdx, null); setRatePopoverFor(null); }}
                              >
                                {t('useDefaultRate')}
                              </Button>
                              <Button
                                size="sm"
                                className="h-7 text-xs"
                                onClick={() => {
                                  const num = Number(rateDraft);
                                  if (Number.isFinite(num) && num >= 0) onSetCellRate(svc.serviceId, cIdx, num);
                                  setRatePopoverFor(null);
                                }}
                              >
                                {t('apply')}
                              </Button>
                            </div>
                          </PopoverContent>
                        </Popover>
                      )}
                    </td>
                  );
                })}
                <td className="border-b border-s border-border bg-muted/20 px-2 py-1.5 text-end tabular-nums align-top w-[120px] min-w-[120px]">
                  <div className="text-sm font-semibold text-foreground">
                    {Math.round(svc.totalTx).toLocaleString()}
                  </div>
                  <div className="text-[10px] text-muted-foreground">
                    {formatCurrency(Math.round(svc.totalRevenue), language)}
                  </div>
                </td>
              </tr>
            ))}
            {/* Totals row */}
            <tr>
              <td className="sticky start-0 z-10 bg-muted/40 border-t-2 border-border px-3 py-2 text-[11px] uppercase tracking-wide font-semibold text-foreground min-w-[200px]">
                {t('total')}
              </td>
              {monthlyTotalsTx.map((tx, i) => (
                <td key={i} className="bg-muted/40 border-t-2 border-border px-2 py-2 text-end tabular-nums align-top w-[110px] min-w-[110px]">
                  <div className="text-sm font-semibold text-foreground">{Math.round(tx).toLocaleString()}</div>
                  <div className="text-[10px] text-success">{formatCurrency(Math.round(monthlyTotalsRev[i]), language)}</div>
                </td>
              ))}
              <td className="bg-muted/60 border-t-2 border-s border-border px-2 py-2 text-end tabular-nums align-top">
                <div className="text-sm font-bold text-foreground">{Math.round(grandTotalTx).toLocaleString()}</div>
                <div className="text-[10px] font-semibold text-success">{formatCurrency(Math.round(grandTotalRev), language)}</div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <p className="text-[11px] text-muted-foreground">{t('directEntryHelp')}</p>

      {/* Bulk fill prompt */}
      {bulkPrompt != null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setBulkPrompt(null)}>
          <div className="bg-background border border-border rounded-lg p-4 w-80 shadow-lg" onClick={e => e.stopPropagation()}>
            <Label className="text-sm font-semibold">{t('fillSelection')}</Label>
            <p className="text-xs text-muted-foreground mt-1 mb-3">{selection.size} {t('cellsSelected')}</p>
            <Input
              type="number"
              autoFocus
              defaultValue={bulkPrompt}
              onKeyDown={e => {
                if (e.key === 'Enter') submitBulk((e.target as HTMLInputElement).value);
                else if (e.key === 'Escape') setBulkPrompt(null);
              }}
              className="h-9 text-sm"
            />
            <div className="flex justify-end gap-2 mt-3">
              <Button variant="outline" size="sm" onClick={() => setBulkPrompt(null)}>{t('cancel')}</Button>
              <Button size="sm" onClick={() => {
                const inp = (document.activeElement as HTMLInputElement);
                submitBulk(inp?.value ?? bulkPrompt);
              }}>{t('apply')}</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ForecastDirectEntryGrid;

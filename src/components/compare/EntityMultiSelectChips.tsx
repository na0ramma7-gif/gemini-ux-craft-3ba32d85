import { useState, useMemo } from 'react';
import { Check, ChevronDown, X, Layers } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { useApp } from '@/context/AppContext';

export interface EntityOption {
  id: number;
  label: string;
  hint?: string;
}

interface EntityMultiSelectChipsProps {
  label: string;
  options: EntityOption[];
  selectedIds: number[];
  onChange: (ids: number[]) => void;
  /** Optional empty-selection hint shown when no chips are selected. */
  allLabel?: string;
  /** Max chips displayed before collapsing into "+N more". */
  maxChips?: number;
  className?: string;
}

/**
 * Multi-select with always-visible removable chips and an "All" pill
 * shown when the selection is empty. Works for portfolios, products,
 * and features. Responsive (chips wrap; popover constrained to viewport).
 */
const EntityMultiSelectChips = ({
  label,
  options,
  selectedIds,
  onChange,
  allLabel,
  maxChips = 6,
  className,
}: EntityMultiSelectChipsProps) => {
  const { t } = useApp();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter(o => o.label.toLowerCase().includes(q));
  }, [options, query]);

  const selectedSet = new Set(selectedIds);
  const selectedOptions = options.filter(o => selectedSet.has(o.id));
  const visibleChips = selectedOptions.slice(0, maxChips);
  const overflow = selectedOptions.length - visibleChips.length;

  const toggle = (id: number) => {
    if (selectedSet.has(id)) onChange(selectedIds.filter(x => x !== id));
    else onChange([...selectedIds, id]);
  };

  const clearAll = () => onChange([]);

  return (
    <div className={cn('flex flex-wrap items-center gap-2', className)}>
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground shrink-0">
        <Layers className="w-3.5 h-3.5" />
        <span className="font-medium">{label}:</span>
      </div>

      {/* Always-visible chips */}
      {selectedOptions.length === 0 ? (
        <Badge variant="secondary" className="text-[11px] font-normal">
          {allLabel ?? t('allItems')}
        </Badge>
      ) : (
        <div className="flex flex-wrap items-center gap-1.5">
          {visibleChips.map(opt => (
            <Badge
              key={opt.id}
              variant="secondary"
              className="text-[11px] font-normal pe-1 ps-2 gap-1 group"
            >
              <span className="truncate max-w-[140px]">{opt.label}</span>
              <button
                type="button"
                aria-label={`Remove ${opt.label}`}
                onClick={() => toggle(opt.id)}
                className="rounded-full p-0.5 hover:bg-foreground/10 transition-colors"
              >
                <X className="w-3 h-3" />
              </button>
            </Badge>
          ))}
          {overflow > 0 && (
            <Badge variant="outline" className="text-[11px] font-normal">
              +{overflow} {t('more')}
            </Badge>
          )}
        </div>
      )}

      {/* Popover trigger */}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="h-7 px-2.5 text-xs gap-1">
            {t('select')}
            <ChevronDown className="w-3 h-3" />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          align="start"
          className="p-0 w-[min(360px,90vw)]"
        >
          <div className="p-2 border-b border-border">
            <Input
              placeholder={t('search')}
              value={query}
              onChange={e => setQuery(e.target.value)}
              className="h-8 text-xs"
            />
          </div>
          <div className="flex items-center justify-between px-3 py-2 border-b border-border">
            <span className="text-[11px] text-muted-foreground">
              {selectedOptions.length === 0
                ? t('allItems')
                : `${selectedOptions.length} ${t('selected')}`}
            </span>
            <button
              type="button"
              disabled={selectedOptions.length === 0}
              onClick={clearAll}
              className={cn(
                'text-[11px] font-medium transition-colors',
                selectedOptions.length === 0
                  ? 'text-muted-foreground cursor-not-allowed'
                  : 'text-primary hover:underline',
              )}
            >
              {t('clear')}
            </button>
          </div>
          <div className="max-h-64 overflow-y-auto py-1">
            {filtered.length === 0 ? (
              <div className="px-3 py-6 text-center text-xs text-muted-foreground">
                {t('noResults')}
              </div>
            ) : (
              filtered.map(opt => {
                const checked = selectedSet.has(opt.id);
                return (
                  <button
                    type="button"
                    key={opt.id}
                    onClick={() => toggle(opt.id)}
                    className={cn(
                      'w-full flex items-center gap-2 px-3 py-2 text-xs text-start hover:bg-muted transition-colors',
                      checked && 'bg-muted/60',
                    )}
                  >
                    <span
                      className={cn(
                        'w-4 h-4 rounded border flex items-center justify-center shrink-0',
                        checked ? 'bg-primary border-primary text-primary-foreground' : 'border-input',
                      )}
                    >
                      {checked && <Check className="w-3 h-3" />}
                    </span>
                    <span className="truncate flex-1">{opt.label}</span>
                    {opt.hint && (
                      <span className="text-[10px] text-muted-foreground shrink-0">{opt.hint}</span>
                    )}
                  </button>
                );
              })
            )}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
};

export default EntityMultiSelectChips;

import { ArrowDown, ArrowUp, Minus } from 'lucide-react';
import { cn, formatCurrency } from '@/lib/utils';
import { Delta } from '@/lib/compare';
import { useApp } from '@/context/AppContext';

interface DeltaChipProps {
  delta: Delta;
  /** When true, downward movement is treated as positive (e.g. cost). */
  lowerIsBetter?: boolean;
  /** How to format the absolute value. Defaults to plain number. */
  format?: 'currency' | 'number' | 'percent';
  /** Visual size. */
  size?: 'sm' | 'md';
  className?: string;
  /** Optional label preceding the chip (e.g. "vs prior"). */
  label?: string;
}

const DeltaChip = ({
  delta,
  lowerIsBetter = false,
  format = 'number',
  size = 'sm',
  className,
  label,
}: DeltaChipProps) => {
  const { language } = useApp();
  const { trend, abs, pct, comparisonZero } = delta;

  // Trend → tone mapping (already factors lowerIsBetter via computeDelta).
  const tone =
    trend === 'up' ? 'text-success bg-success/10'
    : trend === 'down' ? 'text-destructive bg-destructive/10'
    : trend === 'flat' ? 'text-muted-foreground bg-muted'
    : 'text-muted-foreground bg-muted';

  const Icon = trend === 'up' ? ArrowUp : trend === 'down' ? ArrowDown : Minus;

  const formatted = (() => {
    const sign = abs > 0 ? '+' : abs < 0 ? '−' : '';
    const value = Math.abs(abs);
    if (format === 'currency') return `${sign}${formatCurrency(value, language)}`;
    if (format === 'percent') return `${sign}${value.toFixed(1)}pp`;
    return `${sign}${value.toLocaleString(language === 'ar' ? 'ar-SA' : 'en-SA')}`;
  })();

  const pctText =
    pct === null ? '—'
    : `${pct > 0 ? '+' : pct < 0 ? '−' : ''}${Math.abs(pct).toFixed(1)}%`;

  return (
    <div className={cn('inline-flex items-center gap-1.5 flex-wrap', className)}>
      {label && (
        <span className={cn('text-muted-foreground', size === 'sm' ? 'text-[10px]' : 'text-xs')}>
          {label}
        </span>
      )}
      <span
        className={cn(
          'inline-flex items-center gap-1 rounded-full font-medium',
          size === 'sm' ? 'text-[11px] px-1.5 py-0.5' : 'text-xs px-2 py-1',
          tone,
        )}
        title={comparisonZero ? 'Comparison value is 0 — % undefined' : undefined}
      >
        <Icon className={cn(size === 'sm' ? 'w-3 h-3' : 'w-3.5 h-3.5')} />
        <span>{pctText}</span>
        <span className="opacity-70">·</span>
        <span className="opacity-90">{formatted}</span>
      </span>
    </div>
  );
};

export default DeltaChip;

import { Delta } from '@/lib/compare';
import DeltaChip from './DeltaChip';
import { useApp } from '@/context/AppContext';
import { cn } from '@/lib/utils';

interface KPIDeltaProps {
  /** Pre-formatted comparison value (already localized & currency-formatted). */
  comparisonFormatted: string;
  delta: Delta;
  lowerIsBetter?: boolean;
  format?: 'currency' | 'number' | 'percent';
  /** When true, render light-on-dark variant for gradient cards. */
  onDark?: boolean;
}

/**
 * Slot rendered inside KPI cards when Compare is ON.
 * Shows: "vs <comparison value>" + DeltaChip.
 */
const KPIDelta = ({
  comparisonFormatted,
  delta,
  lowerIsBetter,
  format = 'currency',
  onDark = false,
}: KPIDeltaProps) => {
  const { t } = useApp();
  return (
    <div className="mt-2 space-y-1">
      <div className={cn('text-[11px]', onDark ? 'opacity-80' : 'text-muted-foreground')}>
        {t('vsCompare')}: <span className={cn('font-semibold', onDark ? '' : 'text-foreground')}>{comparisonFormatted}</span>
      </div>
      <DeltaChip delta={delta} lowerIsBetter={lowerIsBetter} format={format} />
    </div>
  );
};

export default KPIDelta;

import { AlertCircle, Info, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useApp } from '@/context/AppContext';
import { CompareDataState, CompareValidation } from '@/lib/compare';

interface CompareEmptyStateProps {
  validation?: CompareValidation;
  dataState?: CompareDataState;
  className?: string;
  /** When true, render as a small inline banner (default). When false, full card. */
  inline?: boolean;
}

/**
 * Surfaces compare validation errors, warnings, and no-data conditions
 * with clear, actionable, user-friendly messaging.
 */
const CompareEmptyState = ({
  validation,
  dataState,
  className,
  inline = true,
}: CompareEmptyStateProps) => {
  const { t } = useApp();

  // Validation errors take priority.
  if (validation && !validation.ok) {
    // Ignore "missing window" — it just means Compare is OFF, not a real error.
    const realErrors = validation.errors.filter(
      code => code !== 'primary.missing' && code !== 'comparison.missing',
    );
    if (realErrors.length === 0) return null;
    const messages = realErrors.map(code => {
      switch (code) {
        case 'primary.endBeforeStart': return t('errPrimaryEndBeforeStart');
        case 'comparison.endBeforeStart': return t('errComparisonEndBeforeStart');
        case 'primary.zeroLength': return t('errPrimaryZeroLength');
        case 'comparison.zeroLength': return t('errComparisonZeroLength');
        case 'primary.invalidDate':
        case 'comparison.invalidDate': return t('errInvalidDate');
        default: return code;
      }
    });
    return (
      <Banner
        tone="error"
        icon={<AlertCircle className="w-4 h-4" />}
        title={t('compareInvalid')}
        body={messages.join(' · ')}
        inline={inline}
        className={className}
      />
    );
  }

  // Warnings (overlap / identical) — informational only.
  if (validation && validation.warnings.length > 0) {
    const w = validation.warnings[0];
    const body =
      w === 'windowsIdentical' ? t('warnWindowsIdentical')
      : w === 'windowsOverlap' ? t('warnWindowsOverlap')
      : w;
    if (dataState === 'ok' || !dataState) {
      return (
        <Banner
          tone="warn"
          icon={<AlertTriangle className="w-4 h-4" />}
          title={t('compareNotice')}
          body={body}
          inline={inline}
          className={className}
        />
      );
    }
  }

  // No-data states.
  if (dataState && dataState !== 'ok') {
    const body =
      dataState === 'no-current' ? t('noDataCurrent')
      : dataState === 'no-comparison' ? t('noDataComparison')
      : dataState === 'no-both' ? t('noDataBoth')
      : t('noDataPartial');
    return (
      <Banner
        tone="info"
        icon={<Info className="w-4 h-4" />}
        title={t('compareNoData')}
        body={body}
        inline={inline}
        className={className}
      />
    );
  }

  return null;
};

const Banner = ({
  tone,
  icon,
  title,
  body,
  inline,
  className,
}: {
  tone: 'error' | 'warn' | 'info';
  icon: React.ReactNode;
  title: string;
  body: string;
  inline: boolean;
  className?: string;
}) => {
  const tones = {
    error: 'bg-destructive/10 text-destructive border-destructive/30',
    warn: 'bg-warning/15 text-foreground border-warning/40',
    info: 'bg-muted text-foreground border-border',
  };
  return (
    <div
      role={tone === 'error' ? 'alert' : 'status'}
      className={cn(
        'flex items-start gap-2 rounded-lg border',
        inline ? 'px-3 py-2 text-xs' : 'px-4 py-3 text-sm',
        tones[tone],
        className,
      )}
    >
      <span className="mt-0.5 shrink-0">{icon}</span>
      <div className="min-w-0">
        <div className="font-semibold">{title}</div>
        <div className="opacity-90">{body}</div>
      </div>
    </div>
  );
};

export default CompareEmptyState;

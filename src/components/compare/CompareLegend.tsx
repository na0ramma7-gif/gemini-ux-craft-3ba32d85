import { useApp } from '@/context/AppContext';

const CompareLegend = () => {
  const { t } = useApp();
  return (
    <div className="inline-flex items-center gap-3 text-[11px] text-muted-foreground">
      <span className="inline-flex items-center gap-1.5">
        <span className="inline-block w-4 h-[2px] bg-foreground rounded-full" />
        {t('current')}
      </span>
      <span className="inline-flex items-center gap-1.5">
        <span
          className="inline-block w-4 h-[2px] rounded-full"
          style={{ background: 'repeating-linear-gradient(to right, hsl(var(--foreground)) 0 3px, transparent 3px 6px)' }}
        />
        {t('comparison')}
      </span>
    </div>
  );
};

export default CompareLegend;

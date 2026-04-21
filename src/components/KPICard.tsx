import { cn } from '@/lib/utils';
import { ReactNode } from 'react';

interface KPICardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: ReactNode;
  variant?: 'green' | 'red' | 'blue' | 'purple' | 'amber' | 'gradient';
  progress?: {
    label: string;
    target: string;
    percent: number;
    status: 'positive' | 'negative';
    remaining?: string;
  };
  compareValue?: string;
  compareLabel?: string;
  /** Optional slot rendered between value and progress (used for Compare deltas). */
  extra?: ReactNode;
}

const KPICard = ({ title, value, subtitle, icon, variant = 'blue', progress, compareValue, compareLabel, extra }: KPICardProps) => {
  const borderColors = {
    green: 'border-s-success',
    red: 'border-s-destructive',
    blue: 'border-s-primary',
    purple: 'border-s-accent',
    amber: 'border-s-warning',
    gradient: ''
  };

  if (variant === 'gradient') {
    return (
      <div className="bg-primary rounded-xl p-5 shadow-[var(--shadow-card)] text-primary-foreground relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary-foreground/5 to-transparent pointer-events-none" />
        <div className="relative">
          <div className="flex justify-between items-start mb-3">
            <div className="text-xs font-medium opacity-80 uppercase tracking-wide">{title}</div>
            <div className="w-8 h-8 rounded-lg bg-primary-foreground/10 flex items-center justify-center">{icon}</div>
          </div>
          <div className="text-3xl font-bold mb-1 tracking-tight">{value}</div>
          {subtitle && <div className="text-xs opacity-70">{subtitle}</div>}
          {compareValue && (
            <div className="mt-3 bg-primary-foreground/10 rounded-lg px-2.5 py-1.5 text-xs">
              <span className="opacity-80">{compareLabel}: </span>
              <span className="font-semibold">{compareValue}</span>
            </div>
          )}
          {extra}
          {progress && (
            <div className="space-y-2 mt-3">
              <div className="bg-primary-foreground/10 rounded-lg p-2.5">
                <div className="text-xs opacity-80 mb-0.5">{progress.label}</div>
                <div className="text-xl font-bold">{progress.percent}%</div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={cn(
      'bg-card rounded-xl p-5 border-s-4 shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-card-hover)] transition-all duration-200',
      borderColors[variant]
    )}>
      <div className="flex justify-between items-start mb-3">
        <div className="text-xs text-muted-foreground font-medium uppercase tracking-wide">{title}</div>
        <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center">{icon}</div>
      </div>
      <div className="text-3xl font-bold text-foreground mb-0.5 tracking-tight">{value}</div>
      {subtitle && <div className="text-xs text-muted-foreground">{subtitle}</div>}
      
      {compareValue && (
        <div className="mt-2 mb-2 bg-secondary rounded-lg px-2.5 py-1.5 text-xs">
          <span className="text-muted-foreground">{compareLabel}: </span>
          <span className="font-semibold text-foreground">{compareValue}</span>
        </div>
      )}
      {extra}
      {progress && (
        <div className="pt-3 mt-3 border-t border-border">
          <div className="flex justify-between text-xs mb-1.5">
            <span className="text-muted-foreground">{progress.label}</span>
            <span className="font-semibold text-foreground">{progress.target}</span>
          </div>
          <div className="w-full bg-secondary rounded-full h-2">
            <div 
              className={cn(
                'h-2 rounded-full transition-all duration-500',
                progress.status === 'positive' ? 'bg-success' : 'bg-destructive'
              )}
              style={{ width: `${Math.min(progress.percent, 100)}%` }}
            />
          </div>
          <div className="flex justify-between text-xs mt-1.5">
            <span className={progress.status === 'positive' ? 'text-success font-semibold' : 'text-destructive font-semibold'}>
              {progress.percent}%
            </span>
            {progress.remaining && <span className="text-muted-foreground">{progress.remaining}</span>}
          </div>
        </div>
      )}
    </div>
  );
};

export default KPICard;

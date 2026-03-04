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
}

const KPICard = ({ title, value, subtitle, icon, variant = 'blue', progress, compareValue, compareLabel }: KPICardProps) => {
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
      <div className="bg-primary rounded-xl p-4 sm:p-5 shadow-card text-primary-foreground">
        <div className="flex justify-between items-start mb-2">
          <div className="text-xs font-medium opacity-90">{title}</div>
          <div className="text-lg">{icon}</div>
        </div>
        <div className="text-2xl font-bold mb-1">{value}</div>
        {subtitle && <div className="text-xs opacity-80 mb-2">{subtitle}</div>}
        {compareValue && (
          <div className="mt-2 bg-primary-foreground/10 rounded-md px-2 py-1 text-xs">
            <span className="opacity-80">{compareLabel}: </span>
            <span className="font-semibold">{compareValue}</span>
          </div>
        )}
        {progress && (
          <div className="space-y-1.5 mt-2">
            <div className="bg-primary-foreground/15 rounded-lg p-2">
              <div className="text-xs mb-0.5">{progress.label}</div>
              <div className="text-xl font-bold">{progress.percent}%</div>
            </div>
            {progress.remaining && (
              <div className="bg-primary-foreground/15 rounded-lg px-2 py-1 text-center text-xs">
                {progress.remaining}
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={cn(
      'bg-card rounded-xl p-4 sm:p-5 border-s-4 shadow-card hover:shadow-card-hover transition-all duration-200',
      borderColors[variant]
    )}>
      <div className="flex justify-between items-start mb-2">
        <div className="text-xs text-muted-foreground font-medium">{title}</div>
        <div className="text-lg">{icon}</div>
      </div>
      <div className="text-2xl font-bold text-foreground mb-0.5">{value}</div>
      {subtitle && <div className="text-xs text-muted-foreground mb-2">{subtitle}</div>}
      
      {compareValue && (
        <div className="mt-1 mb-2 bg-secondary rounded-md px-2 py-1 text-xs">
          <span className="text-muted-foreground">{compareLabel}: </span>
          <span className="font-semibold text-foreground">{compareValue}</span>
        </div>
      )}
      
      {progress && (
        <div className="pt-2 border-t border-border">
          <div className="flex justify-between text-xs mb-1">
            <span className="text-muted-foreground">{progress.label}</span>
            <span className="font-semibold">{progress.target}</span>
          </div>
          <div className="w-full bg-secondary rounded-full h-1.5 mb-1">
            <div 
              className={cn(
                'h-1.5 rounded-full transition-all',
                progress.status === 'positive' ? 'bg-success' : 'bg-destructive'
              )}
              style={{ width: `${Math.min(progress.percent, 100)}%` }}
            />
          </div>
          <div className="flex justify-between text-xs">
            <span className={progress.status === 'positive' ? 'text-success font-medium' : 'text-destructive font-medium'}>
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
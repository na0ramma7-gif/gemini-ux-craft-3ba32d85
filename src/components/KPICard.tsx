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
}

const KPICard = ({ title, value, subtitle, icon, variant = 'blue', progress }: KPICardProps) => {
  const borderColors = {
    green: 'border-s-emerald-400',
    red: 'border-s-red-400',
    blue: 'border-s-blue-400',
    purple: 'border-s-violet-400',
    amber: 'border-s-amber-400',
    gradient: ''
  };

  const valueColors = {
    green: 'text-emerald-600',
    red: 'text-red-600',
    blue: 'text-blue-600',
    purple: 'text-violet-600',
    amber: 'text-amber-600',
    gradient: 'text-white'
  };

  if (variant === 'gradient') {
    return (
      <div className="bg-gradient-to-br from-primary to-violet-600 rounded-xl sm:rounded-2xl p-3 sm:p-6 shadow-lg hover:shadow-xl transition-all duration-300 text-white">
        <div className="flex justify-between items-start mb-2 sm:mb-3">
          <div className="text-[10px] sm:text-sm font-medium opacity-90">{title}</div>
          <div className="text-lg sm:text-2xl">{icon}</div>
        </div>
        <div className="text-xl sm:text-3xl font-bold mb-1">{value}</div>
        {subtitle && <div className="text-[10px] sm:text-xs opacity-80 mb-2 sm:mb-3">{subtitle}</div>}
        {progress && (
          <div className="space-y-1.5 sm:space-y-2 mt-2 sm:mt-3">
            <div className="bg-white/20 rounded-lg p-1.5 sm:p-2">
              <div className="text-[10px] sm:text-xs mb-0.5 sm:mb-1">{progress.label}</div>
              <div className="text-lg sm:text-2xl font-bold">{progress.percent}%</div>
            </div>
            {progress.remaining && (
              <div className="bg-white/20 rounded-lg px-2 sm:px-3 py-1 sm:py-1.5 text-center text-[10px] sm:text-xs">
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
      'bg-card rounded-xl sm:rounded-2xl p-3 sm:p-6 border-s-4 shadow-lg hover:shadow-xl transition-all duration-300',
      borderColors[variant]
    )}>
      <div className="flex justify-between items-start mb-2 sm:mb-3">
        <div className="text-[10px] sm:text-sm text-muted-foreground font-medium">{title}</div>
        <div className="text-lg sm:text-2xl">{icon}</div>
      </div>
      <div className={cn('text-xl sm:text-3xl font-bold mb-1', valueColors[variant])}>{value}</div>
      {subtitle && <div className="text-[10px] sm:text-xs text-muted-foreground mb-2 sm:mb-3">{subtitle}</div>}
      
      {progress && (
        <div className="pt-2 sm:pt-3 border-t border-border">
          <div className="flex justify-between text-[10px] sm:text-xs mb-1">
            <span className="text-muted-foreground">{progress.label}</span>
            <span className="font-semibold">{progress.target}</span>
          </div>
          <div className="w-full bg-secondary rounded-full h-1 sm:h-1.5 mb-1">
            <div 
              className={cn(
                'h-1 sm:h-1.5 rounded-full transition-all',
                progress.status === 'positive' ? 'bg-emerald-500' : 'bg-red-500'
              )}
              style={{ width: `${Math.min(progress.percent, 100)}%` }}
            />
          </div>
          <div className="flex justify-between text-[10px] sm:text-xs">
            <span className={progress.status === 'positive' ? 'text-emerald-600 font-medium' : 'text-red-600 font-medium'}>
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

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
    green: 'border-l-emerald-400',
    red: 'border-l-red-400',
    blue: 'border-l-blue-400',
    purple: 'border-l-violet-400',
    amber: 'border-l-amber-400',
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
      <div className="bg-gradient-to-br from-primary to-violet-600 rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 text-white">
        <div className="flex justify-between items-start mb-3">
          <div className="text-sm font-medium opacity-90">{title}</div>
          <div className="text-2xl">{icon}</div>
        </div>
        <div className="text-3xl font-bold mb-1">{value}</div>
        {subtitle && <div className="text-xs opacity-80 mb-3">{subtitle}</div>}
        {progress && (
          <div className="space-y-2 mt-3">
            <div className="bg-white/20 rounded-lg p-2">
              <div className="text-xs mb-1">{progress.label}</div>
              <div className="text-2xl font-bold">{progress.percent}%</div>
            </div>
            {progress.remaining && (
              <div className="bg-white/20 rounded-lg px-3 py-1.5 text-center text-xs">
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
      'bg-card rounded-2xl p-6 border-l-4 shadow-lg hover:shadow-xl transition-all duration-300',
      borderColors[variant]
    )}>
      <div className="flex justify-between items-start mb-3">
        <div className="text-sm text-muted-foreground font-medium">{title}</div>
        <div className="text-2xl">{icon}</div>
      </div>
      <div className={cn('text-3xl font-bold mb-1', valueColors[variant])}>{value}</div>
      {subtitle && <div className="text-xs text-muted-foreground mb-3">{subtitle}</div>}
      
      {progress && (
        <div className="pt-3 border-t border-border">
          <div className="flex justify-between text-xs mb-1">
            <span className="text-muted-foreground">{progress.label}</span>
            <span className="font-semibold">{progress.target}</span>
          </div>
          <div className="w-full bg-secondary rounded-full h-1.5 mb-1">
            <div 
              className={cn(
                'h-1.5 rounded-full transition-all',
                progress.status === 'positive' ? 'bg-emerald-500' : 'bg-red-500'
              )}
              style={{ width: `${Math.min(progress.percent, 100)}%` }}
            />
          </div>
          <div className="flex justify-between text-xs">
            <span className={progress.status === 'positive' ? 'text-emerald-600 font-medium' : 'text-red-600 font-medium'}>
              {progress.percent}% of target
            </span>
            {progress.remaining && <span className="text-muted-foreground">{progress.remaining}</span>}
          </div>
        </div>
      )}
    </div>
  );
};

export default KPICard;

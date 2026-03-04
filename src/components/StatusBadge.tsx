import { cn, getStatusBgColor } from '@/lib/utils';

interface StatusBadgeProps {
  status: string;
  className?: string;
}

const StatusBadge = ({ status, className }: StatusBadgeProps) => {
  return (
    <span 
      className={cn(
        'inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium',
        getStatusBgColor(status),
        className
      )}
    >
      {status}
    </span>
  );
};

export default StatusBadge;
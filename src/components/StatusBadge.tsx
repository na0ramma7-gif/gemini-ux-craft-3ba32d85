import { cn, getStatusBgColor } from '@/lib/utils';

interface StatusBadgeProps {
  status: string;
  className?: string;
}

const StatusBadge = ({ status, className }: StatusBadgeProps) => {
  return (
    <span 
      className={cn(
        'inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold',
        getStatusBgColor(status),
        className
      )}
    >
      {status}
    </span>
  );
};

export default StatusBadge;

import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const formatCurrency = (val: number, locale: string = 'en'): string => {
  const formatter = new Intl.NumberFormat(locale === 'ar' ? 'ar-SA' : 'en-SA', {
    style: 'currency',
    currency: 'SAR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  });
  return formatter.format(val);
};

export const formatNumber = (val: number, locale: string = 'en'): string => {
  return new Intl.NumberFormat(locale === 'ar' ? 'ar-SA' : 'en-SA').format(val);
};

export const formatDate = (dateString: string, locale: string = 'en'): string => {
  return new Date(dateString).toLocaleDateString(locale === 'ar' ? 'ar-SA' : 'en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
};

export const formatShortDate = (dateString: string, locale: string = 'en'): string => {
  return new Date(dateString).toLocaleDateString(locale === 'ar' ? 'ar-SA' : 'en-US', {
    month: 'short',
    day: 'numeric'
  });
};

export const getStatusColor = (status: string): string => {
  const colors: Record<string, string> = {
    'Planned': 'status-planned',
    'In Progress': 'status-in-progress',
    'Delivered': 'status-delivered',
    'Released': 'status-released',
    'Active': 'status-active',
    'Development': 'status-development'
  };
  return colors[status] || 'status-planned';
};

export const getStatusBgColor = (status: string): string => {
  const colors: Record<string, string> = {
    'Planned': 'bg-secondary text-secondary-foreground',
    'In Progress': 'bg-primary/10 text-primary',
    'Delivered': 'bg-success/10 text-success',
    'Released': 'bg-success/10 text-success',
    'Active': 'bg-success/10 text-success',
    'Development': 'bg-warning/20 text-foreground',
    'High': 'bg-destructive/10 text-destructive',
    'Medium': 'bg-warning/20 text-foreground',
    'Low': 'bg-success/10 text-success',
    'Inactive': 'bg-muted text-muted-foreground'
  };
  return colors[status] || 'bg-secondary text-secondary-foreground';
};

export const getPriorityColor = (priority: string): string => {
  const colors: Record<string, string> = {
    'High': 'bg-destructive/10 text-destructive',
    'Medium': 'bg-warning/20 text-foreground',
    'Low': 'bg-success/10 text-success'
  };
  return colors[priority] || 'bg-secondary text-secondary-foreground';
};

export const getGanttBarColor = (status: string): string => {
  const colors: Record<string, string> = {
    'Planned': 'bg-muted-foreground/50',
    'In Progress': 'bg-primary',
    'Delivered': 'bg-success',
    'Released': 'bg-success',
  };
  return colors[status] || 'bg-muted-foreground/50';
};

export const calculateDaysBetween = (startDate: string, endDate: string): number => {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const diffTime = Math.abs(end.getTime() - start.getTime());
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};
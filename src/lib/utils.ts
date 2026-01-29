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
    'In Progress': 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    'Delivered': 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
    'Released': 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
    'Active': 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
    'Development': 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    'High': 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    'Medium': 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    'Low': 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
  };
  return colors[status] || 'bg-secondary text-secondary-foreground';
};

export const getPriorityColor = (priority: string): string => {
  const colors: Record<string, string> = {
    'High': 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    'Medium': 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    'Low': 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
  };
  return colors[priority] || 'bg-secondary text-secondary-foreground';
};

export const getGanttBarColor = (status: string): string => {
  const colors: Record<string, string> = {
    'Planned': 'bg-slate-400',
    'In Progress': 'bg-blue-500',
    'Delivered': 'bg-emerald-500',
    'Released': 'bg-emerald-500',
  };
  return colors[status] || 'bg-slate-400';
};

export const calculateDaysBetween = (startDate: string, endDate: string): number => {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const diffTime = Math.abs(end.getTime() - start.getTime());
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

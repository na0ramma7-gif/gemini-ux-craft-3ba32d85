import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const formatCurrency = (val: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(val);
};

export const formatDate = (dateString: string): string => {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
};

export const formatShortDate = (dateString: string): string => {
  return new Date(dateString).toLocaleDateString('en-US', {
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
    'In Progress': 'bg-blue-100 text-blue-800',
    'Delivered': 'bg-emerald-100 text-emerald-800',
    'Released': 'bg-emerald-100 text-emerald-800',
    'Active': 'bg-emerald-100 text-emerald-800',
    'Development': 'bg-amber-100 text-amber-800'
  };
  return colors[status] || 'bg-secondary text-secondary-foreground';
};

export const getPriorityColor = (priority: string): string => {
  const colors: Record<string, string> = {
    'High': 'bg-red-100 text-red-800',
    'Medium': 'bg-amber-100 text-amber-800',
    'Low': 'bg-emerald-100 text-emerald-800'
  };
  return colors[priority] || 'bg-secondary text-secondary-foreground';
};

export const calculateDaysBetween = (startDate: string, endDate: string): number => {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const diffTime = Math.abs(end.getTime() - start.getTime());
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

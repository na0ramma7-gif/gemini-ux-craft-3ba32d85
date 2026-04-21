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
    'To Do': 'status-planned',
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
    'To Do': 'bg-secondary text-secondary-foreground',
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
    'To Do': 'bg-muted-foreground/50',
    'Planned': 'bg-muted-foreground/50',
    'In Progress': 'bg-primary',
    'Delivered': 'bg-success',
    'Released': 'bg-success',
    'Delayed': 'bg-destructive',
  };
  return colors[status] || 'bg-muted-foreground/50';
};

export const getFeatureEffectiveStatus = (feature: { status: string; endDate: string }): string => {
  if (feature.status === 'Delivered') return 'Delivered';
  const now = new Date();
  const end = new Date(feature.endDate);
  if (end < now && feature.status !== 'Delivered') return 'Delayed';
  return feature.status;
};

export const calculateDaysBetween = (startDate: string, endDate: string): number => {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const diffTime = Math.abs(end.getTime() - start.getTime());
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

/* ──────────────────────────────────────────────────────────
 * Financial calculation helpers — SINGLE SOURCE OF TRUTH
 * Used by useHierarchicalMetrics and any chart/table that
 * needs to compute revenue/cost for a date window.
 * ────────────────────────────────────────────────────────── */

export interface DateWindow {
  startDate: Date;
  endDate: Date;
}

/**
 * Returns ordered array of `YYYY-MM` keys covering every month
 * between startDate and endDate inclusive.
 */
export const monthsInDateRange = (window?: DateWindow | null): string[] => {
  if (!window) return [];
  const start = new Date(window.startDate.getFullYear(), window.startDate.getMonth(), 1);
  const end = new Date(window.endDate.getFullYear(), window.endDate.getMonth(), 1);
  const result: string[] = [];
  const cursor = new Date(start);
  while (cursor <= end) {
    const y = cursor.getFullYear();
    const m = String(cursor.getMonth() + 1).padStart(2, '0');
    result.push(`${y}-${m}`);
    cursor.setMonth(cursor.getMonth() + 1);
  }
  return result;
};

/**
 * Monthly cost figure for a single Cost row.
 * Primary model: c.monthly (cost entered per feature/month in Feature Financial Planning).
 * Defensive fallback: legacy CAPEX rows (total / amortization).
 * Returns 0 if neither shape applies.
 */
export const monthlyCostForRow = (cost: {
  type?: string;
  monthly?: number;
  total?: number;
  amortization?: number;
}): number => {
  if (cost.monthly && cost.monthly > 0) return cost.monthly;
  if (cost.type === 'CAPEX' && cost.total && cost.amortization) {
    return cost.total / cost.amortization;
  }
  return 0;
};

/**
 * Total cost for a set of cost rows over a number of months.
 * If `months` is 0 (no date window), returns 0 — callers should
 * always pass a meaningful window.
 */
export const computeCostForMonths = (
  costs: Array<{ type?: string; monthly?: number; total?: number; amortization?: number; startDate?: string; endDate?: string }>,
  monthKeys: string[]
): number => {
  if (monthKeys.length === 0) return 0;
  let total = 0;
  for (const c of costs) {
    const monthly = monthlyCostForRow(c);
    if (monthly === 0) continue;
    // Honor the cost row's own active window if present; otherwise apply for all months.
    const activeMonths = monthKeys.filter(mk => {
      if (c.startDate) {
        const cs = c.startDate.slice(0, 7); // YYYY-MM
        if (mk < cs) return false;
      }
      if (c.endDate) {
        const ce = c.endDate.slice(0, 7);
        if (mk > ce) return false;
      }
      return true;
    });
    total += monthly * activeMonths.length;
  }
  return total;
};
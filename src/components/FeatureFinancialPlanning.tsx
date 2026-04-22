import { useState, useMemo, useCallback, useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import { Feature, RevenueLine, RevenueService } from '@/types';
import { toast } from 'sonner';
import FeatureForecast from '@/components/FeatureForecast';
import { formatCurrency, cn } from '@/lib/utils';
import { parseMoney, parsePercent } from '@/lib/validation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Collapsible, CollapsibleContent, CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  ArrowLeft, ArrowRight, Plus, Trash2, DollarSign, Users, TrendingUp, TrendingDown,
  FileText, Save, ChevronDown, ChevronRight, UserPlus, Lightbulb, AlertTriangle,
  BarChart3, PieChart, Pencil, Target, Receipt, Tag,
} from 'lucide-react';
import KPICard from '@/components/KPICard';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from 'recharts';

interface CostItem { id: string; name: string; planned: number; actual: number; notes: string; }
interface ResourceAlloc { resourceId: number; utilization: number; }
interface MonthData { costs: Record<string, CostItem[]>; resources: ResourceAlloc[]; }
interface FeatureFinancialPlanningProps { feature: Feature; onClose: () => void; }

const COST_CATEGORIES = ['Infrastructure', 'Licensing', 'Marketing', 'Other'];
const MONTHS_SHORT_KEYS = ['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'] as const;
const MONTHS_FULL_EN = ['January','February','March','April','May','June','July','August','September','October','November','December'] as const;
const MONTHS_FULL_AR = ['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'] as const;
const uid = () => Math.random().toString(36).slice(2, 9);
const monthKeyOf = (year: number, monthIdx: number) =>
  `${year}-${String(monthIdx + 1).padStart(2, '0')}`;

/** Local draft for revenue line editing inside the month dialog. */
interface RevenueLineDraft {
  key: string;            // local key (uid)
  id?: number;            // existing line id, when editing
  serviceId: number | null;
  rate: number;
  plannedTransactions: number;
  actualTransactions: number;
  notes?: string;
}

const FeatureFinancialPlanning = ({ feature, onClose }: FeatureFinancialPlanningProps) => {
  const { state, t, language, isRTL, addRevenueService, updateRevenueService, deleteRevenueService, upsertRevenueLines } = useApp();
  const [tab, setTab] = useState('profile');
  const [selectedYear, setSelectedYear] = useState(2025);

  const [yearData, setYearData] = useState<Record<number, MonthData>>(() => {
    const d: Record<number, MonthData> = {};
    for (let i = 0; i < 12; i++) d[i] = { costs: {}, resources: [] };
    return d;
  });

  const [featureProfile, setFeatureProfile] = useState({
    description: feature.description || '', targetUser: feature.targetUser || '',
    customerSegmentation: feature.customerSegmentation || '', valueProposition: feature.valueProposition || '',
    businessModel: feature.businessModel || '', risksAndChallenges: feature.risks || '',
  });

  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [expandedMonths, setExpandedMonths] = useState<number[]>([]);
  const [editMonthOpen, setEditMonthOpen] = useState(false);
  const [editMonthIdx, setEditMonthIdx] = useState<number>(0);
  // Revenue line drafts being edited inside the month dialog.
  const [editLines, setEditLines] = useState<RevenueLineDraft[]>([]);
  // Add-service inline form (Step 1) state.
  const [newServiceName, setNewServiceName] = useState('');
  const [newServiceRate, setNewServiceRate] = useState<number>(0);
  // In-row edit state for an existing service (Step 1 list).
  const [editingServiceId, setEditingServiceId] = useState<number | null>(null);
  const [editingServiceName, setEditingServiceName] = useState('');
  const [editingServiceRate, setEditingServiceRate] = useState<number>(0);
  const [editCostCatsOpen, setEditCostCatsOpen] = useState<string[]>([]);
  const [resourceSelectorOpen, setResourceSelectorOpen] = useState(false);
  const [resourceSelectorMonth, setResourceSelectorMonth] = useState<number>(0);
  const [selectedResourceIds, setSelectedResourceIds] = useState<number[]>([]);
  // v2: hide-inactive toggle for Step 2.
  const [hideInactive, setHideInactive] = useState(false);
  // v2: delete-service confirmation when service has any history.
  const [confirmDeleteServiceId, setConfirmDeleteServiceId] = useState<number | null>(null);
  const [confirmDeleteTypedName, setConfirmDeleteTypedName] = useState('');
  // v2: per-service rate-edit info note (one-shot per session).
  const [showRateChangeNote, setShowRateChangeNote] = useState(false);

  const product = state.products.find(p => p.id === feature.productId);
  const productFeatures = state.features.filter(f => f.productId === feature.productId);
  const BackIcon = isRTL ? ArrowRight : ArrowLeft;

  // Resources actually assigned to the current product (via assignments).
  // Feature-level resource cost selection must be limited to this set.
  const productResourceIds = useMemo(() => {
    const ids = new Set<number>();
    (state.assignments || []).forEach(a => {
      if (a.productId === feature.productId) ids.add(a.resourceId);
    });
    return ids;
  }, [state.assignments, feature.productId]);

  const productAssignedResources = useMemo(
    () => state.resources.filter(r => productResourceIds.has(r.id) && r.status === 'Active'),
    [state.resources, productResourceIds],
  );

  // ── Revenue derived from the global subscription/service lines ──
  // monthlyRevenue[i] = { planned, actual } for month i of selectedYear.
  const featureLines = useMemo(
    () => state.revenueLines.filter(l => l.featureId === feature.id),
    [state.revenueLines, feature.id],
  );
  const featureServices = useMemo(
    () => state.revenueServices.filter(s => s.featureId === feature.id),
    [state.revenueServices, feature.id],
  );
  const monthlyRevenue = useMemo(() => {
    const out: { planned: number; actual: number; lineCount: number; lastUpdated?: string }[] = Array.from(
      { length: 12 },
      () => ({ planned: 0, actual: 0, lineCount: 0 }),
    );
    featureLines.forEach(l => {
      const [y, m] = l.month.split('-').map(Number);
      if (y !== selectedYear) return;
      const i = m - 1;
      if (i < 0 || i > 11) return;
      out[i].planned += l.rate * (l.plannedTransactions || 0);
      out[i].actual += l.rate * (l.actualTransactions || 0);
      out[i].lineCount += 1;
      if (!out[i].lastUpdated || l.updatedAt > (out[i].lastUpdated as string)) {
        out[i].lastUpdated = l.updatedAt;
      }
    });
    return out;
  }, [featureLines, selectedYear]);

  const monthlySummaries = useMemo(() =>
    Array.from({ length: 12 }, (_, i) => {
      const md = yearData[i];
      const plannedRev = monthlyRevenue[i].planned;
      const actualRev = monthlyRevenue[i].actual;
      let plannedCost = 0;
      let actualCost = 0;
      Object.values(md.costs).forEach(items => items.forEach(item => { plannedCost += item.planned; actualCost += item.actual; }));
      let resourceCost = 0;
      md.resources.forEach(a => { const r = state.resources.find(res => res.id === a.resourceId); if (r) resourceCost += r.costRate * (a.utilization / 100); });
      plannedCost += resourceCost;
      return { month: i, label: `${t(MONTHS_SHORT_KEYS[i])} ${selectedYear}`, plannedRev, actualRev, plannedCost, actualCost, netProfit: plannedRev - plannedCost, resourceCost, lineCount: monthlyRevenue[i].lineCount, lastUpdated: monthlyRevenue[i].lastUpdated };
    })
  , [yearData, selectedYear, state.resources, t, monthlyRevenue]);

  const totals = useMemo(() => {
    const r = monthlySummaries.reduce((a, m) => ({ plannedRev: a.plannedRev + m.plannedRev, actualRev: a.actualRev + m.actualRev, plannedCost: a.plannedCost + m.plannedCost, actualCost: a.actualCost + m.actualCost }), { plannedRev: 0, actualRev: 0, plannedCost: 0, actualCost: 0 });
    const profit = r.plannedRev - r.plannedCost;
    return { ...r, profit, margin: r.plannedRev > 0 ? (profit / r.plannedRev) * 100 : 0 };
  }, [monthlySummaries]);

  const chartData = useMemo(() => monthlySummaries.map(m => ({ month: t(MONTHS_SHORT_KEYS[m.month]), revenue: m.plannedRev, actualRevenue: m.actualRev, cost: m.plannedCost, profit: m.netProfit })), [monthlySummaries, t]);

  const costBreakdownData = useMemo(() => monthlySummaries.map(m => {
    const md = yearData[m.month];
    const d: Record<string, any> = { monthLabel: t(MONTHS_SHORT_KEYS[m.month]) };
    COST_CATEGORIES.forEach(cat => { d[cat] = (md.costs[cat] || []).reduce((s: number, i: CostItem) => s + i.planned, 0); });
    d['Resources'] = m.resourceCost;
    return d;
  }), [monthlySummaries, yearData, t]);

  const insights = useMemo(() => {
    const results: { text: string; icon: 'up' | 'down' | 'alert' }[] = [];
    const topMonth = [...monthlySummaries].sort((a, b) => b.plannedRev - a.plannedRev)[0];
    if (topMonth?.plannedRev > 0) results.push({ text: `${topMonth.label} has the highest planned revenue (${formatCurrency(topMonth.plannedRev, language)})`, icon: 'up' });
    if (totals.margin > 0) results.push({ text: `Overall profit margin: ${totals.margin.toFixed(0)}%`, icon: 'up' });
    else if (totals.plannedRev > 0) results.push({ text: `Negative profit margin: ${totals.margin.toFixed(0)}%`, icon: 'alert' });
    const emptyMonths = monthlySummaries.filter(m => m.plannedRev === 0 && m.plannedCost === 0).length;
    if (emptyMonths > 0 && emptyMonths < 12) results.push({ text: `${emptyMonths} month(s) have no financial data yet`, icon: 'alert' });
    if (totals.actualRev > 0) { const v = totals.actualRev - totals.plannedRev; results.push({ text: `Revenue variance: ${v >= 0 ? '+' : ''}${formatCurrency(v, language)}`, icon: v >= 0 ? 'up' : 'down' }); }
    const totalRC = monthlySummaries.reduce((s, m) => s + m.resourceCost, 0);
    if (totalRC > 0 && totals.plannedCost > 0) results.push({ text: `Resources account for ${((totalRC / totals.plannedCost) * 100).toFixed(0)}% of total costs`, icon: 'up' });
    return results;
  }, [monthlySummaries, totals, language]);

  const editMonthSummary = useMemo(() => {
    const md = yearData[editMonthIdx];
    let totalCost = 0;
    Object.values(md.costs).forEach(items => items.forEach(i => { totalCost += i.planned; }));
    md.resources.forEach(a => { const r = state.resources.find(res => res.id === a.resourceId); if (r) totalCost += r.costRate * (a.utilization / 100); });
    const editPlannedRev = editLines.reduce((s, l) => s + (l.rate || 0) * (l.plannedTransactions || 0), 0);
    const editActualRev = editLines.reduce((s, l) => s + (l.rate || 0) * (l.actualTransactions || 0), 0);
    const profit = editPlannedRev - totalCost;
    return {
      totalCost,
      profit,
      margin: editPlannedRev > 0 ? (profit / editPlannedRev) * 100 : 0,
      editPlannedRev,
      editActualRev,
    };
  }, [yearData, editMonthIdx, editLines, state.resources]);

  const toggleMonth = (idx: number) => setExpandedMonths(prev => prev.includes(idx) ? prev.filter(i => i !== idx) : [...prev, idx]);

  const updateMonthData = useCallback((monthIdx: number, updater: (md: MonthData) => MonthData) => {
    setYearData(prev => ({ ...prev, [monthIdx]: updater(prev[monthIdx]) }));
  }, []);

  const openMonthEditor = (monthIdx: number) => {
    const mk = monthKeyOf(selectedYear, monthIdx);
    const existing = featureLines.filter(l => l.month === mk);
    setEditMonthIdx(monthIdx);
    // Auto-render one row per service. Pre-fill from existing lines if present.
    const byService = new Map<number, RevenueLine>();
    existing.forEach(l => byService.set(l.serviceId, l));
    setEditLines(
      featureServices.map(s => {
        const l = byService.get(s.id);
        return {
          key: uid(),
          id: l?.id,
          serviceId: s.id,
          rate: l?.rate ?? s.defaultRate,
          plannedTransactions: l?.plannedTransactions ?? 0,
          actualTransactions: l?.actualTransactions ?? 0,
          notes: l?.notes,
        };
      }),
    );
    setNewServiceName('');
    setNewServiceRate(0);
    setEditingServiceId(null);
    setEditCostCatsOpen([]);
    setEditMonthOpen(true);
  };

  // Keep editLines in sync with the service catalog while the dialog is open.
  // When a new service is created, a fresh empty row appears automatically.
  // When a service is deleted, its row is removed.
  useEffect(() => {
    if (!editMonthOpen) return;
    setEditLines(prev => {
      const byServiceId = new Map(prev.map(l => [l.serviceId as number, l]));
      return featureServices.map(s => {
        const existing = byServiceId.get(s.id);
        if (existing) return existing;
        return {
          key: uid(),
          serviceId: s.id,
          rate: s.defaultRate,
          plannedTransactions: 0,
          actualTransactions: 0,
        };
      });
    });
  }, [featureServices, editMonthOpen]);

  // ── Draft helpers ──
  const updateDraftLine = (key: string, updates: Partial<RevenueLineDraft>) => {
    setEditLines(prev => prev.map(l => (l.key === key ? { ...l, ...updates } : l)));
  };

  // ── Service catalog actions (Step 1) ──
  const handleAddService = () => {
    const res = addRevenueService(feature.id, newServiceName, Number.isFinite(newServiceRate) ? newServiceRate : 0);
    if (res.ok === false) { toast.error(res.error); return; }
    toast.success(t('serviceAdded'));
    setNewServiceName('');
    setNewServiceRate(0);
  };
  const startEditService = (id: number) => {
    const s = featureServices.find(x => x.id === id);
    if (!s) return;
    setEditingServiceId(id);
    setEditingServiceName(s.name);
    setEditingServiceRate(s.defaultRate);
    setShowRateChangeNote(true);
  };
  const saveEditService = () => {
    if (editingServiceId == null) return;
    const res = updateRevenueService(editingServiceId, { name: editingServiceName, defaultRate: editingServiceRate });
    if (res.ok === false) { toast.error(res.error); return; }
    toast.success(t('serviceUpdated'));
    setEditingServiceId(null);
  };
  const handleDeleteService = (id: number) => {
    const hasHistory = state.revenueLines.some(l => l.serviceId === id);
    if (hasHistory) {
      setConfirmDeleteServiceId(id);
      setConfirmDeleteTypedName('');
      return;
    }
    if (!window.confirm(t('deleteServiceConfirm'))) return;
    deleteRevenueService(id);
    toast.success(t('serviceDeleted'));
  };

  const saveMonthRevenue = () => {
    // Only persist rows that have any data; skip empty ones so unused services
    // don't pollute the month.
    const toPersist = editLines.filter(l => (l.plannedTransactions || 0) > 0 || (l.actualTransactions || 0) > 0);
    // Pre-validate locally for clearer messages
    const seen = new Set<number>();
    for (const l of toPersist) {
      if (l.serviceId == null) {
        toast.error(t('serviceNameRequired'));
        return;
      }
      if (seen.has(l.serviceId)) {
        toast.error(t('duplicateServiceInMonth'));
        return;
      }
      seen.add(l.serviceId);
      if (!Number.isFinite(l.rate) || l.rate <= 0) {
        toast.error(t('rateInvalid'));
        return;
      }
      if (
        !Number.isInteger(l.plannedTransactions) || l.plannedTransactions < 0 ||
        !Number.isInteger(l.actualTransactions) || l.actualTransactions < 0
      ) {
        toast.error(t('txInvalid'));
        return;
      }
    }
    const mk = monthKeyOf(selectedYear, editMonthIdx);
    const res = upsertRevenueLines(
      feature.id,
      mk,
      toPersist.map(l => ({
        id: l.id,
        serviceId: l.serviceId as number,
        rate: l.rate,
        plannedTransactions: l.plannedTransactions,
        actualTransactions: l.actualTransactions,
        notes: l.notes,
      })),
    );
    if (res.ok === false) {
      toast.error(res.error);
      return;
    }
    toast.success(t('save'));
    setEditMonthOpen(false);
  };

  const addCostItem = (monthIdx: number, category: string) => {
    updateMonthData(monthIdx, md => ({ ...md, costs: { ...md.costs, [category]: [...(md.costs[category] || []), { id: uid(), name: '', planned: 0, actual: 0, notes: '' }] } }));
  };

  const updateCostItem = (monthIdx: number, category: string, itemId: string, updates: Partial<CostItem>) => {
    updateMonthData(monthIdx, md => ({ ...md, costs: { ...md.costs, [category]: (md.costs[category] || []).map(i => i.id === itemId ? { ...i, ...updates } : i) } }));
  };

  const removeCostItem = (monthIdx: number, category: string, itemId: string) => {
    updateMonthData(monthIdx, md => ({ ...md, costs: { ...md.costs, [category]: (md.costs[category] || []).filter(i => i.id !== itemId) } }));
  };

  const updateResourceUtil = (monthIdx: number, resourceId: number, utilization: number) => {
    updateMonthData(monthIdx, md => ({ ...md, resources: md.resources.map(a => a.resourceId === resourceId ? { ...a, utilization } : a) }));
  };

  const removeResource = (monthIdx: number, resourceId: number) => {
    updateMonthData(monthIdx, md => ({ ...md, resources: md.resources.filter(a => a.resourceId !== resourceId) }));
  };

  const openResourceSelector = (monthIdx: number) => { setResourceSelectorMonth(monthIdx); setSelectedResourceIds([]); setResourceSelectorOpen(true); };

  const addSelectedResources = () => {
    updateMonthData(resourceSelectorMonth, md => ({
      ...md, resources: [...md.resources, ...selectedResourceIds.filter(rid => !md.resources.some(a => a.resourceId === rid)).map(rid => ({ resourceId: rid, utilization: 100 }))],
    }));
    setSelectedResourceIds([]);
    setResourceSelectorOpen(false);
  };

  const revenueEntries = useMemo(() => {
    const entries: Array<{ id: string; featureId: number; month: number; year: number; planned: number; actual: number }> = [];
    monthlyRevenue.forEach((mr, mi) => {
      if (mr.planned > 0 || mr.actual > 0) {
        entries.push({
          id: `rev-${selectedYear}-${mi}`,
          featureId: feature.id,
          month: mi,
          year: selectedYear,
          planned: mr.planned,
          actual: mr.actual,
        });
      }
    });
    return entries;
  }, [monthlyRevenue, selectedYear, feature.id]);

  const costEntries = useMemo(() => {
    const entries: Array<{ id: string | number; featureId: number; month: number; year: number; category: string; planned: number; actual: number }> = [];
    Object.entries(yearData).forEach(([ms, md]) => {
      const mi = parseInt(ms);
      Object.entries(md.costs).forEach(([cat, items]) => items.forEach(item => entries.push({ id: item.id, featureId: feature.id, month: mi, year: selectedYear, category: cat, planned: item.planned, actual: item.actual })));
      md.resources.forEach(a => { const r = state.resources.find(res => res.id === a.resourceId); if (r) entries.push({ id: `res-${mi}-${a.resourceId}`, featureId: feature.id, month: mi, year: selectedYear, category: 'Resources', planned: r.costRate * (a.utilization / 100), actual: 0 }); });
    });
    return entries;
  }, [yearData, selectedYear, feature.id, state.resources]);

  const InsightIcon = ({ type }: { type: string }) => {
    if (type === 'up') return <TrendingUp className="w-4 h-4 text-emerald-600 shrink-0" />;
    if (type === 'down') return <TrendingDown className="w-4 h-4 text-destructive shrink-0" />;
    return <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />;
  };

  const ChartTooltipEl = ({ active, payload, label }: import('@/types/recharts').RechartsTooltipProps) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="bg-card border border-border rounded-xl shadow-lg p-3 text-xs space-y-1.5">
        <p className="font-semibold text-foreground text-sm">{label}</p>
        {payload.map((entry, i) => (
          <div key={`${entry.dataKey ?? entry.name ?? i}`} className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full" style={{ background: entry.color }} />
            <span className="text-muted-foreground">{entry.name}:</span>
            <span className="font-semibold text-foreground">{formatCurrency(typeof entry.value === 'number' ? entry.value : Number(entry.value) || 0, language)}</span>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <button onClick={onClose} aria-label={t('back') || 'Back'} className="p-2 hover:bg-secondary rounded-lg transition-colors"><BackIcon className="w-5 h-5" /></button>
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-foreground">{feature.name}</h2>
            <p className="text-sm text-muted-foreground">{product?.name} • {t('financialPlanning')}</p>
          </div>
        </div>
        <Select value={String(selectedYear)} onValueChange={v => setSelectedYear(parseInt(v))}>
          <SelectTrigger className="w-28 h-9"><SelectValue /></SelectTrigger>
          <SelectContent>{[2024, 2025, 2026, 2027].map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}</SelectContent>
        </Select>
      </div>

      {/* Summary Cards */}
      {(() => {
        const planned = totals.plannedRev;
        const achieved = totals.actualRev;
        const achievementPct = planned > 0 ? Math.round((achieved / planned) * 100) : 0;
        const remaining = Math.max(0, planned - achieved);
        // Feature-level planned cost IS real (from Financial Planning grid),
        // so show real budget consumption % instead of a hardcoded value.
        const budgetTotal = totals.plannedCost;
        const costUsedPct = budgetTotal > 0 ? Math.round((totals.actualCost / budgetTotal) * 100) : 0;
        const budgetRemaining = Math.max(0, budgetTotal - totals.actualCost);
        return (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
            <KPICard
              title={t('totalRevenue')}
              value={formatCurrency(achieved, language)}
              icon={<DollarSign className="w-5 h-5 text-success" />}
              variant="green"
              progress={{
                label: t('plannedYear'),
                target: formatCurrency(planned, language),
                percent: achievementPct,
                status: achievementPct >= 70 ? 'positive' : 'negative',
                remaining: formatCurrency(remaining, language),
              }}
            />
            <KPICard
              title={t('totalCost')}
              value={formatCurrency(totals.actualCost, language)}
              icon={<Receipt className="w-5 h-5 text-destructive" />}
              variant="red"
              progress={budgetTotal > 0 ? {
                label: t('budgetYear'),
                target: formatCurrency(budgetTotal, language),
                percent: costUsedPct,
                // For cost, lower-is-better: under budget = positive
                status: costUsedPct <= 100 ? 'positive' : 'negative',
                remaining: formatCurrency(budgetRemaining, language),
              } : undefined}
            />
            <KPICard
              title={t('netProfit')}
              value={formatCurrency(totals.profit, language)}
              subtitle={`${t('margin')}: ${totals.margin.toFixed(1)}%`}
              icon={totals.profit >= 0 ? <TrendingUp className="w-5 h-5 text-success" /> : <TrendingDown className="w-5 h-5 text-destructive" />}
              variant={totals.profit >= 0 ? 'green' : 'red'}
            />
            <KPICard
              title={t('plannedVsAchieved')}
              value={`${achievementPct}%`}
              subtitle={achievementPct >= 70 ? '↑ On Track' : '↓ Below Target'}
              icon={<Target className="w-5 h-5 text-primary-foreground" />}
              variant="gradient"
              progress={{
                label: t('plannedYear'),
                target: formatCurrency(planned, language),
                percent: achievementPct,
                status: achievementPct >= 70 ? 'positive' : 'negative',
                remaining: formatCurrency(remaining, language),
              }}
            />
            <KPICard
              title={t('months')}
              value={String(monthlySummaries.filter(m => m.plannedRev > 0 || m.plannedCost > 0).length)}
              subtitle={`${selectedYear}`}
              icon={<BarChart3 className="w-5 h-5 text-accent" />}
              variant="purple"
            />
          </div>
        );
      })()}

      {/* Tabs */}
      <Tabs value={tab} onValueChange={setTab} className="w-full">
        <div className="bg-card rounded-xl shadow-sm border border-border overflow-hidden">
          <TabsList className="w-full justify-start border-b rounded-none h-auto p-0 bg-transparent overflow-x-auto flex-nowrap">
            {[
              { value: 'profile', icon: <FileText className="w-4 h-4 me-1.5" />, label: t('featureProfile') },
              { value: 'planner', icon: <DollarSign className="w-4 h-4 me-1.5" />, label: t('financialPlanning') },
              { value: 'charts', icon: <BarChart3 className="w-4 h-4 me-1.5" />, label: 'Charts' },
              { value: 'forecast', icon: <TrendingUp className="w-4 h-4 me-1.5" />, label: t('forecast') },
            ].map(tabItem => (
              <TabsTrigger key={tabItem.value} value={tabItem.value}
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-5 py-3 text-sm whitespace-nowrap">
                {tabItem.icon}{tabItem.label}
              </TabsTrigger>
            ))}
          </TabsList>

          <div className="p-5 sm:p-6">
            {/* PLANNER TAB */}
            <TabsContent value="planner" className="mt-0 space-y-4">
              {/* MOBILE CARD LIST — stacked rows so all values are
                  readable on phones (R14 mobile bug fix). */}
              <div className="md:hidden space-y-2">
                {monthlySummaries.map(ms => {
                  const isExpanded = expandedMonths.includes(ms.month);
                  const hasData = ms.plannedRev > 0 || ms.actualRev > 0 || ms.plannedCost > 0;
                  return (
                    <div key={`m-${ms.month}`} className={cn('rounded-xl border border-border bg-card overflow-hidden', hasData && 'ring-1 ring-border')}>
                      <button
                        type="button"
                        onClick={() => toggleMonth(ms.month)}
                        className="w-full flex items-center justify-between gap-2 px-3 py-2.5 hover:bg-secondary/30"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          {isExpanded ? <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" /> : <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />}
                          <span className="text-sm font-semibold text-foreground truncate">{ms.label}</span>
                          {ms.lineCount > 0 && (
                            <span className="text-[10px] bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 px-1.5 py-0.5 rounded-full font-medium shrink-0">
                              {ms.lineCount}
                            </span>
                          )}
                        </div>
                        <span className={cn('text-sm font-bold shrink-0', ms.netProfit >= 0 ? 'text-primary' : 'text-destructive')}>
                          {hasData ? formatCurrency(ms.netProfit, language) : '—'}
                        </span>
                      </button>
                      <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 px-3 pb-3 text-xs">
                        <div className="flex justify-between"><span className="text-muted-foreground">{t('plannedRevenue')}</span><span className="font-medium text-emerald-600">{ms.plannedRev > 0 ? formatCurrency(ms.plannedRev, language) : '—'}</span></div>
                        <div className="flex justify-between"><span className="text-muted-foreground">{t('actualRevenue')}</span><span className="font-medium text-emerald-700">{ms.actualRev > 0 ? formatCurrency(ms.actualRev, language) : '—'}</span></div>
                        <div className="flex justify-between"><span className="text-muted-foreground">{t('plannedCost')}</span><span className="font-medium text-destructive">{ms.plannedCost > 0 ? formatCurrency(ms.plannedCost, language) : '—'}</span></div>
                        <div className="flex justify-between"><span className="text-muted-foreground">{t('actualCost')}</span><span className="font-medium text-destructive/80">{ms.actualCost > 0 ? formatCurrency(ms.actualCost, language) : '—'}</span></div>
                      </div>
                      <div className="px-3 pb-3">
                        <Button size="sm" variant="outline" className="w-full h-9" onClick={() => openMonthEditor(ms.month)}>
                          <Plus className="w-3.5 h-3.5 me-1" /> {t('edit')} {ms.label}
                        </Button>
                      </div>
                    </div>
                  );
                })}
                {/* Mobile totals card */}
                <div className="rounded-xl border-2 border-border bg-secondary/30 p-3">
                  <div className="text-sm font-bold text-foreground mb-2">{t('total')}</div>
                  <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs">
                    <div className="flex justify-between"><span className="text-muted-foreground">{t('plannedRevenue')}</span><span className="font-medium text-emerald-600">{formatCurrency(totals.plannedRev, language)}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">{t('actualRevenue')}</span><span className="font-medium text-emerald-700">{formatCurrency(totals.actualRev, language)}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">{t('plannedCost')}</span><span className="font-medium text-destructive">{formatCurrency(totals.plannedCost, language)}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">{t('actualCost')}</span><span className="font-medium text-destructive/80">{formatCurrency(totals.actualCost, language)}</span></div>
                    <div className="flex justify-between col-span-2 pt-1.5 border-t border-border"><span className="font-semibold">{t('netProfit')}</span><span className={cn('font-bold', totals.profit >= 0 ? 'text-primary' : 'text-destructive')}>{formatCurrency(totals.profit, language)}</span></div>
                  </div>
                </div>
              </div>

              {/* DESKTOP TABLE — hidden on mobile so the 7-column grid
                  doesn't crush numeric cells (mobile bug fix R14). */}
              <div className="hidden md:block rounded-xl border border-border overflow-hidden">
                <div className="grid grid-cols-[1.2fr_1fr_1fr_1fr_1fr_1fr_auto] gap-0 bg-secondary/50 px-4 py-3">
                  <span className="text-xs font-semibold text-muted-foreground uppercase">{t('month')}</span>
                  <span className="text-xs font-semibold text-muted-foreground uppercase text-end">{t('plannedRevenue')}</span>
                  <span className="text-xs font-semibold text-muted-foreground uppercase text-end">{t('actualRevenue')}</span>
                  <span className="text-xs font-semibold text-muted-foreground uppercase text-end">{t('plannedCost')}</span>
                  <span className="text-xs font-semibold text-muted-foreground uppercase text-end">{t('actualCost')}</span>
                  <span className="text-xs font-semibold text-muted-foreground uppercase text-end">{t('netProfit')}</span>
                  <span className="text-xs font-semibold text-muted-foreground uppercase text-center w-20">{t('actions')}</span>
                </div>

                {monthlySummaries.map(ms => {
                  const isExpanded = expandedMonths.includes(ms.month);
                  const hasData = ms.plannedRev > 0 || ms.actualRev > 0 || ms.plannedCost > 0;
                  return (
                    <div key={ms.month} className="border-t border-border">
                      <div className={cn("grid grid-cols-[1.2fr_1fr_1fr_1fr_1fr_1fr_auto] gap-0 px-4 py-3 hover:bg-secondary/30 cursor-pointer transition-colors", hasData && "bg-card")}
                        onClick={() => toggleMonth(ms.month)}>
                        <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                          {isExpanded ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
                          {ms.label}
                          {!hasData && <span className="text-xs text-muted-foreground font-normal ml-1">—</span>}
                          {ms.lineCount > 0 && (
                            <span className="text-[10px] bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 px-1.5 py-0.5 rounded-full font-medium">
                              {ms.lineCount} {t('items')}
                            </span>
                          )}
                        </div>
                        <div className="text-sm font-medium text-emerald-600 text-end">{ms.plannedRev > 0 ? formatCurrency(ms.plannedRev, language) : '—'}</div>
                        <div className="text-sm font-medium text-emerald-700 text-end">{ms.actualRev > 0 ? formatCurrency(ms.actualRev, language) : '—'}</div>
                        <div className="text-sm font-medium text-destructive text-end">{ms.plannedCost > 0 ? formatCurrency(ms.plannedCost, language) : '—'}</div>
                        <div className="text-sm font-medium text-destructive/80 text-end">{ms.actualCost > 0 ? formatCurrency(ms.actualCost, language) : '—'}</div>
                        <div className={cn("text-sm font-bold text-end", ms.netProfit >= 0 ? "text-primary" : "text-destructive")}>
                          {hasData ? formatCurrency(ms.netProfit, language) : '—'}
                        </div>
                        <div className="w-20 flex items-center justify-center">
                          <Button size="sm" variant="ghost" className="h-7 px-2 text-xs"
                            onClick={e => { e.stopPropagation(); openMonthEditor(ms.month); }}>
                            <Plus className="w-3.5 h-3.5 me-1" />{t('edit')}
                          </Button>
                        </div>
                      </div>

                      {isExpanded && (
                        <div className="bg-secondary/5 border-t border-border/50 px-6 py-4 space-y-4">
                          {(() => {
                            const mk = monthKeyOf(selectedYear, ms.month);
                            const lines = featureLines.filter(l => l.month === mk);
                            if (lines.length === 0) return null;
                            return (
                            <div>
                              <h6 className="text-xs font-semibold text-emerald-600 uppercase mb-2">{t('revenue')}</h6>
                              <div className="rounded-lg border border-border overflow-hidden">
                                <div className="grid grid-cols-[1.5fr_1fr_1fr_1fr_1fr] bg-secondary/30 px-3 py-2 gap-2">
                                  <span className="text-xs font-semibold text-muted-foreground">{t('serviceName')}</span>
                                  <span className="text-xs font-semibold text-muted-foreground text-end">{t('transactionRate')}</span>
                                  <span className="text-xs font-semibold text-muted-foreground text-end">{t('plannedTx')}</span>
                                  <span className="text-xs font-semibold text-muted-foreground text-end">{t('plannedRevenue')}</span>
                                  <span className="text-xs font-semibold text-muted-foreground text-end">{t('actualRevenue')}</span>
                                </div>
                                {lines.map(line => {
                                  const svc = featureServices.find(s => s.id === line.serviceId);
                                  return (
                                    <div key={line.id} className="grid grid-cols-[1.5fr_1fr_1fr_1fr_1fr] px-3 py-2 border-t border-border/50 gap-2">
                                      <span className="text-sm text-foreground truncate">{svc?.name || t('legacyRevenue')}</span>
                                      <span className="text-sm text-end text-muted-foreground">{formatCurrency(line.rate, language)}</span>
                                      <span className="text-sm text-end text-muted-foreground">{line.plannedTransactions.toLocaleString()}</span>
                                      <span className="text-sm text-end font-medium text-foreground">{formatCurrency(line.rate * line.plannedTransactions, language)}</span>
                                      <span className="text-sm text-end font-medium text-emerald-600">{formatCurrency(line.rate * line.actualTransactions, language)}</span>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                            );
                          })()}
                          {(Object.values(yearData[ms.month].costs).some(items => items.length > 0) || yearData[ms.month].resources.length > 0) && (
                            <div>
                              <h6 className="text-xs font-semibold text-destructive uppercase mb-2">{t('costCategories')}</h6>
                              <div className="rounded-lg border border-border overflow-hidden">
                                <div className="grid grid-cols-3 bg-secondary/30 px-3 py-2">
                                  <span className="text-xs font-semibold text-muted-foreground">{t('costCategory')}</span>
                                  <span className="text-xs font-semibold text-muted-foreground text-end">{t('planned')}</span>
                                  <span className="text-xs font-semibold text-muted-foreground text-end">{t('actual')}</span>
                                </div>
                                {yearData[ms.month].resources.length > 0 && (
                                  <div className="grid grid-cols-3 px-3 py-2 border-t border-border/50">
                                    <span className="text-sm text-foreground">{t('resources')}</span>
                                    <span className="text-sm text-end font-medium text-foreground">
                                      {formatCurrency(yearData[ms.month].resources.reduce((s, a) => { const r = state.resources.find(res => res.id === a.resourceId); return s + (r ? r.costRate * (a.utilization / 100) : 0); }, 0), language)}
                                    </span>
                                    <span className="text-sm text-end font-medium text-muted-foreground">—</span>
                                  </div>
                                )}
                                {Object.entries(yearData[ms.month].costs).map(([cat, items]) => {
                                  if (items.length === 0) return null;
                                  return (
                                    <div key={cat} className="grid grid-cols-3 px-3 py-2 border-t border-border/50">
                                      <span className="text-sm text-foreground">{cat}</span>
                                      <span className="text-sm text-end font-medium text-foreground">{formatCurrency(items.reduce((s, i) => s + i.planned, 0), language)}</span>
                                      <span className="text-sm text-end font-medium text-destructive">{formatCurrency(items.reduce((s, i) => s + i.actual, 0), language)}</span>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                          {!hasData && <p className="text-sm text-muted-foreground text-center py-4">{t('noRevenueData')}</p>}
                          <Button size="sm" variant="outline" onClick={() => openMonthEditor(ms.month)}>
                            <Plus className="w-3.5 h-3.5 me-1" /> {t('edit')} {ms.label}
                          </Button>
                        </div>
                      )}
                    </div>
                  );
                })}

                <div className="grid grid-cols-[1.2fr_1fr_1fr_1fr_1fr_1fr_auto] gap-0 bg-secondary/30 px-4 py-3 border-t-2 border-border font-bold">
                  <span className="text-sm text-foreground ps-6">{t('total')}</span>
                  <span className="text-sm text-emerald-600 text-end">{formatCurrency(totals.plannedRev, language)}</span>
                  <span className="text-sm text-emerald-700 text-end">{formatCurrency(totals.actualRev, language)}</span>
                  <span className="text-sm text-destructive text-end">{formatCurrency(totals.plannedCost, language)}</span>
                  <span className="text-sm text-destructive/80 text-end">{formatCurrency(totals.actualCost, language)}</span>
                  <span className={cn("text-sm text-end", totals.profit >= 0 ? "text-primary" : "text-destructive")}>{formatCurrency(totals.profit, language)}</span>
                  <span className="w-20" />
                </div>
              </div>
            </TabsContent>


            {/* PROFILE TAB */}
            <TabsContent value="profile" className="mt-0 space-y-6">
              <div className="flex justify-end">
                {isEditingProfile ? (
                  <Button size="sm" onClick={() => setIsEditingProfile(false)} className="gap-1.5">
                    <Save className="w-4 h-4" /> {t('save')}
                  </Button>
                ) : (
                  <Button size="sm" variant="outline" onClick={() => setIsEditingProfile(true)} className="gap-1.5">
                    <Pencil className="w-4 h-4" /> {t('edit')}
                  </Button>
                )}
              </div>
              <div className="bg-card rounded-xl border border-border p-5">
                <label className="block text-sm font-semibold text-foreground mb-3 flex items-center gap-2"><span className="text-lg">📝</span>{t('description')}</label>
                {isEditingProfile ? (
                  <Textarea value={featureProfile.description} onChange={e => setFeatureProfile({ ...featureProfile, description: e.target.value })} placeholder={t('featureDescPlaceholder')} rows={3} />
                ) : (
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap min-h-[3rem]">{featureProfile.description || t('featureDescPlaceholder')}</p>
                )}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[
                  { key: 'targetUser', icon: '👥', field: 'targetUser' as const, placeholder: 'targetUserPlaceholder' },
                  { key: 'customerSegmentation', icon: '🎯', field: 'customerSegmentation' as const, placeholder: 'customerSegmentationPlaceholder' },
                  { key: 'valueProposition', icon: '💎', field: 'valueProposition' as const, placeholder: 'valuePropositionPlaceholder' },
                  { key: 'businessModel', icon: '💰', field: 'businessModel' as const, placeholder: 'businessModelPlaceholder' },
                ].map(f => (
                  <div key={f.key} className="rounded-xl border border-border p-5 bg-card">
                    <label className="block text-sm font-semibold text-foreground mb-3 flex items-center gap-2"><span className="text-lg">{f.icon}</span>{t(f.key as any)}</label>
                    {isEditingProfile ? (
                      <Textarea value={featureProfile[f.field]} onChange={e => setFeatureProfile({ ...featureProfile, [f.field]: e.target.value })} placeholder={t(f.placeholder as any)} rows={3} />
                    ) : (
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap min-h-[3rem]">{featureProfile[f.field] || t(f.placeholder as any)}</p>
                    )}
                  </div>
                ))}
              </div>
              <div className="rounded-xl border border-border p-5 bg-card">
                <label className="block text-sm font-semibold text-foreground mb-3 flex items-center gap-2"><span className="text-lg">⚠️</span>{t('risksAndChallenges')}</label>
                {isEditingProfile ? (
                  <Textarea value={featureProfile.risksAndChallenges} onChange={e => setFeatureProfile({ ...featureProfile, risksAndChallenges: e.target.value })} placeholder={t('risksPlaceholder')} rows={3} />
                ) : (
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap min-h-[3rem]">{featureProfile.risksAndChallenges || t('risksPlaceholder')}</p>
                )}
              </div>
            </TabsContent>

            {/* CHARTS TAB */}
            <TabsContent value="charts" className="mt-0 space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                <div className="bg-card rounded-xl border border-border p-5">
                  <h5 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2"><TrendingUp className="w-4 h-4 text-primary" /> {t('revenueCostTrend')}</h5>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                        <XAxis dataKey="month" fontSize={11} stroke="hsl(var(--muted-foreground))" axisLine={false} tickLine={false} />
                        <YAxis fontSize={11} stroke="hsl(var(--muted-foreground))" axisLine={false} tickLine={false} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
                        <Tooltip content={<ChartTooltipEl />} />
                        <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
                        <Line type="monotone" dataKey="revenue" name={t('plannedRevenue')} stroke="hsl(var(--revenue, 142 71% 45%))" strokeWidth={2.5} dot={{ r: 3, fill: 'hsl(var(--revenue, 142 71% 45%))' }} />
                        <Line type="monotone" dataKey="actualRevenue" name={t('actualRevenue')} stroke="hsl(142 71% 35%)" strokeWidth={2} strokeDasharray="5 3" dot={{ r: 2.5 }} />
                        <Line type="monotone" dataKey="cost" name={t('totalCost')} stroke="hsl(var(--cost, 0 84% 60%))" strokeWidth={2.5} dot={{ r: 3, fill: 'hsl(var(--cost, 0 84% 60%))' }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
                <div className="bg-card rounded-xl border border-border p-5">
                  <h5 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2"><BarChart3 className="w-4 h-4 text-primary" /> {t('netProfit')} Trend</h5>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                        <XAxis dataKey="month" fontSize={11} stroke="hsl(var(--muted-foreground))" axisLine={false} tickLine={false} />
                        <YAxis fontSize={11} stroke="hsl(var(--muted-foreground))" axisLine={false} tickLine={false} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
                        <Tooltip content={<ChartTooltipEl />} />
                        <Bar dataKey="profit" name={t('netProfit')} fill="hsl(var(--primary))" radius={[4,4,0,0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
                <div className="bg-card rounded-xl border border-border p-5 lg:col-span-2">
                  <h5 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2"><PieChart className="w-4 h-4 text-destructive" /> {t('monthlyCostBreakdown')}</h5>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={costBreakdownData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                        <XAxis dataKey="monthLabel" fontSize={11} stroke="hsl(var(--muted-foreground))" axisLine={false} tickLine={false} />
                        <YAxis fontSize={11} stroke="hsl(var(--muted-foreground))" axisLine={false} tickLine={false} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
                        <Tooltip content={<ChartTooltipEl />} />
                        <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
                        <Bar dataKey="Resources" name={t('resources')} stackId="a" fill="hsl(var(--primary))" />
                        <Bar dataKey="Infrastructure" name="Infrastructure" stackId="a" fill="hsl(var(--cost, 0 84% 60%))" />
                        <Bar dataKey="Licensing" name="Licensing" stackId="a" fill="hsl(40 96% 53%)" />
                        <Bar dataKey="Marketing" name="Marketing" stackId="a" fill="hsl(280 67% 55%)" />
                        <Bar dataKey="Other" name="Other" stackId="a" fill="hsl(var(--muted-foreground))" radius={[4,4,0,0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            </TabsContent>




            {/* FORECAST TAB */}
            <TabsContent value="forecast" className="mt-0">
              <FeatureForecast feature={feature} revenueEntries={revenueEntries} costEntries={costEntries} />
            </TabsContent>
          </div>
        </div>
      </Tabs>

      {/* MONTH EDIT POPUP */}
      <Dialog open={editMonthOpen} onOpenChange={setEditMonthOpen}>
        <DialogContent
          className="p-0 overflow-hidden flex flex-col gap-0 w-[95vw] max-w-[1400px] h-[90vh] max-h-[900px] sm:rounded-xl sm:flex sm:h-[90vh] sm:max-h-[900px] sm:max-w-[1400px] sm:p-0 sm:overflow-hidden"
        >
          {/* Sticky header */}
          <DialogHeader className="mx-0 mt-0 px-6 pt-5 pb-4 border-b border-border bg-card shrink-0 text-start static">
            <DialogTitle className="flex items-center gap-2 text-lg font-semibold">
              <DollarSign className="w-5 h-5 text-primary" />
              {(language === 'ar' ? MONTHS_FULL_AR : MONTHS_FULL_EN)[editMonthIdx]} {selectedYear} — {t('monthlyFinancialPlanning')}
            </DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">
              {t('planMonthSubtitle')}
            </DialogDescription>
          </DialogHeader>

          {/* Compact sticky summary strip — visible below 1100px (where the aside would otherwise stack at the bottom).
              Keeps live KPI numbers in reach without scrolling past the entire form. */}
          <div className="min-[1100px]:hidden shrink-0 border-b border-border bg-card px-4 py-2 flex items-center gap-2 overflow-x-auto">
            <div className="flex items-baseline gap-1.5 whitespace-nowrap">
              <span className="text-[10px] uppercase tracking-wide text-muted-foreground">{t('revenue')}</span>
              <span className="text-sm font-bold text-emerald-600 tabular-nums">{formatCurrency(editMonthSummary.editActualRev, language)}</span>
            </div>
            <span className="text-muted-foreground/40">·</span>
            <div className="flex items-baseline gap-1.5 whitespace-nowrap">
              <span className="text-[10px] uppercase tracking-wide text-muted-foreground">{t('cost')}</span>
              <span className="text-sm font-bold text-destructive tabular-nums">{formatCurrency(editMonthSummary.totalCost, language)}</span>
            </div>
            <span className="text-muted-foreground/40">·</span>
            <div className="flex items-baseline gap-1.5 whitespace-nowrap">
              <span className="text-[10px] uppercase tracking-wide text-muted-foreground">{t('netProfit')}</span>
              <span className={cn("text-sm font-bold tabular-nums", editMonthSummary.profit >= 0 ? "text-primary" : "text-destructive")}>
                {formatCurrency(editMonthSummary.profit, language)}
              </span>
              <span className={cn("text-[11px] font-semibold tabular-nums ms-0.5", editMonthSummary.margin >= 0 ? "text-primary" : "text-destructive")}>
                ({editMonthSummary.margin.toFixed(1)}%)
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 min-[1100px]:grid-cols-[minmax(720px,1fr)_340px] gap-6 px-6 py-5 flex-1 min-h-0 overflow-y-auto bg-[hsl(var(--muted)/0.3)]">
            <div className="space-y-5 min-w-0">
              {/* STEP 1 — Services / Subscriptions (catalog) */}
              <div className="bg-card rounded-xl border border-border p-4">
                <div className="flex items-start justify-between gap-2 flex-wrap mb-1">
                  <div>
                    <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                      <Tag className="w-4 h-4 text-primary" /> {t('servicesSubscriptions')}
                      <span className="text-[11px] font-normal text-muted-foreground">· Step 1</span>
                    </h4>
                    <p className="text-xs text-muted-foreground mt-0.5">{t('servicesSubscriptionsDesc')}</p>
                  </div>
                </div>

                {/* Services list */}
                {featureServices.length === 0 ? (
                  <div className="text-sm text-muted-foreground text-center py-5 border border-dashed border-border rounded-lg mt-3">
                    {t('noServicesYet')}
                  </div>
                ) : (
                  // R14: wrap in horizontal scroll so the table cannot
                  // overflow the dialog body on narrow screens.
                  <div className="rounded-lg border border-border mt-3 overflow-x-auto">
                    <table className="w-full text-sm min-w-[420px]">
                      <thead className="bg-secondary/50">
                        <tr>
                          <th className="px-3 py-2 text-start text-xs font-semibold text-muted-foreground">{t('serviceName')}</th>
                          <th className="px-3 py-2 text-end text-xs font-semibold text-muted-foreground w-40">{t('defaultRate')}</th>
                          <th className="px-3 py-2 w-28" />
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {featureServices.map(s => {
                          const isEditing = editingServiceId === s.id;
                          return (
                            <tr key={s.id} className="hover:bg-secondary/30">
                              <td className="px-3 py-2">
                                {isEditing ? (
                                  <Input className="h-10 text-base md:h-8 md:text-xs min-w-[180px]" value={editingServiceName}
                                    onChange={e => setEditingServiceName(e.target.value)} />
                                ) : (
                                  <span className="text-sm font-medium text-foreground">{s.name}</span>
                                )}
                              </td>
                              <td className="px-3 py-2 text-end">
                                {isEditing ? (
                                  <Input type="number" min={0} step="0.01" className="h-10 text-base md:h-8 md:text-xs text-end min-w-[110px] ms-auto"
                                    value={editingServiceRate || ''} placeholder="0"
                                    onChange={e => setEditingServiceRate(parseMoney(e.target.value))} />
                                ) : (
                                  <span className="text-sm text-foreground">{formatCurrency(s.defaultRate, language)}</span>
                                )}
                              </td>
                              <td className="px-3 py-2 text-center">
                                <div className="flex items-center justify-center gap-1">
                                  {isEditing ? (
                                    <>
                                      <Button size="sm" className="h-7 px-2 text-xs" onClick={saveEditService}>
                                        {t('save')}
                                      </Button>
                                      <Button size="sm" variant="ghost" className="h-7 px-2 text-xs"
                                        onClick={() => setEditingServiceId(null)}>
                                        {t('cancel')}
                                      </Button>
                                    </>
                                  ) : (
                                    <>
                                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0"
                                        onClick={() => startEditService(s.id)} aria-label={t('edit')}>
                                        <Pencil className="w-3.5 h-3.5" />
                                      </Button>
                                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive/70 hover:text-destructive"
                                        onClick={() => handleDeleteService(s.id)} aria-label={t('delete') || 'Delete'}>
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </Button>
                                    </>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Add new service inline form */}
                <div className="mt-3 flex flex-col sm:flex-row gap-2 items-stretch sm:items-end">
                  <div className="flex-1">
                    <label className="block text-[11px] font-medium text-muted-foreground mb-1">{t('serviceName')}</label>
                    <Input className="h-9 text-sm min-w-[180px]" placeholder={t('serviceName')}
                      value={newServiceName}
                      onChange={e => setNewServiceName(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddService(); } }} />
                  </div>
                  <div className="w-full sm:w-40">
                    <label className="block text-[11px] font-medium text-muted-foreground mb-1">{t('defaultRate')} (SAR)</label>
                    <Input type="number" min={0} step="0.01" className="h-9 text-sm text-end min-w-[110px]"
                      placeholder="0" value={newServiceRate || ''}
                      onChange={e => setNewServiceRate(parseMoney(e.target.value))}
                      onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddService(); } }} />
                  </div>
                  <Button size="sm" onClick={handleAddService} className="h-9" disabled={!newServiceName.trim()}>
                    <Plus className="w-4 h-4 me-1.5" /> {t('addService')}
                  </Button>
                </div>
                {showRateChangeNote && (
                  <div className="mt-3 flex items-start gap-2 text-[11px] text-muted-foreground bg-muted/40 border border-border rounded-md px-3 py-2">
                    <Lightbulb className="w-3.5 h-3.5 text-primary mt-0.5 shrink-0" />
                    <span>{t('rateChangeNote')}</span>
                  </div>
                )}
              </div>

              {/* STEP 2 — Monthly Transactions per service */}
              <div className="bg-card rounded-xl border border-border p-4">
                <div className="mb-2 flex items-start justify-between gap-3 flex-wrap">
                  <div>
                    <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-emerald-600" /> {t('monthlyTransactions')}
                      <span className="text-[11px] font-normal text-muted-foreground">· {t('step2')}</span>
                    </h4>
                    <p className="text-xs text-muted-foreground mt-0.5">{t('monthlyTransactionsDesc')}</p>
                  </div>
                  {editLines.length > 0 && (
                    <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer select-none">
                      <input
                        type="checkbox"
                        className="h-3.5 w-3.5 accent-primary"
                        checked={hideInactive}
                        onChange={e => setHideInactive(e.target.checked)}
                      />
                      {t('hideInactive')}
                    </label>
                  )}
                </div>

                {editLines.length === 0 ? (
                  <div className="text-sm text-muted-foreground text-center py-6 border border-dashed border-border rounded-lg">
                    {t('addServicesFirst')}
                  </div>
                ) : (
                  <div className="rounded-lg border border-border">
                    <table className="w-full text-sm table-fixed [font-variant-numeric:tabular-nums]">
                      <colgroup>
                        <col />
                        <col style={{ width: '150px' }} />
                        <col style={{ width: '100px' }} />
                        <col style={{ width: '100px' }} />
                        <col style={{ width: '130px' }} />
                        <col style={{ width: '130px' }} />
                      </colgroup>
                      <thead className="bg-secondary/50">
                        <tr>
                          <th className="px-3 py-2 text-start text-xs font-semibold text-muted-foreground">{t('serviceName')}</th>
                          <th className="px-2 py-2 text-end text-xs font-semibold text-muted-foreground">{t('transactionRate')}</th>
                          <th className="px-2 py-2 text-end text-xs font-semibold text-muted-foreground">{t('plannedTx')}</th>
                          <th className="px-2 py-2 text-end text-xs font-semibold text-muted-foreground">{t('actualTx')}</th>
                          <th className="px-2 py-2 text-end text-xs font-semibold text-emerald-700">{t('plannedRevenue')}</th>
                          <th className="px-2 py-2 text-end text-xs font-semibold text-emerald-700">{t('actualRevenue')}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {(() => {
                          const visible: typeof editLines = [];
                          const hiddenCount = { n: 0 };
                          editLines.forEach(line => {
                            const inactive = (line.plannedTransactions || 0) === 0 && (line.actualTransactions || 0) === 0;
                            if (hideInactive && inactive) hiddenCount.n += 1;
                            else visible.push(line);
                          });
                          (visible as any).hiddenCount = hiddenCount.n;
                          return null;
                        })()}
                        {editLines.filter(line => {
                          if (!hideInactive) return true;
                          return !((line.plannedTransactions || 0) === 0 && (line.actualTransactions || 0) === 0);
                        }).map(line => {
                          const svc = featureServices.find(s => s.id === line.serviceId);
                          if (!svc) return null;
                          const plannedRev = (line.rate || 0) * (line.plannedTransactions || 0);
                          const actualRev = (line.rate || 0) * (line.actualTransactions || 0);
                          const isOverride = Math.abs((line.rate || 0) - svc.defaultRate) > 0.0001;
                          const rateInvalid = !Number.isFinite(line.rate) || line.rate <= 0;
                          const overflow = line.plannedTransactions > 0 && line.actualTransactions > line.plannedTransactions * 1.5;
                          return (
                            <tr key={line.key} className="hover:bg-secondary/30 align-top transition-colors min-h-[72px]">
                              <td className="px-3 py-2.5 align-middle">
                                <div className="text-sm font-medium text-foreground flex items-center gap-1.5" title={svc.name}>
                                  <Tag className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                                  <span className="truncate">{svc.name}</span>
                                </div>
                              </td>
                              <td className="px-2 py-2.5">
                                <div className="flex flex-col items-end gap-1">
                                  <Input
                                    type="number" min={0} step="0.01"
                                    className={cn("h-9 text-xs text-end w-full", rateInvalid && "border-destructive focus-visible:ring-destructive")}
                                    value={line.rate || ''}
                                    placeholder={String(svc.defaultRate)}
                                    onChange={e => updateDraftLine(line.key, { rate: parseMoney(e.target.value) })}
                                  />
                                  <span
                                    className={cn(
                                      "text-[10px] px-1.5 py-0.5 rounded-full font-medium",
                                      isOverride
                                        ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300"
                                        : "bg-muted text-muted-foreground",
                                    )}
                                  >
                                    {isOverride ? t('pillOverridden') : t('pillDefault')}
                                  </span>
                                  {isOverride && (
                                    <button
                                      type="button"
                                      className="text-[10px] text-primary hover:underline"
                                      onClick={() => updateDraftLine(line.key, { rate: svc.defaultRate })}
                                    >
                                      {t('resetToDefault')}
                                    </button>
                                  )}
                                  {rateInvalid && <div className="text-[10px] text-destructive">{t('rateRequired')}</div>}
                                </div>
                              </td>
                              <td className="px-2 py-2.5">
                                <Input
                                  type="number" min={0} step="1"
                                  className="h-9 text-xs text-end w-full"
                                  value={line.plannedTransactions || ''}
                                  placeholder="0"
                                  onChange={e => updateDraftLine(line.key, { plannedTransactions: Math.max(0, Math.floor(Number(e.target.value) || 0)) })}
                                />
                              </td>
                              <td className="px-2 py-2.5">
                                <Input
                                  type="number" min={0} step="1"
                                  className={cn("h-9 text-xs text-end w-full", overflow && "border-amber-500 focus-visible:ring-amber-500")}
                                  value={line.actualTransactions || ''}
                                  placeholder="0"
                                  onChange={e => updateDraftLine(line.key, { actualTransactions: Math.max(0, Math.floor(Number(e.target.value) || 0)) })}
                                />
                                {overflow && (
                                  <div className="text-[10px] text-amber-600 dark:text-amber-400 mt-1 flex items-center gap-1">
                                    <AlertTriangle className="w-3 h-3" /> {t('actualExceedsPlanned')}
                                  </div>
                                )}
                              </td>
                              <td className="px-2 py-2.5 text-end align-middle font-semibold text-foreground transition-all">
                                {formatCurrency(plannedRev, language)}
                              </td>
                              <td className="px-2 py-2.5 text-end align-middle font-semibold text-emerald-600 transition-all">
                                {formatCurrency(actualRev, language)}
                              </td>
                            </tr>
                          );
                        })}
                        {hideInactive && editLines.some(l => (l.plannedTransactions || 0) === 0 && (l.actualTransactions || 0) === 0) && (
                          <tr className="bg-muted/30">
                            <td colSpan={6} className="px-3 py-2 text-xs text-muted-foreground text-center">
                              + {editLines.filter(l => (l.plannedTransactions || 0) === 0 && (l.actualTransactions || 0) === 0).length} {t('inactiveCollapsedMany')}
                              {' '}
                              <button type="button" className="text-primary hover:underline" onClick={() => setHideInactive(false)}>
                                ({t('show')})
                              </button>
                            </td>
                          </tr>
                        )}
                      </tbody>
                      <tfoot className="bg-secondary/40 border-t-2 border-border">
                        <tr>
                          <td className="px-2 py-2.5 text-xs font-bold text-foreground uppercase" colSpan={4}>
                            {t('total')}
                          </td>
                          <td className="px-2 py-2.5 text-end text-sm font-bold text-foreground">
                            {formatCurrency(editMonthSummary.editPlannedRev, language)}
                          </td>
                          <td className="px-2 py-2.5 text-end text-sm font-bold text-emerald-600">
                            {formatCurrency(editMonthSummary.editActualRev, language)}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                )}
              </div>

              {/* Cost Categories */}
              <div className="bg-card rounded-xl border border-border p-4">
                <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-destructive" /> {t('costCategories')}
                </h4>
                <div className="space-y-2">
                  {/* Resources */}
                  <Collapsible open={editCostCatsOpen.includes('Resources')}
                    onOpenChange={() => setEditCostCatsOpen(prev => prev.includes('Resources') ? prev.filter(c => c !== 'Resources') : [...prev, 'Resources'])}>
                    <CollapsibleTrigger className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg border border-border hover:bg-secondary/30 transition-colors">
                      <span className="text-sm font-medium text-foreground flex items-center gap-2">
                        <Users className="w-4 h-4 text-primary" /> {t('resources')}
                        {yearData[editMonthIdx].resources.length > 0 && <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">{yearData[editMonthIdx].resources.length}</span>}
                      </span>
                      <ChevronDown className={cn("w-4 h-4 text-muted-foreground transition-transform", editCostCatsOpen.includes('Resources') && "rotate-180")} />
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <div className="mt-2 space-y-2">
                        {yearData[editMonthIdx].resources.length > 0 && (
                          <div className="overflow-x-auto rounded-lg border border-border">
                            <table className="w-full text-sm">
                              <thead className="bg-secondary/50">
                                <tr>
                                  <th className="px-3 py-2 text-start text-xs font-semibold text-muted-foreground">{t('resource')}</th>
                                  <th className="px-3 py-2 text-end text-xs font-semibold text-muted-foreground">{t('monthlyCost')}</th>
                                  <th className="px-3 py-2 text-center text-xs font-semibold text-muted-foreground">{t('utilization')} %</th>
                                  <th className="px-3 py-2 text-end text-xs font-semibold text-muted-foreground">{t('allocatedCost')}</th>
                                  <th className="px-3 py-2 w-10" />
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-border">
                                {yearData[editMonthIdx].resources.map(alloc => {
                                  const resource = state.resources.find(r => r.id === alloc.resourceId);
                                  if (!resource) return null;
                                  const isInvalid = !productResourceIds.has(resource.id);
                                  return (
                                    <tr key={alloc.resourceId} className={cn("hover:bg-secondary/30", isInvalid && "bg-destructive/5")}>
                                      <td className="px-3 py-2">
                                        <div className="font-medium text-foreground flex items-center gap-1.5">
                                          {resource.name}
                                          {isInvalid && <AlertTriangle className="w-3.5 h-3.5 text-destructive" />}
                                        </div>
                                        <div className="text-xs text-muted-foreground">{resource.role}</div>
                                        {isInvalid && (
                                          <div className="text-[11px] text-destructive mt-0.5">{t('invalidResourceAssignment')}</div>
                                        )}
                                      </td>
                                      <td className="px-3 py-2 text-end text-foreground">{formatCurrency(resource.costRate, language)}</td>
                                      <td className="px-3 py-2 text-center">
                                        <Input type="number" className="h-10 text-base md:h-7 md:text-xs text-center w-16 mx-auto" value={alloc.utilization} min={0} max={100} step="1"
                                          onChange={e => updateResourceUtil(editMonthIdx, alloc.resourceId, parsePercent(e.target.value))} />
                                      </td>
                                      <td className="px-3 py-2 text-end font-semibold text-primary">{formatCurrency(resource.costRate * (alloc.utilization / 100), language)}</td>
                                      <td className="px-3 py-2 text-center">
                                        <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-destructive/60 hover:text-destructive" onClick={() => removeResource(editMonthIdx, alloc.resourceId)}>
                                          <Trash2 className="w-3 h-3" />
                                        </Button>
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        )}
                        <Button size="sm" variant="outline" onClick={() => openResourceSelector(editMonthIdx)}>
                          <UserPlus className="w-3.5 h-3.5 me-1.5" /> {t('addResources')}
                        </Button>
                      </div>
                    </CollapsibleContent>
                  </Collapsible>

                  {COST_CATEGORIES.map(cat => {
                    const items = yearData[editMonthIdx].costs[cat] || [];
                    return (
                      <Collapsible key={cat} open={editCostCatsOpen.includes(cat)}
                        onOpenChange={() => setEditCostCatsOpen(prev => prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat])}>
                        <CollapsibleTrigger className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg border border-border hover:bg-secondary/30 transition-colors">
                          <span className="text-sm font-medium text-foreground flex items-center gap-2">
                            {cat}
                            {items.length > 0 && <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full">{items.length}</span>}
                          </span>
                          <ChevronDown className={cn("w-4 h-4 text-muted-foreground transition-transform", editCostCatsOpen.includes(cat) && "rotate-180")} />
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                          <div className="mt-2 space-y-2">
                            {items.length > 0 && (
                              <div className="overflow-x-auto rounded-lg border border-border">
                                <table className="w-full text-sm">
                                  <thead className="bg-secondary/50">
                                    <tr>
                                      <th className="px-3 py-2 text-start text-xs font-semibold text-muted-foreground">{t('costName')}</th>
                                      <th className="px-3 py-2 text-end text-xs font-semibold text-muted-foreground">{t('planned')} (SAR)</th>
                                      <th className="px-3 py-2 text-end text-xs font-semibold text-muted-foreground">{t('actual')} (SAR)</th>
                                      <th className="px-3 py-2 text-start text-xs font-semibold text-muted-foreground">{t('notes')}</th>
                                      <th className="px-3 py-2 w-10" />
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-border">
                                    {items.map(item => (
                                      <tr key={item.id} className="hover:bg-secondary/30">
                                        <td className="px-3 py-1.5"><Input className="h-10 text-base md:h-7 md:text-xs" value={item.name} placeholder={t('costName')} onChange={e => updateCostItem(editMonthIdx, cat, item.id, { name: e.target.value })} /></td>
                                        <td className="px-3 py-1.5"><Input type="number" min={0} step="0.01" className="h-10 text-base md:h-7 md:text-xs text-end" value={item.planned || ''} placeholder="0" onChange={e => updateCostItem(editMonthIdx, cat, item.id, { planned: parseMoney(e.target.value) })} /></td>
                                        <td className="px-3 py-1.5"><Input type="number" min={0} step="0.01" className="h-10 text-base md:h-7 md:text-xs text-end" value={item.actual || ''} placeholder="0" onChange={e => updateCostItem(editMonthIdx, cat, item.id, { actual: parseMoney(e.target.value) })} /></td>
                                        <td className="px-3 py-1.5"><Input className="h-10 text-base md:h-7 md:text-xs" value={item.notes} placeholder="..." onChange={e => updateCostItem(editMonthIdx, cat, item.id, { notes: e.target.value })} /></td>
                                        <td className="px-3 py-1.5 text-center">
                                          <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-destructive/60 hover:text-destructive" onClick={() => removeCostItem(editMonthIdx, cat, item.id)}>
                                            <Trash2 className="w-3 h-3" />
                                          </Button>
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            )}
                            <Button size="sm" variant="outline" onClick={() => addCostItem(editMonthIdx, cat)}>
                              <Plus className="w-3.5 h-3.5 me-1.5" /> {t('addCostEntry')}
                            </Button>
                          </div>
                        </CollapsibleContent>
                      </Collapsible>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Right: Live Summary + Insights (sticky on desktop) */}
            <aside className="hidden min-[1100px]:block space-y-3 min-[1100px]:sticky min-[1100px]:top-0 self-start">
              <h4 className="text-xs font-bold text-foreground uppercase tracking-wide">{t('financialSummary')}</h4>

              {/* Revenue card with variance */}
              <div className="bg-card rounded-xl border border-border p-4 [font-variant-numeric:tabular-nums]">
                <div className="text-[11px] font-medium text-muted-foreground uppercase">{t('plannedRevenue')}</div>
                <div className="text-lg font-bold text-emerald-600">{formatCurrency(editMonthSummary.editPlannedRev, language)}</div>
                <div className="mt-2 text-[11px] text-muted-foreground uppercase">{t('actualRevenue')}</div>
                <div className="flex items-baseline justify-between gap-2">
                  <div className="text-base font-semibold text-emerald-700">{formatCurrency(editMonthSummary.editActualRev, language)}</div>
                  {editMonthSummary.editPlannedRev > 0 && (() => {
                    const v = ((editMonthSummary.editActualRev - editMonthSummary.editPlannedRev) / editMonthSummary.editPlannedRev) * 100;
                    const positive = v >= 0;
                    return (
                      <span className={cn("text-[11px] font-semibold flex items-center gap-0.5",
                        positive ? "text-emerald-600" : "text-destructive")}>
                        {positive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                        {positive ? '+' : ''}{v.toFixed(1)}%
                      </span>
                    );
                  })()}
                </div>
              </div>

              {/* Cost card */}
              <div className="bg-card rounded-xl border border-border p-4 [font-variant-numeric:tabular-nums]">
                <div className="text-[11px] font-medium text-muted-foreground uppercase">{t('totalCost')}</div>
                <div className="text-lg font-bold text-destructive">{formatCurrency(editMonthSummary.totalCost, language)}</div>
              </div>

              {/* Profit + margin combined */}
              <div className="bg-card rounded-xl border border-border p-4 [font-variant-numeric:tabular-nums]">
                <div className="text-[11px] font-medium text-muted-foreground uppercase">{t('netProfit')}</div>
                <div className="flex items-baseline justify-between gap-2">
                  <div className={cn("text-lg font-bold", editMonthSummary.profit >= 0 ? "text-primary" : "text-destructive")}>
                    {formatCurrency(editMonthSummary.profit, language)}
                  </div>
                  <div className={cn("text-sm font-semibold", editMonthSummary.margin >= 0 ? "text-primary" : "text-destructive")}>
                    {editMonthSummary.margin.toFixed(1)}%
                  </div>
                </div>
              </div>

              {/* Cost-zero warning */}
              {editMonthSummary.totalCost === 0 && (
                <div className="flex items-start gap-2 text-[11px] bg-amber-50 dark:bg-amber-900/20 border border-amber-300 dark:border-amber-800 text-amber-800 dark:text-amber-200 rounded-md px-3 py-2">
                  <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                  <span>{t('noCostsWarning')}</span>
                </div>
              )}

              {/* Insights */}
              {(() => {
                const monthIdx = editMonthIdx;
                const year = selectedYear;
                const sumMonth = (y: number, mi: number) => {
                  const mk = `${y}-${String(mi + 1).padStart(2, '0')}`;
                  let rev = 0;
                  state.revenueLines.filter(l => l.featureId === feature.id && l.month === mk).forEach(l => {
                    rev += (l.rate || 0) * (l.actualTransactions || 0);
                  });
                  return rev;
                };
                // Prior month
                const prevMi = monthIdx === 0 ? 11 : monthIdx - 1;
                const prevYear = monthIdx === 0 ? year - 1 : year;
                const prevRev = sumMonth(prevYear, prevMi);
                const currRev = editMonthSummary.editActualRev;
                const yoyRev = sumMonth(year - 1, monthIdx);
                const yoyExists = state.revenueLines.some(l => l.featureId === feature.id && l.month === `${year - 1}-${String(monthIdx + 1).padStart(2, '0')}`);
                const prevExists = state.revenueLines.some(l => l.featureId === feature.id && l.month === `${prevYear}-${String(prevMi + 1).padStart(2, '0')}`);
                const monthLabel = (y: number, mi: number) => `${(language === 'ar' ? MONTHS_FULL_AR : MONTHS_FULL_EN)[mi]} ${y}`;
                // Top cost category (current month draft)
                const md = yearData[monthIdx];
                const catTotals: { cat: string; amount: number }[] = [];
                let resourceCost = 0;
                md.resources.forEach(a => { const r = state.resources.find(res => res.id === a.resourceId); if (r) resourceCost += r.costRate * (a.utilization / 100); });
                if (resourceCost > 0) catTotals.push({ cat: t('resources'), amount: resourceCost });
                Object.entries(md.costs).forEach(([cat, items]) => {
                  const sum = (items as CostItem[]).reduce((s, i) => s + (i.planned || 0), 0);
                  if (sum > 0) catTotals.push({ cat, amount: sum });
                });
                catTotals.sort((a, b) => b.amount - a.amount);
                const topCat = catTotals[0];

                const renderDelta = (curr: number, prev: number, exists: boolean, label: string, prevLabel: string) => {
                  if (!exists || prev === 0) {
                    return (
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/40" />
                        <span className="flex-1">{label}</span>
                        <span className="italic">{t('noPriorData')}</span>
                      </div>
                    );
                  }
                  const pct = ((curr - prev) / prev) * 100;
                  const up = pct >= 0;
                  return (
                    <div className="flex items-center gap-2 text-xs">
                      {up ? <TrendingUp className="w-3.5 h-3.5 text-emerald-600 shrink-0" /> : <TrendingDown className="w-3.5 h-3.5 text-destructive shrink-0" />}
                      <span className="text-muted-foreground flex-1 truncate">{label}</span>
                      <span className={cn("font-semibold tabular-nums", up ? "text-emerald-600" : "text-destructive")}>
                        {up ? '+' : ''}{pct.toFixed(0)}%
                      </span>
                    </div>
                  );
                };

                const prevProfit = prevRev; // simplistic; cost data per past month not loaded here
                return (
                  <div className="bg-card rounded-xl border border-border p-4 space-y-2.5">
                    <h5 className="text-[11px] font-bold text-foreground uppercase tracking-wide flex items-center gap-1.5">
                      <Lightbulb className="w-3.5 h-3.5 text-primary" /> {t('insightsTitle')}
                    </h5>
                    {renderDelta(currRev, prevRev, prevExists, `${t('revenueVsLastMonth')} (${monthLabel(prevYear, prevMi)})`, monthLabel(prevYear, prevMi))}
                    {renderDelta(editMonthSummary.profit, prevProfit, prevExists, t('profitVsLastMonth'), monthLabel(prevYear, prevMi))}
                    {renderDelta(currRev, yoyRev, yoyExists, `${t('revenueVsLastYear')} (${monthLabel(year - 1, monthIdx)})`, monthLabel(year - 1, monthIdx))}
                    {topCat ? (
                      <div className="flex items-center gap-2 text-xs">
                        <Receipt className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                        <span className="text-muted-foreground flex-1 truncate">{t('topCostCategory')}: {topCat.cat}</span>
                        <span className="font-semibold text-foreground">
                          {currRev > 0 ? `${((topCat.amount / currRev) * 100).toFixed(0)}%` : formatCurrency(topCat.amount, language)}
                        </span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/40" />
                        <span className="flex-1">{t('topCostCategory')}</span>
                        <span className="italic">{t('noPriorData')}</span>
                      </div>
                    )}
                  </div>
                );
              })()}
            </aside>
          </div>

          <DialogFooter className="mx-0 mb-0 px-6 py-3 border-t border-border bg-card shrink-0 gap-2 static">
            <Button variant="outline" onClick={() => setEditMonthOpen(false)}>{t('cancel')}</Button>
            <Button onClick={saveMonthRevenue} className="bg-primary hover:bg-primary/90">
              <Save className="w-4 h-4 me-2" />{t('save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete-service confirmation (when service has historical lines) */}
      <AlertDialog open={confirmDeleteServiceId != null} onOpenChange={(open) => { if (!open) setConfirmDeleteServiceId(null); }}>
        <AlertDialogContent>
          {(() => {
            const svc = state.revenueServices.find(s => s.id === confirmDeleteServiceId);
            if (!svc) return null;
            const monthsWithData = new Set(state.revenueLines.filter(l => l.serviceId === svc.id).map(l => l.month)).size;
            const typedOk = confirmDeleteTypedName.trim() === svc.name;
            return (
              <>
                <AlertDialogHeader>
                  <AlertDialogTitle className="text-destructive flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5" />
                    {t('deleteServiceWithHistoryTitle')} ({monthsWithData})
                  </AlertDialogTitle>
                  <AlertDialogDescription>
                    {t('deleteServiceWithHistoryBody')}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <div className="space-y-2">
                  <label className="text-xs font-medium text-muted-foreground">
                    {t('typeNameToConfirm')}: <span className="font-semibold text-foreground">{svc.name}</span>
                  </label>
                  <Input
                    value={confirmDeleteTypedName}
                    onChange={e => setConfirmDeleteTypedName(e.target.value)}
                    placeholder={svc.name}
                  />
                </div>
                <AlertDialogFooter>
                  <AlertDialogCancel autoFocus>{t('cancel')}</AlertDialogCancel>
                  <AlertDialogAction
                    disabled={!typedOk}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90 disabled:opacity-50"
                    onClick={() => {
                      deleteRevenueService(svc.id);
                      toast.success(t('serviceDeleted'));
                      setConfirmDeleteServiceId(null);
                      setConfirmDeleteTypedName('');
                    }}
                  >
                    {t('delete') || 'Delete'} {svc.name}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </>
            );
          })()}
        </AlertDialogContent>
      </AlertDialog>
      <Dialog open={resourceSelectorOpen} onOpenChange={setResourceSelectorOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><UserPlus className="w-5 h-5 text-primary" /> {t('selectResources')}</DialogTitle>
            <DialogDescription>{t('selectResourcesDesc')}</DialogDescription>
          </DialogHeader>
          <div className="space-y-2 max-h-[50vh] overflow-y-auto py-2">
            {productAssignedResources.length === 0 && (
              <div className="flex flex-col items-center justify-center text-center py-8 px-4 rounded-lg border border-dashed border-border bg-secondary/20">
                <Users className="w-8 h-8 text-muted-foreground mb-2" />
                <div className="text-sm font-medium text-foreground">{t('noProductResources')}</div>
                <div className="text-xs text-muted-foreground mt-1">{t('noProductResourcesDesc')}</div>
              </div>
            )}
            {productAssignedResources.map(resource => {
              const isAlreadyAdded = yearData[resourceSelectorMonth]?.resources.some(a => a.resourceId === resource.id);
              const isSelected = selectedResourceIds.includes(resource.id);
              return (
                <label key={resource.id} className={cn("flex items-center gap-3 p-3 rounded-lg border transition-colors cursor-pointer",
                  isAlreadyAdded ? "border-border bg-secondary/30 opacity-60 cursor-not-allowed" : isSelected ? "border-primary bg-primary/5" : "border-border hover:bg-secondary/30")}>
                  <Checkbox checked={isSelected} disabled={isAlreadyAdded} onCheckedChange={(checked) => { if (isAlreadyAdded) return; setSelectedResourceIds(prev => checked ? [...prev, resource.id] : prev.filter(id => id !== resource.id)); }} />
                  <div className="flex-1">
                    <div className="text-sm font-medium text-foreground">{resource.name}</div>
                    <div className="text-xs text-muted-foreground">{resource.role} • {formatCurrency(resource.costRate, language)}/mo</div>
                  </div>
                  {isAlreadyAdded && <span className="text-xs text-muted-foreground">{t('alreadyAdded')}</span>}
                </label>
              );
            })}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResourceSelectorOpen(false)}>{t('cancel')}</Button>
            <Button disabled={selectedResourceIds.length === 0} className="bg-primary hover:bg-primary/90" onClick={addSelectedResources}>
              <Plus className="w-4 h-4 me-2" />{t('addSelected')} ({selectedResourceIds.length})
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default FeatureFinancialPlanning;

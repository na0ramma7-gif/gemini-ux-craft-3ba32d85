import { useState, useMemo } from 'react';
import { useApp } from '@/context/AppContext';
import { Feature } from '@/types';
import { formatCurrency, cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format } from 'date-fns';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  ArrowLeft,
  ArrowRight,
  Plus,
  Trash2,
  Edit,
  BarChart3,
  DollarSign,
  Users,
  TrendingUp,
  FileText,
  Save,
  CircleDollarSign,
  Wallet,
  Target,
  CalendarIcon,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';

// ── Cost Row Sub-Component ──────────────────────────────────

interface CostRowProps {
  item: {
    id: number;
    category: string;
    planned: number;
    actual: number;
    notes: string;
    resourceId: number;
    utilization: number;
    startDate: string;
    endDate: string;
    hoursPerMonth: number;
  };
  idx: number;
  canRemove: boolean;
  onUpdate: (updates: Partial<CostRowProps['item']>) => void;
  onRemove: () => void;
  calculateCost: (item: CostRowProps['item']) => number;
  resources: any[];
  language: string;
  t: (key: any) => string;
  formatCurrency: (v: number, lang: string) => string;
}

const CostRow = ({ item, idx, canRemove, onUpdate, onRemove, calculateCost, resources, language, t, formatCurrency: fmtCurrency }: CostRowProps) => {
  const [expanded, setExpanded] = useState(false);
  const isResource = item.category === 'Resources';

  return (
    <div className={cn("border-t border-border", idx % 2 === 0 ? "bg-card" : "bg-secondary/5")}>
      <div className="grid grid-cols-[1fr_1fr_1fr_1fr_auto] gap-2 px-3 py-2 items-center">
        <Select value={item.category} onValueChange={v => onUpdate({ category: v })}>
          <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            {COST_CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>

        {isResource ? (
          <div className="text-xs font-medium text-blue-600 cursor-pointer" onClick={() => setExpanded(!expanded)}>
            {calculateCost(item) > 0 ? fmtCurrency(calculateCost(item), language) : '—'}
            <span className="text-muted-foreground ms-1 text-[10px]">▼</span>
          </div>
        ) : (
          <Input type="number" className="h-8 text-xs" value={item.planned || ''} placeholder="0"
            onChange={e => onUpdate({ planned: parseFloat(e.target.value) || 0 })} />
        )}

        <Input type="number" className="h-8 text-xs" value={item.actual || ''} placeholder="0"
          onChange={e => onUpdate({ actual: parseFloat(e.target.value) || 0 })} />

        <Input className="h-8 text-xs" value={item.notes} placeholder={t('optional')}
          onChange={e => onUpdate({ notes: e.target.value })} />

        <Button type="button" variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive/60 hover:text-destructive"
          disabled={!canRemove} onClick={onRemove}>
          <Trash2 className="w-3.5 h-3.5" />
        </Button>
      </div>

      {isResource && expanded && (
        <div className="px-3 pb-3 pt-1 space-y-3 border-t border-dashed border-border mx-3 mt-1">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-foreground mb-1 block">{t('resource')}</label>
              <Select value={String(item.resourceId)} onValueChange={v => onUpdate({ resourceId: parseInt(v) })}>
                <SelectTrigger className="h-8 text-xs"><SelectValue placeholder={t('selectResource')} /></SelectTrigger>
                <SelectContent>
                  {resources.map(r => (
                    <SelectItem key={r.id} value={String(r.id)}>{r.name} — {fmtCurrency(r.costRate, language)}/mo</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-medium text-foreground mb-1 block">{t('utilization')} (%)</label>
              <Input type="number" className="h-8 text-xs" min={0} max={100} value={item.utilization || ''} placeholder="100"
                onChange={e => onUpdate({ utilization: parseInt(e.target.value) || 0 })} />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-medium text-foreground mb-1 block">{t('hoursPerMonth')}</label>
              <Input type="number" className="h-8 text-xs" value={item.hoursPerMonth || ''} placeholder="0"
                onChange={e => onUpdate({ hoursPerMonth: parseInt(e.target.value) || 0 })} />
            </div>
            <div>
              <label className="text-xs font-medium text-foreground mb-1 block">{t('startDate')}</label>
              <Input type="date" className="h-8 text-xs" value={item.startDate} onChange={e => onUpdate({ startDate: e.target.value })} />
            </div>
            <div>
              <label className="text-xs font-medium text-foreground mb-1 block">{t('endDate')}</label>
              <Input type="date" className="h-8 text-xs" value={item.endDate} onChange={e => onUpdate({ endDate: e.target.value })} />
            </div>
          </div>
          <div className="rounded p-2 bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800 text-center text-xs">
            <span className="text-muted-foreground">{t('estimatedCost')}: </span>
            <span className="font-bold text-blue-600">{fmtCurrency(calculateCost(item), language)}</span>
          </div>
        </div>
      )}

      {isResource && !expanded && (
        <button onClick={() => setExpanded(true)} className="w-full text-[10px] text-muted-foreground hover:text-foreground py-0.5 transition-colors">
          ▸ {t('resource')}: {resources.find(r => r.id === item.resourceId)?.name || '—'}
        </button>
      )}
    </div>
  );
};

// ── Data Types ──────────────────────────────────────────────

interface RevenueEntry {
  id: number;
  featureId: number;
  month: number; // 0-11
  year: number;
  planned: number;
  actual: number;
  notes: string;
}

interface CostEntry {
  id: number;
  featureId: number;
  month: number;
  year: number;
  category: string;
  planned: number;
  actual: number;
  notes: string;
  // Resource-specific
  resourceId?: number;
  utilization?: number;
  startDate?: string;
  endDate?: string;
  hoursPerMonth?: number;
  calculatedCost?: number;
}

interface FeatureFinancialPlanningProps {
  feature: Feature;
  onClose: () => void;
}

const MONTHS_SHORT_KEYS = ['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'] as const;
const COST_CATEGORIES = ['Infrastructure', 'Licensing', 'Marketing', 'Resources', 'Other'];

// ── Component ───────────────────────────────────────────────

const FeatureFinancialPlanning = ({ feature, onClose }: FeatureFinancialPlanningProps) => {
  const { state, t, language, isRTL } = useApp();
  const [tab, setTab] = useState('summary');
  const [selectedYear, setSelectedYear] = useState(2025);

  // Data stores
  const [revenueEntries, setRevenueEntries] = useState<RevenueEntry[]>([]);
  const [costEntries, setCostEntries] = useState<CostEntry[]>([]);

  // Feature Profile
  const [featureProfile, setFeatureProfile] = useState({
    description: feature.description || '',
    targetUser: feature.targetUser || '',
    customerSegmentation: feature.customerSegmentation || '',
    valueProposition: feature.valueProposition || '',
    businessModel: feature.businessModel || '',
    risksAndChallenges: feature.risks || '',
  });

  // Unified Financial Entry modal
  const [financialModal, setFinancialModal] = useState<{
    open: boolean;
    editRevenue?: RevenueEntry;
    editCost?: CostEntry;
    defaultTab?: 'revenue' | 'cost';
  } | null>(null);

  const [modalTab, setModalTab] = useState<'revenue' | 'cost'>('revenue');

  // Financial period (date range)
  const [periodStart, setPeriodStart] = useState<Date | undefined>(undefined);
  const [periodEnd, setPeriodEnd] = useState<Date | undefined>(undefined);

  // Revenue form inside modal
  const [revenueForm, setRevenueForm] = useState({
    featureId: feature.id,
    month: 0,
    planned: 0,
    actual: 0,
    notes: '',
  });

  // Multiple cost items inside modal
  interface CostFormItem {
    id: number;
    category: string;
    planned: number;
    actual: number;
    notes: string;
    resourceId: number;
    utilization: number;
    startDate: string;
    endDate: string;
    hoursPerMonth: number;
  }

  const createEmptyCostItem = (): CostFormItem => ({
    id: Date.now(),
    category: 'Infrastructure',
    planned: 0,
    actual: 0,
    notes: '',
    resourceId: state.resources[0]?.id || 0,
    utilization: 100,
    startDate: '',
    endDate: '',
    hoursPerMonth: 0,
  });

  const [costItems, setCostItems] = useState<CostFormItem[]>([createEmptyCostItem()]);

  // Legacy single costForm for resource cost calculation
  const [costForm, setCostForm] = useState({
    featureId: feature.id,
    month: 0,
    category: 'Infrastructure',
    planned: 0,
    actual: 0,
    notes: '',
    resourceId: 0,
    utilization: 100,
    startDate: '',
    endDate: '',
    hoursPerMonth: 0,
  });

  // Delete confirm
  const [deleteConfirm, setDeleteConfirm] = useState<{ type: 'revenue' | 'cost'; id: number } | null>(null);

  const product = state.products.find(p => p.id === feature.productId);
  const productFeatures = state.features.filter(f => f.productId === feature.productId);
  const BackIcon = isRTL ? ArrowRight : ArrowLeft;

  // ── Calculations ──────────────────────────────────────────

  const totals = useMemo(() => {
    const revPlanned = revenueEntries.reduce((s, e) => s + e.planned, 0);
    const revActual = revenueEntries.reduce((s, e) => s + e.actual, 0);
    const costPlanned = costEntries.reduce((s, e) => s + (e.calculatedCost || e.planned), 0);
    const costActual = costEntries.reduce((s, e) => s + e.actual, 0);

    return {
      revenue: { planned: revPlanned, actual: revActual, variance: revActual - revPlanned, achievement: revPlanned > 0 ? (revActual / revPlanned) * 100 : 0 },
      cost: { planned: costPlanned, actual: costActual, variance: costActual - costPlanned, achievement: costPlanned > 0 ? (costActual / costPlanned) * 100 : 0 },
      profit: { planned: revPlanned - costPlanned, actual: revActual - costActual },
    };
  }, [revenueEntries, costEntries]);

  // Chart data
  const chartData = useMemo(() => {
    return MONTHS_SHORT_KEYS.map((key, idx) => {
      const revPlanned = revenueEntries.filter(e => e.month === idx).reduce((s, e) => s + e.planned, 0);
      const revActual = revenueEntries.filter(e => e.month === idx).reduce((s, e) => s + e.actual, 0);
      const costPlanned = costEntries.filter(e => e.month === idx).reduce((s, e) => s + (e.calculatedCost || e.planned), 0);
      const costActual = costEntries.filter(e => e.month === idx).reduce((s, e) => s + e.actual, 0);
      return {
        month: t(key),
        revenuePlanned: revPlanned,
        revenueActual: revActual,
        costPlanned,
        costActual,
      };
    }).filter(d => d.revenuePlanned > 0 || d.revenueActual > 0 || d.costPlanned > 0 || d.costActual > 0);
  }, [revenueEntries, costEntries, t]);

  // ── Open unified modal ────────────────────────────────────

  const openAddFinancialEntry = (defaultTab: 'revenue' | 'cost' = 'revenue') => {
    const now = new Date();
    setPeriodStart(new Date(selectedYear, now.getMonth(), 1));
    setPeriodEnd(new Date(selectedYear, now.getMonth() + 1, 0));
    setRevenueForm({ featureId: feature.id, month: now.getMonth(), planned: 0, actual: 0, notes: '' });
    setCostItems([createEmptyCostItem()]);
    setCostForm({ featureId: feature.id, month: now.getMonth(), category: 'Infrastructure', planned: 0, actual: 0, notes: '', resourceId: state.resources[0]?.id || 0, utilization: 100, startDate: '', endDate: '', hoursPerMonth: 0 });
    setModalTab(defaultTab);
    setFinancialModal({ open: true, defaultTab });
  };

  const openEditRevenue = (entry: RevenueEntry) => {
    setRevenueForm({ featureId: entry.featureId, month: entry.month, planned: entry.planned, actual: entry.actual, notes: entry.notes });
    setPeriodStart(new Date(entry.year, entry.month, 1));
    setPeriodEnd(new Date(entry.year, entry.month + 1, 0));
    setCostItems([createEmptyCostItem()]);
    setModalTab('revenue');
    setFinancialModal({ open: true, editRevenue: entry, defaultTab: 'revenue' });
  };

  const openEditCost = (entry: CostEntry) => {
    setCostItems([{
      id: entry.id,
      category: entry.category,
      planned: entry.planned,
      actual: entry.actual,
      notes: entry.notes,
      resourceId: entry.resourceId || state.resources[0]?.id || 0,
      utilization: entry.utilization || 100,
      startDate: entry.startDate || '',
      endDate: entry.endDate || '',
      hoursPerMonth: entry.hoursPerMonth || 0,
    }]);
    setRevenueForm(prev => ({ ...prev, featureId: entry.featureId, month: entry.month }));
    setPeriodStart(new Date(entry.year, entry.month, 1));
    setPeriodEnd(new Date(entry.year, entry.month + 1, 0));
    setModalTab('cost');
    setFinancialModal({ open: true, editCost: entry, defaultTab: 'cost' });
  };

  // Keep feature in sync
  const syncFeatureAndMonth = (featureId: number, month: number) => {
    setRevenueForm(prev => ({ ...prev, featureId, month }));
    setCostForm(prev => ({ ...prev, featureId, month }));
  };

  const calculateResourceCostForItem = (item: CostFormItem) => {
    if (item.category !== 'Resources' || !item.resourceId) return 0;
    const resource = state.resources.find(r => r.id === item.resourceId);
    if (!resource) return 0;
    if (item.startDate && item.endDate) {
      const s = new Date(item.startDate), e = new Date(item.endDate);
      const months = Math.max(1, Math.ceil((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24 * 30)));
      return resource.costRate * (item.utilization / 100) * months;
    }
    if (item.hoursPerMonth > 0) {
      return resource.costRate * (item.hoursPerMonth / (resource.capacity * 4.33));
    }
    return 0;
  };

  // ── Save ──────────────────────────────────────────────────

  const saveFinancialEntry = () => {
    const month = periodStart ? periodStart.getMonth() : revenueForm.month;
    const year = periodStart ? periodStart.getFullYear() : selectedYear;

    // Save revenue if values are entered or we're editing a revenue entry
    const hasRevenueData = revenueForm.planned > 0 || revenueForm.actual > 0;
    const isEditingRevenue = !!financialModal?.editRevenue;

    if (hasRevenueData || isEditingRevenue) {
      if (financialModal?.editRevenue) {
        setRevenueEntries(prev => prev.map(e => e.id === financialModal.editRevenue!.id
          ? { ...e, featureId: revenueForm.featureId, month, planned: revenueForm.planned, actual: revenueForm.actual, notes: revenueForm.notes }
          : e
        ));
      } else if (hasRevenueData) {
        setRevenueEntries(prev => [...prev, {
          id: Date.now(),
          featureId: revenueForm.featureId,
          month,
          year,
          planned: revenueForm.planned,
          actual: revenueForm.actual,
          notes: revenueForm.notes,
        }]);
      }
    }

    // Save all cost items
    const isEditingCost = !!financialModal?.editCost;

    costItems.forEach((item, idx) => {
      const hasCostData = item.planned > 0 || item.actual > 0 || (item.category === 'Resources' && item.resourceId > 0);

      if (hasCostData || (isEditingCost && idx === 0)) {
        const isResource = item.category === 'Resources';
        const calculatedCost = isResource ? calculateResourceCostForItem(item) : undefined;
        const entry: CostEntry = {
          id: (isEditingCost && idx === 0) ? financialModal!.editCost!.id : Date.now() + idx + 1,
          featureId: revenueForm.featureId,
          month,
          year,
          category: item.category,
          planned: isResource ? (calculatedCost || 0) : item.planned,
          actual: item.actual,
          notes: item.notes,
          ...(isResource && {
            resourceId: item.resourceId,
            utilization: item.utilization,
            startDate: item.startDate,
            endDate: item.endDate,
            hoursPerMonth: item.hoursPerMonth,
            calculatedCost,
          }),
        };

        if (isEditingCost && idx === 0) {
          setCostEntries(prev => prev.map(e => e.id === financialModal!.editCost!.id ? entry : e));
        } else if (hasCostData) {
          setCostEntries(prev => [...prev, entry]);
        }
      }
    });

    setFinancialModal(null);
  };

  // ── Delete ──────────────────────────────────────────────

  const handleDelete = () => {
    if (!deleteConfirm) return;
    if (deleteConfirm.type === 'revenue') {
      setRevenueEntries(prev => prev.filter(e => e.id !== deleteConfirm.id));
    } else {
      setCostEntries(prev => prev.filter(e => e.id !== deleteConfirm.id));
    }
    setDeleteConfirm(null);
  };

  const getFeatureName = (featureId: number) => {
    return productFeatures.find(f => f.id === featureId)?.name || 'Unknown';
  };

  // ── Summary Card Component ─────────────────────────────

  const SummaryCard = ({ title, value, icon, colorClass, subtitle }: { title: string; value: string; icon: React.ReactNode; colorClass: string; subtitle?: string }) => (
    <div className="bg-card rounded-xl p-5 border border-border shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-medium text-muted-foreground">{title}</span>
        <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center", colorClass)}>
          {icon}
        </div>
      </div>
      <div className="text-2xl font-bold text-foreground">{value}</div>
      {subtitle && <div className="text-xs text-muted-foreground mt-1">{subtitle}</div>}
    </div>
  );

  // ── Main Render ─────────────────────────────────────────

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <button onClick={onClose} className="p-2 hover:bg-secondary rounded-lg transition-colors">
            <BackIcon className="w-5 h-5" />
          </button>
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-foreground">{feature.name}</h2>
            <p className="text-sm text-muted-foreground">{product?.name} • {t('financialPlanning')}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Select value={String(selectedYear)} onValueChange={v => setSelectedYear(parseInt(v))}>
            <SelectTrigger className="w-28 h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              {[2024, 2025, 2026, 2027].map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button onClick={() => openAddFinancialEntry('revenue')} className="bg-primary hover:bg-primary/90">
            <Plus className="w-4 h-4 me-2" />{t('addFinancialEntry')}
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <SummaryCard
          title={t('totalRevenue')}
          value={formatCurrency(totals.revenue.planned, language)}
          icon={<CircleDollarSign className="w-5 h-5 text-emerald-600" />}
          colorClass="bg-emerald-50 dark:bg-emerald-900/20"
          subtitle={`${t('actual')}: ${formatCurrency(totals.revenue.actual, language)}`}
        />
        <SummaryCard
          title={t('totalCost')}
          value={formatCurrency(totals.cost.planned, language)}
          icon={<Wallet className="w-5 h-5 text-red-500" />}
          colorClass="bg-red-50 dark:bg-red-900/20"
          subtitle={`${t('actual')}: ${formatCurrency(totals.cost.actual, language)}`}
        />
        <SummaryCard
          title={t('netProfit')}
          value={formatCurrency(totals.profit.planned, language)}
          icon={<TrendingUp className="w-5 h-5 text-blue-500" />}
          colorClass="bg-blue-50 dark:bg-blue-900/20"
          subtitle={`${t('actual')}: ${formatCurrency(totals.profit.actual, language)}`}
        />
        <SummaryCard
          title={t('targetVsAchieved')}
          value={`${totals.revenue.achievement.toFixed(1)}%`}
          icon={<Target className="w-5 h-5 text-violet-500" />}
          colorClass="bg-violet-50 dark:bg-violet-900/20"
          subtitle={t('achievementRate')}
        />
      </div>

      {/* Tabs */}
      <Tabs value={tab} onValueChange={setTab} className="w-full">
        <div className="bg-card rounded-xl shadow-sm border border-border overflow-hidden">
          <TabsList className="w-full justify-start border-b rounded-none h-auto p-0 bg-transparent overflow-x-auto flex-nowrap">
            {[
              { value: 'summary', icon: <FileText className="w-4 h-4 me-1.5" />, label: t('summary') },
              { value: 'financials', icon: <DollarSign className="w-4 h-4 me-1.5" />, label: t('financials') },
              { value: 'resources', icon: <Users className="w-4 h-4 me-1.5" />, label: t('resources') },
              { value: 'forecast', icon: <TrendingUp className="w-4 h-4 me-1.5" />, label: t('forecast') },
            ].map(tabItem => (
              <TabsTrigger key={tabItem.value} value={tabItem.value}
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-5 py-3 text-sm whitespace-nowrap">
                {tabItem.icon}{tabItem.label}
              </TabsTrigger>
            ))}
          </TabsList>

          <div className="p-5 sm:p-6">
            {/* SUMMARY TAB */}
            <TabsContent value="summary" className="mt-0 space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-bold text-foreground">{t('featureProfile')}</h3>
              </div>
              <div className="bg-card rounded-xl border border-border p-5">
                <label className="block text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                  <span className="text-lg">📝</span>{t('description')}
                </label>
                <Textarea value={featureProfile.description} onChange={e => setFeatureProfile({ ...featureProfile, description: e.target.value })}
                  placeholder={t('featureDescPlaceholder')} rows={3} />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[
                  { key: 'targetUser', icon: '👥', field: 'targetUser' as const, placeholder: 'targetUserPlaceholder' },
                  { key: 'customerSegmentation', icon: '🎯', field: 'customerSegmentation' as const, placeholder: 'customerSegmentationPlaceholder' },
                  { key: 'valueProposition', icon: '💎', field: 'valueProposition' as const, placeholder: 'valuePropositionPlaceholder' },
                  { key: 'businessModel', icon: '💰', field: 'businessModel' as const, placeholder: 'businessModelPlaceholder' },
                ].map(f => (
                  <div key={f.key} className="rounded-xl border border-border p-5 bg-card">
                    <label className="block text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                      <span className="text-lg">{f.icon}</span>{t(f.key as any)}
                    </label>
                    <Textarea value={featureProfile[f.field]} onChange={e => setFeatureProfile({ ...featureProfile, [f.field]: e.target.value })}
                      placeholder={t(f.placeholder as any)} rows={3} />
                  </div>
                ))}
              </div>
              <div className="rounded-xl border border-border p-5 bg-card">
                <label className="block text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                  <span className="text-lg">⚠️</span>{t('risksAndChallenges')}
                </label>
                <Textarea value={featureProfile.risksAndChallenges} onChange={e => setFeatureProfile({ ...featureProfile, risksAndChallenges: e.target.value })}
                  placeholder={t('risksPlaceholder')} rows={3} />
              </div>

              {/* Quick Financial Summary */}
              <div className="rounded-xl border border-border p-5 bg-card">
                <h4 className="text-base font-semibold text-foreground mb-4">{t('quickFinancialSummary')}</h4>
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center p-3 rounded-lg bg-emerald-50 dark:bg-emerald-900/10">
                    <div className="text-xs text-muted-foreground mb-1">{t('totalRevenue')}</div>
                    <div className="text-lg font-bold text-emerald-600">{formatCurrency(totals.revenue.planned, language)}</div>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-red-50 dark:bg-red-900/10">
                    <div className="text-xs text-muted-foreground mb-1">{t('totalCost')}</div>
                    <div className="text-lg font-bold text-red-500">{formatCurrency(totals.cost.planned, language)}</div>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-blue-50 dark:bg-blue-900/10">
                    <div className="text-xs text-muted-foreground mb-1">{t('netProfit')}</div>
                    <div className={cn("text-lg font-bold", totals.profit.planned >= 0 ? 'text-blue-600' : 'text-red-500')}>
                      {formatCurrency(totals.profit.planned, language)}
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* ── FINANCIALS TAB ──────────────────────────── */}
            <TabsContent value="financials" className="mt-0 space-y-8">
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
                <div>
                  <h4 className="font-semibold text-foreground text-lg">{t('financials')} — {selectedYear}</h4>
                  <p className="text-sm text-muted-foreground mt-0.5">{t('revenueTabDesc')}</p>
                </div>
                <Button onClick={() => openAddFinancialEntry('revenue')} className="bg-primary hover:bg-primary/90">
                  <Plus className="w-4 h-4 me-2" />{t('addFinancialEntry')}
                </Button>
              </div>

              {/* Charts */}
              {chartData.length > 0 && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {chartData.some(d => d.revenuePlanned > 0 || d.revenueActual > 0) && (
                    <div className="bg-card rounded-xl border border-border p-4">
                      <h5 className="text-sm font-semibold text-foreground mb-3">{t('plannedVsActualRevenue')}</h5>
                      <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={chartData} barGap={2}>
                            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                            <XAxis dataKey="month" fontSize={12} stroke="hsl(var(--muted-foreground))" />
                            <YAxis fontSize={12} stroke="hsl(var(--muted-foreground))" />
                            <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid hsl(var(--border))', background: 'hsl(var(--card))' }} />
                            <Legend />
                            <Bar dataKey="revenuePlanned" name={t('planned')} fill="#3B82F6" radius={[4,4,0,0]} />
                            <Bar dataKey="revenueActual" name={t('actual')} fill="#22C55E" radius={[4,4,0,0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  )}
                  {chartData.some(d => d.costPlanned > 0 || d.costActual > 0) && (
                    <div className="bg-card rounded-xl border border-border p-4">
                      <h5 className="text-sm font-semibold text-foreground mb-3">{t('monthlyCostBreakdown')}</h5>
                      <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={chartData} barGap={2}>
                            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                            <XAxis dataKey="month" fontSize={12} stroke="hsl(var(--muted-foreground))" />
                            <YAxis fontSize={12} stroke="hsl(var(--muted-foreground))" />
                            <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid hsl(var(--border))', background: 'hsl(var(--card))' }} />
                            <Legend />
                            <Bar dataKey="costPlanned" name={t('planned')} fill="#EF4444" radius={[4,4,0,0]} />
                            <Bar dataKey="costActual" name={t('actual')} fill="#F97316" radius={[4,4,0,0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Unified Financial Table */}
              {(() => {
                const allEntries = [
                  ...revenueEntries.map(e => ({ ...e, entryType: 'revenue' as const, category: '—', displayPlanned: e.planned, displayActual: e.actual })),
                  ...costEntries.map(e => ({ ...e, entryType: 'cost' as const, displayPlanned: e.calculatedCost || e.planned, displayActual: e.actual })),
                ].sort((a, b) => a.month - b.month);

                return allEntries.length > 0 ? (
                  <div className="overflow-x-auto rounded-xl border border-border">
                    <table className="w-full min-w-[800px]">
                      <thead className="bg-secondary/50">
                        <tr>
                          <th className="px-4 py-3 text-start text-xs font-semibold text-muted-foreground uppercase">{t('month')}</th>
                          <th className="px-4 py-3 text-start text-xs font-semibold text-muted-foreground uppercase">{t('feature')}</th>
                          <th className="px-4 py-3 text-center text-xs font-semibold text-muted-foreground uppercase">Type</th>
                          <th className="px-4 py-3 text-start text-xs font-semibold text-muted-foreground uppercase">{t('costCategory')}</th>
                          <th className="px-4 py-3 text-end text-xs font-semibold text-muted-foreground uppercase">{t('planned')}</th>
                          <th className="px-4 py-3 text-end text-xs font-semibold text-muted-foreground uppercase">{t('actual')}</th>
                          <th className="px-4 py-3 text-end text-xs font-semibold text-muted-foreground uppercase">{t('variance')}</th>
                          <th className="px-4 py-3 text-center text-xs font-semibold text-muted-foreground uppercase">{t('actions')}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {allEntries.map(entry => {
                          const isRevenue = entry.entryType === 'revenue';
                          const variance = entry.displayActual - entry.displayPlanned;
                          const variancePositive = isRevenue ? variance >= 0 : variance <= 0;
                          return (
                            <tr key={`${entry.entryType}-${entry.id}`} className="hover:bg-secondary/30 transition-colors">
                              <td className="px-4 py-3 text-sm text-foreground">{t(MONTHS_SHORT_KEYS[entry.month])} {entry.year}</td>
                              <td className="px-4 py-3 text-sm font-medium text-foreground">{getFeatureName(entry.featureId)}</td>
                              <td className="px-4 py-3 text-center">
                                <span className={cn("px-2 py-1 rounded-md text-xs font-medium",
                                  isRevenue ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                                )}>
                                  {isRevenue ? t('revenue') : t('cost')}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-sm text-muted-foreground">
                                {isRevenue ? '—' : (
                                  <span className="px-2 py-1 rounded-md text-xs font-medium bg-secondary text-secondary-foreground">{entry.category}</span>
                                )}
                              </td>
                              <td className={cn("px-4 py-3 text-end text-sm font-semibold", isRevenue ? 'text-blue-600' : 'text-red-500')}>
                                {formatCurrency(entry.displayPlanned, language)}
                              </td>
                              <td className={cn("px-4 py-3 text-end text-sm font-semibold", isRevenue ? 'text-emerald-600' : 'text-orange-500')}>
                                {formatCurrency(entry.displayActual, language)}
                              </td>
                              <td className={cn("px-4 py-3 text-end text-sm font-semibold", variancePositive ? 'text-emerald-600' : 'text-red-500')}>
                                {variance >= 0 ? '+' : ''}{formatCurrency(variance, language)}
                              </td>
                              <td className="px-4 py-3 text-center">
                                <div className="flex items-center justify-center gap-1">
                                  <Button size="sm" variant="outline" className="h-7 w-7 p-0"
                                    onClick={() => isRevenue ? openEditRevenue(entry as any) : openEditCost(entry as any)}>
                                    <Edit className="w-3 h-3" />
                                  </Button>
                                  <Button size="sm" variant="outline" className="h-7 w-7 p-0 text-destructive hover:bg-destructive hover:text-destructive-foreground"
                                    onClick={() => setDeleteConfirm({ type: entry.entryType, id: entry.id })}>
                                    <Trash2 className="w-3 h-3" />
                                  </Button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                      <tfoot className="bg-secondary/30">
                        <tr className="font-bold">
                          <td className="px-4 py-3 text-sm" colSpan={4}>{t('total')}</td>
                          <td className="px-4 py-3 text-end text-sm text-foreground">
                            <div className="text-emerald-600">{formatCurrency(totals.revenue.planned, language)}</div>
                            <div className="text-red-500 text-xs mt-0.5">-{formatCurrency(totals.cost.planned, language)}</div>
                          </td>
                          <td className="px-4 py-3 text-end text-sm text-foreground">
                            <div className="text-emerald-600">{formatCurrency(totals.revenue.actual, language)}</div>
                            <div className="text-orange-500 text-xs mt-0.5">-{formatCurrency(totals.cost.actual, language)}</div>
                          </td>
                          <td className={cn("px-4 py-3 text-end text-sm font-bold", totals.profit.planned >= 0 ? 'text-emerald-600' : 'text-red-500')}>
                            {t('netProfit')}: {formatCurrency(totals.profit.planned, language)}
                          </td>
                          <td className="px-4 py-3"></td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-16 bg-secondary/20 rounded-xl border-2 border-dashed border-border">
                    <DollarSign className="w-12 h-12 text-muted-foreground/40 mx-auto mb-4" />
                    <h4 className="text-base font-semibold text-foreground mb-2">{t('emptyRevenueTitle')}</h4>
                    <p className="text-sm text-muted-foreground mb-5 max-w-md mx-auto">{t('emptyRevenueDesc')}</p>
                    <Button onClick={() => openAddFinancialEntry('revenue')} className="bg-primary hover:bg-primary/90">
                      <Plus className="w-4 h-4 me-2" />{t('addFinancialEntry')}
                    </Button>
                  </div>
                );
              })()}
            </TabsContent>

            {/* RESOURCES TAB */}
            <TabsContent value="resources" className="mt-0 space-y-4">
              <h4 className="font-semibold text-foreground text-lg">{t('resourceAssignments')}</h4>
              {costEntries.filter(c => c.category === 'Resources').length > 0 ? (
                <div className="overflow-x-auto rounded-xl border border-border">
                  <table className="w-full min-w-[600px]">
                    <thead className="bg-secondary/50">
                      <tr>
                        <th className="px-4 py-3 text-start text-xs font-semibold text-muted-foreground uppercase">{t('resource')}</th>
                        <th className="px-4 py-3 text-start text-xs font-semibold text-muted-foreground uppercase">{t('feature')}</th>
                        <th className="px-4 py-3 text-end text-xs font-semibold text-muted-foreground uppercase">{t('utilization')}</th>
                        <th className="px-4 py-3 text-start text-xs font-semibold text-muted-foreground uppercase">{t('period')}</th>
                        <th className="px-4 py-3 text-end text-xs font-semibold text-muted-foreground uppercase">{t('estimatedCost')}</th>
                        <th className="px-4 py-3 text-end text-xs font-semibold text-muted-foreground uppercase">{t('actualCost')}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {costEntries.filter(c => c.category === 'Resources').map(entry => {
                        const resource = state.resources.find(r => r.id === entry.resourceId);
                        return (
                          <tr key={entry.id} className="hover:bg-secondary/30">
                            <td className="px-4 py-3 text-sm font-medium text-foreground">{resource?.name || 'N/A'} <span className="text-muted-foreground text-xs">({resource?.role})</span></td>
                            <td className="px-4 py-3 text-sm text-foreground">{getFeatureName(entry.featureId)}</td>
                            <td className="px-4 py-3 text-end text-sm">{entry.utilization}%</td>
                            <td className="px-4 py-3 text-sm text-muted-foreground">{entry.startDate || '—'} → {entry.endDate || '—'}</td>
                            <td className="px-4 py-3 text-end text-sm font-semibold text-primary">{formatCurrency(entry.calculatedCost || entry.planned, language)}</td>
                            <td className="px-4 py-3 text-end text-sm font-semibold text-foreground">{formatCurrency(entry.actual, language)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-12 bg-secondary/20 rounded-xl border-2 border-dashed border-border">
                  <Users className="w-12 h-12 text-muted-foreground/40 mx-auto mb-4" />
                  <p className="text-sm text-muted-foreground mb-4">{t('noResourceCosts')}</p>
                  <Button variant="outline" onClick={() => openAddFinancialEntry('cost')}>
                    {t('addResourceCost')}
                  </Button>
                </div>
              )}
            </TabsContent>

            {/* FORECAST TAB */}
            <TabsContent value="forecast" className="mt-0">
              <div className="text-center py-12 bg-secondary/20 rounded-xl border-2 border-dashed border-border">
                <TrendingUp className="w-12 h-12 text-muted-foreground/40 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-foreground mb-2">{t('forecast')}</h3>
                <p className="text-sm text-muted-foreground">{t('forecastComingSoon')}</p>
              </div>
            </TabsContent>
          </div>
        </div>
      </Tabs>

      {/* ── UNIFIED FINANCIAL ENTRY MODAL ──────────────────── */}
      <Dialog open={!!financialModal?.open} onOpenChange={() => setFinancialModal(null)}>
        <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg">
              <DollarSign className="w-5 h-5 text-primary" />
              {(financialModal?.editRevenue || financialModal?.editCost) ? t('editFinancialEntry') : t('addFinancialEntry')}
            </DialogTitle>
            <DialogDescription>{feature.name} • {selectedYear}</DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-3">
            {/* Section 1: Feature Information */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <span className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">1</span>
                <h4 className="text-sm font-semibold text-foreground">{t('featureInformation')}</h4>
              </div>
              <Select
                value={String(revenueForm.featureId)}
                onValueChange={v => {
                  const id = parseInt(v);
                  syncFeatureAndMonth(id, revenueForm.month);
                }}
              >
                <SelectTrigger><SelectValue placeholder={t('selectFeature')} /></SelectTrigger>
                <SelectContent>
                  {productFeatures.map(f => <SelectItem key={f.id} value={String(f.id)}>{f.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {/* Section 2: Financial Period - Date Range */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <span className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center text-xs font-bold text-blue-700 dark:text-blue-400">2</span>
                <h4 className="text-sm font-semibold text-foreground">{t('financialPeriod')}</h4>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-foreground mb-1.5 block">{t('startDate')}</label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !periodStart && "text-muted-foreground")}>
                        <CalendarIcon className="me-2 h-4 w-4" />
                        {periodStart ? format(periodStart, "MMM dd, yyyy") : <span>Pick start date</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar mode="single" selected={periodStart} onSelect={setPeriodStart} initialFocus className={cn("p-3 pointer-events-auto")} />
                    </PopoverContent>
                  </Popover>
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground mb-1.5 block">{t('endDate')}</label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !periodEnd && "text-muted-foreground")}>
                        <CalendarIcon className="me-2 h-4 w-4" />
                        {periodEnd ? format(periodEnd, "MMM dd, yyyy") : <span>Pick end date</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar mode="single" selected={periodEnd} onSelect={setPeriodEnd} initialFocus className={cn("p-3 pointer-events-auto")} />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
              {periodStart && periodEnd && (
                <div className="mt-2 text-xs text-muted-foreground text-center">
                  {t('duration')}: {Math.max(1, Math.ceil((periodEnd.getTime() - periodStart.getTime()) / (1000 * 60 * 60 * 24)))} {t('days')}
                </div>
              )}
            </div>

            {/* Section 3: Financials - Revenue */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <span className="w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-900/20 flex items-center justify-center text-xs font-bold text-emerald-700 dark:text-emerald-400">3</span>
                <h4 className="text-sm font-semibold text-foreground">{t('revenue')}</h4>
              </div>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-blue-600 mb-1.5 block">{t('plannedRevenue')} (SAR)</label>
                    <Input type="number" value={revenueForm.planned || ''} placeholder="0"
                      onChange={e => setRevenueForm({ ...revenueForm, planned: parseFloat(e.target.value) || 0 })} />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-emerald-600 mb-1.5 block">{t('actualRevenue')} (SAR)</label>
                    <Input type="number" value={revenueForm.actual || ''} placeholder="0"
                      onChange={e => setRevenueForm({ ...revenueForm, actual: parseFloat(e.target.value) || 0 })} />
                  </div>
                </div>

                {(() => {
                  const variance = revenueForm.actual - revenueForm.planned;
                  return (revenueForm.planned > 0 || revenueForm.actual > 0) ? (
                    <div className={cn("rounded-lg p-3 text-center border", variance >= 0 ? "bg-emerald-50 dark:bg-emerald-900/10 border-emerald-200 dark:border-emerald-800" : "bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-800")}>
                      <span className="text-xs text-muted-foreground">{t('variance')}: </span>
                      <span className={cn("font-bold", variance >= 0 ? 'text-emerald-600' : 'text-red-500')}>
                        {variance >= 0 ? '+' : ''}{formatCurrency(variance, language)}
                      </span>
                    </div>
                  ) : null;
                })()}

                <div>
                  <label className="text-sm font-medium text-muted-foreground mb-1.5 block">{t('notesComments')} ({t('optional')})</label>
                  <Textarea value={revenueForm.notes} onChange={e => setRevenueForm({ ...revenueForm, notes: e.target.value })}
                    placeholder={t('notesPlaceholder')} rows={2} />
                </div>
              </div>
            </div>

            {/* Separator */}
            <div className="border-t border-border" />

            {/* Section 4: Financials - Cost Items (Multiple) */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center text-xs font-bold text-red-700 dark:text-red-400">4</span>
                  <h4 className="text-sm font-semibold text-foreground">{t('cost')} ({costItems.length})</h4>
                </div>
                <Button type="button" variant="outline" size="sm" onClick={() => setCostItems(prev => [...prev, createEmptyCostItem()])}>
                  <Plus className="w-3 h-3 me-1" /> {t('addCostEntry')}
                </Button>
              </div>

              {/* Cost items table */}
              <div className="rounded-lg border border-border overflow-hidden">
                {/* Table header */}
                <div className="grid grid-cols-[1fr_1fr_1fr_1fr_auto] gap-2 px-3 py-2 bg-secondary/50 text-xs font-semibold text-muted-foreground uppercase">
                  <span>{t('costCategory')}</span>
                  <span>{t('planned')} (SAR)</span>
                  <span>{t('actual')} (SAR)</span>
                  <span>{t('notesComments')}</span>
                  <span className="w-7"></span>
                </div>

                {/* Cost item rows */}
                {costItems.map((item, idx) => (
                  <CostRow
                    key={item.id}
                    item={item}
                    idx={idx}
                    canRemove={costItems.length > 1}
                    onUpdate={(updates) => setCostItems(prev => prev.map((ci, i) => i === idx ? { ...ci, ...updates } : ci))}
                    onRemove={() => { if (costItems.length > 1) setCostItems(prev => prev.filter((_, i) => i !== idx)); }}
                    calculateCost={calculateResourceCostForItem}
                    resources={state.resources}
                    language={language}
                    t={t}
                    formatCurrency={formatCurrency}
                  />
                ))}
              </div>
            </div>
          </div>

          <DialogFooter className="sticky bottom-0 bg-card pt-4 border-t border-border">
            <Button variant="outline" onClick={() => setFinancialModal(null)}>{t('cancel')}</Button>
            <Button onClick={saveFinancialEntry} className="bg-primary hover:bg-primary/90">
              <Save className="w-4 h-4 me-2" />{t('saveEntry')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── DELETE CONFIRM ───────────────────────────────── */}
      <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{t('confirmDelete')}</DialogTitle>
            <DialogDescription>{t('confirmDeleteItemDesc')}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>{t('cancel')}</Button>
            <Button variant="destructive" onClick={handleDelete}>{t('delete')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default FeatureFinancialPlanning;

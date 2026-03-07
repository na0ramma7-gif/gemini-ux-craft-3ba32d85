import { useState, useMemo } from 'react';
import { useApp } from '@/context/AppContext';
import { Feature } from '@/types';
import FeatureForecast from '@/components/FeatureForecast';
import { formatCurrency, cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
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
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  ArrowLeft,
  ArrowRight,
  Plus,
  Trash2,
  Edit,
  DollarSign,
  Users,
  TrendingUp,
  FileText,
  Save,
  ChevronDown,
  ChevronRight,
  UserPlus,
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

// ── Data Types ──────────────────────────────────────────────

interface RevenueEntry {
  id: number;
  featureId: number;
  month: number; // 0-11
  year: number;
  planned: number;
  actual: number;
}

interface CostEntry {
  id: number;
  featureId: number;
  month: number;
  year: number;
  category: string;
  planned: number;
  actual: number;
  resourceId?: number;
  utilization?: number;
  calculatedCost?: number;
}

interface ResourceAllocation {
  id: number;
  resourceId: number;
  utilization: number; // percent
}

interface FeatureFinancialPlanningProps {
  feature: Feature;
  onClose: () => void;
}

const COST_CATEGORIES = ['Infrastructure', 'Licensing', 'Marketing', 'Resources', 'Other'];
const MONTHS_SHORT_KEYS = ['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'] as const;

// ── Component ───────────────────────────────────────────────

const FeatureFinancialPlanning = ({ feature, onClose }: FeatureFinancialPlanningProps) => {
  const { state, t, language, isRTL } = useApp();
  const [tab, setTab] = useState('summary');
  const [selectedYear, setSelectedYear] = useState(2025);

  // Data stores
  const [revenueEntries, setRevenueEntries] = useState<RevenueEntry[]>([]);
  const [costEntries, setCostEntries] = useState<CostEntry[]>([]);
  const [resourceAllocations, setResourceAllocations] = useState<ResourceAllocation[]>([]);

  // Feature Profile
  const [featureProfile, setFeatureProfile] = useState({
    description: feature.description || '',
    targetUser: feature.targetUser || '',
    customerSegmentation: feature.customerSegmentation || '',
    valueProposition: feature.valueProposition || '',
    businessModel: feature.businessModel || '',
    risksAndChallenges: feature.risks || '',
  });

  // Expanded months in financials tab
  const [expandedMonths, setExpandedMonths] = useState<string[]>([]);

  // Financial entry modal
  const [modalOpen, setModalOpen] = useState(false);
  const [modalFeatureId, setModalFeatureId] = useState(feature.id);
  const [modalStartDate, setModalStartDate] = useState('');
  const [modalEndDate, setModalEndDate] = useState('');
  const [modalRevenuePlanned, setModalRevenuePlanned] = useState(0);
  const [modalRevenueActual, setModalRevenueActual] = useState(0);
  const [modalCostCategories, setModalCostCategories] = useState<Record<string, { planned: number; actual: number }>>({});
  const [expandedCostCategories, setExpandedCostCategories] = useState<string[]>([]);
  const [editingEntryId, setEditingEntryId] = useState<number | null>(null);
  const [editingType, setEditingType] = useState<'revenue' | 'cost' | null>(null);
  // Non-resource cost table entries per category
  const [modalCostItems, setModalCostItems] = useState<Record<string, { name: string; planned: number; actual: number; notes: string }[]>>({});
  // Modal resource allocations
  const [modalResourceAllocations, setModalResourceAllocations] = useState<{ resourceId: number; utilization: number }[]>([]);
  const [modalResourceSelectorOpen, setModalResourceSelectorOpen] = useState(false);
  const [modalSelectedResourceIds, setModalSelectedResourceIds] = useState<number[]>([]);

  // Resource selector dialog
  const [resourceSelectorOpen, setResourceSelectorOpen] = useState(false);
  const [selectedResourceIds, setSelectedResourceIds] = useState<number[]>([]);

  // Delete confirm
  const [deleteConfirm, setDeleteConfirm] = useState<{ type: 'revenue' | 'cost'; id: number } | null>(null);

  const product = state.products.find(p => p.id === feature.productId);
  const productFeatures = state.features.filter(f => f.productId === feature.productId);
  const BackIcon = isRTL ? ArrowRight : ArrowLeft;

  // ── Monthly aggregation ───────────────────────────────────

  const monthlyData = useMemo(() => {
    const months: Record<string, {
      key: string;
      monthIdx: number;
      year: number;
      label: string;
      revenue: number;
      cost: number;
      profit: number;
      revenueDetails: { featureId: number; featureName: string; planned: number; actual: number }[];
      costDetails: Record<string, { planned: number; actual: number }>;
    }> = {};

    // Aggregate revenue
    revenueEntries.filter(e => e.year === selectedYear).forEach(e => {
      const key = `${e.year}-${e.month}`;
      if (!months[key]) {
        months[key] = {
          key,
          monthIdx: e.month,
          year: e.year,
          label: `${t(MONTHS_SHORT_KEYS[e.month])} ${e.year}`,
          revenue: 0,
          cost: 0,
          profit: 0,
          revenueDetails: [],
          costDetails: {},
        };
      }
      months[key].revenue += e.planned;
      const feat = productFeatures.find(f => f.id === e.featureId);
      months[key].revenueDetails.push({
        featureId: e.featureId,
        featureName: feat?.name || 'Unknown',
        planned: e.planned,
        actual: e.actual,
      });
    });

    // Aggregate costs
    costEntries.filter(e => e.year === selectedYear).forEach(e => {
      const key = `${e.year}-${e.month}`;
      if (!months[key]) {
        months[key] = {
          key,
          monthIdx: e.month,
          year: e.year,
          label: `${t(MONTHS_SHORT_KEYS[e.month])} ${e.year}`,
          revenue: 0,
          cost: 0,
          profit: 0,
          revenueDetails: [],
          costDetails: {},
        };
      }
      const amount = e.calculatedCost || e.planned;
      months[key].cost += amount;
      if (!months[key].costDetails[e.category]) {
        months[key].costDetails[e.category] = { planned: 0, actual: 0 };
      }
      months[key].costDetails[e.category].planned += amount;
      months[key].costDetails[e.category].actual += e.actual;
    });

    // Calculate profit
    Object.values(months).forEach(m => {
      m.profit = m.revenue - m.cost;
    });

    return Object.values(months).sort((a, b) => a.monthIdx - b.monthIdx);
  }, [revenueEntries, costEntries, selectedYear, productFeatures, t]);

  // Overall totals
  const totals = useMemo(() => {
    const rev = monthlyData.reduce((s, m) => s + m.revenue, 0);
    const cost = monthlyData.reduce((s, m) => s + m.cost, 0);
    return { revenue: rev, cost, profit: rev - cost };
  }, [monthlyData]);

  // Chart data
  const chartData = useMemo(() => {
    return monthlyData.map(m => ({
      month: t(MONTHS_SHORT_KEYS[m.monthIdx]),
      revenue: m.revenue,
      cost: m.cost,
      profit: m.profit,
    }));
  }, [monthlyData, t]);

  // ── Toggle month expansion ────────────────────────────────

  const toggleMonth = (key: string) => {
    setExpandedMonths(prev =>
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    );
  };

  // ── Modal helpers ─────────────────────────────────────────

  // Compute duration from modal dates
  const modalDuration = useMemo(() => {
    if (!modalStartDate || !modalEndDate) return null;
    const start = new Date(modalStartDate);
    const end = new Date(modalEndDate);
    if (end <= start) return null;
    const diffMs = end.getTime() - start.getTime();
    const days = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    const months = Math.round(days / 30.44);
    return { days, months: months || 1 };
  }, [modalStartDate, modalEndDate]);

  // Modal live summary
  const modalSummary = useMemo(() => {
    const totalCostFromCategories = Object.values(modalCostCategories).reduce((s, v) => s + v.planned, 0);
    const totalCostFromItems = Object.values(modalCostItems).reduce((s, items) => s + items.reduce((si, i) => si + i.planned, 0), 0);
    const totalResourceCost = modalResourceAllocations.reduce((s, a) => {
      const r = state.resources.find(res => res.id === a.resourceId);
      return s + (r ? r.costRate * (a.utilization / 100) : 0);
    }, 0);
    const totalCost = totalCostFromCategories + totalCostFromItems + totalResourceCost;
    const profit = modalRevenuePlanned - totalCost;
    const margin = modalRevenuePlanned > 0 ? (profit / modalRevenuePlanned) * 100 : 0;
    return { revenue: modalRevenuePlanned, cost: totalCost, profit, margin, resourceCost: totalResourceCost };
  }, [modalRevenuePlanned, modalCostCategories, modalCostItems, modalResourceAllocations, state.resources]);

  const revenueVariance = modalRevenueActual - modalRevenuePlanned;

  const openAddModal = () => {
    const now = new Date();
    const firstDay = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    const lastDayStr = `${lastDay.getFullYear()}-${String(lastDay.getMonth() + 1).padStart(2, '0')}-${String(lastDay.getDate()).padStart(2, '0')}`;
    setModalFeatureId(feature.id);
    setModalStartDate(firstDay);
    setModalEndDate(lastDayStr);
    setModalRevenuePlanned(0);
    setModalRevenueActual(0);
    setModalCostCategories({});
    setModalCostItems({});
    setExpandedCostCategories([]);
    setModalResourceAllocations([]);
    setEditingEntryId(null);
    setEditingType(null);
    setModalOpen(true);
  };

  const toggleCostCategory = (cat: string) => {
    setExpandedCostCategories(prev =>
      prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]
    );
    if (!modalCostCategories[cat]) {
      setModalCostCategories(prev => ({ ...prev, [cat]: { planned: 0, actual: 0 } }));
    }
  };

  const saveModal = () => {
    const startD = new Date(modalStartDate);
    const modalMonth = startD.getMonth();
    const year = startD.getFullYear();

    // Save revenue
    if (modalRevenuePlanned > 0 || modalRevenueActual > 0) {
      if (editingType === 'revenue' && editingEntryId) {
        setRevenueEntries(prev => prev.map(e =>
          e.id === editingEntryId
            ? { ...e, featureId: modalFeatureId, month: modalMonth, planned: modalRevenuePlanned, actual: modalRevenueActual }
            : e
        ));
      } else {
        setRevenueEntries(prev => [...prev, {
          id: Date.now(),
          featureId: modalFeatureId,
          month: modalMonth,
          year,
          planned: modalRevenuePlanned,
          actual: modalRevenueActual,
        }]);
      }
    }

    // Save costs by category (from category totals)
    Object.entries(modalCostCategories).forEach(([category, values], idx) => {
      if (values.planned > 0 || values.actual > 0) {
        setCostEntries(prev => [...prev, {
          id: Date.now() + idx + 1,
          featureId: modalFeatureId,
          month: modalMonth,
          year,
          category,
          planned: values.planned,
          actual: values.actual,
        }]);
      }
    });

    // Save cost items per category
    let itemIdx = 100;
    Object.entries(modalCostItems).forEach(([category, items]) => {
      items.forEach(item => {
        if (item.planned > 0 || item.actual > 0) {
          setCostEntries(prev => [...prev, {
            id: Date.now() + itemIdx++,
            featureId: modalFeatureId,
            month: modalMonth,
            year,
            category,
            planned: item.planned,
            actual: item.actual,
          }]);
        }
      });
    });

    // Save resource allocations as cost entries + to main allocations
    modalResourceAllocations.forEach((alloc, idx) => {
      const resource = state.resources.find(r => r.id === alloc.resourceId);
      if (resource) {
        const calculatedCost = resource.costRate * (alloc.utilization / 100);
        if (!resourceAllocations.find(a => a.resourceId === alloc.resourceId)) {
          setResourceAllocations(prev => [...prev, {
            id: Date.now() + 200 + idx,
            resourceId: alloc.resourceId,
            utilization: alloc.utilization,
          }]);
        }
        setCostEntries(prev => [...prev, {
          id: Date.now() + 300 + idx,
          featureId: modalFeatureId,
          month: modalMonth,
          year,
          category: 'Resources',
          planned: calculatedCost,
          actual: 0,
          resourceId: alloc.resourceId,
          utilization: alloc.utilization,
          calculatedCost,
        }]);
      }
    });

    setModalOpen(false);
  };

  // ── Resource allocation ───────────────────────────────────

  const addResourceAllocations = () => {
    const newAllocations = selectedResourceIds
      .filter(rid => !resourceAllocations.find(a => a.resourceId === rid))
      .map((rid, idx) => ({
        id: Date.now() + idx,
        resourceId: rid,
        utilization: 100,
      }));
    setResourceAllocations(prev => [...prev, ...newAllocations]);

    // Also add as cost entries
    newAllocations.forEach(alloc => {
      const resource = state.resources.find(r => r.id === alloc.resourceId);
      if (resource) {
        const calculatedCost = resource.costRate * (alloc.utilization / 100);
        setCostEntries(prev => [...prev, {
          id: Date.now() + alloc.resourceId,
          featureId: feature.id,
          month: new Date().getMonth(),
          year: selectedYear,
          category: 'Resources',
          planned: calculatedCost,
          actual: 0,
          resourceId: alloc.resourceId,
          utilization: alloc.utilization,
          calculatedCost,
        }]);
      }
    });

    setSelectedResourceIds([]);
    setResourceSelectorOpen(false);
  };

  const updateResourceUtilization = (allocId: number, utilization: number) => {
    setResourceAllocations(prev => prev.map(a =>
      a.id === allocId ? { ...a, utilization } : a
    ));

    // Update corresponding cost entry
    const alloc = resourceAllocations.find(a => a.id === allocId);
    if (alloc) {
      const resource = state.resources.find(r => r.id === alloc.resourceId);
      if (resource) {
        const calculatedCost = resource.costRate * (utilization / 100);
        setCostEntries(prev => prev.map(e =>
          e.category === 'Resources' && e.resourceId === alloc.resourceId
            ? { ...e, utilization, planned: calculatedCost, calculatedCost }
            : e
        ));
      }
    }
  };

  const removeResourceAllocation = (allocId: number) => {
    const alloc = resourceAllocations.find(a => a.id === allocId);
    setResourceAllocations(prev => prev.filter(a => a.id !== allocId));
    if (alloc) {
      setCostEntries(prev => prev.filter(e => !(e.category === 'Resources' && e.resourceId === alloc.resourceId)));
    }
  };

  // ── Delete ────────────────────────────────────────────────

  const handleDelete = () => {
    if (!deleteConfirm) return;
    if (deleteConfirm.type === 'revenue') {
      setRevenueEntries(prev => prev.filter(e => e.id !== deleteConfirm.id));
    } else {
      setCostEntries(prev => prev.filter(e => e.id !== deleteConfirm.id));
    }
    setDeleteConfirm(null);
  };

  // ── Summary Card ──────────────────────────────────────────

  const SummaryCard = ({ title, value, colorClass, icon }: { title: string; value: string; colorClass: string; icon: React.ReactNode }) => (
    <div className="bg-card rounded-xl p-5 border border-border shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-medium text-muted-foreground">{title}</span>
        <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center", colorClass)}>
          {icon}
        </div>
      </div>
      <div className="text-2xl font-bold text-foreground">{value}</div>
    </div>
  );

  // ── Main Render ───────────────────────────────────────────

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
          <Button onClick={openAddModal} className="bg-primary hover:bg-primary/90">
            <Plus className="w-4 h-4 me-2" />{t('addFinancialEntry')}
          </Button>
        </div>
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
            {/* ── SUMMARY TAB ──────────────────────────────── */}
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
            </TabsContent>

            {/* ── FINANCIALS TAB — Monthly Summary ─────────── */}
            <TabsContent value="financials" className="mt-0 space-y-6">
              {/* Monthly Dashboard Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <SummaryCard
                  title={t('totalRevenue')}
                  value={formatCurrency(totals.revenue, language)}
                  colorClass="bg-emerald-100 dark:bg-emerald-900/30"
                  icon={<DollarSign className="w-5 h-5 text-emerald-600" />}
                />
                <SummaryCard
                  title={t('totalCost')}
                  value={formatCurrency(totals.cost, language)}
                  colorClass="bg-red-100 dark:bg-red-900/30"
                  icon={<DollarSign className="w-5 h-5 text-red-500" />}
                />
                <SummaryCard
                  title={t('netProfit')}
                  value={formatCurrency(totals.profit, language)}
                  colorClass={totals.profit >= 0 ? "bg-blue-100 dark:bg-blue-900/30" : "bg-red-100 dark:bg-red-900/30"}
                  icon={<TrendingUp className={cn("w-5 h-5", totals.profit >= 0 ? "text-blue-600" : "text-red-500")} />}
                />
              </div>

              {/* Charts */}
              {chartData.length > 0 && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <div className="bg-card rounded-xl border border-border p-4">
                    <h5 className="text-sm font-semibold text-foreground mb-3">{t('plannedVsActualRevenue')}</h5>
                    <div className="h-56">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData} barGap={2}>
                          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                          <XAxis dataKey="month" fontSize={12} stroke="hsl(var(--muted-foreground))" />
                          <YAxis fontSize={12} stroke="hsl(var(--muted-foreground))" />
                          <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid hsl(var(--border))', background: 'hsl(var(--card))' }} />
                          <Legend />
                          <Bar dataKey="revenue" name={t('revenue')} fill="hsl(var(--revenue, 142 71% 45%))" radius={[4,4,0,0]} />
                          <Bar dataKey="cost" name={t('cost')} fill="hsl(var(--cost, 0 84% 60%))" radius={[4,4,0,0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                  <div className="bg-card rounded-xl border border-border p-4">
                    <h5 className="text-sm font-semibold text-foreground mb-3">{t('monthlyCostBreakdown')}</h5>
                    <div className="h-56">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData} barGap={2}>
                          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                          <XAxis dataKey="month" fontSize={12} stroke="hsl(var(--muted-foreground))" />
                          <YAxis fontSize={12} stroke="hsl(var(--muted-foreground))" />
                          <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid hsl(var(--border))', background: 'hsl(var(--card))' }} />
                          <Legend />
                          <Bar dataKey="profit" name={t('netProfit')} fill="hsl(var(--profit, 217 91% 60%))" radius={[4,4,0,0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>
              )}

              {/* Monthly Financial Summary Table */}
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-semibold text-foreground text-lg">{t('monthlyFinancialSummary')}</h4>
                <Button onClick={openAddModal} size="sm" className="bg-primary hover:bg-primary/90">
                  <Plus className="w-4 h-4 me-1" />{t('addFinancialEntry')}
                </Button>
              </div>

              {monthlyData.length > 0 ? (
                <div className="rounded-xl border border-border overflow-hidden">
                  {/* Table Header */}
                  <div className="grid grid-cols-[1fr_1fr_1fr_1fr_auto] gap-0 bg-secondary/50 px-4 py-3">
                    <span className="text-xs font-semibold text-muted-foreground uppercase">{t('month')}</span>
                    <span className="text-xs font-semibold text-muted-foreground uppercase text-end">{t('revenue')}</span>
                    <span className="text-xs font-semibold text-muted-foreground uppercase text-end">{t('cost')}</span>
                    <span className="text-xs font-semibold text-muted-foreground uppercase text-end">{t('netProfit')}</span>
                    <span className="text-xs font-semibold text-muted-foreground uppercase text-center w-20">{t('actions')}</span>
                  </div>

                  {/* Monthly Rows */}
                  {monthlyData.map(month => {
                    const isExpanded = expandedMonths.includes(month.key);
                    return (
                      <div key={month.key} className="border-t border-border">
                        {/* Summary Row */}
                        <div
                          className="grid grid-cols-[1fr_1fr_1fr_1fr_auto] gap-0 px-4 py-3 hover:bg-secondary/30 cursor-pointer transition-colors"
                          onClick={() => toggleMonth(month.key)}
                        >
                          <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                            {isExpanded ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
                            {month.label}
                          </div>
                          <div className="text-sm font-semibold text-emerald-600 text-end">{formatCurrency(month.revenue, language)}</div>
                          <div className="text-sm font-semibold text-red-500 text-end">{formatCurrency(month.cost, language)}</div>
                          <div className={cn("text-sm font-bold text-end", month.profit >= 0 ? "text-blue-600" : "text-red-500")}>
                            {formatCurrency(month.profit, language)}
                          </div>
                          <div className="w-20" />
                        </div>

                        {/* Expanded Details */}
                        {isExpanded && (
                          <div className="bg-secondary/10 px-6 py-4 space-y-4 border-t border-border/50">
                            {/* Revenue Details */}
                            {month.revenueDetails.length > 0 && (
                              <div>
                                <h6 className="text-xs font-semibold text-emerald-600 uppercase mb-2">{t('revenue')}</h6>
                                <div className="rounded-lg border border-border overflow-hidden">
                                  <div className="grid grid-cols-3 gap-0 bg-secondary/30 px-3 py-2">
                                    <span className="text-xs font-semibold text-muted-foreground">{t('feature')}</span>
                                    <span className="text-xs font-semibold text-muted-foreground text-end">{t('planned')}</span>
                                    <span className="text-xs font-semibold text-muted-foreground text-end">{t('actual')}</span>
                                  </div>
                                  {month.revenueDetails.map((rd, idx) => (
                                    <div key={idx} className="grid grid-cols-3 gap-0 px-3 py-2 border-t border-border/50">
                                      <span className="text-sm text-foreground">{rd.featureName}</span>
                                      <span className="text-sm text-end font-medium text-foreground">{formatCurrency(rd.planned, language)}</span>
                                      <span className="text-sm text-end font-medium text-emerald-600">{formatCurrency(rd.actual, language)}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Cost Details by Category */}
                            {Object.keys(month.costDetails).length > 0 && (
                              <div>
                                <h6 className="text-xs font-semibold text-red-500 uppercase mb-2">{t('cost')}</h6>
                                <div className="rounded-lg border border-border overflow-hidden">
                                  <div className="grid grid-cols-3 gap-0 bg-secondary/30 px-3 py-2">
                                    <span className="text-xs font-semibold text-muted-foreground">{t('costCategory')}</span>
                                    <span className="text-xs font-semibold text-muted-foreground text-end">{t('planned')}</span>
                                    <span className="text-xs font-semibold text-muted-foreground text-end">{t('actual')}</span>
                                  </div>
                                  {Object.entries(month.costDetails).map(([cat, vals]) => (
                                    <div key={cat} className="grid grid-cols-3 gap-0 px-3 py-2 border-t border-border/50">
                                      <span className="text-sm text-foreground">{cat}</span>
                                      <span className="text-sm text-end font-medium text-foreground">{formatCurrency(vals.planned, language)}</span>
                                      <span className="text-sm text-end font-medium text-red-500">{formatCurrency(vals.actual, language)}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {/* Totals Footer */}
                  <div className="grid grid-cols-[1fr_1fr_1fr_1fr_auto] gap-0 bg-secondary/30 px-4 py-3 border-t border-border font-bold">
                    <span className="text-sm text-foreground ps-6">{t('total')}</span>
                    <span className="text-sm text-emerald-600 text-end">{formatCurrency(totals.revenue, language)}</span>
                    <span className="text-sm text-red-500 text-end">{formatCurrency(totals.cost, language)}</span>
                    <span className={cn("text-sm text-end", totals.profit >= 0 ? "text-blue-600" : "text-red-500")}>{formatCurrency(totals.profit, language)}</span>
                    <span className="w-20" />
                  </div>
                </div>
              ) : (
                <div className="text-center py-16 bg-secondary/20 rounded-xl border-2 border-dashed border-border">
                  <DollarSign className="w-12 h-12 text-muted-foreground/40 mx-auto mb-4" />
                  <h4 className="text-base font-semibold text-foreground mb-2">{t('emptyRevenueTitle')}</h4>
                  <p className="text-sm text-muted-foreground mb-5 max-w-md mx-auto">{t('emptyRevenueDesc')}</p>
                  <Button onClick={openAddModal} className="bg-primary hover:bg-primary/90">
                    <Plus className="w-4 h-4 me-2" />{t('addFinancialEntry')}
                  </Button>
                </div>
              )}
            </TabsContent>

            {/* ── RESOURCES TAB — Allocation Table ─────────── */}
            <TabsContent value="resources" className="mt-0 space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-semibold text-foreground text-lg">{t('resourceAllocations')}</h4>
                  <p className="text-sm text-muted-foreground mt-0.5">{t('resourceAllocationsDesc')}</p>
                </div>
                <Button onClick={() => { setSelectedResourceIds([]); setResourceSelectorOpen(true); }} className="bg-primary hover:bg-primary/90">
                  <UserPlus className="w-4 h-4 me-2" />{t('selectResources')}
                </Button>
              </div>

              {resourceAllocations.length > 0 ? (
                <div className="overflow-x-auto rounded-xl border border-border">
                  <table className="w-full min-w-[600px]">
                    <thead className="bg-secondary/50">
                      <tr>
                        <th className="px-4 py-3 text-start text-xs font-semibold text-muted-foreground uppercase">{t('resource')}</th>
                        <th className="px-4 py-3 text-end text-xs font-semibold text-muted-foreground uppercase">{t('monthlyCost')}</th>
                        <th className="px-4 py-3 text-center text-xs font-semibold text-muted-foreground uppercase">{t('utilization')} %</th>
                        <th className="px-4 py-3 text-end text-xs font-semibold text-muted-foreground uppercase">{t('allocatedCost')}</th>
                        <th className="px-4 py-3 text-center text-xs font-semibold text-muted-foreground uppercase w-16">{t('actions')}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {resourceAllocations.map(alloc => {
                        const resource = state.resources.find(r => r.id === alloc.resourceId);
                        if (!resource) return null;
                        const allocatedCost = resource.costRate * (alloc.utilization / 100);
                        return (
                          <tr key={alloc.id} className="hover:bg-secondary/30 transition-colors">
                            <td className="px-4 py-3">
                              <div className="text-sm font-medium text-foreground">{resource.name}</div>
                              <div className="text-xs text-muted-foreground">{resource.role}</div>
                            </td>
                            <td className="px-4 py-3 text-end text-sm text-foreground">{formatCurrency(resource.costRate, language)}</td>
                            <td className="px-4 py-3 text-center">
                              <Input
                                type="number"
                                className="h-8 text-sm text-center w-20 mx-auto"
                                value={alloc.utilization}
                                min={0}
                                max={100}
                                onChange={e => updateResourceUtilization(alloc.id, parseInt(e.target.value) || 0)}
                              />
                            </td>
                            <td className="px-4 py-3 text-end text-sm font-semibold text-primary">{formatCurrency(allocatedCost, language)}</td>
                            <td className="px-4 py-3 text-center">
                              <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive/60 hover:text-destructive"
                                onClick={() => removeResourceAllocation(alloc.id)}>
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot className="bg-secondary/30">
                      <tr className="font-bold">
                        <td className="px-4 py-3 text-sm" colSpan={3}>{t('total')}</td>
                        <td className="px-4 py-3 text-end text-sm text-primary">
                          {formatCurrency(
                            resourceAllocations.reduce((sum, a) => {
                              const r = state.resources.find(res => res.id === a.resourceId);
                              return sum + (r ? r.costRate * (a.utilization / 100) : 0);
                            }, 0),
                            language
                          )}
                        </td>
                        <td className="px-4 py-3" />
                      </tr>
                    </tfoot>
                  </table>
                </div>
              ) : (
                <div className="text-center py-12 bg-secondary/20 rounded-xl border-2 border-dashed border-border">
                  <Users className="w-12 h-12 text-muted-foreground/40 mx-auto mb-4" />
                  <p className="text-sm text-muted-foreground mb-4">{t('noResourceCosts')}</p>
                  <Button variant="outline" onClick={() => { setSelectedResourceIds([]); setResourceSelectorOpen(true); }}>
                    <UserPlus className="w-4 h-4 me-2" />{t('selectResources')}
                  </Button>
                </div>
              )}
            </TabsContent>

            {/* ── FORECAST TAB ─────────────────────────────── */}
            <TabsContent value="forecast" className="mt-0">
              <FeatureForecast
                feature={feature}
                revenueEntries={revenueEntries}
                costEntries={costEntries}
              />
            </TabsContent>
          </div>
        </div>
      </Tabs>

      {/* ── SIMPLIFIED FINANCIAL ENTRY MODAL (Step-Based) ──── */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg">
              <DollarSign className="w-5 h-5 text-primary" />
              {t('addFinancialEntry')}
            </DialogTitle>
            <DialogDescription>{feature.name} • {selectedYear}</DialogDescription>
          </DialogHeader>

          <div className="space-y-5 py-2">
            {/* Step 1: Select Feature */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">1</span>
                <h4 className="text-sm font-semibold text-foreground">{t('selectFeature')}</h4>
              </div>
              <Select value={String(modalFeatureId)} onValueChange={v => setModalFeatureId(parseInt(v))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {productFeatures.map(f => <SelectItem key={f.id} value={String(f.id)}>{f.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {/* Step 2: Select Month */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center text-xs font-bold text-blue-700 dark:text-blue-400">2</span>
                <h4 className="text-sm font-semibold text-foreground">{t('selectMonth')}</h4>
              </div>
              <Select value={String(modalMonth)} onValueChange={v => setModalMonth(parseInt(v))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {MONTHS_SHORT_KEYS.map((key, idx) => (
                    <SelectItem key={idx} value={String(idx)}>{t(key)} {selectedYear}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Step 3: Enter Revenue */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-900/20 flex items-center justify-center text-xs font-bold text-emerald-700 dark:text-emerald-400">3</span>
                <h4 className="text-sm font-semibold text-foreground">{t('revenue')}</h4>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">{t('planned')} (SAR)</label>
                  <Input type="number" value={modalRevenuePlanned || ''} placeholder="0"
                    onChange={e => setModalRevenuePlanned(parseFloat(e.target.value) || 0)} />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">{t('actual')} (SAR)</label>
                  <Input type="number" value={modalRevenueActual || ''} placeholder="0"
                    onChange={e => setModalRevenueActual(parseFloat(e.target.value) || 0)} />
                </div>
              </div>
            </div>

            {/* Step 4: Add Cost Categories (expandable) */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="w-6 h-6 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center text-xs font-bold text-red-700 dark:text-red-400">4</span>
                <h4 className="text-sm font-semibold text-foreground">{t('costCategories')}</h4>
              </div>
              <div className="space-y-2">
                {COST_CATEGORIES.filter(c => c !== 'Resources').map(cat => (
                  <Collapsible
                    key={cat}
                    open={expandedCostCategories.includes(cat)}
                    onOpenChange={() => toggleCostCategory(cat)}
                  >
                    <CollapsibleTrigger className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg border border-border hover:bg-secondary/30 transition-colors">
                      <span className="text-sm font-medium text-foreground">{cat}</span>
                      <ChevronDown className={cn("w-4 h-4 text-muted-foreground transition-transform", expandedCostCategories.includes(cat) && "rotate-180")} />
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <div className="grid grid-cols-2 gap-3 px-3 py-3">
                        <div>
                          <label className="text-xs font-medium text-muted-foreground mb-1 block">{t('planned')} (SAR)</label>
                          <Input type="number" value={modalCostCategories[cat]?.planned || ''} placeholder="0"
                            onChange={e => setModalCostCategories(prev => ({
                              ...prev,
                              [cat]: { ...prev[cat], planned: parseFloat(e.target.value) || 0 }
                            }))} />
                        </div>
                        <div>
                          <label className="text-xs font-medium text-muted-foreground mb-1 block">{t('actual')} (SAR)</label>
                          <Input type="number" value={modalCostCategories[cat]?.actual || ''} placeholder="0"
                            onChange={e => setModalCostCategories(prev => ({
                              ...prev,
                              [cat]: { ...prev[cat], actual: parseFloat(e.target.value) || 0 }
                            }))} />
                        </div>
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter className="pt-4 border-t border-border">
            <Button variant="outline" onClick={() => setModalOpen(false)}>{t('cancel')}</Button>
            <Button onClick={saveModal} className="bg-primary hover:bg-primary/90">
              <Save className="w-4 h-4 me-2" />{t('saveEntry')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── RESOURCE SELECTOR DIALOG ─────────────────────── */}
      <Dialog open={resourceSelectorOpen} onOpenChange={setResourceSelectorOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-primary" />
              {t('selectResources')}
            </DialogTitle>
            <DialogDescription>{t('selectResourcesDesc')}</DialogDescription>
          </DialogHeader>

          <div className="space-y-2 max-h-[50vh] overflow-y-auto py-2">
            {state.resources.filter(r => r.status === 'Active').map(resource => {
              const isAlreadyAdded = resourceAllocations.some(a => a.resourceId === resource.id);
              const isSelected = selectedResourceIds.includes(resource.id);
              return (
                <label
                  key={resource.id}
                  className={cn(
                    "flex items-center gap-3 p-3 rounded-lg border transition-colors cursor-pointer",
                    isAlreadyAdded ? "border-border bg-secondary/30 opacity-60 cursor-not-allowed" :
                    isSelected ? "border-primary bg-primary/5" : "border-border hover:bg-secondary/30"
                  )}
                >
                  <Checkbox
                    checked={isSelected}
                    disabled={isAlreadyAdded}
                    onCheckedChange={(checked) => {
                      if (isAlreadyAdded) return;
                      setSelectedResourceIds(prev =>
                        checked ? [...prev, resource.id] : prev.filter(id => id !== resource.id)
                      );
                    }}
                  />
                  <div className="flex-1">
                    <div className="text-sm font-medium text-foreground">{resource.name}</div>
                    <div className="text-xs text-muted-foreground">{resource.role} • {formatCurrency(resource.costRate, language)}/mo</div>
                  </div>
                  {isAlreadyAdded && (
                    <span className="text-xs text-muted-foreground">{t('alreadyAdded')}</span>
                  )}
                </label>
              );
            })}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setResourceSelectorOpen(false)}>{t('cancel')}</Button>
            <Button onClick={addResourceAllocations} disabled={selectedResourceIds.length === 0} className="bg-primary hover:bg-primary/90">
              <Plus className="w-4 h-4 me-2" />{t('addSelected')} ({selectedResourceIds.length})
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

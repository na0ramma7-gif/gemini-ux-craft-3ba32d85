import { useState, useMemo } from 'react';
import { useApp } from '@/context/AppContext';
import { Feature } from '@/types';
import { formatCurrency, cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import KPICard from '@/components/KPICard';
import StatusBadge from '@/components/StatusBadge';
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
  Calendar,
  Save,
} from 'lucide-react';

// ── Data Types ──────────────────────────────────────────────

interface MonthlyEntry {
  id: number;
  month: number; // 0-11
  planned: number;
  actual: number;
}

interface ResourceEntry {
  id: number;
  resourceId: number;
  allocation: number;
  startDate: string;
  endDate: string;
  costRate: number;
}

interface FeatureFinancialPlanningProps {
  feature: Feature;
  onClose: () => void;
}

const MONTHS_SHORT_KEYS = ['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'] as const;
const COST_CATEGORIES = ['Development', 'Operation', 'Infrastructure', 'Licensing', 'Marketing', 'Resources', 'Others'];

// ── Component ───────────────────────────────────────────────

const FeatureFinancialPlanning = ({ feature, onClose }: FeatureFinancialPlanningProps) => {
  const { state, t, language, isRTL } = useApp();
  const [tab, setTab] = useState('summary');
  const [selectedYear, setSelectedYear] = useState(2025);

  // Simple monthly entries per type
  const [revenueEntries, setRevenueEntries] = useState<MonthlyEntry[]>([]);
  const [costEntries, setCostEntries] = useState<MonthlyEntry[]>([]);
  const [resources, setResources] = useState<ResourceEntry[]>([]);

  // Feature Profile
  const [featureProfile, setFeatureProfile] = useState({
    description: feature.description || '',
    targetUser: feature.targetUser || '',
    customerSegmentation: feature.customerSegmentation || '',
    valueProposition: feature.valueProposition || '',
    businessModel: feature.businessModel || '',
    risksAndChallenges: feature.risks || '',
  });

  // Add/Edit modal
  const [entryModal, setEntryModal] = useState<{ type: 'revenue' | 'cost'; entry?: MonthlyEntry } | null>(null);
  const [entryForm, setEntryForm] = useState({ month: 0, planned: 0, actual: 0 });
  const [deleteConfirm, setDeleteConfirm] = useState<{ type: 'revenue' | 'cost'; id: number } | null>(null);

  const product = state.products.find(p => p.id === feature.productId);
  const BackIcon = isRTL ? ArrowRight : ArrowLeft;

  // ── Helpers ──────────────────────────────────────────────

  const calcTotals = (entries: MonthlyEntry[]) => {
    const planned = entries.reduce((s, e) => s + e.planned, 0);
    const actual = entries.reduce((s, e) => s + e.actual, 0);
    const variance = actual - planned;
    const achievement = planned > 0 ? (actual / planned) * 100 : 0;
    return { planned, actual, variance, achievement };
  };

  const totals = useMemo(() => {
    const rev = calcTotals(revenueEntries);
    const cost = calcTotals(costEntries);
    const resourceCost = resources.reduce((sum, r) => {
      if (!r.startDate || !r.endDate) return sum;
      const s = new Date(r.startDate), e = new Date(r.endDate);
      const months = Math.max(1, Math.ceil((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24 * 30)));
      return sum + r.costRate * (r.allocation / 100) * months;
    }, 0);
    return {
      revenue: rev,
      cost: { planned: cost.planned + resourceCost, actual: cost.actual + resourceCost, variance: cost.variance, achievement: cost.achievement },
      profit: { planned: rev.planned - (cost.planned + resourceCost), actual: rev.actual - (cost.actual + resourceCost) },
    };
  }, [revenueEntries, costEntries, resources]);

  // ── CRUD ────────────────────────────────────────────────

  const openAddModal = (type: 'revenue' | 'cost') => {
    // Find next available month
    const entries = type === 'revenue' ? revenueEntries : costEntries;
    const usedMonths = entries.map(e => e.month);
    const nextMonth = Array.from({ length: 12 }, (_, i) => i).find(m => !usedMonths.includes(m)) ?? 0;
    setEntryForm({ month: nextMonth, planned: 0, actual: 0 });
    setEntryModal({ type });
  };

  const openEditModal = (type: 'revenue' | 'cost', entry: MonthlyEntry) => {
    setEntryForm({ month: entry.month, planned: entry.planned, actual: entry.actual });
    setEntryModal({ type, entry });
  };

  const handleSaveEntry = () => {
    if (!entryModal) return;
    const { type, entry } = entryModal;
    const setter = type === 'revenue' ? setRevenueEntries : setCostEntries;

    if (entry) {
      // Edit
      setter(prev => prev.map(e => e.id === entry.id ? { ...e, month: entryForm.month, planned: entryForm.planned, actual: entryForm.actual } : e));
    } else {
      // Create
      setter(prev => [...prev, { id: Date.now(), month: entryForm.month, planned: entryForm.planned, actual: entryForm.actual }]);
    }
    setEntryModal(null);
  };

  const handleDelete = () => {
    if (!deleteConfirm) return;
    const setter = deleteConfirm.type === 'revenue' ? setRevenueEntries : setCostEntries;
    setter(prev => prev.filter(e => e.id !== deleteConfirm.id));
    setDeleteConfirm(null);
  };

  const getUsedMonths = (type: 'revenue' | 'cost', excludeId?: number) => {
    const entries = type === 'revenue' ? revenueEntries : costEntries;
    return entries.filter(e => e.id !== excludeId).map(e => e.month);
  };

  // ── Render Monthly Table ────────────────────────────────

  const renderMonthlyTable = (entries: MonthlyEntry[], type: 'revenue' | 'cost') => {
    const isRevenue = type === 'revenue';
    const sorted = [...entries].sort((a, b) => a.month - b.month);
    const total = calcTotals(entries);

    return (
      <div className="space-y-4">
        {/* Totals bar */}
        <div className={cn(
          "rounded-xl p-4 sm:p-5 border-2",
          isRevenue
            ? "bg-gradient-to-r from-blue-50 to-emerald-50 dark:from-blue-950/30 dark:to-emerald-950/30 border-blue-200 dark:border-blue-800"
            : "bg-gradient-to-r from-red-50 to-orange-50 dark:from-red-950/30 dark:to-orange-950/30 border-red-200 dark:border-red-800"
        )}>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div>
              <div className="text-xs text-muted-foreground mb-1">{t('totalPlanned')}</div>
              <div className="text-xl sm:text-2xl font-bold text-blue-600">{formatCurrency(total.planned, language)}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground mb-1">{t('totalActual')}</div>
              <div className="text-xl sm:text-2xl font-bold text-emerald-600">{formatCurrency(total.actual, language)}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground mb-1">{t('variance')}</div>
              <div className={cn("text-xl sm:text-2xl font-bold",
                isRevenue ? (total.variance >= 0 ? 'text-emerald-600' : 'text-destructive') : (total.variance <= 0 ? 'text-emerald-600' : 'text-destructive')
              )}>
                {total.variance >= 0 ? '+' : ''}{formatCurrency(total.variance, language)}
              </div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground mb-1">{t('achievementRate')}</div>
              <div className="text-xl sm:text-2xl font-bold text-foreground">{total.achievement.toFixed(1)}%</div>
            </div>
          </div>
        </div>

        {/* Entries table */}
        {sorted.length > 0 ? (
          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="w-full min-w-[500px]">
              <thead className="bg-secondary">
                <tr>
                  <th className="px-4 py-3 text-start text-xs font-semibold text-muted-foreground uppercase">{t('month')}</th>
                  <th className="px-4 py-3 text-end text-xs font-semibold text-muted-foreground uppercase">{t('planned')}</th>
                  <th className="px-4 py-3 text-end text-xs font-semibold text-muted-foreground uppercase">{t('actual')}</th>
                  <th className="px-4 py-3 text-end text-xs font-semibold text-muted-foreground uppercase">{t('variance')}</th>
                  <th className="px-4 py-3 text-end text-xs font-semibold text-muted-foreground uppercase">%</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-muted-foreground uppercase">{t('actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {sorted.map(entry => {
                  const variance = entry.actual - entry.planned;
                  const pct = entry.planned > 0 ? (entry.actual / entry.planned) * 100 : 0;
                  return (
                    <tr key={entry.id} className="hover:bg-secondary/50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-muted-foreground" />
                          <span className="font-medium text-foreground text-sm">{t(MONTHS_SHORT_KEYS[entry.month])} {selectedYear}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-end font-semibold text-blue-600 text-sm">{formatCurrency(entry.planned, language)}</td>
                      <td className="px-4 py-3 text-end font-semibold text-emerald-600 text-sm">{formatCurrency(entry.actual, language)}</td>
                      <td className={cn("px-4 py-3 text-end font-semibold text-sm",
                        isRevenue ? (variance >= 0 ? 'text-emerald-600' : 'text-destructive') : (variance <= 0 ? 'text-emerald-600' : 'text-destructive')
                      )}>
                        {variance >= 0 ? '+' : ''}{formatCurrency(variance, language)}
                      </td>
                      <td className="px-4 py-3 text-end text-sm">
                        <span className={cn(
                          "inline-block px-2 py-0.5 rounded-full text-xs font-bold",
                          pct >= 100 ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                            : pct >= 50 ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                            : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                        )}>
                          {pct.toFixed(1)}%
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <Button size="sm" variant="outline" className="h-7 w-7 p-0" onClick={() => openEditModal(type, entry)}>
                            <Edit className="w-3 h-3" />
                          </Button>
                          <Button size="sm" variant="outline" className="h-7 w-7 p-0 text-destructive hover:bg-destructive hover:text-destructive-foreground"
                            onClick={() => setDeleteConfirm({ type, id: entry.id })}>
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              {/* Footer totals */}
              <tfoot className={cn("font-bold", isRevenue ? "bg-blue-50/50 dark:bg-blue-950/20" : "bg-red-50/50 dark:bg-red-950/20")}>
                <tr>
                  <td className="px-4 py-3 text-sm text-foreground">{t('total')}</td>
                  <td className="px-4 py-3 text-end text-sm text-blue-600">{formatCurrency(total.planned, language)}</td>
                  <td className="px-4 py-3 text-end text-sm text-emerald-600">{formatCurrency(total.actual, language)}</td>
                  <td className={cn("px-4 py-3 text-end text-sm",
                    isRevenue ? (total.variance >= 0 ? 'text-emerald-600' : 'text-destructive') : (total.variance <= 0 ? 'text-emerald-600' : 'text-destructive')
                  )}>
                    {total.variance >= 0 ? '+' : ''}{formatCurrency(total.variance, language)}
                  </td>
                  <td className="px-4 py-3 text-end text-sm text-foreground">{total.achievement.toFixed(1)}%</td>
                  <td className="px-4 py-3"></td>
                </tr>
              </tfoot>
            </table>
          </div>
        ) : (
          <div className="text-center py-12 bg-secondary/30 rounded-xl border-2 border-dashed border-border">
            <div className="text-4xl mb-3">{isRevenue ? '💵' : '💰'}</div>
            <p className="text-muted-foreground mb-4">{t(isRevenue ? 'noRevenueItems' : 'noCostItems')}</p>
            <Button variant={isRevenue ? 'default' : 'destructive'} onClick={() => openAddModal(type)}>
              <Plus className="w-4 h-4 me-2" />
              {t(isRevenue ? 'addMonthlyRevenue' : 'addMonthlyCost')}
            </Button>
          </div>
        )}
      </div>
    );
  };

  // ── Main Render ─────────────────────────────────────────

  return (
    <div className="space-y-4 sm:space-y-6 animate-fade-in">
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
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">{t('year')}</label>
            <Select value={String(selectedYear)} onValueChange={v => setSelectedYear(parseInt(v))}>
              <SelectTrigger className="w-24 h-8"><SelectValue /></SelectTrigger>
              <SelectContent>
                {[2024, 2025, 2026, 2027].map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-4">
        <KPICard title={t('totalRevenue')} value={formatCurrency(totals.revenue.planned, language)} subtitle={`${totals.revenue.achievement.toFixed(0)}% ${t('achieved')}`} icon={<span className="text-lg">💰</span>} variant="green" />
        <KPICard title={t('totalCost')} value={formatCurrency(totals.cost.planned, language)} subtitle={t('resourcesCapexOpex')} icon={<span className="text-lg">💸</span>} variant="red" />
        <KPICard title={t('netProfit')} value={formatCurrency(totals.profit.planned, language)} subtitle={`${t('margin')}: ${totals.revenue.planned > 0 ? ((totals.profit.planned / totals.revenue.planned) * 100).toFixed(1) : 0}%`} icon={<span className="text-lg">✅</span>} variant={totals.profit.planned >= 0 ? 'green' : 'red'} />
        <KPICard title={t('targetVsAchieved')} value={`${totals.revenue.achievement.toFixed(1)}%`} icon={<span className="text-lg">🎯</span>} variant="gradient" />
        <KPICard title={t('status')} value={feature.status} subtitle={product?.name} icon={<span className="text-lg">⭐</span>} variant="purple" />
      </div>

      {/* Tabs */}
      <Tabs value={tab} onValueChange={setTab} className="w-full">
        <div className="bg-card rounded-xl shadow-card overflow-hidden">
          <TabsList className="w-full justify-start border-b rounded-none h-auto p-0 bg-transparent overflow-x-auto flex-nowrap">
            {[
              { value: 'summary', icon: <FileText className="w-4 h-4 me-1" />, label: t('summary') },
              { value: 'revenue', icon: <DollarSign className="w-4 h-4 me-1" />, label: t('revenue') },
              { value: 'costs', icon: <BarChart3 className="w-4 h-4 me-1" />, label: t('costs') },
              { value: 'resources', icon: <Users className="w-4 h-4 me-1" />, label: t('resources') },
              { value: 'forecast', icon: <TrendingUp className="w-4 h-4 me-1" />, label: t('forecast') },
            ].map(tabItem => (
              <TabsTrigger key={tabItem.value} value={tabItem.value}
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 sm:px-6 py-3 text-xs sm:text-sm whitespace-nowrap">
                {tabItem.icon}{tabItem.label}
              </TabsTrigger>
            ))}
          </TabsList>

          <div className="p-4 sm:p-6 max-h-[70vh] overflow-y-auto">
            {/* SUMMARY TAB */}
            <TabsContent value="summary" className="mt-0 space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="text-lg sm:text-xl font-bold text-foreground">{t('featureProfile')}</h3>
                <StatusBadge status={feature.status} />
              </div>

              <div className="bg-card rounded-xl border-2 border-border p-4 sm:p-6">
                <label className="block text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                  <span className="text-xl">📝</span>{t('description')}
                </label>
                <Textarea value={featureProfile.description} onChange={e => setFeatureProfile({ ...featureProfile, description: e.target.value })}
                  placeholder={t('featureDescPlaceholder')} rows={4} />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                {[
                  { key: 'targetUser', icon: '👥', bg: 'bg-blue-50 dark:bg-blue-900/20', border: 'border-blue-200 dark:border-blue-800', field: 'targetUser' as const, placeholder: 'targetUserPlaceholder' },
                  { key: 'customerSegmentation', icon: '🎯', bg: 'bg-emerald-50 dark:bg-emerald-900/20', border: 'border-emerald-200 dark:border-emerald-800', field: 'customerSegmentation' as const, placeholder: 'customerSegmentationPlaceholder' },
                  { key: 'valueProposition', icon: '💎', bg: 'bg-purple-50 dark:bg-purple-900/20', border: 'border-purple-200 dark:border-purple-800', field: 'valueProposition' as const, placeholder: 'valuePropositionPlaceholder' },
                  { key: 'businessModel', icon: '💰', bg: 'bg-amber-50 dark:bg-amber-900/20', border: 'border-amber-200 dark:border-amber-800', field: 'businessModel' as const, placeholder: 'businessModelPlaceholder' },
                ].map(f => (
                  <div key={f.key} className={cn("rounded-xl border-2 p-4 sm:p-6", f.bg, f.border)}>
                    <label className="block text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                      <span className="text-xl">{f.icon}</span>{t(f.key as any)}
                    </label>
                    <Textarea value={featureProfile[f.field]} onChange={e => setFeatureProfile({ ...featureProfile, [f.field]: e.target.value })}
                      placeholder={t(f.placeholder as any)} rows={4} />
                  </div>
                ))}
              </div>

              <div className="bg-red-50 dark:bg-red-900/20 rounded-xl border-2 border-red-200 dark:border-red-800 p-4 sm:p-6">
                <label className="block text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                  <span className="text-xl">⚠️</span>{t('risksAndChallenges')}
                </label>
                <Textarea value={featureProfile.risksAndChallenges} onChange={e => setFeatureProfile({ ...featureProfile, risksAndChallenges: e.target.value })}
                  placeholder={t('risksPlaceholder')} rows={4} />
              </div>

              {/* Quick Financial Summary */}
              <div className="bg-gradient-to-r from-primary/5 to-purple-500/5 rounded-xl border-2 border-primary/20 p-4 sm:p-6">
                <h4 className="text-lg font-semibold text-foreground mb-4">{t('quickFinancialSummary')}</h4>
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center">
                    <div className="text-sm text-muted-foreground mb-1">{t('totalRevenue')} ({selectedYear})</div>
                    <div className="text-xl sm:text-2xl font-bold text-blue-600">{formatCurrency(totals.revenue.planned, language)}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-sm text-muted-foreground mb-1">{t('totalCost')} ({selectedYear})</div>
                    <div className="text-xl sm:text-2xl font-bold text-red-600">{formatCurrency(totals.cost.planned, language)}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-sm text-muted-foreground mb-1">{t('netProfit')} ({selectedYear})</div>
                    <div className={cn("text-xl sm:text-2xl font-bold", totals.profit.planned >= 0 ? 'text-emerald-600' : 'text-orange-600')}>
                      {formatCurrency(totals.profit.planned, language)}
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* REVENUE TAB */}
            <TabsContent value="revenue" className="mt-0 space-y-4">
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
                <div>
                  <h4 className="font-semibold text-foreground text-lg">{t('revenue')} — {selectedYear}</h4>
                  <p className="text-sm text-muted-foreground mt-1">{t('addRevenueDesc')}</p>
                </div>
                {revenueEntries.length < 12 && (
                  <Button onClick={() => openAddModal('revenue')}>
                    <Plus className="w-4 h-4 me-2" />{t('addMonthlyRevenue')}
                  </Button>
                )}
              </div>
              {renderMonthlyTable(revenueEntries, 'revenue')}
            </TabsContent>

            {/* COSTS TAB */}
            <TabsContent value="costs" className="mt-0 space-y-4">
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
                <div>
                  <h4 className="font-semibold text-foreground text-lg">{t('costs')} — {selectedYear}</h4>
                  <p className="text-sm text-muted-foreground mt-1">{t('addCostDesc')}</p>
                </div>
                {costEntries.length < 12 && (
                  <Button variant="destructive" onClick={() => openAddModal('cost')}>
                    <Plus className="w-4 h-4 me-2" />{t('addMonthlyCost')}
                  </Button>
                )}
              </div>
              {renderMonthlyTable(costEntries, 'cost')}
            </TabsContent>

            {/* RESOURCES TAB */}
            <TabsContent value="resources" className="mt-0 space-y-4">
              <div className="flex justify-between items-center">
                <h4 className="font-semibold text-foreground text-lg">{t('resourceAssignments')}</h4>
                <Button onClick={() => setResources([...resources, { id: Date.now(), resourceId: state.resources[0]?.id || 1, allocation: 100, startDate: '', endDate: '', costRate: 10000 }])}>
                  <Plus className="w-4 h-4 me-2" />{t('assignResourceBtn')}
                </Button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[600px]">
                  <thead className="bg-secondary">
                    <tr>
                      <th className="px-4 py-3 text-start text-xs font-semibold text-muted-foreground uppercase">{t('resource')}</th>
                      <th className="px-4 py-3 text-end text-xs font-semibold text-muted-foreground uppercase">{t('allocation')}%</th>
                      <th className="px-4 py-3 text-start text-xs font-semibold text-muted-foreground uppercase">{t('startDate')}</th>
                      <th className="px-4 py-3 text-start text-xs font-semibold text-muted-foreground uppercase">{t('endDate')}</th>
                      <th className="px-4 py-3 text-end text-xs font-semibold text-muted-foreground uppercase">{t('costRatePerMonth')}</th>
                      <th className="px-4 py-3 text-end text-xs font-semibold text-muted-foreground uppercase">{t('total')}</th>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-muted-foreground uppercase">{t('actions')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {resources.map(r => {
                      const months = r.startDate && r.endDate ? Math.max(1, Math.ceil((new Date(r.endDate).getTime() - new Date(r.startDate).getTime()) / (1000 * 60 * 60 * 24 * 30))) : 0;
                      const totalCost = r.costRate * (r.allocation / 100) * months;
                      return (
                        <tr key={r.id} className="hover:bg-secondary/50">
                          <td className="px-4 py-3">
                            <Select value={String(r.resourceId)} onValueChange={v => setResources(resources.map(res => res.id === r.id ? { ...res, resourceId: parseInt(v) } : res))}>
                              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                              <SelectContent>{state.resources.map(sr => <SelectItem key={sr.id} value={String(sr.id)}>{sr.name} - {sr.role}</SelectItem>)}</SelectContent>
                            </Select>
                          </td>
                          <td className="px-4 py-3">
                            <Input type="number" className="h-8 text-xs w-20 ms-auto" value={r.allocation} min={0} max={100}
                              onChange={e => setResources(resources.map(res => res.id === r.id ? { ...res, allocation: parseInt(e.target.value) } : res))} />
                          </td>
                          <td className="px-4 py-3"><Input type="date" className="h-8 text-xs" value={r.startDate}
                            onChange={e => setResources(resources.map(res => res.id === r.id ? { ...res, startDate: e.target.value } : res))} /></td>
                          <td className="px-4 py-3"><Input type="date" className="h-8 text-xs" value={r.endDate}
                            onChange={e => setResources(resources.map(res => res.id === r.id ? { ...res, endDate: e.target.value } : res))} /></td>
                          <td className="px-4 py-3">
                            <Input type="number" className="h-8 text-xs w-28 ms-auto" value={r.costRate}
                              onChange={e => setResources(resources.map(res => res.id === r.id ? { ...res, costRate: parseFloat(e.target.value) || 0 } : res))} />
                          </td>
                          <td className="px-4 py-3 text-end font-bold text-primary text-sm">{formatCurrency(totalCost, language)}</td>
                          <td className="px-4 py-3 text-center">
                            <Button size="sm" variant="outline" className="h-7 w-7 p-0 text-destructive" onClick={() => setResources(resources.filter(res => res.id !== r.id))}>
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {resources.length === 0 && (
                <div className="text-center py-12 bg-secondary/50 rounded-lg border-2 border-dashed border-border">
                  <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">{t('resourceAssignments')}</p>
                </div>
              )}
            </TabsContent>

            {/* FORECAST TAB */}
            <TabsContent value="forecast" className="mt-0">
              <div className="text-center py-12 bg-secondary/50 rounded-lg border-2 border-dashed border-border">
                <TrendingUp className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-foreground mb-2">{t('forecast')}</h3>
                <p className="text-sm text-muted-foreground">{t('forecastComingSoon')}</p>
              </div>
            </TabsContent>
          </div>
        </div>
      </Tabs>

      {/* ── ADD / EDIT ENTRY MODAL ──────────────────────────── */}
      <Dialog open={!!entryModal} onOpenChange={() => setEntryModal(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {entryModal?.entry ? <Edit className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
              {entryModal?.entry
                ? `${t('edit')} — ${t(MONTHS_SHORT_KEYS[entryModal.entry.month])} ${selectedYear}`
                : (entryModal?.type === 'revenue' ? t('addMonthlyRevenue') : t('addMonthlyCost'))
              }
            </DialogTitle>
            <DialogDescription>
              {feature.name} • {selectedYear}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5 py-2">
            {/* Month selector */}
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">{t('month')}</label>
              <Select value={String(entryForm.month)} onValueChange={v => setEntryForm({ ...entryForm, month: parseInt(v) })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {MONTHS_SHORT_KEYS.map((key, idx) => {
                    const used = getUsedMonths(entryModal?.type || 'revenue', entryModal?.entry?.id);
                    const disabled = used.includes(idx);
                    return (
                      <SelectItem key={idx} value={String(idx)} disabled={disabled}>
                        {t(key)} {disabled ? `(${t('alreadyAdded')})` : ''}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            {/* Planned */}
            <div>
              <label className="text-sm font-medium text-blue-600 mb-1.5 block">{t('planned')} (SAR)</label>
              <Input
                type="number"
                className="bg-blue-50/50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800 focus:border-blue-400"
                value={entryForm.planned || ''}
                placeholder="0"
                onChange={e => setEntryForm({ ...entryForm, planned: parseFloat(e.target.value) || 0 })}
              />
            </div>

            {/* Actual */}
            <div>
              <label className="text-sm font-medium text-emerald-600 mb-1.5 block">{t('actual')} (SAR)</label>
              <Input
                type="number"
                className="bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800 focus:border-emerald-400"
                value={entryForm.actual || ''}
                placeholder="0"
                onChange={e => setEntryForm({ ...entryForm, actual: parseFloat(e.target.value) || 0 })}
              />
            </div>

            {/* Auto-calculated variance */}
            {(() => {
              const variance = entryForm.actual - entryForm.planned;
              const isRevenue = entryModal?.type === 'revenue';
              const isPositive = isRevenue ? variance >= 0 : variance <= 0;
              return (
                <div className={cn(
                  "rounded-lg p-4 border-2 text-center",
                  isPositive
                    ? "bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800"
                    : "bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800"
                )}>
                  <div className="text-xs text-muted-foreground mb-1">{t('variance')}</div>
                  <div className={cn("text-2xl font-bold", isPositive ? 'text-emerald-600' : 'text-destructive')}>
                    {variance >= 0 ? '+' : ''}{formatCurrency(variance, language)}
                  </div>
                </div>
              );
            })()}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEntryModal(null)}>{t('cancel')}</Button>
            <Button onClick={handleSaveEntry}>
              <Save className="w-4 h-4 me-2" />
              {entryModal?.entry ? t('saveChanges') : t('addEntry')}
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

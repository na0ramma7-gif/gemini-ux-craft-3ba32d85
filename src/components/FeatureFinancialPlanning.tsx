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
  Eye,
  BarChart3,
  DollarSign,
  Users,
  TrendingUp,
  FileText,
  Calendar,
  X,
} from 'lucide-react';

// ── Data Types ──────────────────────────────────────────────

interface MonthlyData {
  planned: number;
  actual: number;
}

interface FinancialItem {
  id: number;
  name: string;
  year: number;
  category?: string;
  description?: string;
  months: MonthlyData[]; // 12 entries, index 0 = Jan
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

const emptyMonths = (): MonthlyData[] => Array.from({ length: 12 }, () => ({ planned: 0, actual: 0 }));

// ── Component ───────────────────────────────────────────────

const FeatureFinancialPlanning = ({ feature, onClose }: FeatureFinancialPlanningProps) => {
  const { state, t, language, isRTL } = useApp();
  const [tab, setTab] = useState('summary');
  const [selectedYear, setSelectedYear] = useState(2025);

  // Data stores
  const [revenueItems, setRevenueItems] = useState<FinancialItem[]>([]);
  const [costItems, setCostItems] = useState<FinancialItem[]>([]);
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

  // Modal state
  const [createModal, setCreateModal] = useState<{ type: 'revenue' | 'cost'; item?: FinancialItem } | null>(null);
  const [monthlyModal, setMonthlyModal] = useState<{ type: 'revenue' | 'cost'; item: FinancialItem } | null>(null);
  const [viewModal, setViewModal] = useState<{ type: 'revenue' | 'cost'; item: FinancialItem } | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ type: 'revenue' | 'cost'; id: number } | null>(null);

  // Create modal form
  const [formData, setFormData] = useState({ name: '', year: 2025, category: 'Development', description: '' });

  const product = state.products.find(p => p.id === feature.productId);
  const BackIcon = isRTL ? ArrowRight : ArrowLeft;

  // ── Helpers ──────────────────────────────────────────────

  const itemTotals = (item: FinancialItem) => {
    const planned = item.months.reduce((s, m) => s + m.planned, 0);
    const actual = item.months.reduce((s, m) => s + m.actual, 0);
    const variance = actual - planned;
    const achievement = planned > 0 ? (actual / planned) * 100 : 0;
    return { planned, actual, variance, achievement };
  };

  const totals = useMemo(() => {
    const sumItems = (items: FinancialItem[]) => {
      let planned = 0, actual = 0;
      items.filter(i => i.year === selectedYear).forEach(i => {
        i.months.forEach(m => { planned += m.planned; actual += m.actual; });
      });
      return { planned, actual, variance: actual - planned, achievement: planned > 0 ? (actual / planned) * 100 : 0 };
    };

    const rev = sumItems(revenueItems);
    const cost = sumItems(costItems);

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
  }, [revenueItems, costItems, resources, selectedYear]);

  // ── CRUD ────────────────────────────────────────────────

  const openCreateModal = (type: 'revenue' | 'cost', item?: FinancialItem) => {
    if (item) {
      setFormData({ name: item.name, year: item.year, category: item.category || 'Development', description: item.description || '' });
    } else {
      setFormData({ name: '', year: selectedYear, category: 'Development', description: '' });
    }
    setCreateModal({ type, item });
  };

  const handleSaveCreate = () => {
    if (!createModal || !formData.name.trim()) return;
    const { type, item } = createModal;
    const setter = type === 'revenue' ? setRevenueItems : setCostItems;

    if (item) {
      // Edit existing
      setter(prev => prev.map(i => i.id === item.id ? { ...i, name: formData.name, year: formData.year, category: formData.category, description: formData.description } : i));
    } else {
      // Create new → then open monthly modal
      const newItem: FinancialItem = {
        id: Date.now(),
        name: formData.name,
        year: formData.year,
        category: type === 'cost' ? formData.category : undefined,
        description: formData.description,
        months: emptyMonths(),
      };
      setter(prev => [...prev, newItem]);
      setCreateModal(null);
      // Open monthly modal for the new item
      setTimeout(() => setMonthlyModal({ type, item: newItem }), 100);
      return;
    }
    setCreateModal(null);
  };

  const handleDelete = () => {
    if (!deleteConfirm) return;
    const setter = deleteConfirm.type === 'revenue' ? setRevenueItems : setCostItems;
    setter(prev => prev.filter(i => i.id !== deleteConfirm.id));
    setDeleteConfirm(null);
  };

  const updateMonthlyData = (itemId: number, type: 'revenue' | 'cost', monthIdx: number, field: 'planned' | 'actual', value: number) => {
    const setter = type === 'revenue' ? setRevenueItems : setCostItems;
    setter(prev => prev.map(item => {
      if (item.id !== itemId) return item;
      const months = [...item.months];
      months[monthIdx] = { ...months[monthIdx], [field]: value };
      return { ...item, months };
    }));
  };

  // Keep monthlyModal in sync with items state
  const currentMonthlyItem = monthlyModal
    ? (monthlyModal.type === 'revenue' ? revenueItems : costItems).find(i => i.id === monthlyModal.item.id) || monthlyModal.item
    : null;

  const currentViewItem = viewModal
    ? (viewModal.type === 'revenue' ? revenueItems : costItems).find(i => i.id === viewModal.item.id) || viewModal.item
    : null;

  // ── Render Helpers ──────────────────────────────────────

  const renderSummaryTable = (items: FinancialItem[], type: 'revenue' | 'cost') => {
    if (items.filter(i => i.year === selectedYear).length === 0) {
      const isRevenue = type === 'revenue';
      return (
        <div className="text-center py-12 bg-secondary/30 rounded-xl border-2 border-dashed border-border">
          <div className="text-4xl mb-3">{isRevenue ? '💵' : '💰'}</div>
          <p className="text-muted-foreground mb-4">{t(isRevenue ? 'noRevenueItems' : 'noCostItems')}</p>
          <Button variant={isRevenue ? 'default' : 'destructive'} onClick={() => openCreateModal(type)}>
            <Plus className="w-4 h-4 me-2" />
            {t(isRevenue ? 'addFirstRevenueItem' : 'addFirstCostItem')}
          </Button>
        </div>
      );
    }

    const isRevenue = type === 'revenue';
    const filteredItems = items.filter(i => i.year === selectedYear);

    return (
      <div className="space-y-4">
        {/* Summary cards for each item */}
        <div className="space-y-3">
          {filteredItems.map(item => {
            const t_ = itemTotals(item);
            return (
              <div key={item.id} className={cn(
                "rounded-xl border-2 p-4 sm:p-5 transition-all hover:shadow-md",
                isRevenue
                  ? "border-blue-200 dark:border-blue-800 bg-card"
                  : "border-red-200 dark:border-red-800 bg-card"
              )}>
                <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                  {/* Name + Category */}
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-foreground text-sm sm:text-base truncate">{item.name}</h4>
                    <div className="flex items-center gap-2 mt-1">
                      {item.category && (
                        <span className="text-[10px] sm:text-xs px-2 py-0.5 rounded-full bg-secondary text-muted-foreground">
                          {item.category}
                        </span>
                      )}
                      <span className="text-[10px] sm:text-xs text-muted-foreground flex items-center gap-1">
                        <Calendar className="w-3 h-3" />{item.year}
                      </span>
                    </div>
                  </div>

                  {/* Metrics */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-6 flex-shrink-0">
                    <div className="text-center sm:text-end">
                      <div className="text-[10px] sm:text-xs text-muted-foreground mb-0.5">{t('planned')}</div>
                      <div className="text-sm sm:text-base font-bold text-blue-600">{formatCurrency(t_.planned, language)}</div>
                    </div>
                    <div className="text-center sm:text-end">
                      <div className="text-[10px] sm:text-xs text-muted-foreground mb-0.5">{t('actual')}</div>
                      <div className="text-sm sm:text-base font-bold text-emerald-600">{formatCurrency(t_.actual, language)}</div>
                    </div>
                    <div className="text-center sm:text-end">
                      <div className="text-[10px] sm:text-xs text-muted-foreground mb-0.5">{t('variance')}</div>
                      <div className={cn("text-sm sm:text-base font-bold",
                        isRevenue
                          ? (t_.variance >= 0 ? 'text-emerald-600' : 'text-destructive')
                          : (t_.variance <= 0 ? 'text-emerald-600' : 'text-destructive')
                      )}>
                        {t_.variance >= 0 ? '+' : ''}{formatCurrency(t_.variance, language)}
                      </div>
                    </div>
                    <div className="text-center sm:text-end">
                      <div className="text-[10px] sm:text-xs text-muted-foreground mb-0.5">%</div>
                      <div className="text-sm sm:text-base font-bold text-foreground">{t_.achievement.toFixed(1)}%</div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <Button size="sm" variant="outline" className="h-8 w-8 p-0" title={t('view')}
                      onClick={() => setViewModal({ type, item })}>
                      <Eye className="w-3.5 h-3.5" />
                    </Button>
                    <Button size="sm" variant="outline" className="h-8 w-8 p-0" title={t('edit')}
                      onClick={() => setMonthlyModal({ type, item })}>
                      <Edit className="w-3.5 h-3.5" />
                    </Button>
                    <Button size="sm" variant="outline" className="h-8 w-8 p-0 text-destructive hover:bg-destructive hover:text-destructive-foreground" title={t('delete')}
                      onClick={() => setDeleteConfirm({ type, id: item.id })}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>

                {/* Mini progress bar */}
                <div className="mt-3">
                  <Progress value={Math.min(t_.achievement, 100)} className="h-1.5" />
                </div>
              </div>
            );
          })}
        </div>

        {/* Grand totals */}
        {(() => {
          const grandPlanned = filteredItems.reduce((s, i) => s + itemTotals(i).planned, 0);
          const grandActual = filteredItems.reduce((s, i) => s + itemTotals(i).actual, 0);
          const grandVariance = grandActual - grandPlanned;
          const grandAchievement = grandPlanned > 0 ? (grandActual / grandPlanned) * 100 : 0;

          return (
            <div className={cn(
              "rounded-xl p-4 sm:p-6 border-2",
              isRevenue
                ? "bg-gradient-to-r from-blue-50 to-emerald-50 dark:from-blue-950/30 dark:to-emerald-950/30 border-blue-200 dark:border-blue-800"
                : "bg-gradient-to-r from-red-50 to-orange-50 dark:from-red-950/30 dark:to-orange-950/30 border-red-200 dark:border-red-800"
            )}>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-6">
                <div>
                  <div className="text-xs sm:text-sm text-muted-foreground mb-1">{t(isRevenue ? 'totalPlannedRevenue' : 'totalPlannedCost')}</div>
                  <div className="text-xl sm:text-2xl font-bold text-blue-600">{formatCurrency(grandPlanned, language)}</div>
                  <div className="text-[10px] sm:text-xs text-muted-foreground mt-0.5">{filteredItems.length} {t('items')}</div>
                </div>
                <div>
                  <div className="text-xs sm:text-sm text-muted-foreground mb-1">{t(isRevenue ? 'totalActualRevenue' : 'totalActualCost')}</div>
                  <div className="text-xl sm:text-2xl font-bold text-emerald-600">{formatCurrency(grandActual, language)}</div>
                  <div className="text-[10px] sm:text-xs text-muted-foreground mt-0.5">{t('asReported')}</div>
                </div>
                <div>
                  <div className="text-xs sm:text-sm text-muted-foreground mb-1">{t('variance')}</div>
                  <div className={cn("text-xl sm:text-2xl font-bold",
                    isRevenue ? (grandVariance >= 0 ? 'text-emerald-600' : 'text-destructive') : (grandVariance <= 0 ? 'text-emerald-600' : 'text-destructive')
                  )}>
                    {grandVariance >= 0 ? '+' : ''}{formatCurrency(grandVariance, language)}
                  </div>
                </div>
                <div>
                  <div className="text-xs sm:text-sm text-muted-foreground mb-1">{t('achievementRate')}</div>
                  <div className="text-xl sm:text-2xl font-bold text-foreground">{grandAchievement.toFixed(1)}%</div>
                  <div className="text-[10px] sm:text-xs text-muted-foreground mt-0.5">{t('achieved')}</div>
                </div>
              </div>
            </div>
          );
        })()}
      </div>
    );
  };

  // ── Monthly Grid Modal ──────────────────────────────────

  const renderMonthlyGrid = (item: FinancialItem, type: 'revenue' | 'cost', readOnly = false) => {
    const isRevenue = type === 'revenue';
    const t_ = itemTotals(item);

    return (
      <div className="space-y-4">
        {/* Header summary inside modal */}
        <div className={cn(
          "rounded-lg p-3 sm:p-4 border",
          isRevenue ? "bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800" : "bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800"
        )}>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <div className="text-[10px] sm:text-xs text-muted-foreground">{t('planned')}</div>
              <div className="text-lg sm:text-xl font-bold text-blue-600">{formatCurrency(t_.planned, language)}</div>
            </div>
            <div>
              <div className="text-[10px] sm:text-xs text-muted-foreground">{t('actual')}</div>
              <div className="text-lg sm:text-xl font-bold text-emerald-600">{formatCurrency(t_.actual, language)}</div>
            </div>
            <div>
              <div className="text-[10px] sm:text-xs text-muted-foreground">{t('variance')}</div>
              <div className={cn("text-lg sm:text-xl font-bold",
                isRevenue ? (t_.variance >= 0 ? 'text-emerald-600' : 'text-destructive') : (t_.variance <= 0 ? 'text-emerald-600' : 'text-destructive')
              )}>
                {t_.variance >= 0 ? '+' : ''}{formatCurrency(t_.variance, language)}
              </div>
            </div>
            <div>
              <div className="text-[10px] sm:text-xs text-muted-foreground">%</div>
              <div className="text-lg sm:text-xl font-bold text-foreground">{t_.achievement.toFixed(1)}%</div>
            </div>
          </div>
        </div>

        {/* Monthly grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {item.months.map((m, idx) => {
            const variance = m.actual - m.planned;
            return (
              <div key={idx} className={cn(
                "rounded-lg border p-3 transition-all",
                readOnly ? "bg-secondary/30 border-border" : "bg-card border-border hover:border-primary/40 hover:shadow-sm"
              )}>
                <div className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1.5">
                  <Calendar className="w-3 h-3" />
                  {t(MONTHS_SHORT_KEYS[idx])}
                </div>
                <div className="space-y-2">
                  <div>
                    <label className="text-[10px] text-blue-600 font-medium">{t('planned')}</label>
                    {readOnly ? (
                      <div className="text-sm font-semibold text-blue-600">{formatCurrency(m.planned, language)}</div>
                    ) : (
                      <Input
                        type="number"
                        className="h-8 text-xs mt-0.5 bg-blue-50/50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800 focus:border-blue-400"
                        value={m.planned || ''}
                        placeholder="0"
                        onChange={e => updateMonthlyData(item.id, type, idx, 'planned', parseFloat(e.target.value) || 0)}
                      />
                    )}
                  </div>
                  <div>
                    <label className="text-[10px] text-emerald-600 font-medium">{t('actual')}</label>
                    {readOnly ? (
                      <div className="text-sm font-semibold text-emerald-600">{formatCurrency(m.actual, language)}</div>
                    ) : (
                      <Input
                        type="number"
                        className="h-8 text-xs mt-0.5 bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800 focus:border-emerald-400"
                        value={m.actual || ''}
                        placeholder="0"
                        onChange={e => updateMonthlyData(item.id, type, idx, 'actual', parseFloat(e.target.value) || 0)}
                      />
                    )}
                  </div>
                  <div className={cn(
                    "text-[10px] font-bold text-center py-1 rounded",
                    isRevenue
                      ? (variance >= 0 ? 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30' : 'text-destructive bg-red-50 dark:bg-red-950/30')
                      : (variance <= 0 ? 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30' : 'text-destructive bg-red-50 dark:bg-red-950/30')
                  )}>
                    {variance >= 0 ? '+' : ''}{formatCurrency(variance, language)}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
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
                  <h4 className="font-semibold text-foreground text-lg">{t('revenueItems')}</h4>
                  <p className="text-sm text-muted-foreground mt-1">{t('addRevenueDesc')}</p>
                </div>
                <Button onClick={() => openCreateModal('revenue')}>
                  <Plus className="w-4 h-4 me-2" />{t('addFeatureRevenue')}
                </Button>
              </div>
              {renderSummaryTable(revenueItems, 'revenue')}
            </TabsContent>

            {/* COSTS TAB */}
            <TabsContent value="costs" className="mt-0 space-y-4">
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
                <div>
                  <h4 className="font-semibold text-foreground text-lg">{t('costItems')}</h4>
                  <p className="text-sm text-muted-foreground mt-1">{t('addCostDesc')}</p>
                </div>
                <Button variant="destructive" onClick={() => openCreateModal('cost')}>
                  <Plus className="w-4 h-4 me-2" />{t('addFeatureCost')}
                </Button>
              </div>
              {renderSummaryTable(costItems, 'cost')}
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

      {/* ── CREATE / EDIT MODAL ──────────────────────────── */}
      <Dialog open={!!createModal} onOpenChange={() => setCreateModal(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {createModal?.item ? t('editItem') : (createModal?.type === 'revenue' ? t('addFeatureRevenue') : t('addFeatureCost'))}
            </DialogTitle>
            <DialogDescription>{t('createItemDesc')}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label className="text-sm font-medium text-foreground">{t('name')}</label>
              <Input value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })}
                placeholder={createModal?.type === 'revenue' ? t('revenueNamePlaceholder') : t('costNamePlaceholder')} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-foreground">{t('year')}</label>
                <Select value={String(formData.year)} onValueChange={v => setFormData({ ...formData, year: parseInt(v) })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{[2024, 2025, 2026, 2027].map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              {createModal?.type === 'cost' && (
                <div>
                  <label className="text-sm font-medium text-foreground">{t('costCategory')}</label>
                  <Select value={formData.category} onValueChange={v => setFormData({ ...formData, category: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{COST_CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              )}
            </div>
            <div>
              <label className="text-sm font-medium text-foreground">{t('description')} ({t('optional')})</label>
              <Textarea value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })}
                placeholder={t('itemDescPlaceholder')} rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateModal(null)}>{t('cancel')}</Button>
            <Button onClick={handleSaveCreate} disabled={!formData.name.trim()}>
              {createModal?.item ? t('saveChanges') : t('createAndManage')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── MONTHLY MANAGEMENT MODAL (Edit) ──────────────── */}
      <Dialog open={!!monthlyModal} onOpenChange={() => setMonthlyModal(null)}>
        <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit className="w-5 h-5" />
              {currentMonthlyItem?.name} — {currentMonthlyItem?.year}
            </DialogTitle>
            <DialogDescription>{t('manageMonthlyData')}</DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto py-2">
            {currentMonthlyItem && monthlyModal && renderMonthlyGrid(currentMonthlyItem, monthlyModal.type)}
          </div>
          <div className="sticky bottom-0 bg-card pt-3 border-t">
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setMonthlyModal(null)}>{t('close')}</Button>
              <Button onClick={() => setMonthlyModal(null)}>{t('saveChanges')}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── VIEW MODAL (Read-only) ───────────────────────── */}
      <Dialog open={!!viewModal} onOpenChange={() => setViewModal(null)}>
        <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="w-5 h-5" />
              {currentViewItem?.name} — {currentViewItem?.year}
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto py-2">
            {currentViewItem && viewModal && renderMonthlyGrid(currentViewItem, viewModal.type, true)}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewModal(null)}>{t('close')}</Button>
            <Button onClick={() => {
              if (viewModal) {
                setMonthlyModal({ type: viewModal.type, item: viewModal.item });
                setViewModal(null);
              }
            }}>{t('edit')}</Button>
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

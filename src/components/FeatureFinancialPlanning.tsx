import { useState, useMemo } from 'react';
import { useApp } from '@/context/AppContext';
import { Feature } from '@/types';
import { formatCurrency, cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import KPICard from '@/components/KPICard';
import StatusBadge from '@/components/StatusBadge';
import {
  Dialog,
  DialogContent,
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
  ChevronDown,
  ChevronRight,
  Plus,
  Trash2,
  Edit,
  BarChart3,
  DollarSign,
  Users,
  TrendingUp,
  FileText,
} from 'lucide-react';

interface RevenueSubItem {
  id: number;
  month: string;
  year: number;
  revenuePerTransaction: number;
  plannedTransactions: number;
  actualTransactions: number;
  planned: number;
  actual: number;
}

interface RevenueItem {
  id: number;
  name: string;
  expanded: boolean;
  subItems: RevenueSubItem[];
}

interface CostSubItem {
  id: number;
  month?: string;
  year?: number;
  planned?: number;
  actual?: number;
  // Resource fields
  resourceId?: number;
  allocation?: number;
  startDate?: string;
  endDate?: string;
  costRate?: number;
}

interface CostItem {
  id: number;
  name: string;
  category: string;
  expanded: boolean;
  subItems: CostSubItem[];
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

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const COST_CATEGORIES = ['Development', 'Operation', 'Infrastructure', 'Licensing', 'Marketing', 'Resources', 'Others'];

const FeatureFinancialPlanning = ({ feature, onClose }: FeatureFinancialPlanningProps) => {
  const { state, t, language, isRTL } = useApp();
  const [tab, setTab] = useState('summary');
  const [viewPeriod, setViewPeriod] = useState('monthly');
  const [selectedYear, setSelectedYear] = useState(2025);

  // Revenue Items
  const [revenueItems, setRevenueItems] = useState<RevenueItem[]>([]);
  // Cost Items
  const [costItems, setCostItems] = useState<CostItem[]>([]);
  // Resources
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

  // Modals
  const [revenueModal, setRevenueModal] = useState<any>(null);
  const [costModal, setCostModal] = useState<any>(null);

  const product = state.products.find(p => p.id === feature.productId);
  const BackIcon = isRTL ? ArrowRight : ArrowLeft;

  // Calculate totals
  const totals = useMemo(() => {
    let plannedRevenue = 0, actualRevenue = 0;
    let plannedCost = 0, actualCost = 0;

    revenueItems.forEach(mainItem => {
      mainItem.subItems.forEach(sub => {
        if (sub.year === selectedYear) {
          plannedRevenue += (sub.plannedTransactions || 0) * (sub.revenuePerTransaction || 0);
          actualRevenue += (sub.actualTransactions || 0) * (sub.revenuePerTransaction || 0);
        }
      });
    });

    costItems.forEach(mainItem => {
      mainItem.subItems.forEach(sub => {
        if (mainItem.category === 'Resources') {
          if (sub.startDate && sub.endDate) {
            const startDate = new Date(sub.startDate);
            const endDate = new Date(sub.endDate);
            if (startDate.getFullYear() <= selectedYear && endDate.getFullYear() >= selectedYear) {
              const yearStart = new Date(selectedYear, 0, 1);
              const yearEnd = new Date(selectedYear, 11, 31);
              const overlapStart = startDate > yearStart ? startDate : yearStart;
              const overlapEnd = endDate < yearEnd ? endDate : yearEnd;
              const months = Math.ceil((overlapEnd.getTime() - overlapStart.getTime()) / (1000 * 60 * 60 * 24 * 30));
              const cost = (sub.costRate || 0) * ((sub.allocation || 0) / 100) * Math.max(1, months);
              plannedCost += cost;
              actualCost += cost;
            }
          }
        } else {
          if (sub.year === selectedYear) {
            plannedCost += (parseFloat(String(sub.planned)) || 0);
            actualCost += (parseFloat(String(sub.actual)) || 0);
          }
        }
      });
    });

    // Old-style resources
    const resourceCost = resources.reduce((sum, r) => {
      if (!r.startDate || !r.endDate) return sum;
      const startDate = new Date(r.startDate);
      const endDate = new Date(r.endDate);
      if (startDate.getFullYear() <= selectedYear && endDate.getFullYear() >= selectedYear) {
        const yearStart = new Date(selectedYear, 0, 1);
        const yearEnd = new Date(selectedYear, 11, 31);
        const overlapStart = startDate > yearStart ? startDate : yearStart;
        const overlapEnd = endDate < yearEnd ? endDate : yearEnd;
        const months = Math.ceil((overlapEnd.getTime() - overlapStart.getTime()) / (1000 * 60 * 60 * 24 * 30));
        return sum + (r.costRate * (r.allocation / 100) * Math.max(1, months));
      }
      return sum;
    }, 0);

    plannedCost += resourceCost;
    actualCost += resourceCost;

    return {
      plannedRevenue, actualRevenue,
      plannedCost, actualCost,
      plannedProfit: plannedRevenue - plannedCost,
      actualProfit: actualRevenue - actualCost,
      revenueVariance: actualRevenue - plannedRevenue,
      costVariance: actualCost - plannedCost,
      revenueAchievement: plannedRevenue > 0 ? (actualRevenue / plannedRevenue * 100) : 0,
      costAchievement: plannedCost > 0 ? (actualCost / plannedCost * 100) : 0
    };
  }, [revenueItems, costItems, resources, selectedYear]);

  // Revenue CRUD
  const addRevenueItem = () => {
    setRevenueItems([...revenueItems, { id: Date.now(), name: '', expanded: true, subItems: [] }]);
  };
  const addSubItem = (mainItemId: number) => {
    setRevenueItems(revenueItems.map(item =>
      item.id === mainItemId ? {
        ...item,
        subItems: [...item.subItems, { id: Date.now(), month: 'January', year: 2024, revenuePerTransaction: 0, plannedTransactions: 0, actualTransactions: 0, planned: 0, actual: 0 }]
      } : item
    ));
  };
  const toggleExpand = (id: number) => {
    setRevenueItems(revenueItems.map(item => item.id === id ? { ...item, expanded: !item.expanded } : item));
  };
  const updateMainItemName = (id: number, name: string) => {
    setRevenueItems(revenueItems.map(item => item.id === id ? { ...item, name } : item));
  };
  const updateSubItem = (mainId: number, subId: number, field: string, value: any) => {
    setRevenueItems(revenueItems.map(item =>
      item.id === mainId ? {
        ...item,
        subItems: item.subItems.map(sub => sub.id === subId ? { ...sub, [field]: value } : sub)
      } : item
    ));
  };
  const removeRevenueItem = (id: number) => setRevenueItems(revenueItems.filter(item => item.id !== id));
  const removeSubItem = (mainId: number, subId: number) => {
    setRevenueItems(revenueItems.map(item =>
      item.id === mainId ? { ...item, subItems: item.subItems.filter(sub => sub.id !== subId) } : item
    ));
  };

  // Cost CRUD
  const addCostItem = () => {
    setCostItems([...costItems, { id: Date.now(), name: '', category: 'Development', expanded: true, subItems: [] }]);
  };
  const addCostSubItem = (mainId: number) => {
    setCostItems(costItems.map(item => {
      if (item.id !== mainId) return item;
      if (item.category === 'Resources') {
        return { ...item, subItems: [...item.subItems, { id: Date.now(), resourceId: state.resources[0]?.id || 1, allocation: 100, startDate: '', endDate: '', costRate: 10000 }] };
      }
      return { ...item, subItems: [...item.subItems, { id: Date.now(), month: 'January', year: 2024, planned: 0, actual: 0 }] };
    }));
  };
  const toggleCostExpand = (id: number) => {
    setCostItems(costItems.map(item => item.id === id ? { ...item, expanded: !item.expanded } : item));
  };
  const updateCostMainItem = (id: number, field: string, value: any) => {
    setCostItems(costItems.map(item => item.id === id ? { ...item, [field]: value } : item));
  };
  const updateCostSubItem = (mainId: number, subId: number, field: string, value: any) => {
    setCostItems(costItems.map(item =>
      item.id === mainId ? {
        ...item,
        subItems: item.subItems.map(sub => sub.id === subId ? { ...sub, [field]: value } : sub)
      } : item
    ));
  };
  const removeCostItem = (id: number) => setCostItems(costItems.filter(item => item.id !== id));
  const removeCostSubItem = (mainId: number, subId: number) => {
    setCostItems(costItems.map(item =>
      item.id === mainId ? { ...item, subItems: item.subItems.filter(sub => sub.id !== subId) } : item
    ));
  };

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

        {/* View Period + Year */}
        <div className="flex items-center gap-3 flex-wrap">
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">{t('viewPeriod')}</label>
            <div className="flex bg-secondary rounded-lg p-1">
              {(['yearly', 'monthly', 'weekly'] as const).map(p => (
                <button key={p} onClick={() => setViewPeriod(p)}
                  className={cn("px-3 py-1.5 rounded-md text-xs font-medium transition-colors",
                    viewPeriod === p ? 'bg-card text-primary shadow-sm' : 'text-muted-foreground')}>
                  {t(p)}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">{t('year')}</label>
            <Select value={String(selectedYear)} onValueChange={v => setSelectedYear(parseInt(v))}>
              <SelectTrigger className="w-24 h-8"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="2024">2024</SelectItem>
                <SelectItem value="2025">2025</SelectItem>
                <SelectItem value="2026">2026</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-4">
        <KPICard title={t('totalRevenue')} value={formatCurrency(totals.plannedRevenue, language)} subtitle={t('expectedFromFeatures')} icon={<span className="text-lg">💰</span>} variant="green" />
        <KPICard title={t('totalCost')} value={formatCurrency(totals.plannedCost, language)} subtitle={t('resourcesCapexOpex')} icon={<span className="text-lg">💸</span>} variant="red" />
        <KPICard title={t('netProfit')} value={formatCurrency(totals.plannedProfit, language)} subtitle={`${t('margin')}: ${totals.plannedRevenue > 0 ? ((totals.plannedProfit / totals.plannedRevenue) * 100).toFixed(1) : 0}%`} icon={<span className="text-lg">✅</span>} variant={totals.plannedProfit >= 0 ? 'green' : 'red'} />
        <KPICard title={t('targetVsAchieved')} value={`${totals.revenueAchievement.toFixed(1)}%`} icon={<span className="text-lg">🎯</span>} variant="gradient" />
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
            ].map(t => (
              <TabsTrigger key={t.value} value={t.value}
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 sm:px-6 py-3 text-xs sm:text-sm whitespace-nowrap">
                {t.icon}{t.label}
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

              {/* Description */}
              <div className="bg-card rounded-xl border-2 border-border p-4 sm:p-6">
                <label className="block text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                  <span className="text-xl">📝</span>{t('description')}
                </label>
                <Textarea value={featureProfile.description} onChange={e => setFeatureProfile({ ...featureProfile, description: e.target.value })}
                  placeholder={t('featureDescPlaceholder')} rows={4} />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl border-2 border-blue-200 dark:border-blue-800 p-4 sm:p-6">
                  <label className="block text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                    <span className="text-xl">👥</span>{t('targetUser')}
                  </label>
                  <Textarea value={featureProfile.targetUser} onChange={e => setFeatureProfile({ ...featureProfile, targetUser: e.target.value })}
                    placeholder={t('targetUserPlaceholder')} rows={4} />
                </div>
                <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-xl border-2 border-emerald-200 dark:border-emerald-800 p-4 sm:p-6">
                  <label className="block text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                    <span className="text-xl">🎯</span>{t('customerSegmentation')}
                  </label>
                  <Textarea value={featureProfile.customerSegmentation} onChange={e => setFeatureProfile({ ...featureProfile, customerSegmentation: e.target.value })}
                    placeholder={t('customerSegmentationPlaceholder')} rows={4} />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                <div className="bg-purple-50 dark:bg-purple-900/20 rounded-xl border-2 border-purple-200 dark:border-purple-800 p-4 sm:p-6">
                  <label className="block text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                    <span className="text-xl">💎</span>{t('valueProposition')}
                  </label>
                  <Textarea value={featureProfile.valueProposition} onChange={e => setFeatureProfile({ ...featureProfile, valueProposition: e.target.value })}
                    placeholder={t('valuePropositionPlaceholder')} rows={4} />
                </div>
                <div className="bg-amber-50 dark:bg-amber-900/20 rounded-xl border-2 border-amber-200 dark:border-amber-800 p-4 sm:p-6">
                  <label className="block text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                    <span className="text-xl">💰</span>{t('businessModel')}
                  </label>
                  <Textarea value={featureProfile.businessModel} onChange={e => setFeatureProfile({ ...featureProfile, businessModel: e.target.value })}
                    placeholder={t('businessModelPlaceholder')} rows={4} />
                </div>
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
                    <div className="text-xl sm:text-2xl font-bold text-blue-600">{formatCurrency(totals.plannedRevenue, language)}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-sm text-muted-foreground mb-1">{t('totalCost')} ({selectedYear})</div>
                    <div className="text-xl sm:text-2xl font-bold text-red-600">{formatCurrency(totals.plannedCost, language)}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-sm text-muted-foreground mb-1">{t('netProfit')} ({selectedYear})</div>
                    <div className={cn("text-xl sm:text-2xl font-bold", totals.plannedProfit >= 0 ? 'text-emerald-600' : 'text-orange-600')}>
                      {formatCurrency(totals.plannedProfit, language)}
                    </div>
                  </div>
                </div>
                <div className="text-xs text-center text-muted-foreground mt-3">{t('viewDetailedFinancials')}</div>
              </div>
            </TabsContent>

            {/* REVENUE TAB */}
            <TabsContent value="revenue" className="mt-0 space-y-4">
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
                <div>
                  <h4 className="font-semibold text-foreground text-lg">{t('revenueItems')}</h4>
                  <p className="text-sm text-muted-foreground mt-1">{t('addRevenueCategory')}</p>
                </div>
                <Button onClick={() => setRevenueModal({ type: 'add', data: { name: '', month: 'January', year: 2024, revenuePerTransaction: 0, plannedTransactions: 0, actualTransactions: 0 } })}>
                  <Plus className="w-4 h-4 me-2" />{t('addRevenueItem')}
                </Button>
              </div>

              {revenueItems.length > 0 ? (
                <div className="space-y-4">
                  {revenueItems.map((mainItem, idx) => {
                    const mainPlanned = mainItem.subItems.reduce((sum, sub) => sum + ((sub.plannedTransactions || 0) * (sub.revenuePerTransaction || 0)), 0);
                    const mainActual = mainItem.subItems.reduce((sum, sub) => sum + ((sub.actualTransactions || 0) * (sub.revenuePerTransaction || 0)), 0);
                    const mainVariance = mainActual - mainPlanned;

                    return (
                      <div key={mainItem.id} className="bg-card rounded-lg border-2 border-border shadow-sm">
                        {/* Main Item Header */}
                        <div className="bg-blue-50 dark:bg-blue-900/20 p-3 sm:p-4 rounded-t-lg border-b-2 border-blue-200 dark:border-blue-800">
                          <div className="flex items-center gap-2 sm:gap-3">
                            <button onClick={() => toggleExpand(mainItem.id)} className="text-lg hover:bg-blue-100 dark:hover:bg-blue-800 rounded p-1 transition-colors">
                              {mainItem.expanded ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
                            </button>
                            <div className="flex-1 grid grid-cols-2 sm:grid-cols-6 gap-2 sm:gap-3 items-center">
                              <div className="col-span-2">
                                <Input value={mainItem.name} onChange={e => updateMainItemName(mainItem.id, e.target.value)}
                                  className="font-semibold" placeholder="e.g., Monthly Subscriptions" />
                              </div>
                              <div className="text-center hidden sm:block">
                                <div className="text-xs text-muted-foreground">{t('planned')}</div>
                                <div className="text-sm sm:text-base font-bold text-blue-600">{formatCurrency(mainPlanned, language)}</div>
                              </div>
                              <div className="text-center hidden sm:block">
                                <div className="text-xs text-muted-foreground">{t('actual')}</div>
                                <div className="text-sm sm:text-base font-bold text-emerald-600">{formatCurrency(mainActual, language)}</div>
                              </div>
                              <div className="text-center hidden sm:block">
                                <div className="text-xs text-muted-foreground">{t('variance')}</div>
                                <div className={cn("text-sm sm:text-base font-bold", mainVariance >= 0 ? 'text-emerald-600' : 'text-destructive')}>
                                  {mainVariance >= 0 ? '+' : ''}{formatCurrency(mainVariance, language)}
                                </div>
                              </div>
                              <div className="text-end">
                                <Button size="sm" variant="destructive" className="h-7 w-7 p-0" onClick={() => removeRevenueItem(mainItem.id)}>
                                  <Trash2 className="w-3 h-3" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Sub-items */}
                        {mainItem.expanded && (
                          <div className="p-3 sm:p-4 bg-secondary/30">
                            <div className="space-y-2">
                              {mainItem.subItems.map((subItem, subIdx) => {
                                const plannedRev = (subItem.plannedTransactions || 0) * (subItem.revenuePerTransaction || 0);
                                const actualRev = (subItem.actualTransactions || 0) * (subItem.revenuePerTransaction || 0);
                                return (
                                  <div key={subItem.id} className="bg-card rounded-lg p-3 border border-border">
                                    <div className="grid grid-cols-2 sm:grid-cols-6 lg:grid-cols-12 gap-2 items-center">
                                      <div className="text-center text-xs font-medium text-muted-foreground">{idx + 1}.{subIdx + 1}</div>
                                      <div>
                                        <Select value={subItem.month} onValueChange={v => updateSubItem(mainItem.id, subItem.id, 'month', v)}>
                                          <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                                          <SelectContent>{MONTHS.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
                                        </Select>
                                      </div>
                                      <div>
                                        <Select value={String(subItem.year)} onValueChange={v => updateSubItem(mainItem.id, subItem.id, 'year', parseInt(v))}>
                                          <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                                          <SelectContent>{[2024, 2025, 2026].map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}</SelectContent>
                                        </Select>
                                      </div>
                                      <div>
                                        <label className="block text-[10px] text-muted-foreground mb-0.5">{t('revPerTxn')}</label>
                                        <Input type="number" className="h-8 text-xs" value={subItem.revenuePerTransaction || 0}
                                          onChange={e => updateSubItem(mainItem.id, subItem.id, 'revenuePerTransaction', parseFloat(e.target.value) || 0)} />
                                      </div>
                                      <div>
                                        <label className="block text-[10px] text-muted-foreground mb-0.5">{t('planTxns')}</label>
                                        <Input type="number" className="h-8 text-xs bg-purple-50 dark:bg-purple-900/20" value={subItem.plannedTransactions || 0}
                                          onChange={e => updateSubItem(mainItem.id, subItem.id, 'plannedTransactions', parseInt(e.target.value) || 0)} />
                                      </div>
                                      <div className="col-span-2">
                                        <label className="block text-[10px] text-muted-foreground mb-0.5">{t('plannedRevenue')}</label>
                                        <div className="px-3 py-1.5 border border-border rounded-lg bg-blue-50 dark:bg-blue-900/20 text-xs font-semibold text-blue-600">
                                          {formatCurrency(plannedRev, language)}
                                        </div>
                                      </div>
                                      <div>
                                        <label className="block text-[10px] text-muted-foreground mb-0.5">{t('actTxns')}</label>
                                        <Input type="number" className="h-8 text-xs bg-purple-50 dark:bg-purple-900/20" value={subItem.actualTransactions || 0}
                                          onChange={e => updateSubItem(mainItem.id, subItem.id, 'actualTransactions', parseInt(e.target.value) || 0)} />
                                      </div>
                                      <div className="col-span-2">
                                        <label className="block text-[10px] text-muted-foreground mb-0.5">{t('actualRevenue')}</label>
                                        <div className="px-3 py-1.5 border border-border rounded-lg bg-emerald-50 dark:bg-emerald-900/20 text-xs font-semibold text-emerald-600">
                                          {formatCurrency(actualRev, language)}
                                        </div>
                                      </div>
                                      <div className="flex items-center gap-1 justify-end">
                                        <Button size="sm" variant="outline" className="h-6 w-6 p-0" onClick={() => removeSubItem(mainItem.id, subItem.id)}>
                                          <Trash2 className="w-3 h-3" />
                                        </Button>
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                            <button onClick={() => addSubItem(mainItem.id)}
                              className="mt-3 w-full px-4 py-2 bg-primary/10 text-primary rounded-lg hover:bg-primary/20 font-medium text-sm border-2 border-dashed border-primary/30">
                              {t('addMonthlyEntry')}
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-12 bg-secondary/50 rounded-lg border-2 border-dashed border-border">
                  <div className="text-4xl mb-3">💵</div>
                  <p className="text-muted-foreground mb-4">{t('noRevenueItems')}</p>
                  <Button onClick={addRevenueItem}>{t('addFirstRevenueItem')}</Button>
                </div>
              )}

              {revenueItems.length > 0 && (
                <div className="bg-gradient-to-r from-blue-50 to-emerald-50 dark:from-blue-900/20 dark:to-emerald-900/20 rounded-lg p-4 sm:p-6 border-2 border-blue-200 dark:border-blue-800">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
                    <div>
                      <div className="text-sm text-muted-foreground mb-1">{t('totalPlannedRevenue')}</div>
                      <div className="text-2xl sm:text-3xl font-bold text-blue-600">{formatCurrency(totals.plannedRevenue, language)}</div>
                      <div className="text-xs text-muted-foreground mt-1">{revenueItems.length} {t('items')}</div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground mb-1">{t('totalActualRevenue')}</div>
                      <div className="text-2xl sm:text-3xl font-bold text-emerald-600">{formatCurrency(totals.actualRevenue, language)}</div>
                      <div className="text-xs text-muted-foreground mt-1">{t('asReported')}</div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground mb-1">{t('variance')}</div>
                      <div className={cn("text-2xl sm:text-3xl font-bold", totals.revenueVariance >= 0 ? 'text-emerald-600' : 'text-destructive')}>
                        {totals.revenueVariance >= 0 ? '+' : ''}{formatCurrency(totals.revenueVariance, language)}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">{totals.revenueAchievement.toFixed(1)}% {t('achieved')}</div>
                    </div>
                  </div>
                </div>
              )}

              {/* Revenue Modal */}
              <Dialog open={!!revenueModal} onOpenChange={() => setRevenueModal(null)}>
                <DialogContent className="sm:max-w-lg">
                  <DialogHeader>
                    <DialogTitle>{revenueModal?.type === 'add' ? t('addRevenueItem') : t('editFeature')}</DialogTitle>
                  </DialogHeader>
                  {revenueModal && (
                    <div className="space-y-4 py-4">
                      <div>
                        <label className="text-sm font-semibold text-foreground">{t('revenueCategoryName')}</label>
                        <Input value={revenueModal.data.name} onChange={e => setRevenueModal({ ...revenueModal, data: { ...revenueModal.data, name: e.target.value } })}
                          placeholder="e.g., Monthly Subscriptions" />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-sm font-semibold text-foreground">{t('monthly')}</label>
                          <Select value={revenueModal.data.month} onValueChange={v => setRevenueModal({ ...revenueModal, data: { ...revenueModal.data, month: v } })}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>{MONTHS.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
                          </Select>
                        </div>
                        <div>
                          <label className="text-sm font-semibold text-foreground">{t('year')}</label>
                          <Select value={String(revenueModal.data.year)} onValueChange={v => setRevenueModal({ ...revenueModal, data: { ...revenueModal.data, year: parseInt(v) } })}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>{[2024, 2025, 2026].map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}</SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div>
                        <label className="text-sm font-semibold text-foreground">{t('revenuePerTransaction')}</label>
                        <Input type="number" value={revenueModal.data.revenuePerTransaction}
                          onChange={e => setRevenueModal({ ...revenueModal, data: { ...revenueModal.data, revenuePerTransaction: parseFloat(e.target.value) || 0 } })} />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-sm font-semibold text-foreground">{t('plannedTransactions')}</label>
                          <Input type="number" value={revenueModal.data.plannedTransactions}
                            onChange={e => setRevenueModal({ ...revenueModal, data: { ...revenueModal.data, plannedTransactions: parseInt(e.target.value) || 0 } })} />
                        </div>
                        <div>
                          <label className="text-sm font-semibold text-foreground">{t('actualTransactions')}</label>
                          <Input type="number" value={revenueModal.data.actualTransactions}
                            onChange={e => setRevenueModal({ ...revenueModal, data: { ...revenueModal.data, actualTransactions: parseInt(e.target.value) || 0 } })} />
                        </div>
                      </div>
                      <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border-2 border-blue-200 dark:border-blue-800">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <div className="text-xs text-muted-foreground mb-1">{t('plannedRevenue')}</div>
                            <div className="text-xl font-bold text-blue-600">{formatCurrency(revenueModal.data.plannedTransactions * revenueModal.data.revenuePerTransaction, language)}</div>
                          </div>
                          <div>
                            <div className="text-xs text-muted-foreground mb-1">{t('actualRevenue')}</div>
                            <div className="text-xl font-bold text-emerald-600">{formatCurrency(revenueModal.data.actualTransactions * revenueModal.data.revenuePerTransaction, language)}</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setRevenueModal(null)}>{t('cancel')}</Button>
                    <Button onClick={() => {
                      if (!revenueModal) return;
                      const plannedRev = revenueModal.data.plannedTransactions * revenueModal.data.revenuePerTransaction;
                      const actualRev = revenueModal.data.actualTransactions * revenueModal.data.revenuePerTransaction;
                      if (revenueModal.type === 'add') {
                        setRevenueItems([...revenueItems, {
                          id: Date.now(), name: revenueModal.data.name, expanded: true,
                          subItems: [{ id: Date.now(), month: revenueModal.data.month, year: revenueModal.data.year, revenuePerTransaction: revenueModal.data.revenuePerTransaction, plannedTransactions: revenueModal.data.plannedTransactions, actualTransactions: revenueModal.data.actualTransactions, planned: plannedRev, actual: actualRev }]
                        }]);
                      }
                      setRevenueModal(null);
                    }}>{t('addRevenueItem')}</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </TabsContent>

            {/* COSTS TAB */}
            <TabsContent value="costs" className="mt-0 space-y-4">
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
                <div>
                  <h4 className="font-semibold text-foreground text-lg">{t('costItems')}</h4>
                  <p className="text-sm text-muted-foreground mt-1">{t('addCostCategory')}</p>
                </div>
                <Button variant="destructive" onClick={() => setCostModal({ type: 'add', data: { name: '', category: 'Development', month: 'January', year: 2024, planned: 0, actual: 0 } })}>
                  <Plus className="w-4 h-4 me-2" />{t('addCostItem')}
                </Button>
              </div>

              {costItems.length > 0 ? (
                <div className="space-y-4">
                  {costItems.map((mainItem, idx) => {
                    let mainPlanned = 0, mainActual = 0;
                    if (mainItem.category === 'Resources') {
                      mainItem.subItems.forEach(sub => {
                        if (sub.startDate && sub.endDate) {
                          const months = Math.ceil((new Date(sub.endDate).getTime() - new Date(sub.startDate).getTime()) / (1000 * 60 * 60 * 24 * 30));
                          const cost = (sub.costRate || 0) * ((sub.allocation || 0) / 100) * Math.max(1, months);
                          mainPlanned += cost; mainActual += cost;
                        }
                      });
                    } else {
                      mainPlanned = mainItem.subItems.reduce((sum, sub) => sum + (parseFloat(String(sub.planned)) || 0), 0);
                      mainActual = mainItem.subItems.reduce((sum, sub) => sum + (parseFloat(String(sub.actual)) || 0), 0);
                    }
                    const mainVariance = mainActual - mainPlanned;

                    return (
                      <div key={mainItem.id} className="bg-card rounded-lg border-2 border-border shadow-sm">
                        <div className="bg-red-50 dark:bg-red-900/20 p-3 sm:p-4 rounded-t-lg border-b-2 border-red-200 dark:border-red-800">
                          <div className="flex items-center gap-2 sm:gap-3">
                            <button onClick={() => toggleCostExpand(mainItem.id)} className="text-lg hover:bg-red-100 dark:hover:bg-red-800 rounded p-1 transition-colors">
                              {mainItem.expanded ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
                            </button>
                            <div className="flex-1 grid grid-cols-2 sm:grid-cols-7 gap-2 items-center">
                              <div>
                                <Select value={mainItem.category} onValueChange={v => updateCostMainItem(mainItem.id, 'category', v)}>
                                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                                  <SelectContent>{COST_CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                                </Select>
                              </div>
                              <div className="col-span-1 sm:col-span-2">
                                <Input value={mainItem.name} onChange={e => updateCostMainItem(mainItem.id, 'name', e.target.value)}
                                  className="font-semibold" placeholder="e.g., Server Costs" />
                              </div>
                              <div className="text-center hidden sm:block">
                                <div className="text-xs text-muted-foreground">{t('planned')}</div>
                                <div className="text-sm font-bold text-red-600">{formatCurrency(mainPlanned, language)}</div>
                              </div>
                              <div className="text-center hidden sm:block">
                                <div className="text-xs text-muted-foreground">{t('actual')}</div>
                                <div className="text-sm font-bold text-orange-600">{formatCurrency(mainActual, language)}</div>
                              </div>
                              <div className="text-center hidden sm:block">
                                <div className="text-xs text-muted-foreground">{t('variance')}</div>
                                <div className={cn("text-sm font-bold", mainVariance <= 0 ? 'text-emerald-600' : 'text-destructive')}>
                                  {mainVariance >= 0 ? '+' : ''}{formatCurrency(mainVariance, language)}
                                </div>
                              </div>
                              <div className="text-end">
                                <Button size="sm" variant="destructive" className="h-7 w-7 p-0" onClick={() => removeCostItem(mainItem.id)}>
                                  <Trash2 className="w-3 h-3" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        </div>

                        {mainItem.expanded && (
                          <div className="p-3 sm:p-4 bg-secondary/30">
                            <div className="space-y-2">
                              {mainItem.subItems.map((subItem, subIdx) => {
                                if (mainItem.category === 'Resources') {
                                  const resource = state.resources.find(r => r.id === subItem.resourceId);
                                  const monthlyCost = (subItem.costRate || 0) * ((subItem.allocation || 0) / 100);
                                  const months = subItem.startDate && subItem.endDate ? Math.ceil((new Date(subItem.endDate).getTime() - new Date(subItem.startDate).getTime()) / (1000 * 60 * 60 * 24 * 30)) : 0;
                                  const totalCost = monthlyCost * Math.max(1, months);
                                  return (
                                    <div key={subItem.id} className="bg-primary/5 rounded-lg p-3 border-2 border-primary/20">
                                      <div className="grid grid-cols-2 sm:grid-cols-6 gap-2 items-center">
                                        <div>
                                          <label className="block text-[10px] text-muted-foreground mb-0.5">{t('resource')}</label>
                                          <Select value={String(subItem.resourceId)} onValueChange={v => updateCostSubItem(mainItem.id, subItem.id, 'resourceId', parseInt(v))}>
                                            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                                            <SelectContent>{state.resources.map(r => <SelectItem key={r.id} value={String(r.id)}>{r.name}</SelectItem>)}</SelectContent>
                                          </Select>
                                        </div>
                                        <div>
                                          <label className="block text-[10px] text-muted-foreground mb-0.5">{t('allocation')}%</label>
                                          <Input type="number" className="h-8 text-xs" value={subItem.allocation} min={0} max={100}
                                            onChange={e => updateCostSubItem(mainItem.id, subItem.id, 'allocation', parseInt(e.target.value))} />
                                        </div>
                                        <div>
                                          <label className="block text-[10px] text-muted-foreground mb-0.5">{t('startDate')}</label>
                                          <Input type="date" className="h-8 text-xs" value={subItem.startDate || ''}
                                            onChange={e => updateCostSubItem(mainItem.id, subItem.id, 'startDate', e.target.value)} />
                                        </div>
                                        <div>
                                          <label className="block text-[10px] text-muted-foreground mb-0.5">{t('endDate')}</label>
                                          <Input type="date" className="h-8 text-xs" value={subItem.endDate || ''}
                                            onChange={e => updateCostSubItem(mainItem.id, subItem.id, 'endDate', e.target.value)} />
                                        </div>
                                        <div>
                                          <label className="block text-[10px] text-muted-foreground mb-0.5">{t('costRatePerMonth')}</label>
                                          <Input type="number" className="h-8 text-xs" value={subItem.costRate}
                                            onChange={e => updateCostSubItem(mainItem.id, subItem.id, 'costRate', parseFloat(e.target.value) || 0)} />
                                        </div>
                                        <div className="flex items-center justify-between">
                                          <div>
                                            <div className="text-[10px] text-muted-foreground">{t('total')}</div>
                                            <div className="font-bold text-primary text-sm">{formatCurrency(totalCost, language)}</div>
                                          </div>
                                          <Button size="sm" variant="outline" className="h-6 w-6 p-0" onClick={() => removeCostSubItem(mainItem.id, subItem.id)}>
                                            <Trash2 className="w-3 h-3" />
                                          </Button>
                                        </div>
                                      </div>
                                    </div>
                                  );
                                }
                                // Regular cost sub-item
                                return (
                                  <div key={subItem.id} className="bg-card rounded-lg p-3 border border-border">
                                    <div className="grid grid-cols-2 sm:grid-cols-6 gap-2 items-center">
                                      <div className="text-center text-xs font-medium text-muted-foreground">{idx + 1}.{subIdx + 1}</div>
                                      <div className="grid grid-cols-2 gap-2">
                                        <Select value={subItem.month || 'January'} onValueChange={v => updateCostSubItem(mainItem.id, subItem.id, 'month', v)}>
                                          <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                                          <SelectContent>{MONTHS.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
                                        </Select>
                                        <Select value={String(subItem.year || 2024)} onValueChange={v => updateCostSubItem(mainItem.id, subItem.id, 'year', parseInt(v))}>
                                          <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                                          <SelectContent>{[2024, 2025, 2026].map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}</SelectContent>
                                        </Select>
                                      </div>
                                      <div>
                                        <label className="block text-[10px] text-muted-foreground mb-0.5">{t('plannedCost')}</label>
                                        <Input type="number" className="h-8 text-xs bg-red-50 dark:bg-red-900/20" value={subItem.planned || 0}
                                          onChange={e => updateCostSubItem(mainItem.id, subItem.id, 'planned', parseFloat(e.target.value) || 0)} />
                                      </div>
                                      <div>
                                        <label className="block text-[10px] text-muted-foreground mb-0.5">{t('actualCost')}</label>
                                        <Input type="number" className="h-8 text-xs bg-orange-50 dark:bg-orange-900/20" value={subItem.actual || 0}
                                          onChange={e => updateCostSubItem(mainItem.id, subItem.id, 'actual', parseFloat(e.target.value) || 0)} />
                                      </div>
                                      <div className="text-center">
                                        <div className="text-[10px] text-muted-foreground">{t('variance')}</div>
                                        <div className={cn("font-semibold text-xs", ((subItem.actual || 0) - (subItem.planned || 0)) <= 0 ? 'text-emerald-600' : 'text-destructive')}>
                                          {((subItem.actual || 0) - (subItem.planned || 0)) >= 0 ? '+' : ''}{formatCurrency((subItem.actual || 0) - (subItem.planned || 0), language)}
                                        </div>
                                      </div>
                                      <div className="text-end">
                                        <Button size="sm" variant="outline" className="h-6 w-6 p-0" onClick={() => removeCostSubItem(mainItem.id, subItem.id)}>
                                          <Trash2 className="w-3 h-3" />
                                        </Button>
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                            <button onClick={() => addCostSubItem(mainItem.id)}
                              className="mt-3 w-full px-4 py-2 bg-destructive/10 text-destructive rounded-lg hover:bg-destructive/20 font-medium text-sm border-2 border-dashed border-destructive/30">
                              {mainItem.category === 'Resources' ? t('addResource') : t('addMonthlyEntry')}
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-12 bg-secondary/50 rounded-lg border-2 border-dashed border-border">
                  <div className="text-4xl mb-3">💰</div>
                  <p className="text-muted-foreground mb-4">{t('noCostItems')}</p>
                  <Button variant="destructive" onClick={addCostItem}>{t('addFirstCostItem')}</Button>
                </div>
              )}

              {costItems.length > 0 && (
                <div className="bg-gradient-to-r from-red-50 to-orange-50 dark:from-red-900/20 dark:to-orange-900/20 rounded-lg p-4 sm:p-6 border-2 border-red-200 dark:border-red-800">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
                    <div>
                      <div className="text-sm text-muted-foreground mb-1">{t('totalPlannedCost')}</div>
                      <div className="text-2xl sm:text-3xl font-bold text-red-600">{formatCurrency(totals.plannedCost, language)}</div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground mb-1">{t('totalActualCost')}</div>
                      <div className="text-2xl sm:text-3xl font-bold text-orange-600">{formatCurrency(totals.actualCost, language)}</div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground mb-1">{t('variance')}</div>
                      <div className={cn("text-2xl sm:text-3xl font-bold", totals.costVariance <= 0 ? 'text-emerald-600' : 'text-destructive')}>
                        {totals.costVariance >= 0 ? '+' : ''}{formatCurrency(totals.costVariance, language)}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Cost Modal */}
              <Dialog open={!!costModal} onOpenChange={() => setCostModal(null)}>
                <DialogContent className="sm:max-w-lg">
                  <DialogHeader>
                    <DialogTitle>{costModal?.type === 'add' ? t('addCostItem') : t('editFeature')}</DialogTitle>
                  </DialogHeader>
                  {costModal && (
                    <div className="space-y-4 py-4">
                      <div>
                        <label className="text-sm font-semibold text-foreground">{t('costCategory')}</label>
                        <Select value={costModal.data.category} onValueChange={v => setCostModal({ ...costModal, data: { ...costModal.data, category: v } })}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>{COST_CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                        </Select>
                      </div>
                      <div>
                        <label className="text-sm font-semibold text-foreground">{t('costItemName')}</label>
                        <Input value={costModal.data.name} onChange={e => setCostModal({ ...costModal, data: { ...costModal.data, name: e.target.value } })}
                          placeholder="e.g., Server Costs" />
                      </div>
                      {costModal.data.category === 'Resources' ? (
                        <div className="space-y-4 border-t pt-4">
                          <h4 className="font-semibold text-foreground">{t('resourceDetails')}</h4>
                          <Select value={String(costModal.data.resourceId || state.resources[0]?.id)} onValueChange={v => setCostModal({ ...costModal, data: { ...costModal.data, resourceId: parseInt(v) } })}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>{state.resources.map(r => <SelectItem key={r.id} value={String(r.id)}>{r.name}</SelectItem>)}</SelectContent>
                          </Select>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="text-sm font-semibold text-foreground">{t('allocation')}%</label>
                              <Input type="number" value={costModal.data.allocation || 100} min={0} max={100}
                                onChange={e => setCostModal({ ...costModal, data: { ...costModal.data, allocation: parseInt(e.target.value) || 0 } })} />
                            </div>
                            <div>
                              <label className="text-sm font-semibold text-foreground">{t('costRateMonthly')}</label>
                              <Input type="number" value={costModal.data.costRate || 10000}
                                onChange={e => setCostModal({ ...costModal, data: { ...costModal.data, costRate: parseFloat(e.target.value) || 0 } })} />
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="text-sm font-semibold text-foreground">{t('startDate')}</label>
                              <Input type="date" value={costModal.data.startDate || ''}
                                onChange={e => setCostModal({ ...costModal, data: { ...costModal.data, startDate: e.target.value } })} />
                            </div>
                            <div>
                              <label className="text-sm font-semibold text-foreground">{t('endDate')}</label>
                              <Input type="date" value={costModal.data.endDate || ''}
                                onChange={e => setCostModal({ ...costModal, data: { ...costModal.data, endDate: e.target.value } })} />
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-4 border-t pt-4">
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="text-sm font-semibold text-foreground">{t('monthly')}</label>
                              <Select value={costModal.data.month} onValueChange={v => setCostModal({ ...costModal, data: { ...costModal.data, month: v } })}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>{MONTHS.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
                              </Select>
                            </div>
                            <div>
                              <label className="text-sm font-semibold text-foreground">{t('year')}</label>
                              <Select value={String(costModal.data.year)} onValueChange={v => setCostModal({ ...costModal, data: { ...costModal.data, year: parseInt(v) } })}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>{[2024, 2025, 2026].map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}</SelectContent>
                              </Select>
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="text-sm font-semibold text-foreground">{t('plannedCost')}</label>
                              <Input type="number" value={costModal.data.planned}
                                onChange={e => setCostModal({ ...costModal, data: { ...costModal.data, planned: parseFloat(e.target.value) || 0 } })} />
                            </div>
                            <div>
                              <label className="text-sm font-semibold text-foreground">{t('actualCost')}</label>
                              <Input type="number" value={costModal.data.actual}
                                onChange={e => setCostModal({ ...costModal, data: { ...costModal.data, actual: parseFloat(e.target.value) || 0 } })} />
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setCostModal(null)}>{t('cancel')}</Button>
                    <Button variant="destructive" onClick={() => {
                      if (!costModal) return;
                      if (costModal.type === 'add') {
                        const subItem = costModal.data.category === 'Resources'
                          ? { id: Date.now(), resourceId: costModal.data.resourceId || state.resources[0]?.id, allocation: costModal.data.allocation || 100, startDate: costModal.data.startDate || '', endDate: costModal.data.endDate || '', costRate: costModal.data.costRate || 10000 }
                          : { id: Date.now(), month: costModal.data.month, year: costModal.data.year, planned: costModal.data.planned, actual: costModal.data.actual };
                        setCostItems([...costItems, { id: Date.now(), name: costModal.data.name, category: costModal.data.category, expanded: true, subItems: [subItem] }]);
                      }
                      setCostModal(null);
                    }}>{t('addCostItem')}</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
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
                      const res = state.resources.find(sr => sr.id === r.resourceId);
                      const months = r.startDate && r.endDate ? Math.ceil((new Date(r.endDate).getTime() - new Date(r.startDate).getTime()) / (1000 * 60 * 60 * 24 * 30)) : 0;
                      const totalCost = r.costRate * (r.allocation / 100) * Math.max(1, months);
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
            <TabsContent value="forecast" className="mt-0 space-y-4">
              <div className="text-center py-12 bg-secondary/50 rounded-lg border-2 border-dashed border-border">
                <TrendingUp className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-foreground mb-2">{t('forecast')}</h3>
                <p className="text-sm text-muted-foreground">Coming soon — multi-year forecast with projections based on current revenue and cost trends.</p>
              </div>
            </TabsContent>
          </div>
        </div>
      </Tabs>
    </div>
  );
};

export default FeatureFinancialPlanning;

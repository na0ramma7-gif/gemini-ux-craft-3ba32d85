import { useState, useMemo } from 'react';
import { useApp } from '@/context/AppContext';
import { Product, Feature, Release } from '@/types';
import StatusBadge from '@/components/StatusBadge';
import KPICard from '@/components/KPICard';
import FeatureFinancialPlanning from '@/components/FeatureFinancialPlanning';
import ProductForecast from '@/components/ProductForecast';
import ProductOverview from '@/components/ProductOverview';
import ProductDocumentation from '@/components/ProductDocumentation';
import { formatCurrency, formatDate, formatShortDate, getPriorityColor, getGanttBarColor, getFeatureEffectiveStatus, cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  LayoutGrid,
  Map,
  DollarSign,
  FileText,
  Package,
  Plus,
  Edit,
  Trash2,
  BarChart3,
  List,
  TrendingUp
} from 'lucide-react';

interface ProductPageProps {
  product: Product;
  onBack: () => void;
}

const ProductPage = ({ product, onBack }: ProductPageProps) => {
  const { state, addFeature, updateFeature, deleteFeature, addRelease, updateRelease, t, language, isRTL } = useApp();
  const [activeTab, setActiveTab] = useState('overview');
  const [viewMode, setViewMode] = useState<'list' | 'gantt'>('list');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingFeature, setEditingFeature] = useState<Feature | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);
  const [showAddReleaseModal, setShowAddReleaseModal] = useState(false);
  const [editingRelease, setEditingRelease] = useState<Release | null>(null);
  const [newRelease, setNewRelease] = useState({ version: '', name: '', startDate: '', endDate: '', status: 'Planned' as Release['status'] });
  const [selectedFeatureForFinancials, setSelectedFeatureForFinancials] = useState<Feature | null>(null);
  
  const [newFeature, setNewFeature] = useState({
    name: '',
    startDate: '',
    endDate: '',
    status: 'To Do' as const,
    owner: '',
    priority: 'Medium' as const,
    releaseId: null as number | null
  });

  const releases = useMemo(() => 
    state.releases.filter(r => r.productId === product.id),
    [state.releases, product.id]
  );

  const features = useMemo(() =>
    state.features.filter(f => f.productId === product.id),
    [state.features, product.id]
  );

  const productMetrics = useMemo(() => {
    let totalRevenue = 0;
    let totalCost = 0;

    features.forEach(feature => {
      state.revenuePlan
        .filter(r => r.featureId === feature.id)
        .forEach(r => { totalRevenue += r.expected; });
    });

    state.costs
      .filter(c => c.productId === product.id)
      .forEach(c => {
        if (c.type === 'CAPEX' && c.total && c.amortization) {
          totalCost += (c.total / c.amortization) * 6;
        } else if (c.monthly) {
          totalCost += c.monthly * 6;
        }
      });

    const profit = totalRevenue - totalCost;
    const margin = totalRevenue > 0 ? (profit / totalRevenue) * 100 : 0;

    return {
      totalRevenue,
      totalCost,
      profit,
      margin,
      featureCount: features.length,
      releaseCount: releases.length
    };
  }, [features, state, product.id, releases.length]);

  // Gantt chart calculations
  const ganttData = useMemo(() => {
    if (features.length === 0) return { months: [], minDate: new Date(), maxDate: new Date(), totalDays: 0 };
    
    const allDates = features.flatMap(f => [new Date(f.startDate), new Date(f.endDate)]);
    const minDate = new Date(Math.min(...allDates.map(d => d.getTime())));
    const maxDate = new Date(Math.max(...allDates.map(d => d.getTime())));
    
    // Add some padding
    minDate.setDate(1);
    maxDate.setMonth(maxDate.getMonth() + 1);
    maxDate.setDate(0);
    
    const months: { label: string; date: Date }[] = [];
    const current = new Date(minDate.getFullYear(), minDate.getMonth(), 1);
    while (current <= maxDate) {
      months.push({
        label: current.toLocaleDateString(language === 'ar' ? 'ar-SA' : 'en-US', { month: 'short' }),
        date: new Date(current)
      });
      current.setMonth(current.getMonth() + 1);
    }
    
    const totalDays = Math.ceil((maxDate.getTime() - minDate.getTime()) / (1000 * 60 * 60 * 24));
    
    return { months, minDate, maxDate, totalDays };
  }, [features, language]);

  const calculateBarPosition = (startDate: string, endDate: string) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const startOffset = Math.ceil((start.getTime() - ganttData.minDate.getTime()) / (1000 * 60 * 60 * 24));
    const duration = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    
    const leftPercent = ganttData.totalDays > 0 ? (startOffset / ganttData.totalDays) * 100 : 0;
    const widthPercent = ganttData.totalDays > 0 ? Math.max((duration / ganttData.totalDays) * 100, 3) : 0;
    
    return {
      left: `${leftPercent}%`,
      width: `${widthPercent}%`
    };
  };

  const handleAddFeature = () => {
    if (!newFeature.name || !newFeature.startDate || !newFeature.endDate) return;
    
    addFeature({
      ...newFeature,
      productId: product.id,
      releaseId: newFeature.releaseId
    });
    
    setNewFeature({
      name: '',
      startDate: '',
      endDate: '',
      status: 'To Do',
      owner: '',
      priority: 'Medium',
      releaseId: null
    });
    setShowAddModal(false);
  };

  const handleUpdateFeature = () => {
    if (!editingFeature) return;
    updateFeature(editingFeature.id, editingFeature);
    setEditingFeature(null);
  };

  const handleDeleteFeature = (id: number) => {
    deleteFeature(id);
    setDeleteConfirmId(null);
  };

  const BackIcon = isRTL ? ArrowRight : ArrowLeft;

  // If a feature is selected for financial planning, show that view
  if (selectedFeatureForFinancials) {
    return (
      <FeatureFinancialPlanning
        feature={selectedFeatureForFinancials}
        onClose={() => setSelectedFeatureForFinancials(null)}
      />
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-3 sm:gap-4">
        <button
          onClick={onBack}
          className="p-2 hover:bg-secondary rounded-lg transition-colors"
        >
          <BackIcon className="w-5 h-5" />
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <span className="text-xs sm:text-sm text-muted-foreground bg-secondary px-2 py-1 rounded">
              {product.code}
            </span>
            <h1 className="text-xl sm:text-2xl font-bold text-foreground truncate">{product.name}</h1>
            <StatusBadge status={product.status} />
          </div>
          <p className="text-sm text-muted-foreground mt-1">{t('owner')}: {product.owner}</p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-4">
        <KPICard
          title={t('totalRevenue')}
          value={formatCurrency(productMetrics.totalRevenue, language)}
          subtitle={t('expectedFromFeatures')}
          icon={<span className="text-lg sm:text-2xl">💰</span>}
          variant="green"
        />
        <KPICard
          title={t('totalCost')}
          value={formatCurrency(productMetrics.totalCost, language)}
          subtitle={t('resourcesCapexOpex')}
          icon={<span className="text-lg sm:text-2xl">💸</span>}
          variant="red"
        />
        <KPICard
          title={t('netProfit')}
          value={formatCurrency(productMetrics.profit, language)}
          subtitle={`${t('margin')}: ${productMetrics.margin.toFixed(1)}%`}
          icon={<span className="text-lg sm:text-2xl">✅</span>}
          variant={productMetrics.profit >= 0 ? 'green' : 'red'}
        />
        <KPICard
          title={t('targetVsAchieved')}
          value="74%"
          icon={<span className="text-lg sm:text-2xl">🎯</span>}
          variant="gradient"
        />
        <KPICard
          title={t('features')}
          value={productMetrics.featureCount.toString()}
          subtitle={`${productMetrics.releaseCount} ${t('releases')}`}
          icon={<span className="text-lg sm:text-2xl">⭐</span>}
          variant="purple"
        />
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="bg-card rounded-xl shadow-card overflow-hidden">
          <TabsList className="w-full justify-start border-b rounded-none h-auto p-0 bg-transparent overflow-x-auto flex-nowrap">
            <TabsTrigger 
              value="overview" 
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm whitespace-nowrap"
            >
              <LayoutGrid className="w-4 h-4 me-1 sm:me-2" />
              {t('overview')}
            </TabsTrigger>
            <TabsTrigger 
              value="roadmap"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm whitespace-nowrap"
            >
              <Map className="w-4 h-4 me-1 sm:me-2" />
              {t('roadmap')}
            </TabsTrigger>
            <TabsTrigger 
              value="releases"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm whitespace-nowrap"
            >
              <Package className="w-4 h-4 me-1 sm:me-2" />
              {t('releases')}
            </TabsTrigger>
            <TabsTrigger 
              value="financials"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm whitespace-nowrap"
            >
              <DollarSign className="w-4 h-4 me-1 sm:me-2" />
              {t('financials')}
            </TabsTrigger>
            <TabsTrigger 
              value="forecast"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm whitespace-nowrap"
            >
              <TrendingUp className="w-4 h-4 me-1 sm:me-2" />
              {t('forecast')}
            </TabsTrigger>
            <TabsTrigger 
              value="docs"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm whitespace-nowrap"
            >
              <FileText className="w-4 h-4 me-1 sm:me-2" />
              {t('documentation')}
            </TabsTrigger>
          </TabsList>

          <div className="p-4 sm:p-6">
            {/* Overview Tab */}
            <TabsContent value="overview" className="mt-0">
              <ProductOverview product={product} />
            </TabsContent>

            {/* Roadmap Tab with Gantt Chart */}
            <TabsContent value="roadmap" className="mt-0 space-y-4 sm:space-y-6">
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
                <h3 className="text-base sm:text-lg font-semibold text-foreground">{t('featuresRoadmap')}</h3>
                <div className="flex items-center gap-2 sm:gap-4">
                  <Button size="sm" onClick={() => setShowAddModal(true)}>
                    <Plus className="w-4 h-4 me-1 sm:me-2" />
                    <span className="hidden sm:inline">{t('addFeature')}</span>
                    <span className="sm:hidden">+</span>
                  </Button>
                  <div className="flex bg-secondary rounded-lg p-1">
                    <button
                      onClick={() => setViewMode('gantt')}
                      className={cn(
                        "px-2 sm:px-4 py-1.5 sm:py-2 rounded-md text-xs sm:text-sm font-medium transition-colors flex items-center gap-1",
                        viewMode === 'gantt' ? 'bg-card text-primary shadow-sm' : 'text-muted-foreground'
                      )}
                    >
                      <BarChart3 className="w-3 h-3 sm:w-4 sm:h-4" />
                      <span className="hidden sm:inline">{t('ganttChart')}</span>
                    </button>
                    <button
                      onClick={() => setViewMode('list')}
                      className={cn(
                        "px-2 sm:px-4 py-1.5 sm:py-2 rounded-md text-xs sm:text-sm font-medium transition-colors flex items-center gap-1",
                        viewMode === 'list' ? 'bg-card text-primary shadow-sm' : 'text-muted-foreground'
                      )}
                    >
                      <List className="w-3 h-3 sm:w-4 sm:h-4" />
                      <span className="hidden sm:inline">{t('listView')}</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Gantt Chart View */}
              {viewMode === 'gantt' && features.length > 0 && (
                <div className="bg-secondary/30 rounded-xl p-3 sm:p-4 overflow-x-auto">
                  {/* Timeline Header */}
                  <div className="flex border-b border-border pb-2 mb-3 min-w-[600px]">
                    <div className="w-40 sm:w-48 flex-shrink-0 pe-4 font-medium text-xs sm:text-sm text-muted-foreground">
                      {t('feature')}
                    </div>
                    <div className="flex-1 flex">
                      {ganttData.months.map((month, idx) => (
                        <div 
                          key={idx} 
                          className="flex-1 text-center text-[10px] sm:text-xs font-medium text-muted-foreground border-s border-border/50 first:border-s-0"
                        >
                          {month.label}
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  {/* Gantt Rows */}
                  <div className="space-y-1 min-w-[600px]">
                    {features.map(feature => {
                      const plannedPos = calculateBarPosition(feature.startDate, feature.endDate);
                      const effectiveStatus = getFeatureEffectiveStatus(feature);

                      // Actual bar: for Delivered, show full bar; for In Progress/Delayed, show progress up to today
                      const now = new Date();
                      const featureStart = new Date(feature.startDate);
                      const featureEnd = new Date(feature.endDate);
                      const hasActual = feature.status === 'In Progress' || feature.status === 'Delivered' || effectiveStatus === 'Delayed';
                      let actualEndDate = feature.endDate;
                      if (feature.status === 'In Progress') {
                        actualEndDate = now < featureEnd ? now.toISOString().split('T')[0] : feature.endDate;
                      }
                      const actualPos = hasActual ? calculateBarPosition(feature.startDate, actualEndDate) : null;

                      return (
                        <div key={feature.id} className="flex items-center group">
                          <div className="w-40 sm:w-48 flex-shrink-0 pe-4">
                            <div className="text-xs sm:text-sm font-medium text-foreground truncate">{feature.name}</div>
                            <div className="text-[10px] text-muted-foreground">{feature.owner}</div>
                          </div>
                          <div className="flex-1 relative h-12 sm:h-14 bg-secondary/50 rounded">
                            {/* Grid lines for months */}
                            <div className="absolute inset-0 flex">
                              {ganttData.months.map((_, idx) => (
                                <div key={idx} className="flex-1 border-s border-border/30 first:border-s-0" />
                              ))}
                            </div>
                            {/* Planned Bar (top) */}
                            <div
                              className="absolute top-1 h-4 sm:h-5 rounded bg-muted-foreground/20 border border-muted-foreground/30 flex items-center px-1.5"
                              style={{ left: plannedPos.left, width: plannedPos.width }}
                              title={`${t('planned')}: ${formatShortDate(feature.startDate, language)} - ${formatShortDate(feature.endDate, language)}`}
                            >
                              <span className="truncate text-[9px] sm:text-[10px] text-muted-foreground font-medium">{feature.name}</span>
                            </div>
                            {/* Actual Bar (bottom) */}
                            {actualPos && (
                              <div
                                className={cn(
                                  "absolute bottom-1 h-4 sm:h-5 rounded flex items-center px-1.5 text-white text-[9px] sm:text-[10px] font-medium shadow-sm",
                                  getGanttBarColor(effectiveStatus)
                                )}
                                style={{ left: actualPos.left, width: actualPos.width }}
                                title={`${effectiveStatus}: ${formatShortDate(feature.startDate, language)} - ${formatShortDate(actualEndDate, language)}`}
                              >
                                <span className="truncate">{effectiveStatus}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  
                  {/* Legend */}
                  <div className="flex flex-wrap items-center gap-3 sm:gap-4 mt-4 pt-3 border-t border-border">
                    <div className="flex items-center gap-1.5">
                      <div className="w-3 h-3 rounded bg-muted-foreground/20 border border-muted-foreground/30" />
                      <span className="text-[10px] sm:text-xs text-muted-foreground">{t('planned')}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="w-3 h-3 rounded bg-muted-foreground/50" />
                      <span className="text-[10px] sm:text-xs text-muted-foreground">{t('toDo')}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="w-3 h-3 rounded bg-primary" />
                      <span className="text-[10px] sm:text-xs text-muted-foreground">{t('inProgress')}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="w-3 h-3 rounded bg-success" />
                      <span className="text-[10px] sm:text-xs text-muted-foreground">{t('delivered')}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="w-3 h-3 rounded bg-destructive" />
                      <span className="text-[10px] sm:text-xs text-muted-foreground">{t('delayed')}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* List View */}
              {viewMode === 'list' && (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[700px]">
                    <thead className="bg-secondary">
                      <tr>
                        <th className="px-3 sm:px-4 py-2 sm:py-3 text-start text-[10px] sm:text-xs font-medium text-muted-foreground uppercase">{t('feature')}</th>
                        <th className="px-3 sm:px-4 py-2 sm:py-3 text-start text-[10px] sm:text-xs font-medium text-muted-foreground uppercase">{t('release')}</th>
                        <th className="px-3 sm:px-4 py-2 sm:py-3 text-start text-[10px] sm:text-xs font-medium text-muted-foreground uppercase">{t('period')}</th>
                        <th className="px-3 sm:px-4 py-2 sm:py-3 text-center text-[10px] sm:text-xs font-medium text-muted-foreground uppercase">{t('status')}</th>
                        <th className="px-3 sm:px-4 py-2 sm:py-3 text-start text-[10px] sm:text-xs font-medium text-muted-foreground uppercase">{t('owner')}</th>
                        <th className="px-3 sm:px-4 py-2 sm:py-3 text-center text-[10px] sm:text-xs font-medium text-muted-foreground uppercase">{t('actions')}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {features.map(feature => {
                        const release = releases.find(r => r.id === feature.releaseId);
                        return (
                          <tr key={feature.id} className="hover:bg-secondary/50">
                            <td className="px-3 sm:px-4 py-2 sm:py-3">
                              <div className="font-medium text-foreground text-xs sm:text-sm">{feature.name}</div>
                              <span className={cn("text-[10px] sm:text-xs px-2 py-0.5 rounded-full", getPriorityColor(feature.priority))}>
                                {feature.priority}
                              </span>
                            </td>
                            <td className="px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm">{release?.version || 'N/A'}</td>
                            <td className="px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm">
                              {formatShortDate(feature.startDate, language)} → {formatShortDate(feature.endDate, language)}
                            </td>
                            <td className="px-3 sm:px-4 py-2 sm:py-3 text-center">
                              <StatusBadge status={feature.status} />
                            </td>
                            <td className="px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm">{feature.owner}</td>
                            <td className="px-3 sm:px-4 py-2 sm:py-3">
                              <div className="flex justify-center gap-1 sm:gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-7 w-7 sm:h-8 sm:w-8 p-0"
                                  onClick={() => setEditingFeature(feature)}
                                >
                                  <Edit className="w-3 h-3" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-7 w-7 sm:h-8 sm:w-8 p-0 text-destructive hover:bg-destructive hover:text-destructive-foreground"
                                  onClick={() => setDeleteConfirmId(feature.id)}
                                >
                                  <Trash2 className="w-3 h-3" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {features.length === 0 && (
                <div className="text-center py-12">
                  <Map className="w-12 h-12 sm:w-16 sm:h-16 text-muted-foreground mx-auto mb-4" />
                   <h3 className="text-base sm:text-lg font-semibold text-foreground mb-2">{t('noFeaturesYet')}</h3>
                   <p className="text-sm text-muted-foreground mb-4">{t('addFirstFeature')}</p>
                  <Button onClick={() => setShowAddModal(true)}>
                    <Plus className="w-4 h-4 me-2" />
                    {t('addFeature')}
                  </Button>
                </div>
              )}
            </TabsContent>

            {/* Releases Tab */}
            <TabsContent value="releases" className="mt-0 space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-base sm:text-lg font-semibold text-foreground">{t('releaseManagement')}</h3>
                <Button size="sm" onClick={() => setShowAddReleaseModal(true)} className="gap-1.5">
                  <Plus className="w-4 h-4" /> {t('addRelease')}
                </Button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                {releases.map(release => {
                  const releaseFeatures = features.filter(f => f.releaseId === release.id);
                  return (
                    <div key={release.id} className="bg-card border border-border rounded-xl p-4 sm:p-5">
                      <div className="flex justify-between items-start mb-3 sm:mb-4">
                        <div>
                          <h4 className="text-base sm:text-lg font-semibold text-foreground">{release.version}</h4>
                          <p className="text-xs sm:text-sm text-muted-foreground">{release.name}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <StatusBadge status={release.status} />
                          <button
                            onClick={() => {
                              setEditingRelease(release);
                              setNewRelease({ version: release.version, name: release.name, startDate: release.startDate, endDate: release.endDate, status: release.status });
                            }}
                            className="p-1 rounded hover:bg-muted transition-colors"
                          >
                            <Edit className="w-3.5 h-3.5 text-muted-foreground" />
                          </button>
                        </div>
                      </div>
                      <div className="space-y-1.5 sm:space-y-2 text-xs sm:text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">{t('features')}:</span>
                          <span className="font-semibold">{releaseFeatures.length}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">{t('duration')}:</span>
                          <span className="font-semibold">
                            {Math.ceil((new Date(release.endDate).getTime() - new Date(release.startDate).getTime()) / (1000 * 60 * 60 * 24))} {t('days')}
                          </span>
                        </div>
                        <div className="text-[10px] sm:text-xs text-muted-foreground mt-2">
                          {formatDate(release.startDate, language)} → {formatDate(release.endDate, language)}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Add/Edit Release Modal */}
              <Dialog open={showAddReleaseModal || !!editingRelease} onOpenChange={open => { if (!open) { setShowAddReleaseModal(false); setEditingRelease(null); setNewRelease({ version: '', name: '', startDate: '', endDate: '', status: 'Planned' }); } }}>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>{editingRelease ? t('editRelease') : t('addRelease')}</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 py-2">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <label className="text-sm font-medium text-foreground">{t('version')}</label>
                        <Input placeholder="v3.0" value={newRelease.version} onChange={e => setNewRelease(prev => ({ ...prev, version: e.target.value }))} />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-sm font-medium text-foreground">{t('name')}</label>
                        <Input placeholder="Release name" value={newRelease.name} onChange={e => setNewRelease(prev => ({ ...prev, name: e.target.value }))} />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <label className="text-sm font-medium text-foreground">{t('startDate')}</label>
                        <Input type="date" value={newRelease.startDate} onChange={e => setNewRelease(prev => ({ ...prev, startDate: e.target.value }))} />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-sm font-medium text-foreground">{t('endDate')}</label>
                        <Input type="date" value={newRelease.endDate} onChange={e => setNewRelease(prev => ({ ...prev, endDate: e.target.value }))} />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium text-foreground">{t('status')}</label>
                      <Select value={newRelease.status} onValueChange={v => setNewRelease(prev => ({ ...prev, status: v as Release['status'] }))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Planned">{t('planned')}</SelectItem>
                          <SelectItem value="In Progress">{t('inProgress')}</SelectItem>
                          <SelectItem value="Released">{t('released')}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => { setShowAddReleaseModal(false); setEditingRelease(null); setNewRelease({ version: '', name: '', startDate: '', endDate: '', status: 'Planned' }); }}>{t('cancel')}</Button>
                    <Button
                      disabled={!newRelease.version || !newRelease.name || !newRelease.startDate || !newRelease.endDate}
                      onClick={() => {
                        if (editingRelease) {
                          updateRelease(editingRelease.id, newRelease);
                          setEditingRelease(null);
                        } else {
                          addRelease({ productId: product.id, ...newRelease });
                          setShowAddReleaseModal(false);
                        }
                        setNewRelease({ version: '', name: '', startDate: '', endDate: '', status: 'Planned' });
                      }}
                    >
                      {t('save')}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </TabsContent>

            {/* Financials Tab */}
            <TabsContent value="financials" className="mt-0 space-y-6">

              {/* Revenue Table by Feature */}
              <div>
                <div className="border-b pb-3 mb-4">
                  <h3 className="text-base sm:text-lg font-bold text-foreground">💵 {t('revenue')}</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[700px]">
                    <thead className="bg-secondary">
                      <tr>
                        <th className="px-3 sm:px-4 py-2 sm:py-3 text-start text-[10px] sm:text-xs font-medium text-muted-foreground uppercase">{t('feature')}</th>
                        <th className="px-3 sm:px-4 py-2 sm:py-3 text-start text-[10px] sm:text-xs font-medium text-muted-foreground uppercase">{t('product')}</th>
                        <th className="px-3 sm:px-4 py-2 sm:py-3 text-start text-[10px] sm:text-xs font-medium text-muted-foreground uppercase">{t('portfolio')}</th>
                        <th className="px-3 sm:px-4 py-2 sm:py-3 text-center text-[10px] sm:text-xs font-medium text-muted-foreground uppercase">{t('status')}</th>
                        <th className="px-3 sm:px-4 py-2 sm:py-3 text-end text-[10px] sm:text-xs font-medium text-muted-foreground uppercase">{t('expected')}</th>
                        <th className="px-3 sm:px-4 py-2 sm:py-3 text-end text-[10px] sm:text-xs font-medium text-muted-foreground uppercase">{t('actual')}</th>
                        <th className="px-3 sm:px-4 py-2 sm:py-3 text-end text-[10px] sm:text-xs font-medium text-muted-foreground uppercase">{t('cost')}</th>
                        <th className="px-3 sm:px-4 py-2 sm:py-3 text-end text-[10px] sm:text-xs font-medium text-muted-foreground uppercase">{t('variance')}</th>
                        <th className="px-3 sm:px-4 py-2 sm:py-3 text-center text-[10px] sm:text-xs font-medium text-muted-foreground uppercase">{t('actions')}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {features.map(feature => {
                        const portfolio = state.portfolios.find(p => p.id === product.portfolioId);
                        let expected = 0, actual = 0;
                        state.revenuePlan.filter(r => r.featureId === feature.id).forEach(r => expected += r.expected);
                        state.revenueActual.filter(r => r.featureId === feature.id).forEach(r => actual += r.actual);
                        const cost = expected * 0.6;
                        const variance = actual - expected;
                        return (
                          <tr key={feature.id} className="hover:bg-secondary/50">
                            <td className="px-3 sm:px-4 py-2 sm:py-3 font-medium text-foreground text-xs sm:text-sm">{feature.name}</td>
                            <td className="px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm text-muted-foreground">{product.name}</td>
                            <td className="px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm text-muted-foreground">{portfolio?.name || 'N/A'}</td>
                            <td className="px-3 sm:px-4 py-2 sm:py-3 text-center"><StatusBadge status={feature.status} /></td>
                            <td className="px-3 sm:px-4 py-2 sm:py-3 text-end font-semibold text-primary text-xs sm:text-sm">{formatCurrency(expected, language)}</td>
                            <td className="px-3 sm:px-4 py-2 sm:py-3 text-end font-semibold text-success text-xs sm:text-sm">{formatCurrency(actual, language)}</td>
                            <td className="px-3 sm:px-4 py-2 sm:py-3 text-end font-semibold text-warning text-xs sm:text-sm">{formatCurrency(cost, language)}</td>
                            <td className="px-3 sm:px-4 py-2 sm:py-3 text-end">
                              <span className={cn("font-bold text-xs sm:text-sm", variance >= 0 ? 'text-success' : 'text-destructive')}>
                                {variance >= 0 ? '+' : ''}{formatCurrency(variance, language)}
                              </span>
                            </td>
                            <td className="px-3 sm:px-4 py-2 sm:py-3 text-center">
                              <Button size="sm" className="text-xs h-7" onClick={() => setSelectedFeatureForFinancials(feature)}>
                                {t('planFinancials')}
                              </Button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                {features.length === 0 && (
                  <div className="text-center py-12 text-muted-foreground">
                    <div className="text-4xl mb-4">💵</div>
                    <p>{t('noRevenueData')}</p>
                  </div>
                )}
              </div>
            </TabsContent>

            {/* Forecast Tab */}
            <TabsContent value="forecast" className="mt-0">
              <ProductForecast product={product} />
            </TabsContent>

            {/* Documentation Tab */}
            <TabsContent value="docs" className="mt-0">
              <ProductDocumentation product={product} />
            </TabsContent>
          </div>
        </div>
      </Tabs>

      {/* Add Feature Modal */}
      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{t('addNewFeature')}</DialogTitle>
            <DialogDescription>{t('createNewFeature')}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium text-foreground">{t('featureName')}</label>
              <Input
                value={newFeature.name}
                onChange={(e) => setNewFeature({ ...newFeature, name: e.target.value })}
                placeholder={t('enterFeatureName')}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-foreground">{t('startDate')}</label>
                <Input
                  type="date"
                  value={newFeature.startDate}
                  onChange={(e) => setNewFeature({ ...newFeature, startDate: e.target.value })}
                />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground">{t('endDate')}</label>
                <Input
                  type="date"
                  value={newFeature.endDate}
                  onChange={(e) => setNewFeature({ ...newFeature, endDate: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-foreground">{t('status')}</label>
                <Select
                  value={newFeature.status}
                  onValueChange={(value) => setNewFeature({ ...newFeature, status: value as any })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="To Do">{t('toDo')}</SelectItem>
                    <SelectItem value="In Progress">{t('inProgress')}</SelectItem>
                    <SelectItem value="Delivered">{t('delivered')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium text-foreground">{t('priority')}</label>
                <Select
                  value={newFeature.priority}
                  onValueChange={(value) => setNewFeature({ ...newFeature, priority: value as any })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="High">{t('high')}</SelectItem>
                    <SelectItem value="Medium">{t('medium')}</SelectItem>
                    <SelectItem value="Low">{t('low')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-foreground">{t('owner')}</label>
              <Input
                value={newFeature.owner}
                onChange={(e) => setNewFeature({ ...newFeature, owner: e.target.value })}
                placeholder={t('enterOwnerName')}
              />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground">{t('release')}</label>
              <Select
                value={newFeature.releaseId?.toString() || 'none'}
                onValueChange={(value) => setNewFeature({ ...newFeature, releaseId: value === 'none' ? null : parseInt(value) })}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('selectRelease')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">{t('noRelease')}</SelectItem>
                  {releases.map(release => (
                    <SelectItem key={release.id} value={release.id.toString()}>
                      {release.version} - {release.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddModal(false)}>{t('cancel')}</Button>
            <Button onClick={handleAddFeature}>{t('addFeature')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Feature Modal */}
      <Dialog open={!!editingFeature} onOpenChange={() => setEditingFeature(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{t('editFeature')}</DialogTitle>
            <DialogDescription>{t('updateFeatureDetails')}</DialogDescription>
          </DialogHeader>
          {editingFeature && (
            <div className="space-y-4 py-4">
              <div>
                <label className="text-sm font-medium text-foreground">{t('featureName')}</label>
                <Input
                  value={editingFeature.name}
                  onChange={(e) => setEditingFeature({ ...editingFeature, name: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-foreground">{t('startDate')}</label>
                  <Input
                    type="date"
                    value={editingFeature.startDate}
                    onChange={(e) => setEditingFeature({ ...editingFeature, startDate: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground">{t('endDate')}</label>
                  <Input
                    type="date"
                    value={editingFeature.endDate}
                    onChange={(e) => setEditingFeature({ ...editingFeature, endDate: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-foreground">{t('status')}</label>
                  <Select
                    value={editingFeature.status}
                    onValueChange={(value) => setEditingFeature({ ...editingFeature, status: value as any })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="To Do">{t('toDo')}</SelectItem>
                      <SelectItem value="In Progress">{t('inProgress')}</SelectItem>
                      <SelectItem value="Delivered">{t('delivered')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground">{t('priority')}</label>
                  <Select
                    value={editingFeature.priority}
                    onValueChange={(value) => setEditingFeature({ ...editingFeature, priority: value as any })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="High">{t('high')}</SelectItem>
                      <SelectItem value="Medium">{t('medium')}</SelectItem>
                      <SelectItem value="Low">{t('low')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-foreground">{t('owner')}</label>
                <Input
                  value={editingFeature.owner}
                  onChange={(e) => setEditingFeature({ ...editingFeature, owner: e.target.value })}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingFeature(null)}>{t('cancel')}</Button>
            <Button onClick={handleUpdateFeature}>{t('saveChanges')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <Dialog open={!!deleteConfirmId} onOpenChange={() => setDeleteConfirmId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('deleteFeature')}</DialogTitle>
            <DialogDescription>
              {t('confirmDeleteFeature')}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirmId(null)}>{t('cancel')}</Button>
            <Button
              variant="destructive"
              onClick={() => deleteConfirmId && handleDeleteFeature(deleteConfirmId)}
            >
              {t('delete')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ProductPage;

import { useState, useMemo } from 'react';
import { useApp } from '@/context/AppContext';
import { Product, Feature } from '@/types';
import StatusBadge from '@/components/StatusBadge';
import KPICard from '@/components/KPICard';
import { formatCurrency, formatDate, getPriorityColor, cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
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
  LayoutGrid,
  Map,
  Users,
  DollarSign,
  FileText,
  Package,
  Plus,
  Edit,
  Trash2,
  Calendar,
  BarChart3,
  List
} from 'lucide-react';

interface ProductPageProps {
  product: Product;
  onBack: () => void;
}

const ProductPage = ({ product, onBack }: ProductPageProps) => {
  const { state, addFeature, updateFeature, deleteFeature } = useApp();
  const [activeTab, setActiveTab] = useState('overview');
  const [viewMode, setViewMode] = useState<'list' | 'gantt'>('list');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingFeature, setEditingFeature] = useState<Feature | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);
  
  const [newFeature, setNewFeature] = useState({
    name: '',
    startDate: '',
    endDate: '',
    status: 'Planned' as const,
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
      status: 'Planned',
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

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={onBack}
          className="p-2 hover:bg-secondary rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground bg-secondary px-2 py-1 rounded">
              {product.code}
            </span>
            <h1 className="text-2xl font-bold text-foreground">{product.name}</h1>
            <StatusBadge status={product.status} />
          </div>
          <p className="text-muted-foreground mt-1">Owner: {product.owner}</p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <KPICard
          title="Total Revenue"
          value={formatCurrency(productMetrics.totalRevenue)}
          subtitle="Expected from features"
          icon={<span className="text-2xl">💰</span>}
          variant="green"
        />
        <KPICard
          title="Total Cost"
          value={formatCurrency(productMetrics.totalCost)}
          subtitle="Resources + CAPEX + OPEX"
          icon={<span className="text-2xl">💸</span>}
          variant="red"
        />
        <KPICard
          title="Net Profit"
          value={formatCurrency(productMetrics.profit)}
          subtitle={`Margin: ${productMetrics.margin.toFixed(1)}%`}
          icon={<span className="text-2xl">✅</span>}
          variant={productMetrics.profit >= 0 ? 'green' : 'red'}
        />
        <KPICard
          title="Target vs Achieved"
          value="74%"
          icon={<span className="text-2xl">🎯</span>}
          variant="gradient"
        />
        <KPICard
          title="Features"
          value={productMetrics.featureCount.toString()}
          subtitle={`${productMetrics.releaseCount} releases`}
          icon={<span className="text-2xl">⭐</span>}
          variant="purple"
        />
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="bg-card rounded-xl shadow-card">
          <TabsList className="w-full justify-start border-b rounded-none h-auto p-0 bg-transparent">
            <TabsTrigger 
              value="overview" 
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-6 py-4"
            >
              <LayoutGrid className="w-4 h-4 mr-2" />
              Overview
            </TabsTrigger>
            <TabsTrigger 
              value="roadmap"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-6 py-4"
            >
              <Map className="w-4 h-4 mr-2" />
              Roadmap
            </TabsTrigger>
            <TabsTrigger 
              value="releases"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-6 py-4"
            >
              <Package className="w-4 h-4 mr-2" />
              Releases
            </TabsTrigger>
            <TabsTrigger 
              value="financials"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-6 py-4"
            >
              <DollarSign className="w-4 h-4 mr-2" />
              Financials
            </TabsTrigger>
            <TabsTrigger 
              value="docs"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-6 py-4"
            >
              <FileText className="w-4 h-4 mr-2" />
              Documentation
            </TabsTrigger>
          </TabsList>

          <div className="p-6">
            {/* Overview Tab */}
            <TabsContent value="overview" className="mt-0 space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-foreground mb-3">Releases</h3>
                <div className="space-y-3">
                  {releases.map(release => (
                    <div key={release.id} className="flex items-center justify-between p-4 bg-secondary/50 rounded-lg hover:bg-secondary transition-colors">
                      <div>
                        <div className="font-semibold text-foreground">{release.version} - {release.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {formatDate(release.startDate)} → {formatDate(release.endDate)}
                        </div>
                      </div>
                      <StatusBadge status={release.status} />
                    </div>
                  ))}
                </div>
              </div>
            </TabsContent>

            {/* Roadmap Tab */}
            <TabsContent value="roadmap" className="mt-0 space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold text-foreground">Features Roadmap</h3>
                <div className="flex items-center gap-4">
                  <Button onClick={() => setShowAddModal(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Feature
                  </Button>
                  <div className="flex bg-secondary rounded-lg p-1">
                    <button
                      onClick={() => setViewMode('gantt')}
                      className={cn(
                        "px-4 py-2 rounded-md text-sm font-medium transition-colors",
                        viewMode === 'gantt' ? 'bg-card text-primary shadow-sm' : 'text-muted-foreground'
                      )}
                    >
                      <BarChart3 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setViewMode('list')}
                      className={cn(
                        "px-4 py-2 rounded-md text-sm font-medium transition-colors",
                        viewMode === 'list' ? 'bg-card text-primary shadow-sm' : 'text-muted-foreground'
                      )}
                    >
                      <List className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Features Table */}
              <div className="overflow-x-auto">
                <table className="w-full min-w-[800px]">
                  <thead className="bg-secondary">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Feature</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Release</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Period</th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-muted-foreground uppercase">Status</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Owner</th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-muted-foreground uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {features.map(feature => {
                      const release = releases.find(r => r.id === feature.releaseId);
                      return (
                        <tr key={feature.id} className="hover:bg-secondary/50">
                          <td className="px-4 py-3">
                            <div className="font-medium text-foreground">{feature.name}</div>
                            <span className={cn("text-xs px-2 py-0.5 rounded-full", getPriorityColor(feature.priority))}>
                              {feature.priority}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm">{release?.version || 'N/A'}</td>
                          <td className="px-4 py-3 text-sm">
                            {formatDate(feature.startDate)} → {formatDate(feature.endDate)}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <StatusBadge status={feature.status} />
                          </td>
                          <td className="px-4 py-3 text-sm">{feature.owner}</td>
                          <td className="px-4 py-3">
                            <div className="flex justify-center gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setEditingFeature(feature)}
                              >
                                <Edit className="w-3 h-3" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-destructive hover:bg-destructive hover:text-destructive-foreground"
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
            </TabsContent>

            {/* Releases Tab */}
            <TabsContent value="releases" className="mt-0 space-y-4">
              <h3 className="text-lg font-semibold text-foreground">Release Management</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {releases.map(release => {
                  const releaseFeatures = features.filter(f => f.releaseId === release.id);
                  return (
                    <div key={release.id} className="bg-card border border-border rounded-xl p-5">
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <h4 className="text-lg font-semibold text-foreground">{release.version}</h4>
                          <p className="text-sm text-muted-foreground">{release.name}</p>
                        </div>
                        <StatusBadge status={release.status} />
                      </div>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Features:</span>
                          <span className="font-semibold">{releaseFeatures.length}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Duration:</span>
                          <span className="font-semibold">
                            {Math.ceil((new Date(release.endDate).getTime() - new Date(release.startDate).getTime()) / (1000 * 60 * 60 * 24))} days
                          </span>
                        </div>
                        <div className="text-xs text-muted-foreground mt-2">
                          {formatDate(release.startDate)} → {formatDate(release.endDate)}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </TabsContent>

            {/* Financials Tab */}
            <TabsContent value="financials" className="mt-0">
              <h3 className="text-lg font-semibold text-foreground mb-4">Financial Overview</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-xl p-6 border border-emerald-200 dark:border-emerald-800">
                  <h4 className="text-sm font-medium text-emerald-800 dark:text-emerald-400 mb-2">Total Revenue</h4>
                  <div className="text-3xl font-bold text-emerald-600">{formatCurrency(productMetrics.totalRevenue)}</div>
                </div>
                <div className="bg-red-50 dark:bg-red-900/20 rounded-xl p-6 border border-red-200 dark:border-red-800">
                  <h4 className="text-sm font-medium text-red-800 dark:text-red-400 mb-2">Total Cost</h4>
                  <div className="text-3xl font-bold text-red-600">{formatCurrency(productMetrics.totalCost)}</div>
                </div>
                <div className={cn(
                  "rounded-xl p-6 border",
                  productMetrics.profit >= 0
                    ? "bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800"
                    : "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800"
                )}>
                  <h4 className={cn(
                    "text-sm font-medium mb-2",
                    productMetrics.profit >= 0 ? "text-emerald-800 dark:text-emerald-400" : "text-red-800 dark:text-red-400"
                  )}>Net Profit</h4>
                  <div className={cn(
                    "text-3xl font-bold",
                    productMetrics.profit >= 0 ? "text-emerald-600" : "text-red-600"
                  )}>
                    {formatCurrency(productMetrics.profit)}
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* Documentation Tab */}
            <TabsContent value="docs" className="mt-0">
              <div className="text-center py-12">
                <FileText className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-foreground mb-2">No documents yet</h3>
                <p className="text-muted-foreground mb-4">Upload documents to keep your project organized</p>
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Upload Document
                </Button>
              </div>
            </TabsContent>
          </div>
        </div>
      </Tabs>

      {/* Add Feature Modal */}
      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Add New Feature</DialogTitle>
            <DialogDescription>Create a new feature for this product</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium text-foreground">Feature Name</label>
              <Input
                value={newFeature.name}
                onChange={(e) => setNewFeature({ ...newFeature, name: e.target.value })}
                placeholder="Enter feature name"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-foreground">Start Date</label>
                <Input
                  type="date"
                  value={newFeature.startDate}
                  onChange={(e) => setNewFeature({ ...newFeature, startDate: e.target.value })}
                />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground">End Date</label>
                <Input
                  type="date"
                  value={newFeature.endDate}
                  onChange={(e) => setNewFeature({ ...newFeature, endDate: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-foreground">Status</label>
                <Select
                  value={newFeature.status}
                  onValueChange={(value) => setNewFeature({ ...newFeature, status: value as any })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Planned">Planned</SelectItem>
                    <SelectItem value="In Progress">In Progress</SelectItem>
                    <SelectItem value="Delivered">Delivered</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium text-foreground">Priority</label>
                <Select
                  value={newFeature.priority}
                  onValueChange={(value) => setNewFeature({ ...newFeature, priority: value as any })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="High">High</SelectItem>
                    <SelectItem value="Medium">Medium</SelectItem>
                    <SelectItem value="Low">Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-foreground">Owner</label>
              <Input
                value={newFeature.owner}
                onChange={(e) => setNewFeature({ ...newFeature, owner: e.target.value })}
                placeholder="Enter owner name"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground">Release</label>
              <Select
                value={newFeature.releaseId?.toString() || 'none'}
                onValueChange={(value) => setNewFeature({ ...newFeature, releaseId: value === 'none' ? null : parseInt(value) })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select release" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No Release</SelectItem>
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
            <Button variant="outline" onClick={() => setShowAddModal(false)}>Cancel</Button>
            <Button onClick={handleAddFeature}>Add Feature</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Feature Modal */}
      <Dialog open={!!editingFeature} onOpenChange={() => setEditingFeature(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Feature</DialogTitle>
            <DialogDescription>Update feature details</DialogDescription>
          </DialogHeader>
          {editingFeature && (
            <div className="space-y-4 py-4">
              <div>
                <label className="text-sm font-medium text-foreground">Feature Name</label>
                <Input
                  value={editingFeature.name}
                  onChange={(e) => setEditingFeature({ ...editingFeature, name: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-foreground">Start Date</label>
                  <Input
                    type="date"
                    value={editingFeature.startDate}
                    onChange={(e) => setEditingFeature({ ...editingFeature, startDate: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground">End Date</label>
                  <Input
                    type="date"
                    value={editingFeature.endDate}
                    onChange={(e) => setEditingFeature({ ...editingFeature, endDate: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-foreground">Status</label>
                  <Select
                    value={editingFeature.status}
                    onValueChange={(value) => setEditingFeature({ ...editingFeature, status: value as any })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Planned">Planned</SelectItem>
                      <SelectItem value="In Progress">In Progress</SelectItem>
                      <SelectItem value="Delivered">Delivered</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground">Priority</label>
                  <Select
                    value={editingFeature.priority}
                    onValueChange={(value) => setEditingFeature({ ...editingFeature, priority: value as any })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="High">High</SelectItem>
                      <SelectItem value="Medium">Medium</SelectItem>
                      <SelectItem value="Low">Low</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-foreground">Owner</label>
                <Input
                  value={editingFeature.owner}
                  onChange={(e) => setEditingFeature({ ...editingFeature, owner: e.target.value })}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingFeature(null)}>Cancel</Button>
            <Button onClick={handleUpdateFeature}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <Dialog open={!!deleteConfirmId} onOpenChange={() => setDeleteConfirmId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Feature</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this feature? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirmId(null)}>Cancel</Button>
            <Button
              variant="destructive"
              onClick={() => deleteConfirmId && handleDeleteFeature(deleteConfirmId)}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ProductPage;

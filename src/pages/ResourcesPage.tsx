import { useState, useMemo } from 'react';
import { useApp } from '@/context/AppContext';
import { formatCurrency, formatDate, cn } from '@/lib/utils';
import StatusBadge from '@/components/StatusBadge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Users, Calendar, Plus, Trash2, BarChart3, Edit, MoreHorizontal } from 'lucide-react';

const ResourcesPage = () => {
  const { state, addResource, updateResource, deleteResource, addAssignment, deleteAssignment, t, language } = useApp();
  const [activeTab, setActiveTab] = useState('directory');
  const [showAddResourceModal, setShowAddResourceModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);
  const [deleteResourceConfirmId, setDeleteResourceConfirmId] = useState<number | null>(null);
  const [editingResource, setEditingResource] = useState<number | null>(null);

  const [newResource, setNewResource] = useState({ name: '', role: '', costRate: 0, capacity: 40, status: 'Active' as 'Active' | 'Inactive' });
  const [newAssignment, setNewAssignment] = useState({ resourceId: 0, portfolioId: 0, productId: 0, releaseId: 0, startDate: '', endDate: '', utilization: 50 });

  const getUtilization = (resourceId: number): number => {
    return state.assignments.filter(a => a.resourceId === resourceId).reduce((sum, a) => sum + a.utilization, 0);
  };

  const utilizationData = useMemo(() => {
    return state.resources.map(resource => ({
      resource, utilization: getUtilization(resource.id),
      assignments: state.assignments.filter(a => a.resourceId === resource.id)
    })).sort((a, b) => b.utilization - a.utilization);
  }, [state]);

  const handleAddOrUpdateResource = () => {
    if (!newResource.name || !newResource.role) return;
    if (editingResource) {
      updateResource(editingResource, newResource);
      setEditingResource(null);
    } else {
      addResource(newResource);
    }
    setNewResource({ name: '', role: '', costRate: 0, capacity: 40, status: 'Active' });
    setShowAddResourceModal(false);
  };

  const openEditResource = (resource: typeof state.resources[0]) => {
    setEditingResource(resource.id);
    setNewResource({ name: resource.name, role: resource.role, costRate: resource.costRate, capacity: resource.capacity, status: resource.status });
    setShowAddResourceModal(true);
  };

  const handleDeleteResource = (id: number) => { deleteResource(id); setDeleteResourceConfirmId(null); };

  const handleAssignResource = () => {
    if (!newAssignment.resourceId || !newAssignment.productId) return;
    addAssignment(newAssignment);
    setNewAssignment({ resourceId: 0, portfolioId: 0, productId: 0, releaseId: 0, startDate: '', endDate: '', utilization: 50 });
    setShowAssignModal(false);
  };

  const handleDeleteAssignment = (id: number) => { deleteAssignment(id); setDeleteConfirmId(null); };
  const openAssignModal = (resourceId: number) => { setNewAssignment({ ...newAssignment, resourceId }); setShowAssignModal(true); };

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-foreground">{t('resourceManagementTitle')}</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{t('manageTeamMembers')}</p>
        </div>
        <Button size="sm" onClick={() => setShowAddResourceModal(true)}>
          <Plus className="w-4 h-4 me-1.5" />{t('addResource')}
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-card rounded-xl p-4 text-center border border-border shadow-card">
          <div className="text-xs text-muted-foreground mb-1">{t('available')}</div>
          <div className="text-2xl font-bold text-success">{utilizationData.filter(u => u.utilization < 80).length}</div>
          <div className="text-xs text-muted-foreground mt-1">{t('lessThan80')}</div>
        </div>
        <div className="bg-card rounded-xl p-4 text-center border border-border shadow-card">
          <div className="text-xs text-muted-foreground mb-1">{t('nearCapacity')}</div>
          <div className="text-2xl font-bold text-warning">{utilizationData.filter(u => u.utilization >= 80 && u.utilization <= 100).length}</div>
          <div className="text-xs text-muted-foreground mt-1">{t('between80And100')}</div>
        </div>
        <div className="bg-card rounded-xl p-4 text-center border border-border shadow-card">
          <div className="text-xs text-muted-foreground mb-1">{t('overAllocated')}</div>
          <div className="text-2xl font-bold text-destructive">{utilizationData.filter(u => u.utilization > 100).length}</div>
          <div className="text-xs text-muted-foreground mt-1">{t('moreThan100')}</div>
        </div>
        <div className="bg-card rounded-xl p-4 text-center border border-border shadow-card">
          <div className="text-xs text-muted-foreground mb-1">{t('avgUtilization')}</div>
          <div className="text-2xl font-bold text-primary">
            {utilizationData.length > 0 ? Math.round(utilizationData.reduce((s, u) => s + u.utilization, 0) / utilizationData.length) : 0}%
          </div>
          <div className="text-xs text-muted-foreground mt-1">{t('acrossAllResources')}</div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="bg-card rounded-xl shadow-card overflow-hidden">
          <TabsList className="w-full justify-start border-b rounded-none h-auto p-0 bg-transparent overflow-x-auto flex-nowrap">
            {[
              { value: 'directory', icon: <Users className="w-4 h-4 me-1.5" />, label: t('directory') },
              { value: 'assignments', icon: <Calendar className="w-4 h-4 me-1.5" />, label: t('assignments') },
              { value: 'utilization', icon: <BarChart3 className="w-4 h-4 me-1.5" />, label: t('utilization') },
            ].map(tab => (
              <TabsTrigger key={tab.value} value={tab.value}
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-5 py-3 text-sm whitespace-nowrap">
                {tab.icon}{tab.label}
              </TabsTrigger>
            ))}
          </TabsList>

          <div className="p-5">
            {/* Directory */}
            <TabsContent value="directory" className="mt-0">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[600px]">
                  <thead className="bg-secondary/50">
                    <tr>
                      <th className="px-4 py-2.5 text-start text-xs font-medium text-muted-foreground uppercase">{t('name')}</th>
                      <th className="px-4 py-2.5 text-start text-xs font-medium text-muted-foreground uppercase">{t('role')}</th>
                      <th className="px-4 py-2.5 text-end text-xs font-medium text-muted-foreground uppercase">{t('costRate')}</th>
                      <th className="px-4 py-2.5 text-end text-xs font-medium text-muted-foreground uppercase">{t('utilization')}</th>
                      <th className="px-4 py-2.5 text-center text-xs font-medium text-muted-foreground uppercase">{t('status')}</th>
                      <th className="px-4 py-2.5 text-center text-xs font-medium text-muted-foreground uppercase">{t('actions')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {state.resources.map(resource => {
                      const utilization = getUtilization(resource.id);
                      const isOverAllocated = utilization > 100;
                      return (
                        <tr key={resource.id} className="hover:bg-secondary/30">
                          <td className="px-4 py-2.5 font-medium text-foreground text-sm">{resource.name}</td>
                          <td className="px-4 py-2.5 text-sm text-muted-foreground">{resource.role}</td>
                          <td className="px-4 py-2.5 text-end font-semibold text-sm">{formatCurrency(resource.costRate, language)}/mo</td>
                          <td className="px-4 py-2.5 text-end">
                            <div className={cn("font-bold text-sm", isOverAllocated ? 'text-destructive' : utilization > 80 ? 'text-warning' : 'text-success')}>{utilization}%</div>
                            {isOverAllocated && <div className="text-xs text-destructive">{t('overAllocated')}!</div>}
                          </td>
                          <td className="px-4 py-2.5 text-center"><StatusBadge status={resource.status} /></td>
                          <td className="px-4 py-2.5 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => openAssignModal(resource.id)}>{t('assign')}</Button>
                              <Button size="sm" variant="outline" className="h-7 w-7 p-0" onClick={() => openEditResource(resource)}>
                                <Edit className="w-3 h-3" />
                              </Button>
                              <Button size="sm" variant="outline" className="h-7 w-7 p-0 text-destructive hover:bg-destructive hover:text-destructive-foreground" onClick={() => setDeleteResourceConfirmId(resource.id)}>
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

            {/* Assignments */}
            <TabsContent value="assignments" className="mt-0">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[700px]">
                  <thead className="bg-secondary/50">
                    <tr>
                      <th className="px-4 py-2.5 text-start text-xs font-medium text-muted-foreground uppercase">{t('name')}</th>
                      <th className="px-4 py-2.5 text-start text-xs font-medium text-muted-foreground uppercase">{t('product')}</th>
                      <th className="px-4 py-2.5 text-start text-xs font-medium text-muted-foreground uppercase">{t('release')}</th>
                      <th className="px-4 py-2.5 text-start text-xs font-medium text-muted-foreground uppercase">{t('period')}</th>
                      <th className="px-4 py-2.5 text-end text-xs font-medium text-muted-foreground uppercase">{t('utilization')}</th>
                      <th className="px-4 py-2.5 text-end text-xs font-medium text-muted-foreground uppercase">{t('monthlyCost')}</th>
                      <th className="px-4 py-2.5 text-center text-xs font-medium text-muted-foreground uppercase">{t('actions')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {state.assignments.map(assignment => {
                      const resource = state.resources.find(r => r.id === assignment.resourceId);
                      const release = state.releases.find(r => r.id === assignment.releaseId);
                      const product = state.products.find(p => p.id === assignment.productId);
                      const monthlyCost = resource ? resource.costRate * (assignment.utilization / 100) : 0;
                      return (
                        <tr key={assignment.id} className="hover:bg-secondary/30">
                          <td className="px-4 py-2.5">
                            <div className="font-medium text-foreground text-sm">{resource?.name}</div>
                            <div className="text-xs text-muted-foreground">{resource?.role}</div>
                          </td>
                          <td className="px-4 py-2.5 text-sm">{product?.name || 'N/A'}</td>
                          <td className="px-4 py-2.5 text-sm">{release?.version || 'N/A'}</td>
                          <td className="px-4 py-2.5 text-sm">
                            <div>{formatDate(assignment.startDate, language)}</div>
                            <div className="text-muted-foreground">→ {formatDate(assignment.endDate, language)}</div>
                          </td>
                          <td className="px-4 py-2.5 text-end font-semibold text-primary text-sm">{assignment.utilization}%</td>
                          <td className="px-4 py-2.5 text-end font-bold text-revenue text-sm">{formatCurrency(monthlyCost, language)}</td>
                          <td className="px-4 py-2.5 text-center">
                            <Button size="sm" variant="outline" className="h-7 w-7 p-0 text-destructive hover:bg-destructive hover:text-destructive-foreground" onClick={() => setDeleteConfirmId(assignment.id)}>
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </TabsContent>

            {/* Utilization */}
            <TabsContent value="utilization" className="mt-0 space-y-3">
              {utilizationData.map(({ resource, utilization, assignments }) => {
                const isOverAllocated = utilization > 100;
                const cappedUtilization = Math.min(utilization, 100);
                return (
                  <div key={resource.id} className="border border-border rounded-xl p-4">
                    <div className="flex justify-between items-center mb-2">
                      <div>
                        <div className="font-semibold text-foreground text-sm">{resource.name}</div>
                        <div className="text-xs text-muted-foreground">{resource.role}</div>
                      </div>
                      <div className="text-end">
                        <div className={cn("text-xl font-bold", isOverAllocated ? 'text-destructive' : utilization > 80 ? 'text-warning' : 'text-success')}>{utilization}%</div>
                        <div className="text-xs text-muted-foreground">{assignments.length} {assignments.length === 1 ? t('assignment') : t('assignmentPlural')}</div>
                      </div>
                    </div>
                    <div className="relative w-full h-5 bg-secondary rounded-full overflow-hidden">
                      <div className={cn("h-full transition-all", isOverAllocated ? 'bg-destructive' : utilization > 80 ? 'bg-warning' : 'bg-success')} style={{ width: `${cappedUtilization}%` }} />
                      {isOverAllocated && <div className="absolute end-2 top-0.5 text-xs font-semibold text-destructive-foreground">{t('overBy')} {utilization - 100}%</div>}
                    </div>
                    {assignments.length > 0 && (
                      <div className="mt-2 space-y-1">
                        {assignments.map(a => {
                          const release = state.releases.find(r => r.id === a.releaseId);
                          const product = state.products.find(p => p.id === a.productId);
                          return (
                            <div key={a.id} className="flex justify-between text-xs text-muted-foreground">
                              <span>{product?.name} - {release?.version}</span>
                              <span className="font-semibold">{a.utilization}%</span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </TabsContent>
          </div>
        </div>
      </Tabs>

      {/* Add Resource Modal */}
      <Dialog open={showAddResourceModal} onOpenChange={setShowAddResourceModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t('addNewResource')}</DialogTitle>
            <DialogDescription>{t('addTeamMember')}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium text-foreground">{t('name')}</label>
              <Input value={newResource.name} onChange={(e) => setNewResource({ ...newResource, name: e.target.value })} placeholder={t('enterName')} />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground">{t('role')}</label>
              <Input value={newResource.role} onChange={(e) => setNewResource({ ...newResource, role: e.target.value })} placeholder={t('enterRole')} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-foreground">{t('costRateMonthly')}</label>
                <Input type="number" value={newResource.costRate} onChange={(e) => setNewResource({ ...newResource, costRate: parseInt(e.target.value) || 0 })} />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground">{t('capacityHrsWeek')}</label>
                <Input type="number" value={newResource.capacity} onChange={(e) => setNewResource({ ...newResource, capacity: parseInt(e.target.value) || 40 })} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddResourceModal(false)}>{t('cancel')}</Button>
            <Button onClick={handleAddResource}>{t('addResource')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Assign Resource Modal */}
      <Dialog open={showAssignModal} onOpenChange={setShowAssignModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t('assignResource')}</DialogTitle>
            <DialogDescription>{t('assignToProduct')}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium text-foreground">{t('portfolio')}</label>
              <Select value={newAssignment.portfolioId?.toString() || ''} onValueChange={(value) => setNewAssignment({ ...newAssignment, portfolioId: parseInt(value), productId: 0, releaseId: 0 })}>
                <SelectTrigger><SelectValue placeholder={t('selectPortfolio')} /></SelectTrigger>
                <SelectContent>
                  {state.portfolios.map(portfolio => <SelectItem key={portfolio.id} value={portfolio.id.toString()}>{portfolio.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium text-foreground">{t('product')}</label>
              <Select value={newAssignment.productId?.toString() || ''} onValueChange={(value) => setNewAssignment({ ...newAssignment, productId: parseInt(value), releaseId: 0 })}>
                <SelectTrigger><SelectValue placeholder={t('selectProduct')} /></SelectTrigger>
                <SelectContent>
                  {state.products.filter(p => !newAssignment.portfolioId || p.portfolioId === newAssignment.portfolioId).map(product => <SelectItem key={product.id} value={product.id.toString()}>{product.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium text-foreground">{t('release')}</label>
              <Select value={newAssignment.releaseId?.toString() || ''} onValueChange={(value) => setNewAssignment({ ...newAssignment, releaseId: parseInt(value) })}>
                <SelectTrigger><SelectValue placeholder={t('selectReleasePlaceholder')} /></SelectTrigger>
                <SelectContent>
                  {state.releases.filter(r => r.productId === newAssignment.productId).map(release => (
                    <SelectItem key={release.id} value={release.id.toString()}>{release.version} - {release.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-foreground">{t('startDate')}</label>
                <Input type="date" value={newAssignment.startDate} onChange={(e) => setNewAssignment({ ...newAssignment, startDate: e.target.value })} />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground">{t('endDate')}</label>
                <Input type="date" value={newAssignment.endDate} onChange={(e) => setNewAssignment({ ...newAssignment, endDate: e.target.value })} />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-foreground">{t('utilizationPercent')}</label>
              <Input type="number" min="0" max="100" value={newAssignment.utilization} onChange={(e) => setNewAssignment({ ...newAssignment, utilization: parseInt(e.target.value) || 0 })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAssignModal(false)}>{t('cancel')}</Button>
            <Button onClick={handleAssignResource}>{t('assign')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={!!deleteConfirmId} onOpenChange={() => setDeleteConfirmId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('deleteAssignment')}</DialogTitle>
            <DialogDescription>{t('confirmDeleteAssignment')}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirmId(null)}>{t('cancel')}</Button>
            <Button variant="destructive" onClick={() => deleteConfirmId && handleDeleteAssignment(deleteConfirmId)}>{t('delete')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ResourcesPage;
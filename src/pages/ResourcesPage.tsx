import { useState, useMemo } from 'react';
import { useApp } from '@/context/AppContext';
import { formatCurrency, cn } from '@/lib/utils';
import StatusBadge from '@/components/StatusBadge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Resource } from '@/types';
import { Users, Plus, BarChart3 } from 'lucide-react';

interface ResourcesPageProps {
  onResourceClick: (resource: Resource) => void;
}

const ResourcesPage = ({ onResourceClick }: ResourcesPageProps) => {
  const { state, addResource, t, language } = useApp();
  const [showAddResourceModal, setShowAddResourceModal] = useState(false);

  const defaultResource = { name: '', employeeId: '', role: '', location: 'On-site' as 'On-site' | 'Offshore', category: 'Technical' as 'Technical' | 'Business' | 'Operation', lineManager: '', costRate: 0, capacity: 40, status: 'Active' as 'Active' | 'Inactive' };
  const [newResource, setNewResource] = useState(defaultResource);

  const getUtilization = (resourceId: number): number => {
    return state.assignments.filter(a => a.resourceId === resourceId).reduce((sum, a) => sum + a.utilization, 0);
  };

  const utilizationData = useMemo(() => {
    return state.resources.map(resource => ({
      resource, utilization: getUtilization(resource.id),
      assignments: state.assignments.filter(a => a.resourceId === resource.id)
    })).sort((a, b) => b.utilization - a.utilization);
  }, [state]);

  const handleAddResource = () => {
    if (!newResource.name || !newResource.role) return;
    addResource(newResource);
    setNewResource(defaultResource);
    setShowAddResourceModal(false);
  };

  const totalResources = state.resources.length;
  const avgUtilization = utilizationData.length > 0 ? Math.round(utilizationData.reduce((s, u) => s + u.utilization, 0) / utilizationData.length) : 0;
  const avgAvailableCapacity = Math.max(0, 100 - avgUtilization);

  // Allocation by product
  const allocationByProduct = useMemo(() => {
    const map: Record<string, number> = {};
    state.assignments.forEach(a => {
      const product = state.products.find(p => p.id === a.productId);
      const name = product?.name || 'N/A';
      map[name] = (map[name] || 0) + a.utilization;
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [state.assignments, state.products]);

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

      {/* Capacity Dashboard */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-card rounded-xl p-4 text-center border border-border shadow-card">
          <div className="text-xs text-muted-foreground mb-1">{t('totalResources')}</div>
          <div className="text-2xl font-bold text-foreground">{totalResources}</div>
        </div>
        <div className="bg-card rounded-xl p-4 text-center border border-border shadow-card">
          <div className="text-xs text-muted-foreground mb-1">{t('availableCapacity')}</div>
          <div className="text-2xl font-bold text-success">{avgAvailableCapacity}%</div>
          <div className="text-xs text-muted-foreground mt-1">{t('acrossAllResources')}</div>
        </div>
        <div className="bg-card rounded-xl p-4 text-center border border-border shadow-card">
          <div className="text-xs text-muted-foreground mb-1">{t('overAllocated')}</div>
          <div className="text-2xl font-bold text-destructive">{utilizationData.filter(u => u.utilization > 100).length}</div>
          <div className="text-xs text-muted-foreground mt-1">{t('moreThan100')}</div>
        </div>
        <div className="bg-card rounded-xl p-4 text-center border border-border shadow-card">
          <div className="text-xs text-muted-foreground mb-1">{t('avgUtilization')}</div>
          <div className="text-2xl font-bold text-primary">{avgUtilization}%</div>
          <div className="text-xs text-muted-foreground mt-1">{t('acrossAllResources')}</div>
        </div>
      </div>



      {/* Resource Directory */}
      <div className="bg-card rounded-xl shadow-card overflow-hidden">
        <div className="flex items-center gap-2 px-5 py-3 border-b border-border">
          <Users className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-medium text-foreground">{t('directory')}</span>
        </div>
        <div className="p-5">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px]">
              <thead className="bg-secondary/50">
                <tr>
                  <th className="px-4 py-2.5 text-start text-xs font-medium text-muted-foreground uppercase">{t('employeeId')}</th>
                  <th className="px-4 py-2.5 text-start text-xs font-medium text-muted-foreground uppercase">{t('name')}</th>
                  <th className="px-4 py-2.5 text-start text-xs font-medium text-muted-foreground uppercase">{t('role')}</th>
                  <th className="px-4 py-2.5 text-start text-xs font-medium text-muted-foreground uppercase">{t('location')}</th>
                  <th className="px-4 py-2.5 text-start text-xs font-medium text-muted-foreground uppercase">{t('category')}</th>
                  <th className="px-4 py-2.5 text-end text-xs font-medium text-muted-foreground uppercase">{t('utilization')}</th>
                  <th className="px-4 py-2.5 text-center text-xs font-medium text-muted-foreground uppercase">{t('status')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {state.resources.map(resource => {
                  const utilization = getUtilization(resource.id);
                  const isOverAllocated = utilization > 100;
                  return (
                    <tr key={resource.id} className="hover:bg-secondary/30 cursor-pointer" onClick={() => onResourceClick(resource)}>
                      <td className="px-4 py-2.5 text-sm text-muted-foreground font-mono">{resource.employeeId || '—'}</td>
                      <td className="px-4 py-2.5 font-medium text-primary text-sm hover:underline">{resource.name}</td>
                      <td className="px-4 py-2.5 text-sm text-muted-foreground">{resource.role}</td>
                      <td className="px-4 py-2.5 text-sm text-muted-foreground">{resource.location || '—'}</td>
                      <td className="px-4 py-2.5 text-sm text-muted-foreground">{resource.category || '—'}</td>
                      <td className="px-4 py-2.5 text-end">
                        <div className={cn("font-bold text-sm", isOverAllocated ? 'text-destructive' : utilization > 80 ? 'text-warning' : 'text-success')}>{utilization}%</div>
                        {isOverAllocated && <div className="text-xs text-destructive">{t('overAllocated')}!</div>}
                      </td>
                      <td className="px-4 py-2.5 text-center"><StatusBadge status={resource.status} /></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Add Resource Modal */}
      <Dialog open={showAddResourceModal} onOpenChange={setShowAddResourceModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t('addNewResource')}</DialogTitle>
            <DialogDescription>{t('addTeamMember')}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-foreground">{t('employeeId')}</label>
                <Input value={newResource.employeeId} onChange={(e) => setNewResource({ ...newResource, employeeId: e.target.value })} placeholder={t('enterEmployeeId')} />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground">{t('name')}</label>
                <Input value={newResource.name} onChange={(e) => setNewResource({ ...newResource, name: e.target.value })} placeholder={t('enterName')} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-foreground">{t('role')}</label>
                <Input value={newResource.role} onChange={(e) => setNewResource({ ...newResource, role: e.target.value })} placeholder={t('enterRole')} />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground">{t('lineManager')}</label>
                <Input value={newResource.lineManager} onChange={(e) => setNewResource({ ...newResource, lineManager: e.target.value })} placeholder={t('enterLineManager')} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-foreground">{t('location')}</label>
                <Select value={newResource.location} onValueChange={(value: 'On-site' | 'Offshore') => setNewResource({ ...newResource, location: value })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="On-site">{t('onSite')}</SelectItem>
                    <SelectItem value="Offshore">{t('offshore')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium text-foreground">{t('category')}</label>
                <Select value={newResource.category} onValueChange={(value: 'Technical' | 'Business' | 'Operation') => setNewResource({ ...newResource, category: value })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Technical">{t('technical')}</SelectItem>
                    <SelectItem value="Business">{t('business')}</SelectItem>
                    <SelectItem value="Operation">{t('operation')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
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
            <div>
              <label className="text-sm font-medium text-foreground">{t('status')}</label>
              <Select value={newResource.status} onValueChange={(value: 'Active' | 'Inactive') => setNewResource({ ...newResource, status: value })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Active">{t('active')}</SelectItem>
                  <SelectItem value="Inactive">{t('inactive')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddResourceModal(false)}>{t('cancel')}</Button>
            <Button onClick={handleAddResource}>{t('addResource')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ResourcesPage;

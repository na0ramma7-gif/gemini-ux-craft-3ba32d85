import { useMemo, useState } from 'react';
import { useApp } from '@/context/AppContext';
import { cn } from '@/lib/utils';
import StatusBadge from '@/components/StatusBadge';
import { Button } from '@/components/ui/button';
import ResourceFormDialog from '@/components/ResourceFormDialog';
import { Resource } from '@/types';
import { Users, Plus } from 'lucide-react';

interface ResourcesPageProps {
  onResourceClick: (resource: Resource) => void;
}

const ResourcesPage = ({ onResourceClick }: ResourcesPageProps) => {
  const { state, t } = useApp();
  const [showAddResourceModal, setShowAddResourceModal] = useState(false);

  const getUtilization = (resourceId: number): number => {
    return state.assignments.filter(a => a.resourceId === resourceId).reduce((sum, a) => sum + a.utilization, 0);
  };

  const utilizationData = useMemo(() => {
    return state.resources.map(resource => ({
      resource, utilization: getUtilization(resource.id),
      assignments: state.assignments.filter(a => a.resourceId === resource.id)
    })).sort((a, b) => b.utilization - a.utilization);
  }, [state]);

  const totalResources = state.resources.length;
  const avgUtilization = utilizationData.length > 0 ? Math.round(utilizationData.reduce((s, u) => s + u.utilization, 0) / utilizationData.length) : 0;
  const avgAvailableCapacity = Math.max(0, 100 - avgUtilization);

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

      <ResourceFormDialog open={showAddResourceModal} onOpenChange={setShowAddResourceModal} />
    </div>
  );
};

export default ResourcesPage;

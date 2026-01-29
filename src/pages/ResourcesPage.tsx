import { useState, useMemo } from 'react';
import { useApp } from '@/context/AppContext';
import { formatCurrency, formatDate, cn } from '@/lib/utils';
import StatusBadge from '@/components/StatusBadge';
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
  Users,
  Calendar,
  Plus,
  Edit,
  Trash2,
  TrendingUp,
  BarChart3,
  List
} from 'lucide-react';

const ResourcesPage = () => {
  const { state, addResource, addAssignment, updateAssignment, deleteAssignment } = useApp();
  const [activeTab, setActiveTab] = useState('directory');
  const [showAddResourceModal, setShowAddResourceModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedResource, setSelectedResource] = useState<number | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);

  const [newResource, setNewResource] = useState({
    name: '',
    role: '',
    costRate: 0,
    capacity: 40,
    status: 'Active' as const
  });

  const [newAssignment, setNewAssignment] = useState({
    resourceId: 0,
    productId: 0,
    releaseId: 0,
    startDate: '',
    endDate: '',
    utilization: 50
  });

  const getUtilization = (resourceId: number): number => {
    const resourceAssignments = state.assignments.filter(a => a.resourceId === resourceId);
    return resourceAssignments.reduce((sum, a) => sum + a.utilization, 0);
  };

  const utilizationData = useMemo(() => {
    return state.resources.map(resource => ({
      resource,
      utilization: getUtilization(resource.id),
      assignments: state.assignments.filter(a => a.resourceId === resource.id)
    })).sort((a, b) => b.utilization - a.utilization);
  }, [state]);

  const handleAddResource = () => {
    if (!newResource.name || !newResource.role) return;
    addResource(newResource);
    setNewResource({ name: '', role: '', costRate: 0, capacity: 40, status: 'Active' });
    setShowAddResourceModal(false);
  };

  const handleAssignResource = () => {
    if (!newAssignment.resourceId || !newAssignment.productId) return;
    addAssignment(newAssignment);
    setNewAssignment({
      resourceId: 0,
      productId: 0,
      releaseId: 0,
      startDate: '',
      endDate: '',
      utilization: 50
    });
    setShowAssignModal(false);
  };

  const handleDeleteAssignment = (id: number) => {
    deleteAssignment(id);
    setDeleteConfirmId(null);
  };

  const openAssignModal = (resourceId: number) => {
    setNewAssignment({ ...newAssignment, resourceId });
    setShowAssignModal(true);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Resource Management</h1>
          <p className="text-muted-foreground mt-1">Manage team members and assignments</p>
        </div>
        <Button onClick={() => setShowAddResourceModal(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Add Resource
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-xl p-4 text-center border border-emerald-200 dark:border-emerald-800">
          <div className="text-xs text-muted-foreground mb-1">Available</div>
          <div className="text-2xl font-bold text-emerald-600">
            {utilizationData.filter(u => u.utilization < 80).length}
          </div>
          <div className="text-xs text-muted-foreground mt-1">&lt; 80% utilized</div>
        </div>
        <div className="bg-amber-50 dark:bg-amber-900/20 rounded-xl p-4 text-center border border-amber-200 dark:border-amber-800">
          <div className="text-xs text-muted-foreground mb-1">Near Capacity</div>
          <div className="text-2xl font-bold text-amber-600">
            {utilizationData.filter(u => u.utilization >= 80 && u.utilization <= 100).length}
          </div>
          <div className="text-xs text-muted-foreground mt-1">80-100% utilized</div>
        </div>
        <div className="bg-red-50 dark:bg-red-900/20 rounded-xl p-4 text-center border border-red-200 dark:border-red-800">
          <div className="text-xs text-muted-foreground mb-1">Over-allocated</div>
          <div className="text-2xl font-bold text-red-600">
            {utilizationData.filter(u => u.utilization > 100).length}
          </div>
          <div className="text-xs text-muted-foreground mt-1">&gt; 100% utilized</div>
        </div>
        <div className="bg-primary/10 dark:bg-primary/20 rounded-xl p-4 text-center border border-primary/20">
          <div className="text-xs text-muted-foreground mb-1">Avg Utilization</div>
          <div className="text-2xl font-bold text-primary">
            {utilizationData.length > 0
              ? Math.round(utilizationData.reduce((s, u) => s + u.utilization, 0) / utilizationData.length)
              : 0}%
          </div>
          <div className="text-xs text-muted-foreground mt-1">Across all resources</div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="bg-card rounded-xl shadow-card">
          <TabsList className="w-full justify-start border-b rounded-none h-auto p-0 bg-transparent">
            <TabsTrigger
              value="directory"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-6 py-4"
            >
              <Users className="w-4 h-4 mr-2" />
              Directory
            </TabsTrigger>
            <TabsTrigger
              value="assignments"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-6 py-4"
            >
              <Calendar className="w-4 h-4 mr-2" />
              Assignments
            </TabsTrigger>
            <TabsTrigger
              value="utilization"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-6 py-4"
            >
              <BarChart3 className="w-4 h-4 mr-2" />
              Utilization
            </TabsTrigger>
          </TabsList>

          <div className="p-6">
            {/* Directory Tab */}
            <TabsContent value="directory" className="mt-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-secondary">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Name</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Role</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase">Cost Rate</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase">Utilization</th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-muted-foreground uppercase">Status</th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-muted-foreground uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {state.resources.map(resource => {
                      const utilization = getUtilization(resource.id);
                      const isOverAllocated = utilization > 100;
                      return (
                        <tr key={resource.id} className="hover:bg-secondary/50">
                          <td className="px-4 py-3 font-medium text-foreground">{resource.name}</td>
                          <td className="px-4 py-3 text-sm text-muted-foreground">{resource.role}</td>
                          <td className="px-4 py-3 text-right font-semibold">{formatCurrency(resource.costRate)}/mo</td>
                          <td className="px-4 py-3 text-right">
                            <div className={cn(
                              "font-bold",
                              isOverAllocated ? 'text-red-600' : utilization > 80 ? 'text-amber-600' : 'text-emerald-600'
                            )}>
                              {utilization}%
                            </div>
                            {isOverAllocated && <div className="text-xs text-red-600">Over-allocated!</div>}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <StatusBadge status={resource.status} />
                          </td>
                          <td className="px-4 py-3 text-center">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => openAssignModal(resource.id)}
                            >
                              Assign
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </TabsContent>

            {/* Assignments Tab */}
            <TabsContent value="assignments" className="mt-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-secondary">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Resource</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Product</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Release</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Period</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase">Utilization</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase">Monthly Cost</th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-muted-foreground uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {state.assignments.map(assignment => {
                      const resource = state.resources.find(r => r.id === assignment.resourceId);
                      const release = state.releases.find(r => r.id === assignment.releaseId);
                      const product = state.products.find(p => p.id === assignment.productId);
                      const monthlyCost = resource ? resource.costRate * (assignment.utilization / 100) : 0;

                      return (
                        <tr key={assignment.id} className="hover:bg-secondary/50">
                          <td className="px-4 py-3">
                            <div className="font-medium text-foreground">{resource?.name}</div>
                            <div className="text-xs text-muted-foreground">{resource?.role}</div>
                          </td>
                          <td className="px-4 py-3 text-sm">{product?.name || 'N/A'}</td>
                          <td className="px-4 py-3 text-sm">{release?.version || 'N/A'}</td>
                          <td className="px-4 py-3 text-sm">
                            <div>{formatDate(assignment.startDate)}</div>
                            <div className="text-muted-foreground">→ {formatDate(assignment.endDate)}</div>
                          </td>
                          <td className="px-4 py-3 text-right font-semibold text-primary">{assignment.utilization}%</td>
                          <td className="px-4 py-3 text-right font-bold text-emerald-600">{formatCurrency(monthlyCost)}</td>
                          <td className="px-4 py-3 text-center">
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-destructive hover:bg-destructive hover:text-destructive-foreground"
                              onClick={() => setDeleteConfirmId(assignment.id)}
                            >
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

            {/* Utilization Tab */}
            <TabsContent value="utilization" className="mt-0 space-y-4">
              {utilizationData.map(({ resource, utilization, assignments }) => {
                const isOverAllocated = utilization > 100;
                const cappedUtilization = Math.min(utilization, 100);

                return (
                  <div key={resource.id} className="border border-border rounded-lg p-4">
                    <div className="flex justify-between items-center mb-2">
                      <div>
                        <div className="font-semibold text-foreground">{resource.name}</div>
                        <div className="text-sm text-muted-foreground">{resource.role}</div>
                      </div>
                      <div className="text-right">
                        <div className={cn(
                          "text-xl font-bold",
                          isOverAllocated ? 'text-red-600' : utilization > 80 ? 'text-amber-600' : 'text-emerald-600'
                        )}>
                          {utilization}%
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {assignments.length} assignment{assignments.length !== 1 ? 's' : ''}
                        </div>
                      </div>
                    </div>

                    <div className="relative w-full h-6 bg-secondary rounded-full overflow-hidden">
                      <div
                        className={cn(
                          "h-full transition-all",
                          isOverAllocated ? 'bg-red-500' : utilization > 80 ? 'bg-amber-500' : 'bg-emerald-500'
                        )}
                        style={{ width: `${cappedUtilization}%` }}
                      />
                      {isOverAllocated && (
                        <div className="absolute right-2 top-1 text-xs font-semibold text-white">
                          Over by {utilization - 100}%
                        </div>
                      )}
                    </div>

                    {assignments.length > 0 && (
                      <div className="mt-3 space-y-1">
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
            <DialogTitle>Add New Resource</DialogTitle>
            <DialogDescription>Add a new team member to the resource pool</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium text-foreground">Name</label>
              <Input
                value={newResource.name}
                onChange={(e) => setNewResource({ ...newResource, name: e.target.value })}
                placeholder="Enter name"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground">Role</label>
              <Input
                value={newResource.role}
                onChange={(e) => setNewResource({ ...newResource, role: e.target.value })}
                placeholder="Enter role"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-foreground">Cost Rate (Monthly)</label>
                <Input
                  type="number"
                  value={newResource.costRate}
                  onChange={(e) => setNewResource({ ...newResource, costRate: parseInt(e.target.value) || 0 })}
                />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground">Capacity (hrs/week)</label>
                <Input
                  type="number"
                  value={newResource.capacity}
                  onChange={(e) => setNewResource({ ...newResource, capacity: parseInt(e.target.value) || 40 })}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddResourceModal(false)}>Cancel</Button>
            <Button onClick={handleAddResource}>Add Resource</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Assign Resource Modal */}
      <Dialog open={showAssignModal} onOpenChange={setShowAssignModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Assign Resource</DialogTitle>
            <DialogDescription>Assign this resource to a product/release</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium text-foreground">Product</label>
              <Select
                value={newAssignment.productId?.toString() || ''}
                onValueChange={(value) => setNewAssignment({ ...newAssignment, productId: parseInt(value) })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select product" />
                </SelectTrigger>
                <SelectContent>
                  {state.products.map(product => (
                    <SelectItem key={product.id} value={product.id.toString()}>
                      {product.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium text-foreground">Release</label>
              <Select
                value={newAssignment.releaseId?.toString() || ''}
                onValueChange={(value) => setNewAssignment({ ...newAssignment, releaseId: parseInt(value) })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select release" />
                </SelectTrigger>
                <SelectContent>
                  {state.releases
                    .filter(r => r.productId === newAssignment.productId)
                    .map(release => (
                      <SelectItem key={release.id} value={release.id.toString()}>
                        {release.version} - {release.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-foreground">Start Date</label>
                <Input
                  type="date"
                  value={newAssignment.startDate}
                  onChange={(e) => setNewAssignment({ ...newAssignment, startDate: e.target.value })}
                />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground">End Date</label>
                <Input
                  type="date"
                  value={newAssignment.endDate}
                  onChange={(e) => setNewAssignment({ ...newAssignment, endDate: e.target.value })}
                />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-foreground">Utilization (%)</label>
              <Input
                type="number"
                min="0"
                max="100"
                value={newAssignment.utilization}
                onChange={(e) => setNewAssignment({ ...newAssignment, utilization: parseInt(e.target.value) || 0 })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAssignModal(false)}>Cancel</Button>
            <Button onClick={handleAssignResource}>Assign</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <Dialog open={!!deleteConfirmId} onOpenChange={() => setDeleteConfirmId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Assignment</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this assignment? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirmId(null)}>Cancel</Button>
            <Button
              variant="destructive"
              onClick={() => deleteConfirmId && handleDeleteAssignment(deleteConfirmId)}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ResourcesPage;

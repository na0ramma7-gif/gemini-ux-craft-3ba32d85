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
import { Resource, ResourceSkill, SkillProficiency } from '@/types';
import { ArrowLeft, User, Plus, Edit, Trash2, Clock, Briefcase, Star, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface ResourceProfilePageProps {
  resource: Resource;
  onBack: () => void;
}

const ResourceProfilePage = ({ resource, onBack }: ResourceProfilePageProps) => {
  const { state, updateResource, deleteResource, addAssignment, updateAssignment, deleteAssignment, t, language } = useApp();
  const [activeTab, setActiveTab] = useState('info');
  const [showEditModal, setShowEditModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [editingAssignmentId, setEditingAssignmentId] = useState<number | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);
  const [deleteResourceConfirm, setDeleteResourceConfirm] = useState(false);
  const [newSkillName, setNewSkillName] = useState('');
  const [newSkillProficiency, setNewSkillProficiency] = useState<SkillProficiency>('Intermediate');
  const [skillSearch, setSkillSearch] = useState('');

  const defaultResource = { name: resource.name, employeeId: resource.employeeId || '', role: resource.role, location: resource.location || 'On-site' as 'On-site' | 'Offshore', category: resource.category || 'Technical' as 'Technical' | 'Business' | 'Operation', lineManager: resource.lineManager || '', costRate: resource.costRate, capacity: resource.capacity, status: resource.status };
  const [editForm, setEditForm] = useState(defaultResource);
  const [newAssignment, setNewAssignment] = useState({ resourceId: resource.id, portfolioId: 0, productId: 0, releaseId: 0, startDate: '', endDate: '', utilization: 50 });

  const assignments = useMemo(() => state.assignments.filter(a => a.resourceId === resource.id), [state.assignments, resource.id]);
  const totalUtilization = assignments.reduce((sum, a) => sum + a.utilization, 0);
  const availableCapacity = Math.max(0, 100 - totalUtilization);
  const isOverAllocated = totalUtilization > 100;

  // Get fresh resource data from state
  const currentResource = state.resources.find(r => r.id === resource.id) || resource;

  const handleUpdateResource = () => {
    if (!editForm.name || !editForm.role) return;
    updateResource(resource.id, editForm);
    setShowEditModal(false);
  };

  const handleDeleteResource = () => {
    deleteResource(resource.id);
    setDeleteResourceConfirm(false);
    onBack();
  };

  const handleAssignment = () => {
    if (!newAssignment.productId) return;
    if (editingAssignmentId) {
      updateAssignment(editingAssignmentId, newAssignment);
      setEditingAssignmentId(null);
    } else {
      addAssignment({ ...newAssignment, resourceId: resource.id });
    }
    setNewAssignment({ resourceId: resource.id, portfolioId: 0, productId: 0, releaseId: 0, startDate: '', endDate: '', utilization: 50 });
    setShowAssignModal(false);
  };

  const openEditAssignment = (a: typeof assignments[0]) => {
    const product = state.products.find(p => p.id === a.productId);
    setEditingAssignmentId(a.id);
    setNewAssignment({ resourceId: resource.id, portfolioId: product?.portfolioId || 0, productId: a.productId, releaseId: a.releaseId, startDate: a.startDate, endDate: a.endDate, utilization: a.utilization });
    setShowAssignModal(true);
  };

  const handleDeleteAssignment = (id: number) => { deleteAssignment(id); setDeleteConfirmId(null); };

  // Skills management
  const SUGGESTED_SKILLS = ['Backend Development', 'Frontend Development', 'Java', 'React', 'Node.js', 'TypeScript', 'Python', 'Cloud Architecture', 'DevOps', 'Kubernetes', 'Docker', 'System Design', 'QA Automation', 'Product Management', 'Business Analysis', 'Agile', 'Scrum', 'SQL', 'NoSQL', 'Spring Boot', 'Microservices', 'CI/CD', 'AWS', 'Azure', 'Data Analysis', 'Machine Learning', 'UI/UX Design', 'Performance Testing', 'Selenium', 'Requirements Engineering'];

  const currentSkills = currentResource.skills || [];

  const filteredSuggestions = SUGGESTED_SKILLS.filter(s =>
    s.toLowerCase().includes(skillSearch.toLowerCase()) &&
    !currentSkills.some(cs => cs.name.toLowerCase() === s.toLowerCase())
  );

  const handleAddSkill = (skillName?: string) => {
    const name = skillName || newSkillName.trim();
    if (!name || currentSkills.some(s => s.name.toLowerCase() === name.toLowerCase())) return;
    const updated = [...currentSkills, { name, proficiency: newSkillProficiency }];
    updateResource(resource.id, { skills: updated });
    setNewSkillName('');
    setSkillSearch('');
  };

  const handleRemoveSkill = (skillName: string) => {
    updateResource(resource.id, { skills: currentSkills.filter(s => s.name !== skillName) });
  };

  const handleUpdateProficiency = (skillName: string, proficiency: SkillProficiency) => {
    updateResource(resource.id, { skills: currentSkills.map(s => s.name === skillName ? { ...s, proficiency } : s) });
  };

  const proficiencyColor = (p: SkillProficiency) => {
    switch (p) {
      case 'Expert': return 'bg-success/15 text-success border-success/30';
      case 'Advanced': return 'bg-primary/15 text-primary border-primary/30';
      case 'Intermediate': return 'bg-warning/15 text-warning border-warning/30';
      case 'Beginner': return 'bg-muted text-muted-foreground border-border';
    }
  };

  // Timeline data - group assignments by month
  const timelineData = useMemo(() => {
    const months: { month: string; allocations: { productName: string; utilization: number; color: string }[] }[] = [];
    const colors = ['bg-primary', 'bg-chart-2', 'bg-chart-3', 'bg-chart-4', 'bg-chart-5'];
    
    assignments.forEach((a, idx) => {
      if (!a.startDate || !a.endDate) return;
      const start = new Date(a.startDate);
      const end = new Date(a.endDate);
      const product = state.products.find(p => p.id === a.productId);
      
      const current = new Date(start.getFullYear(), start.getMonth(), 1);
      while (current <= end) {
        const monthKey = current.toLocaleDateString(language === 'ar' ? 'ar-SA' : 'en-US', { month: 'short', year: 'numeric' });
        let monthEntry = months.find(m => m.month === monthKey);
        if (!monthEntry) {
          monthEntry = { month: monthKey, allocations: [] };
          months.push(monthEntry);
        }
        monthEntry.allocations.push({
          productName: product?.name || 'N/A',
          utilization: a.utilization,
          color: colors[idx % colors.length]
        });
        current.setMonth(current.getMonth() + 1);
      }
    });
    return months;
  }, [assignments, state.products, language]);

  // Allocation by product
  const allocationByProduct = useMemo(() => {
    const map: Record<string, number> = {};
    assignments.forEach(a => {
      const product = state.products.find(p => p.id === a.productId);
      const name = product?.name || 'N/A';
      map[name] = (map[name] || 0) + a.utilization;
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [assignments, state.products]);

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={onBack} className="h-8 w-8 p-0">
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <User className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-foreground text-xl font-bold">{currentResource.name}</h1>
              <p className="text-sm text-muted-foreground">{currentResource.role} · {currentResource.employeeId || '—'}</p>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => { setEditForm({ name: currentResource.name, employeeId: currentResource.employeeId || '', role: currentResource.role, location: currentResource.location || 'On-site', category: currentResource.category || 'Technical', lineManager: currentResource.lineManager || '', costRate: currentResource.costRate, capacity: currentResource.capacity, status: currentResource.status }); setShowEditModal(true); }}>
            <Edit className="w-4 h-4 me-1.5" />{t('edit')}
          </Button>
          <Button size="sm" variant="destructive" onClick={() => setDeleteResourceConfirm(true)}>
            <Trash2 className="w-4 h-4 me-1.5" />{t('delete')}
          </Button>
        </div>
      </div>

      {/* Utilization Summary Cards */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-card rounded-xl p-4 text-center border border-border shadow-card">
          <div className="text-xs text-muted-foreground mb-1">{t('currentUtilization')}</div>
          <div className={cn("text-2xl font-bold", isOverAllocated ? 'text-destructive' : totalUtilization > 80 ? 'text-warning' : 'text-success')}>{totalUtilization}%</div>
        </div>
        <div className="bg-card rounded-xl p-4 text-center border border-border shadow-card">
          <div className="text-xs text-muted-foreground mb-1">{t('availableCapacity')}</div>
          <div className="text-2xl font-bold text-primary">{availableCapacity}%</div>
        </div>
        <div className="bg-card rounded-xl p-4 text-center border border-border shadow-card">
          <div className="text-xs text-muted-foreground mb-1">{t('activeAssignments')}</div>
          <div className="text-2xl font-bold text-foreground">{assignments.length}</div>
        </div>
      </div>



      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="bg-card rounded-xl shadow-card overflow-hidden">
          <TabsList className="w-full justify-start border-b rounded-none h-auto p-0 bg-transparent overflow-x-auto flex-nowrap">
            {[
              { value: 'info', icon: <User className="w-4 h-4 me-1.5" />, label: t('resourceInfo') },
              { value: 'assignments', icon: <Briefcase className="w-4 h-4 me-1.5" />, label: t('assignments') },
              { value: 'skills', icon: <Star className="w-4 h-4 me-1.5" />, label: t('skills') },
              { value: 'timeline', icon: <Clock className="w-4 h-4 me-1.5" />, label: t('timeline') },
            ].map(tab => (
              <TabsTrigger key={tab.value} value={tab.value}
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-5 py-3 text-sm whitespace-nowrap">
                {tab.icon}{tab.label}
              </TabsTrigger>
            ))}
          </TabsList>

          <div className="p-5">
            {/* Resource Info */}
            <TabsContent value="info" className="mt-0">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide">{t('resourceDetails')}</h3>
                  {[
                    { label: t('employeeId'), value: currentResource.employeeId || '—' },
                    { label: t('name'), value: currentResource.name },
                    { label: t('role'), value: currentResource.role },
                    { label: t('location'), value: currentResource.location || '—' },
                    { label: t('category'), value: currentResource.category || '—' },
                    { label: t('lineManager'), value: currentResource.lineManager || '—' },
                  ].map(item => (
                    <div key={item.label} className="flex justify-between items-center py-2 border-b border-border last:border-0">
                      <span className="text-sm text-muted-foreground">{item.label}</span>
                      <span className="text-sm font-medium text-foreground">{item.value}</span>
                    </div>
                  ))}
                </div>
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide">{t('workDetails')}</h3>
                  {[
                    { label: t('costRateMonthly'), value: `${formatCurrency(currentResource.costRate, language)}/mo` },
                    { label: t('capacityHrsWeek'), value: `${currentResource.capacity} hrs` },
                    { label: t('status'), value: currentResource.status },
                  ].map(item => (
                    <div key={item.label} className="flex justify-between items-center py-2 border-b border-border last:border-0">
                      <span className="text-sm text-muted-foreground">{item.label}</span>
                      <span className="text-sm font-medium text-foreground">{item.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </TabsContent>

            {/* Assignments */}
            <TabsContent value="assignments" className="mt-0">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-sm font-semibold text-foreground">{t('assignments')} ({assignments.length})</h3>
                <Button size="sm" onClick={() => { setEditingAssignmentId(null); setNewAssignment({ resourceId: resource.id, portfolioId: 0, productId: 0, releaseId: 0, startDate: '', endDate: '', utilization: 50 }); setShowAssignModal(true); }}>
                  <Plus className="w-4 h-4 me-1.5" />{t('addAssignment')}
                </Button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[700px]">
                  <thead className="bg-secondary/50">
                    <tr>
                      <th className="px-4 py-2.5 text-start text-xs font-medium text-muted-foreground uppercase">{t('portfolio')}</th>
                      <th className="px-4 py-2.5 text-start text-xs font-medium text-muted-foreground uppercase">{t('product')}</th>
                      <th className="px-4 py-2.5 text-start text-xs font-medium text-muted-foreground uppercase">{t('release')}</th>
                      <th className="px-4 py-2.5 text-end text-xs font-medium text-muted-foreground uppercase">{t('allocation')}</th>
                      <th className="px-4 py-2.5 text-start text-xs font-medium text-muted-foreground uppercase">{t('startDate')}</th>
                      <th className="px-4 py-2.5 text-start text-xs font-medium text-muted-foreground uppercase">{t('endDate')}</th>
                      <th className="px-4 py-2.5 text-center text-xs font-medium text-muted-foreground uppercase">{t('actions')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {assignments.map(a => {
                      const product = state.products.find(p => p.id === a.productId);
                      const portfolio = state.portfolios.find(p => p.id === product?.portfolioId);
                      const release = state.releases.find(r => r.id === a.releaseId);
                      return (
                        <tr key={a.id} className="hover:bg-secondary/30">
                          <td className="px-4 py-2.5 text-sm">{portfolio?.name || '—'}</td>
                          <td className="px-4 py-2.5 text-sm font-medium text-foreground">{product?.name || 'N/A'}</td>
                          <td className="px-4 py-2.5 text-sm text-muted-foreground">{release?.version || '—'}</td>
                          <td className="px-4 py-2.5 text-end font-semibold text-primary text-sm">{a.utilization}%</td>
                          <td className="px-4 py-2.5 text-sm">{formatDate(a.startDate, language)}</td>
                          <td className="px-4 py-2.5 text-sm">{formatDate(a.endDate, language)}</td>
                          <td className="px-4 py-2.5 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <Button size="sm" variant="outline" className="h-7 w-7 p-0" onClick={() => openEditAssignment(a)}>
                                <Edit className="w-3 h-3" />
                              </Button>
                              <Button size="sm" variant="outline" className="h-7 w-7 p-0 text-destructive hover:bg-destructive hover:text-destructive-foreground" onClick={() => setDeleteConfirmId(a.id)}>
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                    {assignments.length === 0 && (
                      <tr><td colSpan={7} className="px-4 py-8 text-center text-sm text-muted-foreground">{t('noAssignments')}</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </TabsContent>

            {/* Timeline */}
            <TabsContent value="timeline" className="mt-0">
              {timelineData.length > 0 ? (
                <div className="space-y-2">
                  {timelineData.map(({ month, allocations }) => (
                    <div key={month} className="flex items-center gap-3">
                      <div className="w-24 text-xs font-medium text-muted-foreground text-end shrink-0">{month}</div>
                      <div className="flex-1 flex gap-1 h-8">
                        {allocations.map((alloc, i) => (
                          <div key={i} className={cn("h-full rounded flex items-center justify-center text-xs text-white font-medium px-2", alloc.color)} style={{ width: `${alloc.utilization}%`, minWidth: '60px' }}>
                            {alloc.productName} ({alloc.utilization}%)
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-sm text-muted-foreground">{t('noAssignments')}</div>
              )}
            </TabsContent>

            {/* Skills */}
            <TabsContent value="skills" className="mt-0">
              <div className="space-y-5">
                {/* Add Skill */}
                <div className="border border-border rounded-xl p-4">
                  <h3 className="text-sm font-semibold text-foreground mb-3">{t('addSkill')}</h3>
                  <div className="flex gap-2 mb-3">
                    <Input
                      value={newSkillName}
                      onChange={(e) => { setNewSkillName(e.target.value); setSkillSearch(e.target.value); }}
                      placeholder={t('searchOrAddSkill')}
                      className="flex-1"
                      onKeyDown={(e) => e.key === 'Enter' && handleAddSkill()}
                    />
                    <Select value={newSkillProficiency} onValueChange={(v: SkillProficiency) => setNewSkillProficiency(v)}>
                      <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Beginner">{t('beginner')}</SelectItem>
                        <SelectItem value="Intermediate">{t('intermediate')}</SelectItem>
                        <SelectItem value="Advanced">{t('advanced')}</SelectItem>
                        <SelectItem value="Expert">{t('expert')}</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button size="sm" onClick={() => handleAddSkill()} disabled={!newSkillName.trim()}>
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                  {/* Suggestions */}
                  {skillSearch && filteredSuggestions.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {filteredSuggestions.slice(0, 8).map(s => (
                        <button key={s} onClick={() => handleAddSkill(s)} className="text-xs px-2.5 py-1 rounded-full border border-border bg-secondary/50 text-muted-foreground hover:bg-primary/10 hover:text-primary hover:border-primary/30 transition-colors">
                          + {s}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Current Skills */}
                {currentSkills.length > 0 ? (
                  <div className="space-y-2">
                    {currentSkills.map(skill => (
                      <div key={skill.name} className="flex items-center justify-between py-2.5 px-4 border border-border rounded-lg hover:bg-secondary/30">
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-medium text-foreground">{skill.name}</span>
                          <span className={cn("text-xs px-2 py-0.5 rounded-full border font-medium", proficiencyColor(skill.proficiency))}>
                            {skill.proficiency}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Select value={skill.proficiency} onValueChange={(v: SkillProficiency) => handleUpdateProficiency(skill.name, v)}>
                            <SelectTrigger className="h-7 w-28 text-xs"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Beginner">{t('beginner')}</SelectItem>
                              <SelectItem value="Intermediate">{t('intermediate')}</SelectItem>
                              <SelectItem value="Advanced">{t('advanced')}</SelectItem>
                              <SelectItem value="Expert">{t('expert')}</SelectItem>
                            </SelectContent>
                          </Select>
                          <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive hover:bg-destructive/10" onClick={() => handleRemoveSkill(skill.name)}>
                            <X className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-sm text-muted-foreground">{t('noSkills')}</div>
                )}
              </div>
            </TabsContent>
          </div>
        </div>
      </Tabs>

      {/* Edit Resource Modal */}
      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t('editResource')}</DialogTitle>
            <DialogDescription>{t('editResourceDesc')}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-foreground">{t('employeeId')}</label>
                <Input value={editForm.employeeId} onChange={(e) => setEditForm({ ...editForm, employeeId: e.target.value })} placeholder={t('enterEmployeeId')} />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground">{t('name')}</label>
                <Input value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} placeholder={t('enterName')} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-foreground">{t('role')}</label>
                <Input value={editForm.role} onChange={(e) => setEditForm({ ...editForm, role: e.target.value })} placeholder={t('enterRole')} />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground">{t('lineManager')}</label>
                <Input value={editForm.lineManager} onChange={(e) => setEditForm({ ...editForm, lineManager: e.target.value })} placeholder={t('enterLineManager')} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-foreground">{t('location')}</label>
                <Select value={editForm.location} onValueChange={(value: 'On-site' | 'Offshore') => setEditForm({ ...editForm, location: value })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="On-site">{t('onSite')}</SelectItem>
                    <SelectItem value="Offshore">{t('offshore')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium text-foreground">{t('category')}</label>
                <Select value={editForm.category} onValueChange={(value: 'Technical' | 'Business' | 'Operation') => setEditForm({ ...editForm, category: value })}>
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
                <Input type="number" value={editForm.costRate} onChange={(e) => setEditForm({ ...editForm, costRate: parseInt(e.target.value) || 0 })} />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground">{t('capacityHrsWeek')}</label>
                <Input type="number" value={editForm.capacity} onChange={(e) => setEditForm({ ...editForm, capacity: parseInt(e.target.value) || 40 })} />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-foreground">{t('status')}</label>
              <Select value={editForm.status} onValueChange={(value: 'Active' | 'Inactive') => setEditForm({ ...editForm, status: value })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Active">{t('active')}</SelectItem>
                  <SelectItem value="Inactive">{t('inactive')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditModal(false)}>{t('cancel')}</Button>
            <Button onClick={handleUpdateResource}>{t('save')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add/Edit Assignment Modal */}
      <Dialog open={showAssignModal} onOpenChange={(open) => { setShowAssignModal(open); if (!open) setEditingAssignmentId(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingAssignmentId ? t('editAssignment') : t('addAssignment')}</DialogTitle>
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
              <label className="text-sm font-medium text-foreground">{t('allocation')} (%)</label>
              <Input type="number" min="0" max="100" value={newAssignment.utilization} onChange={(e) => setNewAssignment({ ...newAssignment, utilization: parseInt(e.target.value) || 0 })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowAssignModal(false); setEditingAssignmentId(null); }}>{t('cancel')}</Button>
            <Button onClick={handleAssignment}>{editingAssignmentId ? t('save') : t('assign')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Assignment Confirmation */}
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

      {/* Delete Resource Confirmation */}
      <Dialog open={deleteResourceConfirm} onOpenChange={setDeleteResourceConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('deleteResource')}</DialogTitle>
            <DialogDescription>{t('confirmDeleteResource')}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteResourceConfirm(false)}>{t('cancel')}</Button>
            <Button variant="destructive" onClick={handleDeleteResource}>{t('delete')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ResourceProfilePage;

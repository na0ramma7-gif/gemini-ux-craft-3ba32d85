import { useEffect, useState } from 'react';
import { useApp } from '@/context/AppContext';
import { Product, LifecycleStage } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';

interface ProductFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  portfolioId: number;
  portfolioName?: string;
  onCreated?: (product: Product) => void;
}

const buildEmpty = (portfolioId: number): Omit<Product, 'id'> => ({
  portfolioId,
  name: '',
  code: '',
  status: 'Planned',
  owner: '',
  description: '',
  businessValue: '',
  targetClient: '',
  endUser: '',
  valueProposition: '',
  purpose: '',
  businessProblem: '',
  strategicObjective: '',
  lifecycleStage: 'Ideation',
  startDate: '',
  capabilities: [],
  successMetrics: [],
  technicalOwner: '',
  deliveryManager: '',
  businessStakeholder: '',
  supportingTeams: [],
});

const ProductFormDialog = ({ open, onOpenChange, portfolioId, portfolioName, onCreated }: ProductFormDialogProps) => {
  const { addProduct, t } = useApp();
  const [form, setForm] = useState<Omit<Product, 'id'>>(buildEmpty(portfolioId));
  const [capInput, setCapInput] = useState('');
  const [metricInput, setMetricInput] = useState('');
  const [teamInput, setTeamInput] = useState('');

  useEffect(() => {
    if (open) {
      setForm(buildEmpty(portfolioId));
      setCapInput(''); setMetricInput(''); setTeamInput('');
    }
  }, [open, portfolioId]);

  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) =>
    setForm(prev => ({ ...prev, [k]: v }));

  const canSave = form.name.trim().length > 0 && form.code.trim().length > 0;

  const addToList = (key: 'capabilities' | 'successMetrics' | 'supportingTeams', value: string, reset: () => void) => {
    const v = value.trim();
    if (!v) return;
    set(key, [...((form[key] as string[]) || []), v]);
    reset();
  };

  const removeFromList = (key: 'capabilities' | 'successMetrics' | 'supportingTeams', idx: number) => {
    const list = [...((form[key] as string[]) || [])];
    list.splice(idx, 1);
    set(key, list);
  };

  const handleSave = () => {
    if (!canSave) return;
    const created = addProduct({ ...form, portfolioId });
    onOpenChange(false);
    onCreated?.(created);
  };

  const renderChips = (key: 'capabilities' | 'successMetrics' | 'supportingTeams') => {
    const list = (form[key] as string[]) || [];
    if (list.length === 0) return null;
    return (
      <div className="flex flex-wrap gap-1.5 mt-2">
        {list.map((item, i) => (
          <span key={i} className="inline-flex items-center gap-1 text-xs bg-secondary text-secondary-foreground px-2 py-1 rounded-md">
            {item}
            <button type="button" className="text-muted-foreground hover:text-foreground" onClick={() => removeFromList(key, i)}>×</button>
          </span>
        ))}
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t('addProduct')}</DialogTitle>
          <DialogDescription>
            {portfolioName ? `Create a new product in ${portfolioName}.` : 'Create a new product.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2 space-y-1.5">
              <Label>Name *</Label>
              <Input value={form.name} onChange={e => set('name', e.target.value)} placeholder="Product name" />
            </div>
            <div className="space-y-1.5">
              <Label>Code *</Label>
              <Input value={form.code} onChange={e => set('code', e.target.value.toUpperCase())} placeholder="ABC" />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label>{t('status')}</Label>
              <Select value={form.status} onValueChange={v => set('status', v as Product['status'])}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Planned">Planned</SelectItem>
                  <SelectItem value="Development">Development</SelectItem>
                  <SelectItem value="Active">Active</SelectItem>
                  <SelectItem value="Archived">Archived</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Lifecycle Stage</Label>
              <Select value={form.lifecycleStage} onValueChange={v => set('lifecycleStage', v as LifecycleStage)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Ideation">Ideation</SelectItem>
                  <SelectItem value="Development">Development</SelectItem>
                  <SelectItem value="Growth">Growth</SelectItem>
                  <SelectItem value="Mature">Mature</SelectItem>
                  <SelectItem value="Sunset">Sunset</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Start Date</Label>
              <Input type="date" value={form.startDate || ''} onChange={e => set('startDate', e.target.value)} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Description</Label>
            <Textarea value={form.description || ''} onChange={e => set('description', e.target.value)} rows={2} />
          </div>

          <div className="space-y-1.5">
            <Label>Purpose</Label>
            <Textarea value={form.purpose || ''} onChange={e => set('purpose', e.target.value)} rows={2} />
          </div>

          <div className="space-y-1.5">
            <Label>Business Problem</Label>
            <Textarea value={form.businessProblem || ''} onChange={e => set('businessProblem', e.target.value)} rows={2} />
          </div>

          <div className="space-y-1.5">
            <Label>Strategic Objective</Label>
            <Textarea value={form.strategicObjective || ''} onChange={e => set('strategicObjective', e.target.value)} rows={2} />
          </div>

          <div className="space-y-1.5">
            <Label>Business Value</Label>
            <Textarea value={form.businessValue || ''} onChange={e => set('businessValue', e.target.value)} rows={2} />
          </div>

          <div className="space-y-1.5">
            <Label>Value Proposition</Label>
            <Textarea value={form.valueProposition || ''} onChange={e => set('valueProposition', e.target.value)} rows={2} />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Target Client</Label>
              <Input value={form.targetClient || ''} onChange={e => set('targetClient', e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>End User</Label>
              <Input value={form.endUser || ''} onChange={e => set('endUser', e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Owner (Product)</Label>
              <Input value={form.owner} onChange={e => set('owner', e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Technical Owner</Label>
              <Input value={form.technicalOwner || ''} onChange={e => set('technicalOwner', e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Delivery Manager</Label>
              <Input value={form.deliveryManager || ''} onChange={e => set('deliveryManager', e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Business Stakeholder</Label>
              <Input value={form.businessStakeholder || ''} onChange={e => set('businessStakeholder', e.target.value)} />
            </div>
          </div>

          {/* Capabilities */}
          <div className="space-y-1.5">
            <Label>Capabilities</Label>
            <div className="flex gap-2">
              <Input value={capInput} onChange={e => setCapInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addToList('capabilities', capInput, () => setCapInput('')); }}}
                placeholder="Add capability and press Enter" />
              <Button type="button" variant="outline" onClick={() => addToList('capabilities', capInput, () => setCapInput(''))}>Add</Button>
            </div>
            {renderChips('capabilities')}
          </div>

          {/* Success Metrics */}
          <div className="space-y-1.5">
            <Label>Success Metrics</Label>
            <div className="flex gap-2">
              <Input value={metricInput} onChange={e => setMetricInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addToList('successMetrics', metricInput, () => setMetricInput('')); }}}
                placeholder="Add metric and press Enter" />
              <Button type="button" variant="outline" onClick={() => addToList('successMetrics', metricInput, () => setMetricInput(''))}>Add</Button>
            </div>
            {renderChips('successMetrics')}
          </div>

          {/* Supporting Teams */}
          <div className="space-y-1.5">
            <Label>Supporting Teams</Label>
            <div className="flex gap-2">
              <Input value={teamInput} onChange={e => setTeamInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addToList('supportingTeams', teamInput, () => setTeamInput('')); }}}
                placeholder="Add team and press Enter" />
              <Button type="button" variant="outline" onClick={() => addToList('supportingTeams', teamInput, () => setTeamInput(''))}>Add</Button>
            </div>
            {renderChips('supportingTeams')}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>{t('cancel')}</Button>
          <Button onClick={handleSave} disabled={!canSave}>{t('addProduct')}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ProductFormDialog;
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useApp } from '@/context/AppContext';
import { Product, LifecycleStage } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { MultiSelect } from '@/components/ui/multi-select';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from '@/components/ui/form';
import { toast } from 'sonner';
import {
  nameField, codeField, longText, optionalText, personField, dateField, M,
} from '@/lib/validation';

interface ProductFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  portfolioId: number;
  portfolioName?: string;
  onCreated?: (product: Product) => void;
}

const ProductFormDialog = ({
  open, onOpenChange, portfolioId, portfolioName, onCreated,
}: ProductFormDialogProps) => {
  const { addProduct, t, state } = useApp();
  const portfolioObjectives = state.strategicObjectives.filter(o => o.portfolioId === portfolioId);

  const schema = z.object({
    name: nameField('Name'),
    code: codeField('Code', { min: 2, max: 8 }).refine(
      v => !state.products.some(p => p.code.trim().toUpperCase() === v),
      { message: M.duplicate('Code') },
    ),
    status: z.enum(['Planned', 'Development', 'Active', 'Archived']),
    lifecycleStage: z.enum(['Ideation', 'Development', 'Growth', 'Mature', 'Sunset']),
    startDate: dateField('Start Date', false),
    description: longText('Description', 1000),
    purpose: longText('Purpose', 500),
    businessProblem: longText('Business Problem', 500),
    strategicObjective: longText('Strategic Objective', 500),
    businessValue: longText('Business Value', 500),
    valueProposition: longText('Value Proposition', 500),
    targetClient: optionalText('Target Client', 100),
    endUser: optionalText('End User', 100),
    owner: personField('Owner', true),
    technicalOwner: personField('Technical Owner', false),
    deliveryManager: personField('Delivery Manager', false),
    businessStakeholder: personField('Business Stakeholder', false),
  });
  type FormValues = z.infer<typeof schema>;

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    mode: 'onBlur',
    defaultValues: {
      name: '', code: '', status: 'Planned', lifecycleStage: 'Ideation',
      startDate: '', description: '', purpose: '', businessProblem: '',
      strategicObjective: '', businessValue: '', valueProposition: '',
      targetClient: '', endUser: '',
      owner: '', technicalOwner: '', deliveryManager: '', businessStakeholder: '',
    },
  });

  // Chip-list state (capabilities, successMetrics, supportingTeams)
  const [capabilities, setCapabilities] = useState<string[]>([]);
  const [successMetrics, setSuccessMetrics] = useState<string[]>([]);
  const [supportingTeams, setSupportingTeams] = useState<string[]>([]);
  const [objectiveIds, setObjectiveIds] = useState<number[]>([]);
  const [capInput, setCapInput] = useState('');
  const [metricInput, setMetricInput] = useState('');
  const [teamInput, setTeamInput] = useState('');

  useEffect(() => {
    if (open) {
      form.reset();
      setCapabilities([]); setSuccessMetrics([]); setSupportingTeams([]);
      setObjectiveIds([]);
      setCapInput(''); setMetricInput(''); setTeamInput('');
    }
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const addChip = (
    raw: string,
    list: string[],
    setList: (v: string[]) => void,
    reset: () => void,
    label: string,
  ) => {
    const v = raw.trim();
    if (!v) return;
    if (v.length > 60) { toast.error(`${label} must be 60 characters or fewer`); return; }
    if (list.some(x => x.toLowerCase() === v.toLowerCase())) {
      toast.error(`${label} already added`); return;
    }
    setList([...list, v]);
    reset();
  };

  const removeChip = (idx: number, list: string[], setList: (v: string[]) => void) => {
    const next = [...list]; next.splice(idx, 1); setList(next);
  };

  const Chips = ({ items, onRemove }: { items: string[]; onRemove: (i: number) => void }) =>
    items.length === 0 ? null : (
      <div className="flex flex-wrap gap-1.5 mt-2">
        {items.map((item, i) => (
          <span key={i} className="inline-flex items-center gap-1 text-xs bg-secondary text-secondary-foreground px-2 py-1 rounded-md">
            {item}
            <button type="button" className="text-muted-foreground hover:text-foreground" onClick={() => onRemove(i)}>×</button>
          </span>
        ))}
      </div>
    );

  const onSubmit = (values: FormValues) => {
    const created = addProduct({
      portfolioId,
      name: values.name,
      code: values.code,
      status: values.status,
      owner: values.owner || '',
      description: values.description || '',
      businessValue: values.businessValue || '',
      targetClient: values.targetClient || '',
      endUser: values.endUser || '',
      valueProposition: values.valueProposition || '',
      purpose: values.purpose || '',
      businessProblem: values.businessProblem || '',
      strategicObjective: values.strategicObjective || '',
      lifecycleStage: values.lifecycleStage as LifecycleStage,
      startDate: values.startDate || '',
      capabilities,
      successMetrics,
      technicalOwner: values.technicalOwner || '',
      deliveryManager: values.deliveryManager || '',
      businessStakeholder: values.businessStakeholder || '',
      supportingTeams,
      strategicObjectiveIds: objectiveIds,
    });
    toast.success(`Product "${created.name}" created`);
    onOpenChange(false);
    onCreated?.(created);
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

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-2" noValidate>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <FormField control={form.control} name="name" render={({ field }) => (
                <FormItem className="sm:col-span-2">
                  <FormLabel>Name *</FormLabel>
                  <FormControl><Input placeholder="Product name" maxLength={100} {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="code" render={({ field }) => (
                <FormItem>
                  <FormLabel>Code *</FormLabel>
                  <FormControl>
                    <Input placeholder="ABC" maxLength={8} {...field}
                      onChange={e => field.onChange(e.target.value.toUpperCase())} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <FormField control={form.control} name="status" render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('status')}</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>
                      <SelectItem value="Planned">Planned</SelectItem>
                      <SelectItem value="Development">Development</SelectItem>
                      <SelectItem value="Active">Active</SelectItem>
                      <SelectItem value="Archived">Archived</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="lifecycleStage" render={({ field }) => (
                <FormItem>
                  <FormLabel>Lifecycle Stage</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>
                      <SelectItem value="Ideation">Ideation</SelectItem>
                      <SelectItem value="Development">Development</SelectItem>
                      <SelectItem value="Growth">Growth</SelectItem>
                      <SelectItem value="Mature">Mature</SelectItem>
                      <SelectItem value="Sunset">Sunset</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="startDate" render={({ field }) => (
                <FormItem>
                  <FormLabel>Start Date</FormLabel>
                  <FormControl><Input type="date" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            <FormField control={form.control} name="description" render={({ field }) => (
              <FormItem><FormLabel>Description</FormLabel>
                <FormControl><Textarea rows={2} maxLength={1000} {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="purpose" render={({ field }) => (
              <FormItem><FormLabel>Purpose</FormLabel>
                <FormControl><Textarea rows={2} maxLength={500} {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="businessProblem" render={({ field }) => (
              <FormItem><FormLabel>Business Problem</FormLabel>
                <FormControl><Textarea rows={2} maxLength={500} {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <div className="space-y-1.5">
              <Label>{t('strategicAlignment')}</Label>
              {portfolioObjectives.length === 0 ? (
                <p className="text-xs text-muted-foreground">{t('noObjectivesForPortfolio')}</p>
              ) : (
                <MultiSelect
                  options={portfolioObjectives.map(o => ({
                    value: String(o.id),
                    label: o.title,
                    description: o.description,
                  }))}
                  value={objectiveIds.map(String)}
                  onChange={(vals) => setObjectiveIds(vals.map(v => Number(v)).filter(n => !Number.isNaN(n)))}
                  placeholder={t('selectStrategicObjectives')}
                  searchPlaceholder="Search objectives…"
                  emptyText="No matching objectives"
                />
              )}
            </div>

            <FormField control={form.control} name="businessValue" render={({ field }) => (
              <FormItem><FormLabel>Business Value</FormLabel>
                <FormControl><Textarea rows={2} maxLength={500} {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="valueProposition" render={({ field }) => (
              <FormItem><FormLabel>Value Proposition</FormLabel>
                <FormControl><Textarea rows={2} maxLength={500} {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField control={form.control} name="targetClient" render={({ field }) => (
                <FormItem><FormLabel>Target Client</FormLabel>
                  <FormControl><Input maxLength={100} {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="endUser" render={({ field }) => (
                <FormItem><FormLabel>End User</FormLabel>
                  <FormControl><Input maxLength={100} {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField control={form.control} name="owner" render={({ field }) => (
                <FormItem><FormLabel>Owner (Product) *</FormLabel>
                  <FormControl><Input maxLength={100} {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="technicalOwner" render={({ field }) => (
                <FormItem><FormLabel>Technical Owner</FormLabel>
                  <FormControl><Input maxLength={100} {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="deliveryManager" render={({ field }) => (
                <FormItem><FormLabel>Delivery Manager</FormLabel>
                  <FormControl><Input maxLength={100} {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="businessStakeholder" render={({ field }) => (
                <FormItem><FormLabel>Business Stakeholder</FormLabel>
                  <FormControl><Input maxLength={100} {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            {/* Chip lists — validated client-side via addChip */}
            <div className="space-y-1.5">
              <Label>Capabilities</Label>
              <div className="flex gap-2">
                <Input value={capInput} onChange={e => setCapInput(e.target.value)} maxLength={60}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addChip(capInput, capabilities, setCapabilities, () => setCapInput(''), 'Capability'); }}}
                  placeholder="Add capability and press Enter" />
                <Button type="button" variant="outline" onClick={() => addChip(capInput, capabilities, setCapabilities, () => setCapInput(''), 'Capability')}>Add</Button>
              </div>
              <Chips items={capabilities} onRemove={i => removeChip(i, capabilities, setCapabilities)} />
            </div>

            <div className="space-y-1.5">
              <Label>Success Metrics</Label>
              <div className="flex gap-2">
                <Input value={metricInput} onChange={e => setMetricInput(e.target.value)} maxLength={60}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addChip(metricInput, successMetrics, setSuccessMetrics, () => setMetricInput(''), 'Metric'); }}}
                  placeholder="Add metric and press Enter" />
                <Button type="button" variant="outline" onClick={() => addChip(metricInput, successMetrics, setSuccessMetrics, () => setMetricInput(''), 'Metric')}>Add</Button>
              </div>
              <Chips items={successMetrics} onRemove={i => removeChip(i, successMetrics, setSuccessMetrics)} />
            </div>

            <div className="space-y-1.5">
              <Label>Supporting Teams</Label>
              <div className="flex gap-2">
                <Input value={teamInput} onChange={e => setTeamInput(e.target.value)} maxLength={60}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addChip(teamInput, supportingTeams, setSupportingTeams, () => setTeamInput(''), 'Team'); }}}
                  placeholder="Add team and press Enter" />
                <Button type="button" variant="outline" onClick={() => addChip(teamInput, supportingTeams, setSupportingTeams, () => setTeamInput(''), 'Team')}>Add</Button>
              </div>
              <Chips items={supportingTeams} onRemove={i => removeChip(i, supportingTeams, setSupportingTeams)} />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>{t('cancel')}</Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>{t('addProduct')}</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default ProductFormDialog;

import { useEffect, useMemo, useRef, useState } from 'react';
import { useApp } from '@/context/AppContext';
import { Product, LifecycleStage, ProductHealth, ProductHealthStatus, ProductMaturity } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Plus, Check, X, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { MultiSelect } from '@/components/ui/multi-select';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: Product;
}

const LIFECYCLE_STAGES: LifecycleStage[] = ['Ideation', 'Development', 'Growth', 'Mature', 'Sunset'];
const STATUSES: Product['status'][] = ['Planned', 'Development', 'Active', 'Archived'];

const PRESET_CAPABILITIES = [
  'User Authentication', 'License Application', 'Payment Processing', 'Document Verification',
  'Status Tracking', 'Dashboard Analytics', 'Notification Engine', 'Compliance Checks',
  'Auto-Renewal', 'Reporting', 'API Integration', 'Data Export', 'Audit Trail',
  'Multi-language Support', 'Role Management', 'Workflow Engine',
];
const PRESET_METRICS = [
  'Revenue Growth', 'Transaction Volume', 'Processing Time', 'User Satisfaction',
  'Adoption Rate', 'Renewal Rate', 'Compliance Score', 'Cost Reduction',
  'Uptime SLA', 'Feature Velocity', 'Customer Retention', 'NPS Score',
];

const MAX = {
  name: 100,
  description: 150,
  purpose: 150,
  strategic: 200,
  business: 200,
  capability: 60,
  metric: 60,
  capabilities: 15,
  metrics: 10,
};

type FormState = {
  name: string;
  owner: string;
  status: Product['status'];
  lifecycleStage: LifecycleStage;
  technicalOwner: string;
  deliveryManager: string;
  description: string;
  purpose: string;
  strategicObjective: string;
  businessValue: string;
  capabilities: string[];
  successMetrics: string[];
  strategicObjectiveIds: number[];
  // Product Health (user-defined)
  healthStatus: ProductHealthStatus;
  healthOverallScore: string;
  healthAdoption: string;
  healthStability: string;
  healthSatisfaction: string;
  healthOpsReadiness: string;
  healthNotes: string;
  // Product Maturity (user-scored 0–100)
  matAdoption: string;
  matRevenue: string;
  matEfficiency: string;
  matStability: string;
  matSatisfaction: string;
};

type Errors = Partial<Record<keyof FormState, string>>;

const fieldOrder: (keyof FormState)[] = [
  'name', 'owner', 'status', 'lifecycleStage', 'technicalOwner', 'deliveryManager',
  'description', 'purpose', 'strategicObjective', 'businessValue', 'capabilities', 'successMetrics',
];

const EditProductProfileDialog = ({ open, onOpenChange, product }: Props) => {
  const { state, updateProduct, t } = useApp();
  const initialRef = useRef<FormState | null>(null);
  const fieldRefs = useRef<Record<string, HTMLElement | null>>({});

  const portfolioObjectives = useMemo(
    () => state.strategicObjectives.filter(o => o.portfolioId === product.portfolioId),
    [state.strategicObjectives, product.portfolioId],
  );

  const initial: FormState = useMemo(() => ({
    name: product.name ?? '',
    owner: product.owner ?? '',
    status: product.status ?? 'Planned',
    lifecycleStage: (product.lifecycleStage as LifecycleStage) ?? 'Ideation',
    technicalOwner: product.technicalOwner ?? '',
    deliveryManager: product.deliveryManager ?? '',
    description: product.description ?? '',
    purpose: product.purpose ?? '',
    strategicObjective: product.strategicObjective ?? '',
    businessValue: product.businessValue ?? '',
    capabilities: product.capabilities ? [...product.capabilities] : [],
    successMetrics: product.successMetrics ? [...product.successMetrics] : [],
    strategicObjectiveIds: product.strategicObjectiveIds ? [...product.strategicObjectiveIds] : [],
    healthStatus: (product.health?.status as ProductHealthStatus) ?? 'Healthy',
    healthOverallScore: product.health?.overallScore != null ? String(product.health.overallScore) : '',
    healthAdoption: product.health?.adoption != null ? String(product.health.adoption) : '',
    healthStability: product.health?.stability != null ? String(product.health.stability) : '',
    healthSatisfaction: product.health?.satisfaction != null ? String(product.health.satisfaction) : '',
    healthOpsReadiness: product.health?.operationalReadiness != null ? String(product.health.operationalReadiness) : '',
    healthNotes: product.health?.notes ?? '',
    matAdoption: product.maturity?.adoption != null ? String(product.maturity.adoption) : '',
    matRevenue: product.maturity?.revenuePerformance != null ? String(product.maturity.revenuePerformance) : '',
    matEfficiency: product.maturity?.efficiency != null ? String(product.maturity.efficiency) : '',
    matStability: product.maturity?.stability != null ? String(product.maturity.stability) : '',
    matSatisfaction: product.maturity?.customerSatisfaction != null ? String(product.maturity.customerSatisfaction) : '',
  }), [product]);

  const [data, setData] = useState<FormState>(initial);
  const [touched, setTouched] = useState<Partial<Record<keyof FormState, boolean>>>({});
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [newCap, setNewCap] = useState('');
  const [newMetric, setNewMetric] = useState('');
  const [chipError, setChipError] = useState<{ kind: 'cap' | 'metric'; msg: string } | null>(null);

  useEffect(() => {
    if (open) {
      setData(initial);
      initialRef.current = initial;
      setTouched({});
      setSubmitAttempted(false);
      setNewCap(''); setNewMetric(''); setChipError(null);
    }
  }, [open, initial]);

  // Validation
  const validate = (s: FormState): Errors => {
    const e: Errors = {};
    const nm = s.name.trim();
    if (!nm) e.name = 'Product name is required';
    else if (nm.length > MAX.name) e.name = `Product name cannot exceed ${MAX.name} characters`;
    else {
      const portfolioId = product.portfolioId;
      const dup = state.products.some(
        p => p.id !== product.id && p.portfolioId === portfolioId &&
             p.name.trim().toLowerCase() === nm.toLowerCase(),
      );
      if (dup) e.name = 'Product name already exists';
    }

    if (!s.owner.trim()) e.owner = 'Please select an owner';
    if (!s.status) e.status = 'Please select a status';
    if (!s.lifecycleStage) e.lifecycleStage = 'Please select a lifecycle stage';

    const desc = s.description.trim();
    if (!desc) e.description = 'Description is required';
    else if (desc.length > MAX.description) e.description = `Description cannot exceed ${MAX.description} characters`;

    const purp = s.purpose.trim();
    if (!purp) e.purpose = 'Purpose is required';
    else if (purp.length > MAX.purpose) e.purpose = `Purpose cannot exceed ${MAX.purpose} characters`;

    if (s.strategicObjective.trim().length > MAX.strategic)
      e.strategicObjective = `Strategic objective cannot exceed ${MAX.strategic} characters`;
    if (s.businessValue.trim().length > MAX.business)
      e.businessValue = `Business value cannot exceed ${MAX.business} characters`;

    // Score range validation (0–100, integer or empty)
    const scoreFields: (keyof FormState)[] = [
      'healthOverallScore', 'healthAdoption', 'healthStability', 'healthSatisfaction', 'healthOpsReadiness',
      'matAdoption', 'matRevenue', 'matEfficiency', 'matStability', 'matSatisfaction',
    ];
    scoreFields.forEach(k => {
      const raw = String(s[k] ?? '').trim();
      if (raw === '') return;
      const n = Number(raw);
      if (!Number.isFinite(n) || n < 0 || n > 100) {
        (e as any)[k] = 'Enter a value between 0 and 100';
      }
    });

    return e;
  };

  const errors = validate(data);
  const isValid = Object.keys(errors).length === 0;
  const isDirty = JSON.stringify(data) !== JSON.stringify(initialRef.current);
  const showError = (k: keyof FormState) => (touched[k] || submitAttempted) && errors[k];

  const setField = <K extends keyof FormState>(k: K, v: FormState[K]) => {
    setData(prev => ({ ...prev, [k]: v }));
  };

  const blur = (k: keyof FormState) => setTouched(prev => ({ ...prev, [k]: true }));

  const trimAll = (s: FormState): FormState => ({
    ...s,
    name: s.name.trim(),
    owner: s.owner.trim(),
    technicalOwner: s.technicalOwner.trim(),
    deliveryManager: s.deliveryManager.trim(),
    description: s.description.trim(),
    purpose: s.purpose.trim(),
    strategicObjective: s.strategicObjective.trim(),
    businessValue: s.businessValue.trim(),
  });

  const handleSave = () => {
    setSubmitAttempted(true);
    const trimmed = trimAll(data);
    const errs = validate(trimmed);
    if (Object.keys(errs).length > 0) {
      // Scroll to first error
      const firstErr = fieldOrder.find(f => errs[f]);
      if (firstErr) {
        const el = fieldRefs.current[firstErr];
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          (el as HTMLElement).focus?.();
        }
      }
      return;
    }
    updateProduct(product.id, trimmed);
    onOpenChange(false);
  };

  const handleCancel = () => {
    if (isDirty) setConfirmCancel(true);
    else onOpenChange(false);
  };

  // Chip operations
  const toggleCap = (cap: string) => {
    setChipError(null);
    setData(prev => {
      const has = prev.capabilities.includes(cap);
      if (has) return { ...prev, capabilities: prev.capabilities.filter(c => c !== cap) };
      if (prev.capabilities.length >= MAX.capabilities) {
        setChipError({ kind: 'cap', msg: `Maximum ${MAX.capabilities} capabilities allowed` });
        return prev;
      }
      return { ...prev, capabilities: [...prev.capabilities, cap] };
    });
  };

  const addCustomCap = () => {
    const v = newCap.trim();
    if (!v) return;
    if (v.length > MAX.capability) { setChipError({ kind: 'cap', msg: `Maximum ${MAX.capability} characters` }); return; }
    if (data.capabilities.some(c => c.toLowerCase() === v.toLowerCase())) {
      setChipError({ kind: 'cap', msg: 'This capability is already added' });
      return;
    }
    if (data.capabilities.length >= MAX.capabilities) {
      setChipError({ kind: 'cap', msg: `Maximum ${MAX.capabilities} capabilities allowed` });
      return;
    }
    setData(prev => ({ ...prev, capabilities: [...prev.capabilities, v] }));
    setNewCap(''); setChipError(null);
  };

  const removeCap = (cap: string) => {
    setData(prev => ({ ...prev, capabilities: prev.capabilities.filter(c => c !== cap) }));
    setChipError(null);
  };

  const toggleMetric = (m: string) => {
    setChipError(null);
    setData(prev => {
      const has = prev.successMetrics.includes(m);
      if (has) return { ...prev, successMetrics: prev.successMetrics.filter(x => x !== m) };
      if (prev.successMetrics.length >= MAX.metrics) {
        setChipError({ kind: 'metric', msg: `Maximum ${MAX.metrics} metrics allowed` });
        return prev;
      }
      return { ...prev, successMetrics: [...prev.successMetrics, m] };
    });
  };

  const addCustomMetric = () => {
    const v = newMetric.trim();
    if (!v) return;
    if (v.length > MAX.metric) { setChipError({ kind: 'metric', msg: `Maximum ${MAX.metric} characters` }); return; }
    if (data.successMetrics.some(c => c.toLowerCase() === v.toLowerCase())) {
      setChipError({ kind: 'metric', msg: 'This metric is already added' });
      return;
    }
    if (data.successMetrics.length >= MAX.metrics) {
      setChipError({ kind: 'metric', msg: `Maximum ${MAX.metrics} metrics allowed` });
      return;
    }
    setData(prev => ({ ...prev, successMetrics: [...prev.successMetrics, v] }));
    setNewMetric(''); setChipError(null);
  };

  const removeMetric = (m: string) => {
    setData(prev => ({ ...prev, successMetrics: prev.successMetrics.filter(x => x !== m) }));
    setChipError(null);
  };

  // UI helpers
  const errClasses = (k: keyof FormState) =>
    showError(k) ? 'border-destructive focus-visible:ring-destructive' : '';

  const Counter = ({ value, max }: { value: string; max: number }) => (
    <span className={cn(
      'text-[10px] tabular-nums',
      value.length > max ? 'text-destructive font-semibold' : 'text-muted-foreground',
    )}>
      {value.length} / {max}
    </span>
  );

  const ErrorMsg = ({ k }: { k: keyof FormState }) =>
    showError(k) ? (
      <p className="flex items-center gap-1 text-xs text-destructive mt-1">
        <AlertCircle className="w-3 h-3" /> {errors[k]}
      </p>
    ) : null;

  return (
    <>
      <Dialog open={open} onOpenChange={(o) => { if (!o) handleCancel(); else onOpenChange(o); }}>
        <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t('editProductProfile')}</DialogTitle>
            <DialogDescription>Update product details. Required fields are marked with *.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Name (full width) */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <Label htmlFor="pp-name" className="text-xs">Name *</Label>
                <Counter value={data.name} max={MAX.name} />
              </div>
              <Input
                id="pp-name"
                ref={(el) => { fieldRefs.current.name = el; }}
                value={data.name}
                maxLength={MAX.name}
                onChange={e => setField('name', e.target.value)}
                onBlur={() => { setField('name', data.name.trim()); blur('name'); }}
                className={errClasses('name')}
              />
              <ErrorMsg k="name" />
            </div>

            {/* Owner / Status: 50% width */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="pp-owner" className="text-xs">Owner *</Label>
                <Input
                  id="pp-owner"
                  ref={(el) => { fieldRefs.current.owner = el; }}
                  value={data.owner}
                  maxLength={100}
                  onChange={e => setField('owner', e.target.value)}
                  onBlur={() => { setField('owner', data.owner.trim()); blur('owner'); }}
                  className={errClasses('owner')}
                />
                <ErrorMsg k="owner" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Status *</Label>
                <Select value={data.status} onValueChange={v => { setField('status', v as Product['status']); blur('status'); }}>
                  <SelectTrigger ref={(el) => { fieldRefs.current.status = el as unknown as HTMLElement; }} className={errClasses('status')}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
                <ErrorMsg k="status" />
              </div>
            </div>

            {/* Lifecycle / Technical Owner */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Lifecycle Stage *</Label>
                <Select value={data.lifecycleStage} onValueChange={v => { setField('lifecycleStage', v as LifecycleStage); blur('lifecycleStage'); }}>
                  <SelectTrigger ref={(el) => { fieldRefs.current.lifecycleStage = el as unknown as HTMLElement; }} className={errClasses('lifecycleStage')}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {LIFECYCLE_STAGES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
                <ErrorMsg k="lifecycleStage" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="pp-tech" className="text-xs">Technical Owner</Label>
                <Input
                  id="pp-tech"
                  ref={(el) => { fieldRefs.current.technicalOwner = el; }}
                  value={data.technicalOwner}
                  maxLength={100}
                  onChange={e => setField('technicalOwner', e.target.value)}
                  onBlur={() => setField('technicalOwner', data.technicalOwner.trim())}
                />
              </div>
            </div>

            {/* Delivery Manager */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="pp-dm" className="text-xs">Delivery Manager</Label>
                <Input
                  id="pp-dm"
                  ref={(el) => { fieldRefs.current.deliveryManager = el; }}
                  value={data.deliveryManager}
                  maxLength={100}
                  onChange={e => setField('deliveryManager', e.target.value)}
                  onBlur={() => setField('deliveryManager', data.deliveryManager.trim())}
                />
              </div>
            </div>

            {/* Description (textarea, full width) */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <Label htmlFor="pp-desc" className="text-xs">Feature Description *</Label>
                <Counter value={data.description} max={MAX.description} />
              </div>
              <Textarea
                id="pp-desc"
                ref={(el) => { fieldRefs.current.description = el; }}
                rows={2}
                value={data.description}
                maxLength={MAX.description}
                onChange={e => setField('description', e.target.value)}
                onBlur={() => { setField('description', data.description.trim()); blur('description'); }}
                className={errClasses('description')}
              />
              <ErrorMsg k="description" />
            </div>

            {/* Purpose */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <Label htmlFor="pp-purpose" className="text-xs">Purpose *</Label>
                <Counter value={data.purpose} max={MAX.purpose} />
              </div>
              <Textarea
                id="pp-purpose"
                ref={(el) => { fieldRefs.current.purpose = el; }}
                rows={2}
                value={data.purpose}
                maxLength={MAX.purpose}
                onChange={e => setField('purpose', e.target.value)}
                onBlur={() => { setField('purpose', data.purpose.trim()); blur('purpose'); }}
                className={errClasses('purpose')}
              />
              <ErrorMsg k="purpose" />
            </div>

            {/* Strategic Alignment (linked objectives) */}
            <div className="space-y-1.5">
              <Label className="text-xs">{t('strategicAlignment')} <span className="text-muted-foreground">(optional)</span></Label>
              {portfolioObjectives.length === 0 ? (
                <p className="text-xs text-muted-foreground">{t('noObjectivesForPortfolio')}</p>
              ) : (
                <MultiSelect
                  options={portfolioObjectives.map(o => ({
                    value: String(o.id), label: o.title, description: o.description,
                  }))}
                  value={data.strategicObjectiveIds.map(String)}
                  onChange={(vals) => setField('strategicObjectiveIds',
                    vals.map(v => Number(v)).filter(n => !Number.isNaN(n)))}
                  placeholder={t('selectStrategicObjectives')}
                  searchPlaceholder="Search objectives…"
                />
              )}
            </div>

            {/* Business Value */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <Label htmlFor="pp-bv" className="text-xs">
                  Business Value <span className="text-muted-foreground">(optional)</span>
                </Label>
                <Counter value={data.businessValue} max={MAX.business} />
              </div>
              <Textarea
                id="pp-bv"
                ref={(el) => { fieldRefs.current.businessValue = el; }}
                rows={2}
                value={data.businessValue}
                maxLength={MAX.business}
                onChange={e => setField('businessValue', e.target.value)}
                onBlur={() => { setField('businessValue', data.businessValue.trim()); blur('businessValue'); }}
                className={errClasses('businessValue')}
              />
              <ErrorMsg k="businessValue" />
            </div>

            {/* Capabilities */}
            <div className="space-y-2" ref={(el) => { fieldRefs.current.capabilities = el; }}>
              <div className="flex justify-between items-center">
                <Label className="text-xs">Capabilities</Label>
                <span className={cn(
                  'text-[10px] tabular-nums',
                  data.capabilities.length >= MAX.capabilities ? 'text-destructive font-semibold' : 'text-muted-foreground',
                )}>
                  {data.capabilities.length} / {MAX.capabilities}
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {Array.from(new Set([...PRESET_CAPABILITIES, ...data.capabilities])).map(cap => {
                  const selected = data.capabilities.includes(cap);
                  const disabled = !selected && data.capabilities.length >= MAX.capabilities;
                  return (
                    <button
                      type="button"
                      key={cap}
                      onClick={() => !disabled && toggleCap(cap)}
                      disabled={disabled}
                      className={cn(
                        'px-2.5 py-1 rounded-full text-xs font-medium border transition-colors',
                        selected
                          ? 'bg-primary/10 text-primary border-primary/30'
                          : 'bg-secondary text-muted-foreground border-transparent hover:border-border',
                        disabled && 'opacity-40 cursor-not-allowed',
                      )}
                    >
                      {selected && <Check className="w-3 h-3 inline me-1" />}
                      {cap}
                      {selected && !PRESET_CAPABILITIES.includes(cap) && (
                        <X
                          className="w-3 h-3 inline ms-1"
                          onClick={(e) => { e.stopPropagation(); removeCap(cap); }}
                        />
                      )}
                    </button>
                  );
                })}
              </div>
              <div className="flex gap-2">
                <Input
                  value={newCap}
                  onChange={e => { setNewCap(e.target.value); setChipError(null); }}
                  placeholder="Add custom capability..."
                  className="h-8 text-xs"
                  maxLength={MAX.capability}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addCustomCap(); } }}
                  disabled={data.capabilities.length >= MAX.capabilities}
                />
                <Button size="sm" variant="outline" className="h-8" onClick={addCustomCap}
                  disabled={data.capabilities.length >= MAX.capabilities || !newCap.trim()}>
                  <Plus className="w-3.5 h-3.5" />
                </Button>
              </div>
              {chipError?.kind === 'cap' && (
                <p className="flex items-center gap-1 text-xs text-destructive">
                  <AlertCircle className="w-3 h-3" /> {chipError.msg}
                </p>
              )}
            </div>

            {/* Success Metrics */}
            <div className="space-y-2" ref={(el) => { fieldRefs.current.successMetrics = el; }}>
              <div className="flex justify-between items-center">
                <Label className="text-xs">Success Metrics</Label>
                <span className={cn(
                  'text-[10px] tabular-nums',
                  data.successMetrics.length >= MAX.metrics ? 'text-destructive font-semibold' : 'text-muted-foreground',
                )}>
                  {data.successMetrics.length} / {MAX.metrics}
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {Array.from(new Set([...PRESET_METRICS, ...data.successMetrics])).map(m => {
                  const selected = data.successMetrics.includes(m);
                  const disabled = !selected && data.successMetrics.length >= MAX.metrics;
                  return (
                    <button
                      type="button"
                      key={m}
                      onClick={() => !disabled && toggleMetric(m)}
                      disabled={disabled}
                      className={cn(
                        'px-2.5 py-1 rounded-full text-xs font-medium border transition-colors',
                        selected
                          ? 'bg-primary/10 text-primary border-primary/30'
                          : 'bg-secondary text-muted-foreground border-transparent hover:border-border',
                        disabled && 'opacity-40 cursor-not-allowed',
                      )}
                    >
                      {selected && <Check className="w-3 h-3 inline me-1" />}
                      {m}
                      {selected && !PRESET_METRICS.includes(m) && (
                        <X
                          className="w-3 h-3 inline ms-1"
                          onClick={(e) => { e.stopPropagation(); removeMetric(m); }}
                        />
                      )}
                    </button>
                  );
                })}
              </div>
              <div className="flex gap-2">
                <Input
                  value={newMetric}
                  onChange={e => { setNewMetric(e.target.value); setChipError(null); }}
                  placeholder="Add custom metric..."
                  className="h-8 text-xs"
                  maxLength={MAX.metric}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addCustomMetric(); } }}
                  disabled={data.successMetrics.length >= MAX.metrics}
                />
                <Button size="sm" variant="outline" className="h-8" onClick={addCustomMetric}
                  disabled={data.successMetrics.length >= MAX.metrics || !newMetric.trim()}>
                  <Plus className="w-3.5 h-3.5" />
                </Button>
              </div>
              {chipError?.kind === 'metric' && (
                <p className="flex items-center gap-1 text-xs text-destructive">
                  <AlertCircle className="w-3 h-3" /> {chipError.msg}
                </p>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={handleCancel}>{t('cancel')}</Button>
            <Button size="sm" onClick={handleSave} disabled={!isValid}>
              {t('saveChanges')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmCancel} onOpenChange={setConfirmCancel}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Discard unsaved changes?</AlertDialogTitle>
            <AlertDialogDescription>
              You have unsaved changes. Are you sure you want to leave?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep editing</AlertDialogCancel>
            <AlertDialogAction onClick={() => { setConfirmCancel(false); onOpenChange(false); }}>
              Discard
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default EditProductProfileDialog;

import { useEffect, useMemo, useRef, useState } from 'react';
import { useApp } from '@/context/AppContext';
import { Product, LifecycleStage, ProductHealth, ProductHealthStatus, ProductMaturity, ProductUsage, EngagementLevel, UsageTrend } from '@/types';
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
import { toast } from 'sonner';

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
  businessProblem: 300,
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
  businessProblem: string;
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
  // Product Usage / User Behavior
  usageNumberOfUsers: string;
  usageYearlyTransactions: string;
  usageActiveUsersPct: string;
  usageRepeatUsagePct: string;
  usageEngagementLevel: EngagementLevel | '';
  usageTrend: UsageTrend | '';
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
    businessProblem: product.businessProblem ?? '',
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
    usageNumberOfUsers: product.usage?.numberOfUsers != null ? String(product.usage.numberOfUsers) : '',
    usageYearlyTransactions: product.usage?.yearlyTransactions != null ? String(product.usage.yearlyTransactions) : '',
    usageActiveUsersPct: product.usage?.activeUsersPct != null ? String(product.usage.activeUsersPct) : '',
    usageRepeatUsagePct: product.usage?.repeatUsagePct != null ? String(product.usage.repeatUsagePct) : '',
    usageEngagementLevel: (product.usage?.engagementLevel as EngagementLevel) ?? '',
    usageTrend: (product.usage?.usageTrend as UsageTrend) ?? '',
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
    if (desc.length > MAX.description) e.description = `Description cannot exceed ${MAX.description} characters`;

    const purp = s.purpose.trim();
    if (purp.length > MAX.purpose) e.purpose = `Purpose cannot exceed ${MAX.purpose} characters`;

    if (s.strategicObjective.trim().length > MAX.strategic)
      e.strategicObjective = `Strategic objective cannot exceed ${MAX.strategic} characters`;
    if (s.businessValue.trim().length > MAX.business)
      e.businessValue = `Business value cannot exceed ${MAX.business} characters`;
    if (s.businessProblem.trim().length > MAX.businessProblem)
      e.businessProblem = `Business problem cannot exceed ${MAX.businessProblem} characters`;

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

    // Usage percent fields (0–100)
    (['usageActiveUsersPct', 'usageRepeatUsagePct'] as const).forEach(k => {
      const raw = String(s[k] ?? '').trim();
      if (raw === '') return;
      const n = Number(raw);
      if (!Number.isFinite(n) || n < 0 || n > 100) {
        (e as any)[k] = 'Enter a value between 0 and 100';
      }
    });

    // Usage non-negative integer fields
    (['usageNumberOfUsers', 'usageYearlyTransactions'] as const).forEach(k => {
      const raw = String(s[k] ?? '').trim();
      if (raw === '') return;
      const n = Number(raw);
      if (!Number.isFinite(n) || n < 0 || !Number.isInteger(n)) {
        (e as any)[k] = 'Enter a non-negative whole number';
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
    businessProblem: s.businessProblem.trim(),
    healthNotes: s.healthNotes.trim(),
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
    const numOrUndef = (s: string): number | undefined => {
      const t = s.trim();
      if (t === '') return undefined;
      const n = Number(t);
      return Number.isFinite(n) ? Math.round(n) : undefined;
    };
    const health: ProductHealth = {
      status: trimmed.healthStatus,
      overallScore: numOrUndef(trimmed.healthOverallScore),
      adoption: numOrUndef(trimmed.healthAdoption),
      stability: numOrUndef(trimmed.healthStability),
      satisfaction: numOrUndef(trimmed.healthSatisfaction),
      operationalReadiness: numOrUndef(trimmed.healthOpsReadiness),
      notes: trimmed.healthNotes.trim() || undefined,
      updatedAt: new Date().toISOString(),
    };
    const maturity: ProductMaturity = {
      adoption: numOrUndef(trimmed.matAdoption),
      revenuePerformance: numOrUndef(trimmed.matRevenue),
      efficiency: numOrUndef(trimmed.matEfficiency),
      stability: numOrUndef(trimmed.matStability),
      customerSatisfaction: numOrUndef(trimmed.matSatisfaction),
    };
    const usage: ProductUsage = {
      numberOfUsers: numOrUndef(trimmed.usageNumberOfUsers),
      yearlyTransactions: numOrUndef(trimmed.usageYearlyTransactions),
      activeUsersPct: numOrUndef(trimmed.usageActiveUsersPct),
      repeatUsagePct: numOrUndef(trimmed.usageRepeatUsagePct),
      engagementLevel: trimmed.usageEngagementLevel || undefined,
      usageTrend: trimmed.usageTrend || undefined,
      updatedAt: new Date().toISOString(),
    };
    const {
      healthStatus, healthOverallScore, healthAdoption, healthStability, healthSatisfaction,
      healthOpsReadiness, healthNotes,
      matAdoption, matRevenue, matEfficiency, matStability, matSatisfaction,
      usageNumberOfUsers, usageYearlyTransactions, usageActiveUsersPct, usageRepeatUsagePct,
      usageEngagementLevel, usageTrend,
      ...productFields
    } = trimmed;
    updateProduct(product.id, { ...productFields, health, maturity, usage });
    toast.success('Changes saved');
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
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{t('editProductProfile')}</DialogTitle>
            <DialogDescription>Update product details. Required fields are marked with *.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
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
                <Label htmlFor="pp-desc" className="text-xs">Description</Label>
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
                <Label htmlFor="pp-purpose" className="text-xs">Purpose</Label>
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

            {/* Business Problem */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <Label htmlFor="pp-bp" className="text-xs">
                  Business Problem <span className="text-muted-foreground">(optional)</span>
                </Label>
                <Counter value={data.businessProblem} max={MAX.businessProblem} />
              </div>
              <Textarea
                id="pp-bp"
                ref={(el) => { fieldRefs.current.businessProblem = el; }}
                rows={2}
                value={data.businessProblem}
                maxLength={MAX.businessProblem}
                placeholder="What problem does this product solve?"
                onChange={e => setField('businessProblem', e.target.value)}
                onBlur={() => { setField('businessProblem', data.businessProblem.trim()); blur('businessProblem'); }}
                className={errClasses('businessProblem')}
              />
              <ErrorMsg k="businessProblem" />
            </div>

            {/* ───── Product Health (user-defined) ───── */}
            <div className="pt-3 mt-3 border-t border-border space-y-3">
              <div>
                <h4 className="text-sm font-semibold text-foreground">{t('sectionProductHealth')}</h4>
                <p className="text-[11px] text-muted-foreground">{t('healthHelpStatus')}</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">{t('healthStatus')} *</Label>
                  <Select value={data.healthStatus} onValueChange={v => setField('healthStatus', v as ProductHealthStatus)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Healthy">{t('healthStatusHealthy')}</SelectItem>
                      <SelectItem value="At Risk">{t('healthStatusAtRisk')}</SelectItem>
                      <SelectItem value="Critical">{t('healthStatusCritical')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="pp-overall" className="text-xs">{t('overallScore')} (0–100)</Label>
                  <Input
                    id="pp-overall"
                    type="number" min={0} max={100} step={1}
                    value={data.healthOverallScore}
                    onChange={e => setField('healthOverallScore', e.target.value)}
                    className={errClasses('healthOverallScore' as any)}
                  />
                  <p className="text-[10px] text-muted-foreground">{t('healthHelpScore')}</p>
                  <ErrorMsg k={'healthOverallScore' as any} />
                </div>
              </div>

              <div>
                <Label className="text-xs">{t('keyIndicators')}</Label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-1.5">
                  {([
                    { k: 'healthAdoption' as const, label: t('adoptionLevel'), help: t('healthHelpAdoption') },
                    { k: 'healthStability' as const, label: t('stability'), help: t('healthHelpStability') },
                    { k: 'healthSatisfaction' as const, label: t('customerSatisfaction'), help: t('healthHelpSatisfaction') },
                    { k: 'healthOpsReadiness' as const, label: t('operationalReadiness'), help: t('healthHelpOps') },
                  ]).map(f => (
                    <div key={f.k} className="space-y-1">
                      <Label htmlFor={`pp-${f.k}`} className="text-xs">{f.label} (0–100)</Label>
                      <Input
                        id={`pp-${f.k}`}
                        type="number" min={0} max={100} step={1}
                        value={data[f.k]}
                        onChange={e => setField(f.k, e.target.value)}
                        className={errClasses(f.k as any)}
                      />
                      <p className="text-[10px] text-muted-foreground">{f.help}</p>
                      <ErrorMsg k={f.k as any} />
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="pp-hnotes" className="text-xs">{t('healthNotes')}</Label>
                <Textarea
                  id="pp-hnotes" rows={2} maxLength={500}
                  value={data.healthNotes}
                  onChange={e => setField('healthNotes', e.target.value)}
                  placeholder={t('healthNotesPlaceholder')}
                />
              </div>
            </div>

            {/* ───── Product Maturity (user-scored) ───── */}
            <div className="pt-3 mt-3 border-t border-border space-y-3">
              <div>
                <h4 className="text-sm font-semibold text-foreground">{t('sectionProductMaturity')}</h4>
                <p className="text-[11px] text-muted-foreground">{t('scoreRangeHelp')}</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {([
                  { k: 'matAdoption' as const, label: t('maturityAdoption'), help: t('maturityHelpAdoption') },
                  { k: 'matRevenue' as const, label: t('maturityRevenue'), help: t('maturityHelpRevenue') },
                  { k: 'matEfficiency' as const, label: t('maturityEfficiency'), help: t('maturityHelpEfficiency') },
                  { k: 'matStability' as const, label: t('maturityStability'), help: t('maturityHelpStability') },
                  { k: 'matSatisfaction' as const, label: t('maturitySatisfaction'), help: t('maturityHelpSatisfaction') },
                ]).map(f => (
                  <div key={f.k} className="space-y-1">
                    <Label htmlFor={`pp-${f.k}`} className="text-xs">{f.label} (0–100)</Label>
                    <Input
                      id={`pp-${f.k}`}
                      type="number" min={0} max={100} step={1}
                      value={data[f.k]}
                      onChange={e => setField(f.k, e.target.value)}
                      className={errClasses(f.k as any)}
                    />
                    <p className="text-[10px] text-muted-foreground">{f.help}</p>
                    <ErrorMsg k={f.k as any} />
                  </div>
                ))}
              </div>
            </div>

            {/* ───── Product Usage / User Behavior ───── */}
            <div className="pt-3 mt-3 border-t border-border space-y-3">
              <div>
                <h4 className="text-sm font-semibold text-foreground">{t('sectionProductUsage')}</h4>
                <p className="text-[11px] text-muted-foreground">
                  {t('numberOfUsersHelp')} {t('yearlyTransactionsHelp')}
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="pp-usage-users" className="text-xs">{t('numberOfUsers')}</Label>
                  <Input
                    id="pp-usage-users"
                    type="number" min={0} step={1}
                    value={data.usageNumberOfUsers}
                    onChange={e => setField('usageNumberOfUsers', e.target.value)}
                    onBlur={() => blur('usageNumberOfUsers')}
                    className={errClasses('usageNumberOfUsers')}
                    placeholder="e.g. 1200"
                  />
                  <p className="text-[10px] text-muted-foreground">{t('numberOfUsersHelp')}</p>
                  <ErrorMsg k="usageNumberOfUsers" />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="pp-usage-tx" className="text-xs">
                    {t('yearlyTransactions')}
                  </Label>
                  <Input
                    id="pp-usage-tx"
                    type="number" min={0} step={1}
                    value={data.usageYearlyTransactions}
                    onChange={e => setField('usageYearlyTransactions', e.target.value)}
                    onBlur={() => blur('usageYearlyTransactions')}
                    className={errClasses('usageYearlyTransactions')}
                    placeholder="e.g. 50000"
                  />
                  <p className="text-[10px] text-muted-foreground">{t('yearlyTransactionsHelp')}</p>
                  <ErrorMsg k="usageYearlyTransactions" />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="pp-usage-active" className="text-xs">{t('activeUsersPct')} (0–100)</Label>
                  <Input
                    id="pp-usage-active"
                    type="number" min={0} max={100} step={1}
                    value={data.usageActiveUsersPct}
                    onChange={e => setField('usageActiveUsersPct', e.target.value)}
                    className={errClasses('usageActiveUsersPct')}
                  />
                  <ErrorMsg k="usageActiveUsersPct" />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="pp-usage-repeat" className="text-xs">{t('repeatUsagePct')} (0–100)</Label>
                  <Input
                    id="pp-usage-repeat"
                    type="number" min={0} max={100} step={1}
                    value={data.usageRepeatUsagePct}
                    onChange={e => setField('usageRepeatUsagePct', e.target.value)}
                    className={errClasses('usageRepeatUsagePct')}
                  />
                  <ErrorMsg k="usageRepeatUsagePct" />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs">{t('engagementLevel')}</Label>
                  <Select
                    value={data.usageEngagementLevel || 'none'}
                    onValueChange={v => setField('usageEngagementLevel', (v === 'none' ? '' : v) as EngagementLevel | '')}
                  >
                    <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">—</SelectItem>
                      <SelectItem value="Low">{t('engagementLow')}</SelectItem>
                      <SelectItem value="Medium">{t('engagementMedium')}</SelectItem>
                      <SelectItem value="High">{t('engagementHigh')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs">{t('usageTrend')}</Label>
                  <Select
                    value={data.usageTrend || 'none'}
                    onValueChange={v => setField('usageTrend', (v === 'none' ? '' : v) as UsageTrend | '')}
                  >
                    <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">—</SelectItem>
                      <SelectItem value="Increasing">{t('trendIncreasing')}</SelectItem>
                      <SelectItem value="Stable">{t('trendStable')}</SelectItem>
                      <SelectItem value="Declining">{t('trendDeclining')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
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

          <DialogFooter className="static mx-0 mb-0 px-6 py-3 shrink-0">
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

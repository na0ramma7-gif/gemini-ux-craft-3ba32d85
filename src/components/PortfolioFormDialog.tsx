import { useEffect, useState } from 'react';
import { useApp } from '@/context/AppContext';
import { Portfolio } from '@/types';
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

interface PortfolioFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: (portfolio: Portfolio) => void;
}

const empty: Omit<Portfolio, 'id'> = {
  name: '',
  code: '',
  description: '',
  priority: 'Medium',
  purpose: '',
  strategicObjective: '',
  businessValue: '',
  owner: '',
  technicalLead: '',
  businessStakeholder: '',
};

const PortfolioFormDialog = ({ open, onOpenChange, onCreated }: PortfolioFormDialogProps) => {
  const { addPortfolio, t } = useApp();
  const [form, setForm] = useState<Omit<Portfolio, 'id'>>(empty);

  useEffect(() => {
    if (open) setForm(empty);
  }, [open]);

  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) =>
    setForm(prev => ({ ...prev, [k]: v }));

  const canSave = form.name.trim().length > 0 && form.code.trim().length > 0;

  const handleSave = () => {
    if (!canSave) return;
    const created = addPortfolio(form);
    onOpenChange(false);
    onCreated?.(created);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t('addPortfolio')}</DialogTitle>
          <DialogDescription>Create a new portfolio with full profile details.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2 space-y-1.5">
              <Label>Name *</Label>
              <Input value={form.name} onChange={e => set('name', e.target.value)} placeholder="Portfolio name" />
            </div>
            <div className="space-y-1.5">
              <Label>Code *</Label>
              <Input value={form.code} onChange={e => set('code', e.target.value.toUpperCase())} placeholder="ABC" />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Description</Label>
            <Textarea value={form.description} onChange={e => set('description', e.target.value)} rows={2} />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>{t('priority')}</Label>
              <Select value={form.priority} onValueChange={v => set('priority', v as Portfolio['priority'])}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="High">{t('high')}</SelectItem>
                  <SelectItem value="Medium">{t('medium')}</SelectItem>
                  <SelectItem value="Low">{t('low')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Owner</Label>
              <Input value={form.owner || ''} onChange={e => set('owner', e.target.value)} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Purpose</Label>
            <Textarea value={form.purpose || ''} onChange={e => set('purpose', e.target.value)} rows={2} />
          </div>

          <div className="space-y-1.5">
            <Label>Strategic Objective</Label>
            <Textarea value={form.strategicObjective || ''} onChange={e => set('strategicObjective', e.target.value)} rows={2} />
          </div>

          <div className="space-y-1.5">
            <Label>Business Value</Label>
            <Textarea value={form.businessValue || ''} onChange={e => set('businessValue', e.target.value)} rows={2} />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Technical Lead</Label>
              <Input value={form.technicalLead || ''} onChange={e => set('technicalLead', e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Business Stakeholder</Label>
              <Input value={form.businessStakeholder || ''} onChange={e => set('businessStakeholder', e.target.value)} />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>{t('cancel')}</Button>
          <Button onClick={handleSave} disabled={!canSave}>{t('addPortfolio')}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default PortfolioFormDialog;
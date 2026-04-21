import { useEffect, useState } from 'react';
import { useApp } from '@/context/AppContext';
import { StrategicObjective, StrategicObjectiveStatus } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const MAX_TITLE = 150;
const MAX_DESC = 250;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  portfolioId: number;
  objective?: StrategicObjective | null;   // edit mode when provided
}

const StrategicObjectiveDialog = ({ open, onOpenChange, portfolioId, objective }: Props) => {
  const { addStrategicObjective, updateStrategicObjective, t } = useApp();
  const isEdit = !!objective;

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<StrategicObjectiveStatus>('Active');
  const [error, setError] = useState<string | null>(null);
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    if (!open) return;
    setTitle(objective?.title ?? '');
    setDescription(objective?.description ?? '');
    setStatus(objective?.status ?? 'Active');
    setError(null);
    setTouched(false);
  }, [open, objective]);

  const localError = (() => {
    const t = title.trim();
    if (!t) return 'Objective title is required';
    if (t.length > MAX_TITLE) return `Objective title cannot exceed ${MAX_TITLE} characters`;
    if (description.trim().length > MAX_DESC) return `Description cannot exceed ${MAX_DESC} characters`;
    return null;
  })();

  const handleSave = () => {
    setTouched(true);
    if (localError) { setError(localError); return; }
    const payload = {
      title: title.trim(),
      description: description.trim() || undefined,
      status,
    };
    if (isEdit && objective) {
      const res = updateStrategicObjective(objective.id, payload);
      if (!res.ok) { setError(res.error); return; }
      toast.success('Objective updated');
    } else {
      const res = addStrategicObjective({ portfolioId, ...payload });
      if (!res.ok) { setError(res.error); return; }
      toast.success('Objective added');
    }
    onOpenChange(false);
  };

  const showErr = (touched || error) && (error || localError);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? t('editObjective') : t('addStrategicObjective')}</DialogTitle>
          <DialogDescription>
            {isEdit ? 'Update the strategic objective.' : 'Define a new strategic objective for this portfolio.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <div className="flex justify-between items-center">
              <Label className="text-xs">{t('objectiveTitle')} *</Label>
              <span className={cn(
                'text-[10px] tabular-nums',
                title.length > MAX_TITLE ? 'text-destructive font-semibold' : 'text-muted-foreground',
              )}>{title.length} / {MAX_TITLE}</span>
            </div>
            <Input
              value={title}
              maxLength={MAX_TITLE}
              onChange={e => { setTitle(e.target.value); setError(null); }}
              onBlur={() => { setTitle(title.trim()); setTouched(true); }}
              className={cn(showErr && 'border-destructive focus-visible:ring-destructive')}
              placeholder="e.g. Reduce processing time by 60%"
            />
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between items-center">
              <Label className="text-xs">{t('objectiveDescription')}</Label>
              <span className={cn(
                'text-[10px] tabular-nums',
                description.length > MAX_DESC ? 'text-destructive font-semibold' : 'text-muted-foreground',
              )}>{description.length} / {MAX_DESC}</span>
            </div>
            <Textarea
              rows={3}
              value={description}
              maxLength={MAX_DESC}
              onChange={e => setDescription(e.target.value)}
              onBlur={() => setDescription(description.trim())}
              placeholder="Optional context to clarify this objective"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">{t('objectiveStatus')}</Label>
            <Select value={status} onValueChange={v => setStatus(v as StrategicObjectiveStatus)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Active">{t('active')}</SelectItem>
                <SelectItem value="Archived">{t('archived')}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {showErr && (
            <p className="flex items-center gap-1 text-xs text-destructive">
              <AlertCircle className="w-3 h-3" /> {showErr}
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>{t('cancel')}</Button>
          <Button onClick={handleSave}>{isEdit ? t('save') : t('addStrategicObjective')}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default StrategicObjectiveDialog;
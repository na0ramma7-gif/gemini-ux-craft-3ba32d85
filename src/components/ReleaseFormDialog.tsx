import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useApp } from '@/context/AppContext';
import { Release } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from '@/components/ui/form';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { nameField, dateField, dateRangeRefine, M } from '@/lib/validation';

interface ReleaseFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  productId: number;
  release?: Release | null;
}

const ReleaseFormDialog = ({ open, onOpenChange, productId, release }: ReleaseFormDialogProps) => {
  const { state, addRelease, updateRelease, updateFeature, t } = useApp();
  const isEdit = !!release;

  const schema = z
    .object({
      version: z
        .string()
        .transform(s => s.trim())
        .pipe(
          z
            .string()
            .min(1, M.required('Version'))
            .max(20, M.max('Version', 20))
            .regex(/^[vV]?\d+(\.\d+){0,2}([-.][A-Za-z0-9]+)?$/, 'Use a version like v1.0 or 2.1.3'),
        )
        .refine(
          v => {
            const norm = v.trim().toLowerCase();
            return !state.releases.some(
              r => r.productId === productId && r.id !== release?.id && r.version.trim().toLowerCase() === norm,
            );
          },
          { message: M.duplicate('Version') },
        ),
      name: nameField('Release name', { min: 2, max: 100 }),
      startDate: dateField('Start date', true),
      endDate: dateField('End date', true),
      status: z.enum(['Planned', 'In Progress', 'Released']),
    })
    .superRefine(dateRangeRefine());

  type FormValues = z.infer<typeof schema>;

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    mode: 'onBlur',
    defaultValues: { version: '', name: '', startDate: '', endDate: '', status: 'Planned' },
  });

  const [selectedFeatureIds, setSelectedFeatureIds] = useState<number[]>([]);

  useEffect(() => {
    if (!open) return;
    if (release) {
      form.reset({
        version: release.version,
        name: release.name,
        startDate: release.startDate,
        endDate: release.endDate,
        status: release.status,
      });
      setSelectedFeatureIds(state.features.filter(f => f.releaseId === release.id).map(f => f.id));
    } else {
      form.reset();
      setSelectedFeatureIds([]);
    }
  }, [open, release]); // eslint-disable-line react-hooks/exhaustive-deps

  const productFeatures = state.features.filter(f => f.productId === productId);
  const available = productFeatures.filter(f => f.releaseId === null || (release && f.releaseId === release.id));

  const onSubmit = (values: FormValues) => {
    const payload = {
      version: values.version!,
      name: values.name!,
      startDate: values.startDate!,
      endDate: values.endDate!,
      status: values.status,
    };
    if (isEdit && release) {
      updateRelease(release.id, payload);
      selectedFeatureIds.forEach(fId => updateFeature(fId, { releaseId: release.id }));
      state.features
        .filter(f => f.releaseId === release.id && !selectedFeatureIds.includes(f.id))
        .forEach(f => updateFeature(f.id, { releaseId: null }));
      toast.success(`Release ${payload.version} updated`);
    } else {
      const newId = Math.max(...state.releases.map(r => r.id), 0) + 1;
      addRelease({ productId, ...payload });
      selectedFeatureIds.forEach(fId => updateFeature(fId, { releaseId: newId }));
      toast.success(`Release ${payload.version} created`);
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? t('editRelease') : t('addRelease')}</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-2" noValidate>
            <div className="grid grid-cols-2 gap-3">
              <FormField control={form.control} name="version" render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('version')} *</FormLabel>
                  <FormControl><Input placeholder="v3.0" maxLength={20} {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="name" render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('name')} *</FormLabel>
                  <FormControl><Input placeholder="Release name" maxLength={100} {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <FormField control={form.control} name="startDate" render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('startDate')} *</FormLabel>
                  <FormControl><Input type="date" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="endDate" render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('endDate')} *</FormLabel>
                  <FormControl><Input type="date" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            <FormField control={form.control} name="status" render={({ field }) => (
              <FormItem>
                <FormLabel>{t('status')}</FormLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                  <SelectContent>
                    <SelectItem value="Planned">{t('planned')}</SelectItem>
                    <SelectItem value="In Progress">{t('inProgress')}</SelectItem>
                    <SelectItem value="Released">{t('released')}</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">{t('assignFeatures')}</label>
              <div className="border border-border rounded-md max-h-40 overflow-y-auto p-2 space-y-1">
                {available.length === 0 ? (
                  <p className="text-xs text-muted-foreground py-1">{t('noFeaturesAvailable')}</p>
                ) : (
                  available.map(f => (
                    <div key={f.id}
                      className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-muted cursor-pointer text-sm"
                      onClick={() => setSelectedFeatureIds(prev =>
                        prev.includes(f.id) ? prev.filter(id => id !== f.id) : [...prev, f.id])}
                    >
                      <Checkbox checked={selectedFeatureIds.includes(f.id)} onCheckedChange={() => {}} />
                      <span className="text-foreground">{f.name}</span>
                      <span className="text-xs text-muted-foreground ms-auto">{f.status}</span>
                    </div>
                  ))
                )}
              </div>
              {selectedFeatureIds.length > 0 && (
                <p className="text-xs text-muted-foreground">
                  {selectedFeatureIds.length} {t('features')} {t('selected')}
                </p>
              )}
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>{t('cancel')}</Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>{t('save')}</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default ReleaseFormDialog;

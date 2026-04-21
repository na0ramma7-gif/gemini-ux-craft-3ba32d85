import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useApp } from '@/context/AppContext';
import { Feature, Release } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
  nameField, personField, dateField, longText, dateRangeRefine, M,
} from '@/lib/validation';

interface FeatureFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  productId: number;
  releases: Release[];
  feature?: Feature | null; // edit mode if provided
}

const FeatureFormDialog = ({
  open, onOpenChange, productId, releases, feature,
}: FeatureFormDialogProps) => {
  const { addFeature, updateFeature, t } = useApp();
  const isEdit = !!feature;

  const schema = z
    .object({
      name: nameField('Feature name', { min: 2, max: 120 }),
      startDate: dateField('Start date', true),
      endDate: dateField('End date', true),
      status: z.enum(['To Do', 'In Progress', 'Delivered']),
      priority: z.enum(['High', 'Medium', 'Low']),
      owner: personField('Owner', true),
      releaseId: z.string(), // 'none' or numeric string
      description: longText('Description', 1000),
    })
    .superRefine(dateRangeRefine());

  type FormValues = z.infer<typeof schema>;

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    mode: 'onBlur',
    defaultValues: {
      name: '', startDate: '', endDate: '',
      status: 'To Do', priority: 'Medium', owner: '',
      releaseId: 'none', description: '',
    },
  });

  useEffect(() => {
    if (!open) return;
    if (feature) {
      form.reset({
        name: feature.name,
        startDate: feature.startDate,
        endDate: feature.endDate,
        status: feature.status,
        priority: feature.priority,
        owner: feature.owner,
        releaseId: feature.releaseId == null ? 'none' : String(feature.releaseId),
        description: feature.description || '',
      });
    } else {
      form.reset();
    }
  }, [open, feature]); // eslint-disable-line react-hooks/exhaustive-deps

  const onSubmit = (values: FormValues) => {
    const payload = {
      name: values.name,
      startDate: values.startDate,
      endDate: values.endDate,
      status: values.status,
      priority: values.priority,
      owner: values.owner || '',
      releaseId: values.releaseId === 'none' ? null : Number(values.releaseId),
      description: values.description || '',
    };
    if (isEdit && feature) {
      updateFeature(feature.id, payload);
      toast.success(`Feature "${payload.name}" updated`);
    } else {
      addFeature({ ...payload, productId });
      toast.success(`Feature "${payload.name}" added`);
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? t('editFeature') : t('addNewFeature')}</DialogTitle>
          <DialogDescription>
            {isEdit ? t('updateFeatureDetails') : t('createNewFeature')}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-2" noValidate>
            <FormField control={form.control} name="name" render={({ field }) => (
              <FormItem>
                <FormLabel>{t('featureName')} *</FormLabel>
                <FormControl><Input maxLength={120} placeholder={t('enterFeatureName')} {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <div className="grid grid-cols-2 gap-4">
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

            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="status" render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('status')}</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>
                      <SelectItem value="To Do">{t('toDo')}</SelectItem>
                      <SelectItem value="In Progress">{t('inProgress')}</SelectItem>
                      <SelectItem value="Delivered">{t('delivered')}</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="priority" render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('priority')}</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>
                      <SelectItem value="High">{t('high')}</SelectItem>
                      <SelectItem value="Medium">{t('medium')}</SelectItem>
                      <SelectItem value="Low">{t('low')}</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            <FormField control={form.control} name="owner" render={({ field }) => (
              <FormItem>
                <FormLabel>{t('owner')} *</FormLabel>
                <FormControl><Input maxLength={100} placeholder={t('enterOwnerName')} {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="releaseId" render={({ field }) => (
              <FormItem>
                <FormLabel>{t('release')}</FormLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl><SelectTrigger><SelectValue placeholder={t('selectRelease')} /></SelectTrigger></FormControl>
                  <SelectContent>
                    <SelectItem value="none">{t('noRelease')}</SelectItem>
                    {releases.map(r => (
                      <SelectItem key={r.id} value={String(r.id)}>{r.version} - {r.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>{t('cancel')}</Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {isEdit ? t('saveChanges') : t('addFeature')}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default FeatureFormDialog;

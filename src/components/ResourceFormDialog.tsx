import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useApp } from '@/context/AppContext';
import { Resource } from '@/types';
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
import { nameField, personField, integerField, M } from '@/lib/validation';

interface ResourceFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  resource?: Resource | null; // edit mode if provided
}

const ResourceFormDialog = ({ open, onOpenChange, resource }: ResourceFormDialogProps) => {
  const { state, addResource, updateResource, t } = useApp();
  const isEdit = !!resource;

  const schema = z.object({
    employeeId: z
      .string()
      .transform(s => s.trim().toUpperCase())
      .pipe(
        z
          .string()
          .min(1, M.required('Employee ID'))
          .max(20, M.max('Employee ID', 20))
          .regex(/^[A-Z0-9_-]+$/, 'Employee ID may only contain letters, numbers, _ or -'),
      )
      .refine(
        v => !state.resources.some(r => r.id !== resource?.id && (r.employeeId || '').trim().toUpperCase() === v),
        { message: M.duplicate('Employee ID') },
      ),
    name: personField('Name', true),
    role: nameField('Role', { min: 2, max: 80 }),
    lineManager: personField('Line Manager', false),
    location: z.enum(['On-site', 'Offshore']),
    category: z.enum(['Technical', 'Business', 'Operation']),
    costRate: integerField('Cost Rate', { min: 0, max: 10_000_000 }),
    capacity: integerField('Capacity', { min: 1, max: 168 }),
    status: z.enum(['Active', 'Inactive']),
  });
  type FormValues = z.infer<typeof schema>;

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    mode: 'onBlur',
    defaultValues: {
      employeeId: '', name: '', role: '', lineManager: '',
      location: 'On-site', category: 'Technical',
      costRate: 0, capacity: 40, status: 'Active',
    },
  });

  useEffect(() => {
    if (!open) return;
    if (resource) {
      form.reset({
        employeeId: resource.employeeId || '',
        name: resource.name,
        role: resource.role,
        lineManager: resource.lineManager || '',
        location: resource.location || 'On-site',
        category: resource.category || 'Technical',
        costRate: resource.costRate,
        capacity: resource.capacity,
        status: resource.status,
      });
    } else {
      form.reset();
    }
  }, [open, resource]); // eslint-disable-line react-hooks/exhaustive-deps

  const onSubmit = (values: FormValues) => {
    const payload: Omit<Resource, 'id'> = {
      employeeId: values.employeeId,
      name: values.name!,
      role: values.role!,
      lineManager: values.lineManager || '',
      location: values.location,
      category: values.category,
      costRate: values.costRate,
      capacity: values.capacity,
      status: values.status,
      skills: resource?.skills,
    };
    if (isEdit && resource) {
      updateResource(resource.id, payload);
      toast.success(`Resource "${payload.name}" updated`);
    } else {
      addResource(payload);
      toast.success(`Resource "${payload.name}" added`);
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? t('editResource') : t('addNewResource')}</DialogTitle>
          <DialogDescription>{isEdit ? t('editResourceDesc') : t('addTeamMember')}</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-2" noValidate>
            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="employeeId" render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('employeeId')} *</FormLabel>
                  <FormControl><Input maxLength={20} placeholder={t('enterEmployeeId')} {...field}
                    onChange={e => field.onChange(e.target.value.toUpperCase())} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="name" render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('name')} *</FormLabel>
                  <FormControl><Input maxLength={100} placeholder={t('enterName')} {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="role" render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('role')} *</FormLabel>
                  <FormControl><Input maxLength={80} placeholder={t('enterRole')} {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="lineManager" render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('lineManager')}</FormLabel>
                  <FormControl><Input maxLength={100} placeholder={t('enterLineManager')} {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="location" render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('location')}</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>
                      <SelectItem value="On-site">{t('onSite')}</SelectItem>
                      <SelectItem value="Offshore">{t('offshore')}</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="category" render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('category')}</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>
                      <SelectItem value="Technical">{t('technical')}</SelectItem>
                      <SelectItem value="Business">{t('business')}</SelectItem>
                      <SelectItem value="Operation">{t('operation')}</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="costRate" render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('costRateMonthly')} *</FormLabel>
                  <FormControl>
                    <Input type="number" min={0} step={1} {...field}
                      value={Number.isFinite(field.value) ? field.value : 0}
                      onChange={e => field.onChange(e.target.value === '' ? 0 : parseInt(e.target.value, 10))} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="capacity" render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('capacityHrsWeek')} *</FormLabel>
                  <FormControl>
                    <Input type="number" min={1} max={168} step={1} {...field}
                      value={Number.isFinite(field.value) ? field.value : 40}
                      onChange={e => field.onChange(e.target.value === '' ? 0 : parseInt(e.target.value, 10))} />
                  </FormControl>
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
                    <SelectItem value="Active">{t('active')}</SelectItem>
                    <SelectItem value="Inactive">{t('inactive')}</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>{t('cancel')}</Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {isEdit ? t('save') : t('addResource')}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default ResourceFormDialog;

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useApp } from '@/context/AppContext';
import { Portfolio } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { CreatableSelect } from '@/components/ui/creatable-select';
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
  nameField, codeField, longText, optionalText, personField, M,
} from '@/lib/validation';

interface PortfolioFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: (portfolio: Portfolio) => void;
  /** When provided, the dialog is in edit mode and saves to this portfolio. */
  portfolio?: Portfolio | null;
}

const PortfolioFormDialog = ({ open, onOpenChange, onCreated, portfolio }: PortfolioFormDialogProps) => {
  const { addPortfolio, updatePortfolio, t, state, lookups, addLookupValue } = useApp();
  const isEdit = !!portfolio;

  const schema = z.object({
    name: nameField('Name'),
    code: codeField('Code', { min: 2, max: 8 }).refine(
      v => !state.portfolios.some(p => p.id !== portfolio?.id && p.code.trim().toUpperCase() === v),
      { message: M.duplicate('Code') },
    ),
    description: longText('Description', 1000),
    priority: z.enum(['High', 'Medium', 'Low']),
      purpose: longText('Purpose', 500),
      strategicObjective: optionalText('Strategic Objective', 500),
      businessValue: optionalText('Business Value', 500),
    owner: personField('Owner', false),
    technicalLead: personField('Technical Lead', false),
    businessStakeholder: personField('Business Stakeholder', false),
  });

  type FormValues = z.infer<typeof schema>;

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    mode: 'onBlur',
    defaultValues: {
      name: '', code: '', description: '', priority: 'Medium',
      purpose: '', strategicObjective: '', businessValue: '',
      owner: '', technicalLead: '', businessStakeholder: '',
    },
  });

  useEffect(() => {
    if (!open) return;
    if (portfolio) {
      form.reset({
        name: portfolio.name ?? '',
        code: portfolio.code ?? '',
        description: portfolio.description ?? '',
        priority: portfolio.priority ?? 'Medium',
        purpose: portfolio.purpose ?? '',
        strategicObjective: portfolio.strategicObjective ?? '',
        businessValue: portfolio.businessValue ?? '',
        owner: portfolio.owner ?? '',
        technicalLead: portfolio.technicalLead ?? '',
        businessStakeholder: portfolio.businessStakeholder ?? '',
      });
    } else {
      form.reset();
    }
  }, [open, portfolio]); // eslint-disable-line react-hooks/exhaustive-deps

  const onSubmit = (values: FormValues) => {
    if (isEdit && portfolio) {
      updatePortfolio(portfolio.id, {
        ...values,
        description: values.description || '',
      } as Partial<Portfolio>);
      toast.success(`Portfolio "${values.name}" updated`);
      onOpenChange(false);
      return;
    }
    const created = addPortfolio({
      ...values,
      description: values.description || '',
    } as Omit<Portfolio, 'id'>);
    toast.success(`Portfolio "${created.name}" created`);
    onOpenChange(false);
    onCreated?.(created);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? t('editPortfolioProfile') : t('addPortfolio')}</DialogTitle>
          <DialogDescription>
            {isEdit ? 'Update portfolio profile details.' : 'Create a new portfolio with full profile details.'}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-2" noValidate>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <FormField control={form.control} name="name" render={({ field }) => (
                <FormItem className="sm:col-span-2">
                  <FormLabel>Name *</FormLabel>
                  <FormControl><Input placeholder="Portfolio name" maxLength={100} {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="code" render={({ field }) => (
                <FormItem>
                  <FormLabel>Code *</FormLabel>
                  <FormControl>
                    <Input placeholder="ABC" maxLength={8}
                      {...field}
                      onChange={e => field.onChange(e.target.value.toUpperCase())}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            <FormField control={form.control} name="description" render={({ field }) => (
              <FormItem>
                <FormLabel>Description</FormLabel>
                <FormControl><Textarea rows={2} maxLength={1000} {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
              <FormField control={form.control} name="owner" render={({ field }) => (
                <FormItem>
                  <FormLabel>Owner</FormLabel>
                  <FormControl><Input maxLength={100} {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            <FormField control={form.control} name="purpose" render={({ field }) => (
              <FormItem>
                <FormLabel>Purpose</FormLabel>
                <FormControl><Textarea rows={2} maxLength={500} {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="businessValue" render={({ field }) => (
              <FormItem>
                <FormLabel>Business Value</FormLabel>
                <FormControl>
                  <CreatableSelect
                    value={field.value || ''}
                    onChange={field.onChange}
                    options={lookups.businessValue}
                    onCreate={(v) => addLookupValue('businessValue', v)}
                    placeholder="Select a business value…"
                    addNewLabel="Add new value"
                    maxLength={500}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField control={form.control} name="technicalLead" render={({ field }) => (
                <FormItem>
                  <FormLabel>Technical Lead</FormLabel>
                  <FormControl><Input maxLength={100} {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="businessStakeholder" render={({ field }) => (
                <FormItem>
                  <FormLabel>Business Stakeholder</FormLabel>
                  <FormControl><Input maxLength={100} {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>{t('cancel')}</Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {isEdit ? t('save') : t('addPortfolio')}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default PortfolioFormDialog;

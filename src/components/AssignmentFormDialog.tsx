import { useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useApp } from '@/context/AppContext';
import { Assignment } from '@/types';
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
import { dateField, dateRangeRefine, percentField, M } from '@/lib/validation';

interface AssignmentFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  resourceId: number;
  assignment?: Assignment | null;
  /** When set, the portfolio is fixed and cannot be changed by the user. */
  lockedPortfolioId?: number;
  /** When set, the product is fixed (implies portfolio is also fixed) and cannot be changed. */
  lockedProductId?: number;
}

const AssignmentFormDialog = ({
  open, onOpenChange, resourceId, assignment,
  lockedPortfolioId, lockedProductId,
}: AssignmentFormDialogProps) => {
  const { state, addAssignment, updateAssignment, t } = useApp();
  const isEdit = !!assignment;

  // Effective lock: if a product is locked, its portfolio is implicitly locked too.
  const lockedProduct = lockedProductId
    ? state.products.find(p => p.id === lockedProductId)
    : undefined;
  const effectivePortfolioLockId =
    lockedProductId ? lockedProduct?.portfolioId : lockedPortfolioId;
  const portfolioLocked = !!effectivePortfolioLockId;
  const productLocked = !!lockedProductId;

  const schema = z
    .object({
      portfolioId: z
        .string()
        .min(1, M.required('Portfolio'))
        .refine(v => v !== '0', { message: M.required('Portfolio') })
        .refine(
          v => !effectivePortfolioLockId || v === String(effectivePortfolioLockId),
          { message: 'You can only assign this resource to products within the current portfolio' },
        ),
      productId: z
        .string()
        .min(1, M.required('Product'))
        .refine(v => v !== '0', { message: M.required('Product') })
        .refine(
          v => {
            if (lockedProductId) return v === String(lockedProductId);
            if (effectivePortfolioLockId) {
              const prod = state.products.find(p => String(p.id) === v);
              return prod?.portfolioId === effectivePortfolioLockId;
            }
            return true;
          },
          {
            message: lockedProductId
              ? 'You can only assign this resource to releases within the current product'
              : 'You can only assign this resource to products within the current portfolio',
          },
        ),
      releaseId: z
        .string()
        .min(1, M.required('Release'))
        .refine(v => v !== '0' && v !== '', { message: M.required('Release') }),
      startDate: dateField('Start date', true),
      endDate: dateField('End date', true),
      utilization: percentField('Allocation').refine(v => v > 0, { message: 'Allocation must be greater than 0' }),
    })
    .superRefine(dateRangeRefine());

  type FormValues = z.infer<typeof schema>;

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    mode: 'onBlur',
    defaultValues: {
      portfolioId: effectivePortfolioLockId ? String(effectivePortfolioLockId) : '',
      productId: lockedProductId ? String(lockedProductId) : '',
      releaseId: '0',
      startDate: '', endDate: '', utilization: 50,
    },
  });

  useEffect(() => {
    if (!open) return;
    if (assignment) {
      const product = state.products.find(p => p.id === assignment.productId);
      form.reset({
        portfolioId: String(effectivePortfolioLockId ?? product?.portfolioId ?? ''),
        productId: String(lockedProductId ?? assignment.productId ?? ''),
        releaseId: String(assignment.releaseId ?? '0'),
        startDate: assignment.startDate || '',
        endDate: assignment.endDate || '',
        utilization: assignment.utilization,
      });
    } else {
      form.reset({
        portfolioId: effectivePortfolioLockId ? String(effectivePortfolioLockId) : '',
        productId: lockedProductId ? String(lockedProductId) : '',
        releaseId: '0',
        startDate: '', endDate: '', utilization: 50,
      });
    }
  }, [open, assignment, effectivePortfolioLockId, lockedProductId]); // eslint-disable-line react-hooks/exhaustive-deps

  const portfolioId = form.watch('portfolioId');
  const productId = form.watch('productId');

  const filteredProducts = useMemo(
    () => state.products.filter(p => !portfolioId || String(p.portfolioId) === portfolioId),
    [state.products, portfolioId],
  );
  const filteredReleases = useMemo(
    () => state.releases.filter(r => String(r.productId) === productId),
    [state.releases, productId],
  );

  const onSubmit = (values: FormValues) => {
    const payload: Omit<Assignment, 'id'> = {
      resourceId,
      productId: parseInt(values.productId, 10),
      releaseId: parseInt(values.releaseId, 10),
      startDate: values.startDate!,
      endDate: values.endDate!,
      utilization: values.utilization,
    };
    if (isEdit && assignment) {
      updateAssignment(assignment.id, payload);
      toast.success('Assignment updated');
    } else {
      addAssignment(payload);
      toast.success('Assignment added');
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? t('editAssignment') : t('addAssignment')}</DialogTitle>
          <DialogDescription>{t('assignToProduct')}</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-2" noValidate>
            {!portfolioLocked && (
            <FormField control={form.control} name="portfolioId" render={({ field }) => (
              <FormItem>
                <FormLabel>{t('portfolio')} *</FormLabel>
                <Select
                  value={field.value}
                  onValueChange={v => {
                    field.onChange(v);
                    form.setValue('productId', '');
                    form.setValue('releaseId', '0');
                  }}
                >
                  <FormControl><SelectTrigger><SelectValue placeholder={t('selectPortfolio')} /></SelectTrigger></FormControl>
                  <SelectContent>
                    {state.portfolios.map(p => (
                      <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />
            )}
            {!productLocked && (
            <FormField control={form.control} name="productId" render={({ field }) => (
              <FormItem>
                <FormLabel>{t('product')} *</FormLabel>
                <Select
                  value={field.value}
                  onValueChange={v => { field.onChange(v); form.setValue('releaseId', '0'); }}
                >
                  <FormControl><SelectTrigger><SelectValue placeholder={t('selectProduct')} /></SelectTrigger></FormControl>
                  <SelectContent>
                    {filteredProducts.map(p => (
                      <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />
            )}
            <FormField control={form.control} name="releaseId" render={({ field }) => (
              <FormItem>
                <FormLabel>{t('release')} *</FormLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl><SelectTrigger><SelectValue placeholder={t('selectReleasePlaceholder')} /></SelectTrigger></FormControl>
                  <SelectContent>
                    {filteredReleases.map(r => (
                      <SelectItem key={r.id} value={String(r.id)}>{r.version} - {r.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
            <FormField control={form.control} name="utilization" render={({ field }) => (
              <FormItem>
                <FormLabel>{t('allocation')} (%) *</FormLabel>
                <FormControl>
                  <Input type="number" min={0} max={100} step={1} {...field}
                    value={Number.isFinite(field.value) ? field.value : 0}
                    onChange={e => field.onChange(e.target.value === '' ? 0 : parseInt(e.target.value, 10))} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>{t('cancel')}</Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {isEdit ? t('save') : t('assign')}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default AssignmentFormDialog;

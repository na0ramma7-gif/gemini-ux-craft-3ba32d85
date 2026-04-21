import { useMemo, useState } from 'react';
import { useApp } from '@/context/AppContext';
import { StrategicObjective } from '@/types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import StrategicObjectiveDialog from '@/components/StrategicObjectiveDialog';
import { Target, Pencil, Trash2, Plus } from 'lucide-react';
import { toast } from 'sonner';

interface Props { portfolioId: number; }

const PortfolioStrategicAlignment = ({ portfolioId }: Props) => {
  const { state, deleteStrategicObjective, t } = useApp();
  const [editing, setEditing] = useState<StrategicObjective | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<StrategicObjective | null>(null);

  const objectives = useMemo(
    () => state.strategicObjectives.filter(o => o.portfolioId === portfolioId),
    [state.strategicObjectives, portfolioId],
  );

  const productsByObjective = useMemo(() => {
    const map = new Map<number, { id: number; name: string }[]>();
    objectives.forEach(o => map.set(o.id, []));
    state.products
      .filter(p => p.portfolioId === portfolioId)
      .forEach(p => {
        (p.strategicObjectiveIds ?? []).forEach(oid => {
          const list = map.get(oid);
          if (list) list.push({ id: p.id, name: p.name });
        });
      });
    return map;
  }, [objectives, state.products, portfolioId]);

  const handleDelete = () => {
    if (!confirmDelete) return;
    deleteStrategicObjective(confirmDelete.id);
    toast.success('Objective deleted');
    setConfirmDelete(null);
  };

  const linkedCount = (id: number) => productsByObjective.get(id)?.length ?? 0;

  return (
    <div className="bg-secondary/30 rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <Target className="w-4 h-4 text-primary" /> {t('strategicAlignment')}
        </h4>
        <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => setShowAdd(true)}>
          <Plus className="w-3.5 h-3.5 me-1" /> {t('addStrategicObjective')}
        </Button>
      </div>

      {objectives.length === 0 ? (
        <p className="text-xs text-muted-foreground py-4 text-center">{t('noObjectivesYet')}</p>
      ) : (
        <div className="space-y-3">
          {objectives.map(obj => {
            const prods = productsByObjective.get(obj.id) ?? [];
            return (
              <div key={obj.id} className="bg-card rounded-lg p-3 border border-border/50">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-start gap-1.5 min-w-0 flex-1">
                    <Target className="w-3 h-3 text-primary shrink-0 mt-0.5" />
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-foreground line-clamp-2">{obj.title}</div>
                      {obj.description && (
                        <div className="text-[11px] text-muted-foreground line-clamp-2 mt-0.5">{obj.description}</div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {obj.status === 'Archived' && (
                      <Badge variant="outline" className="text-[9px] h-4 px-1.5">{t('archived')}</Badge>
                    )}
                    <Button size="icon" variant="ghost" className="h-6 w-6"
                      onClick={() => setEditing(obj)} aria-label={t('editObjective')}>
                      <Pencil className="w-3 h-3" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-6 w-6 text-destructive hover:text-destructive"
                      onClick={() => setConfirmDelete(obj)} aria-label={t('deleteObjective')}>
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
                <div className="text-[10px] text-muted-foreground mb-1.5">{t('productsContributing')}</div>
                {prods.length === 0 ? (
                  <span className="text-[10px] text-muted-foreground italic">—</span>
                ) : (
                  <div className="flex flex-wrap gap-1">
                    {prods.map(p => (
                      <Badge key={p.id} variant="secondary" className="text-[10px]">{p.name}</Badge>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <StrategicObjectiveDialog
        open={showAdd}
        onOpenChange={setShowAdd}
        portfolioId={portfolioId}
      />
      <StrategicObjectiveDialog
        open={!!editing}
        onOpenChange={(o) => { if (!o) setEditing(null); }}
        portfolioId={portfolioId}
        objective={editing}
      />

      <AlertDialog open={!!confirmDelete} onOpenChange={(o) => { if (!o) setConfirmDelete(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('deleteObjective')}</AlertDialogTitle>
            <AlertDialogDescription>
              {confirmDelete && linkedCount(confirmDelete.id) > 0
                ? t('confirmDeleteObjectiveLinked').replace('{n}', String(linkedCount(confirmDelete.id)))
                : t('confirmDeleteObjective')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {t('deleteObjective')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default PortfolioStrategicAlignment;
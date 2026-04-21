import { useApp } from '@/context/AppContext';
import { ServiceBreakdownRow, computeDelta, Delta } from '@/lib/compare';
import { formatCurrency, cn } from '@/lib/utils';
import { Tag, ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react';

interface Props {
  current: ServiceBreakdownRow[];
  comparison?: ServiceBreakdownRow[];
  active?: boolean;
  /** Optional title override; defaults to t('servicesBreakdown'). */
  title?: string;
  /** Limit number of rows shown (default 8). */
  maxRows?: number;
}

const DeltaCell = ({ d }: { d: Delta }) => {
  if (d.trend === 'flat') return <span className="inline-flex items-center gap-1 text-muted-foreground"><Minus className="w-3 h-3" />0%</span>;
  const Icon = d.trend === 'up' ? ArrowUpRight : ArrowDownRight;
  const color = d.trend === 'up' ? 'text-success' : 'text-destructive';
  return (
    <span className={cn('inline-flex items-center gap-1 font-medium', color)}>
      <Icon className="w-3 h-3" />
      {d.pct == null ? '—' : `${d.pct >= 0 ? '+' : ''}${d.pct.toFixed(1)}%`}
    </span>
  );
};

const ServiceBreakdownTable = ({ current, comparison = [], active = false, title, maxRows = 8 }: Props) => {
  const { t, language } = useApp();
  const rows = current.slice(0, maxRows);
  const cmpByName = new Map(comparison.map(r => [r.name.trim().toLowerCase(), r]));
  const totalActual = current.reduce((s, r) => s + r.actual, 0);

  return (
    <div className="bg-card rounded-xl shadow-[var(--shadow-card)] p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <Tag className="w-4 h-4 text-primary" />
          {title ?? t('servicesBreakdown')}
        </h3>
        <span className="text-[11px] text-muted-foreground">
          {current.length} {t('services')}
        </span>
      </div>
      {rows.length === 0 ? (
        <div className="text-xs text-muted-foreground py-6 text-center">{t('noServiceData')}</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border text-[11px] uppercase tracking-wide text-muted-foreground">
                <th className="text-start py-2 ps-1">{t('service')}</th>
                <th className="text-end py-2">{t('plannedRevenue')}</th>
                <th className="text-end py-2">{t('actualRevenue')}</th>
                <th className="text-end py-2">{t('shareOfTotal')}</th>
                {active && <th className="text-end py-2 pe-1">Δ %</th>}
              </tr>
            </thead>
            <tbody>
              {rows.map(r => {
                const share = totalActual > 0 ? (r.actual / totalActual) * 100 : 0;
                const cmp = cmpByName.get(r.name.trim().toLowerCase());
                const delta = computeDelta(r.actual, cmp?.actual ?? 0);
                return (
                  <tr key={r.name} className="border-b border-border/50">
                    <td className="py-2 ps-1 font-medium text-foreground">{r.name}</td>
                    <td className="py-2 text-end text-muted-foreground">{formatCurrency(r.planned, language)}</td>
                    <td className="py-2 text-end font-semibold text-foreground">{formatCurrency(r.actual, language)}</td>
                    <td className="py-2 text-end text-muted-foreground">{share.toFixed(1)}%</td>
                    {active && <td className="py-2 pe-1 text-end"><DeltaCell d={delta} /></td>}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default ServiceBreakdownTable;

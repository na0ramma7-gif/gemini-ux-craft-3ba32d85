import { useMemo } from 'react';
import { useApp } from '@/context/AppContext';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Rocket } from 'lucide-react';
import { Product } from '@/types';

interface UpcomingRevenueDriversProps {
  onProductClick: (product: Product) => void;
}

const UpcomingRevenueDrivers = ({ onProductClick }: UpcomingRevenueDriversProps) => {
  const { state, t, language } = useApp();

  const drivers = useMemo(() => {
    const upcoming = state.features
      .filter(f => f.status === 'In Progress' || f.status === 'Planned')
      .map(feature => {
        const product = state.products.find(p => p.id === feature.productId);
        const release = state.releases.find(r => r.id === feature.releaseId);
        
        const projectedRevenue = state.revenuePlan
          .filter(r => r.featureId === feature.id)
          .reduce((s, r) => s + r.expected, 0);

        return {
          id: feature.id,
          product: product?.name || '-',
          productObj: product,
          feature: feature.name,
          release: release?.name || '-',
          launchDate: feature.endDate,
          projectedRevenue,
          status: feature.status,
        };
      })
      .filter(d => d.projectedRevenue > 0)
      .sort((a, b) => b.projectedRevenue - a.projectedRevenue)
      .slice(0, 5);

    return upcoming;
  }, [state]);

  return (
    <div className="bg-card rounded-xl shadow-[var(--shadow-card)] p-6">
      <div className="flex items-center gap-2 mb-5">
        <Rocket className="w-5 h-5 text-primary" />
        <h3 className="text-foreground">{t('upcomingRevenueDrivers')}</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground uppercase tracking-wide">{t('product')}</th>
              <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground uppercase tracking-wide">{t('feature')}</th>
              <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground uppercase tracking-wide">{t('status')}</th>
              <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground uppercase tracking-wide">{t('expectedLaunch')}</th>
              <th className="text-right py-3 px-4 text-xs font-medium text-muted-foreground uppercase tracking-wide">{t('projectedRevenue')}</th>
            </tr>
          </thead>
          <tbody>
            {drivers.map(d => (
              <tr
                key={d.id}
                className="border-b border-border/50 hover:bg-muted/30 cursor-pointer transition-colors"
                onClick={() => d.productObj && onProductClick(d.productObj)}
              >
                <td className="py-3 px-4 font-medium text-foreground">{d.product}</td>
                <td className="py-3 px-4 text-muted-foreground">{d.feature}</td>
                <td className="py-3 px-4">
                  <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                    d.status === 'In Progress' ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
                  }`}>
                    {d.status}
                  </span>
                </td>
                <td className="py-3 px-4 text-muted-foreground">{formatDate(d.launchDate, language)}</td>
                <td className="py-3 px-4 text-right font-bold text-success">
                  {formatCurrency(d.projectedRevenue, language)}
                </td>
              </tr>
            ))}
            {drivers.length === 0 && (
              <tr>
                <td colSpan={5} className="py-8 text-center text-muted-foreground text-sm">
                  No upcoming revenue drivers
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default UpcomingRevenueDrivers;

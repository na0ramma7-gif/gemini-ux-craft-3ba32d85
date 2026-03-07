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
    // Find features that are In Progress or Planned with future revenue
    const upcoming = state.features
      .filter(f => f.status === 'In Progress' || f.status === 'Planned')
      .map(feature => {
        const product = state.products.find(p => p.id === feature.productId);
        const release = state.releases.find(r => r.id === feature.releaseId);
        
        // Sum projected revenue from plan
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
        };
      })
      .filter(d => d.projectedRevenue > 0)
      .sort((a, b) => b.projectedRevenue - a.projectedRevenue)
      .slice(0, 6);

    return upcoming;
  }, [state]);

  return (
    <div className="bg-card rounded-xl shadow-[var(--shadow-card)] p-5">
      <h3 className="text-foreground mb-4 flex items-center gap-2">
        <Rocket className="w-4 h-4 text-primary" />
        {t('upcomingRevenueDrivers')}
      </h3>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left py-2 px-3 text-xs font-medium text-muted-foreground">{t('product')}</th>
              <th className="text-left py-2 px-3 text-xs font-medium text-muted-foreground">{t('feature')}</th>
              <th className="text-left py-2 px-3 text-xs font-medium text-muted-foreground">{t('expectedLaunch')}</th>
              <th className="text-right py-2 px-3 text-xs font-medium text-muted-foreground">{t('projectedRevenue')}</th>
            </tr>
          </thead>
          <tbody>
            {drivers.map(d => (
              <tr
                key={d.id}
                className="border-b border-border/50 hover:bg-muted/30 cursor-pointer transition-colors"
                onClick={() => d.productObj && onProductClick(d.productObj)}
              >
                <td className="py-2.5 px-3 font-medium text-foreground">{d.product}</td>
                <td className="py-2.5 px-3 text-muted-foreground">{d.feature}</td>
                <td className="py-2.5 px-3 text-muted-foreground">{formatDate(d.launchDate, language)}</td>
                <td className="py-2.5 px-3 text-right font-semibold text-success">
                  {formatCurrency(d.projectedRevenue, language)}
                </td>
              </tr>
            ))}
            {drivers.length === 0 && (
              <tr>
                <td colSpan={4} className="py-6 text-center text-muted-foreground text-sm">
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

import { useMemo, useState } from 'react';
import { useApp } from '@/context/AppContext';
import KPICard from '@/components/KPICard';
import StatusBadge from '@/components/StatusBadge';
import { formatCurrency } from '@/lib/utils';
import { Portfolio } from '@/types';
import {
  TrendingUp,
  TrendingDown,
  Target,
  Package,
  DollarSign,
  PieChart,
  Calendar
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface DashboardProps {
  onPortfolioClick: (portfolio: Portfolio) => void;
}

const Dashboard = ({ onPortfolioClick }: DashboardProps) => {
  const { state, metrics } = useApp();
  const [timeView, setTimeView] = useState('year');
  const [selectedYear, setSelectedYear] = useState(2025);

  const portfolioMetrics = useMemo(() => {
    return state.portfolios.map(p => {
      const products = state.products.filter(pr => pr.portfolioId === p.id);
      let revenue = 0;
      products.forEach(pr => {
        const features = state.features.filter(f => f.productId === pr.id);
        features.forEach(f => {
          state.revenuePlan.filter(r => r.featureId === f.id).forEach(r => {
            revenue += r.expected;
          });
        });
      });
      return { ...p, revenue, productCount: products.length };
    });
  }, [state]);

  const chartData = useMemo(() => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
    const revenue = [45000, 55000, 65000, 75000, 85000, 95000];
    const cost = [35000, 38000, 42000, 45000, 48000, 52000];
    return { labels: months, revenue, cost };
  }, []);

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground mt-1">Business Efficiency Overview</p>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-muted-foreground" />
            <Select value={timeView} onValueChange={setTimeView}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="year">Yearly</SelectItem>
                <SelectItem value="month">Monthly</SelectItem>
                <SelectItem value="week">Weekly</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <Select value={selectedYear.toString()} onValueChange={(v) => setSelectedYear(parseInt(v))}>
            <SelectTrigger className="w-24">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="2024">2024</SelectItem>
              <SelectItem value="2025">2025</SelectItem>
              <SelectItem value="2026">2026</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <KPICard
          title="Total Revenue"
          value={formatCurrency(metrics.revenue)}
          subtitle="Expected from features"
          icon={<span className="text-2xl">💰</span>}
          variant="green"
          progress={{
            label: "Target (year):",
            target: formatCurrency(metrics.revenue * 1.35),
            percent: 74,
            status: 'negative',
            remaining: formatCurrency(metrics.revenue * 0.35)
          }}
        />
        
        <KPICard
          title="Total Cost"
          value={formatCurrency(metrics.cost)}
          subtitle="Resources + CAPEX + OPEX"
          icon={<span className="text-2xl">💸</span>}
          variant="red"
          progress={{
            label: "Budget (year):",
            target: formatCurrency(metrics.cost * 1.18),
            percent: 85,
            status: 'positive',
            remaining: formatCurrency(metrics.cost * 0.18)
          }}
        />
        
        <KPICard
          title="Net Profit"
          value={formatCurrency(metrics.profit)}
          subtitle={`Margin: ${((metrics.profit / metrics.revenue) * 100).toFixed(1)}%`}
          icon={<span className="text-2xl">✅</span>}
          variant={metrics.profit >= 0 ? 'green' : 'red'}
          progress={{
            label: "Target (year):",
            target: formatCurrency(Math.abs(metrics.profit) * 2),
            percent: 50,
            status: metrics.profit >= 0 ? 'positive' : 'negative',
            remaining: formatCurrency(Math.abs(metrics.profit))
          }}
        />
        
        <KPICard
          title="Target vs Achieved"
          value="74%"
          icon={<span className="text-2xl">🎯</span>}
          variant="gradient"
          progress={{
            label: "Achievement Rate",
            target: formatCurrency(metrics.revenue),
            percent: 74,
            status: 'negative',
            remaining: `${formatCurrency(metrics.revenue * 0.35)} to go`
          }}
        />
        
        <KPICard
          title="Products"
          value={metrics.products.toString()}
          subtitle="Across 4 portfolios"
          icon={<span className="text-2xl">🎯</span>}
          variant="purple"
          progress={{
            label: "Performance Status:",
            target: "On Track",
            percent: 100,
            status: 'positive'
          }}
        />
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue vs Cost Chart */}
        <div className="bg-card rounded-2xl shadow-card p-6">
          <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-primary" />
            Revenue vs Cost Trend
          </h3>
          <div className="h-64 flex items-end justify-between gap-2">
            {chartData.labels.map((month, idx) => (
              <div key={month} className="flex-1 flex flex-col items-center gap-1">
                <div className="w-full flex gap-1 h-48 items-end justify-center">
                  <div 
                    className="w-5 bg-emerald-500 rounded-t transition-all hover:bg-emerald-600"
                    style={{ height: `${(chartData.revenue[idx] / 100000) * 100}%` }}
                    title={`Revenue: ${formatCurrency(chartData.revenue[idx])}`}
                  />
                  <div 
                    className="w-5 bg-red-400 rounded-t transition-all hover:bg-red-500"
                    style={{ height: `${(chartData.cost[idx] / 100000) * 100}%` }}
                    title={`Cost: ${formatCurrency(chartData.cost[idx])}`}
                  />
                </div>
                <span className="text-xs text-muted-foreground">{month}</span>
              </div>
            ))}
          </div>
          <div className="flex items-center justify-center gap-6 mt-4">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-emerald-500 rounded" />
              <span className="text-sm text-muted-foreground">Revenue</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-red-400 rounded" />
              <span className="text-sm text-muted-foreground">Cost</span>
            </div>
          </div>
        </div>

        {/* Portfolio Distribution */}
        <div className="bg-card rounded-2xl shadow-card p-6">
          <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
            <PieChart className="w-5 h-5 text-primary" />
            Portfolio Distribution
          </h3>
          <div className="space-y-4">
            {portfolioMetrics.map((portfolio, idx) => {
              const colors = ['bg-primary', 'bg-violet-500', 'bg-amber-500', 'bg-emerald-500'];
              const maxRevenue = Math.max(...portfolioMetrics.map(p => p.revenue));
              const percentage = (portfolio.revenue / maxRevenue) * 100;
              
              return (
                <div key={portfolio.id} className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-foreground">{portfolio.name}</span>
                    <span className="text-sm font-semibold text-foreground">
                      {formatCurrency(portfolio.revenue)}
                    </span>
                  </div>
                  <div className="w-full bg-secondary rounded-full h-2.5">
                    <div 
                      className={`h-2.5 rounded-full ${colors[idx % colors.length]} transition-all`}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Portfolio Cards */}
      <div>
        <h3 className="text-xl font-semibold text-foreground mb-4">Active Portfolios</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {portfolioMetrics.map((portfolio) => (
            <div
              key={portfolio.id}
              onClick={() => onPortfolioClick(portfolio)}
              className="bg-card rounded-xl shadow-card p-5 cursor-pointer hover:shadow-card-hover transition-all duration-300 hover:-translate-y-1 border border-transparent hover:border-primary/20"
            >
              <div className="flex items-start justify-between mb-4">
                <div>
                  <div className="text-xs text-muted-foreground mb-1">{portfolio.code}</div>
                  <h4 className="text-lg font-semibold text-foreground">{portfolio.name}</h4>
                </div>
                <Package className="w-8 h-8 text-primary/60" />
              </div>
              
              <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                {portfolio.description}
              </p>
              
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Products:</span>
                  <span className="font-semibold">{portfolio.productCount}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Revenue:</span>
                  <span className="font-semibold text-emerald-600">
                    {formatCurrency(portfolio.revenue)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Priority:</span>
                  <StatusBadge status={portfolio.priority} />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;

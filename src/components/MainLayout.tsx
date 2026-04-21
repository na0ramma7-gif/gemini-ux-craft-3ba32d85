import { useApp } from '@/context/AppContext';
import Sidebar from '@/components/Sidebar';
import Dashboard from '@/pages/Dashboard';
import PortfolioPage from '@/pages/PortfolioPage';
import ProductPage from '@/pages/ProductPage';
import ResourcesPage from '@/pages/ResourcesPage';
import ResourceProfilePage from '@/pages/ResourceProfilePage';
import { Portfolio, Product, Resource } from '@/types';

const MainLayout = () => {
  const { view, setView, selected, setSelected, sidebarOpen, setSidebarOpen, state } = useApp();

  const handleNavigate = (newView: any) => {
    setView(newView);
    if (newView === 'dashboard') {
      setSelected(prev => ({ ...prev, portfolio: null, product: null, resource: null }));
    }
  };

  const handlePortfolioClick = (portfolio: Portfolio) => {
    setSelected(prev => ({ ...prev, portfolio, product: null }));
    setView('portfolio');
  };

  const handleProductClick = (product: Product) => {
    setSelected(prev => ({ ...prev, product }));
    setView('product');
  };

  const handleResourceClick = (resource: Resource) => {
    setSelected(prev => ({ ...prev, resource }));
    setView('resourceProfile');
  };

  const handleBackToPortfolio = () => {
    setSelected(prev => ({ ...prev, product: null }));
    setView('portfolio');
  };

  const handleBackToDashboard = () => {
    setSelected(prev => ({ ...prev, portfolio: null, product: null }));
    setView('dashboard');
  };

  const handleBackToResources = () => {
    setSelected(prev => ({ ...prev, resource: null }));
    setView('resources');
  };

  const renderView = () => {
    switch (view) {
      case 'dashboard':
        return <Dashboard onPortfolioClick={handlePortfolioClick} />;
      case 'portfolio':
        return selected.portfolio ? (
          <PortfolioPage
            portfolio={selected.portfolio}
            onBack={handleBackToDashboard}
            onProductClick={handleProductClick}
          />
        ) : (
          <Dashboard onPortfolioClick={handlePortfolioClick} />
        );
      case 'product':
        return selected.product ? (
          <ProductPage product={selected.product} onBack={handleBackToPortfolio} />
        ) : (
          <Dashboard onPortfolioClick={handlePortfolioClick} />
        );
      case 'resources':
        return <ResourcesPage onResourceClick={handleResourceClick} />;
      case 'resourceProfile':
        return selected.resource ? (
          <ResourceProfilePage resource={selected.resource} onBack={handleBackToResources} />
        ) : (
          <ResourcesPage onResourceClick={handleResourceClick} />
        );
      default:
        return <Dashboard onPortfolioClick={handlePortfolioClick} />;
    }
  };

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <Sidebar
        open={sidebarOpen}
        view={view}
        portfolios={state.portfolios}
        onNavigate={handleNavigate}
        onToggle={() => setSidebarOpen(!sidebarOpen)}
        onPortfolioClick={handlePortfolioClick}
      />
      <main className="flex-1 overflow-y-auto p-6 md:p-8">{renderView()}</main>
    </div>
  );
};

export default MainLayout;

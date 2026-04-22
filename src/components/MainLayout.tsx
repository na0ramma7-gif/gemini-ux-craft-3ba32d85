import { lazy, Suspense } from 'react';
import { useApp } from '@/context/AppContext';
import Sidebar from '@/components/Sidebar';
import Dashboard from '@/pages/Dashboard';
import { Portfolio, Product, Resource } from '@/types';

// Route-level code splitting — heavy pages load on demand to keep
// initial mobile bundle small (QA Round 2, audit ref P1).
const PortfolioPage = lazy(() => import('@/pages/PortfolioPage'));
const ProductPage = lazy(() => import('@/pages/ProductPage'));
const ResourcesPage = lazy(() => import('@/pages/ResourcesPage'));
const ResourceProfilePage = lazy(() => import('@/pages/ResourceProfilePage'));

const PageFallback = () => (
  <div className="flex items-center justify-center h-64">
    <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" aria-label="Loading" />
  </div>
);

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

  // Always resolve the current entity from state (by id) so edits made
  // via updateProduct / updatePortfolio / updateResource reflect immediately.
  // Without this, child pages would render the stale snapshot stored in
  // `selected.*` and look like "save did nothing".
  const livePortfolio = selected.portfolio
    ? state.portfolios.find(p => p.id === selected.portfolio!.id) ?? selected.portfolio
    : null;
  const liveProduct = selected.product
    ? state.products.find(p => p.id === selected.product!.id) ?? selected.product
    : null;
  const liveResource = selected.resource
    ? state.resources.find(r => r.id === selected.resource!.id) ?? selected.resource
    : null;

  const renderView = () => {
    switch (view) {
      case 'dashboard':
        return <Dashboard onPortfolioClick={handlePortfolioClick} />;
      case 'portfolio':
        return livePortfolio ? (
          <PortfolioPage
            portfolio={livePortfolio}
            onBack={handleBackToDashboard}
            onProductClick={handleProductClick}
          />
        ) : (
          <Dashboard onPortfolioClick={handlePortfolioClick} />
        );
      case 'product':
        return liveProduct ? (
          <ProductPage product={liveProduct} onBack={handleBackToPortfolio} />
        ) : (
          <Dashboard onPortfolioClick={handlePortfolioClick} />
        );
      case 'resources':
        return <ResourcesPage onResourceClick={handleResourceClick} />;
      case 'resourceProfile':
        return liveResource ? (
          <ResourceProfilePage resource={liveResource} onBack={handleBackToResources} />
        ) : (
          <ResourcesPage onResourceClick={handleResourceClick} />
        );
      default:
        return <Dashboard onPortfolioClick={handlePortfolioClick} />;
    }
  };

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* A11Y: skip-to-content link for keyboard users (WCAG 2.4.1). */}
      <a href="#main-content" className="skip-link">
        Skip to main content
      </a>
      <Sidebar
        open={sidebarOpen}
        view={view}
        portfolios={state.portfolios}
        onNavigate={handleNavigate}
        onToggle={() => setSidebarOpen(!sidebarOpen)}
        onPortfolioClick={handlePortfolioClick}
      />
      <main
        id="main-content"
        role="main"
        tabIndex={-1}
        aria-label="Main content"
        className="flex-1 overflow-y-auto p-6 md:p-8 focus:outline-none"
      >
        <Suspense fallback={<PageFallback />}>{renderView()}</Suspense>
      </main>
    </div>
  );
};

export default MainLayout;

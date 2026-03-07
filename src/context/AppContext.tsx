import React, { createContext, useContext, useState, useMemo, ReactNode, useEffect } from 'react';
import { AppState, ViewType, SelectedState, Portfolio, Product, Feature, Assignment, Resource, Release } from '@/types';
import { INITIAL_STATE } from '@/data/initialData';
import { TRANSLATIONS, Language, TranslationKey } from '@/i18n/translations';

export interface DateFilter {
  startDate: Date;
  endDate: Date;
  compareEnabled: boolean;
  compareStartDate: Date;
  compareEndDate: Date;
}

interface AppContextType {
  state: AppState;
  setState: React.Dispatch<React.SetStateAction<AppState>>;
  view: ViewType;
  setView: (view: ViewType) => void;
  selected: SelectedState;
  setSelected: React.Dispatch<React.SetStateAction<SelectedState>>;
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  
  // Language
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: TranslationKey) => string;
  isRTL: boolean;
  
  // Global Date Filter
  dateFilter: DateFilter;
  setDateFilter: React.Dispatch<React.SetStateAction<DateFilter>>;
  
  // Computed values
  metrics: {
    revenue: number;
    cost: number;
    profit: number;
    products: number;
  };
  
  // Actions
  updateAssignment: (assignmentId: number, updates: Partial<Assignment>) => void;
  deleteAssignment: (assignmentId: number) => void;
  addAssignment: (assignment: Omit<Assignment, 'id'>) => void;
  addResource: (resource: Omit<Resource, 'id'>) => void;
  addFeature: (feature: Omit<Feature, 'id'>) => void;
  updateFeature: (featureId: number, updates: Partial<Feature>) => void;
  deleteFeature: (featureId: number) => void;
  updateProduct: (productId: number, updates: Partial<Product>) => void;
  updatePortfolio: (portfolioId: number, updates: Partial<Portfolio>) => void;
  addRelease: (release: Omit<Release, 'id'>) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider = ({ children }: { children: ReactNode }) => {
  const [state, setState] = useState<AppState>(INITIAL_STATE);
  const [view, setView] = useState<ViewType>('dashboard');
  const [selected, setSelected] = useState<SelectedState>({
    portfolio: null,
    product: null,
    feature: null,
    tab: 'overview'
  });
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [language, setLanguage] = useState<Language>('en');
  
  // Global Date Filter - default to 2024 to match sample data
  const [dateFilter, setDateFilter] = useState<DateFilter>({
    startDate: new Date(2024, 0, 1),
    endDate: new Date(2024, 11, 31),
    compareEnabled: false,
    compareStartDate: new Date(2025, 0, 1),
    compareEndDate: new Date(2025, 11, 31),
  });
  
  const isRTL = language === 'ar';
  
  // Update document direction when language changes
  useEffect(() => {
    document.documentElement.lang = language;
    document.body.dir = isRTL ? 'rtl' : 'ltr';
    document.body.style.fontFamily = isRTL 
      ? "'Tajawal', 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
      : "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
  }, [language, isRTL]);
  
  const t = (key: TranslationKey): string => {
    return TRANSLATIONS[language][key] || key;
  };

  const metrics = useMemo(() => {
    let revenue = 0;
    let cost = 0;
    
    state.revenuePlan.forEach(r => {
      revenue += r.expected;
    });
    
    state.costs.forEach(c => {
      if (c.type === 'CAPEX' && c.total && c.amortization) {
        cost += (c.total / c.amortization) * 6;
      } else if (c.monthly) {
        cost += c.monthly * 6;
      }
    });
    
    return {
      revenue,
      cost,
      profit: revenue - cost,
      products: state.products.length
    };
  }, [state]);

  const updateAssignment = (assignmentId: number, updates: Partial<Assignment>) => {
    setState(prev => ({
      ...prev,
      assignments: prev.assignments.map(a =>
        a.id === assignmentId ? { ...a, ...updates } : a
      )
    }));
  };

  const deleteAssignment = (assignmentId: number) => {
    setState(prev => ({
      ...prev,
      assignments: prev.assignments.filter(a => a.id !== assignmentId)
    }));
  };

  const addAssignment = (assignment: Omit<Assignment, 'id'>) => {
    setState(prev => ({
      ...prev,
      assignments: [
        ...prev.assignments,
        { ...assignment, id: Math.max(...prev.assignments.map(a => a.id), 0) + 1 }
      ]
    }));
  };

  const addResource = (resource: Omit<Resource, 'id'>) => {
    setState(prev => ({
      ...prev,
      resources: [
        ...prev.resources,
        { ...resource, id: Math.max(...prev.resources.map(r => r.id), 0) + 1 }
      ]
    }));
  };

  const addFeature = (feature: Omit<Feature, 'id'>) => {
    setState(prev => ({
      ...prev,
      features: [
        ...prev.features,
        { ...feature, id: Math.max(...prev.features.map(f => f.id), 0) + 1 }
      ]
    }));
  };

  const updateFeature = (featureId: number, updates: Partial<Feature>) => {
    setState(prev => ({
      ...prev,
      features: prev.features.map(f =>
        f.id === featureId ? { ...f, ...updates } : f
      )
    }));
  };

  const deleteFeature = (featureId: number) => {
    setState(prev => ({
      ...prev,
      features: prev.features.filter(f => f.id !== featureId)
    }));
  };

  const updateProduct = (productId: number, updates: Partial<Product>) => {
    setState(prev => ({
      ...prev,
      products: prev.products.map(p =>
        p.id === productId ? { ...p, ...updates } : p
      )
    }));
  };

  const updatePortfolio = (portfolioId: number, updates: Partial<Portfolio>) => {
    setState(prev => ({
      ...prev,
      portfolios: prev.portfolios.map(p =>
        p.id === portfolioId ? { ...p, ...updates } : p
      )
    }));
  };

  const addRelease = (release: Omit<Release, 'id'>) => {
    setState(prev => ({
      ...prev,
      releases: [
        ...prev.releases,
        { ...release, id: Math.max(...prev.releases.map(r => r.id), 0) + 1 }
      ]
    }));
  };

  return (
    <AppContext.Provider
      value={{
        state,
        setState,
        view,
        setView,
        selected,
        setSelected,
        sidebarOpen,
        setSidebarOpen,
        language,
        setLanguage,
        t,
        isRTL,
        dateFilter,
        setDateFilter,
        metrics,
        updateAssignment,
        deleteAssignment,
        addAssignment,
        addResource,
        addFeature,
        updateFeature,
        deleteFeature,
        updateProduct,
        updatePortfolio
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
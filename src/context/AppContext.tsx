import React, { createContext, useContext, useState, useMemo, ReactNode, useEffect } from 'react';
import { AppState, ViewType, SelectedState, Portfolio, Product, Feature, Assignment, Resource, Release, StrategicObjective } from '@/types';
import { INITIAL_STATE } from '@/data/initialData';
import { TRANSLATIONS, Language, TranslationKey } from '@/i18n/translations';

export interface DateFilter {
  startDate: Date;
  endDate: Date;
  compareEnabled: boolean;
  compareStartDate: Date;
  compareEndDate: Date;
}

/**
 * Compare-mode entity selection. Empty arrays mean "All" for that
 * dimension. Scoped per page by useCompareMetrics.
 */
export interface CompareSelectionState {
  portfolioIds: number[];
  productIds: number[];
  featureIds: number[];
}

const EMPTY_COMPARE_SELECTION: CompareSelectionState = {
  portfolioIds: [],
  productIds: [],
  featureIds: [],
};

export type LookupKey = 'strategicObjective' | 'businessValue';

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

  // Compare selection (entities chosen while Compare is ON)
  compareSelection: CompareSelectionState;
  setCompareSelection: React.Dispatch<React.SetStateAction<CompareSelectionState>>;
  
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
  updateResource: (resourceId: number, updates: Partial<Resource>) => void;
  deleteResource: (resourceId: number) => void;
  addFeature: (feature: Omit<Feature, 'id'>) => void;
  updateFeature: (featureId: number, updates: Partial<Feature>) => void;
  deleteFeature: (featureId: number) => void;
  updateProduct: (productId: number, updates: Partial<Product>) => void;
  updatePortfolio: (portfolioId: number, updates: Partial<Portfolio>) => void;
  addPortfolio: (portfolio: Omit<Portfolio, 'id'>) => Portfolio;
  addProduct: (product: Omit<Product, 'id'>) => Product;
  addRelease: (release: Omit<Release, 'id'>) => void;
  updateRelease: (releaseId: number, updates: Partial<Release>) => void;

  // Strategic Objectives (per portfolio)
  addStrategicObjective: (obj: Omit<StrategicObjective, 'id'>) => { ok: true; objective: StrategicObjective } | { ok: false; error: string };
  updateStrategicObjective: (id: number, updates: Partial<Omit<StrategicObjective, 'id' | 'portfolioId'>>) => { ok: true } | { ok: false; error: string };
  deleteStrategicObjective: (id: number) => void;

  // Lookup catalogs (reusable controlled-vocabulary values)
  lookups: Record<LookupKey, string[]>;
  addLookupValue: (key: LookupKey, value: string) => string | null;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider = ({ children }: { children: ReactNode }) => {
  const [state, setState] = useState<AppState>(INITIAL_STATE);
  const [view, setView] = useState<ViewType>('dashboard');
  const [selected, setSelected] = useState<SelectedState>({
    portfolio: null,
    product: null,
    feature: null,
    resource: null,
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

  const [compareSelection, setCompareSelection] = useState<CompareSelectionState>(EMPTY_COMPARE_SELECTION);

  // Lookup catalogs: seeded from existing portfolio values, extended at runtime.
  const [extraLookups, setExtraLookups] = useState<Record<LookupKey, string[]>>({
    strategicObjective: [],
    businessValue: [],
  });

  const lookups = useMemo<Record<LookupKey, string[]>>(() => {
    const collect = (key: LookupKey) => {
      const seen = new globalThis.Map<string, string>();
      const push = (v?: string) => {
        const t = (v ?? '').trim();
        if (!t) return;
        const k = t.toLowerCase();
        if (!seen.has(k)) seen.set(k, t);
      };
      state.portfolios.forEach(p => push(p[key]));
      extraLookups[key].forEach(push);
      return Array.from(seen.values()).sort((a, b) => a.localeCompare(b));
    };
    return {
      strategicObjective: collect('strategicObjective'),
      businessValue: collect('businessValue'),
    };
  }, [state.portfolios, extraLookups]);

  const addLookupValue = (key: LookupKey, value: string): string | null => {
    const trimmed = value.trim();
    if (!trimmed) return null;
    const lower = trimmed.toLowerCase();
    const existing = lookups[key].find(v => v.toLowerCase() === lower);
    if (existing) return existing;
    setExtraLookups(prev => ({ ...prev, [key]: [...prev[key], trimmed] }));
    return trimmed;
  };

  // Reset entity selection whenever Compare is toggled OFF so a clean
  // re-enable starts from "All" rather than stale chips.
  useEffect(() => {
    if (!dateFilter.compareEnabled) {
      setCompareSelection(prev =>
        prev.portfolioIds.length === 0 && prev.productIds.length === 0 && prev.featureIds.length === 0
          ? prev
          : EMPTY_COMPARE_SELECTION,
      );
    }
  }, [dateFilter.compareEnabled]);
  
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
    // Window-aware metrics aligned with useHierarchicalMetrics.
    const monthSet = new Set<string>();
    const start = new Date(dateFilter.startDate.getFullYear(), dateFilter.startDate.getMonth(), 1);
    const end = new Date(dateFilter.endDate.getFullYear(), dateFilter.endDate.getMonth(), 1);
    const cursor = new Date(start);
    while (cursor <= end) {
      monthSet.add(`${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}`);
      cursor.setMonth(cursor.getMonth() + 1);
    }

    let revenue = 0;
    state.revenueActual.forEach(r => { if (monthSet.has(r.month)) revenue += r.actual; });

    let cost = 0;
    state.costs.forEach(c => {
      const monthly = c.monthly && c.monthly > 0
        ? c.monthly
        : (c.type === 'CAPEX' && c.total && c.amortization ? c.total / c.amortization : 0);
      if (monthly === 0) return;
      const cs = c.startDate ? c.startDate.slice(0, 7) : null;
      const ce = c.endDate ? c.endDate.slice(0, 7) : null;
      monthSet.forEach(mk => {
        if (cs && mk < cs) return;
        if (ce && mk > ce) return;
        cost += monthly;
      });
    });

    return {
      revenue,
      cost,
      profit: revenue - cost,
      products: state.products.length,
    };
  }, [state, dateFilter]);

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

  const updateResource = (resourceId: number, updates: Partial<Resource>) => {
    setState(prev => ({
      ...prev,
      resources: prev.resources.map(r =>
        r.id === resourceId ? { ...r, ...updates } : r
      )
    }));
  };

  const deleteResource = (resourceId: number) => {
    setState(prev => ({
      ...prev,
      resources: prev.resources.filter(r => r.id !== resourceId),
      assignments: prev.assignments.filter(a => a.resourceId !== resourceId)
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

  const addPortfolio = (portfolio: Omit<Portfolio, 'id'>): Portfolio => {
    const newId = Math.max(...state.portfolios.map(p => p.id), 0) + 1;
    const newPortfolio: Portfolio = { ...portfolio, id: newId };
    setState(prev => ({ ...prev, portfolios: [...prev.portfolios, newPortfolio] }));
    return newPortfolio;
  };

  const addProduct = (product: Omit<Product, 'id'>): Product => {
    const newId = Math.max(...state.products.map(p => p.id), 0) + 1;
    const newProduct: Product = { ...product, id: newId };
    setState(prev => ({ ...prev, products: [...prev.products, newProduct] }));
    return newProduct;
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

  const updateRelease = (releaseId: number, updates: Partial<Release>) => {
    setState(prev => ({
      ...prev,
      releases: prev.releases.map(r =>
        r.id === releaseId ? { ...r, ...updates } : r
      )
    }));
  };

  // ─── Strategic Objectives ───
  const addStrategicObjective: AppContextType['addStrategicObjective'] = (obj) => {
    const title = (obj.title ?? '').trim();
    if (!title) return { ok: false, error: 'Objective title is required' };
    const lower = title.toLowerCase();
    const dup = state.strategicObjectives.some(
      o => o.portfolioId === obj.portfolioId && o.title.trim().toLowerCase() === lower,
    );
    if (dup) return { ok: false, error: 'Objective already exists in this portfolio' };
    const newId = Math.max(...state.strategicObjectives.map(o => o.id), 0) + 1;
    const objective: StrategicObjective = {
      id: newId,
      portfolioId: obj.portfolioId,
      title,
      description: obj.description?.trim() || undefined,
      status: obj.status ?? 'Active',
    };
    setState(prev => ({ ...prev, strategicObjectives: [...prev.strategicObjectives, objective] }));
    return { ok: true, objective };
  };

  const updateStrategicObjective: AppContextType['updateStrategicObjective'] = (id, updates) => {
    const current = state.strategicObjectives.find(o => o.id === id);
    if (!current) return { ok: false, error: 'Objective not found' };
    let nextTitle = current.title;
    if (typeof updates.title === 'string') {
      const t = updates.title.trim();
      if (!t) return { ok: false, error: 'Objective title is required' };
      const lower = t.toLowerCase();
      const dup = state.strategicObjectives.some(
        o => o.id !== id && o.portfolioId === current.portfolioId && o.title.trim().toLowerCase() === lower,
      );
      if (dup) return { ok: false, error: 'Objective already exists in this portfolio' };
      nextTitle = t;
    }
    setState(prev => ({
      ...prev,
      strategicObjectives: prev.strategicObjectives.map(o =>
        o.id === id
          ? {
              ...o,
              title: nextTitle,
              description: 'description' in updates ? (updates.description?.trim() || undefined) : o.description,
              status: updates.status ?? o.status,
            }
          : o,
      ),
    }));
    return { ok: true };
  };

  const deleteStrategicObjective: AppContextType['deleteStrategicObjective'] = (id) => {
    setState(prev => ({
      ...prev,
      strategicObjectives: prev.strategicObjectives.filter(o => o.id !== id),
      products: prev.products.map(p =>
        p.strategicObjectiveIds && p.strategicObjectiveIds.includes(id)
          ? { ...p, strategicObjectiveIds: p.strategicObjectiveIds.filter(x => x !== id) }
          : p,
      ),
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
        compareSelection,
        setCompareSelection,
        updateAssignment,
        deleteAssignment,
        addAssignment,
        addResource,
        updateResource,
        deleteResource,
        addFeature,
        updateFeature,
        deleteFeature,
        updateProduct,
        updatePortfolio,
        addPortfolio,
        addProduct,
        addRelease,
        updateRelease,
        lookups,
        addLookupValue,
        addStrategicObjective,
        updateStrategicObjective,
        deleteStrategicObjective,
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
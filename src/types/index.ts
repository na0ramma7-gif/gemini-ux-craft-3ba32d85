// Core Business Entities

export interface Department {
  id: number;
  name: string;
  code: string;
  budget: number;
  headcount: number;
}

export interface Portfolio {
  id: number;
  name: string;
  code: string;
  description: string;
  priority: 'High' | 'Medium' | 'Low';
  purpose?: string;
  strategicObjective?: string;
  businessValue?: string;
  owner?: string;
  technicalLead?: string;
  businessStakeholder?: string;
  logo?: string;
}

export type LifecycleStage = 'Ideation' | 'Development' | 'Growth' | 'Mature' | 'Sunset';

export interface Product {
  id: number;
  portfolioId: number;
  name: string;
  code: string;
  status: 'Active' | 'Development' | 'Planned' | 'Archived';
  owner: string;
  description?: string;
  businessValue?: string;
  targetClient?: string;
  endUser?: string;
  valueProposition?: string;
  // New product profile fields
  purpose?: string;
  businessProblem?: string;
  strategicObjective?: string;
  lifecycleStage?: LifecycleStage;
  startDate?: string;
  capabilities?: string[];
  successMetrics?: string[];
  technicalOwner?: string;
  deliveryManager?: string;
  businessStakeholder?: string;
  supportingTeams?: string[];
  logo?: string; // base64 or URL
}

export interface Release {
  id: number;
  productId: number;
  version: string;
  name: string;
  startDate: string;
  endDate: string;
  status: 'Planned' | 'In Progress' | 'Released';
}

export interface Feature {
  id: number;
  productId: number;
  releaseId: number | null;
  name: string;
  startDate: string;
  endDate: string;
  status: 'Planned' | 'In Progress' | 'Delivered';
  owner: string;
  priority: 'High' | 'Medium' | 'Low';
  description?: string;
  targetUser?: string;
  customerSegmentation?: string;
  valueProposition?: string;
  businessModel?: string;
  risks?: string;
}

export interface Resource {
  id: number;
  name: string;
  role: string;
  costRate: number;
  capacity: number;
  status: 'Active' | 'Inactive';
}

export interface Assignment {
  id: number;
  resourceId: number;
  productId: number;
  releaseId: number;
  startDate: string;
  endDate: string;
  utilization: number;
}

export interface Cost {
  id: number;
  name: string;
  type: 'CAPEX' | 'OPEX';
  category: string;
  total?: number;
  amortization?: number;
  monthly?: number;
  productId: number;
  startDate: string;
  endDate?: string;
}

export interface RevenuePlan {
  id: number;
  featureId: number;
  month: string;
  expected: number;
}

export interface RevenueActual {
  id: number;
  featureId: number;
  month: string;
  actual: number;
}

export type DocumentLevel = 'product' | 'release';
export type DocumentType = 'BRD' | 'PRD' | 'Technical Design' | 'Architecture' | 'Test Cases' | 'UAT Evidence' | 'Release Notes' | 'API Documentation' | 'User Manual' | 'Operational Runbook' | 'Risk / Compliance' | 'Other';
export type DocumentTag = 'Business' | 'Technical' | 'Testing' | 'Compliance' | 'Operations';

export interface Document {
  id: number;
  title: string;
  name: string;
  type: DocumentType;
  level: DocumentLevel;
  size: number;
  uploadedBy: string;
  uploadedAt: string;
  entityType: 'portfolio' | 'product' | 'feature' | 'release';
  entityId: number;
  releaseId?: number;
  description?: string;
  version?: string;
  effectiveDate?: string;
  tags?: DocumentTag[];
}

// Application State
export interface AppState {
  department: Department;
  portfolios: Portfolio[];
  products: Product[];
  releases: Release[];
  features: Feature[];
  resources: Resource[];
  assignments: Assignment[];
  costs: Cost[];
  revenuePlan: RevenuePlan[];
  revenueActual: RevenueActual[];
  documents: Document[];
  language: 'en' | 'ar';
}

// Navigation and View types
export type ViewType = 'dashboard' | 'portfolio' | 'product' | 'resources' | 'settings';

export interface SelectedState {
  portfolio: Portfolio | null;
  product: Product | null;
  feature: Feature | null;
  tab: string;
}

// Utility types
export type StatusColorMap = {
  [key: string]: string;
};

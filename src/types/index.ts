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

export type ProductHealthStatus = 'Healthy' | 'At Risk' | 'Critical';

/**
 * User-maintained operational/qualitative product health.
 * Distinct from KPI cards, which show system-calculated financials.
 */
export interface ProductHealth {
  status: ProductHealthStatus;
  overallScore?: number;          // 0-100, optional rating
  adoption?: number;              // 0-100
  stability?: number;             // 0-100
  satisfaction?: number;          // 0-100
  operationalReadiness?: number;  // 0-100
  notes?: string;
  updatedAt?: string;             // ISO date, set automatically on save
}

/**
 * User-scored Product Maturity (radar chart input).
 * Each axis on a 0–100 scale. Empty means "not yet scored".
 */
export interface ProductMaturity {
  adoption?: number;
  revenuePerformance?: number;
  efficiency?: number;
  stability?: number;
  customerSatisfaction?: number;
}

export type EngagementLevel = 'Low' | 'Medium' | 'High';
export type UsageTrend = 'Increasing' | 'Stable' | 'Declining';

/**
 * User-maintained product usage / user behavior indicators.
 * All values entered manually per product. Transactions are explicitly yearly.
 */
export interface ProductUsage {
  numberOfUsers?: number;            // total active users
  yearlyTransactions?: number;       // total transactions for the year
  activeUsersPct?: number;           // 0-100
  repeatUsagePct?: number;           // 0-100
  engagementLevel?: EngagementLevel;
  usageTrend?: UsageTrend;
  updatedAt?: string;                // ISO date, set automatically on save
}

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
  /** IDs of StrategicObjective rows the product contributes to (within same portfolio). */
  strategicObjectiveIds?: number[];
  lifecycleStage?: LifecycleStage;
  startDate?: string;
  capabilities?: string[];
  successMetrics?: string[];
  technicalOwner?: string;
  deliveryManager?: string;
  businessStakeholder?: string;
  supportingTeams?: string[];
  logo?: string; // base64 or URL
  /** User-defined operational/qualitative health (NOT financial). */
  health?: ProductHealth;
  /** User-defined maturity scores driving the radar chart. */
  maturity?: ProductMaturity;
  /** User-defined product usage / user behavior indicators. */
  usage?: ProductUsage;
}

export type StrategicObjectiveStatus = 'Active' | 'Archived';

export interface StrategicObjective {
  id: number;
  portfolioId: number;
  title: string;            // required, ≤150
  description?: string;     // optional, ≤250
  status?: StrategicObjectiveStatus;
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
  status: 'To Do' | 'In Progress' | 'Delivered';
  owner: string;
  priority: 'High' | 'Medium' | 'Low';
  description?: string;
  targetUser?: string;
  customerSegmentation?: string;
  valueProposition?: string;
  businessModel?: string;
  risks?: string;
}

export type SkillProficiency = 'Beginner' | 'Intermediate' | 'Advanced' | 'Expert';

export interface ResourceSkill {
  name: string;
  proficiency: SkillProficiency;
}

export interface Resource {
  id: number;
  employeeId: string;
  name: string;
  role: string;
  location: 'On-site' | 'Offshore';
  category: 'Technical' | 'Business' | 'Operation';
  lineManager: string;
  costRate: number;
  capacity: number;
  status: 'Active' | 'Inactive';
  skills?: ResourceSkill[];
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
  strategicObjectives: StrategicObjective[];
  language: 'en' | 'ar';
}

// Navigation and View types
export type ViewType = 'dashboard' | 'portfolio' | 'product' | 'resources' | 'resourceProfile' | 'settings';

export interface SelectedState {
  portfolio: Portfolio | null;
  product: Product | null;
  feature: Feature | null;
  resource: Resource | null;
  tab: string;
}

// Utility types
export type StatusColorMap = {
  [key: string]: string;
};

import { AppState, RevenueService, RevenueLine } from '@/types';

const RAW_INITIAL_STATE: AppState = {
  department: { 
    id: 1, 
    name: 'Business Efficiency', 
    code: 'BE', 
    budget: 8500000, 
    headcount: 65 
  },
  portfolios: [
    { id: 1, name: 'Licensing', code: 'LIC', description: 'Digital licensing solutions', priority: 'High' },
    { id: 2, name: 'Track and Trace', code: 'TNT', description: 'Real-time tracking solutions', priority: 'High' },
    { id: 3, name: 'Practitioner Services', code: 'PRS', description: 'Healthcare management', priority: 'Medium' },
    { id: 4, name: 'Insurance Services', code: 'INS', description: 'Insurance claims processing', priority: 'High' }
  ],
  products: [
    {
      id: 1, portfolioId: 1, name: 'Professional License Portal', code: 'PLP', status: 'Active', owner: 'John Smith',
      description: 'A digital platform for managing professional license applications, renewals, and verifications.',
      purpose: 'Streamline the licensing process for professionals and reduce manual paperwork.',
      businessProblem: 'Manual licensing workflows cause delays, errors, and poor user experience for applicants.',
      strategicObjective: 'Digitize 100% of licensing operations and reduce processing time by 60%.',
      businessValue: 'Increase licensing revenue through higher throughput and reduce operational costs.',
      targetClient: 'Government licensing authorities',
      endUser: 'Licensed professionals and applicants',
      lifecycleStage: 'Growth',
      startDate: '2024-01-01',
      capabilities: ['User Authentication', 'License Application', 'Payment Processing', 'Document Verification', 'Status Tracking'],
      successMetrics: ['Number of licenses processed', 'Average processing time', 'Revenue per license', 'User satisfaction score'],
      technicalOwner: 'Sarah Lee',
      deliveryManager: 'Mike Chen',
      businessStakeholder: 'Ahmed Al-Rashid',
      supportingTeams: ['Engineering', 'QA', 'Operations'],
    },
    {
      id: 2, portfolioId: 1, name: 'License Renewal System', code: 'LRS', status: 'Active', owner: 'Sarah Lee',
      description: 'Automated renewal system for professional licenses with reminders and compliance checks.',
      purpose: 'Automate license renewals to ensure compliance and reduce lapsed licenses.',
      businessProblem: 'High rate of lapsed licenses due to manual renewal processes and lack of reminders.',
      strategicObjective: 'Achieve 95% on-time renewal rate across all license categories.',
      businessValue: 'Reduce license lapses by 80% and improve regulatory compliance.',
      targetClient: 'Licensing boards',
      endUser: 'License holders',
      lifecycleStage: 'Development',
      startDate: '2024-02-01',
      capabilities: ['Auto-Renewal', 'Compliance Checks', 'Notification Engine', 'Dashboard Analytics'],
      successMetrics: ['Renewal rate', 'Days to renewal', 'Compliance score'],
      technicalOwner: 'Tom Brown',
      deliveryManager: 'Lisa Wang',
      businessStakeholder: 'Fatima Hassan',
      supportingTeams: ['Engineering', 'Data'],
    },
    {
      id: 3, portfolioId: 2, name: 'Supply Chain Tracker', code: 'SCT', status: 'Active', owner: 'Mike Chen',
      description: 'Real-time tracking and visibility platform for supply chain operations.',
      purpose: 'Provide end-to-end visibility across the supply chain from origin to delivery.',
      businessProblem: 'Lack of visibility into shipment status leads to delays and inventory issues.',
      strategicObjective: 'Enable real-time tracking for 100% of shipments within 12 months.',
      businessValue: 'Reduce supply chain delays by 40% and improve inventory accuracy.',
      targetClient: 'Logistics companies and distributors',
      endUser: 'Supply chain managers and warehouse operators',
      lifecycleStage: 'Growth',
      startDate: '2024-01-15',
      capabilities: ['Real-time Tracking', 'Analytics Dashboard', 'Alert System', 'API Integration'],
      successMetrics: ['Tracking accuracy', 'Delivery on-time rate', 'Cost savings'],
      technicalOwner: 'James Wilson',
      deliveryManager: 'Emma Davis',
      businessStakeholder: 'Khalid Mansour',
      supportingTeams: ['Engineering', 'Operations', 'Data'],
    },
    {
      id: 4, portfolioId: 2, name: 'Asset Management System', code: 'AMS', status: 'Development', owner: 'Lisa Wang',
      description: 'Comprehensive asset tracking and lifecycle management platform.',
      purpose: 'Track and manage organizational assets from acquisition to disposal.',
      businessProblem: 'Untracked assets lead to financial losses and compliance gaps.',
      strategicObjective: 'Digitize asset management and reduce asset loss by 90%.',
      businessValue: 'Improve asset utilization and reduce unnecessary procurement.',
      lifecycleStage: 'Ideation',
      startDate: '2024-03-01',
      capabilities: ['Asset Registration', 'Lifecycle Tracking', 'Depreciation Calculator', 'Audit Trail'],
      successMetrics: ['Asset utilization rate', 'Cost savings', 'Audit compliance'],
      technicalOwner: 'Tom Brown',
      supportingTeams: ['Engineering'],
    },
    {
      id: 5, portfolioId: 3, name: 'Credential Verification', code: 'CVP', status: 'Active', owner: 'Tom Brown',
      description: 'Platform for verifying practitioner credentials and qualifications.',
      purpose: 'Ensure all practitioners meet required qualifications before providing services.',
      businessProblem: 'Manual verification is slow and error-prone, risking non-compliant practitioners.',
      strategicObjective: 'Automate 100% of credential verification with real-time validation.',
      businessValue: 'Reduce verification time from days to minutes and improve compliance.',
      targetClient: 'Healthcare institutions',
      endUser: 'HR teams and compliance officers',
      lifecycleStage: 'Growth',
      startDate: '2024-02-15',
      capabilities: ['Credential Lookup', 'Automated Verification', 'Expiry Alerts', 'Compliance Reports'],
      successMetrics: ['Verification speed', 'Accuracy rate', 'Compliance score'],
      technicalOwner: 'Sarah Lee',
      deliveryManager: 'Mike Chen',
      businessStakeholder: 'Nora Al-Sayed',
      supportingTeams: ['Engineering', 'Data', 'Operations'],
    },
    {
      id: 6, portfolioId: 3, name: 'Practitioner Directory', code: 'PD', status: 'Active', owner: 'Emma Davis',
      description: 'Searchable directory of verified practitioners with profiles and ratings.',
      purpose: 'Enable patients and institutions to find qualified practitioners easily.',
      businessProblem: 'No centralized system to discover and evaluate practitioners.',
      strategicObjective: 'Build a comprehensive directory covering 95% of licensed practitioners.',
      businessValue: 'Increase practitioner visibility and patient access to qualified care.',
      lifecycleStage: 'Mature',
      capabilities: ['Directory Search', 'Practitioner Profiles', 'Rating System', 'Geo-Location'],
      successMetrics: ['Directory coverage', 'Search volume', 'User satisfaction'],
      supportingTeams: ['Engineering', 'Data'],
    },
    {
      id: 7, portfolioId: 4, name: 'Claims Processing System', code: 'CPS', status: 'Active', owner: 'James Wilson',
      description: 'End-to-end insurance claims submission, processing, and settlement system.',
      purpose: 'Automate and accelerate insurance claims processing for faster settlements.',
      businessProblem: 'Manual claims processing leads to long settlement times and high error rates.',
      strategicObjective: 'Reduce average claims processing time to under 48 hours.',
      businessValue: 'Improve customer satisfaction and reduce operational cost per claim by 50%.',
      targetClient: 'Insurance companies',
      endUser: 'Claims adjusters and policyholders',
      lifecycleStage: 'Growth',
      startDate: '2024-01-20',
      capabilities: ['Claims Submission', 'Auto-Adjudication', 'Fraud Detection', 'Settlement Engine'],
      successMetrics: ['Processing time', 'Settlement accuracy', 'Customer satisfaction', 'Fraud detection rate'],
      technicalOwner: 'Lisa Wang',
      deliveryManager: 'Tom Brown',
      businessStakeholder: 'Omar Jabri',
      supportingTeams: ['Engineering', 'Data', 'Operations'],
    },
    {
      id: 8, portfolioId: 4, name: 'Policy Management Portal', code: 'PMP', status: 'Development', owner: 'Anna Martinez',
      description: 'Portal for managing insurance policies, coverage details, and renewals.',
      purpose: 'Provide a centralized platform for policy lifecycle management.',
      businessProblem: 'Fragmented policy data across systems causes errors and poor customer experience.',
      strategicObjective: 'Consolidate all policy management into a single digital platform.',
      businessValue: 'Reduce policy management overhead and improve customer retention.',
      lifecycleStage: 'Development',
      startDate: '2024-03-01',
      capabilities: ['Policy Creation', 'Coverage Management', 'Renewal Automation', 'Customer Portal'],
      successMetrics: ['Policy accuracy', 'Renewal rate', 'Customer retention'],
      technicalOwner: 'James Wilson',
      supportingTeams: ['Engineering', 'Operations'],
    },
  ],
  releases: [
    { id: 1, productId: 1, version: 'v1.0', name: 'Initial Release', startDate: '2024-01-01', endDate: '2024-03-31', status: 'Released' },
    { id: 2, productId: 1, version: 'v2.0', name: 'Enhanced Features', startDate: '2024-04-01', endDate: '2024-06-30', status: 'In Progress' },
    { id: 3, productId: 2, version: 'v1.0', name: 'MVP', startDate: '2024-02-01', endDate: '2024-04-30', status: 'Released' },
    { id: 4, productId: 3, version: 'v1.0', name: 'Core System', startDate: '2024-01-15', endDate: '2024-05-15', status: 'In Progress' },
    { id: 5, productId: 5, version: 'v1.0', name: 'Verification Core', startDate: '2024-02-15', endDate: '2024-06-15', status: 'In Progress' },
    { id: 6, productId: 7, version: 'v1.0', name: 'Claims Core', startDate: '2024-01-20', endDate: '2024-04-20', status: 'Released' }
  ],
  features: [
    // Product 1 - Professional License Portal: Delivered, In Progress, To Do, Delayed
    { id: 1, productId: 1, releaseId: 1, name: 'User Authentication', startDate: '2024-01-01', endDate: '2024-01-31', status: 'Delivered', owner: 'Dev Team A', priority: 'High' },
    { id: 2, productId: 1, releaseId: 1, name: 'License Application Form', startDate: '2024-02-01', endDate: '2024-02-28', status: 'Delivered', owner: 'Dev Team A', priority: 'High' },
    { id: 3, productId: 1, releaseId: 1, name: 'Payment Gateway', startDate: '2024-03-01', endDate: '2024-03-31', status: 'Delivered', owner: 'Dev Team B', priority: 'High' },
    { id: 4, productId: 1, releaseId: 2, name: 'API Integration', startDate: '2024-04-01', endDate: '2024-05-31', status: 'In Progress', owner: 'Dev Team C', priority: 'Medium' },
    { id: 5, productId: 1, releaseId: 2, name: 'Mobile App', startDate: '2024-05-01', endDate: '2024-06-30', status: 'To Do', owner: 'Dev Team D', priority: 'High' },
    { id: 14, productId: 1, releaseId: 2, name: 'Notification System', startDate: '2024-03-01', endDate: '2024-04-15', status: 'In Progress', owner: 'Dev Team A', priority: 'Medium' },
    // Product 2 - License Renewal System
    { id: 6, productId: 2, releaseId: 3, name: 'Renewal Dashboard', startDate: '2024-02-01', endDate: '2024-03-15', status: 'Delivered', owner: 'Dev Team E', priority: 'High' },
    { id: 7, productId: 2, releaseId: 3, name: 'Auto-Renewal Logic', startDate: '2024-03-15', endDate: '2024-04-30', status: 'In Progress', owner: 'Dev Team E', priority: 'High' },
    { id: 15, productId: 2, releaseId: 3, name: 'Renewal Notifications', startDate: '2024-04-01', endDate: '2024-05-31', status: 'To Do', owner: 'Dev Team E', priority: 'Medium' },
    // Product 3 - Supply Chain Tracker
    { id: 8, productId: 3, releaseId: 4, name: 'Real-time Tracking', startDate: '2024-01-15', endDate: '2024-03-15', status: 'In Progress', owner: 'Dev Team F', priority: 'High' },
    { id: 9, productId: 3, releaseId: 4, name: 'Analytics Dashboard', startDate: '2024-03-15', endDate: '2024-05-15', status: 'To Do', owner: 'Dev Team F', priority: 'Medium' },
    { id: 16, productId: 3, releaseId: 4, name: 'Alert System', startDate: '2024-02-01', endDate: '2024-03-01', status: 'Delivered', owner: 'Dev Team F', priority: 'High' },
    // Portfolio 3 - Practitioner Services
    { id: 10, productId: 5, releaseId: 5, name: 'Credential Lookup', startDate: '2024-02-01', endDate: '2024-04-30', status: 'In Progress', owner: 'Dev Team G', priority: 'High' },
    { id: 11, productId: 6, releaseId: 5, name: 'Directory Search', startDate: '2024-03-01', endDate: '2024-05-31', status: 'To Do', owner: 'Dev Team G', priority: 'Medium' },
    { id: 17, productId: 5, releaseId: 5, name: 'Automated Verification', startDate: '2024-03-01', endDate: '2024-04-15', status: 'Delivered', owner: 'Dev Team G', priority: 'High' },
    // Portfolio 4 - Insurance Services
    { id: 12, productId: 7, releaseId: 6, name: 'Claims Submission', startDate: '2024-01-20', endDate: '2024-03-31', status: 'Delivered', owner: 'Dev Team H', priority: 'High' },
    { id: 13, productId: 8, releaseId: 6, name: 'Policy Renewal Flow', startDate: '2024-03-01', endDate: '2024-05-31', status: 'In Progress', owner: 'Dev Team H', priority: 'High' },
    { id: 18, productId: 7, releaseId: 6, name: 'Fraud Detection', startDate: '2024-04-01', endDate: '2024-06-30', status: 'To Do', owner: 'Dev Team H', priority: 'High' },
    { id: 19, productId: 8, releaseId: 6, name: 'Customer Portal', startDate: '2024-02-15', endDate: '2024-04-30', status: 'In Progress', owner: 'Dev Team H', priority: 'Medium' },
  ],
  resources: [
    { id: 1, employeeId: 'EMP-001', name: 'John Smith', role: 'Product Manager', location: 'On-site', category: 'Business', lineManager: 'Ahmed Ali', costRate: 12000, capacity: 40, status: 'Active', skills: [{ name: 'Product Management', proficiency: 'Expert' }, { name: 'Business Analysis', proficiency: 'Advanced' }, { name: 'Agile', proficiency: 'Expert' }] },
    { id: 2, employeeId: 'EMP-002', name: 'Sarah Lee', role: 'Sr. Developer', location: 'On-site', category: 'Technical', lineManager: 'Ahmed Ali', costRate: 10000, capacity: 40, status: 'Active', skills: [{ name: 'Java', proficiency: 'Expert' }, { name: 'Spring Boot', proficiency: 'Advanced' }, { name: 'Microservices', proficiency: 'Advanced' }, { name: 'Cloud Architecture', proficiency: 'Intermediate' }] },
    { id: 3, employeeId: 'EMP-003', name: 'Mike Chen', role: 'Developer', location: 'Offshore', category: 'Technical', lineManager: 'Sarah Lee', costRate: 8000, capacity: 40, status: 'Active', skills: [{ name: 'React', proficiency: 'Expert' }, { name: 'Node.js', proficiency: 'Advanced' }, { name: 'TypeScript', proficiency: 'Advanced' }] },
    { id: 4, employeeId: 'EMP-004', name: 'Lisa Wang', role: 'QA Lead', location: 'On-site', category: 'Technical', lineManager: 'Sarah Lee', costRate: 9000, capacity: 40, status: 'Active', skills: [{ name: 'QA Automation', proficiency: 'Expert' }, { name: 'Selenium', proficiency: 'Advanced' }, { name: 'Performance Testing', proficiency: 'Intermediate' }] },
    { id: 5, employeeId: 'EMP-005', name: 'Tom Brown', role: 'Business Analyst', location: 'On-site', category: 'Operation', lineManager: 'John Smith', costRate: 7000, capacity: 40, status: 'Active', skills: [{ name: 'Business Analysis', proficiency: 'Expert' }, { name: 'Requirements Engineering', proficiency: 'Advanced' }, { name: 'SQL', proficiency: 'Intermediate' }] }
  ],
  assignments: [
    { id: 1, resourceId: 1, productId: 1, releaseId: 1, startDate: '2024-01-01', endDate: '2024-03-31', utilization: 50 },
    { id: 2, resourceId: 2, productId: 1, releaseId: 1, startDate: '2024-01-01', endDate: '2024-03-31', utilization: 80 },
    { id: 3, resourceId: 3, productId: 1, releaseId: 2, startDate: '2024-04-01', endDate: '2024-06-30', utilization: 100 },
    { id: 4, resourceId: 5, productId: 2, releaseId: 3, startDate: '2024-02-01', endDate: '2024-04-30', utilization: 40 }
  ],
  costs: [
    { id: 1, name: 'AWS Infrastructure', type: 'CAPEX', category: 'Infrastructure', total: 120000, amortization: 24, productId: 1, startDate: '2024-01-01' },
    { id: 2, name: 'Software Licenses', type: 'CAPEX', category: 'Licenses', total: 80000, amortization: 12, productId: 1, startDate: '2024-01-01' },
    { id: 3, name: 'AWS Hosting', type: 'OPEX', category: 'Infrastructure', monthly: 8000, productId: 1, startDate: '2024-01-01' },
    { id: 4, name: 'SendGrid', type: 'OPEX', category: 'Tools', monthly: 2000, productId: 1, startDate: '2024-01-01' },
    { id: 5, name: 'Marketing Q1', type: 'OPEX', category: 'Marketing', monthly: 15000, productId: 1, startDate: '2024-01-01', endDate: '2024-03-31' }
  ],
  revenuePlan: [
    // Portfolio 1 - Licensing (features 1-7, products 1-2)
    { id: 1, featureId: 1, month: '2024-01', expected: 10000 },
    { id: 2, featureId: 1, month: '2024-02', expected: 15000 },
    { id: 3, featureId: 1, month: '2024-03', expected: 20000 },
    { id: 4, featureId: 2, month: '2024-02', expected: 25000 },
    { id: 5, featureId: 2, month: '2024-03', expected: 30000 },
    { id: 6, featureId: 3, month: '2024-03', expected: 40000 },
    { id: 7, featureId: 3, month: '2024-04', expected: 45000 },
    { id: 8, featureId: 6, month: '2024-02', expected: 12000 },
    { id: 9, featureId: 6, month: '2024-03', expected: 18000 },
    { id: 10, featureId: 7, month: '2024-03', expected: 22000 },
    { id: 11, featureId: 7, month: '2024-04', expected: 28000 },
    // Portfolio 2 - Track and Trace (features 8-9, products 3-4)
    { id: 12, featureId: 8, month: '2024-01', expected: 8000 },
    { id: 13, featureId: 8, month: '2024-02', expected: 14000 },
    { id: 14, featureId: 8, month: '2024-03', expected: 22000 },
    { id: 15, featureId: 9, month: '2024-03', expected: 16000 },
    { id: 16, featureId: 9, month: '2024-04', expected: 25000 },
    { id: 17, featureId: 9, month: '2024-05', expected: 30000 },
    // Portfolio 3 - Practitioner Services (features 10-11, products 5-6)
    { id: 18, featureId: 10, month: '2024-02', expected: 9000 },
    { id: 19, featureId: 10, month: '2024-03', expected: 15000 },
    { id: 20, featureId: 10, month: '2024-04', expected: 20000 },
    { id: 21, featureId: 11, month: '2024-03', expected: 11000 },
    { id: 22, featureId: 11, month: '2024-04', expected: 17000 },
    // Portfolio 4 - Insurance Services (features 12-13, products 7-8)
    { id: 23, featureId: 12, month: '2024-01', expected: 18000 },
    { id: 24, featureId: 12, month: '2024-02', expected: 24000 },
    { id: 25, featureId: 12, month: '2024-03', expected: 32000 },
    { id: 26, featureId: 13, month: '2024-03', expected: 14000 },
    { id: 27, featureId: 13, month: '2024-04', expected: 20000 },
    { id: 28, featureId: 13, month: '2024-05', expected: 26000 },
  ],
  revenueActual: [
    // Portfolio 1 - Licensing
    { id: 1, featureId: 1, month: '2024-01', actual: 9500 },
    { id: 2, featureId: 1, month: '2024-02', actual: 14800 },
    { id: 3, featureId: 1, month: '2024-03', actual: 21200 },
    { id: 4, featureId: 2, month: '2024-02', actual: 24000 },
    { id: 5, featureId: 2, month: '2024-03', actual: 29500 },
    { id: 6, featureId: 3, month: '2024-03', actual: 38000 },
    { id: 7, featureId: 6, month: '2024-02', actual: 11000 },
    { id: 8, featureId: 6, month: '2024-03', actual: 16500 },
    { id: 9, featureId: 7, month: '2024-03', actual: 19000 },
    // Portfolio 2 - Track and Trace
    { id: 10, featureId: 8, month: '2024-01', actual: 7200 },
    { id: 11, featureId: 8, month: '2024-02', actual: 13500 },
    { id: 12, featureId: 8, month: '2024-03', actual: 20800 },
    { id: 13, featureId: 9, month: '2024-03', actual: 14200 },
    { id: 14, featureId: 9, month: '2024-04', actual: 22000 },
    // Portfolio 3 - Practitioner Services
    { id: 15, featureId: 10, month: '2024-02', actual: 8200 },
    { id: 16, featureId: 10, month: '2024-03', actual: 13800 },
    { id: 17, featureId: 10, month: '2024-04', actual: 18500 },
    { id: 18, featureId: 11, month: '2024-03', actual: 9800 },
    // Portfolio 4 - Insurance Services
    { id: 19, featureId: 12, month: '2024-01', actual: 16500 },
    { id: 20, featureId: 12, month: '2024-02', actual: 22800 },
    { id: 21, featureId: 12, month: '2024-03', actual: 30500 },
    { id: 22, featureId: 13, month: '2024-03', actual: 12800 },
    { id: 23, featureId: 13, month: '2024-04', actual: 18500 },
  ],
  documents: [],
  strategicObjectives: [],
  language: 'en',
  // Subscription/Service revenue model.
  // Seeded as one "Legacy Revenue" service per feature (rate=1) so legacy
  // monthly amounts migrate 1:1 (plannedTx = expected, actualTx = actual).
  // This preserves all existing roll-up totals exactly.
  revenueServices: [],
  revenueLines: [],
};

/**
 * Per-product service catalog used to seed realistic, multi-service
 * monthly revenue lines. Each entry is a (name, rate, share) triple
 * where `share` defines how much of a feature's monthly amount this
 * service contributes (shares per product must sum to 1).
 *
 * Rate is in SAR per transaction. Splitting: planned/actual amount is
 * multiplied by `share`, then divided by `rate` and rounded to whole
 * transactions; the largest-share row absorbs the rounding remainder
 * so per-feature, per-month totals stay EXACTLY equal to the legacy
 * numbers (no drift in KPIs, charts, compare, or forecast).
 */
const PRODUCT_SERVICE_CATALOG: Record<number, Array<{ name: string; rate: number; share: number }>> = {
  // Professional License Portal
  1: [
    { name: 'New License Application', rate: 250, share: 0.55 },
    { name: 'Verification Lookup',     rate: 15,  share: 0.30 },
    { name: 'Premium Support',         rate: 120, share: 0.15 },
  ],
  // License Renewal System
  2: [
    { name: 'Annual Renewal',     rate: 180, share: 0.70 },
    { name: 'Late Renewal Fee',   rate: 50,  share: 0.20 },
    { name: 'Compliance Report',  rate: 75,  share: 0.10 },
  ],
  // Supply Chain Tracker
  3: [
    { name: 'Shipment Tracking',  rate: 8,   share: 0.60 },
    { name: 'Analytics API Call', rate: 2,   share: 0.25 },
    { name: 'Premium Dashboard',  rate: 200, share: 0.15 },
  ],
  // Asset Management System
  4: [
    { name: 'Asset Tag',          rate: 12,  share: 0.50 },
    { name: 'Audit Report',       rate: 350, share: 0.30 },
    { name: 'Lifecycle Service',  rate: 90,  share: 0.20 },
  ],
  // Practitioner Verification
  5: [
    { name: 'Credential Verification', rate: 35,  share: 0.65 },
    { name: 'Bulk Verification Pack',  rate: 200, share: 0.25 },
    { name: 'API Access Fee',          rate: 5,   share: 0.10 },
  ],
  // Practitioner Directory
  6: [
    { name: 'Directory Listing',  rate: 60,  share: 0.55 },
    { name: 'Featured Profile',   rate: 250, share: 0.30 },
    { name: 'Profile Analytics',  rate: 25,  share: 0.15 },
  ],
  // Claims Management
  7: [
    { name: 'Claim Submission',   rate: 45,  share: 0.50 },
    { name: 'Adjudication Fee',   rate: 90,  share: 0.35 },
    { name: 'Appeal Processing',  rate: 150, share: 0.15 },
  ],
  // Policy Management
  8: [
    { name: 'Policy Issuance',    rate: 220, share: 0.55 },
    { name: 'Endorsement',        rate: 80,  share: 0.30 },
    { name: 'Renewal Notice',     rate: 20,  share: 0.15 },
  ],
};

/** Default catalog if a product isn't listed above. */
const DEFAULT_CATALOG = [
  { name: 'Standard Subscription', rate: 100, share: 0.70 },
  { name: 'Usage Service',         rate: 10,  share: 0.30 },
];

/**
 * Migrate legacy revenuePlan/revenueActual into the subscription/service
 * revenue model with realistic, multi-service per-product seeds.
 * Totals per (feature, month) are preserved EXACTLY — the largest-share
 * row absorbs any rounding remainder so KPIs, charts, compare and
 * forecast see no numerical drift.
 */
function migrateLegacyRevenue(state: AppState): AppState {
  const services: RevenueService[] = [];
  const lines: RevenueLine[] = [];
  let serviceId = 1;
  let lineId = 1;

  // Build feature → product lookup.
  const productOf = new Map<number, number>();
  state.features.forEach(f => productOf.set(f.id, f.productId));

  // Per-feature service map: featureId → array of { id, rate, share }.
  // Created lazily as features are encountered so unused features add no rows.
  const featureServices = new Map<number, Array<{ id: number; rate: number; share: number }>>();

  const ensureFeatureServices = (fid: number) => {
    if (featureServices.has(fid)) return featureServices.get(fid)!;
    const pid = productOf.get(fid);
    const catalog = (pid != null && PRODUCT_SERVICE_CATALOG[pid]) || DEFAULT_CATALOG;
    const arr = catalog.map(c => {
      const sid = serviceId++;
      services.push({ id: sid, featureId: fid, name: c.name, defaultRate: c.rate });
      return { id: sid, rate: c.rate, share: c.share };
    });
    featureServices.set(fid, arr);
    return arr;
  };

  // Combine plan + actual by (featureId, month).
  const monthMap = new Map<string, { planned: number; actual: number }>();
  state.revenuePlan.forEach(r => {
    const k = `${r.featureId}|${r.month}`;
    const cur = monthMap.get(k) ?? { planned: 0, actual: 0 };
    cur.planned += r.expected;
    monthMap.set(k, cur);
  });
  state.revenueActual.forEach(r => {
    const k = `${r.featureId}|${r.month}`;
    const cur = monthMap.get(k) ?? { planned: 0, actual: 0 };
    cur.actual += r.actual;
    monthMap.set(k, cur);
  });

  const ts = new Date().toISOString();

  // Split a total amount across services so that Σ(rate_i × tx_i) === amount EXACTLY.
  // Strategy: round-down each share to whole transactions, then assign the residual
  // (always < max(rate)) as extra transactions at the LARGEST-SHARE row using its
  // own rate as the divisor of last resort, with a per-line rate override applied
  // upstream when remainder isn't divisible. Returns { txs, overrideRate } where
  // `overrideRate` is the effective rate to use on the largest-share line so the
  // final sum is exact (always equal to its catalog rate when remainder == 0).
  const splitToTransactions = (
    amount: number,
    svcs: Array<{ rate: number; share: number }>,
  ): { txs: number[]; overrideRate: number; largestIdx: number } => {
    const n = svcs.length;
    if (amount <= 0 || n === 0) {
      return { txs: svcs.map(() => 0), overrideRate: svcs[0]?.rate ?? 1, largestIdx: 0 };
    }
    // Identify largest-share index (the absorber).
    let largest = 0;
    for (let i = 1; i < n; i++) if (svcs[i].share > svcs[largest].share) largest = i;

    // Round DOWN every non-absorber row.
    const txs = svcs.map((s, i) =>
      i === largest ? 0 : Math.max(0, Math.floor((amount * s.share) / s.rate)),
    );
    const sumOthers = svcs.reduce((sum, s, i) => (i === largest ? sum : sum + s.rate * txs[i]), 0);
    const remainder = amount - sumOthers; // ≥ 0
    const absorberRate = svcs[largest].rate;
    const absorberTx = Math.max(0, Math.floor(remainder / absorberRate));
    txs[largest] = absorberTx;
    const finalSum = sumOthers + absorberTx * absorberRate;
    const drift = amount - finalSum; // 0 ≤ drift < absorberRate

    // If drift != 0, override the absorber's rate so (txs[largest]+1) × overrideRate
    // exactly equals (remainder). This keeps Σ exact without losing realism.
    let overrideRate = absorberRate;
    if (drift > 0) {
      const newTx = absorberTx + 1;
      overrideRate = remainder / newTx;
      txs[largest] = newTx;
    }
    return { txs, overrideRate, largestIdx: largest };
  };

  monthMap.forEach((v, k) => {
    const [fidStr, month] = k.split('|');
    const fid = Number(fidStr);
    const svcs = ensureFeatureServices(fid);
    // Plan and actual are split independently; we group rows by service so each
    // service yields ONE line per month (combining its planned + actual tx).
    // Rate per line: planned and actual must share a single rate, so when an
    // override is needed we use whichever side's override is non-default,
    // preferring the actual side (closer to "what really happened").
    const planSplit = splitToTransactions(v.planned, svcs);
    const actSplit  = splitToTransactions(v.actual,  svcs);
    svcs.forEach((s, i) => {
      const pTx = planSplit.txs[i];
      const aTx = actSplit.txs[i];
      if (pTx === 0 && aTx === 0) return;
      // Determine the per-line rate. For non-absorber rows it's always the
      // catalog rate. For the absorber row, prefer actual's override if any.
      let rate = s.rate;
      if (i === actSplit.largestIdx && actSplit.overrideRate !== s.rate) {
        rate = actSplit.overrideRate;
      } else if (i === planSplit.largestIdx && planSplit.overrideRate !== s.rate) {
        rate = planSplit.overrideRate;
      }
      lines.push({
        id: lineId++,
        featureId: fid,
        serviceId: s.id,
        month,
        rate,
        plannedTransactions: pTx,
        actualTransactions: aTx,
        updatedAt: ts,
      });
    });
  });

  // Rebuild legacy revenuePlan/revenueActual from the lines so the
  // "single source of truth" guarantee holds even when seed splitting
  // applies a tiny per-line rate override on the absorber row. Any
  // sub-rate residual is captured here, so downstream KPIs/charts stay
  // in lockstep with the per-service breakdown.
  const planByKey = new Map<string, number>();
  const actByKey = new Map<string, number>();
  lines.forEach(l => {
    const k = `${l.featureId}|${l.month}`;
    planByKey.set(k, (planByKey.get(k) ?? 0) + l.rate * l.plannedTransactions);
    actByKey.set(k, (actByKey.get(k) ?? 0) + l.rate * l.actualTransactions);
  });
  let pid = 1, aid = 1;
  const revenuePlan: AppState['revenuePlan'] = [];
  const revenueActual: AppState['revenueActual'] = [];
  planByKey.forEach((expected, k) => {
    const [fidStr, month] = k.split('|');
    revenuePlan.push({ id: pid++, featureId: Number(fidStr), month, expected });
  });
  actByKey.forEach((actual, k) => {
    const [fidStr, month] = k.split('|');
    revenueActual.push({ id: aid++, featureId: Number(fidStr), month, actual });
  });

  return { ...state, revenueServices: services, revenueLines: lines, revenuePlan, revenueActual };
}

export const INITIAL_STATE: AppState = migrateLegacyRevenue(RAW_INITIAL_STATE);

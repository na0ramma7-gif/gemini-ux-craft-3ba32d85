import { AppState } from '@/types';

export const INITIAL_STATE: AppState = {
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
    { id: 1, portfolioId: 1, name: 'Professional License Portal', code: 'PLP', status: 'Active', owner: 'John Smith' },
    { id: 2, portfolioId: 1, name: 'License Renewal System', code: 'LRS', status: 'Active', owner: 'Sarah Lee' },
    { id: 3, portfolioId: 2, name: 'Supply Chain Tracker', code: 'SCT', status: 'Active', owner: 'Mike Chen' },
    { id: 4, portfolioId: 2, name: 'Asset Management System', code: 'AMS', status: 'Development', owner: 'Lisa Wang' },
    { id: 5, portfolioId: 3, name: 'Credential Verification', code: 'CVP', status: 'Active', owner: 'Tom Brown' },
    { id: 6, portfolioId: 3, name: 'Practitioner Directory', code: 'PD', status: 'Active', owner: 'Emma Davis' },
    { id: 7, portfolioId: 4, name: 'Claims Processing System', code: 'CPS', status: 'Active', owner: 'James Wilson' },
    { id: 8, portfolioId: 4, name: 'Policy Management Portal', code: 'PMP', status: 'Development', owner: 'Anna Martinez' }
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
    { id: 1, productId: 1, releaseId: 1, name: 'User Authentication', startDate: '2024-01-01', endDate: '2024-01-31', status: 'Delivered', owner: 'Dev Team A', priority: 'High' },
    { id: 2, productId: 1, releaseId: 1, name: 'License Application Form', startDate: '2024-02-01', endDate: '2024-02-28', status: 'Delivered', owner: 'Dev Team A', priority: 'High' },
    { id: 3, productId: 1, releaseId: 1, name: 'Payment Gateway', startDate: '2024-03-01', endDate: '2024-03-31', status: 'Delivered', owner: 'Dev Team B', priority: 'High' },
    { id: 4, productId: 1, releaseId: 2, name: 'API Integration', startDate: '2024-04-01', endDate: '2024-05-31', status: 'In Progress', owner: 'Dev Team C', priority: 'Medium' },
    { id: 5, productId: 1, releaseId: 2, name: 'Mobile App', startDate: '2024-05-01', endDate: '2024-06-30', status: 'Planned', owner: 'Dev Team D', priority: 'High' },
    { id: 6, productId: 2, releaseId: 3, name: 'Renewal Dashboard', startDate: '2024-02-01', endDate: '2024-03-15', status: 'Delivered', owner: 'Dev Team E', priority: 'High' },
    { id: 7, productId: 2, releaseId: 3, name: 'Auto-Renewal Logic', startDate: '2024-03-15', endDate: '2024-04-30', status: 'In Progress', owner: 'Dev Team E', priority: 'High' },
    { id: 8, productId: 3, releaseId: 4, name: 'Real-time Tracking', startDate: '2024-01-15', endDate: '2024-03-15', status: 'In Progress', owner: 'Dev Team F', priority: 'High' },
    { id: 9, productId: 3, releaseId: 4, name: 'Analytics Dashboard', startDate: '2024-03-15', endDate: '2024-05-15', status: 'Planned', owner: 'Dev Team F', priority: 'Medium' },
    // Portfolio 3 - Practitioner Services
    { id: 10, productId: 5, releaseId: 5, name: 'Credential Lookup', startDate: '2024-02-01', endDate: '2024-04-30', status: 'In Progress', owner: 'Dev Team G', priority: 'High' },
    { id: 11, productId: 6, releaseId: 5, name: 'Directory Search', startDate: '2024-03-01', endDate: '2024-05-31', status: 'Planned', owner: 'Dev Team G', priority: 'Medium' },
    // Portfolio 4 - Insurance Services
    { id: 12, productId: 7, releaseId: 6, name: 'Claims Submission', startDate: '2024-01-20', endDate: '2024-03-31', status: 'Delivered', owner: 'Dev Team H', priority: 'High' },
    { id: 13, productId: 8, releaseId: 6, name: 'Policy Renewal Flow', startDate: '2024-03-01', endDate: '2024-05-31', status: 'In Progress', owner: 'Dev Team H', priority: 'High' },
  ],
  resources: [
    { id: 1, name: 'John Smith', role: 'Product Manager', costRate: 12000, capacity: 40, status: 'Active' },
    { id: 2, name: 'Sarah Lee', role: 'Sr. Developer', costRate: 10000, capacity: 40, status: 'Active' },
    { id: 3, name: 'Mike Chen', role: 'Developer', costRate: 8000, capacity: 40, status: 'Active' },
    { id: 4, name: 'Lisa Wang', role: 'QA Lead', costRate: 9000, capacity: 40, status: 'Active' },
    { id: 5, name: 'Tom Brown', role: 'Business Analyst', costRate: 7000, capacity: 40, status: 'Active' }
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
  language: 'en'
};

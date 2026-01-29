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
    { id: 9, productId: 3, releaseId: 4, name: 'Analytics Dashboard', startDate: '2024-03-15', endDate: '2024-05-15', status: 'Planned', owner: 'Dev Team F', priority: 'Medium' }
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
    { id: 1, featureId: 1, month: '2024-01', expected: 10000 },
    { id: 2, featureId: 1, month: '2024-02', expected: 15000 },
    { id: 3, featureId: 1, month: '2024-03', expected: 20000 },
    { id: 4, featureId: 2, month: '2024-02', expected: 25000 },
    { id: 5, featureId: 2, month: '2024-03', expected: 30000 },
    { id: 6, featureId: 3, month: '2024-03', expected: 40000 },
    { id: 7, featureId: 3, month: '2024-04', expected: 45000 }
  ],
  revenueActual: [
    { id: 1, featureId: 1, month: '2024-01', actual: 9500 },
    { id: 2, featureId: 1, month: '2024-02', actual: 14800 },
    { id: 3, featureId: 1, month: '2024-03', actual: 21200 },
    { id: 4, featureId: 2, month: '2024-02', actual: 24000 },
    { id: 5, featureId: 2, month: '2024-03', actual: 29500 },
    { id: 6, featureId: 3, month: '2024-03', actual: 38000 }
  ],
  documents: [],
  language: 'en'
};

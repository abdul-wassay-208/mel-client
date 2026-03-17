import { User, Project, EditRequest, AuditLogEntry, Notification } from '@/types';

export const mockUsers: User[] = [
  { id: 'u1', name: 'Sarah Chen', email: 'admin@mel.org', role: 'admin' },
  { id: 'u2', name: 'James Wilson', email: 'james@mel.org', role: 'project_lead' },
  { id: 'u3', name: 'Maria Garcia', email: 'maria@mel.org', role: 'project_lead' },
];

export const mockProjects: Project[] = [
  {
    id: 'p1',
    name: 'Digital Infrastructure Assessment',
    projectLeadId: 'u2',
    programLead: 'Dr. Ahmed Hassan',
    projectSupport: 'Technical Support Unit',
    startDate: '2025-01-15',
    endDate: '2026-12-31',
    generalCategory: 'Infrastructure',
    specificCategory: 'Digital Connectivity',
    description: 'Comprehensive assessment and improvement of digital infrastructure across underserved regions in Southeast Asia.',
    reportingInterval: 'quarterly',
    expectedUsers: 5000,
    objectives: [
      {
        id: 'obj1', name: 'Improve Digital Infrastructure Access', description: 'Enhance broadband connectivity across rural regions',
        outcomes: [
          {
            id: 'out1', name: 'Increased Broadband Coverage', description: 'Expand coverage to underserved areas', objectiveId: 'obj1',
            indicators: [
              { id: 'ind1', name: 'New connections established', description: 'Count of new broadband connections', outcomeId: 'out1' },
              { id: 'ind2', name: 'Population with broadband access', description: 'Percentage of target population covered', outcomeId: 'out1' },
            ],
          },
          {
            id: 'out2', name: 'Improved Network Reliability', description: 'Reduce downtime and improve quality', objectiveId: 'obj1',
            indicators: [
              { id: 'ind3', name: 'Network uptime percentage', description: 'Monthly average uptime', outcomeId: 'out2' },
            ],
          },
        ],
      },
      {
        id: 'obj2', name: 'Build Local Technical Capacity', description: 'Train local technicians and operators',
        outcomes: [
          {
            id: 'out3', name: 'Trained Technical Workforce', description: 'Local technicians trained in maintenance', objectiveId: 'obj2',
            indicators: [
              { id: 'ind4', name: 'Technicians trained', description: 'Number of trained personnel', outcomeId: 'out3' },
              { id: 'ind5', name: 'Certification completion rate', description: 'Percentage completing certification', outcomeId: 'out3' },
            ],
          },
        ],
      },
    ],
    status: 'active',
    reports: [
      { id: 'r1', projectId: 'p1', cycleNumber: 1, periodLabel: 'Q1 2025', state: 'published', submittedAt: '2025-04-10', data: [
        { indicatorId: 'ind1', economy: 'Developing', infrastructure: 'Mobile', institution: 'TelcoA', operator: 'OpAlpha', gender: 'Male', age: '25-34', sectorOrgType: 'Private', asn: 'AS12345', technology: '4G LTE', disability: 'None', ruralUrban: 'Rural', topic: 'Connectivity', stakeholderType: 'Operator', dialogueType: 'Workshop', dialogueNumber: 3, partnerType: 'ISP' },
        { indicatorId: 'ind2', economy: 'Developing', infrastructure: 'Fixed', institution: 'GovTelecom', operator: 'OpBeta', gender: 'Female', age: '35-44', sectorOrgType: 'Government', asn: 'AS67890', technology: 'Fiber', disability: 'None', ruralUrban: 'Urban', topic: 'Access', stakeholderType: 'Policy Maker', dialogueType: 'Forum', dialogueNumber: 2, partnerType: 'Government Agency' },
      ], createdAt: '2025-01-15', lastModifiedAt: '2025-04-10' },
      { id: 'r2', projectId: 'p1', cycleNumber: 2, periodLabel: 'Q2 2025', state: 'published', submittedAt: '2025-07-10', data: [
        { indicatorId: 'ind1', economy: 'Developing', infrastructure: 'Mobile', institution: 'TelcoA', operator: 'OpAlpha', gender: 'Female', age: '18-24', sectorOrgType: 'Private', asn: 'AS12345', technology: '5G', disability: 'None', ruralUrban: 'Peri-urban', topic: 'Expansion', stakeholderType: 'Operator', dialogueType: 'Roundtable', dialogueNumber: 5, partnerType: 'ISP' },
      ], createdAt: '2025-04-16', lastModifiedAt: '2025-07-10' },
      { id: 'r3', projectId: 'p1', cycleNumber: 3, periodLabel: 'Q3 2025', state: 'draft', data: [], createdAt: '2025-07-16', lastModifiedAt: '2025-07-16' },
    ],
    createdAt: '2024-12-20',
  },
  {
    id: 'p2',
    name: 'Gender Equality in Tech Initiative',
    projectLeadId: 'u3',
    programLead: 'Prof. Lina Torres',
    projectSupport: 'Gender Unit',
    startDate: '2025-03-01',
    endDate: '2026-08-31',
    generalCategory: 'Capacity Building',
    specificCategory: 'Leadership Development',
    description: 'Promoting gender equality and women\'s participation in the technology sector across partner countries.',
    reportingInterval: 'quarterly',
    expectedUsers: 3000,
    objectives: [
      {
        id: 'obj3', name: 'Increase Women in Tech Leadership', description: 'Promote female representation in tech leadership roles',
        outcomes: [
          {
            id: 'out4', name: 'More Women in Senior Roles', description: 'Increase percentage of women in leadership', objectiveId: 'obj3',
            indicators: [
              { id: 'ind6', name: 'Women in leadership positions', description: 'Count of women promoted to senior roles', outcomeId: 'out4' },
              { id: 'ind7', name: 'Mentorship program participants', description: 'Women enrolled in mentorship programs', outcomeId: 'out4' },
            ],
          },
        ],
      },
    ],
    status: 'active',
    reports: [
      { id: 'r4', projectId: 'p2', cycleNumber: 1, periodLabel: 'Q1 2025', state: 'edit_requested', submittedAt: '2025-05-28', data: [
        { indicatorId: 'ind6', economy: 'Emerging', infrastructure: 'Fixed', institution: 'WomenTech Foundation', operator: 'N/A', gender: 'Female', age: '25-34', sectorOrgType: 'NGO', asn: '', technology: 'Various', disability: 'None', ruralUrban: 'Urban', topic: 'Leadership', stakeholderType: 'Civil Society', dialogueType: 'Conference', dialogueNumber: 1, partnerType: 'NGO' },
      ], createdAt: '2025-03-01', lastModifiedAt: '2025-05-28' },
      { id: 'r5', projectId: 'p2', cycleNumber: 2, periodLabel: 'Q2 2025', state: 'draft', data: [], createdAt: '2025-06-02', lastModifiedAt: '2025-06-02' },
    ],
    createdAt: '2025-02-15',
  },
  {
    id: 'p3',
    name: 'Rural Connectivity Program',
    projectLeadId: 'u2',
    programLead: 'Dr. Samuel Osei',
    projectSupport: 'Field Operations Team',
    startDate: '2024-01-01',
    endDate: '2025-12-31',
    generalCategory: 'Community Development',
    specificCategory: 'Community Networks',
    description: 'Establishing community-owned networks in rural areas to bridge the digital divide.',
    reportingInterval: 'quarterly',
    expectedUsers: 8000,
    objectives: [
      {
        id: 'obj4', name: 'Establish Community Networks', description: 'Deploy community-owned infrastructure',
        outcomes: [
          {
            id: 'out5', name: 'Operational Community Networks', description: 'Networks deployed and operational', objectiveId: 'obj4',
            indicators: [
              { id: 'ind8', name: 'Community networks deployed', description: 'Number of networks launched', outcomeId: 'out5' },
              { id: 'ind9', name: 'Households connected', description: 'Homes with active connections', outcomeId: 'out5' },
            ],
          },
        ],
      },
    ],
    status: 'completed',
    reports: [
      { id: 'r6', projectId: 'p3', cycleNumber: 1, periodLabel: 'Q1 2024', state: 'completed', submittedAt: '2024-03-28', data: [
        { indicatorId: 'ind8', economy: 'Least Developed', infrastructure: 'Hybrid', institution: 'CommunityNet', operator: 'LocalOp', gender: 'Male', age: '35-44', sectorOrgType: 'Civil Society', asn: 'AS99999', technology: 'WiFi Mesh', disability: 'None', ruralUrban: 'Rural', topic: 'Access', stakeholderType: 'Technical Community', dialogueType: 'Community Meeting', dialogueNumber: 8, partnerType: 'Community Organization' },
        { indicatorId: 'ind9', economy: 'Least Developed', infrastructure: 'Hybrid', institution: 'CommunityNet', operator: 'LocalOp', gender: 'Female', age: '45-54', sectorOrgType: 'Civil Society', asn: 'AS99999', technology: 'WiFi Mesh', disability: 'Mobility', ruralUrban: 'Rural', topic: 'Inclusion', stakeholderType: 'Civil Society', dialogueType: 'Training', dialogueNumber: 4, partnerType: 'NGO' },
      ], createdAt: '2024-01-01', lastModifiedAt: '2024-03-28' },
      { id: 'r7', projectId: 'p3', cycleNumber: 2, periodLabel: 'Q2 2024', state: 'completed', submittedAt: '2024-06-25', data: [
        { indicatorId: 'ind8', economy: 'Least Developed', infrastructure: 'Hybrid', institution: 'CommunityNet', operator: 'LocalOp', gender: 'Male', age: '25-34', sectorOrgType: 'Civil Society', asn: 'AS99999', technology: 'WiFi Mesh', disability: 'None', ruralUrban: 'Rural', topic: 'Expansion', stakeholderType: 'Technical Community', dialogueType: 'Workshop', dialogueNumber: 6, partnerType: 'Community Organization' },
      ], createdAt: '2024-04-02', lastModifiedAt: '2024-06-25' },
      { id: 'r8', projectId: 'p3', cycleNumber: 3, periodLabel: 'Q3 2024', state: 'completed', submittedAt: '2024-09-27', data: [
        { indicatorId: 'ind9', economy: 'Least Developed', infrastructure: 'Hybrid', institution: 'CommunityNet', operator: 'LocalOp', gender: 'Female', age: '18-24', sectorOrgType: 'Academic', asn: 'AS99999', technology: 'WiFi + Fiber', disability: 'Visual', ruralUrban: 'Rural', topic: 'Digital Literacy', stakeholderType: 'Academic', dialogueType: 'Seminar', dialogueNumber: 3, partnerType: 'University' },
      ], createdAt: '2024-07-02', lastModifiedAt: '2024-09-27' },
      { id: 'r9', projectId: 'p3', cycleNumber: 4, periodLabel: 'Q4 2024', state: 'completed', submittedAt: '2024-12-28', data: [], createdAt: '2024-10-02', lastModifiedAt: '2024-12-28' },
    ],
    createdAt: '2023-11-15',
  },
];

export const mockEditRequests: EditRequest[] = [
  {
    id: 'er1',
    projectId: 'p2',
    reportId: 'r4',
    indicatorId: 'ind6',
    indicatorName: 'Women in leadership positions',
    fieldsToEdit: ['economy', 'sectorOrgType'],
    reason: 'Initial data entry had incorrect economy classification. Need to update from Emerging to Developing based on latest World Bank data.',
    status: 'pending',
    requestedBy: 'u3',
    requestedByName: 'Maria Garcia',
    projectName: 'Gender Equality in Tech Initiative',
    requestedAt: '2025-06-05T10:30:00Z',
  },
];

export const mockAuditLog: AuditLogEntry[] = [
  { id: 'al1', userId: 'u2', userName: 'James Wilson', action: 'Published Report', entityType: 'Report', entityId: 'r2', timestamp: '2025-07-10T14:22:00Z' },
  { id: 'al2', userId: 'u3', userName: 'Maria Garcia', action: 'Submitted Report', entityType: 'Report', entityId: 'r4', timestamp: '2025-05-28T09:15:00Z' },
  { id: 'al3', userId: 'u3', userName: 'Maria Garcia', action: 'Requested Edit', entityType: 'EditRequest', entityId: 'er1', timestamp: '2025-06-05T10:30:00Z' },
  { id: 'al4', userId: 'u1', userName: 'Sarah Chen', action: 'Created Project', entityType: 'Project', entityId: 'p2', timestamp: '2025-02-15T08:00:00Z' },
  { id: 'al5', userId: 'u1', userName: 'Sarah Chen', action: 'Created Project', entityType: 'Project', entityId: 'p1', timestamp: '2024-12-20T11:00:00Z' },
  { id: 'al6', userId: 'u2', userName: 'James Wilson', action: 'Updated Indicator Data', entityType: 'Indicator', entityId: 'ind1', oldValue: 'Economy: Developed', newValue: 'Economy: Developing', timestamp: '2025-07-08T16:45:00Z' },
];

export const mockNotifications: Notification[] = [
  { id: 'n1', type: 'assignment', title: 'New Project Assignment', message: 'You have been assigned as Project Lead for "Digital Infrastructure Assessment".', recipientId: 'u2', read: true, delivered: true, deliveredAt: '2024-12-20T11:01:00Z', retryCount: 0, createdAt: '2024-12-20T11:00:00Z' },
  { id: 'n3', type: 'publish', title: 'Report Published', message: 'James Wilson published Q2 report for "Digital Infrastructure Assessment".', recipientId: 'u1', read: false, delivered: true, deliveredAt: '2025-07-10T14:23:00Z', retryCount: 0, createdAt: '2025-07-10T14:22:00Z' },
  { id: 'n4', type: 'edit_approval', title: 'Edit Request Pending', message: 'Maria Garcia requested to edit indicator data in "Gender Equality in Tech Initiative".', recipientId: 'u1', read: false, delivered: true, deliveredAt: '2025-06-05T10:31:00Z', retryCount: 0, createdAt: '2025-06-05T10:30:00Z' },
  { id: 'n5', type: 'assignment', title: 'New Project Assignment', message: 'You have been assigned as Project Lead for "Gender Equality in Tech Initiative".', recipientId: 'u3', read: true, delivered: true, deliveredAt: '2025-02-15T08:01:00Z', retryCount: 0, createdAt: '2025-02-15T08:00:00Z' },
];

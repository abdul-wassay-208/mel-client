export type Role = 'admin' | 'project_lead';

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
}

export interface Indicator {
  id: string;
  name: string;
  description: string;
  outcomeId: string;
}

export interface Outcome {
  id: string;
  name: string;
  description: string;
  objectiveId: string;
  indicators: Indicator[];
}

export interface Objective {
  id: string;
  name: string;
  description: string;
  outcomes: Outcome[];
}

export type ReportState = 'draft' | 'published' | 'edit_requested' | 'unlocked' | 're_published' | 'completed';

export interface DisaggregatedData {
  indicatorId: string;
  economy: string;
  infrastructure: string;
  institution: string;
  operator: string;
  gender: string;
  age: string;
  sectorOrgType: string;
  asn: string;
  technology: string;
  disability: string;
  ruralUrban: string;
  topic: string;
  stakeholderType: string;
  dialogueType: string;
  dialogueNumber: number;
  partnerType: string;
}

export interface Report {
  id: string;
  projectId: string;
  cycleNumber: number;
  periodLabel: string;
  state: ReportState;
  data: DisaggregatedData[];
  createdAt: string;
  lastModifiedAt: string;
  submittedAt?: string;
}

export interface Project {
  id: string;
  name: string;
  projectLeadId: string;
  programLead: string;
  projectSupport: string;
  startDate: string;
  endDate: string;
  generalCategory: string;
  specificCategory: string;
  description: string;
  reportingInterval: 'monthly' | 'quarterly';
  expectedUsers: number;
  objectives: Objective[];
  status: 'active' | 'completed';
  reports: Report[];
  createdAt: string;
}

export interface EditRequest {
  id: string;
  projectId: string;
  reportId: string;
  indicatorId: string;
  indicatorName: string;
  fieldsToEdit: string[];
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  requestedBy: string;
  requestedByName: string;
  projectName: string;
  requestedAt: string;
  resolvedAt?: string;
  resolvedBy?: string;
}

export interface AuditLogEntry {
  id: string;
  userId: string;
  userName: string;
  action: string;
  entityType: string;
  entityId: string;
  oldValue?: string;
  newValue?: string;
  timestamp: string;
}

export type NotificationType = 'assignment' | 'publish' | 'edit_approval' | 'edit_rejection';

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  recipientId: string;
  read: boolean;
  delivered: boolean;
  deliveredAt?: string;
  failedAt?: string;
  retryCount: number;
  createdAt: string;
}

export const ECONOMY_OPTIONS = ['Developed', 'Developing', 'Emerging', 'Least Developed'];
export const INFRASTRUCTURE_OPTIONS = ['Fixed', 'Mobile', 'Satellite', 'Hybrid'];
export const GENDER_OPTIONS = ['Male', 'Female', 'Non-binary', 'Prefer not to say'];
export const AGE_OPTIONS = ['Under 18', '18-24', '25-34', '35-44', '45-54', '55-64', '65+'];
export const SECTOR_OPTIONS = ['Government', 'Private', 'NGO', 'Academic', 'Multilateral', 'Civil Society'];
export const DISABILITY_OPTIONS = ['None', 'Visual', 'Hearing', 'Mobility', 'Cognitive', 'Multiple'];
export const RURAL_URBAN_OPTIONS = ['Rural', 'Urban', 'Peri-urban'];
export const STAKEHOLDER_OPTIONS = ['Policy Maker', 'Regulator', 'Operator', 'Civil Society', 'Academic', 'Technical Community'];

export const GENERAL_CATEGORIES = ['Infrastructure', 'Capacity Building', 'Policy & Regulation', 'Community Development', 'Research'];
export const SPECIFIC_CATEGORIES: Record<string, string[]> = {
  'Infrastructure': ['Digital Connectivity', 'Network Expansion', 'Last Mile Access'],
  'Capacity Building': ['Technical Training', 'Leadership Development', 'Institutional Strengthening'],
  'Policy & Regulation': ['Regulatory Reform', 'Policy Development', 'Standards'],
  'Community Development': ['Digital Literacy', 'Community Networks', 'Local Content'],
  'Research': ['Impact Assessment', 'Feasibility Study', 'Baseline Survey'],
};

export function emptyDisaggregatedData(indicatorId: string): DisaggregatedData {
  return {
    indicatorId,
    economy: '',
    infrastructure: '',
    institution: '',
    operator: '',
    gender: '',
    age: '',
    sectorOrgType: '',
    asn: '',
    technology: '',
    disability: '',
    ruralUrban: '',
    topic: '',
    stakeholderType: '',
    dialogueType: '',
    dialogueNumber: 0,
    partnerType: '',
  };
}

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
  city: string;
  language: string;
  sectorOrgType: string;
  asn: string;
  technology: string;
  disability: string;
  ruralUrban: string;
  topic: string;
  stakeholderType: string;
  dialoguesText: string;
  partnerType: string;
  numberOfUsers: number;
  notes: string;
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

export const ECONOMY_OPTIONS = [
  'Afghanistan',
  'Bangladesh',
  'Bhutan',
  'British Indian Ocean Territory',
  'India',
  'Maldives',
  'Nepal',
  'Pakistan',
  'Sri Lanka',
  'China',
  'Hong Kong',
  'Japan',
  'Korean, South or DPR',
  'Korea, North or Republic of',
  'Macao Special Administrative Region of China',
  'Mongolia',
  'Taiwan',
  'Brunie Darussalam',
  'Cambodia',
  'Christmas Islands',
  'Cocos and Keeling Islands',
  'Indonesia',
  'Laos',
  'Malaysia',
  'Myanmar',
  'Philippines',
  'Singapore',
  'Thailand',
  'Timor-Leste',
  'Vietnam',
  'French Southern Territories',
  'Australia',
  'New Zealand',
  'Norfolk Island',
  'Fiji',
  'New Caledonia',
  'Papua New Guinea',
  'Solomon Islands',
  'Vanuatu',
  'Guam',
  'Kiribati',
  'Micronesia, Federated States',
  'Marshall Islands',
  'Nauru',
  'Northern Mariana Islands',
  'Palau',
  'American Samoa',
  'Cook Islands',
  'French Polynesia',
  'Niue',
  'Pitcairn',
  'Samoa',
  'Tokelau',
  'Tonga',
  'Tuvalu',
  'Walls and Futuna Islands',
];
export const INFRASTRUCTURE_OPTIONS = ['CNs', 'IXPs', 'Root servers', 'Caches', 'DNSSEC', 'RPKI'];
export const GENDER_OPTIONS = ['Male', 'Female', 'Gender Diverse'];
export const AGE_OPTIONS = ['18-29', '30-39', '40-49', 'Over 50'];
export const SECTOR_OPTIONS = [
  'Internet service provider (ISP)',
  'Telecommunications/mobile operator',
  'Infrastructure (telecom/transport/hospital)',
  'Internet exchange point (IXP)',
  'Software vendor',
  'Hardware vendor',
  'Hosting/data centre',
  'Domain name registry/registrar',
  'Government/regulator/municipality',
  'NREN/research network',
  'Academic/Educational/research',
  'Media/entertainment',
  'Banking/financial',
  'Enterprise/manufacturing/retail',
  'Industrial (construction, mining, oil)',
  'Non-profit/NGO/Internet community',
];
export const LANGUAGE_OPTIONS = [
  'Altai',
  'Arabic',
  'Armenian',
  'Assamese',
  'Azerbaijani',
  'Balochi',
  'Balti',
  'Bengali',
  'Bhojpuri',
  'Bikol',
  'Bodo',
  'Burmese',
  'Buryat',
  'Cantonese (Yue) Language',
  'Chhattisgarhi',
  'Cebuano',
  'Chin',
  'Chinese Mandarin',
  'Dari',
  'Dhivehi',
  'Dogri',
  'Dzongkha',
  'Filipino(Tagalog)',
  'Formosan',
  'Georgian',
  'Gujarati',
  'Hakka',
  'Hebrew',
  'Hiligaynon',
  'Hindi',
  'Hokchiu',
  'Hokkien',
  'Ibanag',
  'Ilocano',
  'Indonesian',
  'Japanese',
  'Javanese',
  'Kachin',
  'Kannada',
  'Kapampangan',
  'Karakalpak',
  'Karen',
  'Kashmiri',
  'Kayah',
  'Kazakh',
  'Khakas',
  'Khmer',
  'Konkani',
  'Korean',
  'Kurdish',
  'Kyrgyz',
  'Lao',
  'Magahi',
  'Maguindanao',
  'Maithili',
  'Malay',
  'Malayalam',
  'Marathi',
  'Meitei',
  'Mizo',
  'Mon',
  'Mongolian',
  'Nagpuri',
  'Nepali',
  'Odia',
  'Okinawan',
  'Ossetian',
  'Pangasinan',
  'Pashto',
  'Persian',
  'Punjabi',
  'Rakhine',
  'Rohingya',
  'Russian',
  'Sanskrit',
  'Santali',
  'Shan',
  'Sindhi',
  'Sinhala',
  'Tajik',
  'Tamil',
  'Tausug',
  'Telugu',
  'Tetum',
  'Thai',
  'Tibetan',
  'Tripuri',
  'Tulu',
  'Turkish',
  'Turkmen',
  'Tuvan',
  'Urdu',
  'Uyghur',
  'Uzbek',
  'Vietnamese',
  'Waray',
  'Yakut',
  'Zhuang',
];
export const DISABILITY_OPTIONS = ['Visual', 'Hearing', 'Mobility', 'Intellectual', 'Psychosocial or neurodiverse'];
export const RURAL_URBAN_OPTIONS = ['Rural', 'Urban'];
export const STAKEHOLDER_OPTIONS = ['Academia', 'Civil Society', 'Government', 'Private sector', 'Social Enterprise', 'Technical Community'];

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
    city: '',
    language: '',
    sectorOrgType: '',
    asn: '',
    technology: '',
    disability: '',
    ruralUrban: '',
    topic: '',
    stakeholderType: '',
    dialoguesText: '',
    partnerType: '',
    numberOfUsers: 0,
    notes: '',
  };
}

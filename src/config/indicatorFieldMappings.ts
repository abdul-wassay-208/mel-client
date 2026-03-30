import {
  ECONOMY_OPTIONS,
  INFRASTRUCTURE_OPTIONS,
  GENDER_OPTIONS,
  AGE_OPTIONS,
  SECTOR_OPTIONS,
  DISABILITY_OPTIONS,
  RURAL_URBAN_OPTIONS,
  STAKEHOLDER_OPTIONS,
  LANGUAGE_OPTIONS,
} from '@/types';

export type FieldType = 'dropdown' | 'text' | 'number';

export interface IndicatorFieldConfig {
  key: string;
  label: string;
  type: FieldType;
  required: boolean;
  options?: string[];
}

export interface IndicatorConfig {
  code: string;
  title: string;
  fields: IndicatorFieldConfig[];
}

const NOTES_FIELD: IndicatorFieldConfig = {
  key: 'notes',
  label: 'Notes',
  type: 'text' as const,
  required: false,
};

const PARTNER_TYPE_OPTIONS = ['ISP', 'Government Agency', 'NGO', 'University', 'Community Organization', 'Private Sector', 'Multilateral'];
const TECHNOLOGY_OPTIONS = ['4G LTE', '5G', 'Fiber', 'WiFi Mesh', 'Satellite', 'DSL', 'Cable', 'Fixed Wireless'];
const TYPE_OPTIONS = ['Publication', 'Report', 'Policy Brief', 'Technical Standard', 'Toolkit', 'Guide'];
const ORG_TYPE_OPTIONS = ['Government', 'Private', 'NGO', 'Academic', 'Multilateral', 'Civil Society'];
const TOPIC_OPTIONS = ['Digital Inclusion', 'Cybersecurity', 'Data Governance', 'AI Policy', 'Spectrum Management', 'Universal Access', 'Digital Rights'];

const BASE_INDICATOR_CONFIGS: IndicatorConfig[] = [
  {
    code: '1.1.1',
    title: 'Indicator 1.1.1',
    fields: [
      { key: 'economy', label: 'Economy', type: 'dropdown', required: true, options: ECONOMY_OPTIONS },
      { key: 'infrastructure', label: 'Infrastructure Type', type: 'dropdown', required: true, options: INFRASTRUCTURE_OPTIONS },
      { key: 'numberOfUsers', label: 'Number Of Users', type: 'number', required: true },
    ],
  },
  {
    code: '1.1.2',
    title: 'Indicator 1.1.2',
    fields: [
      { key: 'economy', label: 'Economy', type: 'dropdown', required: true, options: ECONOMY_OPTIONS },
      { key: 'numberOfUsers', label: 'Number Of Users', type: 'number', required: true },
    ],
  },
  {
    code: '1.1.3',
    title: 'Indicator 1.1.3',
    fields: [
      { key: 'economy', label: 'Economy', type: 'dropdown', required: true, options: ECONOMY_OPTIONS },
      { key: 'institution', label: 'Institution', type: 'text', required: true },
      { key: 'operator', label: 'Operator', type: 'text', required: true },
      { key: 'numberOfUsers', label: 'Number Of Users', type: 'number', required: true },
    ],
  },
  {
    code: '1.2.1',
    title: 'Indicator 1.2.1',
    fields: [
      { key: 'gender', label: 'Gender', type: 'dropdown', required: true, options: GENDER_OPTIONS },
      { key: 'age', label: 'Age', type: 'dropdown', required: true, options: AGE_OPTIONS },
      { key: 'economy', label: 'Economy', type: 'dropdown', required: true, options: ECONOMY_OPTIONS },
      { key: 'city', label: 'City', type: 'text', required: true },
      { key: 'numberOfUsers', label: 'Number', type: 'number', required: true },
    ],
  },
  {
    code: '1.2.2',
    title: 'Indicator 1.2.2',
    fields: [
      { key: 'gender', label: 'Gender', type: 'dropdown', required: true, options: GENDER_OPTIONS },
      { key: 'sectorOrgType', label: 'Sector', type: 'dropdown', required: true, options: SECTOR_OPTIONS },
      { key: 'numberOfUsers', label: 'Percentage', type: 'number', required: true },
    ],
  },
  {
    code: '1.2.3',
    title: 'Indicator 1.2.3',
    fields: [
      { key: 'sectorOrgType', label: 'Org type', type: 'dropdown', required: true, options: ORG_TYPE_OPTIONS },
      { key: 'economy', label: 'Economy', type: 'dropdown', required: true, options: ECONOMY_OPTIONS },
      { key: 'asn', label: 'ASN', type: 'text', required: true },
      { key: 'numberOfUsers', label: 'Number Of Users', type: 'number', required: true },
    ],
  },
  {
    code: '1.3.1',
    title: 'Indicator 1.3.1',
    fields: [
      // "Type" refers to partner type/category of resource
      { key: 'partnerType', label: 'Type', type: 'dropdown', required: true, options: TYPE_OPTIONS },
      { key: 'language', label: 'Language', type: 'dropdown', required: true, options: LANGUAGE_OPTIONS },
      { key: 'numberOfUsers', label: 'Number Of Users', type: 'number', required: true },
    ],
  },
  {
    code: '1.3.2',
    title: 'Indicator 1.3.2',
    fields: [
      { key: 'gender', label: 'Gender', type: 'dropdown', required: true, options: GENDER_OPTIONS },
      { key: 'age', label: 'Age', type: 'dropdown', required: true, options: AGE_OPTIONS },
      { key: 'economy', label: 'Economy', type: 'dropdown', required: true, options: ECONOMY_OPTIONS },
      { key: 'numberOfUsers', label: 'Number Of Users', type: 'number', required: true },
    ],
  },
  {
    code: '2.1.1',
    title: 'Indicator 2.1.1',
    fields: [
      { key: 'partnerType', label: 'Type', type: 'dropdown', required: true, options: TYPE_OPTIONS },
      { key: 'technology', label: 'Technology', type: 'text', required: true },
      { key: 'sectorOrgType', label: 'Sector', type: 'dropdown', required: true, options: SECTOR_OPTIONS },
      { key: 'economy', label: 'Economy', type: 'dropdown', required: true, options: ECONOMY_OPTIONS },
      { key: 'numberOfUsers', label: 'Number Of Users', type: 'number', required: true },
    ],
  },
  {
    code: '2.1.2',
    title: 'Indicator 2.1.2',
    fields: [
      { key: 'economy', label: 'Economy', type: 'dropdown', required: true, options: ECONOMY_OPTIONS },
      { key: 'sectorOrgType', label: 'Sector', type: 'dropdown', required: true, options: SECTOR_OPTIONS },
      { key: 'numberOfUsers', label: 'Number Of Users', type: 'number', required: true },
    ],
  },
  {
    code: '2.1.3',
    title: 'Indicator 2.1.3',
    fields: [
      { key: 'economy', label: 'Economy', type: 'dropdown', required: true, options: ECONOMY_OPTIONS },
      { key: 'gender', label: 'Gender', type: 'dropdown', required: true, options: GENDER_OPTIONS },
      { key: 'disability', label: 'Disability', type: 'dropdown', required: true, options: DISABILITY_OPTIONS },
      { key: 'ruralUrban', label: 'Rural / Urban', type: 'dropdown', required: true, options: RURAL_URBAN_OPTIONS },
      { key: 'numberOfUsers', label: 'Number Of Users', type: 'number', required: true },
    ],
  },
  {
    code: '2.2.1',
    title: 'Indicator 2.2.1',
    fields: [
      { key: 'partnerType', label: 'Type', type: 'dropdown', required: true, options: TYPE_OPTIONS },
      { key: 'numberOfUsers', label: 'Number Of Users', type: 'number', required: true },
    ],
  },
  {
    code: '2.2.2',
    title: 'Indicator 2.2.2',
    fields: [
      { key: 'sectorOrgType', label: 'Org type', type: 'dropdown', required: true, options: ORG_TYPE_OPTIONS },
      { key: 'numberOfUsers', label: 'Number Of Users', type: 'number', required: true },
    ],
  },
  {
    code: '3.1.1',
    title: 'Indicator 3.1.1',
    fields: [
      { key: 'topic', label: 'Topic', type: 'text', required: true },
      { key: 'economy', label: 'Economy', type: 'dropdown', required: true, options: ECONOMY_OPTIONS },
      { key: 'numberOfUsers', label: 'Number Of Users', type: 'number', required: true },
    ],
  },
  {
    code: '3.1.2',
    title: 'Indicator 3.1.2',
    fields: [
      { key: 'economy', label: 'Economy', type: 'dropdown', required: true, options: ECONOMY_OPTIONS },
      { key: 'numberOfUsers', label: 'Number Of Users', type: 'number', required: true },
    ],
  },
  {
    code: '3.1.3',
    title: 'Indicator 3.1.3',
    fields: [
      { key: 'gender', label: 'Gender', type: 'dropdown', required: true, options: GENDER_OPTIONS },
      { key: 'age', label: 'Age', type: 'dropdown', required: true, options: AGE_OPTIONS },
      { key: 'economy', label: 'Economy', type: 'dropdown', required: true, options: ECONOMY_OPTIONS },
      { key: 'numberOfUsers', label: 'Number Of Users', type: 'number', required: true },
      ],
  },
  {
    code: '3.1.4',
    title: 'Indicator 3.1.4',
    fields: [
      { key: 'stakeholderType', label: 'Stakeholder Type', type: 'dropdown', required: true, options: STAKEHOLDER_OPTIONS },
      { key: 'numberOfUsers', label: 'Number Of Users', type: 'number', required: true },
    ],
  },
  {
    code: '3.2.1',
    title: 'Indicator 3.2.1',
    fields: [
      { key: 'economy', label: 'Economy', type: 'dropdown', required: true, options: ECONOMY_OPTIONS },
      { key: 'numberOfUsers', label: 'Number Of Users', type: 'number', required: true },
    ],
  },
  {
    code: '3.2.2',
    title: 'Indicator 3.2.2',
    fields: [
      { key: 'economy', label: 'Economy', type: 'dropdown', required: true, options: ECONOMY_OPTIONS },
      { key: 'numberOfUsers', label: 'Number Of Users', type: 'number', required: true },
    ],
  },
  {
    code: '3.3.1',
    title: 'Indicator 3.3.1',
    fields: [
      { key: 'dialoguesText', label: 'Type and number of dialogues', type: 'text', required: true },
      { key: 'economy', label: 'Economies represented', type: 'dropdown', required: true, options: ECONOMY_OPTIONS },
      { key: 'numberOfUsers', label: 'Number Of Users', type: 'number', required: true },
    ],
  },
  {
    code: '3.3.2',
    title: 'Indicator 3.3.2',
    fields: [
      { key: 'partnerType', label: 'Partner Type', type: 'text', required: true },
    ],
  },
  {
    code: '3.3.3',
    title: 'Indicator 3.3.3',
    fields: [
      { key: 'partnerType', label: 'Partner Type', type: 'text', required: true },
    ],
  },
];

export const INDICATOR_CONFIGS: IndicatorConfig[] = BASE_INDICATOR_CONFIGS.map(
  (c): IndicatorConfig => ({
    ...c,
    fields: c.fields.some((f) => f.key === NOTES_FIELD.key) ? c.fields : [...c.fields, NOTES_FIELD],
  })
);

/**
 * Look up indicator config by indicator code or by indicator name.
 * Falls back to indicator name prefix matching (e.g. name starts with "1.1.1").
 */
export function getIndicatorConfig(indicatorId: string, indicatorName?: string): IndicatorConfig | undefined {
  // Try exact code match first
  let config = INDICATOR_CONFIGS.find(c => c.code === indicatorId);
  if (config) return config;

  // Try matching by indicator name prefix (e.g., name like "1.1.1 - Something")
  if (indicatorName) {
    config = INDICATOR_CONFIGS.find(c => indicatorName.startsWith(c.code));
    if (config) return config;
  }

  return undefined;
}

/**
 * Get required field keys for an indicator config.
 */
export function getRequiredFields(config: IndicatorConfig): string[] {
  return config.fields.filter(f => f.required).map(f => f.key);
}

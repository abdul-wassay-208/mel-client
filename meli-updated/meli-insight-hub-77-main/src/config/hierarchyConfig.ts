/**
 * Central Outcome → Indicator hierarchy configuration.
 * ALL modules must import from here — do not hardcode in UI components.
 */

// ── Strategic Objectives ──

export interface StrategicObjectiveData {
  id: string;
  label: string;
  prefix: string;
}

export const STRATEGIC_OBJECTIVES_DATA: StrategicObjectiveData[] = [
  { id: 'obj1', label: 'Objective 1 – Enhance technical capability of more than 100,000 people', prefix: '1' },
  { id: 'obj2', label: 'Objective 2 – Enhance digital inclusion for 1 million people', prefix: '2' },
  { id: 'obj3', label: 'Objective 3 – Influence techno policy transformation in at least 10 economies', prefix: '3' },
];

// ── Outcomes ──

export interface OutcomeData {
  id: string;
  label: string;
}

export const OUTCOMES_DATA: OutcomeData[] = [
  // Objective 1
  { id: '1.1', label: 'Outcome 1.1 – Internet users have reliable, safe, and meaningful access to the Internet' },
  { id: '1.2', label: 'Outcome 1.2 – A robust Internet ecosystem is nurtured through collaboration and knowledge sharing by inclusive communities of practice' },
  { id: '1.3', label: 'Outcome 1.3 – Communities gain better access to knowledge and have more opportunities for better livelihoods' },
  // Objective 2
  { id: '2.1', label: 'Outcome 2.1 – New and evolving Internet and digital technologies responsibly further socio-economic outcomes' },
  { id: '2.2', label: 'Outcome 2.2 – Stakeholders\' actions are grounded in unbiased frameworks that are vendor-neutral and tech-neutral' },
  // Objective 3
  { id: '3.1', label: 'Outcome 3.1 – Stakeholders intervene based on coordinated and informed technical and policy advice' },
  { id: '3.2', label: 'Outcome 3.2 – Governments nurture supportive techno-policy environments to facilitate digital development and further socioeconomic progress' },
  { id: '3.3', label: 'Outcome 3.3 – Establish leadership for collective impact for digital development' },
];

// ── Indicators ──

export interface IndicatorData {
  id: string;
  outcomePrefix: string;
  label: string;
}

export const INDICATORS_DATA: IndicatorData[] = [
  // Outcome 1.1
  { id: '1.1.1', outcomePrefix: '1.1', label: '1.1.1 – # of local infrastructure deployed or upgraded' },
  { id: '1.1.2', outcomePrefix: '1.1', label: '1.1.2 – % of Internet traffic served locally' },
  { id: '1.1.3', outcomePrefix: '1.1', label: '1.1.3 – # of people benefiting from infrastructure improvements' },
  // Outcome 1.2
  { id: '1.2.1', outcomePrefix: '1.2', label: '1.2.1 – # of people trained' },
  { id: '1.2.2', outcomePrefix: '1.2', label: '1.2.2 – % of participants applying knowledge in workplace or operations' },
  { id: '1.2.3', outcomePrefix: '1.2', label: '1.2.3 – # of organisations represented' },
  // Outcome 1.3
  { id: '1.3.1', outcomePrefix: '1.3', label: '1.3.1 – # of knowledge resources produced' },
  { id: '1.3.2', outcomePrefix: '1.3', label: '1.3.2 – % of beneficiaries reporting improved livelihood opportunities' },
  // Outcome 2.1
  { id: '2.1.1', outcomePrefix: '2.1', label: '2.1.1 – # of Foundation-supported research, tools, platforms, protocols, and pilot solutions developed or trialed' },
  { id: '2.1.2', outcomePrefix: '2.1', label: '2.1.2 – # of innovations adopted by ISPs, governments, institutions, and other relevant entities' },
  { id: '2.1.3', outcomePrefix: '2.1', label: '2.1.3 – # of people benefitting from innovative solutions deployed' },
  // Outcome 2.2
  { id: '2.2.1', outcomePrefix: '2.2', label: '2.2.1 – # of vendor or tech-neutral frameworks developed or published' },
  { id: '2.2.2', outcomePrefix: '2.2', label: '2.2.2 – # of stakeholders adopting or supporting vendor or tech-neutral frameworks' },
  // Outcome 3.1
  { id: '3.1.1', outcomePrefix: '3.1', label: '3.1.1 – # of policy papers, briefs, or guidance notes published' },
  { id: '3.1.2', outcomePrefix: '3.1', label: '3.1.2 – # of stakeholders citing Foundation in policies, strategies, frameworks, consultations, or reports' },
  { id: '3.1.3', outcomePrefix: '3.1', label: '3.1.3 – # of capacity-building and advocacy events on digital policy' },
  { id: '3.1.4', outcomePrefix: '3.1', label: '3.1.4 – % of stakeholders reporting increased policy understanding or capacity' },
  // Outcome 3.2
  { id: '3.2.1', outcomePrefix: '3.2', label: '3.2.1 – # of draft or adopted policies, strategies, or regulations that reflect Foundation input' },
  { id: '3.2.2', outcomePrefix: '3.2', label: '3.2.2 – # of people impacted by policy or regulatory changes' },
  // Outcome 3.3
  { id: '3.3.1', outcomePrefix: '3.3', label: '3.3.1 – # of multistakeholder initiatives or platforms supported, co-led or sustained by the Foundation' },
  { id: '3.3.2', outcomePrefix: '3.3', label: '3.3.2 – # of joint publications, reports, events, and activities with partners' },
  { id: '3.3.3', outcomePrefix: '3.3', label: '3.3.3 – % of partners recognising Foundation as a leader in digital development' },
];

// ── Helpers ──

/** Get outcomes filtered by strategic objective prefix */
export function getOutcomesForObjective(objectiveId: string): OutcomeData[] {
  const soData = STRATEGIC_OBJECTIVES_DATA.find(s => s.id === objectiveId);
  if (!soData) return OUTCOMES_DATA;
  return OUTCOMES_DATA.filter(o => o.id.startsWith(soData.prefix + '.'));
}

/** Get indicators filtered by outcome prefix */
export function getIndicatorsForOutcome(outcomeId: string): IndicatorData[] {
  return INDICATORS_DATA.filter(i => i.outcomePrefix === outcomeId);
}

/** Lookup strategic objective label by prefix (e.g. '1', '2', '3') */
export function getObjectiveLabelByPrefix(prefix: string): string {
  return STRATEGIC_OBJECTIVES_DATA.find(s => s.prefix === prefix)?.label || `Objective ${prefix}`;
}

/** Get all indicator codes as flat list */
export function getAllIndicatorCodes(): string[] {
  return INDICATORS_DATA.map(i => i.id);
}

/** Get indicator label by code */
export function getIndicatorLabel(code: string): string | undefined {
  return INDICATORS_DATA.find(i => i.id === code)?.label;
}

/** Get outcome label by id */
export function getOutcomeLabel(id: string): string | undefined {
  return OUTCOMES_DATA.find(o => o.id === id)?.label;
}

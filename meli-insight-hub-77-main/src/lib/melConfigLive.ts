import type { IndicatorConfig, IndicatorFieldConfig } from '@/config/indicatorFieldMappings';
import type { MELObjective, MELIndicator } from '@/contexts/MELConfigContext';

export type MelConfigPayload = { objectives: MELObjective[] };

export function getMelObjectiveById(objectives: MELObjective[] | undefined | null, id: string) {
  return objectives?.find(o => o.id === id) || null;
}

export function getMelOutcomeById(objectives: MELObjective[] | undefined | null, objectiveId: string, outcomeId: string) {
  const obj = objectives?.find(o => o.id === objectiveId);
  return obj?.outcomes.find(oc => oc.id === outcomeId) || null;
}

export function findMelIndicatorByCode(objectives: MELObjective[] | undefined | null, indicatorCode: string): MELIndicator | null {
  if (!objectives || !indicatorCode) return null;
  for (const obj of objectives) {
    for (const oc of obj.outcomes) {
      for (const ind of oc.indicators) {
        if (ind.code === indicatorCode) return ind;
      }
    }
  }
  return null;
}

const NOTES_FIELD: IndicatorFieldConfig = { key: 'notes', label: 'Notes', type: 'text', required: false };

export function melIndicatorToIndicatorConfig(ind: MELIndicator): IndicatorConfig {
  const fields: IndicatorFieldConfig[] = (ind.fields || [])
    .filter((f: any) => !!f?.key)
    .map((f: any) => ({
      key: String(f.key),
      label: String(f.label || f.key),
      type: f.type as any,
      required: !!f.required,
      options: Array.isArray(f.options) ? f.options : undefined,
    }));

  const withNotes = fields.some(f => f.key === NOTES_FIELD.key) ? fields : [...fields, NOTES_FIELD];

  return {
    code: ind.code,
    title: ind.title || ind.code,
    fields: withNotes,
  };
}


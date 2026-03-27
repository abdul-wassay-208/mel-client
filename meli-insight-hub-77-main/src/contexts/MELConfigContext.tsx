import { createContext, useContext, useState, useEffect, useRef, ReactNode, useCallback } from 'react';
import {
  STRATEGIC_OBJECTIVES_DATA,
  OUTCOMES_DATA,
  INDICATORS_DATA,
} from '@/config/hierarchyConfig';
import { INDICATOR_CONFIGS } from '@/config/indicatorFieldMappings';
import type { IndicatorFieldConfig } from '@/config/indicatorFieldMappings';
import { toast } from 'sonner';
import { apiGetConfig, apiSetConfig } from '@/lib/api';

// ── Types ──

export type MELFieldType = 'dropdown' | 'text' | 'number' | 'multiselect' | 'radio' | 'checkbox' | 'date';

export interface MELField {
  id: string;
  key: string;
  label: string;
  type: MELFieldType;
  required: boolean;
  placeholder?: string;
  defaultValue?: string;
  options?: string[];
}

export interface MELIndicator {
  id: string;
  code: string;
  title: string;
  indicatorType: 'count' | 'percentage' | 'text';
  multiRowEnabled: boolean;
  fields: MELField[];
}

export interface MELOutcome {
  id: string;
  title: string;
  description: string;
  indicators: MELIndicator[];
}

export interface MELObjective {
  id: string;
  title: string;
  description: string;
  outcomes: MELOutcome[];
}

export type SelectedNode =
  | { type: 'objective'; id: string }
  | { type: 'outcome'; id: string; objectiveId: string }
  | { type: 'indicator'; id: string; outcomeId: string; objectiveId: string }
  | null;

export interface TabItem {
  node: NonNullable<SelectedNode>;
  label: string;
}

interface UndoAction {
  label: string;
  restore: () => void;
}

interface MELConfigContextType {
  objectives: MELObjective[];
  selectedNode: SelectedNode;
  setSelectedNode: (node: SelectedNode) => void;
  isDirty: boolean;
  saveDraft: () => Promise<void>;
  publish: () => Promise<void>;

  // Tabs
  openTabs: TabItem[];
  closeTab: (nodeId: string) => void;

  // Objective CRUD
  addObjective: () => void;
  updateObjective: (id: string, updates: Partial<Pick<MELObjective, 'title' | 'description'>>) => void;
  deleteObjective: (id: string) => void;

  // Outcome CRUD
  addOutcome: (objectiveId: string) => void;
  updateOutcome: (objectiveId: string, outcomeId: string, updates: Partial<Pick<MELOutcome, 'title' | 'description'>>) => void;
  deleteOutcome: (objectiveId: string, outcomeId: string) => void;

  // Indicator CRUD
  addIndicator: (objectiveId: string, outcomeId: string) => void;
  updateIndicator: (objectiveId: string, outcomeId: string, indicatorId: string, updates: Partial<Pick<MELIndicator, 'code' | 'title' | 'indicatorType' | 'multiRowEnabled'>>) => void;
  deleteIndicator: (objectiveId: string, outcomeId: string, indicatorId: string) => void;

  // Field CRUD
  addField: (objectiveId: string, outcomeId: string, indicatorId: string) => void;
  updateField: (objectiveId: string, outcomeId: string, indicatorId: string, fieldId: string, updates: Partial<MELField>) => void;
  deleteField: (objectiveId: string, outcomeId: string, indicatorId: string, fieldId: string) => void;
  reorderFields: (objectiveId: string, outcomeId: string, indicatorId: string, fromIndex: number, toIndex: number) => void;

  // Reorder
  reorderObjectives: (fromIndex: number, toIndex: number) => void;
  reorderOutcomes: (objectiveId: string, fromIndex: number, toIndex: number) => void;
  reorderIndicators: (objectiveId: string, outcomeId: string, fromIndex: number, toIndex: number) => void;

  // Helpers
  getSelectedObjective: () => MELObjective | undefined;
  getSelectedOutcome: () => MELOutcome | undefined;
  getSelectedIndicator: () => MELIndicator | undefined;
}

const MELConfigContext = createContext<MELConfigContextType | null>(null);

let _counter = 100;
const genId = () => `mel_${++_counter}_${Date.now()}`;

// ── Seed from existing config ──

function buildInitialObjectives(): MELObjective[] {
  return STRATEGIC_OBJECTIVES_DATA.map(so => {
    const outcomes = OUTCOMES_DATA.filter(o => o.id.startsWith(so.prefix + '.')).map(o => {
      const indicators = INDICATORS_DATA.filter(i => i.outcomePrefix === o.id).map(ind => {
        const cfg = INDICATOR_CONFIGS.find(c => c.code === ind.id);
        const fields: MELField[] = cfg
          ? cfg.fields.map((f: IndicatorFieldConfig) => ({
              id: genId(),
              key: f.key,
              label: f.label,
              type: f.type as MELFieldType,
              required: f.required,
              options: f.options,
            }))
          : [];
        return {
          id: ind.id,
          code: ind.id,
          title: ind.label.replace(/^[\d.]+ – /, ''),
          indicatorType: 'count' as const,
          multiRowEnabled: true,
          fields,
        };
      });
      return {
        id: o.id,
        title: o.label.replace(/^Outcome [\d.]+ – /, ''),
        description: '',
        indicators,
      };
    });
    return {
      id: so.id,
      title: so.label,
      description: '',
      outcomes,
    };
  });
}

type MELConfigPayload = { objectives: MELObjective[] };

export function MELConfigProvider({ children }: { children: ReactNode }) {
  const [objectives, setObjectives] = useState<MELObjective[]>(buildInitialObjectives);
  const [selectedNode, setSelectedNodeRaw] = useState<SelectedNode>(null);
  const [openTabs, setOpenTabs] = useState<TabItem[]>([]);
  const [isDirty, setIsDirty] = useState(false);
  const [savedSnapshot, setSavedSnapshot] = useState<MELObjective[] | null>(null);
  const suppressNextDirty = useRef(false);

  // Load draft on mount (fallback to seeded config)
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await apiGetConfig<MELConfigPayload>('melConfigDraft');
        const draft = res.value?.objectives;
        if (!alive) return;
        if (Array.isArray(draft) && draft.length > 0) {
          suppressNextDirty.current = true;
          setObjectives(draft);
          setSavedSnapshot(draft);
          setIsDirty(false);
        } else {
          setSavedSnapshot(objectives);
        }
      } catch {
        if (!alive) return;
        setSavedSnapshot(objectives);
      }
    })();
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Helper to get label for a node
  const getNodeLabel = useCallback((node: NonNullable<SelectedNode>, objs: MELObjective[]): string => {
    if (node.type === 'objective') {
      return objs.find(o => o.id === node.id)?.title || 'Objective';
    }
    if (node.type === 'outcome') {
      const obj = objs.find(o => o.id === node.objectiveId);
      return obj?.outcomes.find(oc => oc.id === node.id)?.title || 'Outcome';
    }
    if (node.type === 'indicator') {
      const obj = objs.find(o => o.id === node.objectiveId);
      const oc = obj?.outcomes.find(oc => oc.id === node.outcomeId);
      const ind = oc?.indicators.find(i => i.id === node.id);
      return ind?.code ? `${ind.code} – ${ind.title}` : ind?.title || 'Indicator';
    }
    return '';
  }, []);

  // Wrapped setSelectedNode that also manages tabs
  const setSelectedNode = useCallback((node: SelectedNode) => {
    setSelectedNodeRaw(node);
    if (node) {
      setOpenTabs(prev => {
        const exists = prev.some(t => t.node.id === node.id);
        if (exists) return prev;
        return [...prev, { node, label: '' }];
      });
    }
  }, []);

  // Keep tab labels in sync with data changes
  useEffect(() => {
    setOpenTabs(prev => prev.map(tab => ({
      ...tab,
      label: getNodeLabel(tab.node, objectives),
    })));
  }, [objectives, getNodeLabel]);

  const closeTab = useCallback((nodeId: string) => {
    setOpenTabs(prev => {
      const idx = prev.findIndex(t => t.node.id === nodeId);
      const filtered = prev.filter(t => t.node.id !== nodeId);
      if (selectedNode && selectedNode.id === nodeId) {
        if (filtered.length > 0) {
          const newIdx = Math.min(idx, filtered.length - 1);
          setSelectedNodeRaw(filtered[newIdx].node);
        } else {
          setSelectedNodeRaw(null);
        }
      }
      return filtered;
    });
  }, [selectedNode]);

  // Auto-select first objective on mount
  useEffect(() => {
    if (!selectedNode && objectives.length > 0) {
      const firstNode: NonNullable<SelectedNode> = { type: 'objective', id: objectives[0].id };
      setSelectedNodeRaw(firstNode);
      setOpenTabs([{ node: firstNode, label: objectives[0].title }]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Track dirty state on objectives change
  const isFirstRender = useRef(true);
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    if (suppressNextDirty.current) {
      suppressNextDirty.current = false;
      setIsDirty(false);
      return;
    }
    setIsDirty(true);
  }, [objectives]);

  const saveDraft = useCallback(async () => {
    try {
      await apiSetConfig<MELConfigPayload>('melConfigDraft', { objectives });
      setSavedSnapshot(objectives);
      setIsDirty(false);
      toast.success('Draft saved successfully');
    } catch (e: any) {
      toast.error(e?.message || 'Failed to save draft');
      throw e;
    }
  }, [objectives]);

  const publish = useCallback(async () => {
    try {
      // Publish should always publish the current working state.
      await apiSetConfig<MELConfigPayload>('melConfigLive', { objectives });
      await apiSetConfig<MELConfigPayload>('melConfigDraft', { objectives });
      setSavedSnapshot(objectives);
      setIsDirty(false);
      toast.success('Changes published successfully');
    } catch (e: any) {
      toast.error(e?.message || 'Failed to publish changes');
      throw e;
    }
  }, [objectives]);

  // ── Generic updater ──
  const updateObjectives = useCallback((fn: (prev: MELObjective[]) => MELObjective[]) => {
    setObjectives(fn);
  }, []);

  // ── Delete with undo ──
  const deleteWithUndo = useCallback((label: string, doDelete: () => void, snapshot: MELObjective[]) => {
    doDelete();
    toast(`${label} deleted`, {
      action: {
        label: 'Undo',
        onClick: () => setObjectives(snapshot),
      } as any,
    });
  }, []);

  // ── Objective CRUD ──
  const addObjective = useCallback(() => {
    updateObjectives(prev => ([
      ...prev,
      { id: genId(), title: 'New Objective', description: '', outcomes: [] },
    ]));
  }, [updateObjectives]);

  const updateObjective = useCallback((id: string, updates: Partial<Pick<MELObjective, 'title' | 'description'>>) => {
    updateObjectives(prev => prev.map(o => o.id === id ? { ...o, ...updates } : o));
  }, [updateObjectives]);

  const deleteObjective = useCallback((id: string) => {
    const snapshot = objectives;
    deleteWithUndo('Objective', () => updateObjectives(prev => prev.filter(o => o.id !== id)), snapshot);
  }, [deleteWithUndo, updateObjectives, objectives]);

  // ── Outcome CRUD ──
  const addOutcome = useCallback((objectiveId: string) => {
    updateObjectives(prev => prev.map(o => o.id !== objectiveId ? o : ({
      ...o,
      outcomes: [...o.outcomes, { id: genId(), title: 'New Outcome', description: '', indicators: [] }],
    })));
  }, [updateObjectives]);

  const updateOutcome = useCallback((objectiveId: string, outcomeId: string, updates: Partial<Pick<MELOutcome, 'title' | 'description'>>) => {
    updateObjectives(prev => prev.map(o => o.id !== objectiveId ? o : ({
      ...o,
      outcomes: o.outcomes.map(oc => oc.id === outcomeId ? { ...oc, ...updates } : oc),
    })));
  }, [updateObjectives]);

  const deleteOutcome = useCallback((objectiveId: string, outcomeId: string) => {
    const snapshot = objectives;
    deleteWithUndo('Outcome', () => updateObjectives(prev => prev.map(o => o.id !== objectiveId ? o : ({
      ...o,
      outcomes: o.outcomes.filter(oc => oc.id !== outcomeId),
    }))), snapshot);
  }, [deleteWithUndo, updateObjectives, objectives]);

  // ── Indicator CRUD ──
  const addIndicator = useCallback((objectiveId: string, outcomeId: string) => {
    updateObjectives(prev => prev.map(o => o.id !== objectiveId ? o : ({
      ...o,
      outcomes: o.outcomes.map(oc => oc.id !== outcomeId ? oc : ({
        ...oc,
        indicators: [...oc.indicators, { id: genId(), code: '', title: 'New Indicator', indicatorType: 'count', multiRowEnabled: true, fields: [] }],
      })),
    })));
  }, [updateObjectives]);

  const updateIndicator = useCallback((objectiveId: string, outcomeId: string, indicatorId: string, updates: Partial<Pick<MELIndicator, 'code' | 'title' | 'indicatorType' | 'multiRowEnabled'>>) => {
    updateObjectives(prev => prev.map(o => o.id !== objectiveId ? o : ({
      ...o,
      outcomes: o.outcomes.map(oc => oc.id !== outcomeId ? oc : ({
        ...oc,
        indicators: oc.indicators.map(ind => ind.id === indicatorId ? { ...ind, ...updates } : ind),
      })),
    })));
  }, [updateObjectives]);

  const deleteIndicator = useCallback((objectiveId: string, outcomeId: string, indicatorId: string) => {
    const snapshot = objectives;
    deleteWithUndo('Indicator', () => updateObjectives(prev => prev.map(o => o.id !== objectiveId ? o : ({
      ...o,
      outcomes: o.outcomes.map(oc => oc.id !== outcomeId ? oc : ({
        ...oc,
        indicators: oc.indicators.filter(ind => ind.id !== indicatorId),
      })),
    }))), snapshot);
  }, [deleteWithUndo, updateObjectives, objectives]);

  // ── Field CRUD ──
  const addField = useCallback((objectiveId: string, outcomeId: string, indicatorId: string) => {
    updateObjectives(prev => prev.map(o => o.id !== objectiveId ? o : ({
      ...o,
      outcomes: o.outcomes.map(oc => oc.id !== outcomeId ? oc : ({
        ...oc,
        indicators: oc.indicators.map(ind => ind.id !== indicatorId ? ind : ({
          ...ind,
          fields: [...ind.fields, { id: genId(), key: `field_${Date.now()}`, label: 'New Field', type: 'text', required: false, options: [] }],
        })),
      })),
    })));
  }, [updateObjectives]);

  const updateField = useCallback((objectiveId: string, outcomeId: string, indicatorId: string, fieldId: string, updates: Partial<MELField>) => {
    updateObjectives(prev => prev.map(o => o.id !== objectiveId ? o : ({
      ...o,
      outcomes: o.outcomes.map(oc => oc.id !== outcomeId ? oc : ({
        ...oc,
        indicators: oc.indicators.map(ind => ind.id !== indicatorId ? ind : ({
          ...ind,
          fields: ind.fields.map(f => f.id === fieldId ? { ...f, ...updates } : f),
        })),
      })),
    })));
  }, [updateObjectives]);

  const deleteField = useCallback((objectiveId: string, outcomeId: string, indicatorId: string, fieldId: string) => {
    updateObjectives(prev => prev.map(o => o.id !== objectiveId ? o : ({
      ...o,
      outcomes: o.outcomes.map(oc => oc.id !== outcomeId ? oc : ({
        ...oc,
        indicators: oc.indicators.map(ind => ind.id !== indicatorId ? ind : ({
          ...ind,
          fields: ind.fields.filter(f => f.id !== fieldId),
        })),
      })),
    })));
  }, [updateObjectives]);

  const reorderFields = useCallback((objectiveId: string, outcomeId: string, indicatorId: string, fromIndex: number, toIndex: number) => {
    updateObjectives(prev => prev.map(o => o.id !== objectiveId ? o : ({
      ...o,
      outcomes: o.outcomes.map(oc => oc.id !== outcomeId ? oc : ({
        ...oc,
        indicators: oc.indicators.map(ind => {
          if (ind.id !== indicatorId) return ind;
          const next = [...ind.fields];
          const [moved] = next.splice(fromIndex, 1);
          next.splice(toIndex, 0, moved);
          return { ...ind, fields: next };
        }),
      })),
    })));
  }, [updateObjectives]);

  // ── Reorder ──
  const reorderObjectives = useCallback((fromIndex: number, toIndex: number) => {
    updateObjectives(prev => {
      const next = [...prev];
      const [moved] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, moved);
      return next;
    });
  }, [updateObjectives]);

  const reorderOutcomes = useCallback((objectiveId: string, fromIndex: number, toIndex: number) => {
    updateObjectives(prev => prev.map(o => {
      if (o.id !== objectiveId) return o;
      const next = [...o.outcomes];
      const [moved] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, moved);
      return { ...o, outcomes: next };
    }));
  }, [updateObjectives]);

  const reorderIndicators = useCallback((objectiveId: string, outcomeId: string, fromIndex: number, toIndex: number) => {
    updateObjectives(prev => prev.map(o => {
      if (o.id !== objectiveId) return o;
      return {
        ...o,
        outcomes: o.outcomes.map(oc => {
          if (oc.id !== outcomeId) return oc;
          const next = [...oc.indicators];
          const [moved] = next.splice(fromIndex, 1);
          next.splice(toIndex, 0, moved);
          return { ...oc, indicators: next };
        }),
      };
    }));
  }, [updateObjectives]);

  // ── Helpers ──
  const getSelectedObjective = useCallback(() => {
    if (!selectedNode) return undefined;
    if (selectedNode.type === 'objective') return objectives.find(o => o.id === selectedNode.id);
    if (selectedNode.type === 'outcome') return objectives.find(o => o.id === selectedNode.objectiveId);
    if (selectedNode.type === 'indicator') return objectives.find(o => o.id === selectedNode.objectiveId);
    return undefined;
  }, [selectedNode, objectives]);

  const getSelectedOutcome = useCallback(() => {
    if (!selectedNode) return undefined;
    if (selectedNode.type === 'outcome') {
      const obj = objectives.find(o => o.id === selectedNode.objectiveId);
      return obj?.outcomes.find(oc => oc.id === selectedNode.id);
    }
    if (selectedNode.type === 'indicator') {
      const obj = objectives.find(o => o.id === selectedNode.objectiveId);
      const oc = obj?.outcomes.find(oc => oc.id === selectedNode.outcomeId);
      return oc;
    }
    return undefined;
  }, [selectedNode, objectives]);

  const getSelectedIndicator = useCallback(() => {
    if (!selectedNode || selectedNode.type !== 'indicator') return undefined;
    const obj = objectives.find(o => o.id === selectedNode.objectiveId);
    const oc = obj?.outcomes.find(oc => oc.id === selectedNode.outcomeId);
    return oc?.indicators.find(i => i.id === selectedNode.id);
  }, [selectedNode, objectives]);

  const value: MELConfigContextType = {
    objectives,
    selectedNode,
    setSelectedNode,
    isDirty,
    saveDraft,
    publish,
    openTabs,
    closeTab,
    addObjective,
    updateObjective,
    deleteObjective,
    addOutcome,
    updateOutcome,
    deleteOutcome,
    addIndicator,
    updateIndicator,
    deleteIndicator,
    addField,
    updateField,
    deleteField,
    reorderFields,
    reorderObjectives,
    reorderOutcomes,
    reorderIndicators,
    getSelectedObjective,
    getSelectedOutcome,
    getSelectedIndicator,
  };

  return <MELConfigContext.Provider value={value}>{children}</MELConfigContext.Provider>;
}

export function useMELConfig() {
  const ctx = useContext(MELConfigContext);
  if (!ctx) throw new Error('useMELConfig must be used within MELConfigProvider');
  return ctx;
}


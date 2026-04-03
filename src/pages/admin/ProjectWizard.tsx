import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '@/contexts/AppContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { ChevronsUpDown } from 'lucide-react';
import { Objective, GENERAL_CATEGORIES, SPECIFIC_CATEGORIES } from '@/types';
import { Check, ChevronRight, Plus, Trash2, ChevronDown, Target, TrendingUp, Gauge, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { apiGetUsers, apiCreateUser, ApiUserRecord, apiCreateProject, apiGetConfig, type ProjectCategoriesConfig } from '@/lib/api';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import type { MelConfigPayload } from '@/lib/melConfigLive';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { cn } from '@/lib/utils';

const steps = ['Project Details', 'Define Structure', 'Confirm & Save'];

// ── Hardcoded Strategic Objectives ──

const STRATEGIC_OBJECTIVES_DATA: { id: string; label: string; prefix: string }[] = [
  { id: 'obj1', label: 'Objective 1 – Enhance technical capability of more than 100,000 people', prefix: '1' },
  { id: 'obj2', label: 'Objective 2 – Enhance digital inclusion for 1 million people', prefix: '2' },
  { id: 'obj3', label: 'Objective 3 – Influence techno policy transformation in at least 10 economies', prefix: '3' },
];

// ── Hardcoded Outcome & Indicator Data ──

const OUTCOMES_DATA: { id: string; label: string }[] = [
  { id: '1.1', label: 'Outcome 1.1 – Internet users have reliable, safe, and meaningful access to the Internet' },
  { id: '1.2', label: 'Outcome 1.2 – A robust Internet ecosystem is nurtured through collaboration and knowledge sharing by inclusive communities of practice' },
  { id: '1.3', label: 'Outcome 1.3 – Communities gain better access to knowledge and have more opportunities for better livelihoods' },
  { id: '2.1', label: 'Outcome 2.1 – New and evolving Internet and digital technologies responsibly further socio-economic outcomes' },
  { id: '2.2', label: 'Outcome 2.2 – Stakeholders\' actions are grounded in unbiased frameworks that are vendor-neutral and tech-neutral' },
  { id: '3.1', label: 'Outcome 3.1 – Stakeholders intervene based on coordinated and informed technical and policy advice' },
  { id: '3.2', label: 'Outcome 3.2 – Governments nurture supportive techno-policy environments to facilitate digital development and further socioeconomic progress' },
  { id: '3.3', label: 'Outcome 3.3 – Establish leadership for collective impact for digital development' },
];

const INDICATORS_DATA: { id: string; outcomePrefix: string; label: string }[] = [
  { id: '1.1.1', outcomePrefix: '1.1', label: '1.1.1 – # of local infrastructure deployed or upgraded' },
  { id: '1.1.2', outcomePrefix: '1.1', label: '1.1.2 – % of Internet traffic served locally' },
  { id: '1.1.3', outcomePrefix: '1.1', label: '1.1.3 – # of people benefiting from infrastructure improvements' },
  { id: '1.2.1', outcomePrefix: '1.2', label: '1.2.1 – # of people trained' },
  { id: '1.2.2', outcomePrefix: '1.2', label: '1.2.2 – % of participants applying knowledge in workplace or operations' },
  { id: '1.2.3', outcomePrefix: '1.2', label: '1.2.3 – # of organisations represented' },
  { id: '1.3.1', outcomePrefix: '1.3', label: '1.3.1 – # of knowledge resources produced' },
  { id: '1.3.2', outcomePrefix: '1.3', label: '1.3.2 – % of beneficiaries reporting improved livelihood opportunities' },
  { id: '2.1.1', outcomePrefix: '2.1', label: '2.1.1 – # of Foundation-supported research, tools, platforms, protocols, and pilot solutions developed or trialed' },
  { id: '2.1.2', outcomePrefix: '2.1', label: '2.1.2 – # of innovations adopted by ISPs, governments, institutions, and other relevant entities' },
  { id: '2.1.3', outcomePrefix: '2.1', label: '2.1.3 – # of people benefitting from innovative solutions deployed' },
  { id: '2.2.1', outcomePrefix: '2.2', label: '2.2.1 – # of vendor or tech-neutral frameworks developed or published' },
  { id: '2.2.2', outcomePrefix: '2.2', label: '2.2.2 – # of stakeholders adopting or supporting vendor or tech-neutral frameworks' },
  { id: '3.1.1', outcomePrefix: '3.1', label: '3.1.1 – # of policy papers, briefs, or guidance notes published' },
  { id: '3.1.2', outcomePrefix: '3.1', label: '3.1.2 – # of stakeholders citing Foundation in policies, strategies, frameworks, consultations, or reports' },
  { id: '3.1.3', outcomePrefix: '3.1', label: '3.1.3 – # of capacity-building and advocacy events on digital policy' },
  { id: '3.1.4', outcomePrefix: '3.1', label: '3.1.4 – % of stakeholders reporting increased policy understanding or capacity' },
  { id: '3.2.1', outcomePrefix: '3.2', label: '3.2.1 – # of draft or adopted policies, strategies, or regulations that reflect Foundation input' },
  { id: '3.2.2', outcomePrefix: '3.2', label: '3.2.2 – # of people impacted by policy or regulatory changes' },
  { id: '3.3.1', outcomePrefix: '3.3', label: '3.3.1 – # of multistakeholder initiatives or platforms supported, co-led or sustained by the Foundation' },
  { id: '3.3.2', outcomePrefix: '3.3', label: '3.3.2 – # of joint publications, reports, events, and activities with partners' },
  { id: '3.3.3', outcomePrefix: '3.3', label: '3.3.3 – % of partners recognising Foundation as a leader in digital development' },
];

interface OutcomeRow {
  uid: string;
  outcomeId: string;
  indicatorIds: string[];
}

interface StrategicObjective {
  uid: string;
  name: string;
  expanded: boolean;
  outcomeRows: OutcomeRow[];
}

export default function ProjectWizard() {
  const [step, setStep] = useState(0);
  const { addProject } = useApp();
  const navigate = useNavigate();
  const { toast } = useToast();

  // Step 1 (react-hook-form + zod)
  const projectDetailsSchema = useMemo(() => z.object({
    name: z.string().trim().min(1, 'Project name is required'),
    startDate: z.string().min(1, 'Start date is required'),
    endDate: z.string().min(1, 'End date is required'),
    generalCat: z.string().min(1, 'General category is required'),
    specificCat: z.string().min(1, 'Specific category is required'),
    description: z.string().trim().min(1, 'Description is required'),
    interval: z.enum(['quarterly', 'monthly']),
    expectedUsers: z.preprocess((v) => {
      if (typeof v === 'number') return v;
      const s = String(v ?? '').trim();
      if (!s) return NaN;
      return Number(s);
    }, z.number({ invalid_type_error: 'Expected users must be a number' }).positive('Expected users must be a positive number')),
  }).superRefine((val, ctx) => {
    if (val.startDate && val.endDate) {
      const sd = new Date(val.startDate);
      const ed = new Date(val.endDate);
      if (!Number.isNaN(sd.getTime()) && !Number.isNaN(ed.getTime()) && sd >= ed) {
        ctx.addIssue({ code: 'custom', path: ['endDate'], message: 'End date must be after start date' });
      }
    }
  }), []);

  type ProjectDetailsFormValues = z.infer<typeof projectDetailsSchema>;

  const detailsForm = useForm<ProjectDetailsFormValues>({
    resolver: zodResolver(projectDetailsSchema),
    mode: 'onBlur',
    reValidateMode: 'onBlur',
    defaultValues: {
      name: '',
      startDate: '',
      endDate: '',
      generalCat: '',
      specificCat: '',
      description: '',
      interval: 'quarterly',
      expectedUsers: 0,
    },
  });

  const name = detailsForm.watch('name');
  const startDate = detailsForm.watch('startDate');
  const endDate = detailsForm.watch('endDate');
  const generalCat = detailsForm.watch('generalCat');
  const specificCat = detailsForm.watch('specificCat');
  const description = detailsForm.watch('description');
  const interval = detailsForm.watch('interval');
  const expectedUsers = detailsForm.watch('expectedUsers');

  const [categoryConfig, setCategoryConfig] = useState<ProjectCategoriesConfig | null>(null);

  // Step 2 state
  const [strategicObjectives, setStrategicObjectives] = useState<StrategicObjective[]>([]);
  const [melLiveObjectives, setMelLiveObjectives] = useState<MelConfigPayload['objectives'] | null>(null);
  const [step2Submitted, setStep2Submitted] = useState(false);
  const [step2FieldErrors, setStep2FieldErrors] = useState<{
    global?: string;
    bySO?: Record<string, { global?: string; byRow?: Record<string, { outcome?: string; indicators?: string }> }>;
  }>({});

  // Step 3 state
  const [selectedLeads, setSelectedLeads] = useState<string[]>([]);
  const [projectLeads, setProjectLeads] = useState<{ id: string; name: string; email: string }[]>([]);
  const [leadDialogOpen, setLeadDialogOpen] = useState(false);
  const [creatingLead, setCreatingLead] = useState(false);
  const [leadFieldError, setLeadFieldError] = useState<string | null>(null);
  const [newLeadError, setNewLeadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const newLeadSchema = useMemo(() => z.object({
    name: z.string().trim().min(1, 'Full name is required'),
    email: z.string().trim().min(1, 'Email is required').email('Enter a valid email'),
  }), []);
  type NewLeadValues = z.infer<typeof newLeadSchema>;
  const newLeadForm = useForm<NewLeadValues>({
    resolver: zodResolver(newLeadSchema),
    mode: 'onBlur',
    reValidateMode: 'onBlur',
    defaultValues: { name: '', email: '' },
  });

  useEffect(() => {
    (async () => {
      try {
        const users = await apiGetUsers();
        const leads = users
          .filter((u: ApiUserRecord) => u.role === 'PROJECT_LEAD' && u.isActive)
          .map((u) => ({
            id: String(u.id),
            name: u.name,
            email: u.email,
          }));
        setProjectLeads(leads);
      } catch (err: any) {
        console.error(err);
        toast({ title: 'Failed to load project leads', description: err?.message || 'Unknown error', variant: 'destructive' });
      }
    })();
  }, [toast]);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await apiGetConfig<ProjectCategoriesConfig>('projectCategories');
        if (!alive) return;
        setCategoryConfig(res.value ?? null);
      } catch {
        if (!alive) return;
        setCategoryConfig(null);
      }
    })();
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await apiGetConfig<MelConfigPayload>('melConfigLive');
        if (!alive) return;
        setMelLiveObjectives(res.value?.objectives ?? null);
      } catch {
        if (!alive) return;
        setMelLiveObjectives(null);
      }
    })();
    return () => { alive = false; };
  }, []);

  const generalCategoryOptions = categoryConfig?.generalCategories?.length
    ? categoryConfig.generalCategories
    : GENERAL_CATEGORIES;

  const specificCategoryOptions = (
    categoryConfig?.specificCategoriesByGeneral?.[generalCat] ??
    SPECIFIC_CATEGORIES[generalCat] ??
    []
  );

  const validateStep2 = () => {
    setStep2Submitted(true);
    const errors: string[] = [];
    const fieldErrs: NonNullable<typeof step2FieldErrors> = { bySO: {} };
    if (strategicObjectives.length === 0) {
      errors.push('At least 1 Strategic Objective is required');
      fieldErrs.global = 'At least 1 Strategic Objective is required';
      setStep2FieldErrors(fieldErrs);
      return false;
    }
    for (let si = 0; si < strategicObjectives.length; si++) {
      const so = strategicObjectives[si];
      if (!so.name) errors.push(`Strategic Objective ${si + 1}: Objective must be selected`);
      if (so.outcomeRows.length === 0) {
        const soData = STRATEGIC_OBJECTIVES_DATA.find(s => s.id === so.name);
        errors.push(`"${soData?.label || `Objective ${si + 1}`}": At least 1 Outcome is required`);
        fieldErrs.bySO![so.uid] = { ...(fieldErrs.bySO![so.uid] || {}), global: 'At least 1 Outcome is required' };
      } else {
        // Check duplicate outcomes
        const outcomeIds = so.outcomeRows.map(r => r.outcomeId).filter(Boolean);
        const duplicateOutcomes = outcomeIds.filter((id, i) => outcomeIds.indexOf(id) !== i);
        if (duplicateOutcomes.length > 0) {
          const soData = STRATEGIC_OBJECTIVES_DATA.find(s => s.id === so.name);
          errors.push(`"${soData?.label || `Objective ${si + 1}`}": Duplicate outcomes not allowed`);
        }
        for (let ri = 0; ri < so.outcomeRows.length; ri++) {
          const row = so.outcomeRows[ri];
          if (!row.outcomeId) {
            errors.push(`Objective ${si + 1}, Row ${ri + 1}: Outcome must be selected`);
            fieldErrs.bySO![so.uid] = fieldErrs.bySO![so.uid] || { byRow: {} };
            fieldErrs.bySO![so.uid]!.byRow = fieldErrs.bySO![so.uid]!.byRow || {};
            fieldErrs.bySO![so.uid]!.byRow![row.uid] = { ...(fieldErrs.bySO![so.uid]!.byRow![row.uid] || {}), outcome: 'Outcome is required' };
          }
          if (row.indicatorIds.length === 0) {
            errors.push(`Objective ${si + 1}, Outcome ${row.outcomeId || ri + 1}: At least 1 Indicator is required`);
            fieldErrs.bySO![so.uid] = fieldErrs.bySO![so.uid] || { byRow: {} };
            fieldErrs.bySO![so.uid]!.byRow = fieldErrs.bySO![so.uid]!.byRow || {};
            fieldErrs.bySO![so.uid]!.byRow![row.uid] = { ...(fieldErrs.bySO![so.uid]!.byRow![row.uid] || {}), indicators: 'Select at least 1 indicator' };
          }
          const dupInds = row.indicatorIds.filter((id, i) => row.indicatorIds.indexOf(id) !== i);
          if (dupInds.length > 0) {
            errors.push(`Objective ${si + 1}, Outcome ${row.outcomeId}: Duplicate indicators not allowed`);
          }
        }
      }
    }
    setStep2FieldErrors(fieldErrs);
    return errors.length === 0;
  };

  const handleNext = async () => {
    if (step === 0) {
      const ok = await detailsForm.trigger(undefined, { shouldFocus: true });
      if (!ok) return;
      if (selectedLeads.length === 0) {
        setLeadFieldError('Project lead is required');
        return;
      }
    }
    if (step === 1 && !validateStep2()) return;
    setStep(s => Math.min(s + 1, 2));
  };

  // Convert Step 2 data to Objective[] for saving
  const buildObjectives = (): Objective[] => {
    return strategicObjectives.map(so => {
      const soDataLive = melLiveObjectives?.find(o => o.id === so.name) || null;
      const soData = STRATEGIC_OBJECTIVES_DATA.find(s => s.id === so.name);
      return {
        id: so.uid,
        name: soDataLive?.title || soData?.label || so.name,
        description: '',
        outcomes: so.outcomeRows.filter(r => r.outcomeId).map(row => {
        const outcomeLive = soDataLive?.outcomes.find(oc => oc.id === row.outcomeId) || null;
        const outcomeData = OUTCOMES_DATA.find(o => o.id === row.outcomeId);
        return {
          id: `out_${row.uid}`,
          name: outcomeLive?.title || (outcomeData?.label || row.outcomeId),
          description: '',
          objectiveId: so.uid,
          indicators: row.indicatorIds.map(indId => {
            const indLive = outcomeLive?.indicators.find(i => i.code === indId) || null;
            const indData = INDICATORS_DATA.find(i => i.id === indId);
            return {
              id: `ind_${indId}_${row.uid}`,
              name: indLive ? `${indLive.code} – ${indLive.title}` : (indData?.label || indId),
              description: '',
              outcomeId: `out_${row.uid}`,
            };
          }),
        };
      }),
      };
    });
  };

  const handleSave = async () => {
    const objectives = buildObjectives();
    setSaving(true);
    try {
      const details = detailsForm.getValues();
      const created = await apiCreateProject({
        name: details.name,
        description: details.description,
        category: details.generalCat,
        programLead: '',
        projectSupport: '',
        generalCategory: details.generalCat,
        specificCategory: details.specificCat,
        expectedUsers: typeof details.expectedUsers === 'number' ? details.expectedUsers : Number(details.expectedUsers) || 0,
        startDate: details.startDate,
        endDate: details.endDate,
        reportingInterval: details.interval,
        leadIds: selectedLeads.map((id) => Number(id)),
        objectives: objectives.map((o) => ({
          name: o.name,
          description: o.description,
          outcomes: o.outcomes.map((out) => ({
            name: out.name,
            description: out.description,
            indicators: out.indicators.map((ind) => ({
              name: ind.name,
              description: ind.description,
            })),
          })),
        })),
      });

      const mappedObjectives: Objective[] = (created.objectives ?? []).map((o: any) => ({
        id: String(o.id),
        name: o.title,
        description: o.description ?? '',
        outcomes: (o.outcomes ?? []).map((out: any) => ({
          id: String(out.id),
          name: out.title,
          description: out.description ?? '',
          objectiveId: String(o.id),
          indicators: (out.indicators ?? []).map((ind: any) => ({
            id: String(ind.id),
            name: ind.name,
            description: ind.description ?? '',
            outcomeId: String(out.id),
          })),
        })),
      }));

      // Add to local state immediately; AppContext will also load from backend on refresh.
      addProject({
        id: String(created.id),
        name: created.name,
        projectLeadId: created.leadId != null ? String(created.leadId) : (selectedLeads[0] ?? ''),
        programLead: created.programLead ?? '',
        projectSupport: created.projectSupport ?? '',
        startDate: details.startDate,
        endDate: details.endDate,
        generalCategory: created.generalCategory ?? details.generalCat,
        specificCategory: created.specificCategory ?? details.specificCat,
        description: created.description ?? details.description,
        reportingInterval: created.reportingInterval === 'MONTHLY' ? 'monthly' : 'quarterly',
        expectedUsers: created.expectedUsers ?? (typeof details.expectedUsers === 'number' ? details.expectedUsers : 0),
        // IMPORTANT: use DB-created nested structure so indicator IDs are real numeric IDs
        objectives: mappedObjectives.length > 0 ? mappedObjectives : objectives,
        status: 'active',
        reports: [],
        createdAt: created.createdAt,
      });

      toast({ title: 'Project Created', description: `"${name}" has been saved to the database.` });
      navigate('/admin');
    } catch (err: any) {
      console.error(err);
      toast({
        title: 'Failed to create project',
        description: err?.message || 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  // ── Step 2 helpers ──

  const addStrategicObjective = (soId: string) => {
    const soData = melLiveObjectives?.find(s => s.id === soId) || STRATEGIC_OBJECTIVES_DATA.find(s => s.id === soId);
    if (!soData) return;
    // Prevent duplicates
    if (strategicObjectives.some(s => s.name === soData.id)) return;
    setStrategicObjectives(prev => [...prev, {
      uid: `so_${Date.now()}`,
      name: soData.id,
      expanded: true,
      outcomeRows: [],
    }]);
  };

  const removeStrategicObjective = (uid: string) => {
    setStrategicObjectives(prev => prev.filter(s => s.uid !== uid));
  };

  const toggleSO = (uid: string) => {
    setStrategicObjectives(prev => prev.map(s => s.uid === uid ? { ...s, expanded: !s.expanded } : s));
  };

  const addOutcomeRow = (soUid: string) => {
    setStrategicObjectives(prev => prev.map(s => s.uid === soUid ? {
      ...s, outcomeRows: [...s.outcomeRows, { uid: `or_${Date.now()}`, outcomeId: '', indicatorIds: [] }]
    } : s));
  };

  const removeOutcomeRow = (soUid: string, rowUid: string) => {
    setStrategicObjectives(prev => prev.map(s => s.uid === soUid ? {
      ...s, outcomeRows: s.outcomeRows.filter(r => r.uid !== rowUid)
    } : s));
  };

  const setOutcomeForRow = (soUid: string, rowUid: string, outcomeId: string) => {
    setStrategicObjectives(prev => prev.map(s => s.uid === soUid ? {
      ...s, outcomeRows: s.outcomeRows.map(r => r.uid === rowUid ? { ...r, outcomeId, indicatorIds: [] } : r)
    } : s));
  };

  const toggleIndicator = (soUid: string, rowUid: string, indId: string) => {
    setStrategicObjectives(prev => prev.map(s => s.uid === soUid ? {
      ...s, outcomeRows: s.outcomeRows.map(r => r.uid === rowUid ? {
        ...r, indicatorIds: r.indicatorIds.includes(indId)
          ? r.indicatorIds.filter(id => id !== indId)
          : [...r.indicatorIds, indId]
      } : r)
    } : s));
  };

  const removeIndicator = (soUid: string, rowUid: string, indId: string) => {
    setStrategicObjectives(prev => prev.map(s => s.uid === soUid ? {
      ...s, outcomeRows: s.outcomeRows.map(r => r.uid === rowUid ? {
        ...r, indicatorIds: r.indicatorIds.filter(id => id !== indId)
      } : r)
    } : s));
  };

  const getUsedOutcomeIds = (so: StrategicObjective, excludeRowUid: string) => {
    return so.outcomeRows.filter(r => r.uid !== excludeRowUid).map(r => r.outcomeId).filter(Boolean);
  };

  const getOutcomesForSO = (soName: string) => {
    const liveObj = melLiveObjectives?.find(o => o.id === soName);
    if (liveObj) return liveObj.outcomes.map(oc => ({ id: oc.id, label: oc.title }));
    const soData = STRATEGIC_OBJECTIVES_DATA.find(s => s.id === soName);
    if (!soData) return OUTCOMES_DATA;
    return OUTCOMES_DATA.filter(o => o.id.startsWith(soData.prefix + '.'));
  };

  const getFilteredIndicators = (outcomeId: string, soName?: string) => {
    if (soName) {
      const liveObj = melLiveObjectives?.find(o => o.id === soName);
      const liveOutcome = liveObj?.outcomes.find(oc => oc.id === outcomeId);
      if (liveOutcome) return liveOutcome.indicators.map(ind => ({ id: ind.code, outcomePrefix: outcomeId, label: `${ind.code} – ${ind.title}` }));
    }
    return INDICATORS_DATA.filter(i => i.outcomePrefix === outcomeId);
  };

  return (
    <div className="page-container max-w-[860px]">
      <div className="animate-in page-header">
        <h1 className="page-title">Create Project</h1>
        <p className="page-subtitle">Set up a new monitoring project step by step</p>
      </div>

      {/* Stepper */}
      <div className="flex items-center mb-10 animate-in-delay-1">
        {steps.map((s, i) => (
          <div key={s} className="flex items-center flex-1">
            <div className="flex items-center gap-3">
              <div className={`h-10 w-10 rounded-full flex items-center justify-center text-[13px] font-semibold shrink-0 transition-all duration-200 ${
                i < step ? 'bg-success text-success-foreground shadow-sm' : i === step ? 'bg-primary text-primary-foreground shadow-sm' : 'bg-secondary text-muted-foreground'
              }`}>
                {i < step ? <Check className="h-4 w-4" /> : i + 1}
              </div>
              <span className={`text-[13px] font-medium hidden sm:block ${i === step ? 'text-foreground' : 'text-muted-foreground'}`}>{s}</span>
            </div>
            {i < steps.length - 1 && <div className={`flex-1 h-px mx-4 ${i < step ? 'bg-success' : 'bg-border'}`} />}
          </div>
        ))}
      </div>

      <div className="card-elevated p-8 animate-in-delay-2">
        {/* Step 1: Project Details */}
        {step === 0 && (
          <div className="space-y-6">
            <Form {...detailsForm}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <FormField
                  control={detailsForm.control}
                  name="name"
                  render={({ field, fieldState }) => (
                    <FormItem className="sm:col-span-2 space-y-2">
                      <FormLabel className="field-label">Project Name *</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input
                            {...field}
                            placeholder="e.g. Digital Infrastructure Assessment"
                            className={cn("h-12 text-[15px] pr-10", fieldState.error && "border-destructive focus-visible:ring-destructive")}
                          />
                          {fieldState.error && <AlertCircle className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-destructive" />}
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="sm:col-span-2 space-y-2">
                  <Label className="field-label">Assign Lead *</Label>
                  <Select
                    value={selectedLeads[0] ?? ''}
                    onValueChange={(v) => {
                      if (v === '__add_new__') {
                        newLeadForm.reset({ name: '', email: '' });
                        setLeadDialogOpen(true);
                        return;
                      }
                      setSelectedLeads(v ? [v] : []);
                      setLeadFieldError(null);
                    }}
                  >
                    <SelectTrigger className={cn("h-12 text-[15px]", leadFieldError && "border-destructive ring-destructive")}>
                      <SelectValue placeholder="Select a project lead" />
                    </SelectTrigger>
                    <SelectContent className="z-[80]">
                      <SelectItem value="__add_new__">
                        <span className="inline-flex items-center gap-2">
                          <Plus className="h-4 w-4" /> Add new lead…
                        </span>
                      </SelectItem>
                      {projectLeads.map((lead) => (
                        <SelectItem key={lead.id} value={lead.id}>
                          {lead.name} ({lead.email})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {leadFieldError && <p className="text-[12px] text-destructive">{leadFieldError}</p>}

                  <Dialog
                    open={leadDialogOpen}
                    onOpenChange={(open) => {
                      setLeadDialogOpen(open);
                      if (!open) {
                        setNewLeadError(null);
                        newLeadForm.reset({ name: '', email: '' });
                      }
                    }}
                  >
                    <DialogContent className="sm:max-w-[420px] rounded-2xl">
                      <DialogHeader>
                        <DialogTitle className="text-lg font-semibold">Add New Project Lead</DialogTitle>
                        <DialogDescription className="text-[13px]">
                          Create a new user with the Project Lead role. An invitation email will be sent automatically.
                        </DialogDescription>
                      </DialogHeader>
                      {newLeadError && (
                        <div className="mb-3 text-[13px] text-destructive bg-destructive/8 border border-destructive/25 rounded-md px-3 py-2">
                          {newLeadError}
                        </div>
                      )}
                      <Form {...newLeadForm}>
                        <form
                          onSubmit={newLeadForm.handleSubmit(async (values) => {
                            if (creatingLead) return;
                            setCreatingLead(true);
                            setNewLeadError(null);
                            try {
                              const created = await apiCreateUser({
                                name: values.name.trim(),
                                email: values.email.trim().toLowerCase(),
                                role: "PROJECT_LEAD",
                              });
                              // Backend should return `created.email` as a string.
                              // If it ever returns a non-string (e.g. Brevo provider payload),
                              // fall back to the email we just submitted to avoid React crashes.
                              const mappedEmail =
                                typeof (created as any)?.email === "string"
                                  ? (created as any).email
                                  : values.email.trim().toLowerCase();
                              const mapped = {
                                id: String(created.id),
                                name: created.name,
                                email: mappedEmail,
                              };
                              setProjectLeads((prev) => [mapped, ...prev]);
                              setSelectedLeads([mapped.id]);
                              setLeadFieldError(null);
                              toast({
                                title: 'Project Lead created',
                                description: `An invitation was sent to ${mapped.email}.`,
                              });
                              setLeadDialogOpen(false);
                            } catch (err: any) {
                              console.error(err);
                              setNewLeadError(err?.message || 'Failed to create lead. This email may already exist.');
                            } finally {
                              setCreatingLead(false);
                            }
                          })}
                        >
                          <div className="space-y-4 py-2">
                            <FormField
                              control={newLeadForm.control}
                              name="name"
                              render={({ field, fieldState }) => (
                                <FormItem className="space-y-1.5">
                                  <FormLabel className="field-label">Full Name</FormLabel>
                                  <FormControl>
                                    <div className="relative">
                                      <Input
                                        {...field}
                                        placeholder="e.g. James Wilson"
                                        className={cn("h-10 text-[14px] pr-10", fieldState.error && "border-destructive focus-visible:ring-destructive")}
                                        disabled={creatingLead}
                                      />
                                      {fieldState.error && <AlertCircle className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-destructive" />}
                                    </div>
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            <FormField
                              control={newLeadForm.control}
                              name="email"
                              render={({ field, fieldState }) => (
                                <FormItem className="space-y-1.5">
                                  <FormLabel className="field-label">Email Address</FormLabel>
                                  <FormControl>
                                    <div className="relative">
                                      <Input
                                        {...field}
                                        type="email"
                                        placeholder="lead@example.org"
                                        className={cn("h-10 text-[14px] pr-10", fieldState.error && "border-destructive focus-visible:ring-destructive")}
                                        disabled={creatingLead}
                                      />
                                      {fieldState.error && <AlertCircle className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-destructive" />}
                                    </div>
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>

                          <DialogFooter>
                            <Button variant="outline" className="h-10" type="button" disabled={creatingLead} onClick={() => setLeadDialogOpen(false)}>
                              Cancel
                            </Button>
                            <Button className="h-10" type="submit" disabled={creatingLead}>
                              {creatingLead ? 'Creating...' : 'Create & Invite'}
                            </Button>
                          </DialogFooter>
                        </form>
                      </Form>
                    </DialogContent>
                  </Dialog>
                </div>

                <FormField
                  control={detailsForm.control}
                  name="startDate"
                  render={({ field, fieldState }) => (
                    <FormItem className="space-y-2">
                      <FormLabel className="field-label">Start Date *</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input
                            {...field}
                            type="date"
                            className={cn("h-12 text-[15px] pr-10", fieldState.error && "border-destructive focus-visible:ring-destructive")}
                          />
                          {fieldState.error && <AlertCircle className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-destructive" />}
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={detailsForm.control}
                  name="endDate"
                  render={({ field, fieldState }) => (
                    <FormItem className="space-y-2">
                      <FormLabel className="field-label">End Date *</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input
                            {...field}
                            type="date"
                            className={cn("h-12 text-[15px] pr-10", fieldState.error && "border-destructive focus-visible:ring-destructive")}
                          />
                          {fieldState.error && <AlertCircle className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-destructive" />}
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={detailsForm.control}
                  name="generalCat"
                  render={({ field, fieldState }) => (
                    <FormItem className="space-y-2">
                      <FormLabel className="field-label">General Category *</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Select
                            value={field.value}
                            onValueChange={(v) => {
                              field.onChange(v);
                              detailsForm.setValue('specificCat', '', { shouldDirty: true, shouldValidate: true });
                            }}
                          >
                            <SelectTrigger className={cn("h-12 text-[15px] pr-10", fieldState.error && "border-destructive ring-destructive")}>
                              <SelectValue placeholder="Select category" />
                            </SelectTrigger>
                            <SelectContent>
                              {generalCategoryOptions.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                            </SelectContent>
                          </Select>
                          {fieldState.error && <AlertCircle className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-destructive pointer-events-none" />}
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={detailsForm.control}
                  name="specificCat"
                  render={({ field, fieldState }) => (
                    <FormItem className="space-y-2">
                      <FormLabel className="field-label">Specific Category *</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Select value={field.value} onValueChange={field.onChange} disabled={!detailsForm.getValues('generalCat')}>
                            <SelectTrigger className={cn("h-12 text-[15px] pr-10", fieldState.error && "border-destructive ring-destructive")}>
                              <SelectValue placeholder="Select specific" />
                            </SelectTrigger>
                            <SelectContent>
                              {specificCategoryOptions.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                            </SelectContent>
                          </Select>
                          {fieldState.error && <AlertCircle className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-destructive pointer-events-none" />}
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={detailsForm.control}
                  name="interval"
                  render={({ field }) => (
                    <FormItem className="space-y-2">
                      <FormLabel className="field-label">Reporting Interval *</FormLabel>
                      <FormControl>
                        <Select value={field.value} onValueChange={field.onChange}>
                          <SelectTrigger className="h-12 text-[15px]"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="quarterly">Quarterly</SelectItem>
                            <SelectItem value="monthly">Monthly</SelectItem>
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={detailsForm.control}
                  name="expectedUsers"
                  render={({ field, fieldState }) => (
                    <FormItem className="space-y-2">
                      <FormLabel className="field-label">Expected Users *</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input
                            type="number"
                            value={String(field.value ?? '')}
                            onChange={(e) => field.onChange(e.target.value)}
                            placeholder="e.g. 5000"
                            className={cn("h-12 text-[15px] pr-10", fieldState.error && "border-destructive focus-visible:ring-destructive")}
                          />
                          {fieldState.error && <AlertCircle className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-destructive" />}
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={detailsForm.control}
                  name="description"
                  render={({ field, fieldState }) => (
                    <FormItem className="sm:col-span-2 space-y-2">
                      <FormLabel className="field-label">Description *</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Textarea
                            {...field}
                            placeholder="Brief project description..."
                            rows={4}
                            className={cn("text-[15px] pr-10", fieldState.error && "border-destructive focus-visible:ring-destructive")}
                          />
                          {fieldState.error && <AlertCircle className="absolute right-3 top-4 h-4 w-4 text-destructive" />}
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </Form>
          </div>
        )}

        {/* Step 2: Define Structure */}
        {step === 1 && (
          <div className="space-y-5">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h3 className="section-title">Project Structure</h3>
                <p className="text-[13px] text-muted-foreground mt-1">Select strategic objectives, then attach outcomes and indicators</p>
              </div>
              {!!(melLiveObjectives ?? STRATEGIC_OBJECTIVES_DATA).find((s: any) => !strategicObjectives.some(so => so.name === s.id)) && (
                <Select onValueChange={(v) => addStrategicObjective(v)}>
                  <SelectTrigger className="h-10 w-[320px]">
                    <SelectValue placeholder="Add Strategic Objective..." />
                  </SelectTrigger>
                  <SelectContent>
                    {(melLiveObjectives ?? STRATEGIC_OBJECTIVES_DATA)
                      .filter((s: any) => !strategicObjectives.some(so => so.name === s.id))
                      .map((s: any) => (
                      <SelectItem key={s.id} value={s.id} className="text-sm py-2">{s.title ?? s.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            {strategicObjectives.length === 0 && (
              <div className="text-center py-16 border border-dashed border-border rounded-xl">
                <Target className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-[14px] text-muted-foreground font-medium">No strategic objectives yet</p>
                <p className="text-[13px] text-muted-foreground/70 mt-1">Select an objective from the dropdown above to begin</p>
                {step2Submitted && step2FieldErrors.global && (
                  <p className="text-[13px] text-destructive mt-3 font-medium">{step2FieldErrors.global}</p>
                )}
              </div>
            )}

            <div className="space-y-3">
              {strategicObjectives.map((so, si) => (
                <div key={so.uid} className="border border-border rounded-lg overflow-hidden transition-all">
                  {/* SO Header */}
                  <div
                    className="flex items-center gap-2 p-3 cursor-pointer hover:bg-secondary/30 transition-colors"
                    onClick={() => toggleSO(so.uid)}
                  >
                    {so.expanded ? <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform" /> : <ChevronRight className="h-4 w-4 text-muted-foreground transition-transform" />}
                    <Target className="h-4 w-4 text-primary" />
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 font-mono">SO {si + 1}</Badge>
                    <span className="text-sm font-medium flex-1 truncate">{melLiveObjectives?.find(o => o.id === so.name)?.title || STRATEGIC_OBJECTIVES_DATA.find(s => s.id === so.name)?.label || so.name}</span>
                    <span className="text-[10px] text-muted-foreground mr-2">
                      {so.outcomeRows.length} outcome{so.outcomeRows.length !== 1 ? 's' : ''} · {so.outcomeRows.reduce((s, r) => s + r.indicatorIds.length, 0)} indicator{so.outcomeRows.reduce((s, r) => s + r.indicatorIds.length, 0) !== 1 ? 's' : ''}
                    </span>
                    <button onClick={e => { e.stopPropagation(); removeStrategicObjective(so.uid); }} className="text-muted-foreground hover:text-destructive p-1 transition-colors"><Trash2 className="h-3.5 w-3.5" /></button>
                  </div>

                  {/* SO Body */}
                  {so.expanded && (
                    <div className="px-4 pb-4 pt-3 space-y-4 border-t border-border bg-secondary/10">
                      {step2Submitted && step2FieldErrors.bySO?.[so.uid]?.global && (
                        <div className="bg-destructive/6 border border-destructive/15 rounded-lg p-3">
                          <p className="text-[13px] text-destructive flex items-center gap-2">
                            <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                            {step2FieldErrors.bySO?.[so.uid]?.global}
                          </p>
                        </div>
                      )}

                      {/* Outcome Rows */}
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-medium text-muted-foreground">Outcomes & Indicators</span>
                          <Button size="sm" variant="outline" onClick={() => addOutcomeRow(so.uid)} className="h-7 text-xs">
                            <Plus className="h-3 w-3 mr-1" />Add Outcome
                          </Button>
                        </div>

                        {so.outcomeRows.length === 0 && (
                          <div className="text-center py-6 border border-dashed border-border rounded-lg bg-background">
                            <TrendingUp className="h-5 w-5 text-muted-foreground/40 mx-auto mb-1" />
                            <p className="text-xs text-muted-foreground">No outcomes added. Click "Add Outcome" to begin.</p>
                          </div>
                        )}

                        {so.outcomeRows.map((row, ri) => {
                          const usedOutcomeIds = getUsedOutcomeIds(so, row.uid);
                          const availableOutcomes = getOutcomesForSO(so.name);
                          const filteredIndicators = row.outcomeId ? getFilteredIndicators(row.outcomeId, so.name) : [];

                          return (
                            <div key={row.uid} className="border border-border rounded-lg bg-background p-3 space-y-3 ml-4">
                              {/* Outcome selector */}
                              <div className="flex items-start gap-2">
                                <TrendingUp className="h-4 w-4 text-success mt-2 shrink-0" />
                                <div className="flex-1 space-y-1.5">
                                  <div className="flex items-center gap-2">
                                    <Label className="text-xs font-medium">Outcome *</Label>
                                    {row.outcomeId && <Badge variant="secondary" className="text-[10px] px-1.5 py-0 font-mono">{row.outcomeId}</Badge>}
                                  </div>
                                  <Popover>
                                    <PopoverTrigger asChild>
                                      <Button
                                        variant="outline"
                                        role="combobox"
                                        className={cn(
                                          "w-full h-auto min-h-[36px] justify-between text-sm font-normal text-left whitespace-normal py-2",
                                          step2Submitted && step2FieldErrors.bySO?.[so.uid]?.byRow?.[row.uid]?.outcome
                                            ? "border-destructive ring-1 ring-destructive/40"
                                            : ""
                                        )}
                                      >
                                        <span className="flex-1 text-left leading-snug">
                                          {row.outcomeId
                                            ? (melLiveObjectives?.find(o => o.id === so.name)?.outcomes.find(oc => oc.id === row.outcomeId)?.title
                                              || OUTCOMES_DATA.find(o => o.id === row.outcomeId)?.label)
                                            : <span className="text-muted-foreground">Search and select an outcome...</span>}
                                        </span>
                                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                      </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-[600px] p-0" align="start">
                                      <Command>
                                        <CommandInput placeholder="Search outcomes..." />
                                        <CommandList className="max-h-[300px]">
                                          <CommandEmpty>No outcome found.</CommandEmpty>
                                          <CommandGroup>
                                            {availableOutcomes.map(o => {
                                              const isUsed = usedOutcomeIds.includes(o.id);
                                              const isSelected = row.outcomeId === o.id;
                                              return (
                                                <CommandItem
                                                  key={o.id}
                                                  value={o.label}
                                                  disabled={isUsed}
                                                  onSelect={() => {
                                                    if (!isUsed) setOutcomeForRow(so.uid, row.uid, o.id);
                                                  }}
                                                  className="py-3 px-3 cursor-pointer"
                                                >
                                                  <div className="flex items-start gap-3 w-full">
                                                    <div className={`h-4 w-4 rounded border flex items-center justify-center shrink-0 mt-0.5 transition-colors ${
                                                      isSelected ? 'bg-primary border-primary' : 'border-muted-foreground/30'
                                                    }`}>
                                                      {isSelected && <Check className="h-3 w-3 text-primary-foreground" />}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                      <Badge variant="outline" className="text-[10px] px-1.5 py-0 font-mono mb-1">{o.id}</Badge>
                                                      <p className={`text-[13px] leading-snug ${isUsed ? 'text-muted-foreground/50' : 'text-foreground'}`}>
                                                        {o.label.split(' – ')[1]}
                                                      </p>
                                                    </div>
                                                    {isUsed && <span className="text-[10px] text-muted-foreground/50 shrink-0">Already used</span>}
                                                  </div>
                                                </CommandItem>
                                              );
                                            })}
                                          </CommandGroup>
                                        </CommandList>
                                      </Command>
                                    </PopoverContent>
                                  </Popover>
                                  {step2Submitted && step2FieldErrors.bySO?.[so.uid]?.byRow?.[row.uid]?.outcome && (
                                    <p className="text-[12px] text-destructive">
                                      {step2FieldErrors.bySO?.[so.uid]?.byRow?.[row.uid]?.outcome}
                                    </p>
                                  )}
                                </div>
                                <button onClick={() => removeOutcomeRow(so.uid, row.uid)} className="text-muted-foreground hover:text-destructive p-1 mt-1 transition-colors"><Trash2 className="h-3.5 w-3.5" /></button>
                              </div>

                              {/* Indicator selector */}
                              <div className="ml-6 space-y-2">
                                <div className="flex items-center gap-2">
                                  <Gauge className="h-3.5 w-3.5 text-info" />
                                  <Label className="text-xs font-medium">Indicators *</Label>
                                </div>

                                {!row.outcomeId ? (
                                  <div className="text-xs text-muted-foreground bg-muted/50 rounded-md p-3 text-center">
                                    Select an outcome first to view available indicators
                                  </div>
                                ) : (
                                  <div className="space-y-1.5">
                                    {filteredIndicators.map(ind => {
                                      const selected = row.indicatorIds.includes(ind.id);
                                      return (
                                        <div
                                          key={ind.id}
                                          onClick={() => toggleIndicator(so.uid, row.uid, ind.id)}
                                          className={`flex items-center gap-2 p-2 rounded-md cursor-pointer text-xs transition-all ${
                                            selected
                                              ? 'bg-primary/10 border border-primary/30 text-foreground'
                                              : 'bg-muted/30 border border-transparent hover:bg-muted/60 text-muted-foreground'
                                          }`}
                                        >
                                          <div className={`h-4 w-4 rounded border flex items-center justify-center shrink-0 transition-colors ${
                                            selected ? 'bg-primary border-primary' : 'border-muted-foreground/30'
                                          }`}>
                                            {selected && <Check className="h-3 w-3 text-primary-foreground" />}
                                          </div>
                                          <Badge variant="outline" className="text-[9px] px-1 py-0 font-mono shrink-0">{ind.id}</Badge>
                                          <span className="flex-1">{ind.label.split(' – ')[1]}</span>
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}

                                {/* Selected indicator tags */}
                                {row.indicatorIds.length > 0 && (
                                  <div className="flex flex-wrap gap-1 pt-1">
                                    {row.indicatorIds.map(indId => {
                                      const ind = getFilteredIndicators(row.outcomeId, so.name).find(i => i.id === indId) || INDICATORS_DATA.find(i => i.id === indId);
                                      return (
                                        <Badge key={indId} variant="secondary" className="text-[10px] gap-1 pr-1">
                                          <span className="font-mono">{indId}</span>
                                          <button onClick={() => removeIndicator(so.uid, row.uid, indId)} className="hover:text-destructive transition-colors"><Trash2 className="h-2.5 w-2.5" /></button>
                                        </Badge>
                                      );
                                    })}
                                  </div>
                                )}

                                {step2Submitted && step2FieldErrors.bySO?.[so.uid]?.byRow?.[row.uid]?.indicators && (
                                  <p className="text-[12px] text-destructive">
                                    {step2FieldErrors.bySO?.[so.uid]?.byRow?.[row.uid]?.indicators}
                                  </p>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Step 4: Confirm */}
        {step === 2 && (
          <div className="space-y-5">
            <h3 className="section-title">Confirmation Summary</h3>
            <div className="space-y-4">
              <div className="bg-secondary/40 rounded-xl p-5 space-y-3">
                <div className="flex justify-between py-1"><span className="text-[13px] text-muted-foreground">Project Name</span><span className="text-[14px] font-medium">{name}</span></div>
                <div className="border-t border-border" />
                <div className="flex justify-between py-1"><span className="text-[13px] text-muted-foreground">Category</span><span className="text-[14px]">{generalCat} / {specificCat}</span></div>
                <div className="border-t border-border" />
                <div className="flex justify-between py-1"><span className="text-[13px] text-muted-foreground">Period</span><span className="text-[14px]">{startDate} → {endDate}</span></div>
                <div className="border-t border-border" />
                <div className="flex justify-between py-1"><span className="text-[13px] text-muted-foreground">Interval</span><span className="text-[14px] capitalize">{interval}</span></div>
                <div className="border-t border-border" />
                <div className="flex justify-between py-1"><span className="text-[13px] text-muted-foreground">Expected Users</span><span className="text-[14px]">{expectedUsers}</span></div>
                <div className="border-t border-border" />
                <div className="flex justify-between py-1">
                  <span className="text-[13px] text-muted-foreground">Project Lead(s)</span>
                  <span className="text-[14px] font-medium">
                    {(selectedLeads.length > 0
                      ? selectedLeads
                          .map(id => projectLeads.find(l => l.id === id)?.name)
                          .filter(Boolean)
                          .join(', ')
                      : '—')}
                  </span>
                </div>
              </div>
              <div className="bg-secondary/40 rounded-xl p-5 space-y-3">
                <p className="text-[13px] font-semibold">
                  Structure: {strategicObjectives.length} Strategic Objective{strategicObjectives.length !== 1 ? 's' : ''} · {strategicObjectives.reduce((s, so) => s + so.outcomeRows.length, 0)} Outcomes · {strategicObjectives.reduce((s, so) => s + so.outcomeRows.reduce((ss, r) => ss + r.indicatorIds.length, 0), 0)} Indicators
                </p>
                {strategicObjectives.map((so, i) => (
                  <div key={so.uid} className="text-[13px] text-muted-foreground space-y-1.5">
                    <p className="font-medium text-foreground">SO {i + 1}: {melLiveObjectives?.find(o => o.id === so.name)?.title || STRATEGIC_OBJECTIVES_DATA.find(s => s.id === so.name)?.label || so.name}</p>
                    {so.outcomeRows.map(row => {
                      const outcomeLive = melLiveObjectives?.find(o => o.id === so.name)?.outcomes.find(oc => oc.id === row.outcomeId) || null;
                      const outcome = OUTCOMES_DATA.find(o => o.id === row.outcomeId);
                      return (
                        <div key={row.uid} className="ml-4 space-y-1">
                          <p>↳ {outcomeLive?.title || (outcome?.label || row.outcomeId)}</p>
                          {row.indicatorIds.map(indId => {
                            const indLive = outcomeLive?.indicators.find(ii => ii.code === indId) || null;
                            const ind = INDICATORS_DATA.find(ii => ii.id === indId);
                            return <p key={indId} className="ml-5 text-muted-foreground/80">• {indLive ? `${indLive.code} – ${indLive.title}` : (ind?.label || indId)}</p>;
                          })}
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
              <div className="bg-info/6 border border-info/15 rounded-xl p-4 flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-info mt-0.5 shrink-0" />
                <div>
                  <p className="text-[13px] font-medium">Email Notification</p>
                  <p className="text-[13px] text-muted-foreground mt-0.5">
                    An assignment email will be sent to{' '}
                    {selectedLeads
                      .map(id => projectLeads.find(l => l.id === id)?.email)
                      .filter(Boolean)
                      .join(', ')}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="flex justify-between mt-8">
        <Button variant="outline" className="h-11 px-6" onClick={() => step > 0 ? setStep(s => s - 1) : navigate('/admin')} >
          {step === 0 ? 'Cancel' : 'Back'}
        </Button>
        {step < 2 ? (
          <Button className="h-11 px-6" onClick={handleNext}>Continue</Button>
        ) : (
          <Button className="h-11 px-6" disabled={saving} onClick={handleSave}>
            {saving ? 'Creating…' : 'Create Project & Notify'}
          </Button>
        )}
      </div>
    </div>
  );
}

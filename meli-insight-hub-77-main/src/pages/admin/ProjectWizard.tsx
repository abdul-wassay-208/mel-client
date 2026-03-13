import { useEffect, useState } from 'react';
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
import { apiGetUsers, apiCreateUser, ApiUserRecord, apiCreateProject } from '@/lib/api';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';

const steps = ['Project Details', 'Define Structure', 'Assign Lead', 'Confirm & Save'];

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

  // Step 1 state
  const [name, setName] = useState('');
  const [programLead, setProgramLead] = useState('');
  const [projectSupport, setProjectSupport] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [generalCat, setGeneralCat] = useState('');
  const [specificCat, setSpecificCat] = useState('');
  const [description, setDescription] = useState('');
  const [interval, setInterval] = useState<'quarterly' | 'monthly'>('quarterly');
  const [expectedUsers, setExpectedUsers] = useState('');
  const [step1Errors, setStep1Errors] = useState<string[]>([]);

  // Step 2 state
  const [strategicObjectives, setStrategicObjectives] = useState<StrategicObjective[]>([]);
  const [step2Errors, setStep2Errors] = useState<string[]>([]);

  // Step 3 state
  const [selectedLead, setSelectedLead] = useState('');
  const [projectLeads, setProjectLeads] = useState<{ id: string; name: string; email: string }[]>([]);
  const [leadDialogOpen, setLeadDialogOpen] = useState(false);
  const [newLeadName, setNewLeadName] = useState('');
  const [newLeadEmail, setNewLeadEmail] = useState('');
  const [creatingLead, setCreatingLead] = useState(false);

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

  const validateStep1 = () => {
    const errors: string[] = [];
    if (!name.trim()) errors.push('Project name is required');
    if (!programLead.trim()) errors.push('Program lead is required');
    if (!startDate) errors.push('Start date is required');
    if (!endDate) errors.push('End date is required');
    if (startDate && endDate && new Date(startDate) >= new Date(endDate)) errors.push('End date must be after start date');
    if (!generalCat) errors.push('General category is required');
    if (!specificCat) errors.push('Specific category is required');
    if (!description.trim()) errors.push('Description is required');
    if (!expectedUsers || parseInt(expectedUsers) <= 0) errors.push('Expected users must be a positive number');
    setStep1Errors(errors);
    return errors.length === 0;
  };

  const validateStep2 = () => {
    const errors: string[] = [];
    if (strategicObjectives.length === 0) {
      errors.push('At least 1 Strategic Objective is required');
      setStep2Errors(errors);
      return false;
    }
    for (let si = 0; si < strategicObjectives.length; si++) {
      const so = strategicObjectives[si];
      if (!so.name) errors.push(`Strategic Objective ${si + 1}: Objective must be selected`);
      if (so.outcomeRows.length === 0) {
        const soData = STRATEGIC_OBJECTIVES_DATA.find(s => s.id === so.name);
        errors.push(`"${soData?.label || `Objective ${si + 1}`}": At least 1 Outcome is required`);
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
          if (!row.outcomeId) errors.push(`Objective ${si + 1}, Row ${ri + 1}: Outcome must be selected`);
          if (row.indicatorIds.length === 0) {
            errors.push(`Objective ${si + 1}, Outcome ${row.outcomeId || ri + 1}: At least 1 Indicator is required`);
          }
          const dupInds = row.indicatorIds.filter((id, i) => row.indicatorIds.indexOf(id) !== i);
          if (dupInds.length > 0) {
            errors.push(`Objective ${si + 1}, Outcome ${row.outcomeId}: Duplicate indicators not allowed`);
          }
        }
      }
    }
    setStep2Errors(errors);
    return errors.length === 0;
  };

  const handleNext = () => {
    if (step === 0 && !validateStep1()) return;
    if (step === 1 && !validateStep2()) return;
    if (step === 2 && !selectedLead) return;
    setStep(s => Math.min(s + 1, 3));
  };

  // Convert Step 2 data to Objective[] for saving
  const buildObjectives = (): Objective[] => {
    return strategicObjectives.map(so => {
      const soData = STRATEGIC_OBJECTIVES_DATA.find(s => s.id === so.name);
      return {
        id: so.uid,
        name: soData?.label || so.name,
        description: '',
        outcomes: so.outcomeRows.filter(r => r.outcomeId).map(row => {
        const outcomeData = OUTCOMES_DATA.find(o => o.id === row.outcomeId);
        return {
          id: `out_${row.uid}`,
          name: outcomeData?.label || row.outcomeId,
          description: '',
          objectiveId: so.uid,
          indicators: row.indicatorIds.map(indId => {
            const indData = INDICATORS_DATA.find(i => i.id === indId);
            return {
              id: `ind_${indId}_${row.uid}`,
              name: indData?.label || indId,
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
    try {
      const created = await apiCreateProject({
        name,
        description,
        category: generalCat,
        programLead,
        projectSupport,
        generalCategory: generalCat,
        specificCategory: specificCat,
        expectedUsers: parseInt(expectedUsers) || 0,
        startDate,
        endDate,
        reportingInterval: interval,
        leadId: selectedLead ? Number(selectedLead) : null,
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

      // Add to local state immediately; AppContext will also load from backend on refresh.
      addProject({
        id: String(created.id),
        name: created.name,
        projectLeadId: created.leadId != null ? String(created.leadId) : '',
        programLead: created.programLead ?? '',
        projectSupport: created.projectSupport ?? '',
        startDate,
        endDate,
        generalCategory: created.generalCategory ?? generalCat,
        specificCategory: created.specificCategory ?? specificCat,
        description: created.description ?? description,
        reportingInterval: created.reportingInterval === 'MONTHLY' ? 'monthly' : 'quarterly',
        expectedUsers: created.expectedUsers ?? (parseInt(expectedUsers) || 0),
        objectives,
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
    }
  };

  // ── Step 2 helpers ──

  const addStrategicObjective = (soId: string) => {
    const soData = STRATEGIC_OBJECTIVES_DATA.find(s => s.id === soId);
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
    const soData = STRATEGIC_OBJECTIVES_DATA.find(s => s.id === soName);
    if (!soData) return OUTCOMES_DATA;
    return OUTCOMES_DATA.filter(o => o.id.startsWith(soData.prefix + '.'));
  };

  const getFilteredIndicators = (outcomeId: string) => {
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
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div className="sm:col-span-2 space-y-2">
                <Label className="field-label">Project Name *</Label>
                <Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Digital Infrastructure Assessment" className="h-12 text-[15px]" />
              </div>
              <div className="space-y-2">
                <Label className="field-label">Program Lead *</Label>
                <Input value={programLead} onChange={e => setProgramLead(e.target.value)} placeholder="e.g. Dr. Ahmed Hassan" className="h-12 text-[15px]" />
              </div>
              <div className="space-y-2">
                <Label className="field-label">Project Support</Label>
                <Input value={projectSupport} onChange={e => setProjectSupport(e.target.value)} placeholder="e.g. Technical Support Unit" className="h-12 text-[15px]" />
              </div>
              <div className="space-y-2">
                <Label className="field-label">Start Date *</Label>
                <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="h-12 text-[15px]" />
              </div>
              <div className="space-y-2">
                <Label className="field-label">End Date *</Label>
                <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="h-12 text-[15px]" />
              </div>
              <div className="space-y-2">
                <Label className="field-label">General Category *</Label>
                <Select value={generalCat} onValueChange={v => { setGeneralCat(v); setSpecificCat(''); }}>
                  <SelectTrigger className="h-12 text-[15px]"><SelectValue placeholder="Select category" /></SelectTrigger>
                  <SelectContent>{GENERAL_CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="field-label">Specific Category *</Label>
                <Select value={specificCat} onValueChange={setSpecificCat} disabled={!generalCat}>
                  <SelectTrigger className="h-12 text-[15px]"><SelectValue placeholder="Select specific" /></SelectTrigger>
                  <SelectContent>{(SPECIFIC_CATEGORIES[generalCat] || []).map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="field-label">Reporting Interval *</Label>
                <Select value={interval} onValueChange={v => setInterval(v as 'quarterly' | 'monthly')}>
                  <SelectTrigger className="h-12 text-[15px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="quarterly">Quarterly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="field-label">Expected Users *</Label>
                <Input type="number" value={expectedUsers} onChange={e => setExpectedUsers(e.target.value)} placeholder="e.g. 5000" className="h-12 text-[15px]" />
              </div>
              <div className="sm:col-span-2 space-y-2">
                <Label className="field-label">Description *</Label>
                <Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Brief project description..." rows={4} className="text-[15px]" />
              </div>
            </div>
            {step1Errors.length > 0 && (
              <div className="bg-destructive/6 border border-destructive/15 rounded-xl p-4 space-y-1.5">
                {step1Errors.map((e, i) => <p key={i} className="text-[13px] text-destructive flex items-center gap-2"><AlertCircle className="h-3.5 w-3.5 shrink-0" />{e}</p>)}
              </div>
            )}
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
              {strategicObjectives.length < 3 && (
                <Select onValueChange={(v) => addStrategicObjective(v)}>
                  <SelectTrigger className="h-10 w-[320px]">
                    <SelectValue placeholder="Add Strategic Objective..." />
                  </SelectTrigger>
                  <SelectContent>
                    {STRATEGIC_OBJECTIVES_DATA.filter(s => !strategicObjectives.some(so => so.name === s.id)).map(s => (
                      <SelectItem key={s.id} value={s.id} className="text-sm py-2">{s.label}</SelectItem>
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
                    <span className="text-sm font-medium flex-1 truncate">{STRATEGIC_OBJECTIVES_DATA.find(s => s.id === so.name)?.label || so.name}</span>
                    <span className="text-[10px] text-muted-foreground mr-2">
                      {so.outcomeRows.length} outcome{so.outcomeRows.length !== 1 ? 's' : ''} · {so.outcomeRows.reduce((s, r) => s + r.indicatorIds.length, 0)} indicator{so.outcomeRows.reduce((s, r) => s + r.indicatorIds.length, 0) !== 1 ? 's' : ''}
                    </span>
                    <button onClick={e => { e.stopPropagation(); removeStrategicObjective(so.uid); }} className="text-muted-foreground hover:text-destructive p-1 transition-colors"><Trash2 className="h-3.5 w-3.5" /></button>
                  </div>

                  {/* SO Body */}
                  {so.expanded && (
                    <div className="px-4 pb-4 pt-3 space-y-4 border-t border-border bg-secondary/10">

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
                          const filteredIndicators = row.outcomeId ? getFilteredIndicators(row.outcomeId) : [];

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
                                        className="w-full h-auto min-h-[36px] justify-between text-sm font-normal text-left whitespace-normal py-2"
                                      >
                                        <span className="flex-1 text-left leading-snug">
                                          {row.outcomeId
                                            ? OUTCOMES_DATA.find(o => o.id === row.outcomeId)?.label
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
                                      const ind = INDICATORS_DATA.find(i => i.id === indId);
                                      return (
                                        <Badge key={indId} variant="secondary" className="text-[10px] gap-1 pr-1">
                                          <span className="font-mono">{indId}</span>
                                          <button onClick={() => removeIndicator(so.uid, row.uid, indId)} className="hover:text-destructive transition-colors"><Trash2 className="h-2.5 w-2.5" /></button>
                                        </Badge>
                                      );
                                    })}
                                  </div>
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

            {step2Errors.length > 0 && (
              <div className="bg-destructive/6 border border-destructive/15 rounded-xl p-4 space-y-1.5">
                {step2Errors.map((e, i) => <p key={i} className="text-[13px] text-destructive flex items-center gap-2"><AlertCircle className="h-3.5 w-3.5 shrink-0" />{e}</p>)}
              </div>
            )}
          </div>
        )}

        {/* Step 3: Assign Lead */}
        {step === 2 && (
          <div className="space-y-5">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h3 className="section-title">Assign Project Lead</h3>
                <p className="text-[13px] text-muted-foreground mt-1">Select the primary reporting owner for this project</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="h-9 text-[13px]"
                onClick={() => {
                  setNewLeadName('');
                  setNewLeadEmail('');
                  setLeadDialogOpen(true);
                }}
              >
                <Plus className="h-3.5 w-3.5 mr-1" />
                Add New Lead
              </Button>
            </div>
            <div className="space-y-3">
              {projectLeads.map(lead => (
                <div
                  key={lead.id}
                  onClick={() => setSelectedLead(lead.id)}
                  className={`p-5 border rounded-xl cursor-pointer transition-all duration-200 ${
                    selectedLead === lead.id
                      ? 'border-primary bg-primary/5 ring-1 ring-primary shadow-sm'
                      : 'border-border hover:border-primary/30 hover:shadow-sm'
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div className="h-11 w-11 rounded-full bg-primary/10 flex items-center justify-center text-primary text-[14px] font-semibold">
                      {lead.name.split(' ').map(n => n[0]).join('')}
                    </div>
                    <div>
                      <p className="text-[15px] font-medium">{lead.name}</p>
                      <p className="text-[13px] text-muted-foreground">{lead.email}</p>
                    </div>
                    {selectedLead === lead.id && <Check className="h-5 w-5 text-primary ml-auto" />}
                  </div>
                </div>
              ))}
            </div>
            {!selectedLead && <p className="text-[13px] text-muted-foreground">* Selection is mandatory</p>}

            <Dialog open={leadDialogOpen} onOpenChange={setLeadDialogOpen}>
              <DialogContent className="sm:max-w-[420px] rounded-2xl">
                <DialogHeader>
                  <DialogTitle className="text-lg font-semibold">Add New Project Lead</DialogTitle>
                  <DialogDescription className="text-[13px]">
                    Create a new user with the Project Lead role. An invitation email will be sent automatically.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-2">
                  <div className="space-y-1.5">
                    <Label className="field-label">Full Name</Label>
                    <Input
                      value={newLeadName}
                      onChange={(e) => setNewLeadName(e.target.value)}
                      placeholder="e.g. James Wilson"
                      className="h-10 text-[14px]"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="field-label">Email Address</Label>
                    <Input
                      type="email"
                      value={newLeadEmail}
                      onChange={(e) => setNewLeadEmail(e.target.value)}
                      placeholder="lead@example.org"
                      className="h-10 text-[14px]"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" className="h-10" onClick={() => setLeadDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button
                    className="h-10"
                    disabled={creatingLead}
                    onClick={async () => {
                      if (!newLeadName.trim() || !newLeadEmail.trim()) {
                        toast({ title: 'Name and email are required', variant: 'destructive' });
                        return;
                      }
                      setCreatingLead(true);
                      try {
                        const created = await apiCreateUser({
                          name: newLeadName.trim(),
                          email: newLeadEmail.trim().toLowerCase(),
                          role: "PROJECT_LEAD",
                        });
                        const mapped = {
                          id: String(created.id),
                          name: created.name,
                          email: created.email,
                        };
                        setProjectLeads((prev) => [mapped, ...prev]);
                        setSelectedLead(mapped.id);
                        toast({
                          title: 'Project Lead created',
                          description: `An invitation was sent to ${mapped.email}.`,
                        });
                        setLeadDialogOpen(false);
                      } catch (err: any) {
                        console.error(err);
                        toast({
                          title: 'Failed to create lead',
                          description: err?.message || 'Unknown error',
                          variant: 'destructive',
                        });
                      } finally {
                        setCreatingLead(false);
                      }
                    }}
                  >
                    {creatingLead ? 'Creating...' : 'Create & Invite'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        )}

        {/* Step 4: Confirm */}
        {step === 3 && (
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
                <div className="flex justify-between py-1"><span className="text-[13px] text-muted-foreground">Project Lead</span><span className="text-[14px] font-medium">{projectLeads.find(l => l.id === selectedLead)?.name}</span></div>
              </div>
              <div className="bg-secondary/40 rounded-xl p-5 space-y-3">
                <p className="text-[13px] font-semibold">
                  Structure: {strategicObjectives.length} Strategic Objective{strategicObjectives.length !== 1 ? 's' : ''} · {strategicObjectives.reduce((s, so) => s + so.outcomeRows.length, 0)} Outcomes · {strategicObjectives.reduce((s, so) => s + so.outcomeRows.reduce((ss, r) => ss + r.indicatorIds.length, 0), 0)} Indicators
                </p>
                {strategicObjectives.map((so, i) => (
                  <div key={so.uid} className="text-[13px] text-muted-foreground space-y-1.5">
                    <p className="font-medium text-foreground">SO {i + 1}: {STRATEGIC_OBJECTIVES_DATA.find(s => s.id === so.name)?.label || so.name}</p>
                    {so.outcomeRows.map(row => {
                      const outcome = OUTCOMES_DATA.find(o => o.id === row.outcomeId);
                      return (
                        <div key={row.uid} className="ml-4 space-y-1">
                          <p>↳ {outcome?.label || row.outcomeId}</p>
                          {row.indicatorIds.map(indId => {
                            const ind = INDICATORS_DATA.find(i => i.id === indId);
                            return <p key={indId} className="ml-5 text-muted-foreground/80">• {ind?.label || indId}</p>;
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
                  <p className="text-[13px] text-muted-foreground mt-0.5">An assignment email will be sent to {projectLeads.find(l => l.id === selectedLead)?.email}</p>
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
        {step < 3 ? (
          <Button className="h-11 px-6" onClick={handleNext}>Continue</Button>
        ) : (
          <Button className="h-11 px-6" onClick={handleSave}>Create Project & Notify</Button>
        )}
      </div>
    </div>
  );
}

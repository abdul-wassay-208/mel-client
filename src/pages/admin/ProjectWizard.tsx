import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '@/contexts/AppContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Objective, GENERAL_CATEGORIES, SPECIFIC_CATEGORIES } from '@/types';
import { Check, ChevronRight, Plus, ChevronDown, Target, TrendingUp, Gauge, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { apiGetUsers, apiCreateUser, ApiUserRecord, apiCreateProject, apiGetConfig, apiGetObjectives, type ProjectCategoriesConfig, type ApiObjective } from '@/lib/api';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { cn } from '@/lib/utils';

const steps = ['Project Details', 'Define Structure', 'Confirm & Save'];

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
  const [dbObjectives, setDbObjectives] = useState<ApiObjective[]>([]);
  const [selectedObjectiveIds, setSelectedObjectiveIds] = useState<number[]>([]);
  const [expandedObjectiveIds, setExpandedObjectiveIds] = useState<number[]>([]);
  const [step2Submitted, setStep2Submitted] = useState(false);
  const [step2Error, setStep2Error] = useState<string | null>(null);

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
        const objectives = await apiGetObjectives();
        if (!alive) return;
        setDbObjectives(objectives);
      } catch {
        if (!alive) return;
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
    if (selectedObjectiveIds.length === 0) {
      setStep2Error('At least 1 Strategic Objective is required');
      return false;
    }
    setStep2Error(null);
    return true;
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

  const toggleObjective = (id: number) => {
    setSelectedObjectiveIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
    if (step2Submitted) setStep2Error(null);
  };

  const toggleExpand = (id: number) => {
    setExpandedObjectiveIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleSave = async () => {
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
        objectiveIds: selectedObjectiveIds,
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
        objectives: mappedObjectives,
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
            <div>
              <h3 className="section-title">Project Structure</h3>
              <p className="text-[13px] text-muted-foreground mt-1">Select the strategic objectives that apply to this project</p>
            </div>

            {dbObjectives.length === 0 && (
              <div className="text-center py-16 border border-dashed border-border rounded-xl">
                <Target className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-[14px] text-muted-foreground font-medium">Loading objectives...</p>
              </div>
            )}

            {step2Submitted && step2Error && (
              <p className="text-[13px] text-destructive font-medium flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" />{step2Error}
              </p>
            )}

            <div className="space-y-3">
              {dbObjectives.map((obj, idx) => {
                const isSelected = selectedObjectiveIds.includes(obj.id);
                const isExpanded = expandedObjectiveIds.includes(obj.id);
                return (
                  <div key={obj.id} className={`border rounded-lg overflow-hidden transition-all ${isSelected ? 'border-primary/40 bg-primary/5' : 'border-border'}`}>
                    <div className="flex items-center gap-3 p-4">
                      <button
                        type="button"
                        onClick={() => toggleObjective(obj.id)}
                        className={`h-5 w-5 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${
                          isSelected ? 'bg-primary border-primary' : 'border-muted-foreground/40 hover:border-primary/60'
                        }`}
                      >
                        {isSelected && <Check className="h-3 w-3 text-primary-foreground" />}
                      </button>
                      <Target className={`h-4 w-4 shrink-0 ${isSelected ? 'text-primary' : 'text-muted-foreground'}`} />
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0 font-mono shrink-0">SO {idx + 1}</Badge>
                      <span
                        className={`text-[14px] font-medium flex-1 cursor-pointer ${isSelected ? 'text-foreground' : 'text-muted-foreground'}`}
                        onClick={() => toggleObjective(obj.id)}
                      >
                        {obj.title}
                      </span>
                      <button
                        type="button"
                        onClick={() => toggleExpand(obj.id)}
                        className="text-muted-foreground hover:text-foreground p-1 transition-colors"
                      >
                        {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                      </button>
                    </div>

                    {isExpanded && (
                      <div className="border-t border-border bg-secondary/10 px-4 pb-4 pt-3 space-y-2">
                        {(obj.outcomes ?? []).map(out => (
                          <div key={out.id} className="ml-4 space-y-1">
                            <div className="flex items-center gap-2">
                              <TrendingUp className="h-3.5 w-3.5 text-success shrink-0" />
                              <span className="text-[13px] text-foreground">{out.title}</span>
                            </div>
                            {(out.indicators ?? []).map(ind => (
                              <div key={ind.id} className="ml-7 flex items-center gap-2">
                                <Gauge className="h-3 w-3 text-info shrink-0" />
                                <span className="text-[12px] text-muted-foreground">{ind.name}</span>
                              </div>
                            ))}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Step 3: Confirm */}
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
                  {selectedObjectiveIds.length} Strategic Objective{selectedObjectiveIds.length !== 1 ? 's' : ''} selected
                </p>
                {dbObjectives
                  .filter(obj => selectedObjectiveIds.includes(obj.id))
                  .map((obj, i) => (
                    <div key={obj.id} className="text-[13px] text-muted-foreground space-y-1.5">
                      <p className="font-medium text-foreground flex items-center gap-2">
                        <Target className="h-3.5 w-3.5 text-primary shrink-0" />
                        SO {i + 1}: {obj.title}
                      </p>
                      {(obj.outcomes ?? []).map(out => (
                        <div key={out.id} className="ml-5 space-y-1">
                          <p className="flex items-center gap-1.5">
                            <TrendingUp className="h-3 w-3 text-success shrink-0" />
                            {out.title}
                          </p>
                          {(out.indicators ?? []).map(ind => (
                            <p key={ind.id} className="ml-5 text-muted-foreground/80">• {ind.name}</p>
                          ))}
                        </div>
                      ))}
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

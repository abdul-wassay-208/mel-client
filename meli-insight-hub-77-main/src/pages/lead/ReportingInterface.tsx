import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useApp } from '@/contexts/AppContext';
import { useAuth } from '@/contexts/AuthContext';
import { StatusBadge } from '@/components/StatusBadge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { DisaggregatedData, emptyDisaggregatedData } from '@/types';
import { getIndicatorConfig, getRequiredFields, IndicatorFieldConfig } from '@/config/indicatorFieldMappings';
import { Target, TrendingUp, Gauge, ChevronDown, ChevronRight, Check, AlertCircle, Send, FileEdit, ArrowLeft, Save } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

function DynamicField({
  field,
  value,
  onChange,
  disabled,
  hasError,
}: {
  field: IndicatorFieldConfig;
  value: string | number;
  onChange: (val: string | number) => void;
  disabled: boolean;
  hasError: boolean;
}) {
  const errorClass = hasError ? 'border-destructive' : '';

  if (field.type === 'dropdown' && field.options) {
    return (
      <div className="space-y-2">
        <Label className={`field-label ${hasError ? 'text-destructive' : ''}`}>
          {field.label} {field.required && '*'}
        </Label>
        <Select value={value as string || ''} onValueChange={v => onChange(v)} disabled={disabled}>
          <SelectTrigger className={`h-11 text-[14px] ${errorClass}`}>
            <SelectValue placeholder={`Select ${field.label.toLowerCase()}`} />
          </SelectTrigger>
          <SelectContent>
            {field.options.map(o => (
              <SelectItem key={o} value={o}>{o}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    );
  }

  if (field.type === 'number') {
    return (
      <div className="space-y-2">
        <Label className={`field-label ${hasError ? 'text-destructive' : ''}`}>
          {field.label} {field.required && '*'}
        </Label>
        <Input
          type="number"
          value={value || 0}
          onChange={e => onChange(parseInt(e.target.value) || 0)}
          className={`h-11 text-[14px] ${errorClass}`}
          disabled={disabled}
        />
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <Label className={`field-label ${hasError ? 'text-destructive' : ''}`}>
        {field.label} {field.required && '*'}
      </Label>
      <Input
        value={value as string || ''}
        onChange={e => onChange(e.target.value)}
        className={`h-11 text-[14px] ${errorClass}`}
        disabled={disabled}
      />
    </div>
  );
}

export default function ReportingInterface() {
  const { projectId, reportId } = useParams<{ projectId: string; reportId: string }>();
  const { getProjectById, updateReportData, publishReport, republishReport, requestEdit } = useApp();
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const project = getProjectById(projectId!);
  const report = project?.reports.find(r => r.id === reportId);

  const [data, setData] = useState<DisaggregatedData[]>(() => {
    if (!report || !project) return [];
    const allIndicators = project.objectives.flatMap(o => o.outcomes.flatMap(ou => ou.indicators));
    return allIndicators.map(ind => {
      const existing = report.data.find(d => d.indicatorId === ind.id);
      return existing || emptyDisaggregatedData(ind.id);
    });
  });

  const [expandedObj, setExpandedObj] = useState<Set<string>>(new Set(project?.objectives.map(o => o.id) || []));
  const [expandedOut, setExpandedOut] = useState<Set<string>>(new Set(project?.objectives.flatMap(o => o.outcomes.map(ou => ou.id)) || []));
  const [activeIndicator, setActiveIndicator] = useState<string | null>(null);
  const [showPublishDialog, setShowPublishDialog] = useState(false);
  const [showEditRequestDialog, setShowEditRequestDialog] = useState(false);
  const [editRequestIndicator, setEditRequestIndicator] = useState('');
  const [editRequestFields, setEditRequestFields] = useState<string[]>([]);
  const [editRequestReason, setEditRequestReason] = useState('');
  const [validationErrors, setValidationErrors] = useState<Record<string, string[]>>({});

  if (!project || !report) return <div className="p-6">Project or report not found</div>;

  const canEdit = report.state === 'draft' || report.state === 'unlocked';
  const canPublish = report.state === 'draft' || report.state === 'unlocked';
  const canRequestEdit = report.state === 'published' || report.state === 're_published';

  const updateField = (indicatorId: string, field: keyof DisaggregatedData, value: string | number) => {
    setData(prev => prev.map(d => d.indicatorId === indicatorId ? { ...d, [field]: value } : d));
  };

  const allIndicators = project.objectives.flatMap(o => o.outcomes.flatMap(ou => ou.indicators));

  const validateAll = (): boolean => {
    const errors: Record<string, string[]> = {};
    data.forEach(d => {
      const indicator = allIndicators.find(i => i.id === d.indicatorId);
      const config = getIndicatorConfig(d.indicatorId, indicator?.name);
      if (!config) return; // No config → no validation needed
      const requiredKeys = getRequiredFields(config);
      const missing = requiredKeys.filter(key => {
        const val = (d as any)[key];
        return val === undefined || val === '' || val === null;
      });
      if (missing.length > 0) {
        errors[d.indicatorId] = missing.map(f => {
          const fieldCfg = config.fields.find(fc => fc.key === f);
          return `${fieldCfg?.label || f} is required`;
        });
      }
    });
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handlePublish = () => {
    if (!validateAll()) {
      toast({ title: 'Validation Error', description: 'Please complete all required fields.', variant: 'destructive' });
      return;
    }
    updateReportData(project.id, report.id, data);
    if (report.state === 'unlocked') {
      republishReport(project.id, report.id, user!.id);
    } else {
      publishReport(project.id, report.id, user!.id);
    }
    setShowPublishDialog(false);
    toast({ title: 'Report Published', description: 'Your report has been published successfully.' });
    navigate('/lead');
  };

  const handleEditRequest = () => {
    if (!editRequestIndicator || editRequestFields.length === 0 || !editRequestReason.trim()) return;
    const indicator = allIndicators.find(i => i.id === editRequestIndicator);
    requestEdit({
      projectId: project.id, reportId: report.id, indicatorId: editRequestIndicator,
      indicatorName: indicator?.name || '', fieldsToEdit: editRequestFields, reason: editRequestReason,
      requestedBy: user!.id, requestedByName: user!.name, projectName: project.name,
    });
    setShowEditRequestDialog(false);
    setEditRequestIndicator(''); setEditRequestFields([]); setEditRequestReason('');
    toast({ title: 'Edit Request Submitted', description: 'Your request has been sent to the admin for approval.' });
  };

  const handleSaveDraft = () => {
    updateReportData(project.id, report.id, data);
    toast({ title: 'Draft Saved', description: 'Your data has been saved.' });
  };

  const toggleField = (field: string) => {
    setEditRequestFields(prev => prev.includes(field) ? prev.filter(f => f !== field) : [...prev, field]);
  };

  const getFieldsForIndicator = (indicatorId: string, indicatorName: string) => {
    const config = getIndicatorConfig(indicatorId, indicatorName);
    return config;
  };

  const getFilledCount = (indicatorId: string, indicatorName: string) => {
    const config = getFieldsForIndicator(indicatorId, indicatorName);
    if (!config) return { filled: 0, total: 0 };
    const indData = data.find(d => d.indicatorId === indicatorId);
    if (!indData) return { filled: 0, total: config.fields.length };
    const filled = config.fields.filter(f => {
      const val = (indData as any)[f.key];
      return val !== undefined && val !== '' && val !== null && val !== 0;
    }).length;
    return { filled, total: config.fields.length };
  };

  return (
    <div className="page-container space-y-8">
      {/* Header */}
      <div className="animate-in">
        <button onClick={() => navigate('/lead')} className="text-[13px] text-primary hover:text-primary/80 mb-3 flex items-center gap-1.5 transition-colors">
          <ArrowLeft className="h-3.5 w-3.5" /> Back to Dashboard
        </button>
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <h1 className="page-title">{project.name}</h1>
            <div className="flex items-center gap-3 mt-2">
              <span className="text-[14px] text-muted-foreground font-medium">{report.periodLabel} (Cycle {report.cycleNumber})</span>
              <StatusBadge state={report.state} />
            </div>
          </div>
          <div className="flex gap-3">
            {canRequestEdit && (
              <Button variant="outline" className="h-11" onClick={() => setShowEditRequestDialog(true)}>
                <FileEdit className="h-4 w-4 mr-2" />Request Edit
              </Button>
            )}
            {canEdit && (
              <>
                <Button variant="outline" className="h-11" onClick={handleSaveDraft}>
                  <Save className="h-4 w-4 mr-2" />Save Draft
                </Button>
                <Button className="h-11" onClick={() => { if (validateAll()) setShowPublishDialog(true); else toast({ title: 'Incomplete', description: 'Fill all required fields first.', variant: 'destructive' }); }}>
                  <Send className="h-4 w-4 mr-2" />{report.state === 'unlocked' ? 'Re-Publish' : 'Publish'}
                </Button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Structure */}
      <div className="space-y-4 animate-in-delay-1">
        {project.objectives.map((obj, oi) => (
          <div key={obj.id} className="card-elevated overflow-hidden">
            <div
              className="flex items-center gap-3 px-6 py-4 cursor-pointer hover:bg-secondary/30 transition-all duration-150"
              onClick={() => setExpandedObj(prev => { const n = new Set(prev); n.has(obj.id) ? n.delete(obj.id) : n.add(obj.id); return n; })}
            >
              {expandedObj.has(obj.id) ? <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform" /> : <ChevronRight className="h-4 w-4 text-muted-foreground transition-transform" />}
              <Target className="h-4.5 w-4.5 text-primary" />
              <span className="text-[12px] font-semibold text-muted-foreground uppercase tracking-wider">Objective {oi + 1}</span>
              <span className="text-[15px] font-medium flex-1">{obj.name}</span>
            </div>
            {expandedObj.has(obj.id) && obj.outcomes.map((out, oui) => (
              <div key={out.id} className="ml-8 border-t border-border">
                <div
                  className="flex items-center gap-3 px-6 py-3.5 cursor-pointer hover:bg-secondary/20 transition-all duration-150"
                  onClick={() => setExpandedOut(prev => { const n = new Set(prev); n.has(out.id) ? n.delete(out.id) : n.add(out.id); return n; })}
                >
                  {expandedOut.has(out.id) ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />}
                  <TrendingUp className="h-4 w-4 text-success" />
                  <span className="text-[12px] font-semibold text-muted-foreground uppercase tracking-wider">Outcome {oui + 1}</span>
                  <span className="text-[14px] flex-1">{out.name}</span>
                </div>
                {expandedOut.has(out.id) && out.indicators.map((ind, ini) => {
                  const hasErrors = validationErrors[ind.id]?.length > 0;
                  const { filled, total } = getFilledCount(ind.id, ind.name);
                  const config = getFieldsForIndicator(ind.id, ind.name);
                  return (
                    <div key={ind.id} className="ml-8 border-t border-border">
                      <div
                        className={`flex items-center gap-3 px-6 py-3.5 cursor-pointer transition-all duration-150 ${activeIndicator === ind.id ? 'bg-primary/5' : 'hover:bg-secondary/20'}`}
                        onClick={() => setActiveIndicator(activeIndicator === ind.id ? null : ind.id)}
                      >
                        <Gauge className={`h-4 w-4 ${hasErrors ? 'text-destructive' : 'text-info'}`} />
                        <span className="text-[12px] font-semibold text-muted-foreground uppercase tracking-wider">Ind {ini + 1}</span>
                        <span className="text-[14px] flex-1">{ind.name}</span>
                        <div className="flex items-center gap-2">
                          {total > 0 && (
                            <div className="flex items-center gap-1.5">
                              <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                                <div
                                  className={`h-full rounded-full transition-all duration-300 ${filled === total ? 'bg-success' : 'bg-primary'}`}
                                  style={{ width: `${(filled / total) * 100}%` }}
                                />
                              </div>
                              <span className={`text-[12px] font-medium ${filled === total ? 'text-success' : 'text-muted-foreground'}`}>
                                {filled}/{total}
                              </span>
                            </div>
                          )}
                          {hasErrors && <AlertCircle className="h-4 w-4 text-destructive" />}
                          {total > 0 && filled === total && <Check className="h-4 w-4 text-success" />}
                        </div>
                      </div>
                      {activeIndicator === ind.id && (
                        <div className="px-6 py-6 bg-secondary/20 border-t border-border">
                          {config ? (
                            <>
                              <p className="text-[14px] font-semibold mb-1">Indicator-Specific Disaggregation</p>
                              <p className="text-[12px] text-muted-foreground mb-4">
                                {config.code} — {config.fields.length} field{config.fields.length !== 1 ? 's' : ''} required
                              </p>
                              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                {config.fields.map(field => {
                                  const indData = data.find(d => d.indicatorId === ind.id);
                                  const val = indData ? (indData as any)[field.key] : '';
                                  const fieldHasError = validationErrors[ind.id]?.some(e => e.toLowerCase().includes(field.label.toLowerCase()));
                                  return (
                                    <DynamicField
                                      key={field.key}
                                      field={field}
                                      value={val}
                                      onChange={v => updateField(ind.id, field.key as keyof DisaggregatedData, v)}
                                      disabled={!canEdit}
                                      hasError={!!fieldHasError}
                                    />
                                  );
                                })}
                              </div>
                            </>
                          ) : (
                            <p className="text-[13px] text-muted-foreground italic">
                              No disaggregation configuration found for this indicator. Contact your administrator.
                            </p>
                          )}
                          {validationErrors[ind.id] && (
                            <div className="mt-4 bg-destructive/8 border border-destructive/15 rounded-xl p-4">
                              {validationErrors[ind.id].map((e, i) => <p key={i} className="text-[13px] text-destructive">{e}</p>)}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        ))}
      </div>

      {/* Publish Dialog */}
      <Dialog open={showPublishDialog} onOpenChange={setShowPublishDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-lg">{report.state === 'unlocked' ? 'Re-Publish Report' : 'Publish Report'}</DialogTitle>
          </DialogHeader>
          <p className="text-[14px] text-muted-foreground">This will lock the report and notify the admin. Are you sure all data is correct?</p>
          <DialogFooter className="gap-3">
            <Button variant="outline" className="h-11" onClick={() => setShowPublishDialog(false)}>Cancel</Button>
            <Button className="h-11" onClick={handlePublish}>{report.state === 'unlocked' ? 'Re-Publish' : 'Publish'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Request Dialog */}
      <Dialog open={showEditRequestDialog} onOpenChange={setShowEditRequestDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-lg">Request Edit</DialogTitle>
          </DialogHeader>
          <div className="space-y-5 py-2">
            <div className="space-y-2">
              <Label className="field-label">Indicator</Label>
              <Select value={editRequestIndicator} onValueChange={v => { setEditRequestIndicator(v); setEditRequestFields([]); }}>
                <SelectTrigger className="h-11"><SelectValue placeholder="Select indicator" /></SelectTrigger>
                <SelectContent>
                  {allIndicators.map(ind => <SelectItem key={ind.id} value={ind.id}>{ind.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            {editRequestIndicator && (() => {
              const ind = allIndicators.find(i => i.id === editRequestIndicator);
              const config = getIndicatorConfig(editRequestIndicator, ind?.name);
              const fieldKeys = config ? config.fields.map(f => f.key) : [];
              return fieldKeys.length > 0 ? (
                <div className="space-y-2">
                  <Label className="field-label">Fields to Edit</Label>
                  <div className="flex flex-wrap gap-2">
                    {fieldKeys.map(f => {
                      const fieldCfg = config?.fields.find(fc => fc.key === f);
                      return (
                        <button
                          key={f}
                          onClick={() => toggleField(f)}
                          className={`text-[13px] px-3 py-1.5 rounded-lg border transition-all duration-150 ${editRequestFields.includes(f) ? 'border-primary bg-primary/8 text-primary font-medium' : 'border-border text-muted-foreground hover:border-primary/30'}`}
                        >
                          {fieldCfg?.label || f}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : null;
            })()}
            <div className="space-y-2">
              <Label className="field-label">Reason</Label>
              <Textarea value={editRequestReason} onChange={e => setEditRequestReason(e.target.value)} placeholder="Explain why this edit is needed..." rows={3} className="text-[14px]" />
            </div>
          </div>
          <DialogFooter className="gap-3">
            <Button variant="outline" className="h-11" onClick={() => setShowEditRequestDialog(false)}>Cancel</Button>
            <Button className="h-11" onClick={handleEditRequest} disabled={!editRequestIndicator || editRequestFields.length === 0 || !editRequestReason.trim()}>Submit Request</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

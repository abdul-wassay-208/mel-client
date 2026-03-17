import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useApp } from '@/contexts/AppContext';
import { useAuth } from '@/contexts/AuthContext';
import { StatusBadge } from '@/components/StatusBadge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { DisaggregatedData, emptyDisaggregatedData } from '@/types';
import { getIndicatorConfig, getRequiredFields } from '@/config/indicatorFieldMappings';
import MultiRowIndicatorForm, { IndicatorEntryRow, validateIndicatorRows } from '@/components/MultiRowIndicatorForm';
import { Target, TrendingUp, Gauge, ChevronDown, ChevronRight, Check, AlertCircle, Send, FileEdit, ArrowLeft, Save } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function ReportingInterface() {
  const { projectId, reportId } = useParams<{ projectId: string; reportId: string }>();
  const { getProjectById, updateReportData, publishReport, republishReport, requestEdit } = useApp();
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const project = getProjectById(projectId!);
  const report = project?.reports.find(r => r.id === reportId);

  const allIndicators = project?.objectives.flatMap(o => o.outcomes.flatMap(ou => ou.indicators)) || [];

  // Multi-row state: indicatorId -> IndicatorEntryRow[]
  const [multiRowData, setMultiRowData] = useState<Record<string, IndicatorEntryRow[]>>(() => {
    if (!report || !project) return {};
    const result: Record<string, IndicatorEntryRow[]> = {};
    allIndicators.forEach(ind => {
      const config = getIndicatorConfig(ind.id, ind.name);
      if (!config) return;
      const existing = report.data.filter(d => d.indicatorId === ind.id);
      if (existing.length > 0) {
        result[ind.id] = existing.map((d, i) => {
          const row: IndicatorEntryRow = { id: `existing-${ind.id}-${i}` };
          config.fields.forEach(f => {
            row[f.key] = (d as any)[f.key] ?? (f.type === 'number' ? 0 : '');
          });
          return row;
        });
      }
    });
    return result;
  });

  const [expandedObj, setExpandedObj] = useState<Set<string>>(new Set(project?.objectives.map(o => o.id) || []));
  const [expandedOut, setExpandedOut] = useState<Set<string>>(new Set(project?.objectives.flatMap(o => o.outcomes.map(ou => ou.id)) || []));
  const [activeIndicator, setActiveIndicator] = useState<string | null>(null);
  const [showPublishDialog, setShowPublishDialog] = useState(false);
  const [showEditRequestDialog, setShowEditRequestDialog] = useState(false);
  const [editRequestIndicator, setEditRequestIndicator] = useState('');
  const [editRequestFields, setEditRequestFields] = useState<string[]>([]);
  const [editRequestReason, setEditRequestReason] = useState('');
  const [multiRowErrors, setMultiRowErrors] = useState<Record<string, Record<string, string[]>>>({});

  if (!project || !report) return <div className="p-6">Project or report not found</div>;

  const canEdit = report.state === 'draft' || report.state === 'unlocked';
  const canPublish = report.state === 'draft' || report.state === 'unlocked';
  const canRequestEdit = report.state === 'published' || report.state === 're_published';

  const updateMultiRows = (indicatorId: string, rows: IndicatorEntryRow[]) => {
    setMultiRowData(prev => ({ ...prev, [indicatorId]: rows }));
  };

  // Convert multi-row data back to DisaggregatedData[] for saving
  const buildSaveData = (): DisaggregatedData[] => {
    const result: DisaggregatedData[] = [];
    allIndicators.forEach(ind => {
      const config = getIndicatorConfig(ind.id, ind.name);
      const rows = multiRowData[ind.id];
      if (config && rows && rows.length > 0) {
        rows.forEach(row => {
          const d = emptyDisaggregatedData(ind.id);
          config.fields.forEach(f => {
            (d as any)[f.key] = row[f.key];
          });
          result.push(d);
        });
      } else {
        result.push(emptyDisaggregatedData(ind.id));
      }
    });
    return result;
  };

  const validateAll = (): boolean => {
    const allErrors: Record<string, Record<string, string[]>> = {};
    let hasError = false;
    allIndicators.forEach(ind => {
      const config = getIndicatorConfig(ind.id, ind.name);
      if (!config) return;
      const rows = multiRowData[ind.id] || [];
      if (rows.length === 0) return;
      const rowErrors = validateIndicatorRows(config, rows);
      if (Object.keys(rowErrors).length > 0) {
        allErrors[ind.id] = rowErrors;
        hasError = true;
      }
    });
    setMultiRowErrors(allErrors);
    return !hasError;
  };

  const handlePublish = () => {
    if (!validateAll()) {
      toast({ title: 'Validation Error', description: 'Please complete all required fields.', variant: 'destructive' });
      return;
    }
    const saveData = buildSaveData();
    updateReportData(project.id, report.id, saveData);
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
    const saveData = buildSaveData();
    updateReportData(project.id, report.id, saveData);
    toast({ title: 'Draft Saved', description: 'Your data has been saved.' });
  };

  const toggleField = (field: string) => {
    setEditRequestFields(prev => prev.includes(field) ? prev.filter(f => f !== field) : [...prev, field]);
  };

  const getFilledCount = (indicatorId: string, indicatorName: string) => {
    const config = getIndicatorConfig(indicatorId, indicatorName);
    if (!config) return { filled: 0, total: 0 };
    const rows = multiRowData[indicatorId] || [];
    if (rows.length === 0) return { filled: 0, total: config.fields.length };
    // Count: all fields filled across first row (simple heuristic for progress)
    const firstRow = rows[0];
    const filled = config.fields.filter(f => {
      const val = firstRow[f.key];
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
              {expandedObj.has(obj.id) ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
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
                  const indicatorErrors = multiRowErrors[ind.id] || {};
                  const hasErrors = Object.keys(indicatorErrors).length > 0;
                  const { filled, total } = getFilledCount(ind.id, ind.name);
                  const config = getIndicatorConfig(ind.id, ind.name);
                  const rows = multiRowData[ind.id] || [];
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
                          {rows.length > 0 && (
                            <span className="text-[11px] font-medium text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                              {rows.length} entr{rows.length === 1 ? 'y' : 'ies'}
                            </span>
                          )}
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
                            <MultiRowIndicatorForm
                              config={config}
                              rows={rows}
                              onChange={(newRows) => updateMultiRows(ind.id, newRows)}
                              disabled={!canEdit}
                              validationErrors={indicatorErrors}
                            />
                          ) : (
                            <p className="text-[13px] text-muted-foreground italic">
                              No disaggregation configuration found for this indicator. Contact your administrator.
                            </p>
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

import { useAuth } from '@/contexts/AuthContext';
import { useApp } from '@/contexts/AppContext';
import { StatCard } from '@/components/StatCard';
import { StatusBadge, ProjectStatusBadge } from '@/components/StatusBadge';
import { FolderOpen, FileText, Plus, ArrowRight, Calendar, Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { Pagination } from '@/components/Pagination';

export default function LeadDashboard() {
  const { user } = useAuth();
  const { getProjectsForLead, createReportCycle } = useApp();
  const navigate = useNavigate();
  const { toast } = useToast();

  const myProjects = getProjectsForLead(user!.id);
  const activeProjects = myProjects.filter(p => p.status === 'active');
  const allReports = myProjects.flatMap(p => p.reports);
  const drafts = allReports.filter(r => r.state === 'draft');
  const [projectsPage, setProjectsPage] = useState(1);
  const projectsPerPage = 5;
  const totalProjectPages = Math.max(1, Math.ceil(myProjects.length / projectsPerPage));
  const paginatedProjects = myProjects.slice((projectsPage - 1) * projectsPerPage, projectsPage * projectsPerPage);

  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [createForProject, setCreateForProject] = useState<string | null>(null);
  const [periodLabel, setPeriodLabel] = useState('');
  const [remarks, setRemarks] = useState('');
  const [currentDateTime, setCurrentDateTime] = useState(new Date());

  const safeFormatDate = (value?: string) => {
    if (!value) return '—';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return '—';
    return format(d, 'MMM d, yyyy');
  };

  // Update clock every second while modal is open
  useEffect(() => {
    if (!showCreateDialog) return;
    setCurrentDateTime(new Date());
    const interval = setInterval(() => setCurrentDateTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, [showCreateDialog]);

  const handleCreateReport = async () => {
    if (!createForProject) return;
    const label = periodLabel.trim() || `Report – ${format(currentDateTime, 'd MMM yyyy')}`;
    const report = await createReportCycle(createForProject, label, user!.id);
    if (report) {
      toast({ title: 'New reporting cycle created successfully', description: `"${label}" is now ready for data entry.` });
      setShowCreateDialog(false);
      setPeriodLabel('');
      setRemarks('');
      setCreateForProject(null);
      navigate(`/lead/report/${createForProject}/${report.id}`);
    }
  };

  const openCreateDialog = (projectId: string) => {
    setCreateForProject(projectId);
    setPeriodLabel('');
    setRemarks('');
    setCurrentDateTime(new Date());
    setShowCreateDialog(true);
  };

  return (
    <div className="page-container space-y-8">
      <div className="animate-in page-header">
        <h1 className="page-title">My Projects</h1>
        <p className="page-subtitle">Welcome back, {user!.name}</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 animate-in-delay-1">
        <StatCard label="Assigned Projects" value={myProjects.length} icon={FolderOpen} description={`${activeProjects.length} active`} />
        <StatCard label="Draft Reports" value={drafts.length} icon={FileText} />
        <StatCard label="Total Report Cycles" value={allReports.length} icon={FileText} description={`Across all projects`} />
      </div>

      <div className="space-y-5 animate-in-delay-2">
        {paginatedProjects.map(project => (
          <div key={project.id} className="card-elevated p-6">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-3">
                  <h3 className="text-[17px] font-semibold tracking-tight">{project.name}</h3>
                  <ProjectStatusBadge status={project.status} />
                </div>
                <p className="text-[13px] text-muted-foreground mt-1.5">{project.generalCategory} · {project.specificCategory}</p>
                <p className="text-[13px] text-muted-foreground mt-0.5">{project.startDate} → {project.endDate}</p>
              </div>
              {project.status === 'active' && (
                <Button className="h-10 shrink-0" onClick={() => openCreateDialog(project.id)}>
                  <Plus className="h-4 w-4 mr-1.5" />Create New Report
                </Button>
              )}
            </div>

            {/* Reporting History Table */}
            {project.reports.length > 0 && (
              <div className="mt-5 pt-5 border-t border-border">
                <h4 className="text-[13px] font-semibold text-muted-foreground uppercase tracking-wider mb-3">Reporting History</h4>
                <div className="overflow-x-auto">
                  <table className="w-full text-[13px]">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left py-2 pr-4 font-medium text-muted-foreground">Period</th>
                        <th className="text-left py-2 pr-4 font-medium text-muted-foreground">Created</th>
                        <th className="text-left py-2 pr-4 font-medium text-muted-foreground">Last Modified</th>
                        <th className="text-left py-2 pr-4 font-medium text-muted-foreground">Status</th>
                        <th className="text-right py-2 font-medium text-muted-foreground">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {project.reports
                        .sort((a, b) => b.cycleNumber - a.cycleNumber)
                        .map(report => {
                          const canEdit = report.state === 'draft' || report.state === 'unlocked';
                          const canView = report.state === 'published' || report.state === 're_published' || report.state === 'edit_requested' || report.state === 'completed';
                          return (
                            <tr key={report.id} className="border-b border-border last:border-0 hover:bg-secondary/20 transition-colors">
                              <td className="py-3 pr-4">
                                <span className="font-medium">{report.periodLabel}</span>
                                <span className="text-muted-foreground ml-2">(Cycle {report.cycleNumber})</span>
                              </td>
                              <td className="py-3 pr-4 text-muted-foreground">{safeFormatDate(report.createdAt)}</td>
                              <td className="py-3 pr-4 text-muted-foreground">{safeFormatDate(report.lastModifiedAt)}</td>
                              <td className="py-3 pr-4"><StatusBadge state={report.state} /></td>
                              <td className="py-3 text-right">
                                <button
                                  onClick={() => navigate(`/lead/report/${project.id}/${report.id}`)}
                                  className="text-[13px] font-medium text-primary hover:text-primary/80 transition-colors inline-flex items-center gap-1"
                                >
                                  {canEdit ? 'Edit' : canView ? 'View' : 'Open'}
                                  <ArrowRight className="h-3.5 w-3.5" />
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {project.reports.length === 0 && project.status === 'active' && (
              <div className="mt-5 pt-5 border-t border-border text-center py-8">
                <FileText className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
                <p className="text-[13px] text-muted-foreground">No reporting cycles yet. Create your first report to begin.</p>
              </div>
            )}
          </div>
        ))}

        {myProjects.length === 0 && (
          <div className="card-elevated p-16 text-center">
            <FolderOpen className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
            <p className="text-[15px] font-medium text-muted-foreground">No projects assigned to you yet</p>
            <p className="text-[13px] text-muted-foreground/70 mt-1">Projects will appear here once assigned by an administrator</p>
          </div>
        )}
      </div>

      {myProjects.length > 0 && (
        <Pagination page={projectsPage} totalPages={totalProjectPages} onPageChange={setProjectsPage} className="animate-in-delay-2" />
      )}

      {/* Create Report Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="sm:max-w-[660px] p-0 gap-0 overflow-hidden max-h-[90vh] overflow-y-auto">
          <DialogHeader className="px-8 pt-8 pb-0">
            <DialogTitle className="text-[22px] font-semibold tracking-tight">Create New Report</DialogTitle>
            <DialogDescription className="text-[14px] text-muted-foreground mt-1.5">
              This will create a new reporting cycle for the selected project. All fields marked with * are required.
            </DialogDescription>
          </DialogHeader>

          <div className="px-8 py-6 space-y-6">
            {/* System Date - Read Only */}
            <div className="space-y-2">
              <Label className="text-[14px] font-medium text-foreground">Report Creation Date</Label>
              <div className="h-12 px-4 rounded-lg border border-border bg-muted/40 flex items-center gap-3 text-[15px]">
                <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
                <span className="text-foreground font-medium">{format(currentDateTime, 'd MMM yyyy')}</span>
                <span className="text-muted-foreground">·</span>
                <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
                <span className="text-muted-foreground">{format(currentDateTime, 'HH:mm')}</span>
              </div>
              <p className="text-[12px] text-muted-foreground">Date is automatically recorded by the system and cannot be modified.</p>
            </div>

            {/* Report Title */}
            <div className="space-y-2">
              <Label className="text-[14px] font-medium text-foreground">
                Report Title / Reporting Period Label
                <span className="text-muted-foreground font-normal ml-1.5">(optional)</span>
              </Label>
              <Input
                value={periodLabel}
                onChange={e => setPeriodLabel(e.target.value.slice(0, 150))}
                placeholder="e.g., Q1 2026 Progress Report, Mid-Year Update, February Monitoring Report"
                className="h-12 text-[15px]"
              />
              <div className="flex items-center justify-between">
                <p className="text-[12px] text-muted-foreground">
                  If left empty, defaults to: <span className="font-medium text-foreground/70">"Report – {format(currentDateTime, 'd MMM yyyy')}"</span>
                </p>
                <span className="text-[11px] text-muted-foreground tabular-nums">{periodLabel.length}/150</span>
              </div>
            </div>

            {/* Remarks */}
            <div className="space-y-2">
              <Label className="text-[14px] font-medium text-foreground">
                Remarks / Additional Notes
                <span className="text-muted-foreground font-normal ml-1.5">(optional)</span>
              </Label>
              <Textarea
                value={remarks}
                onChange={e => setRemarks(e.target.value)}
                placeholder="Provide any contextual explanation or cycle-specific notes..."
                className="min-h-[100px] text-[15px] resize-y"
              />
              <p className="text-[12px] text-muted-foreground">Add any context about this reporting cycle's purpose or scope.</p>
            </div>
          </div>

          <DialogFooter className="px-8 py-5 border-t border-border bg-muted/20 flex-row justify-between sm:justify-between">
            <Button variant="outline" className="h-11 px-6" onClick={() => setShowCreateDialog(false)}>Cancel</Button>
            <Button className="h-11 px-6" onClick={handleCreateReport}>
              <Plus className="h-4 w-4 mr-1.5" />
              Create Report
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

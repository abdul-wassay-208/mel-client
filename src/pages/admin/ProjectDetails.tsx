import { useParams, useNavigate } from 'react-router-dom';
import { useApp } from '@/contexts/AppContext';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { ProjectStatusBadge, StatusBadge } from '@/components/StatusBadge';
import { useEffect, useState } from 'react';
import { apiGetProject, apiGetUsers, apiAssignProjectLeads, ApiUserRecord } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';

export default function ProjectDetails() {
  const { projectId } = useParams<{ projectId: string }>();
  const { projects, deleteProject, refreshProjects } = useApp();
  const { isAdmin } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const project = projects.find(p => p.id === projectId);
  const [displayLeads, setDisplayLeads] = useState<Array<{ id: string; name: string; email: string }>>([]);
  const [liveReports, setLiveReports] = useState<any[]>([]);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showEditLeadsDialog, setShowEditLeadsDialog] = useState(false);
  const [savingLeads, setSavingLeads] = useState(false);
  const [allLeads, setAllLeads] = useState<{ id: string; name: string; email: string }[]>([]);
  const [selectedLeadIds, setSelectedLeadIds] = useState<string[]>([]);

  useEffect(() => {
    (async () => {
      try {
        if (!project) return;

        // Prefer backend project payload (has multi-lead assignments).
        const apiProject = await apiGetProject(project.id);
        setLiveReports(apiProject.reports ?? []);
        const assignedIds = Array.from(
          new Set([
            ...(apiProject.leads ?? []).map((a: any) => String(a.userId)),
            ...(apiProject.leadId != null ? [String(apiProject.leadId)] : []),
          ])
        ).filter(Boolean);

        // If backend included user objects, use them directly.
        const fromEmbedded = (apiProject.leads ?? [])
          .map((a: any) => a?.user)
          .filter(Boolean)
          .map((u: any) => ({ id: String(u.id), name: u.name, email: u.email }));

        if (fromEmbedded.length > 0) {
          // Ensure stable ordering and de-dupe
          const byId = new Map(fromEmbedded.map((u: any) => [u.id, u]));
          setDisplayLeads(assignedIds.map((id) => byId.get(id)).filter(Boolean) as any);
          return;
        }

        // Fallback: fetch users and map ids to names/emails.
        const users = await apiGetUsers();
        const mapped = assignedIds
          .map((id) => users.find((u: ApiUserRecord) => String(u.id) === id))
          .filter(Boolean)
          .map((u: any) => ({ id: String(u.id), name: u.name, email: u.email }));
        setDisplayLeads(mapped);
      } catch (err) {
        console.error(err);
      }
    })();
  }, [project]);

  useEffect(() => {
    if (!showEditLeadsDialog || !project) return;
    (async () => {
      try {
        const [users, apiProject] = await Promise.all([
          apiGetUsers(),
          apiGetProject(project.id),
        ]);

        const leads = users
          .filter((u: ApiUserRecord) => u.role === 'PROJECT_LEAD' && u.isActive)
          .map((u) => ({
            id: String(u.id),
            name: u.name,
            email: u.email,
          }));
        setAllLeads(leads);

        const assigned = Array.from(new Set([
          ...(apiProject.leads ?? []).map((a: any) => String(a.userId)),
          ...(apiProject.leadId != null ? [String(apiProject.leadId)] : []),
        ])).filter(Boolean);

        setSelectedLeadIds(assigned);
      } catch (err: any) {
        console.error(err);
        toast({ title: 'Failed to load leads', description: err?.message || 'Unknown error', variant: 'destructive' });
      }
    })();
  }, [showEditLeadsDialog, project, toast]);

  if (!project) {
    return (
      <div className="page-container py-10 space-y-4">
        <p className="text-[15px] text-muted-foreground">Project not found.</p>
        <Button variant="outline" onClick={() => navigate('/admin')}>Back to dashboard</Button>
      </div>
    );
  }

  const handleDelete = async () => {
    if (!project) return;
    setDeleting(true);
    try {
      await deleteProject(project.id);
      toast({ title: 'Project deleted', description: 'The project has been removed successfully.' });
      setShowDeleteDialog(false);
      navigate('/admin');
    } catch (e: any) {
      toast({ title: 'Delete failed', description: e?.message || 'Unknown error', variant: 'destructive' });
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="page-container py-8 space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="page-title">{project.name}</h1>
          <p className="page-subtitle">
            {project.generalCategory} · {project.specificCategory}
          </p>
          <p className="text-[13px] text-muted-foreground mt-1.5">
            {project.startDate} → {project.endDate}
          </p>
          <p className="text-[13px] text-muted-foreground mt-1">
            <span className="font-medium">Project Lead(s):</span>{' '}
            {displayLeads.length > 0
              ? displayLeads.map(l => `${l.name} (${l.email})`).join(', ')
              : 'Unassigned'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <ProjectStatusBadge status={project.status} />
          <Button variant="outline" onClick={() => navigate('/admin')}>Back</Button>
          {isAdmin && (
            <Button
              variant="outline"
              onClick={() => setShowEditLeadsDialog(true)}
            >
              Edit Leads
            </Button>
          )}
          {isAdmin && (
            <Button
              variant="destructive"
              onClick={() => setShowDeleteDialog(true)}
            >
              Delete
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <div className="card-elevated p-6">
            <h2 className="section-title mb-2">Description</h2>
            <p className="text-[14px] text-muted-foreground whitespace-pre-line">
              {project.description || 'No description provided.'}
            </p>
          </div>

          <div className="card-elevated p-6">
            <h2 className="section-title mb-3">Logical Framework</h2>
            {project.objectives.length === 0 ? (
              <p className="text-[13px] text-muted-foreground">No objectives defined for this project.</p>
            ) : (
              <div className="space-y-4">
                {project.objectives.map(obj => (
                  <div key={obj.id} className="border border-border rounded-xl p-4 space-y-3">
                    <div>
                      <p className="text-[13px] font-semibold text-foreground">Objective: {obj.name}</p>
                      {obj.description && (
                        <p className="text-[13px] text-muted-foreground mt-0.5">{obj.description}</p>
                      )}
                    </div>
                    {obj.outcomes.map(out => (
                      <div key={out.id} className="ml-3 mt-2 space-y-1.5">
                        <p className="text-[13px] font-medium">Outcome: {out.name}</p>
                        {out.description && (
                          <p className="text-[12px] text-muted-foreground">{out.description}</p>
                        )}
                        {out.indicators.length > 0 && (
                          <ul className="list-disc ml-5 space-y-1">
                            {out.indicators.map(ind => (
                              <li key={ind.id} className="text-[12px] text-muted-foreground">
                                <span className="font-medium text-foreground">{ind.name}</span>
                                {ind.description && ` – ${ind.description}`}
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <div className="card-elevated p-5">
            <h2 className="section-title mb-3">Reporting Cycles</h2>
            {(liveReports.length > 0 ? liveReports : project.reports).length === 0 ? (
              <p className="text-[13px] text-muted-foreground">No report cycles created yet.</p>
            ) : (
              <div className="space-y-3">
                {(liveReports.length > 0 ? liveReports : project.reports)
                  .slice()
                  .sort((a: any, b: any) => {
                    // mel-backend Report has no createdAt/updatedAt; sort by periodStart then id.
                    const aDate = new Date(a.periodStart || 0).getTime();
                    const bDate = new Date(b.periodStart || 0).getTime();
                    if (aDate !== bDate) return bDate - aDate;
                    return Number(b.id || 0) - Number(a.id || 0);
                    return bDate - aDate;
                  })
                  .map((report: any, idx: number) => {
                    const stateMap: Record<string, any> = {
                      DRAFT: 'draft',
                      SUBMITTED: 'draft',
                      PUBLISHED: 'published',
                      EDIT_REQUESTED: 'edit_requested',
                      UNLOCKED: 'unlocked',
                      RE_PUBLISHED: 're_published',
                      COMPLETED: 'completed',
                    };
                    const state = stateMap[report.status] ?? report.state ?? 'draft';
                    const label = report.title ?? report.periodLabel ?? `Report ${idx + 1}`;
                    const dateLabel =
                      report.periodStart
                        ? `${String(report.periodStart).slice(0, 10)}${report.periodEnd ? ` → ${String(report.periodEnd).slice(0, 10)}` : ''}`
                        : '';
                    const cycleNumber = report.cycleNumber ?? idx + 1;
                    return (
                    <div
                      key={report.id}
                      className="border border-border rounded-lg p-3 flex items-center justify-between cursor-pointer hover:bg-secondary/30 transition-colors"
                      onClick={() => navigate(`/admin/reports/${report.id}`)}
                    >
                      <div>
                        <p className="text-[13px] font-medium">{label}</p>
                        <p className="text-[12px] text-muted-foreground">
                          Cycle {cycleNumber}{dateLabel ? ` · ${dateLabel}` : ''}
                        </p>
                      </div>
                      <StatusBadge state={state} />
                    </div>
                    );
                  })}
              </div>
            )}
          </div>
        </div>
      </div>

      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-lg">Delete Project</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-[14px] text-muted-foreground">
              Are you sure you want to delete <span className="font-medium text-foreground">{project.name}</span>?
              This cannot be undone.
            </p>
          </div>
          <DialogFooter className="gap-3">
            <Button variant="outline" className="h-11" onClick={() => setShowDeleteDialog(false)} disabled={deleting}>
              Cancel
            </Button>
            <Button
              className="h-11"
              variant="destructive"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting ? 'Deleting…' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showEditLeadsDialog} onOpenChange={setShowEditLeadsDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-lg">Edit Project Leads</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-[13px] text-muted-foreground">
              Select one or more leads. At least one lead is required.
            </p>
            <div className="max-h-[320px] overflow-auto rounded-xl border border-border divide-y divide-border">
              {allLeads.map((l) => {
                const selected = selectedLeadIds.includes(l.id);
                return (
                  <button
                    key={l.id}
                    type="button"
                    onClick={() =>
                      setSelectedLeadIds((prev) =>
                        prev.includes(l.id) ? prev.filter((x) => x !== l.id) : [...prev, l.id]
                      )
                    }
                    className={`w-full text-left px-4 py-3 flex items-center justify-between transition-colors ${
                      selected ? 'bg-primary/5' : 'hover:bg-secondary/30'
                    }`}
                  >
                    <div>
                      <p className="text-[14px] font-medium">{l.name}</p>
                      <p className="text-[12px] text-muted-foreground">{l.email}</p>
                    </div>
                    <div className={`text-[12px] font-medium ${selected ? 'text-primary' : 'text-muted-foreground'}`}>
                      {selected ? 'Selected' : ''}
                    </div>
                  </button>
                );
              })}
              {allLeads.length === 0 && (
                <div className="px-4 py-8 text-center text-[13px] text-muted-foreground">
                  No active Project Leads found.
                </div>
              )}
            </div>
            {selectedLeadIds.length === 0 && (
              <p className="text-[13px] text-destructive">At least one lead is required.</p>
            )}
          </div>
          <DialogFooter className="gap-3">
            <Button variant="outline" className="h-11" onClick={() => setShowEditLeadsDialog(false)} disabled={savingLeads}>
              Cancel
            </Button>
            <Button
              className="h-11"
              onClick={async () => {
                if (!project) return;
                if (selectedLeadIds.length === 0) return;
                setSavingLeads(true);
                try {
                  await apiAssignProjectLeads(project.id, selectedLeadIds);
                  await refreshProjects();
                  toast({ title: 'Leads updated', description: 'Project leads have been updated.' });
                  setShowEditLeadsDialog(false);
                } catch (e: any) {
                  toast({ title: 'Update failed', description: e?.message || 'Unknown error', variant: 'destructive' });
                } finally {
                  setSavingLeads(false);
                }
              }}
              disabled={savingLeads || selectedLeadIds.length === 0}
            >
              {savingLeads ? 'Saving…' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}


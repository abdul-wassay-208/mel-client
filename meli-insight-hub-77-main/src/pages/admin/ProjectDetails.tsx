import { useParams, useNavigate } from 'react-router-dom';
import { useApp } from '@/contexts/AppContext';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { ProjectStatusBadge, StatusBadge } from '@/components/StatusBadge';
import { useEffect, useState } from 'react';
import { apiGetUsers, ApiUserRecord } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';

export default function ProjectDetails() {
  const { projectId } = useParams<{ projectId: string }>();
  const { projects, deleteProject } = useApp();
  const { isAdmin } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const project = projects.find(p => p.id === projectId);
  const [lead, setLead] = useState<{ name: string; email: string } | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        if (!project || !project.projectLeadId) return;
        const users = await apiGetUsers();
        const found = users.find((u: ApiUserRecord) => String(u.id) === String(project.projectLeadId));
        if (found) {
          setLead({ name: found.name, email: found.email });
        }
      } catch (err) {
        console.error(err);
      }
    })();
  }, [project]);

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
            <span className="font-medium">Project Lead:</span>{' '}
            {lead ? `${lead.name} (${lead.email})` : 'Unassigned'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <ProjectStatusBadge status={project.status} />
          <Button variant="outline" onClick={() => navigate('/admin')}>Back</Button>
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
            {project.reports.length === 0 ? (
              <p className="text-[13px] text-muted-foreground">No report cycles created yet.</p>
            ) : (
              <div className="space-y-3">
                {project.reports
                  .sort((a, b) => b.cycleNumber - a.cycleNumber)
                  .map(report => (
                    <div key={report.id} className="border border-border rounded-lg p-3 flex items-center justify-between">
                      <div>
                        <p className="text-[13px] font-medium">{report.periodLabel}</p>
                        <p className="text-[12px] text-muted-foreground">
                          Cycle {report.cycleNumber} · {report.createdAt}
                        </p>
                      </div>
                      <StatusBadge state={report.state} />
                    </div>
                  ))}
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
    </div>
  );
}


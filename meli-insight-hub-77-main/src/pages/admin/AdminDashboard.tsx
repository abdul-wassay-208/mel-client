import { useApp } from '@/contexts/AppContext';
import { StatCard } from '@/components/StatCard';
import { ProjectStatusBadge, StatusBadge } from '@/components/StatusBadge';
import { FolderOpen, FileText, BarChart3, AlertCircle, ArrowRight, CheckCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useState } from 'react';

export default function AdminDashboard() {
  const { projects, editRequests, notifications, completeProject } = useApp();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [completeDialogProject, setCompleteDialogProject] = useState<string | null>(null);

  const activeProjects = projects.filter(p => p.status === 'active');
  const completedProjects = projects.filter(p => p.status === 'completed');
  const allReports = projects.flatMap(p => p.reports);
  const draftReports = allReports.filter(r => r.state === 'draft');
  const publishedReports = allReports.filter(r => r.state === 'published' || r.state === 're_published');
  const pendingEdits = editRequests.filter(r => r.status === 'pending');

  const handleCompleteProject = (projectId: string) => {
    completeProject(projectId);
    setCompleteDialogProject(null);
    toast({ title: 'Project Completed', description: 'The project has been marked as completed. All cycles are now locked.' });
  };

  return (
    <div className="page-container space-y-8">
      <div className="animate-in page-header">
        <h1 className="page-title">Dashboard</h1>
        <p className="page-subtitle">System overview and key metrics</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 animate-in-delay-1">
        <StatCard label="Total Projects" value={projects.length} icon={FolderOpen} />
        <StatCard label="Active Projects" value={activeProjects.length} icon={BarChart3} trend={`${completedProjects.length} completed`} />
        <StatCard label="Total Report Cycles" value={allReports.length} icon={FileText} description={`${draftReports.length} drafts · ${publishedReports.length} published`} />
        <StatCard label="Pending Edits" value={pendingEdits.length} icon={AlertCircle} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in-delay-2">
        {/* Projects List */}
        <div className="lg:col-span-2 card-elevated">
          <div className="px-6 py-5 border-b border-border flex items-center justify-between">
            <h2 className="section-title">All Projects</h2>
            <span className="text-[13px] text-muted-foreground">{projects.length} total</span>
          </div>
          <div className="divide-y divide-border">
            {projects.map(project => (
              <div
                key={project.id}
                className="px-6 py-4 flex items-center justify-between hover:bg-secondary/30 transition-all duration-150 cursor-pointer group"
                onClick={() => navigate(project.status === 'completed' ? `/admin/analytics` : `/admin/projects/new`)}
              >
                <div className="min-w-0 flex-1">
                  <p className="text-[15px] font-medium truncate group-hover:text-primary transition-colors">{project.name}</p>
                  <p className="text-[13px] text-muted-foreground mt-0.5">
                    {project.generalCategory} · {project.reports.length} report cycle{project.reports.length !== 1 ? 's' : ''}
                  </p>
                </div>
                <div className="flex items-center gap-3 ml-4">
                  <ProjectStatusBadge status={project.status} />
                  {project.status === 'active' && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 text-[12px]"
                      onClick={(e) => { e.stopPropagation(); setCompleteDialogProject(project.id); }}
                    >
                      <CheckCircle className="h-3.5 w-3.5 mr-1" />Complete
                    </Button>
                  )}
                  <ArrowRight className="h-4 w-4 text-muted-foreground/40 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Report Cycles Overview */}
        <div className="card-elevated">
          <div className="px-6 py-5 border-b border-border">
            <h2 className="section-title">Recent Report Cycles</h2>
          </div>
          <div className="divide-y divide-border">
            {allReports.length === 0 ? (
              <div className="px-6 py-12 text-center">
                <FileText className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-[13px] text-muted-foreground">No report cycles yet</p>
              </div>
            ) : (
              allReports
                .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                .slice(0, 6)
                .map(report => {
                  const project = projects.find(p => p.id === report.projectId);
                  return (
                    <div key={report.id} className="px-6 py-4">
                      <p className="text-[14px] font-medium">{project?.name}</p>
                      <div className="flex items-center justify-between mt-2">
                        <p className="text-[13px] text-muted-foreground">{report.periodLabel}</p>
                        <StatusBadge state={report.state} />
                      </div>
                    </div>
                  );
                })
            )}
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="card-elevated animate-in-delay-3">
        <div className="px-6 py-5 border-b border-border">
          <h2 className="section-title">Recent Activity</h2>
        </div>
        <div className="divide-y divide-border">
          {notifications.slice(0, 5).map(n => (
            <div key={n.id} className="px-6 py-4 flex items-start gap-3.5">
              <div className={`h-2 w-2 rounded-full mt-2 shrink-0 ${n.read ? 'bg-border' : 'bg-primary'}`} />
              <div className="min-w-0 flex-1">
                <p className="text-[14px] font-medium">{n.title}</p>
                <p className="text-[13px] text-muted-foreground mt-0.5 line-clamp-1">{n.message}</p>
                <p className="text-[12px] text-muted-foreground/70 mt-1.5">{format(new Date(n.createdAt), 'MMM d, yyyy · h:mm a')}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Complete Project Dialog */}
      <Dialog open={!!completeDialogProject} onOpenChange={() => setCompleteDialogProject(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mark Project as Completed</DialogTitle>
          </DialogHeader>
          <p className="text-[14px] text-muted-foreground">This will lock all reporting cycles and no new reports can be created. A learning summary will be generated. Are you sure?</p>
          <DialogFooter className="gap-3">
            <Button variant="outline" className="h-11" onClick={() => setCompleteDialogProject(null)}>Cancel</Button>
            <Button className="h-11" onClick={() => completeDialogProject && handleCompleteProject(completeDialogProject)}>Complete Project</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

import { useAuth } from '@/contexts/AuthContext';
import { useApp } from '@/contexts/AppContext';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { BookOpen, Users, TrendingUp, Target, Lock } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { useState } from 'react';

const COLORS = ['hsl(215, 65%, 52%)', 'hsl(160, 40%, 45%)', 'hsl(38, 88%, 50%)', 'hsl(0, 60%, 52%)', 'hsl(280, 55%, 50%)'];

export default function LearningModule() {
  const { user } = useAuth();
  const { getProjectsForLead } = useApp();
  const [notes, setNotes] = useState('');

  const completedProjects = getProjectsForLead(user!.id).filter(p => p.status === 'completed');

  if (completedProjects.length === 0) {
    return (
      <div className="page-container">
        <div className="animate-in page-header">
          <h1 className="page-title">Learning Module</h1>
          <p className="page-subtitle">Post-completion analysis and insights</p>
        </div>
        <div className="card-elevated p-16 text-center">
          <BookOpen className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
          <p className="text-[15px] font-medium text-muted-foreground">No completed projects yet</p>
          <p className="text-[13px] text-muted-foreground/70 mt-1">Learning summaries are generated after project completion</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container space-y-8">
      <div className="animate-in page-header">
        <h1 className="page-title">Learning Module</h1>
        <p className="page-subtitle">Insights and summaries from completed projects</p>
      </div>

      {completedProjects.map(project => {
        const allData = project.reports.flatMap(r => r.data);
        const totalBeneficiaries = allData.length;
        const indicatorCount = project.objectives.reduce((s, o) => s + o.outcomes.reduce((ss, ou) => ss + ou.indicators.length, 0), 0);

        const genderBreakdown = allData.reduce((acc, d) => { if (d.gender) acc[d.gender] = (acc[d.gender] || 0) + 1; return acc; }, {} as Record<string, number>);
        const genderData = Object.entries(genderBreakdown).map(([name, value]) => ({ name, value }));

        const economyBreakdown = allData.reduce((acc, d) => { if (d.economy) acc[d.economy] = (acc[d.economy] || 0) + 1; return acc; }, {} as Record<string, number>);
        const economyData = Object.entries(economyBreakdown).map(([name, count]) => ({ name, count }));

        const ruralUrbanBreakdown = allData.reduce((acc, d) => { if (d.ruralUrban) acc[d.ruralUrban] = (acc[d.ruralUrban] || 0) + 1; return acc; }, {} as Record<string, number>);
        const ruralData = Object.entries(ruralUrbanBreakdown).map(([name, value]) => ({ name, value }));

        return (
          <div key={project.id} className="space-y-6 animate-in-delay-1">
            {/* Project Header */}
            <div className="card-elevated p-6">
              <div className="flex items-center gap-3 mb-2">
                <Lock className="h-4 w-4 text-muted-foreground" />
                <span className="text-[12px] text-muted-foreground font-medium uppercase tracking-wider">Read-Only · Completed Project</span>
              </div>
              <h2 className="text-[22px] font-semibold tracking-tight">{project.name}</h2>
              <p className="text-[14px] text-muted-foreground mt-1.5">{project.startDate} → {project.endDate} · {project.reports.length} reporting cycles completed</p>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
              <div className="card-elevated p-6 flex items-start gap-4">
                <div className="h-11 w-11 rounded-xl bg-primary/8 flex items-center justify-center"><Users className="h-5 w-5 text-primary" /></div>
                <div><p className="text-[13px] text-muted-foreground">Total Data Points</p><p className="text-[28px] font-semibold tracking-tight mt-0.5">{totalBeneficiaries}</p></div>
              </div>
              <div className="card-elevated p-6 flex items-start gap-4">
                <div className="h-11 w-11 rounded-xl bg-success/8 flex items-center justify-center"><Target className="h-5 w-5 text-success" /></div>
                <div><p className="text-[13px] text-muted-foreground">Objectives</p><p className="text-[28px] font-semibold tracking-tight mt-0.5">{project.objectives.length}</p></div>
              </div>
              <div className="card-elevated p-6 flex items-start gap-4">
                <div className="h-11 w-11 rounded-xl bg-info/8 flex items-center justify-center"><TrendingUp className="h-5 w-5 text-info" /></div>
                <div><p className="text-[13px] text-muted-foreground">Indicators Tracked</p><p className="text-[28px] font-semibold tracking-tight mt-0.5">{indicatorCount}</p></div>
              </div>
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="card-elevated p-6">
                <h3 className="section-title mb-4">Gender Distribution</h3>
                {genderData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie data={genderData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={75} innerRadius={35} label>
                        {genderData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                      </Pie>
                      <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid hsl(214, 18%, 91%)' }} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : <p className="text-[13px] text-muted-foreground text-center py-12">No data</p>}
              </div>

              <div className="card-elevated p-6">
                <h3 className="section-title mb-4">Economy Type</h3>
                {economyData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={economyData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(214, 18%, 91%)" />
                      <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid hsl(214, 18%, 91%)' }} />
                      <Bar dataKey="count" fill="hsl(215, 65%, 52%)" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : <p className="text-[13px] text-muted-foreground text-center py-12">No data</p>}
              </div>

              <div className="card-elevated p-6">
                <h3 className="section-title mb-4">Rural / Urban Split</h3>
                {ruralData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie data={ruralData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={75} innerRadius={35} label>
                        {ruralData.map((_, i) => <Cell key={i} fill={COLORS[(i + 2) % COLORS.length]} />)}
                      </Pie>
                      <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid hsl(214, 18%, 91%)' }} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : <p className="text-[13px] text-muted-foreground text-center py-12">No data</p>}
              </div>
            </div>

            {/* Indicator Progress */}
            <div className="card-elevated p-6">
              <h3 className="section-title mb-5">Indicator Progress Summary</h3>
              <div className="space-y-4">
                {project.objectives.map(obj => (
                  <div key={obj.id}>
                    <p className="text-[12px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">{obj.name}</p>
                    {obj.outcomes.map(out => (
                      <div key={out.id} className="ml-4 mb-3">
                        <p className="text-[13px] font-medium text-muted-foreground mb-1">{out.name}</p>
                        {out.indicators.map(ind => {
                          const indData = allData.filter(d => d.indicatorId === ind.id);
                          return (
                            <div key={ind.id} className="ml-4 flex items-center justify-between py-2 border-b border-border last:border-0">
                              <span className="text-[14px]">{ind.name}</span>
                              <span className="text-[13px] font-medium text-primary">{indData.length} entries · {project.reports.filter(r => r.data.some(d => d.indicatorId === ind.id)).length} cycles</span>
                            </div>
                          );
                        })}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>

            {/* Notes */}
            <div className="card-elevated p-6">
              <h3 className="section-title mb-2">Qualitative Learning Notes</h3>
              <p className="text-[13px] text-muted-foreground mb-4">Capture key learnings and reflections from this project</p>
              <Textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Add your observations, lessons learned, and recommendations..."
                rows={5}
                className="text-[14px]"
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

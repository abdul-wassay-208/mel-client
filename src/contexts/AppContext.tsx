import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { Project, EditRequest, AuditLogEntry, Report, DisaggregatedData, ECONOMY_OPTIONS, INFRASTRUCTURE_OPTIONS } from '@/types';
import { apiGetProjects, ApiProject, apiCreateReport, ApiReport, apiChangeReportStatus, apiDeleteProject } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';

interface AppContextType {
  projects: Project[];
  editRequests: EditRequest[];
  auditLog: AuditLogEntry[];
  addProject: (project: Project) => void;
  deleteProject: (projectId: string) => Promise<void>;
  refreshProjects: () => Promise<void>;
  createReportCycle: (projectId: string, periodLabel: string, userId: string) => Promise<Report | null>;
  updateReportData: (projectId: string, reportId: string, data: DisaggregatedData[]) => void;
  publishReport: (projectId: string, reportId: string, userId: string) => Promise<void>;
  republishReport: (projectId: string, reportId: string, userId: string) => Promise<void>;
  requestEdit: (req: Omit<EditRequest, 'id' | 'status' | 'requestedAt'>) => void;
  approveEditRequest: (requestId: string, adminId: string) => void;
  rejectEditRequest: (requestId: string, adminId: string) => void;
  completeProject: (projectId: string) => void;
  addAuditEntry: (entry: Omit<AuditLogEntry, 'id' | 'timestamp'>) => void;
  getProjectById: (id: string) => Project | undefined;
  getProjectsForLead: (leadId: string) => Project[];
}

const AppContext = createContext<AppContextType | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [editRequests, setEditRequests] = useState<EditRequest[]>([]);
  const [auditLog, setAuditLog] = useState<AuditLogEntry[]>([]);

  const mapApiProjectToProject = useCallback((p: ApiProject): Project => {
    const reportingInterval = p.reportingInterval === 'MONTHLY' ? 'monthly' : 'quarterly';
    const status = p.status === 'COMPLETED' ? 'completed' : 'active';

    const objectives = (p.objectives ?? []).map((o) => ({
      id: String(o.id),
      name: o.title,
      description: o.description ?? '',
      outcomes: (o.outcomes ?? []).map((out) => ({
        id: String(out.id),
        name: out.title,
        description: out.description ?? '',
        objectiveId: String(o.id),
        indicators: (out.indicators ?? []).map((ind) => ({
          id: String(ind.id),
          name: ind.name,
          description: ind.description ?? '',
          outcomeId: String(out.id),
        })),
      })),
    }));

    const decodeOption = (value: number | null | undefined, options: string[]) => {
      if (value == null) return '';
      const idx = value - 1;
      return idx >= 0 && idx < options.length ? options[idx] : '';
    };

    const reports = (p.reports ?? []).map((r: any, idx) => {
      const stateMap: Record<string, Report['state']> = {
        DRAFT: 'draft',
        SUBMITTED: 'draft',
        PUBLISHED: 'published',
        EDIT_REQUESTED: 'edit_requested',
        UNLOCKED: 'unlocked',
        RE_PUBLISHED: 're_published',
      };

      const data: DisaggregatedData[] = (r.disaggregatedData ?? []).map((row: any) => ({
        indicatorId: String(row.indicatorId),
        economy: decodeOption(row.Economy, ECONOMY_OPTIONS),
        infrastructure: decodeOption(row.Infrastructure, INFRASTRUCTURE_OPTIONS),
        institution: row.Institution ?? '',
        operator: row.Operator ?? '',
        gender: row.Gender ?? '',
        age: row.Age ?? '',
        city: row.City ?? '',
        language: row.Language ?? '',
        sectorOrgType: row.Sector ?? '',
        asn: row.ASN ?? '',
        technology: row.Technology ?? '',
        disability: row.Disability ?? '',
        ruralUrban: row.RuralUrban ?? '',
        topic: row.Topic ?? '',
        stakeholderType: row.StakeholderType ?? '',
        dialoguesText: row.DialoguesText ?? (row.Dialogues != null ? String(row.Dialogues) : ''),
        partnerType: row.PartnerType ?? '',
        numberOfUsers: row.NumberOfUsers ?? 0,
        notes: row.Notes ?? '',
      }));

      return {
        id: String(r.id),
        projectId: String(p.id),
        cycleNumber: idx + 1,
        periodLabel: r.title,
        state: stateMap[r.status] ?? 'draft',
        data,
        createdAt: r.createdAt ?? r.periodStart ?? new Date().toISOString(),
        lastModifiedAt: r.updatedAt ?? r.periodStart ?? new Date().toISOString(),
        submittedAt: r.submittedAt ?? undefined,
      } as Report;
    });

    return {
      id: String(p.id),
      name: p.name,
      projectLeadId: p.leadId != null ? String(p.leadId) : '',
      programLead: p.programLead ?? '',
      projectSupport: p.projectSupport ?? '',
      startDate: (p.startDate ?? '').slice(0, 10),
      endDate: (p.endDate ?? '').slice(0, 10),
      generalCategory: p.generalCategory ?? p.category ?? '',
      specificCategory: p.specificCategory ?? '',
      description: p.description ?? '',
      reportingInterval,
      expectedUsers: p.expectedUsers ?? 0,
      objectives,
      status,
      reports,
      createdAt: p.createdAt,
    };
  }, []);

  const refreshProjects = useCallback(async () => {
    if (!user) {
      setProjects([]);
      return;
    }
    const apiProjects = await apiGetProjects();
    setProjects(apiProjects.map(mapApiProjectToProject));
  }, [user, mapApiProjectToProject]);

  useEffect(() => {
    // When auth changes (login/logout), refresh projects from backend.
    if (!user) {
      setProjects([]);
      return;
    }
    refreshProjects().catch((e) => console.error(e));
  }, [user, refreshProjects]);

  const addAuditEntry = useCallback((entry: Omit<AuditLogEntry, 'id' | 'timestamp'>) => {
    setAuditLog(prev => [{
      ...entry,
      id: `al${Date.now()}`,
      timestamp: new Date().toISOString(),
    }, ...prev]);
  }, []);

  const addProject = useCallback((project: Project) => {
    setProjects(prev => [...prev, project]);
    addAuditEntry({ userId: '', userName: '', action: 'Created Project', entityType: 'Project', entityId: project.id });
  }, [addAuditEntry]);

  const createReportCycle = useCallback(
    async (projectId: string, periodLabel: string, userId: string): Promise<Report | null> => {
      const project = projects.find(p => p.id === projectId);
      if (!project || project.status === 'completed') return null;

      const nowIso = new Date().toISOString();
      const payload = {
        projectId: Number(projectId),
        title: periodLabel,
        periodStart: nowIso,
        periodEnd: nowIso,
      };

      const apiReport: ApiReport = await apiCreateReport(payload);

      let createdReport: Report | null = null;

      setProjects(prev =>
        prev.map(p => {
          if (p.id !== projectId) return p;
          const nextCycle = p.reports.length + 1;
          const mapped: Report = {
            id: String(apiReport.id),
            projectId,
            cycleNumber: nextCycle,
            periodLabel: apiReport.title,
            state: 'draft',
            data: [],
            createdAt: apiReport.createdAt,
            lastModifiedAt: apiReport.updatedAt,
            submittedAt: apiReport.submittedAt ?? undefined,
          };
          createdReport = mapped;
          return {
            ...p,
            reports: [...p.reports, mapped],
          };
        })
      );

      addAuditEntry({
        userId,
        userName: '',
        action: 'Created Report Cycle',
        entityType: 'Report',
        entityId: String(apiReport.id),
      });

      return createdReport;
    },
    [projects, addAuditEntry]
  );

  const updateReportData = useCallback((projectId: string, reportId: string, data: DisaggregatedData[]) => {
    setProjects(prev => prev.map(p =>
      p.id === projectId ? {
        ...p,
        reports: p.reports.map(r => r.id === reportId ? { ...r, data, lastModifiedAt: new Date().toISOString() } : r),
      } : p
    ));
  }, []);

  const publishReport = useCallback(
    async (projectId: string, reportId: string, userId: string) => {
      const apiReport = await apiChangeReportStatus(Number(reportId), 'PUBLISH');

      setProjects(prev =>
        prev.map(p =>
          p.id === projectId
            ? {
                ...p,
                reports: p.reports.map(r =>
                  r.id === reportId
                    ? {
                        ...r,
                        state: apiReport.status === 'PUBLISHED' ? ('published' as const) : r.state,
                        submittedAt: apiReport.submittedAt ?? r.submittedAt,
                        lastModifiedAt: apiReport.updatedAt,
                      }
                    : r
                ),
              }
            : p
        )
      );

      addAuditEntry({
        userId,
        userName: '',
        action: 'Published Report',
        entityType: 'Report',
        entityId: reportId,
      });
    },
    [addAuditEntry]
  );

  const republishReport = useCallback(
    async (projectId: string, reportId: string, userId: string) => {
      const apiReport = await apiChangeReportStatus(Number(reportId), 'PUBLISH');

      setProjects(prev =>
        prev.map(p =>
          p.id === projectId
            ? {
                ...p,
                reports: p.reports.map(r =>
                  r.id === reportId
                    ? {
                        ...r,
                        state: apiReport.status === 'PUBLISHED' ? ('re_published' as const) : r.state,
                        submittedAt: apiReport.submittedAt ?? r.submittedAt,
                        lastModifiedAt: apiReport.updatedAt,
                      }
                    : r
                ),
              }
            : p
        )
      );

      addAuditEntry({
        userId,
        userName: '',
        action: 'Re-Published Report',
        entityType: 'Report',
        entityId: reportId,
      });
    },
    [addAuditEntry]
  );

  const requestEdit = useCallback((req: Omit<EditRequest, 'id' | 'status' | 'requestedAt'>) => {
    const newReq: EditRequest = { ...req, id: `er${Date.now()}`, status: 'pending', requestedAt: new Date().toISOString() };
    setEditRequests(prev => [...prev, newReq]);
    setProjects(prev => prev.map(p =>
      p.id === req.projectId ? {
        ...p,
        reports: p.reports.map(r => r.id === req.reportId ? { ...r, state: 'edit_requested' as const } : r),
      } : p
    ));
    addAuditEntry({ userId: req.requestedBy, userName: req.requestedByName, action: 'Requested Edit', entityType: 'EditRequest', entityId: newReq.id });
  }, [addAuditEntry]);

  const approveEditRequest = useCallback((requestId: string, adminId: string) => {
    setEditRequests(prev => prev.map(r =>
      r.id === requestId ? { ...r, status: 'approved' as const, resolvedAt: new Date().toISOString(), resolvedBy: adminId } : r
    ));
    const req = editRequests.find(r => r.id === requestId);
    if (req) {
      setProjects(prev => prev.map(p =>
        p.id === req.projectId ? {
          ...p,
          reports: p.reports.map(r => r.id === req.reportId ? { ...r, state: 'unlocked' as const } : r),
        } : p
      ));
    }
    addAuditEntry({ userId: adminId, userName: '', action: 'Approved Edit Request', entityType: 'EditRequest', entityId: requestId });
  }, [editRequests, addAuditEntry]);

  const rejectEditRequest = useCallback((requestId: string, adminId: string) => {
    setEditRequests(prev => prev.map(r =>
      r.id === requestId ? { ...r, status: 'rejected' as const, resolvedAt: new Date().toISOString(), resolvedBy: adminId } : r
    ));
    const req = editRequests.find(r => r.id === requestId);
    if (req) {
      setProjects(prev => prev.map(p =>
        p.id === req.projectId ? {
          ...p,
          reports: p.reports.map(r => r.id === req.reportId ? { ...r, state: 'published' as const } : r),
        } : p
      ));
    }
    addAuditEntry({ userId: adminId, userName: '', action: 'Rejected Edit Request', entityType: 'EditRequest', entityId: requestId });
  }, [editRequests, addAuditEntry]);

  const completeProject = useCallback((projectId: string) => {
    setProjects(prev => prev.map(p =>
      p.id === projectId ? {
        ...p,
        status: 'completed' as const,
        reports: p.reports.map(r => ({ ...r, state: 'completed' as const })),
      } : p
    ));
    addAuditEntry({ userId: '', userName: '', action: 'Completed Project', entityType: 'Project', entityId: projectId });
  }, [addAuditEntry]);

  const deleteProject = useCallback(async (projectId: string) => {
    await apiDeleteProject(projectId);
    setProjects(prev => prev.filter(p => p.id !== projectId));
  }, []);

  const getProjectById = (id: string) => projects.find(p => p.id === id);
  const getProjectsForLead = (leadId: string) => projects.filter(p => p.projectLeadId === leadId);

  return (
    <AppContext.Provider value={{
      projects, editRequests, auditLog,
      addProject, deleteProject, refreshProjects, createReportCycle, updateReportData, publishReport, republishReport,
      requestEdit, approveEditRequest, rejectEditRequest, completeProject,
      addAuditEntry, getProjectById, getProjectsForLead,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}

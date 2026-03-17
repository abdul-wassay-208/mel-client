import { createContext, useContext, useState, ReactNode, useCallback } from 'react';
import { Project, EditRequest, AuditLogEntry, Notification, Report, DisaggregatedData } from '@/types';
import { mockProjects, mockEditRequests, mockAuditLog, mockNotifications, mockUsers } from '@/data/mockData';

interface AppContextType {
  projects: Project[];
  editRequests: EditRequest[];
  auditLog: AuditLogEntry[];
  notifications: Notification[];
  addProject: (project: Project) => void;
  createReportCycle: (projectId: string, periodLabel: string, userId: string) => Report | null;
  updateReportData: (projectId: string, reportId: string, data: DisaggregatedData[]) => void;
  publishReport: (projectId: string, reportId: string, userId: string) => void;
  republishReport: (projectId: string, reportId: string, userId: string) => void;
  requestEdit: (req: Omit<EditRequest, 'id' | 'status' | 'requestedAt'>) => void;
  approveEditRequest: (requestId: string, adminId: string) => void;
  rejectEditRequest: (requestId: string, adminId: string) => void;
  completeProject: (projectId: string) => void;
  markNotificationRead: (notificationId: string) => void;
  retryNotification: (notificationId: string) => void;
  addAuditEntry: (entry: Omit<AuditLogEntry, 'id' | 'timestamp'>) => void;
  getProjectById: (id: string) => Project | undefined;
  getProjectsForLead: (leadId: string) => Project[];
  getUserById: (id: string) => typeof mockUsers[0] | undefined;
}

const AppContext = createContext<AppContextType | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [projects, setProjects] = useState<Project[]>(mockProjects);
  const [editRequests, setEditRequests] = useState<EditRequest[]>(mockEditRequests);
  const [auditLog, setAuditLog] = useState<AuditLogEntry[]>(mockAuditLog);
  const [notifications, setNotifications] = useState<Notification[]>(mockNotifications);

  const getUserById = (id: string) => mockUsers.find(u => u.id === id);

  const addAuditEntry = useCallback((entry: Omit<AuditLogEntry, 'id' | 'timestamp'>) => {
    setAuditLog(prev => [{
      ...entry,
      id: `al${Date.now()}`,
      timestamp: new Date().toISOString(),
    }, ...prev]);
  }, []);

  const addNotification = useCallback((n: Omit<Notification, 'id' | 'createdAt'>) => {
    setNotifications(prev => [{
      ...n,
      id: `n${Date.now()}`,
      createdAt: new Date().toISOString(),
    }, ...prev]);
  }, []);

  const addProject = useCallback((project: Project) => {
    setProjects(prev => [...prev, project]);
    addAuditEntry({ userId: 'u1', userName: 'Sarah Chen', action: 'Created Project', entityType: 'Project', entityId: project.id });
    addNotification({ type: 'assignment', title: 'New Project Assignment', message: `You have been assigned as Project Lead for "${project.name}".`, recipientId: project.projectLeadId, read: false, delivered: true, deliveredAt: new Date().toISOString(), retryCount: 0 });
  }, [addAuditEntry, addNotification]);

  const createReportCycle = useCallback((projectId: string, periodLabel: string, userId: string): Report | null => {
    const project = projects.find(p => p.id === projectId);
    if (!project || project.status === 'completed') return null;
    const user = getUserById(userId);
    const nextCycle = project.reports.length + 1;
    const now = new Date().toISOString();
    const newReport: Report = {
      id: `r${Date.now()}`,
      projectId,
      cycleNumber: nextCycle,
      periodLabel,
      state: 'draft',
      data: [],
      createdAt: now,
      lastModifiedAt: now,
    };
    setProjects(prev => prev.map(p =>
      p.id === projectId ? { ...p, reports: [...p.reports, newReport] } : p
    ));
    addAuditEntry({ userId, userName: user?.name || '', action: 'Created Report Cycle', entityType: 'Report', entityId: newReport.id });
    return newReport;
  }, [projects, addAuditEntry]);

  const updateReportData = useCallback((projectId: string, reportId: string, data: DisaggregatedData[]) => {
    setProjects(prev => prev.map(p =>
      p.id === projectId ? {
        ...p,
        reports: p.reports.map(r => r.id === reportId ? { ...r, data, lastModifiedAt: new Date().toISOString() } : r),
      } : p
    ));
  }, []);

  const publishReport = useCallback((projectId: string, reportId: string, userId: string) => {
    const user = getUserById(userId);
    setProjects(prev => prev.map(p =>
      p.id === projectId ? {
        ...p,
        reports: p.reports.map(r => r.id === reportId ? { ...r, state: 'published' as const, submittedAt: new Date().toISOString(), lastModifiedAt: new Date().toISOString() } : r),
      } : p
    ));
    addAuditEntry({ userId, userName: user?.name || '', action: 'Published Report', entityType: 'Report', entityId: reportId });
    addNotification({ type: 'publish', title: 'Report Published', message: `${user?.name} published a report for project.`, recipientId: 'u1', read: false, delivered: true, deliveredAt: new Date().toISOString(), retryCount: 0 });
  }, [addAuditEntry, addNotification]);

  const republishReport = useCallback((projectId: string, reportId: string, userId: string) => {
    const user = getUserById(userId);
    setProjects(prev => prev.map(p =>
      p.id === projectId ? {
        ...p,
        reports: p.reports.map(r => r.id === reportId ? { ...r, state: 're_published' as const, submittedAt: new Date().toISOString(), lastModifiedAt: new Date().toISOString() } : r),
      } : p
    ));
    addAuditEntry({ userId, userName: user?.name || '', action: 'Re-Published Report', entityType: 'Report', entityId: reportId });
  }, [addAuditEntry]);

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
    addNotification({ type: 'edit_approval', title: 'Edit Request Pending', message: `${req.requestedByName} requested to edit indicator data in "${req.projectName}".`, recipientId: 'u1', read: false, delivered: true, deliveredAt: new Date().toISOString(), retryCount: 0 });
  }, [addAuditEntry, addNotification]);

  const approveEditRequest = useCallback((requestId: string, adminId: string) => {
    const admin = getUserById(adminId);
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
      addNotification({ type: 'edit_approval', title: 'Edit Request Approved', message: `Your edit request for "${req.projectName}" has been approved. You may now edit the data.`, recipientId: req.requestedBy, read: false, delivered: true, deliveredAt: new Date().toISOString(), retryCount: 0 });
    }
    addAuditEntry({ userId: adminId, userName: admin?.name || '', action: 'Approved Edit Request', entityType: 'EditRequest', entityId: requestId });
  }, [editRequests, addAuditEntry, addNotification]);

  const rejectEditRequest = useCallback((requestId: string, adminId: string) => {
    const admin = getUserById(adminId);
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
      addNotification({ type: 'edit_rejection', title: 'Edit Request Rejected', message: `Your edit request for "${req.projectName}" has been rejected.`, recipientId: req.requestedBy, read: false, delivered: true, deliveredAt: new Date().toISOString(), retryCount: 0 });
    }
    addAuditEntry({ userId: adminId, userName: admin?.name || '', action: 'Rejected Edit Request', entityType: 'EditRequest', entityId: requestId });
  }, [editRequests, addAuditEntry, addNotification]);

  const completeProject = useCallback((projectId: string) => {
    setProjects(prev => prev.map(p =>
      p.id === projectId ? {
        ...p,
        status: 'completed' as const,
        reports: p.reports.map(r => ({ ...r, state: 'completed' as const })),
      } : p
    ));
    addAuditEntry({ userId: 'u1', userName: 'Sarah Chen', action: 'Completed Project', entityType: 'Project', entityId: projectId });
  }, [addAuditEntry]);

  const markNotificationRead = useCallback((notificationId: string) => {
    setNotifications(prev => prev.map(n =>
      n.id === notificationId ? { ...n, read: true } : n
    ));
  }, []);

  const retryNotification = useCallback((notificationId: string) => {
    setNotifications(prev => prev.map(n =>
      n.id === notificationId ? { ...n, delivered: true, deliveredAt: new Date().toISOString(), failedAt: undefined, retryCount: n.retryCount + 1 } : n
    ));
  }, []);

  const getProjectById = (id: string) => projects.find(p => p.id === id);
  const getProjectsForLead = (leadId: string) => projects.filter(p => p.projectLeadId === leadId);

  return (
    <AppContext.Provider value={{
      projects, editRequests, auditLog, notifications,
      addProject, createReportCycle, updateReportData, publishReport, republishReport,
      requestEdit, approveEditRequest, rejectEditRequest, completeProject,
      markNotificationRead, retryNotification,
      addAuditEntry, getProjectById, getProjectsForLead, getUserById,
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

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:4000/api";

export interface ApiUser {
  id: number;
  name: string;
  email: string;
  role: "ADMIN" | "PROJECT_LEAD";
}

interface LoginResponse {
  token: string;
  user: ApiUser;
}

export async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem("mel_token");

  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  if (!res.ok) {
    let message = "Request failed";
    try {
      const body = await res.json();
      if (body?.message) message = body.message;
    } catch {
      // ignore
    }
    throw new Error(message);
  }

  return res.json() as Promise<T>;
}

export async function apiLogin(email: string, password: string): Promise<LoginResponse> {
  return request<LoginResponse>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

export interface ApiUserRecord {
  id: number;
  name: string;
  email: string;
  role: "ADMIN" | "PROJECT_LEAD";
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  inviteToken?: string | null;
  inviteExpiresAt?: string | null;
}

export async function apiGetUsers(): Promise<ApiUserRecord[]> {
  return request<ApiUserRecord[]>("/users");
}

export async function apiCreateUser(payload: { name: string; email: string; role: "ADMIN" | "PROJECT_LEAD" }) {
  return request<ApiUserRecord & { tempPassword?: string }>("/users", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function apiUpdateUser(
  id: number,
  data: Partial<{ name: string; role: "ADMIN" | "PROJECT_LEAD"; isActive: boolean }>
) {
  return request<ApiUserRecord>(`/users/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export interface InvitePreview {
  name: string;
  email: string;
  role: "ADMIN" | "PROJECT_LEAD";
}

export async function apiGetInvite(token: string): Promise<InvitePreview> {
  return request<InvitePreview>(`/auth/invite/${token}`);
}

export async function apiAcceptInvite(
  token: string,
  password: string
): Promise<{ token: string; user: ApiUser }> {
  return request<{ token: string; user: ApiUser }>(`/auth/invite/${token}`, {
    method: "POST",
    body: JSON.stringify({ password }),
  });
}

// ── Projects ────────────────────────────────────────────────────────────────

export interface ApiIndicator {
  id: number;
  name: string;
  description?: string | null;
  outcomeId: number;
}

export interface ApiOutcome {
  id: number;
  title: string;
  description?: string | null;
  objectiveId: number;
  indicators?: ApiIndicator[];
}

export interface ApiObjective {
  id: number;
  title: string;
  description?: string | null;
  projectId: number;
  outcomes?: ApiOutcome[];
}

export interface ApiReport {
  id: number;
  title: string;
  status: "DRAFT" | "SUBMITTED" | "PUBLISHED" | "EDIT_REQUESTED" | "UNLOCKED" | "RE_PUBLISHED";
  periodStart: string;
  periodEnd?: string | null;
  // mel-backend Report doesn't expose createdAt/updatedAt; keep optional for compatibility
  createdAt?: string;
  updatedAt?: string;
  submittedAt?: string | null;
  disaggregatedData?: ApiDisaggregatedRow[];
}

export type ReportStatusAction = "SUBMIT" | "REQUEST_EDIT" | "APPROVE_EDIT" | "PUBLISH" | "COMPLETE";

export interface ApiProject {
  id: number;
  name: string;
  description?: string | null;
  category?: string | null;
  programLead?: string | null;
  projectSupport?: string | null;
  generalCategory?: string | null;
  specificCategory?: string | null;
  expectedUsers?: number | null;
  startDate: string;
  endDate?: string | null;
  reportingInterval: "MONTHLY" | "QUARTERLY" | "YEARLY";
  status: "DRAFT" | "ACTIVE" | "COMPLETED" | "ARCHIVED";
  leadId?: number | null;
  leads?: Array<{ userId: number; user?: ApiUser | null }> | null;
  createdAt: string;
  updatedAt: string;
  lead?: ApiUser | null;
  objectives?: ApiObjective[];
  reports?: ApiReport[];
}

export interface ApiCreateReportPayload {
  projectId: number;
  title: string;
  periodStart: string;
  periodEnd: string;
}

export async function apiGetProjects(): Promise<ApiProject[]> {
  return request<ApiProject[]>("/projects");
}

export async function apiGetProject(id: number | string): Promise<ApiProject> {
  return request<ApiProject>(`/projects/${id}`);
}

export async function apiCreateReport(payload: ApiCreateReportPayload): Promise<ApiReport> {
  return request<ApiReport>("/reports", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function apiChangeReportStatus(
  id: number | string,
  action: ReportStatusAction
): Promise<ApiReport> {
  return request<ApiReport>(`/reports/${id}/status`, {
    method: "POST",
    body: JSON.stringify({ action }),
  });
}

export type ApiCreateProjectPayload = {
  name: string;
  description?: string;
  category?: string;
  programLead?: string;
  projectSupport?: string;
  generalCategory?: string;
  specificCategory?: string;
  expectedUsers?: number;
  startDate: string;
  endDate?: string;
  reportingInterval: "MONTHLY" | "QUARTERLY" | "YEARLY" | "monthly" | "quarterly" | "yearly";
  leadId?: number | null; // backward compatible
  leadIds?: number[]; // new multi-lead support
  objectives?: Array<{
    name: string;
    description?: string;
    outcomes?: Array<{
      name: string;
      description?: string;
      indicators?: Array<{
        name: string;
        description?: string;
      }>;
    }>;
  }>;
};

export async function apiCreateProject(payload: ApiCreateProjectPayload): Promise<ApiProject> {
  return request<ApiProject>("/projects", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function apiAssignProjectLeads(
  projectId: number | string,
  leadIds: Array<number | string>
): Promise<ApiProject> {
  return request<ApiProject>(`/projects/${projectId}/assign-lead`, {
    method: "POST",
    body: JSON.stringify({ leadIds: leadIds.map((x) => Number(x)) }),
  });
}

export async function apiDeleteProject(id: number | string): Promise<void> {
  const token = localStorage.getItem("mel_token");
  const res = await fetch(`${API_BASE_URL}/projects/${id}`, {
    method: "DELETE",
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  if (!res.ok) {
    let message = "Request failed";
    try {
      const body = await res.json();
      if (body?.message) message = body.message;
    } catch {
      // ignore (non-json error bodies)
    }
    throw new Error(message);
  }

  // Backend returns 204 No Content on success.
  if (res.status === 204) return;

  // If a body exists, still attempt to read it safely.
  const contentType = res.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    await res.json();
  }
}

// ── Disaggregated data ───────────────────────────────────────────────────────

export interface ApiDisaggregatedPayload {
  reportId: number;
  indicatorId: number;
  projectId?: number;
  Economy?: number | null;
  Infrastructure?: number | null;
  Institution?: string | null;
  Operator?: string | null;
  Gender?: string | null;
  Age?: string | null;
  City?: string | null;
  Language?: string | null;
  Sector?: string | null;
  ASN?: string | null;
  Technology?: string | null;
  Disability?: string | null;
  RuralUrban?: string | null;
  Topic?: string | null;
  StakeholderType?: string | null;
  Dialogues?: number | null;
  DialoguesText?: string | null;
  PartnerType?: string | null;
  NumberOfUsers?: number | null;
  Notes?: string | null;
}

export interface ApiDisaggregatedRow {
  id: number;
  projectId?: number | null;
  reportId?: number | null;
  indicatorId: number;
  indicator?: { id: number; name: string } | null;
  Economy?: number | null;
  Infrastructure?: number | null;
  Institution?: string | null;
  Operator?: string | null;
  Gender?: string | null;
  Age?: string | null;
  City?: string | null;
  Language?: string | null;
  Sector?: string | null;
  ASN?: string | null;
  Technology?: string | null;
  Disability?: string | null;
  RuralUrban?: string | null;
  Topic?: string | null;
  StakeholderType?: string | null;
  Dialogues?: number | null;
  DialoguesText?: string | null;
  PartnerType?: string | null;
  NumberOfUsers?: number | null;
  Notes?: string | null;
}

export interface ApiReportWithDisagg extends ApiReport {
  disaggregatedData?: ApiDisaggregatedRow[];
}
export async function apiSubmitDisaggregatedData(
  payload: ApiDisaggregatedPayload
): Promise<void> {
  await request<unknown>("/disaggregated-data", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function apiGetReport(id: number | string): Promise<ApiReportWithDisagg> {
  return request<ApiReportWithDisagg>(`/reports/${id}`);
}

// ── Notifications ────────────────────────────────────────────────────────────

export interface BackendNotification {
  id: number | string;
  type: string;
  title: string;
  message: string;
  data?: unknown;
  isRead: boolean;
  createdAt: string;
}

export async function apiGetNotifications(unreadOnly = false): Promise<BackendNotification[]> {
  const qs = unreadOnly ? '?unreadOnly=true' : '';
  return request<BackendNotification[]>(`/notifications${qs}`);
}

export async function apiGetUnreadCount(): Promise<{ count: number }> {
  return request<{ count: number }>('/notifications/unread-count');
}

export async function apiMarkNotificationRead(id: string | number): Promise<void> {
  await request<unknown>(`/notifications/${id}/read`, { method: 'PATCH' });
}

export async function apiMarkAllNotificationsRead(): Promise<void> {
  await request<unknown>('/notifications/read-all', { method: 'PATCH' });
}



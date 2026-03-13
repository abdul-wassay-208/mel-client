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



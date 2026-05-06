const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export class ApiError extends Error {
  constructor(message: string, public status: number) {
    super(message);
  }
}

async function apiFetch<T>(
  path: string,
  options: RequestInit & { token?: string } = {}
): Promise<T> {
  const { token, ...rest } = options;
  const res = await fetch(`${API_URL}${path}`, {
    ...rest,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(rest.headers ?? {}),
    },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new ApiError(body.detail ?? `HTTP ${res.status}`, res.status);
  }
  return res.json() as Promise<T>;
}

export type AdminUser = {
  id: number;
  name: string;
  email: string;
  carrera: string;
  is_blocked: boolean;
  created_at: string | null;
};

export type FeedbackItem = {
  id: string;
  user_email: string;
  type: "sugerencia" | "bug";
  title: string;
  description: string;
  status: "pendiente" | "revisado";
  created_at: string | null;
};

export const api = {
  login: (email: string, password: string) =>
    apiFetch<{ access_token: string; token_type: string }>("/admin/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),
  getUsers: (token: string) => apiFetch<AdminUser[]>("/admin/users", { token }),
  updateUser: (token: string, email: string, name: string, carrera: string) =>
    apiFetch<{ success: boolean }>(`/admin/users/${encodeURIComponent(email)}`, {
      method: "PUT",
      token,
      body: JSON.stringify({ name, carrera }),
    }),
  deleteUser: (token: string, email: string) =>
    apiFetch<{ success: boolean }>(`/admin/users/${encodeURIComponent(email)}`, {
      method: "DELETE",
      token,
    }),
  toggleBlock: (token: string, email: string) =>
    apiFetch<{ is_blocked: boolean }>(`/admin/users/${encodeURIComponent(email)}/block`, {
      method: "PUT",
      token,
    }),
  sendNotification: (token: string, email: string, message: string) =>
    apiFetch<{ success: boolean }>(`/admin/notifications/${encodeURIComponent(email)}`, {
      method: "POST",
      token,
      body: JSON.stringify({ message }),
    }),
  getFeedback: (token: string) => apiFetch<FeedbackItem[]>("/admin/feedback", { token }),
  updateFeedbackStatus: (token: string, id: string, status: string) =>
    apiFetch<{ success: boolean }>(`/admin/feedback/${id}/status`, {
      method: "PUT",
      token,
      body: JSON.stringify({ status }),
    }),
};

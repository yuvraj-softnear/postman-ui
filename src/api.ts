import type {
  Collection,
  Environment,
  HistoryItem,
  HistorySummary,
  ProxyResult,
  SavedRequest,
  User,
} from "./types";

export class ApiError extends Error {}

let onUnauthorized = () => {};

export function setUnauthorizedHandler(handler: () => void) {
  onUnauthorized = handler;
}

export function getToken(): string | null {
  return localStorage.getItem("api-client-token");
}

export function setToken(token: string | null) {
  if (token) localStorage.setItem("api-client-token", token);
  else localStorage.removeItem("api-client-token");
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers);
  if (options.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  const token = getToken();
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const response = await fetch(path, { ...options, headers });
  const text = await response.text();
  let data: { success?: boolean; error?: { message?: string } } = {};
  if (text) {
    try {
      data = JSON.parse(text) as typeof data;
    } catch {
      throw new ApiError("The server returned an unreadable response");
    }
  }

  if (response.status === 401 && !path.endsWith("/login") && !path.endsWith("/register")) {
    setToken(null);
    onUnauthorized();
  }

  if (!response.ok || data.success === false) {
    throw new ApiError(data.error?.message || "Request failed");
  }
  return data as T;
}

export const api = {
  register: (body: { name: string; email: string; password: string }) =>
    request<{ token: string; user: User }>("/api/auth/register", { method: "POST", body: JSON.stringify(body) }),
  login: (body: { email: string; password: string }) =>
    request<{ token: string; user: User }>("/api/auth/login", { method: "POST", body: JSON.stringify(body) }),
  me: () => request<{ user: User }>("/api/auth/me"),
  collections: () => request<{ collections: Collection[] }>("/api/collections"),
  createCollection: (body: { name: string; description?: string | null }) =>
    request<{ collection: { id: number; name: string } }>("/api/collections", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  updateCollection: (id: number, body: { name: string; description: string | null }) =>
    request(`/api/collections/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
  deleteCollection: (id: number) => request(`/api/collections/${id}`, { method: "DELETE" }),
  shareCollection: (id: number, body: { email: string; role: "EDITOR" | "VIEWER" }) =>
    request(`/api/collections/${id}/share`, { method: "POST", body: JSON.stringify(body) }),
  unshareCollection: (id: number, userId: number) =>
    request(`/api/collections/${id}/members/${userId}`, { method: "DELETE" }),
  importCollection: (collection: unknown) =>
    request<{ collection: { id: number; name: string } }>("/api/collections/import", {
      method: "POST",
      body: JSON.stringify(collection),
    }),
  exportCollection: async (id: number) => {
    const token = getToken();
    const response = await fetch(`/api/collections/${id}/export`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!response.ok) {
      const data = (await response.json().catch(() => ({}))) as { error?: { message?: string } };
      throw new ApiError(data.error?.message || "Export failed");
    }
    return response.json() as Promise<unknown>;
  },
  createFolder: (collectionId: number, body: { name: string; parentId?: number | null }) =>
    request<{ folder: { id: number } }>(`/api/collections/${collectionId}/folders`, {
      method: "POST",
      body: JSON.stringify(body),
    }),
  renameFolder: (id: number, name: string) =>
    request(`/api/folders/${id}`, { method: "PATCH", body: JSON.stringify({ name }) }),
  deleteFolder: (id: number) => request(`/api/folders/${id}`, { method: "DELETE" }),
  createRequest: (collectionId: number, body: { name?: string; folderId?: number | null }) =>
    request<{ request: SavedRequest }>(`/api/collections/${collectionId}/requests`, {
      method: "POST",
      body: JSON.stringify(body),
    }),
  getRequest: (id: number) => request<{ request: SavedRequest }>(`/api/requests/${id}`),
  updateRequest: (id: number, body: unknown) =>
    request<{ request: SavedRequest }>(`/api/requests/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
  deleteRequest: (id: number) => request(`/api/requests/${id}`, { method: "DELETE" }),
  environments: () => request<{ environments: Environment[] }>("/api/environments"),
  createEnvironment: (body: { name: string; isShared?: boolean }) =>
    request<{ environment: { id: number } }>("/api/environments", { method: "POST", body: JSON.stringify(body) }),
  updateEnvironment: (id: number, body: { name?: string; isShared?: boolean }) =>
    request(`/api/environments/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
  saveVariables: (
    id: number,
    variables: { key: string; value: string | null; isSecret: boolean; enabled: boolean }[]
  ) => request(`/api/environments/${id}/variables`, { method: "PUT", body: JSON.stringify({ variables }) }),
  deleteEnvironment: (id: number) => request(`/api/environments/${id}`, { method: "DELETE" }),
  history: () => request<{ history: HistorySummary[] }>("/api/history"),
  historyItem: (id: number) => request<{ item: HistoryItem }>(`/api/history/${id}`),
  deleteHistoryItem: (id: number) => request(`/api/history/${id}`, { method: "DELETE" }),
  clearHistory: () => request("/api/history", { method: "DELETE" }),
  send: (body: unknown) => request<{ result: ProxyResult }>("/api/proxy", { method: "POST", body: JSON.stringify(body) }),
};

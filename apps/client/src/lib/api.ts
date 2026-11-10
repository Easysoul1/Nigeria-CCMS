const API_BASE = `${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000"}/api/v1`;

let refreshing: Promise<boolean> | null = null;

type RequestOptions = { redirectOnUnauthorized?: boolean; skipRefresh?: boolean };

export class ApiError extends Error {
  readonly statusCode: number;
  readonly code?: string;
  readonly details?: unknown;
  readonly requestId?: string;

  constructor(statusCode: number, code: string | undefined, message: string, details?: unknown, requestId?: string) {
    super(message);
    this.name = "ApiError";
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    this.requestId = requestId;
  }
}

function readCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.split("; ").find((part) => part.startsWith(`${name}=`));
  return match ? decodeURIComponent(match.slice(name.length + 1)) : null;
}

function isOnLoginPage(): boolean {
  return typeof window !== "undefined" && window.location.pathname === "/login";
}

function redirectToLogin(): void {
  if (typeof window === "undefined" || isOnLoginPage()) return;
  window.location.assign("/login");
}

async function parseError(res: Response): Promise<ApiError> {
  const body: unknown = await res.json().catch(() => null);
  const record = typeof body === "object" && body !== null ? (body as Record<string, unknown>) : {};
  const message = typeof record.message === "string" ? record.message : `Request failed with status ${res.status}`;
  const code = typeof record.code === "string" ? record.code : undefined;
  const requestId = typeof record.requestId === "string" ? record.requestId : undefined;
  return new ApiError(res.status, code, message, record.details, requestId);
}

async function request<T>(path: string, init: RequestInit = {}, retry = true, options: RequestOptions = {}): Promise<T> {
  const method = (init.method ?? "GET").toUpperCase();
  const headers: Record<string, string> = {
    Accept: "application/json",
    ...((init.headers as Record<string, string> | undefined) ?? {}),
  };

  // Only declare a JSON body when one exists; otherwise every GET would need a
  // CORS preflight.
  if (init.body !== undefined && init.body !== null && !headers["Content-Type"]) {
    headers["Content-Type"] = "application/json";
  }

  // Double-submit CSRF token for cookie-authenticated mutations.
  if (!["GET", "HEAD", "OPTIONS"].includes(method)) {
    const csrf = readCookie("csrf_token");
    if (csrf && !headers["x-csrf-token"]) headers["x-csrf-token"] = csrf;
  }

  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    credentials: "include",
    headers,
  });

  if (res.status === 401 && retry && !options.skipRefresh) {
    if (!refreshing) {
      refreshing = fetch(`${API_BASE}/auth/refresh`, { method: "POST", credentials: "include" })
        .then((r) => r.ok)
        .catch(() => false)
        .finally(() => {
          refreshing = null;
        });
    }
    const refreshed = await refreshing;
    if (refreshed) return request<T>(path, init, false, options);
    if (options.redirectOnUnauthorized !== false) redirectToLogin();
    throw new ApiError(401, "UNAUTHENTICATED", "Your session has expired. Please sign in again.");
  }

  if (!res.ok) throw await parseError(res);
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export const api = {
  get: <T>(p: string, options?: RequestOptions) => request<T>(p, { method: "GET" }, true, options),
  post: <T>(p: string, body?: unknown, options?: RequestOptions) =>
    request<T>(p, { method: "POST", body: body === undefined ? undefined : JSON.stringify(body) }, true, options),
  patch: <T>(p: string, body?: unknown, options?: RequestOptions) =>
    request<T>(p, { method: "PATCH", body: body === undefined ? undefined : JSON.stringify(body) }, true, options),
  delete: <T>(p: string, options?: RequestOptions) => request<T>(p, { method: "DELETE" }, true, options),
};

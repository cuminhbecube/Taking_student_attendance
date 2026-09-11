const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api';

export interface ApiErrorPayload {
  error?: string;
  message?: string;
  [key: string]: unknown;
}

export class ApiError extends Error {
  status: number;
  payload?: ApiErrorPayload;

  constructor(status: number, message: string, payload?: ApiErrorPayload) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.payload = payload;
  }
}

function getToken() {
  return localStorage.getItem('ea_access_token');
}

// Bearer token support is retained for developer tooling/legacy sessions.
// The production browser flow uses the HttpOnly ea_session cookie instead.
export function setAccessToken(token: string | null) {
  if (token) localStorage.setItem('ea_access_token', token);
  else localStorage.removeItem('ea_access_token');
}

export async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers = new Headers(init.headers);
  if (!headers.has('Content-Type') && init.body) headers.set('Content-Type', 'application/json');
  if (token) headers.set('Authorization', `Bearer ${token}`);

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers,
    credentials: 'include'
  });
  const payload = response.status === 204 ? null : await response.json().catch(() => null);

  if (!response.ok) {
    const apiPayload = (payload ?? {}) as ApiErrorPayload;
    throw new ApiError(response.status, apiPayload.message || `API request failed: ${response.status}`, apiPayload);
  }

  return payload as T;
}

export { API_BASE_URL };

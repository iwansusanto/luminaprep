const BASE_URL = '/api';


export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';

export interface RequestOptions {
  method?: HttpMethod;
  body?: any;
  headers?: Record<string, string>;
  version?: string;
  token?: string;
}

/** Get auth headers from localStorage */
/** Get auth headers (currently empty as BFF handles token injection via cookies) */
export function getAuthHeaders(): Record<string, string> {
  return {};
}

/**
 * Drop-in replacement for fetch() that auto-injects Bearer token.
 * Auto-clears token and reloads on 401.
 */
export async function authFetch(url: string, init: RequestInit = {}): Promise<Response> {
  const headers = {
    ...getAuthHeaders(),
    ...(init.headers as Record<string, string> || {}),
  };
  const res = await fetch(url, { ...init, headers });

  // Auto-logout on 401 — token expired or invalid
  // Auto-logout on 401 — session expired or invalid
  if (res.status === 401) {
    window.location.href = '/login';
  }

  return res;
}

/**
 * Generic typed API request handler.
 * Auto-injects Bearer token from localStorage.
 */
export const apiRequest = async <T>(path: string, options: RequestOptions = {}): Promise<T> => {
  const { method = 'GET', body, headers = {}, version = 'v1' } = options;

  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  const url = `${BASE_URL}/${version}${cleanPath}`;

  const requestHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    ...headers,
  };

  const response = await fetch(url, {
    method,
    headers: requestHeaders,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    // Auto-logout on 401
    if (response.status === 401) {
      window.location.href = '/login';
    }
    let errorData;
    try {
      errorData = await response.json();
    } catch {
      errorData = { message: `Request failed with status ${response.status}` };
    }
    throw new Error(errorData.detail || errorData.message || errorData.error || `API request failed with status ${response.status}`);
  }

  // 204 No Content — return null, don't try to parse empty body
  if (response.status === 204) {
    return null as T;
  }

  return response.json();
};

export const api = {
  get: <T>(path: string, options?: Omit<RequestOptions, 'method'>) =>
    apiRequest<T>(path, { ...options, method: 'GET' }),

  post: <T>(path: string, body?: any, options?: Omit<RequestOptions, 'method' | 'body'>) =>
    apiRequest<T>(path, { ...options, method: 'POST', body }),

  put: <T>(path: string, body?: any, options?: Omit<RequestOptions, 'method' | 'body'>) =>
    apiRequest<T>(path, { ...options, method: 'PUT', body }),

  patch: <T>(path: string, body?: any, options?: Omit<RequestOptions, 'method' | 'body'>) =>
    apiRequest<T>(path, { ...options, method: 'PATCH', body }),

  delete: <T>(path: string, options?: Omit<RequestOptions, 'method'>) =>
    apiRequest<T>(path, { ...options, method: 'DELETE' }),
};

const BASE_URL = '/api';
export const TOKEN_KEY = 'lumina_token';

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';

export interface RequestOptions {
  method?: HttpMethod;
  body?: any;
  headers?: Record<string, string>;
  version?: string;
  token?: string;
}

/** Get auth headers from localStorage */
export function getAuthHeaders(): Record<string, string> {
  const token = localStorage.getItem(TOKEN_KEY);
  return token ? { Authorization: `Bearer ${token}` } : {};
}

/**
 * Drop-in replacement for fetch() that auto-injects Bearer token.
 * Use this instead of raw fetch() for all API calls.
 */
export async function authFetch(url: string, init: RequestInit = {}): Promise<Response> {
  const headers = {
    ...getAuthHeaders(),
    ...(init.headers as Record<string, string> || {}),
  };
  return fetch(url, { ...init, headers });
}

/**
 * Generic typed API request handler.
 * Auto-injects Bearer token from localStorage.
 */
export const apiRequest = async <T>(path: string, options: RequestOptions = {}): Promise<T> => {
  const { method = 'GET', body, headers = {}, version = 'v1', token } = options;

  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  const url = `${BASE_URL}/${version}${cleanPath}`;

  const storedToken = token || localStorage.getItem(TOKEN_KEY);

  const requestHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    ...headers,
  };

  if (storedToken) {
    requestHeaders['Authorization'] = `Bearer ${storedToken}`;
  }

  const response = await fetch(url, {
    method,
    headers: requestHeaders,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    let errorData;
    try {
      errorData = await response.json();
    } catch {
      errorData = { message: `Request failed with status ${response.status}` };
    }
    throw new Error(errorData.detail || errorData.message || errorData.error || `API request failed with status ${response.status}`);
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

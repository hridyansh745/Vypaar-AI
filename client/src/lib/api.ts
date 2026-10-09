/**
 * Thin API client for the VyaparAI backend.
 * - Same-origin requests (Vite proxies /api during development)
 * - Cookies included so session/draft authorization works
 * - Normalised error shape: ApiError { status, code, message }
 */

export class ApiError extends Error {
  status: number;
  code: string;
  details?: Record<string, string[]> | undefined;

  constructor(status: number, code: string, message: string, details?: Record<string, string[]>) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

type RequestOptions = {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  body?: unknown;
  formData?: FormData;
  onUploadProgress?: (percent: number) => void;
  signal?: AbortSignal;
};

const UNAUTHORIZED_EVENT = 'vyaparai:unauthorized';

function parseErrorPayload(status: number, payload: unknown): ApiError {
  const fallbackMessage = 'Request failed';
  if (payload && typeof payload === 'object') {
    const p = payload as Record<string, unknown>;
    const nested = (p.error ?? p) as Record<string, unknown>;
    const code = typeof nested.code === 'string' ? nested.code : `http_${status}`;
    const message = typeof nested.message === 'string' ? nested.message : fallbackMessage;
    const details =
      nested.details && typeof nested.details === 'object'
        ? (nested.details as Record<string, string[]>)
        : undefined;
    return new ApiError(status, code, message, details);
  }
  return new ApiError(status, `http_${status}`, fallbackMessage);
}

function handleUnauthorized(status: number) {
  if (status === 401) {
    window.dispatchEvent(new CustomEvent(UNAUTHORIZED_EVENT));
  }
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, formData, signal } = options;

  let response: Response;
  try {
    response = await fetch(path, {
      method,
      credentials: 'include',
      headers: formData ? undefined : { 'Content-Type': 'application/json' },
      body: formData ?? (body !== undefined ? JSON.stringify(body) : undefined),
      signal,
    });
  } catch (err) {
    if ((err as Error).name === 'AbortError') throw err;
    throw new ApiError(0, 'network_error', 'Cannot reach the server');
  }

  handleUnauthorized(response.status);

  if (response.status === 204) return undefined as T;

  const text = await response.text();
  let payload: unknown = null;
  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      payload = null;
    }
  }

  if (!response.ok) throw parseErrorPayload(response.status, payload);
  return payload as T;
}

/** Upload with progress (XHR — fetch has no upload progress support). */
function upload<T>(path: string, formData: FormData, onUploadProgress?: (pct: number) => void): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', path, true);
    xhr.withCredentials = true;

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable && onUploadProgress) {
        onUploadProgress(Math.min(99, Math.round((event.loaded / event.total) * 100)));
      }
    };

    xhr.onload = () => {
      let payload: unknown = null;
      try {
        payload = xhr.responseText ? JSON.parse(xhr.responseText) : null;
      } catch {
        payload = null;
      }
      handleUnauthorized(xhr.status);
      if (xhr.status >= 200 && xhr.status < 300) {
        onUploadProgress?.(100);
        resolve(payload as T);
      } else {
        reject(parseErrorPayload(xhr.status, payload));
      }
    };

    xhr.onerror = () => reject(new ApiError(0, 'network_error', 'Cannot reach the server'));
    xhr.ontimeout = () => reject(new ApiError(0, 'network_error', 'Request timed out'));
    xhr.send(formData);
  });
}

export const api = {
  get: <T>(path: string, options?: RequestOptions) => request<T>(path, { ...options, method: 'GET' }),
  post: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>(path, { ...options, method: 'POST', body }),
  patch: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>(path, { ...options, method: 'PATCH', body }),
  del: <T>(path: string, options?: RequestOptions) => request<T>(path, { ...options, method: 'DELETE' }),
  upload,
  UNAUTHORIZED_EVENT,
};

export function errorMessageKey(code: string): string | null {
  return code && /^([a-z_]+)$/.test(code) ? `errors.${code}` : null;
}

import { getCookie } from 'cookies-next';
import { notify } from '../notifications/notify';
import { humanizeZodFlatten, isZodFlatten, type ZodFlatten } from './zodFlatten';

// Re-exported so existing importers keep working; pure helpers live in ./zodFlatten
// (importable outside lib/services — the lint gate bars only the client module).
export { humanizeZodFlatten, isZodFlatten };

/** Extract a human-readable message from a parsed error body. */
export function extractErrorMessage(result: Record<string, unknown>, status: number, statusText: string): string {
  if (isZodFlatten(result?.error)) return humanizeZodFlatten(result.error as ZodFlatten);
  return String(result?.message || result?.error || `Erro ${status}: ${statusText}`);
}

/** Per-call options: `RequestInit` plus two client knobs that are stripped before `fetch`. */
export interface ApiRequestOptions extends RequestInit {
  /** Skip the automatic error toast — for callers that render their own error UI. */
  silent?: boolean;
  /**
   * Bearer token to send instead of the `auth_token` cookie. Needed in SSR (`getServerSideProps`), where
   * `getCookie` has no `req` and reads nothing; pass the token parsed from `req.headers.cookie`.
   */
  token?: string;
}

/**
 * Global API Client for Luminaris Frontend.
 * Centralizes endpoint management, auth headers, and error parsing.
 */
class ApiClient {
  private get baseUrl() {
    return process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001/api';
  }

  private getHeaders(customHeaders?: HeadersInit, explicitToken?: string): HeadersInit {
    const token = explicitToken ?? getCookie('auth_token');

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    // The user's timezone only exists in the browser; on the server Intl reports the Node host's zone,
    // which is not the user's — so SSR requests omit the header and the backend applies its default.
    if (typeof window !== 'undefined') {
      let timezone = 'UTC';
      try {
        if (typeof Intl !== 'undefined') {
          timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
        }
      } catch (e) {
        // fallback to UTC
      }
      headers['x-user-timezone'] = timezone;
    }

    Object.assign(headers, (customHeaders as Record<string, string>) || {});

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    return headers as HeadersInit;
  }

  /**
   * Universal request handler with automatic error parsing.
   */
  private async request<T>(path: string, options: ApiRequestOptions): Promise<T> {
    const url = `${this.baseUrl}${path.startsWith('/') ? path : `/${path}`}`;
    const { silent, token, ...init } = options;

    try {
      const response = await fetch(url, {
        ...init,
        headers: this.getHeaders(init.headers, token),
      });

      const bodyText = await response.text();
      let result: Record<string, unknown>;
      let parsed = true;

      try {
        result = bodyText ? JSON.parse(bodyText) : {};
      } catch {
        parsed = false;
        result = {};
      }

      if (!response.ok) {
        // A non-JSON error body (proxy HTML page, crash) carries no fields: the toast falls back to
        // "Erro <status>: <statusText>" and the caller gets just `{ status }` — never a made-up `error`.
        const errorMessage = extractErrorMessage(result, response.status, response.statusText);
        if (!silent) notify(errorMessage, 'error', 'Erro');
        // Return the parsed error object (usually { success: false, error: '...' }),
        // tagged with the HTTP status so callers can branch (e.g. `if (o.status === 400)`).
        throw { ...result, status: response.status };
      }

      if (!parsed) result = { error: 'Failed to parse server response' };
      return result as T;
    } catch (error) {
      // Re-throw our parsed error object (it always has `status`, even when the body was empty) or a native
      // error with a message (network failure, abort); wrap anything else.
      if (typeof error === 'object' && error !== null && ('status' in error || 'error' in error || 'message' in error)) {
        throw error;
      }
      throw { error: (error as Error).message || 'Network request failed' };
    }
  }

  public get<T>(path: string, options?: ApiRequestOptions): Promise<T> {
    return this.request<T>(path, { ...options, method: 'GET' });
  }

  public post<T>(path: string, body: object, options?: ApiRequestOptions): Promise<T> {
    return this.request<T>(path, {
      ...options,
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  public put<T>(path: string, body: object, options?: ApiRequestOptions): Promise<T> {
    return this.request<T>(path, {
      ...options,
      method: 'PUT',
      body: JSON.stringify(body),
    });
  }

  public delete<T>(path: string, options?: ApiRequestOptions): Promise<T> {
    return this.request<T>(path, { ...options, method: 'DELETE' });
  }

  public patch<T>(path: string, body: object, options?: ApiRequestOptions): Promise<T> {
    return this.request<T>(path, {
      ...options,
      method: 'PATCH',
      body: JSON.stringify(body),
    });
  }
}

export const apiClient = new ApiClient();

import { getCookie } from 'cookies-next';
import { notify } from '../notifications/notify';
import { markNotified } from '../notifications/notified';
import { humanizeZodFlatten, isZodFlatten, type ZodFlatten } from './zodFlatten';
import { emitSessionExpired } from './sessionExpired';

// Re-exported so existing importers keep working; pure helpers live in ./zodFlatten
// (importable outside lib/services — the lint gate bars only the client module).
export { humanizeZodFlatten, isZodFlatten };

/** BRD F-72.4 (decisão do dono, 10/11): limite de tempo por requisição à API. */
export const API_TIMEOUT_MS = 60_000;
export const API_TIMEOUT_MESSAGE = 'O servidor demorou demais para responder. Tente de novo.';

/** Extract a human-readable message from a parsed error body. */
export function extractErrorMessage(result: Record<string, unknown>, status: number, statusText: string): string {
  if (isZodFlatten(result?.error)) return humanizeZodFlatten(result.error as ZodFlatten);
  return String(result?.message || result?.error || `Erro ${status}: ${statusText}`);
}

/** Shown (toast and rejection message) when `fetch` itself fails: no connection, DNS, CORS. */
export const NETWORK_ERROR_MESSAGE = 'Não foi possível conectar ao servidor. Verifique sua conexão e tente novamente.';

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
      const headers = this.getHeaders(init.headers, token) as Record<string, string>;
      // BRD F-72.4 (decisão do dono, 10/11): 60 s de limite; o signal do chamador, se houver, continua valendo.
      const timeout = AbortSignal.timeout(API_TIMEOUT_MS);
      const signal = init.signal ? AbortSignal.any([init.signal, timeout]) : timeout;
      let response: Response;
      try {
        response = await fetch(url, { ...init, headers, signal });
      } catch (networkError) {
        if (networkError instanceof DOMException && networkError.name === 'TimeoutError') {
          if (!silent) notify(API_TIMEOUT_MESSAGE, 'error', 'Erro');
          throw markNotified(new Error(API_TIMEOUT_MESSAGE), !silent);
        }
        // BRD F-72.1: a network failure gets the same treatment as an HTTP error (toast + Error with the
        // toast text), without `status` — callers read "no status" as "no response". Aborts pass through.
        if (!(networkError instanceof TypeError)) throw networkError;
        if (!silent) notify(NETWORK_ERROR_MESSAGE, 'error', 'Erro');
        throw markNotified(new Error(NETWORK_ERROR_MESSAGE), !silent);
      }
      // Só com token enviado: o 401 do login (sem sessão) é credencial errada, não sessão expirada.
      if (response.status === 401 && headers['Authorization']) emitSessionExpired();

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
        // Reject with an Error (message = the toast text) carrying the parsed body's fields, the raw `body`
        // (non-enumerable, so `{ ...err }` stays body + status) and the HTTP status so callers can branch.
        const httpError = Object.assign(new Error(errorMessage), result, { status: response.status });
        Object.defineProperty(httpError, 'body', { value: result });
        throw markNotified(httpError, !silent);
      }

      if (!parsed) {
        // BRD F-72.2: 2xx com corpo não-JSON (página de proxy, resposta cortada) é falha, não dado de sucesso.
        const message = 'Resposta inválida do servidor.';
        if (!silent) notify(message, 'error', 'Erro');
        throw markNotified(Object.assign(new Error(message), { status: response.status }), !silent);
      }
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

import { getCookie } from 'cookies-next';

/**
 * Multipart helpers (FE-INCR-NFE, F-FENFE-7 → a): extracted BY MOVE from `accounting.service.ts`
 * (`reconBaseUrl`/`reconAuthHeaders`/`reconParseError`) so a third copy of the same technique does not
 * appear in `nfe.service.ts`. `apiClient` forces `application/json`, so every file upload goes through
 * plain `fetch` + `FormData`; the browser sets the multipart boundary — never set `Content-Type` here.
 * `crm.service.ts` still carries its own copy (registered as an out-of-scope finding in the BRIEF).
 *
 * `postMultipart` below is an ADDITIVE extension (FE-INCR-COMPLIANCE-2, Fork F-COMP2-7 → b):
 * the referential-catalog import (`referential.service.ts`) is a 4th multipart call site — this
 * generic wrapper around the three primitives above avoids yet another inlined
 * fetch+FormData+parseError block. It does not rename or remove the primitives that
 * `accounting.service.ts`/`nfe.service.ts` already depend on.
 */
export function multipartBaseUrl(): string {
  return process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001/api';
}

export function multipartAuthHeaders(): Record<string, string> {
  const token = getCookie('auth_token');
  const headers: Record<string, string> = {};
  if (token) headers['Authorization'] = `Bearer ${String(token)}`;
  return headers;
}

/** Same shape `apiClient` throws (`{ ...serverBody, status }`) so `resolveError` reads it unchanged. */
export async function multipartParseError(response: Response): Promise<Record<string, unknown>> {
  let body: Record<string, unknown> = {};
  try {
    const text = await response.text();
    body = text ? (JSON.parse(text) as Record<string, unknown>) : {};
  } catch {
    body = {};
  }
  if (!body.error && !body.message) {
    body.error = `Erro ${response.status}: ${response.statusText}`;
  }
  body.status = response.status;
  return body;
}

interface Envelope<T> {
  success: boolean;
  data: T;
}

/**
 * POST a `FormData` body to `${multipartBaseUrl()}${path}` and unwrap the backend's
 * `{ success, data }` envelope. Built on the three primitives above — never duplicates them.
 */
export async function postMultipart<T>(path: string, form: FormData): Promise<T> {
  const response = await fetch(`${multipartBaseUrl()}${path}`, {
    method: 'POST',
    headers: multipartAuthHeaders(),
    body: form,
  });
  if (!response.ok) throw await multipartParseError(response);
  const res = (await response.json()) as Envelope<T>;
  return res.data;
}

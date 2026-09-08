import { getCookie } from 'cookies-next';

/**
 * Multipart helpers (FE-INCR-NFE, F-FENFE-7 → a): extracted BY MOVE from `accounting.service.ts`
 * (`reconBaseUrl`/`reconAuthHeaders`/`reconParseError`) so a third copy of the same technique does not
 * appear in `nfe.service.ts`. `apiClient` forces `application/json`, so every file upload goes through
 * plain `fetch` + `FormData`; the browser sets the multipart boundary — never set `Content-Type` here.
 * `crm.service.ts` still carries its own copy (registered as an out-of-scope finding in the BRIEF).
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

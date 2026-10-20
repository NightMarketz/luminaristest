import { apiClient } from '../api/api-client';
import type { ChatInterviewInput } from '@/types/contracts/interview/ChatInterviewDto.gen';

/**
 * interview.service.ts
 *
 * AI onboarding interview endpoints (`/dashboard/ai/*`). Moved from `features/interview`
 * (`useAiInterview.ts`, `RightSidebar/AIChatMode.tsx`) for lint R2b (`DEBT: fetch`). The create step
 * (`POST /dashboard/create`) stays in `SetupService.createDashboard`.
 *
 * Both endpoints answer with a raw body (no `{ success, data }` envelope), returned as-is. Every
 * rejection becomes an `InterviewApiError` carrying the HTTP `status` (absent when no response
 * arrived) and the parsed error `body`, so callers can branch on `status`/`body.code` as they did on
 * the raw `Response`. Calls are `silent` (no apiClient toast): the interview renders its own errors.
 */

export class InterviewApiError extends Error {
  constructor(
    message: string,
    /** HTTP status; `undefined` when the request never got a response. */
    readonly status?: number,
    /** Parsed error body (`{}` when there was none). */
    readonly body: Record<string, unknown> = {},
  ) {
    super(message);
    this.name = 'InterviewApiError';
  }
}

/**
 * Body `AIChatMode` posts to `/dashboard/ai/CustomizeFields`. NOTE: it does not match the generated
 * `CustomizeFieldsDtoInput` (`kind`-discriminated, `.strict()` on the server) — kept verbatim because
 * this move must not change behavior; aligning the component with W6 is separate work.
 */
export interface LegacyCustomizeFieldsBody {
  sessionId: string | null;
  tableKey: string;
  userMessage: string;
  conversationHistory: { role: string; content: string }[];
}

function toInterviewError(err: unknown): InterviewApiError {
  const e = (err ?? {}) as Record<string, unknown>;
  const message = typeof e.message === 'string' && e.message
    ? e.message
    : typeof e.error === 'string' && e.error ? e.error : 'Network request failed';
  if (typeof e.status === 'number') {
    const { status, ...body } = e;
    return new InterviewApiError(message, status as number, body);
  }
  // No status = no response: apiClient rethrows the native error (e.g. TypeError 'Failed to fetch').
  return new InterviewApiError(message);
}

async function call<T>(req: () => Promise<T>): Promise<T> {
  try {
    return await req();
  } catch (err) {
    throw toInterviewError(err);
  }
}

export const InterviewService = {
  /** POST /dashboard/ai/ChatInterview — one interview turn; the reply shape is read by the caller. */
  chatInterview<T>(input: ChatInterviewInput, signal?: AbortSignal): Promise<T> {
    return call(() => apiClient.post<T>('/dashboard/ai/ChatInterview', input, { silent: true, ...(signal ? { signal } : {}) }));
  },

  /** POST /dashboard/ai/CustomizeFields — the field-customization panel turn. */
  customizeFields(input: LegacyCustomizeFieldsBody): Promise<unknown> {
    return call(() => apiClient.post<unknown>('/dashboard/ai/CustomizeFields', input, { silent: true }));
  },
};

import { apiClient } from '../api/api-client';
import type { ChatInterviewInput } from '@/types/contracts/interview/ChatInterviewDto.gen';
import type { CustomizeFieldsDtoInput } from '@/types/contracts/interview/CustomizeFields.dto.gen';

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

/** LGPD art. 5º, II — categorias que o servidor marca num campo proposto (W6 F-W6-6; `FieldCustomizationService/Types.ts`). */
export type SensitiveCategory =
  | 'health' | 'sex_life' | 'genetic' | 'biometric' | 'racial_ethnic'
  | 'religious' | 'political' | 'union_or_org' | 'health_or_other_unspecified';

/** Campo como o servidor o devolve (`AdvancedFieldSchema` canônico; só o que o painel lê). */
export interface CustomizeFieldsField {
  name: string;
  label: string;
  type: string;
  required?: boolean;
  hidden?: boolean;
  options?: string[];
}

export type CustomizeFieldsChange =
  | { action: 'add'; field: CustomizeFieldsField; sensitiveCategory: SensitiveCategory | null; presetKey: string | null }
  | { action: 'update'; originalName: string; field: CustomizeFieldsField; sensitiveCategory: SensitiveCategory | null }
  | { action: 'remove'; originalName: string };

export interface CustomizeFieldsHistoryEntry {
  role: 'user' | 'assistant' | 'system';
  content: string;
  at: string;
}

/** Tabela da sessão depois do turno (`ICustomizableTable` do servidor; só o que o painel lê). */
export interface CustomizeFieldsTable {
  key: string;
  name: string;
  description: string;
  isCore?: boolean;
  fields?: CustomizeFieldsField[];
  conversationHistory: CustomizeFieldsHistoryEntry[];
  /** A proposta que espera Aplicar/Descartar (§2.4) — sem `requiresSensitiveAck`, que só vem no turno. */
  pendingProposal?: { id: string; changes: CustomizeFieldsChange[]; createdAt: string };
}

/**
 * Resposta 200 de `/dashboard/ai/CustomizeFields` (W6, BRIEF §2.2; `CustomizeFieldsResult` em
 * `server/src/features/interview/FieldCustomizationService/index.ts`). Não é DTO de entrada, então não há `.gen.ts`.
 */
export interface CustomizeFieldsResult {
  sessionId: string;
  tableKey: string;
  table: CustomizeFieldsTable;
  conversationHistory: CustomizeFieldsHistoryEntry[];
  proposal: { id: string; changes: CustomizeFieldsChange[]; requiresSensitiveAck: boolean } | null;
  discarded: Array<{ name: string; reason: 'reserved' | 'type_not_allowed' | 'exists' | 'not_found' | 'invalid' }>;
  /** Só em `kind:'decision'`. */
  applied?: boolean;
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

  /**
   * POST /dashboard/ai/CustomizeFields — a turn of the field-customization panel (W6): `kind:'message'` gets a
   * proposal, `kind:'decision'` applies or discards it. Body typed by the generated `.strict()` DTO.
   */
  customizeFields(input: CustomizeFieldsDtoInput): Promise<CustomizeFieldsResult> {
    return call(() => apiClient.post<CustomizeFieldsResult>('/dashboard/ai/CustomizeFields', input, { silent: true }));
  },
};

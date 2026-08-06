import { apiClient } from '../api/api-client';
import { notify } from '../notifications/notify';
import type { JournalEntryWithFullPostings, PostingLineInput } from './accounting.service';

/**
 * Maker-checker approval tower (ADR-INCR-APPROVAL) — thin typed client over
 * `/api/entry-approvals/*`. Every invariant lives on the backend
 * (EntryApprovalService); this only shapes requests/responses.
 *
 * Three things the UI must respect and this module encodes:
 * - **State moves by COMMANDS** (ACC-016): one method per command, no generic
 *   status PATCH. `approve` also POSTS (F5: approve == post).
 * - **Optimistic CAS** (ACC-023): every mutation carries `expectedVersion` — the
 *   `version` the caller last read. A stale value is a 409 `CONFLICT`, which the
 *   caller must surface as "someone changed this entry", not a generic failure.
 * - **fiscalYear/entryNumber are born at approve** (ACC-015): they are `null` on a
 *   draft/pending entry, so the UI must not present a number before it exists.
 *
 * Money is INTEGER CENTS end to end; dates are date-only `YYYY-MM-DD` strings.
 */

const CTX = 'Aprovações';

/** The standard server response envelope: { success, data }. */
interface ApiEnvelope<T> {
  success: boolean;
  data: T;
}

/** Entries in the tower carry the same read shape as `listEntries` (postings + account). */
export type ApprovalEntry = JournalEntryWithFullPostings;

export interface ListPendingQuery {
  unitId: string;
  page?: number;
  limit?: number;
}

export interface ListPendingResult {
  entries: ApprovalEntry[];
  total: number;
}

export interface CreateDraftPayload {
  unitId: string;
  /** YYYY-MM-DD */
  date: string;
  description: string;
  /** At least 2 legs; each leg moves exactly one side (debit XOR credit). */
  lines: PostingLineInput[];
}

export interface UpdateDraftPayload extends CreateDraftPayload {
  /** The `version` last read from the server (ACC-023 CAS). */
  expectedVersion: number;
}

export interface VersionedPayload {
  unitId: string;
  expectedVersion: number;
}

export interface RejectPayload extends VersionedPayload {
  reason?: string;
}

/** Build a `?a=x&b=y` query string, dropping undefined/empty values and encoding. */
function buildQuery(params: Record<string, string | undefined>): string {
  const pairs = Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== '')
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v as string)}`);
  return pairs.length ? `?${pairs.join('&')}` : '';
}

export const entryApprovalsService = {
  /** The checker's queue: entries in PendingApproval, paginated. Read-only. */
  async listPending(query: ListPendingQuery): Promise<ListPendingResult> {
    const qs = buildQuery({
      unitId: query.unitId,
      page: query.page !== undefined ? String(query.page) : undefined,
      limit: query.limit !== undefined ? String(query.limit) : undefined,
    });
    const res = await apiClient.get<ApiEnvelope<ListPendingResult>>(`/entry-approvals/pending${qs}`);
    return res.data;
  },

  /** Create a Draft entry with its legs. No number, no ledger impact yet (ACC-015). */
  async createDraft(payload: CreateDraftPayload): Promise<ApprovalEntry> {
    const res = await apiClient.post<ApiEnvelope<ApprovalEntry>>('/entry-approvals/drafts', payload);
    notify('Rascunho criado.', 'success', CTX);
    return res.data;
  },

  /** Replace a Draft's date/description/legs (F4 edit-after-reject). CAS on `expectedVersion`. */
  async updateDraft(id: string, payload: UpdateDraftPayload): Promise<ApprovalEntry> {
    const res = await apiClient.put<ApiEnvelope<ApprovalEntry>>(
      `/entry-approvals/drafts/${encodeURIComponent(id)}`,
      payload,
    );
    notify('Rascunho atualizado.', 'success', CTX);
    return res.data;
  },

  /** Submit a Draft for approval — freezes the content hash, moves to PendingApproval. */
  async submitDraft(id: string, payload: VersionedPayload): Promise<ApprovalEntry> {
    const res = await apiClient.post<ApiEnvelope<ApprovalEntry>>(
      `/entry-approvals/drafts/${encodeURIComponent(id)}/submit`,
      payload,
    );
    notify('Lançamento enviado para aprovação.', 'success', CTX);
    return res.data;
  },

  /** Approve AND post (F5). The number is born here; the server enforces SoD and the period gate. */
  async approve(id: string, payload: VersionedPayload): Promise<ApprovalEntry> {
    const res = await apiClient.post<ApiEnvelope<ApprovalEntry>>(
      `/entry-approvals/${encodeURIComponent(id)}/approve`,
      payload,
    );
    notify('Lançamento aprovado e postado.', 'success', CTX);
    return res.data;
  },

  /** Reject back to Draft (F4) so the maker can fix and resubmit. */
  async reject(id: string, payload: RejectPayload): Promise<ApprovalEntry> {
    const res = await apiClient.post<ApiEnvelope<ApprovalEntry>>(
      `/entry-approvals/${encodeURIComponent(id)}/reject`,
      payload,
    );
    notify('Lançamento rejeitado — voltou para rascunho.', 'success', CTX);
    return res.data;
  },
};

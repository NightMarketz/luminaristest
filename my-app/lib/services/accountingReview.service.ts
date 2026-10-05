import { apiClient } from '../api/api-client';
import { notify } from '../notifications/notify';
import type {
  AddFindingInput,
  AdjustmentEntryInput,
  OpenReviewInput,
  RejectReviewInput,
  ReplaceReviewJobsInput,
  ResolveFindingInput,
  SignOffReviewInput,
} from '@/types/contracts/accounting/AccountingReviewDto.gen';

/**
 * Revisão profissional editável (nó C11, `/api/accounting/reviews`) — FE-INCR-REVIEW. Bodies pelo contrato
 * GERADO (`AccountingReviewDto.gen`); respostas à mão (D11 do PLANO-FE-CONTRACT-TYPES), transcritas de
 * `AccountingReviewService.ts`. O `resolveFinding` é a union discriminada do DTO: nunca `targetType` e
 * `resolutionNote` juntos (o tipo gerado já impede).
 */
const CTX = 'Revisão';

interface Envelope<T> {
  success: boolean;
  data: T;
}

export type ReviewStatus = 'OPEN' | 'SIGNED_OFF' | 'REJECTED';
export type ReviewRegister = AddFindingInput['register'];
export type FindingSeverity = AddFindingInput['severity'];
export type ResolutionTarget = Extract<ResolveFindingInput, { resolution: 'DATA_EDIT' }>['targetType'];

/** `REVIEW_REGISTERS` (`models/AccountingReview.model.ts`) — a ordem do select. */
export const REVIEW_REGISTERS: readonly ReviewRegister[] = ['0000', 'I050', 'I051', 'I200', 'I250', 'J150', 'J930', 'M300', 'M350', 'M410', 'N630'];
export const RESOLUTION_TARGETS: readonly ResolutionTarget[] = ['account', 'referential_mapping', 'counterparty', 'generation_input', 'journal_entry'];

export interface AccountingReview {
  id: string;
  unitId: string;
  year: number;
  ecdJobId: string | null;
  ecfJobId: string | null;
  status: ReviewStatus;
  reviewerUserId: string;
  reviewerName: string | null;
  reviewerCrc: string | null;
  statement: string | null;
  closeReason: string | null;
  openedAt: string;
  updatedAt: string;
  closedAt: string | null;
}

export interface AccountingReviewFinding {
  id: string;
  reviewId: string;
  register: ReviewRegister;
  locator: string;
  description: string;
  severity: FindingSeverity;
  resolution: 'DATA_EDIT' | 'ADJUSTMENT_ENTRY' | 'NO_ACTION' | null;
  resolutionTargetType: string | null;
  resolutionTargetId: string | null;
  resolutionNote: string | null;
  resolvedById: string | null;
  resolvedAt: string | null;
  createdById: string;
  createdAt: string;
}

export interface ReviewDetail {
  review: AccountingReview & { findings: AccountingReviewFinding[] };
  findings: Array<{
    finding: AccountingReviewFinding;
    targetAuditEvents: Array<{ id: string; eventType: string; createdAt: string; targetType: string | null; targetId: string | null }>;
  }>;
}

const enc = encodeURIComponent;
const q = (unitId: string, ownerUserId?: string) => `?unitId=${enc(unitId)}${ownerUserId ? `&ownerUserId=${enc(ownerUserId)}` : ''}`;

export const accountingReviewService = {
  /** `ownerUserId` (opcional, F-GOV-7): o contador lê as revisões do livro do cliente. */
  async list(unitId: string, filter: { year?: number; status?: ReviewStatus } = {}, ownerUserId?: string): Promise<AccountingReview[]> {
    let qs = q(unitId);
    if (filter.year !== undefined) qs += `&year=${filter.year}`;
    if (filter.status) qs += `&status=${filter.status}`;
    if (ownerUserId) qs += `&ownerUserId=${enc(ownerUserId)}`;
    return (await apiClient.get<Envelope<AccountingReview[]>>(`/accounting/reviews${qs}`)).data;
  },

  async get(id: string, unitId: string, ownerUserId?: string): Promise<ReviewDetail> {
    return (await apiClient.get<Envelope<ReviewDetail>>(`/accounting/reviews/${enc(id)}${q(unitId, ownerUserId)}`)).data;
  },

  async open(body: OpenReviewInput): Promise<AccountingReview> {
    const res = await apiClient.post<Envelope<AccountingReview>>('/accounting/reviews', body);
    notify('Revisão aberta.', 'success', CTX);
    return res.data;
  },

  async addFinding(id: string, body: AddFindingInput): Promise<AccountingReviewFinding> {
    const res = await apiClient.post<Envelope<AccountingReviewFinding>>(`/accounting/reviews/${enc(id)}/findings`, body);
    notify('Achado registrado.', 'success', CTX);
    return res.data;
  },

  async resolveFinding(id: string, findingId: string, body: ResolveFindingInput): Promise<AccountingReviewFinding> {
    const res = await apiClient.post<Envelope<AccountingReviewFinding>>(`/accounting/reviews/${enc(id)}/findings/${enc(findingId)}/resolve`, body);
    notify('Achado resolvido.', 'success', CTX);
    return res.data;
  },

  async postAdjustment(id: string, findingId: string, body: AdjustmentEntryInput): Promise<{ finding: AccountingReviewFinding; entryId: string }> {
    const res = await apiClient.post<Envelope<{ finding: AccountingReviewFinding; entryId: string }>>(
      `/accounting/reviews/${enc(id)}/findings/${enc(findingId)}/adjustment`,
      body,
    );
    notify('Lançamento de acerto registrado.', 'success', CTX);
    return res.data;
  },

  async replaceJobs(id: string, body: ReplaceReviewJobsInput): Promise<AccountingReview> {
    const res = await apiClient.patch<Envelope<AccountingReview>>(`/accounting/reviews/${enc(id)}/jobs`, body);
    notify('Arquivos da revisão trocados.', 'success', CTX);
    return res.data;
  },

  async signOff(id: string, body: SignOffReviewInput): Promise<AccountingReview> {
    const res = await apiClient.post<Envelope<AccountingReview>>(`/accounting/reviews/${enc(id)}/sign-off`, body);
    notify('Revisão assinada.', 'success', CTX);
    return res.data;
  },

  async reject(id: string, body: RejectReviewInput): Promise<AccountingReview> {
    const res = await apiClient.post<Envelope<AccountingReview>>(`/accounting/reviews/${enc(id)}/reject`, body);
    notify('Revisão rejeitada.', 'success', CTX);
    return res.data;
  },
};

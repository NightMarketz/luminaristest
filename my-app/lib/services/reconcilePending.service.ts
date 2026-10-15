import { apiClient } from '../api/api-client';
import type {
  ListReconcilePendingQueryDtoInput,
  ReconcilePendingListViewDtoInput,
  ReconcilePendingReasonCodeInput,
  RescanReconcilePendingDtoInput,
  RescanReconcilePendingResultDtoInput,
} from '@/types/contracts/accounting/ReconcilePendingDto.gen';

/**
 * Pendências do reconcile (`/api/reconcile-pending`, nó C7) — BE-INCR-ONBOARDING-ACTIVATION item 17 (I5 PR-3).
 * Query, body E respostas pelo contrato GERADO (`ReconcilePendingDto.gen`) — D-2026-10-14-I4-I5-LACUNAS-EXECUCAO L-3:
 * um campo que mude no BE quebra o tsc daqui. O serviço não notifica: o painel avisa o resumo do rescan.
 */
interface Envelope<T> {
  success: boolean;
  data: T;
}

export type ReconcilePendingReasonCode = ReconcilePendingReasonCodeInput;

/**
 * Os 10 códigos do enum, na ordem do BE. `satisfies` + o teste do painel (todo código tem rótulo) fecham o mapa sobre
 * o contrato: um código novo no enum quebra o tsc do `REASON_LABELS`.
 */
export const RECONCILE_PENDING_REASON_CODES = [
  'FAILED',
  'ACCOUNTING_PERIOD_NOT_OPEN',
  'MAX_CENTS_EXCEEDED',
  'OPENING_ENTRY_MISSING',
  'MISSING_PAID_WITH_PACKAGE_ID',
  'NO_MAPPER_FOR_UNIT',
  'PACKAGE_CONSUMPTION_PENDING',
  'PACKAGE_ORIGIN_REVERSED',
  'PACKAGE_EXPIRY_NFSE_PENDING',
  'UNKNOWN_EVENT_KEY',
] as const satisfies readonly ReconcilePendingReasonCode[];

export const reconcilePendingService = {
  async list(q: ListReconcilePendingQueryDtoInput): Promise<ReconcilePendingListViewDtoInput> {
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(q)) if (v !== undefined && v !== '') params.set(k, String(v));
    return (await apiClient.get<Envelope<ReconcilePendingListViewDtoInput>>(`/reconcile-pending?${params.toString()}`)).data;
  },

  /** Re-dirige só as pendências não resolvidas do escopo (o BE não reclassifica o motivo). */
  async rescan(body: RescanReconcilePendingDtoInput): Promise<RescanReconcilePendingResultDtoInput> {
    return (await apiClient.post<Envelope<RescanReconcilePendingResultDtoInput>>('/reconcile-pending/rescan', body)).data;
  },
};

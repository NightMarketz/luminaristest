import { apiClient } from '../api/api-client';
import { notify } from '../notifications/notify';
import type {
  ConfirmBankSettlementInput,
  ListBankSettlementsQueryInput,
  RejectBankSettlementInput,
  RetryBankSettlementInput,
  ScanBankSettlementsInput,
} from '@/types/contracts/accounting/BankSettlementDto.gen';

/**
 * Baixa por retorno bancário (`/api/bank-settlements`, nó F7) — FE-INCR-BANK-SETTLEMENT. Bodies pelo contrato
 * GERADO (`BankSettlementDto.gen`, `.strict()`); respostas à mão (D11), transcritas de `BankSettlementService.ts`.
 * `confirm` é o único comando com efeito financeiro (resposta 20 da cédula 10/09: humano confirma, um a um).
 * Valores em centavos inteiros; a tela só formata.
 */
const CTX = 'Baixas por retorno';

interface Envelope<T> {
  success: boolean;
  data: T;
}

export type BankSettlementStatus = NonNullable<ListBankSettlementsQueryInput['status']>;
export type BankSettlementMethod = ConfirmBankSettlementInput['method'];
export const BANK_SETTLEMENT_STATUSES: readonly BankSettlementStatus[] = ['PENDING', 'CONFIRMING', 'CONFIRMED', 'REJECTED', 'FAILED', 'STALE'];
export const BANK_SETTLEMENT_METHODS: readonly BankSettlementMethod[] = ['Cash', 'Pix', 'TED', 'Boleto'];

export interface BankSettlementItemView {
  id: string;
  origin: 'STATEMENT_LINE' | 'CNAB_RETURN';
  status: BankSettlementStatus;
  titleType: 'PAYABLE' | 'RECEIVABLE';
  titleId: string;
  proposedCents: number;
  chargeCents: number;
  line: { id: string; date: string; amountCents: number; description: string; externalRef: string | null };
  /** Saldo RECALCULADO na leitura; `null` = título indisponível. */
  title: { openCents: number; dueDate: string; counterpartyName: string; status: string } | null;
  settlementId: string | null;
  chargeEntryId: string | null;
  reason: string | null;
  failedStep: 'SETTLE' | 'CHARGE' | 'MATCH' | null;
  confirmedAt: string | null;
}

export interface ScanSummary {
  created: number;
  skippedExisting: number;
  ambiguous: number;
  none: number;
  stale: number;
}

const enc = encodeURIComponent;

export const bankSettlementService = {
  async list(
    unitId: string,
    q: { statementId?: string; status?: BankSettlementStatus; page?: number; limit?: number } = {},
  ): Promise<{ items: BankSettlementItemView[]; total: number; page: number; limit: number }> {
    const params = new URLSearchParams({ unitId });
    for (const [k, v] of Object.entries(q)) if (v !== undefined && v !== '') params.set(k, String(v));
    return (await apiClient.get<Envelope<{ items: BankSettlementItemView[]; total: number; page: number; limit: number }>>(`/bank-settlements?${params.toString()}`)).data;
  },

  /** Idempotente no BE (`skippedExisting`): pode varrer de novo. */
  async scan(unitId: string, statementId: string): Promise<ScanSummary> {
    const body: ScanBankSettlementsInput = { unitId, statementId };
    return (await apiClient.post<Envelope<ScanSummary>>('/bank-settlements/scan', body)).data;
  },

  async confirm(id: string, body: ConfirmBankSettlementInput): Promise<BankSettlementItemView> {
    const res = await apiClient.post<Envelope<BankSettlementItemView>>(`/bank-settlements/${enc(id)}/confirm`, body);
    notify('Baixa confirmada.', 'success', CTX);
    return res.data;
  },

  async reject(id: string, body: RejectBankSettlementInput): Promise<BankSettlementItemView> {
    const res = await apiClient.post<Envelope<BankSettlementItemView>>(`/bank-settlements/${enc(id)}/reject`, body);
    notify('Baixa rejeitada.', 'success', CTX);
    return res.data;
  },

  /** O DTO pede `method` de novo: a etapa (i) pode não ter rodado. */
  async retry(id: string, body: RetryBankSettlementInput): Promise<BankSettlementItemView> {
    const res = await apiClient.post<Envelope<BankSettlementItemView>>(`/bank-settlements/${enc(id)}/retry`, body);
    notify('Baixa reprocessada.', 'success', CTX);
    return res.data;
  },
};

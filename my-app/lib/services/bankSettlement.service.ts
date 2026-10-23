import { apiClient } from '../api/api-client';
import { notify } from '../notifications/notify';
import type { BankStatement } from './accounting.service';
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
export const BANK_SETTLEMENT_METHODS = ['Cash', 'Pix', 'TED', 'Boleto', 'ProviderBalance'] as const satisfies readonly BankSettlementMethod[];
const BANK_METHODS: readonly BankSettlementMethod[] = ['Cash', 'Pix', 'TED', 'Boleto'];
const PROVIDER_METHODS: readonly BankSettlementMethod[] = ['ProviderBalance'];

/**
 * FE-INCR-BANK-SETTLEMENT-FEE EMENDA 1 item 11 (F-TAR-3 → a): extrato de conta de provedor (`paymentAccountId`) só
 * aceita `ProviderBalance` (fora disso o BE dá 400 `provider_balance_requires_payment_account`); extrato bancário
 * segue com os 4 de hoje.
 */
export function methodsFor(st?: Pick<BankStatement, 'paymentAccountId'> | null): readonly BankSettlementMethod[] {
  return st?.paymentAccountId ? PROVIDER_METHODS : BANK_METHODS;
}

export interface BankSettlementItemView {
  id: string;
  origin: 'STATEMENT_LINE' | 'CNAB_RETURN';
  status: BankSettlementStatus;
  titleType: 'PAYABLE' | 'RECEIVABLE';
  titleId: string;
  proposedCents: number;
  chargeCents: number;
  /** Retido pelo provedor (GROSS − NET: tarifas e, até a P3 do contador, `TAXES_AMOUNT`); 0 = item bancário (#620). */
  feeCents: number;
  line: { id: string; date: string; amountCents: number; description: string; externalRef: string | null };
  /** Saldo RECALCULADO na leitura; `null` = título indisponível. */
  title: { openCents: number; dueDate: string; counterpartyName: string; status: string } | null;
  settlementId: string | null;
  chargeEntryId: string | null;
  /** Lançamento `provider.fee` (etapa FEE do confirm); null até a etapa rodar. */
  feeEntryId: string | null;
  /** Em PENDING, só o aviso G7 (cobrança em estado terminal no scan) escreve aqui. */
  reason: string | null;
  failedStep: 'SETTLE' | 'CHARGE' | 'FEE' | 'MATCH' | null;
  confirmedAt: string | null;
}

/**
 * EMENDA 1 item 12 (F-TAR-5 → a): bruto do #616 (`|linha| + feeCents`) conferido contra `proposedCents + chargeCents`.
 * `null` sem tarifa. Só aviso: o pré-cheque do BE re-deriva sobre o bruto e é a autoridade.
 */
export function feeCheck(
  it: Pick<BankSettlementItemView, 'feeCents' | 'proposedCents' | 'chargeCents' | 'line'>,
): { grossCents: number; consistent: boolean } | null {
  if (it.feeCents <= 0) return null;
  const grossCents = Math.abs(it.line.amountCents) + it.feeCents;
  return { grossCents, consistent: grossCents === it.proposedCents + it.chargeCents };
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

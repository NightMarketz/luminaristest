import { apiClient } from '../api/api-client';
import { notify } from '../notifications/notify';
import { multipartBaseUrl } from './multipart';
import type {
  CreatePaymentAccountInput,
  UpdatePaymentAccountInput,
  SetCredentialInput,
  UnblockReleaseReportInput,
} from '@/types/contracts/accounting/PaymentAccountDto.gen';

/**
 * Conta do provedor de pagamento (FE-INCR-PAYMENT-PROVIDER PR-1, itens 1 e 9) — cliente fino sobre
 * `/api/payment-accounts` (BE-INCR-PAYMENT-PROVIDER PR-1). Corpo de escrita = contrato GERADO
 * (`PaymentAccountDto.gen`); resposta escrita à mão, transcrita de `PaymentAccountService.ts` (F-FEE-E2 a, D11).
 * Ler = `canReadAccountingSettings`, gerir = `canManageAccountingSettings` (D-2026-10-03 lacuna 2). A credencial
 * nunca volta do servidor: a view traz só `credentialSetAt` e os 4 últimos dígitos.
 */

const CTX = 'Cobrança';

interface ApiEnvelope<T> {
  success: boolean;
  data: T;
}

// ── Resposta (à mão, transcrita de PaymentAccountService.ts — PaymentAccountView) ─────────────────────
export type PaymentAccountStatus = 'DRAFT' | 'ACTIVE' | 'CREDENTIAL_INVALID' | 'DISABLED';
export const PAYMENT_ACCOUNT_STATUSES: readonly PaymentAccountStatus[] = ['DRAFT', 'ACTIVE', 'CREDENTIAL_INVALID', 'DISABLED'];

export interface PaymentAccountView {
  id: string;
  unitId: string;
  provider: 'MERCADO_PAGO';
  label: string;
  /** Imutável depois da criação (P1-3). */
  glAccountId: string;
  providerAccountRef: string | null;
  config: { provider: 'MERCADO_PAGO'; credentialSource: 'OWN' | 'OAUTH' };
  status: PaymentAccountStatus;
  credentialSetAt: string | null;
  /** Sempre null para `OWN`. */
  credentialExpiresAt: string | null;
  accessTokenLast4: string | null;
  /** R2 (a): não-nulo = job do relatório de liberações parado nesta conta. */
  releaseReportBlockedReason: string | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * Transições oferecidas na tela (item 8): `ACTIVE ↔ DISABLED`. `DRAFT` e `CREDENTIAL_INVALID` só saem pela
 * credencial (P2-4), nunca pelo PATCH.
 */
export function patchTargets(status: PaymentAccountStatus): ReadonlyArray<'ACTIVE' | 'DISABLED'> {
  if (status === 'ACTIVE') return ['DISABLED'];
  if (status === 'DISABLED') return ['ACTIVE'];
  return [];
}

/**
 * URL do webhook a colar no painel do MP (item 9, F-FE-COB-5 a): montada no FE a partir da mesma base da API que o
 * navegador usa. `warning` quando a base não é `https://` ou aponta para `localhost` — o MP só aceita URL HTTPS de
 * produção (M8). Se a produção servir a API atrás de proxy com outra origem pública, a URL sai errada: o runbook do
 * M2 confere.
 */
export function webhookUrlFor(accountId: string, base: string = multipartBaseUrl()): { url: string; warning: boolean } {
  const trimmed = base.replace(/\/+$/, '');
  const url = `${trimmed}/payment-collection/webhook/MERCADO_PAGO/${encodeURIComponent(accountId)}`;
  let warning = true;
  try {
    const parsed = new URL(trimmed);
    const host = parsed.hostname;
    warning = parsed.protocol !== 'https:' || host === 'localhost' || host === '127.0.0.1' || host === '[::1]';
  } catch {
    warning = true;
  }
  return { url, warning };
}

const enc = encodeURIComponent;
const scopeQs = (unitId: string) => `?unitId=${enc(unitId)}`;

export const paymentAccountsService = {
  /** GET /payment-accounts?unitId — `silent` para o painel do AR, que trata o 403 sozinho (item 20). */
  async list(unitId: string, opts: { silent?: boolean } = {}): Promise<PaymentAccountView[]> {
    const res = await apiClient.get<ApiEnvelope<PaymentAccountView[]>>(`/payment-accounts${scopeQs(unitId)}`, { silent: opts.silent });
    return res.data;
  },

  async get(id: string, unitId: string): Promise<PaymentAccountView> {
    const res = await apiClient.get<ApiEnvelope<PaymentAccountView>>(`/payment-accounts/${enc(id)}${scopeQs(unitId)}`);
    return res.data;
  },

  /** Cria em `DRAFT`; `glAccountId` folha e imutável depois. */
  async create(payload: CreatePaymentAccountInput): Promise<PaymentAccountView> {
    const res = await apiClient.post<ApiEnvelope<PaymentAccountView>>('/payment-accounts', payload);
    notify('Conta Mercado Pago cadastrada.', 'success', CTX);
    return res.data;
  },

  /** `label` e/ou `status` (`ACTIVE ↔ DISABLED`); mesmo status ⇒ 409 `payment_account_invalid_transition`. */
  async update(id: string, payload: UpdatePaymentAccountInput): Promise<PaymentAccountView> {
    const res = await apiClient.patch<ApiEnvelope<PaymentAccountView>>(`/payment-accounts/${enc(id)}`, payload);
    notify('Conta atualizada.', 'success', CTX);
    return res.data;
  },

  /** Grava a credencial e põe a conta em `ACTIVE`. 503 `payment_credential_key_missing` sem a chave da instância. */
  async setCredential(id: string, payload: SetCredentialInput): Promise<PaymentAccountView> {
    const res = await apiClient.put<ApiEnvelope<PaymentAccountView>>(`/payment-accounts/${enc(id)}/credential`, payload, { silent: true });
    notify('Credencial gravada.', 'success', CTX);
    return res.data;
  },

  /** Limpa `releaseReportBlockedReason` (R2 a). 200 sem efeito se a conta não estava bloqueada. */
  async unblockReleaseReport(id: string, payload: UnblockReleaseReportInput): Promise<PaymentAccountView> {
    const res = await apiClient.post<ApiEnvelope<PaymentAccountView>>(`/payment-accounts/${enc(id)}/release-report/unblock`, payload);
    notify('Relatório de liberações destravado.', 'success', CTX);
    return res.data;
  },

  /** Soft-delete. */
  async remove(id: string, unitId: string): Promise<void> {
    await apiClient.delete<ApiEnvelope<unknown>>(`/payment-accounts/${enc(id)}${scopeQs(unitId)}`);
    notify('Conta excluída.', 'success', CTX);
  },
};

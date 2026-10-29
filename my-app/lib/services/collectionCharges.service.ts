import { apiClient } from '../api/api-client';
import { notify } from '../notifications/notify';
import type {
  CreateChargeInput,
  CancelChargeInput,
  ListCollectionChargesQueryInput,
  PayerInput,
} from '@/types/contracts/accounting/CollectionChargeDto.gen';

/**
 * Cobrança por provedor (FE-INCR-PAYMENT-PROVIDER PR-2, itens 2 e 12–17) — cliente fino sobre as rotas do
 * BE-INCR-PAYMENT-PROVIDER PR-2: `/api/receivables/:id/charges…` e `/api/collection-charges/:id…`. Corpo de escrita
 * = contrato GERADO (`CollectionChargeDto.gen`); resposta escrita à mão, transcrita de `CollectionChargeService.ts`
 * (F-FEE-E2 a). Nenhum status de cobrança dá baixa no título (PP-D5): a baixa é do F7, pela Conciliação.
 */

const CTX = 'Cobrança';

interface ApiEnvelope<T> {
  success: boolean;
  data: T;
}

// ── Resposta (à mão, transcrita de CollectionChargeService.ts — CollectionChargeView) ───────────────────
export type CollectionChargeStatus =
  | 'CREATING'
  | 'PENDING'
  | 'PAID'
  | 'PARTIALLY_REFUNDED'
  | 'CHARGED_BACK'
  | 'REFUNDED'
  | 'EXPIRED'
  | 'CANCELLED'
  | 'FAILED';
export type ChargeKind = 'BOLETO' | 'PIX';

export const COLLECTION_CHARGE_STATUSES: readonly CollectionChargeStatus[] = [
  'CREATING', 'PENDING', 'PAID', 'PARTIALLY_REFUNDED', 'CHARGED_BACK', 'REFUNDED', 'EXPIRED', 'CANCELLED', 'FAILED',
];
export const LIVE: readonly CollectionChargeStatus[] = ['CREATING', 'PENDING'];
export const TERMINAL: readonly CollectionChargeStatus[] = ['REFUNDED', 'EXPIRED', 'CANCELLED', 'FAILED'];

export interface ChargeInstrument {
  digitableLine?: string;
  barcode?: string;
  qrCode?: string;
  qrCodeBase64?: string;
  ticketUrl?: string;
}

export interface CollectionChargeView {
  id: string;
  unitId: string;
  receivableId: string;
  paymentAccountId: string;
  kind: ChargeKind;
  /** BigInt serializado — converter com `toCents`. */
  amountCents: string;
  expiresAt: string;
  /** O BE pode mandar um status que a tela não conhece: o rótulo cai no valor cru, nunca em "pago" (item 17). */
  status: CollectionChargeStatus | (string & {});
  providerRef: string | null;
  providerPaymentRef: string | null;
  providerStatus: string | null;
  providerStatusDetail: string | null;
  /** Informativo (P2-7): a data da baixa é a do relatório de liberações. */
  paidAt: string | null;
  failReason: string | null;
  instrument: ChargeInstrument | null;
  createdAt: string;
  updatedAt: string;
  /** Só no detalhe e só para quem gere o título (F9). */
  payer?: PayerInput;
}

/** Página da lista da unidade (EMENDA-1 item 16c) — à mão, transcrita de `CollectionChargeService.ts` (CollectionChargePage). */
export interface CollectionChargePage {
  items: CollectionChargeView[];
  total: number;
  page: number;
  limit: number;
}

/** `amountCents` chega como string (BigInt). Único ponto de conversão (item 2). */
export function toCents(s: string): number {
  return Number(s);
}

export type ChargeBanner = 'paid_awaiting_settlement' | 'no_ledger_effect' | 'terminal' | 'overdue_pending';

/**
 * Aviso por status (item 17, F-FE-COB-7 a). `receivableOpen` = o título ainda tem saldo em aberto (não RECEIVED nem
 * CANCELLED). O selo "vencida" é derivado só no texto: o status continua o do BE.
 */
export function chargeBanner(
  c: Pick<CollectionChargeView, 'status' | 'expiresAt'>,
  receivableOpen: boolean,
  now: Date,
): ChargeBanner | null {
  if (c.status === 'PAID') return receivableOpen ? 'paid_awaiting_settlement' : null;
  if (c.status === 'PARTIALLY_REFUNDED' || c.status === 'CHARGED_BACK' || c.status === 'REFUNDED') return 'no_ledger_effect';
  if (c.status === 'EXPIRED' || c.status === 'CANCELLED' || c.status === 'FAILED') return 'terminal';
  if (c.status === 'PENDING' && new Date(c.expiresAt).getTime() < now.getTime()) return 'overdue_pending';
  return null;
}

/** Tipo do documento pelo tamanho (item 12): 11 dígitos ⇒ CPF, 14 ⇒ CNPJ. */
export function docTypeFor(number: string): 'CPF' | 'CNPJ' | null {
  const digits = number.replace(/\D/g, '');
  if (digits.length === 11) return 'CPF';
  if (digits.length === 14) return 'CNPJ';
  return null;
}

// ── Formulário do modal "Cobrar título" (item 12) ───────────────────────────────────────────────────────
/** Presets do prazo do Pix (F-FE-COB-6 a). `null` = 24 h, o padrão do BE (o campo vai omitido). */
export const PIX_EXPIRY_PRESETS: ReadonlyArray<{ id: string; minutes: number | null }> = [
  { id: '30m', minutes: 30 },
  { id: '1h', minutes: 60 },
  { id: '24h', minutes: null },
  { id: '3d', minutes: 3 * 24 * 60 },
  { id: '7d', minutes: 7 * 24 * 60 },
  { id: '30d', minutes: 30 * 24 * 60 },
];

export interface ChargeForm {
  kind: ChargeKind;
  /** Boleto: dias (1–30) em texto; vazio = 3 dias úteis (F4). */
  boletoDays: string;
  /** Pix: id de `PIX_EXPIRY_PRESETS`. */
  pixPreset: string;
  firstName: string;
  lastName: string;
  email: string;
  docType: 'CPF' | 'CNPJ';
  docNumber: string;
  streetName: string;
  streetNumber: string;
  zipCode: string;
  neighborhood: string;
  city: string;
  state: string;
}

const digitsOf = (s: string) => s.replace(/\D/g, '');

function toPayerAddress(f: ChargeForm): NonNullable<CreateChargeInput['payer']['address']> {
  return {
    streetName: f.streetName.trim(),
    streetNumber: f.streetNumber.trim(),
    zipCode: digitsOf(f.zipCode),
    neighborhood: f.neighborhood.trim(),
    city: f.city.trim(),
    state: f.state.trim().toUpperCase(),
  };
}

function toPayer(f: ChargeForm): CreateChargeInput['payer'] {
  const base: CreateChargeInput['payer'] = {
    firstName: f.firstName.trim(),
    lastName: f.lastName.trim(),
    email: f.email.trim(),
    identification: { type: f.docType, number: digitsOf(f.docNumber) },
  };
  // Endereço só no boleto (P2-12/M1): o Pix não manda.
  if (f.kind === 'BOLETO') base.address = toPayerAddress(f);
  return base;
}

/**
 * Corpo da emissão (item 12). Manda SÓ o campo de prazo do tipo escolhido: o outro dá 400
 * `charge_expiry_field_mismatch`. Nunca valor, juros, multa nem desconto (P2-12).
 */
export function toCreateChargeInput(f: ChargeForm, unitId: string): CreateChargeInput {
  const body: CreateChargeInput = { unitId, kind: f.kind, payer: toPayer(f) };
  if (f.kind === 'BOLETO') {
    if (f.boletoDays.trim() !== '') body.expiresInDays = Number(f.boletoDays);
  } else {
    const preset = PIX_EXPIRY_PRESETS.find((p) => p.id === f.pixPreset);
    if (preset && preset.minutes !== null) body.expiresInMinutes = preset.minutes;
  }
  return body;
}

const enc = encodeURIComponent;
const scopeQs = (unitId: string) => `?unitId=${enc(unitId)}`;

export const collectionChargesService = {
  /** POST /receivables/:id/charges — o valor é o saldo aberto relido pelo servidor na tx. Erros tratados pelo modal. */
  async create(receivableId: string, payload: CreateChargeInput): Promise<CollectionChargeView> {
    const res = await apiClient.post<ApiEnvelope<CollectionChargeView>>(`/receivables/${enc(receivableId)}/charges`, payload, { silent: true });
    notify('Cobrança emitida.', 'success', CTX);
    return res.data;
  },

  /** GET /receivables/:id/charges — sem pagador (F9). */
  async listByReceivable(receivableId: string, unitId: string): Promise<CollectionChargeView[]> {
    const res = await apiClient.get<ApiEnvelope<CollectionChargeView[]>>(`/receivables/${enc(receivableId)}/charges${scopeQs(unitId)}`);
    return res.data;
  },

  /** GET /collection-charges?unitId&status&kind&page&limit — lista da unidade (EMENDA-1 item 16c), sem pagador (F9). */
  async listByUnit(query: ListCollectionChargesQueryInput): Promise<CollectionChargePage> {
    // Campo vazio fica fora da query: o BE é `.strict()` e um `status=` vazio daria 400.
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(query)) {
      if (v !== undefined && v !== null && v !== '') params.set(k, String(v));
    }
    const res = await apiClient.get<ApiEnvelope<CollectionChargePage>>(`/collection-charges?${params.toString()}`);
    return res.data;
  },

  /** GET /collection-charges/:id — `payer` só para quem gere o título. */
  async get(id: string, unitId: string): Promise<CollectionChargeView> {
    const res = await apiClient.get<ApiEnvelope<CollectionChargeView>>(`/collection-charges/${enc(id)}${scopeQs(unitId)}`);
    return res.data;
  },

  /** POST /collection-charges/:id/cancel — só PENDING; o 409 do MP faz o BE aplicar o estado real (pode voltar PAID). */
  async cancel(id: string, payload: CancelChargeInput): Promise<CollectionChargeView> {
    const res = await apiClient.post<ApiEnvelope<CollectionChargeView>>(`/collection-charges/${enc(id)}/cancel`, payload, { silent: true });
    return res.data;
  },

  /** GET /receivables/:id/charges/payer-suggestion — exige `canManageReceivable` (403 tratado pelo painel, P2-11). */
  async payerSuggestion(receivableId: string, unitId: string): Promise<Partial<PayerInput>> {
    const res = await apiClient.get<ApiEnvelope<Partial<PayerInput>>>(
      `/receivables/${enc(receivableId)}/charges/payer-suggestion${scopeQs(unitId)}`,
      { silent: true },
    );
    return res.data;
  },
};

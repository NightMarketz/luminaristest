/**
 * CollectionCharge — constantes de domínio da cobrança no provedor (BE-INCR-PAYMENT-PROVIDER PR-2, nó F5;
 * BRIEF §3 P2-1..P2-15 e §4.1/§4.2; decisões do dono de 10/10 em D-2026-10-10-F5-PR2-FORKS, "dono, chat, 2026-10-10").
 * O tipo da linha vem de `generated/prisma`; este arquivo é dono dos enums fechados, dos códigos de erro, das chaves de
 * auditoria, do mapa de status do MP (M6) e dos prazos.
 *
 * NENHUM status desta máquina tem efeito no razão (PP-D5, resposta 20 da entrevista de 10/09; P2-8).
 */

export const CHARGE_KINDS = ['BOLETO', 'PIX'] as const;
export type ChargeKind = (typeof CHARGE_KINDS)[number];

/** F-PPB-8 (b): PARTIALLY_REFUNDED / CHARGED_BACK são status próprios. */
export const COLLECTION_CHARGE_STATUSES = [
  'CREATING',
  'PENDING',
  'PAID',
  'PARTIALLY_REFUNDED',
  'CHARGED_BACK',
  'REFUNDED',
  'EXPIRED',
  'CANCELLED',
  'FAILED',
] as const;
export type CollectionChargeStatus = (typeof COLLECTION_CHARGE_STATUSES)[number];

/** Cobrança viva = bloqueia 2ª cobrança no título (P2-2) e o cancelamento do título (P2-13). */
export const LIVE_CHARGE_STATUSES: readonly CollectionChargeStatus[] = ['CREATING', 'PENDING'];

/**
 * Terminais: nenhuma re-consulta muda o status. REFUNDED pelo BRIEF (P2-7); EXPIRED, CANCELLED e FAILED pela decisão F9
 * do dono (10/10). O cru do MP continua gravado em `providerStatus*` (P2-7: "em todos os casos").
 */
export const TERMINAL_CHARGE_STATUSES: readonly CollectionChargeStatus[] = ['REFUNDED', 'EXPIRED', 'CANCELLED', 'FAILED'];

/** Títulos em que a cobrança é permitida (F9: inclui RECEIVING e PARTIALLY_RECEIVED, sempre pelo saldo em aberto). */
export const CHARGEABLE_RECEIVABLE_STATUSES = ['OPEN', 'PARTIALLY_RECEIVED', 'RECEIVING'] as const;

// ── Prazos ─────────────────────────────────────────────────────────────────────────────────────────
/** F3 (a), dono 10/10: CREATING é velha depois de 10 min — o re-drive reenvia com a MESMA chave (P2-3). */
export const STALE_CREATING_MS = 10 * 60 * 1000;
/** F-PP-8 (c): janela de 15 dias para o `ts` do webhook (P2-5). */
export const PAYMENT_WEBHOOK_MAX_AGE_MS = 15 * 86_400_000;
/** F4 (a), dono 10/10: prazo sempre explícito — boleto = 3 dias úteis; Pix = 24 h. */
export const DEFAULT_BOLETO_BUSINESS_DAYS = 3;
export const DEFAULT_PIX_MINUTES = 24 * 60;
/** M2: vencimento do boleto de 1 a 30 dias (capabilities.maxDaysToDue). */
export const MP_MAX_DAYS_TO_DUE = 30;

// ── Códigos de erro (F6/F9: prefixo CHARGE_* nos 409 novos) ───────────────────────────────────────────
export const CHARGE_RECEIVABLE_NOT_CHARGEABLE = 'CHARGE_RECEIVABLE_NOT_CHARGEABLE';
export const CHARGE_LIVE_EXISTS = 'CHARGE_LIVE_EXISTS';
export const CHARGE_NOT_PENDING = 'CHARGE_NOT_PENDING';
export const CHARGE_NOTHING_TO_CHARGE = 'CHARGE_NOTHING_TO_CHARGE';
export const PAYMENT_ACCOUNT_NOT_ACTIVE = 'PAYMENT_ACCOUNT_NOT_ACTIVE';
export const RECEIVABLE_HAS_LIVE_CHARGE = 'receivable_has_live_charge'; // nome do BRIEF (P2-13)
export const PROVIDER_CREDENTIAL_INVALID = 'provider_credential_invalid'; // nome do BRIEF (P2-4)
export const PROVIDER_UNAVAILABLE = 'provider_unavailable';
export const CHARGE_ADDRESS_REQUIRED = 'charge_address_required';
export const CHARGE_EXPIRY_FIELD_MISMATCH = 'charge_expiry_field_mismatch';

// ── Auditoria (P2-14) — sem pagador nem instrumento ────────────────────────────────────────────────
export const COLLECTION_CHARGE_CREATED = 'collection_charge.created';
export const COLLECTION_CHARGE_STATUS_CHANGED = 'collection_charge.status_changed';
export const COLLECTION_CHARGE_CANCELLED = 'collection_charge.cancelled';
export const COLLECTION_CHARGE_FAILED = 'collection_charge.failed';
/** F8 (a), dono 10/10: evento próprio para a ida a CREDENTIAL_INVALID (P2-4). */
export const PAYMENT_ACCOUNT_CREDENTIAL_INVALID = 'payment_account.credential_invalid';

/**
 * Mapa fechado M6 → status (P2-7). Desconhecido ⇒ PENDING (nunca PAID por default; o caller loga warn).
 * `processed/accredited` → PAID · `processed/partially_refunded` → PARTIALLY_REFUNDED · `expired` → EXPIRED ·
 * `canceled` → CANCELLED · `failed` → FAILED · `refunded` → REFUNDED · `charged_back/*` → CHARGED_BACK ·
 * `action_required/*`, `created`, `processing` → PENDING.
 */
export function mapMercadoPagoStatus(status: string, detail: string): { status: CollectionChargeStatus; known: boolean } {
  switch (status) {
    case 'processed':
      if (detail === 'accredited') return { status: 'PAID', known: true };
      if (detail === 'partially_refunded') return { status: 'PARTIALLY_REFUNDED', known: true };
      return { status: 'PENDING', known: false };
    case 'expired':
      return { status: 'EXPIRED', known: true };
    case 'canceled':
      return { status: 'CANCELLED', known: true };
    case 'failed':
      return { status: 'FAILED', known: true };
    case 'refunded':
      return { status: 'REFUNDED', known: true };
    case 'charged_back':
      return { status: 'CHARGED_BACK', known: true };
    case 'action_required':
    case 'created':
    case 'processing':
      return { status: 'PENDING', known: true };
    default:
      return { status: 'PENDING', known: false };
  }
}

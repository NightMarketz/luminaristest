/**
 * PaymentAccount — constantes de domínio da conta de pagamento no provedor (BE-INCR-PAYMENT-PROVIDER, PR-1;
 * ADR-INCR-PAYMENT-PROVIDER-COLLECTION PP-D2/PP-D7; BRIEF §3 P1-3..P1-10 e §4.1). O tipo da linha vem de
 * `generated/prisma`; este arquivo é dono dos enums fechados, dos códigos de erro e das chaves de auditoria.
 *
 * Máquina de status (BRIEF §4.1 + ratificação de lacuna, dono 03/10 — "ao pé da letra"):
 * - nasce `DRAFT` (sem credencial);
 * - `PUT …/credential` põe `ACTIVE` a partir de qualquer status (P1-6), com o gate de uma ativa (P1-4);
 * - `PATCH` só faz `ACTIVE → DISABLED` e `DISABLED → ACTIVE` (P1-9); qualquer outra transição é 409;
 * - `CREDENTIAL_INVALID` é escrito pelo PR-2 (401 do MP, P2-4); daqui só sai gravando a credencial de novo.
 */

export const PAYMENT_PROVIDERS = ['MERCADO_PAGO'] as const;
export type PaymentProvider = (typeof PAYMENT_PROVIDERS)[number];

/** F-PP-1 b: `OAUTH` declarado no tipo para a porta não mudar quando o OAuth entrar; recusado no DTO (P1-5). */
export const CREDENTIAL_SOURCES = ['OWN', 'OAUTH'] as const;
export type CredentialSource = (typeof CREDENTIAL_SOURCES)[number];

export const PAYMENT_ACCOUNT_STATUSES = ['DRAFT', 'ACTIVE', 'CREDENTIAL_INVALID', 'DISABLED'] as const;
export type PaymentAccountStatus = (typeof PAYMENT_ACCOUNT_STATUSES)[number];

/** Estados que o `PATCH` aceita como destino (P1-9: "status DISABLED↔ACTIVE"). */
export const PAYMENT_ACCOUNT_PATCH_STATUSES = ['ACTIVE', 'DISABLED'] as const;

export const PAYMENT_ACCOUNT_LABEL_MAX_LENGTH = 80;

// ── Códigos de erro nomeados (BRIEF P1-2, P1-4, P1-5) ───────────────────────────────────────────────
export const PAYMENT_ACCOUNT_ALREADY_ACTIVE = 'payment_account_already_active';
export const CREDENTIAL_SOURCE_NOT_SUPPORTED = 'credential_source_not_supported';
export const PAYMENT_ACCOUNT_INVALID_TRANSITION = 'payment_account_invalid_transition';

// ── Auditoria (P1-10) — chaves fechadas, só ids/status, NUNCA credencial nem `label` (texto livre) ─────
export const PAYMENT_ACCOUNT_CREATED = 'payment_account.created';
export const PAYMENT_ACCOUNT_UPDATED = 'payment_account.updated';
export const PAYMENT_ACCOUNT_CREDENTIAL_SET = 'payment_account.credential_set';
export const PAYMENT_ACCOUNT_DISABLED = 'payment_account.disabled';

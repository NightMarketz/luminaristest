import { z } from 'zod';
import {
  CREDENTIAL_SOURCE_NOT_SUPPORTED,
  CREDENTIAL_SOURCES,
  PAYMENT_ACCOUNT_LABEL_MAX_LENGTH,
  PAYMENT_ACCOUNT_PATCH_STATUSES,
} from '../models/PaymentAccount.model';

/**
 * PaymentAccountDto — conta de pagamento no provedor (BE-INCR-PAYMENT-PROVIDER PR-1; BRIEF §4.3, P1-5/P1-6/P1-9).
 * Corpos `.strict()`; `unitId` carrega o escopo como nos demais DTOs de accounting (corpo nos comandos,
 * query nas leituras e no DELETE).
 *
 * `config` é `z.discriminatedUnion('provider', …)` com o discriminador DECLARADO no ramo (memória
 * `zod-strip-mata-discriminador-de-plugin`). `credentialSource` aceita `OAUTH` no tipo (F-PP-1 b — a porta
 * não muda quando o OAuth entrar) e o recusa com 400 `credential_source_not_supported` (P1-5).
 *
 * A credencial só ENTRA (`SetCredentialSchema`); nenhum schema de resposta a carrega (PP-D7).
 */

const MercadoPagoConfigSchema = z
  .object({
    provider: z.literal('MERCADO_PAGO'),
    credentialSource: z.enum(CREDENTIAL_SOURCES).refine((v) => v === 'OWN', { message: CREDENTIAL_SOURCE_NOT_SUPPORTED }),
  })
  .strict();

/** Config persistida em `configJson` — o mesmo union valida a escrita e a releitura. */
export const PaymentAccountConfigSchema = z.discriminatedUnion('provider', [MercadoPagoConfigSchema]);

/** @openapi
 * components:
 *   schemas:
 *     CreatePaymentAccountInput:
 *       type: object
 *       required: [unitId, provider, label, glAccountId, config]
 *       properties:
 *         unitId:      { type: string }
 *         provider:    { type: string, enum: [MERCADO_PAGO] }
 *         label:       { type: string, maxLength: 80 }
 *         glAccountId: { type: string, description: "Conta contábil FOLHA do saldo no provedor — imutável depois de criada" }
 *         config:
 *           type: object
 *           required: [provider, credentialSource]
 *           properties:
 *             provider:         { type: string, enum: [MERCADO_PAGO] }
 *             credentialSource: { type: string, enum: [OWN, OAUTH], description: "OAUTH é recusado (400 credential_source_not_supported)" }
 */
export const CreatePaymentAccountSchema = z
  .object({
    unitId: z.string().min(1),
    provider: z.literal('MERCADO_PAGO'),
    label: z.string().trim().min(1).max(PAYMENT_ACCOUNT_LABEL_MAX_LENGTH),
    glAccountId: z.string().min(1),
    config: PaymentAccountConfigSchema,
  })
  .strict();

/** @openapi
 * components:
 *   schemas:
 *     UpdatePaymentAccountInput:
 *       type: object
 *       required: [unitId]
 *       description: "Só label e status (ACTIVE→DISABLED, DISABLED→ACTIVE). Pelo menos um dos dois."
 *       properties:
 *         unitId: { type: string }
 *         label:  { type: string, maxLength: 80 }
 *         status: { type: string, enum: [ACTIVE, DISABLED] }
 */
export const UpdatePaymentAccountSchema = z
  .object({
    unitId: z.string().min(1),
    label: z.string().trim().min(1).max(PAYMENT_ACCOUNT_LABEL_MAX_LENGTH).optional(),
    status: z.enum(PAYMENT_ACCOUNT_PATCH_STATUSES).optional(),
  })
  .strict()
  .refine((v) => v.label !== undefined || v.status !== undefined, { message: 'Informe label e/ou status.' });

/** @openapi
 * components:
 *   schemas:
 *     SetPaymentCredentialInput:
 *       type: object
 *       required: [unitId, accessToken, webhookSecret]
 *       description: "Só escrita — cifrada em repouso, nunca devolvida (a leitura mostra credentialSetAt e accessTokenLast4)."
 *       properties:
 *         unitId:        { type: string }
 *         accessToken:   { type: string, minLength: 20, writeOnly: true }
 *         webhookSecret: { type: string, minLength: 16, writeOnly: true }
 */
export const SetCredentialSchema = z
  .object({
    unitId: z.string().min(1),
    accessToken: z.string().min(20),
    webhookSecret: z.string().min(16),
  })
  .strict();

/** Query de GET (lista e detalhe) e de DELETE — só o escopo. */
export const PaymentAccountScopeQuerySchema = z.object({ unitId: z.string().min(1) });

/** POST …/:id/release-report/unblock — review do #615, A2 (R2 a, dono 2026-10-10): operador destrava o job. */
export const UnblockReleaseReportSchema = z.object({ unitId: z.string().min(1) }).strict();
export type UnblockReleaseReportInput = z.infer<typeof UnblockReleaseReportSchema>;

export type PaymentAccountConfig = z.infer<typeof PaymentAccountConfigSchema>;
export type CreatePaymentAccountInput = z.infer<typeof CreatePaymentAccountSchema>;
export type UpdatePaymentAccountInput = z.infer<typeof UpdatePaymentAccountSchema>;
export type SetCredentialInput = z.infer<typeof SetCredentialSchema>;

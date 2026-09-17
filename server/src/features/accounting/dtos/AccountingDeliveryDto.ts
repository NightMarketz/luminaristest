import { z } from 'zod';
import { DELIVERABLE_EXPORT_KINDS } from '../models/AccountingDelivery.model';

/**
 * AccountingDeliveryDto — comandos da entrega do pacote ECD/ECF ao contador
 * (BE-INCR-CONTADOR-DELIVERY, itens 6/9/11; extras N-ários desde C6b PR-3, Bloco B). Todos
 * `.strict()`.
 *
 * NÃO há `year` no corpo (Fork Novo A → **(b)**, ratificado pelo dono 2026-09-10 na cédula §6, F3,
 * revertendo o (a) da manhã): o período que o pacote cobre é lido do JOB de origem, que passou a
 * persisti-lo na geração — um `year` digitado deixava jobs de 2025 virarem "pronto para assinar
 * 2026". O operador escolhe os jobs; o sistema sabe o que eles cobrem.
 *
 * `extraJobIds` (C6b PR-3, F-C6b-4 a): até 20 jobs `EXPORTED` adicionais que entram no manifesto
 * como itens 2..n — validados pelo serviço (`AccountingDeliveryService.resolveExtras`), nunca pelo
 * DTO (o DTO só prova FORMA: array de strings não-vazias, ≤ 20). `.default([])` — omitir o campo é
 * "pacote sem extras", não erro.
 */
const extraJobIdsSchema = z.array(z.string().min(1)).max(20).default([]);

/** @openapi
 * components:
 *   schemas:
 *     BuildDeliveryPackageInput:
 *       type: object
 *       required: [unitId, ecdJobId, ecfJobId]
 *       properties:
 *         unitId:   { type: string }
 *         ecdJobId: { type: string, description: "Job EXPORTED da ECD (referência — o .txt nunca é copiado); o período vem dele" }
 *         ecfJobId: { type: string, description: "Job EXPORTED da ECF — tem de cobrir o MESMO período da ECD" }
 *         extraJobIds: { type: array, items: { type: string }, maxItems: 20, description: "Até 20 jobs EXPORTED extras (balancete, razão, conciliação, amostra, BP, DRE) — SPED nunca é extra" }
 */
export const BuildDeliveryPackageSchema = z
  .object({
    unitId: z.string().min(1),
    ecdJobId: z.string().min(1),
    ecfJobId: z.string().min(1),
    extraJobIds: extraJobIdsSchema,
  })
  .strict();

/** @openapi
 * components:
 *   schemas:
 *     ConfirmDeliveryInput:
 *       type: object
 *       required: [unitId, ecdJobId, ecfJobId, contactId, confirmed]
 *       properties:
 *         unitId:    { type: string }
 *         ecdJobId:  { type: string }
 *         ecfJobId:  { type: string }
 *         contactId: { type: string, description: "Contador escolhido — a resposta devolve contact e o signer J930 montado dele (D7)" }
 *         confirmed: { type: boolean, enum: [true], description: "Confirmação explícita do operador (D6) — nunca implícita" }
 *         extraJobIds: { type: array, items: { type: string }, maxItems: 20, description: "Mesmo conjunto do build — divergir de uma entrega já existente é 409 PACKAGE_ALREADY_DELIVERED" }
 */
export const ConfirmDeliverySchema = z
  .object({
    unitId: z.string().min(1),
    ecdJobId: z.string().min(1),
    ecfJobId: z.string().min(1),
    contactId: z.string().min(1),
    // D6: a confirmação é do OPERADOR e é explícita. `z.literal(true)` recusa `false` e recusa
    // ausência — não existe caminho de confirmação implícita.
    confirmed: z.literal(true),
    extraJobIds: extraJobIdsSchema,
  })
  .strict();

/** @openapi
 * components:
 *   schemas:
 *     PackageProfileInput:
 *       type: object
 *       required: [kinds]
 *       properties:
 *         kinds:
 *           type: array
 *           maxItems: 20
 *           items: { type: string, enum: [EXPORT_TRIAL_BALANCE, EXPORT_GENERAL_LEDGER, EXPORT_BALANCE_SHEET, EXPORT_INCOME_STATEMENT, EXPORT_BANK_RECONCILIATION, EXPORT_ENTRY_SAMPLE] }
 *           description: "Kinds que a UI pré-marca no build — SUGESTÃO, não gate (C6b PR-3, F-C6b-2 a)"
 */
export const PackageProfileSchema = z
  .object({
    kinds: z.array(z.enum(DELIVERABLE_EXPORT_KINDS)).max(20),
  })
  .strict();

/** @openapi
 * components:
 *   schemas:
 *     PackageProfileScopeQuery:
 *       type: object
 *       required: [unitId, contactId]
 *       properties:
 *         unitId:    { type: string }
 *         contactId: { type: string }
 */
export const PackageProfileQuerySchema = z.object({
  unitId: z.string().min(1),
  contactId: z.string().min(1),
});

/** @openapi
 * components:
 *   schemas:
 *     RetryDeliveryInput:
 *       type: object
 *       required: [unitId, deliveryId]
 *       properties:
 *         unitId:     { type: string }
 *         deliveryId: { type: string, description: "DEVE ser igual ao :id do path — divergência é 400" }
 */
export const RetryDeliverySchema = z
  .object({
    unitId: z.string().min(1),
    deliveryId: z.string().min(1),
  })
  .strict();

/** @openapi
 * components:
 *   schemas:
 *     AccountingDeliveryScopeQuery:
 *       type: object
 *       required: [unitId]
 *       properties:
 *         unitId: { type: string }
 */
export const AccountingDeliveryScopeQuerySchema = z.object({
  unitId: z.string().min(1),
});

export type BuildDeliveryPackageInput = z.infer<typeof BuildDeliveryPackageSchema>;
export type ConfirmDeliveryInput = z.infer<typeof ConfirmDeliverySchema>;
export type RetryDeliveryInput = z.infer<typeof RetryDeliverySchema>;
export type AccountingDeliveryScopeQueryInput = z.infer<typeof AccountingDeliveryScopeQuerySchema>;
export type PackageProfileInput = z.infer<typeof PackageProfileSchema>;
export type PackageProfileQueryInput = z.infer<typeof PackageProfileQuerySchema>;

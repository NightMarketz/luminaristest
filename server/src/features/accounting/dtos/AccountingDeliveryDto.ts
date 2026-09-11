import { z } from 'zod';

/**
 * AccountingDeliveryDto — comandos da entrega do pacote ECD/ECF ao contador
 * (BE-INCR-CONTADOR-DELIVERY, itens 6/9/11). Todos `.strict()`.
 *
 * NÃO há `year` no corpo (Fork Novo A → **(b)**, ratificado pelo dono 2026-09-10 na cédula §6, F3,
 * revertendo o (a) da manhã): o período que o pacote cobre é lido do JOB de origem, que passou a
 * persisti-lo na geração — um `year` digitado deixava jobs de 2025 virarem "pronto para assinar
 * 2026". O operador escolhe os jobs; o sistema sabe o que eles cobrem.
 */

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
 */
export const BuildDeliveryPackageSchema = z
  .object({
    unitId: z.string().min(1),
    ecdJobId: z.string().min(1),
    ecfJobId: z.string().min(1),
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
  })
  .strict();

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

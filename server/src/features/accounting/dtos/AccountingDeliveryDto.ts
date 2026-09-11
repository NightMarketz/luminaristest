import { z } from 'zod';

/**
 * AccountingDeliveryDto — comandos da entrega do pacote ECD/ECF ao contador
 * (BE-INCR-CONTADOR-DELIVERY, itens 6/9/11). Todos `.strict()`.
 *
 * `year` é EXPLÍCITO no corpo (Fork Novo A → (a), ratificado pelo dono 2026-09-10): o job de origem
 * (`AccountingDataExchangeJob`) **não persiste ano** — é parâmetro transiente do DTO de geração —
 * e derivar do `originalName` (`ecd_<cnpj>_<year>.txt`) seria contrato em cima de nome de exibição,
 * que muda e quebra em silêncio. O operador informa; o log registra o que foi entregue.
 */

/** @openapi
 * components:
 *   schemas:
 *     BuildDeliveryPackageInput:
 *       type: object
 *       required: [unitId, ecdJobId, ecfJobId, year]
 *       properties:
 *         unitId:   { type: string }
 *         ecdJobId: { type: string, description: "Job EXPORTED da ECD (referência — o .txt nunca é copiado)" }
 *         ecfJobId: { type: string, description: "Job EXPORTED da ECF" }
 *         year:     { type: integer, description: "Ano-calendário coberto — o job não persiste ano (Fork Novo A)" }
 */
export const BuildDeliveryPackageSchema = z
  .object({
    unitId: z.string().min(1),
    ecdJobId: z.string().min(1),
    ecfJobId: z.string().min(1),
    year: z.number().int().gte(2000).lte(2100),
  })
  .strict();

/** @openapi
 * components:
 *   schemas:
 *     ConfirmDeliveryInput:
 *       type: object
 *       required: [unitId, ecdJobId, ecfJobId, year, contactId, confirmed]
 *       properties:
 *         unitId:    { type: string }
 *         ecdJobId:  { type: string }
 *         ecfJobId:  { type: string }
 *         year:      { type: integer }
 *         contactId: { type: string, description: "Contador escolhido — a resposta devolve nome e CRC dele (D7)" }
 *         confirmed: { type: boolean, enum: [true], description: "Confirmação explícita do operador (D6) — nunca implícita" }
 */
export const ConfirmDeliverySchema = z
  .object({
    unitId: z.string().min(1),
    ecdJobId: z.string().min(1),
    ecfJobId: z.string().min(1),
    year: z.number().int().gte(2000).lte(2100),
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

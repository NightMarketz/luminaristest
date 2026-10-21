import { z } from 'zod';

/**
 * IBS-CBS-2027 PR-2 (BRIEF `docs/accounting/BE-INCR-IBS-CBS-2027-brief.md` itens 9, 10, 13; contrato §4.2) — `.strict()`.
 * `unitId` = unidade lida (escopo/policy + proveniência), como em todo DTO de apuração (X7/X8; o esboço do §4.2 não o
 * listava). `anoCalendario < 2027` ⇒ 400 nomeado (F-IBS-7 b; o serviço repete a recusa).
 */
export const IBS_CBS_INICIO_MSG = 'apuração de IBS/CBS começa em 01/2027 — F-IBS-7 (b), dispensa do art. 348 § 1º';

const Ano = z.number().int().min(2027, { message: IBS_CBS_INICIO_MSG });

/** @openapi
 * components:
 *   schemas:
 *     IbsCbsAssessmentPreviewInput:
 *       type: object
 *       required: [unitId, anoCalendario, mes, tributo]
 *       properties:
 *         unitId:        { type: string, description: "Unidade lida (proveniência; outra unidade da PJ com movimento no mês ⇒ 400)" }
 *         anoCalendario: { type: integer, minimum: 2027, description: "< 2027 ⇒ 400 (F-IBS-7 b — dispensa do art. 348 § 1º)" }
 *         mes:           { type: integer, minimum: 1, maximum: 12 }
 *         tributo:       { type: string, enum: [IBS, CBS] }
 */
export const IbsCbsAssessmentPreviewSchema = z
  .object({
    unitId: z.string().min(1),
    anoCalendario: Ano,
    mes: z.number().int().min(1).max(12),
    tributo: z.enum(['IBS', 'CBS']),
  })
  .strict();
export type IbsCbsAssessmentPreviewInput = z.infer<typeof IbsCbsAssessmentPreviewSchema>;

/** @openapi
 * components:
 *   schemas:
 *     IbsCbsAssessmentConfirmInput:
 *       allOf:
 *         - $ref: '#/components/schemas/IbsCbsAssessmentPreviewInput'
 *         - type: object
 *           required: [expectedSupersedesId]
 *           properties:
 *             expectedSupersedesId: { type: string, nullable: true, description: "CAS — id da apuração CONFIRMED viva do mês/tributo (null = 1ª confirmação); divergente ⇒ 409" }
 */
export const IbsCbsAssessmentConfirmSchema = IbsCbsAssessmentPreviewSchema.extend({
  expectedSupersedesId: z.string().min(1).nullable(),
}).strict();
export type IbsCbsAssessmentConfirmInput = z.infer<typeof IbsCbsAssessmentConfirmSchema>;

export const IbsCbsAssessmentListQuerySchema = z
  .object({
    unitId: z.string().min(1),
    anoCalendario: z.coerce.number().int().min(2027, { message: IBS_CBS_INICIO_MSG }),
  })
  .strict();
export type IbsCbsAssessmentListQuery = z.infer<typeof IbsCbsAssessmentListQuerySchema>;

/** Corpo do reconcile (`POST /:id/provisao`, dono 21/10): só o escopo. */
export const IbsCbsAssessmentScopeSchema = z.object({ unitId: z.string().min(1) }).strict();

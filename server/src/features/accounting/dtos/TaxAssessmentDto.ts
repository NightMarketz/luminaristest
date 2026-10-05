import { z } from 'zod';
import { PERIODOS_TRIMESTRAIS } from '../models/taxAssessmentCalc';

/**
 * BE-INCR-TAX-ASSESSMENT Fase A PR-2 (nó X7, BRIEF itens 13, 14, 17; contrato §2) — `.strict()`, centavos como
 * string de dígitos. `unitId` = unidade lida (escopo/policy + proveniência, F-X7-7 a). Nos GET o `unitId` só resolve
 * escopo/policy: a lista é da PJ inteira (decisão do dono, 04/10 — o ListQuery do §2 não tinha `unitId`).
 */
const Cents = z.string().regex(/^\d+$/);
const Periodo = z.enum(PERIODOS_TRIMESTRAIS);

export const TaxAssessmentDeducaoSchema = z
  .object({
    tributo: z.enum(['IRPJ', 'CSLL']),
    tipo: z.enum(['IRRF', 'CSLL_RETIDA', 'OUTRA']),
    valorCents: Cents,
    documento: z.string().max(120).optional(),
  })
  .strict()
  .refine((d) => d.tipo !== 'OUTRA' || !!d.documento, { message: 'OUTRA exige documento' })
  .refine((d) => (d.tipo === 'IRRF') === (d.tributo === 'IRPJ') || d.tipo === 'OUTRA', { message: 'IRRF↔IRPJ, CSLL_RETIDA↔CSLL' });

/** @openapi
 * components:
 *   schemas:
 *     TaxAssessmentPreviewInput:
 *       type: object
 *       required: [unitId, anoCalendario, periodo]
 *       properties:
 *         unitId:        { type: string, description: "Unidade lida (proveniência, F-X7-7 a)" }
 *         anoCalendario: { type: integer, minimum: 2025 }
 *         periodo:       { type: string, enum: [T01, T02, T03, T04] }
 *         deducoes:
 *           type: array
 *           maxItems: 50
 *           items:
 *             type: object
 *             required: [tributo, tipo, valorCents]
 *             properties:
 *               tributo:    { type: string, enum: [IRPJ, CSLL] }
 *               tipo:       { type: string, enum: [IRRF, CSLL_RETIDA, OUTRA], description: "IRRF só no IRPJ, CSLL_RETIDA só na CSLL; OUTRA exige documento" }
 *               valorCents: { type: string, pattern: "^[0-9]+$" }
 *               documento:  { type: string, maxLength: 120 }
 *     TaxAssessmentConfirmInput:
 *       allOf:
 *         - $ref: '#/components/schemas/TaxAssessmentPreviewInput'
 *         - type: object
 *           required: [expectedAPagarCents]
 *           properties:
 *             expectedAPagarCents:
 *               type: object
 *               required: [IRPJ, CSLL]
 *               properties:
 *                 IRPJ: { type: string, pattern: "^[0-9]+$" }
 *                 CSLL: { type: string, pattern: "^[0-9]+$" }
 *             supersedesIds: { type: array, maxItems: 2, items: { type: string } }
 */
export const TaxAssessmentPreviewSchema = z
  .object({
    unitId: z.string().min(1),
    anoCalendario: z.number().int().min(2025),
    periodo: Periodo,
    deducoes: z.array(TaxAssessmentDeducaoSchema).max(50).default([]),
  })
  .strict();
export type TaxAssessmentPreviewInput = z.infer<typeof TaxAssessmentPreviewSchema>;

export const TaxAssessmentConfirmSchema = TaxAssessmentPreviewSchema.extend({
  expectedAPagarCents: z.object({ IRPJ: Cents, CSLL: Cents }).strict(),
  supersedesIds: z.array(z.string().min(1)).max(2).optional(),
}).strict();
export type TaxAssessmentConfirmInput = z.infer<typeof TaxAssessmentConfirmSchema>;

/** Sem boolean em query string (classe z.coerce.boolean). */
export const TaxAssessmentListQuerySchema = z
  .object({
    unitId: z.string().min(1),
    anoCalendario: z.coerce.number().int(),
    periodo: Periodo.optional(),
    status: z.enum(['CONFIRMED', 'SUPERSEDED']).optional(),
  })
  .strict();
export type TaxAssessmentListQuery = z.infer<typeof TaxAssessmentListQuerySchema>;

export const TaxAssessmentScopeQuerySchema = z.object({ unitId: z.string().min(1) }).strict();

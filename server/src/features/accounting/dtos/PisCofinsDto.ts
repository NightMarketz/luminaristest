import { z } from 'zod';
import { PERIODOS_PIS_COFINS } from '../models/pisCofinsCalc';
import { PIS_COFINS_REVOGACAO_FONTE } from '../models/pisCofinsParams';

/**
 * BE-INCR-PIS-COFINS PR-2 (nó X8, BRIEF itens 7–14, contrato §2) — `.strict()`, centavos como string de dígitos.
 * `unitId` = unidade lida (escopo/policy + proveniência, F-X7-7 a por precedente, ADR D5). As regras que dependem do
 * perfil (documento da cota-parte, cumulativo sem crédito, 1º mês do saldo credor) são do serviço.
 */
const Cents = z.string().regex(/^\d+$/);

/** @openapi
 * components:
 *   schemas:
 *     PisCofinsPreviewInput:
 *       type: object
 *       required: [unitId, anoCalendario, periodo]
 *       properties:
 *         unitId:        { type: string, description: "Unidade lida (proveniência; outra unidade da PJ com movimento no mês ⇒ 400)" }
 *         anoCalendario: { type: integer, minimum: 2025, maximum: 2026, description: "2027+ ⇒ 400 (PIS/Cofins revogados — LC 214/2025 art. 542)" }
 *         periodo:       { type: string, enum: [M01, M02, M03, M04, M05, M06, M07, M08, M09, M10, M11, M12] }
 *         ajustesBase:
 *           type: array
 *           maxItems: 50
 *           items:
 *             type: object
 *             required: [tipo, valorCents]
 *             properties:
 *               tipo:       { type: string, enum: [ALIQUOTA_ZERO_REVENDA, COTA_PARTE_PARCEIRO], description: "Σ ≤ revenda / serviço do mês; COTA_PARTE_PARCEIRO exige documento (contrato de parceria)" }
 *               valorCents: { type: string, pattern: "^[0-9]+$" }
 *               documento:  { type: string, maxLength: 120 }
 *         outrosCreditos:
 *           type: array
 *           maxItems: 50
 *           description: "Só no não cumulativo (Lei 10.833 art. 3º); no cumulativo ⇒ 400"
 *           items:
 *             type: object
 *             required: [inciso, baseCents]
 *             properties:
 *               inciso:    { type: string, enum: [III_ENERGIA, IV_ALUGUEL_PJ, V_ARRENDAMENTO, VI_VII_DEPRECIACAO, IX_FRETE_VENDA] }
 *               baseCents: { type: string, pattern: "^[0-9]+$" }
 *               documento: { type: string, maxLength: 120 }
 *         retencoes:
 *           type: array
 *           maxItems: 50
 *           items:
 *             type: object
 *             required: [tributo, valorCents]
 *             properties:
 *               tributo:    { type: string, enum: [PIS, COFINS] }
 *               valorCents: { type: string, pattern: "^[0-9]+$" }
 *               documento:  { type: string, maxLength: 120 }
 *         saldoCredorAnterior:
 *           type: object
 *           required: [PIS, COFINS]
 *           description: "Só no 1º mês apurado no sistema (F-PCB-2 a); nos demais ⇒ 400"
 *           properties:
 *             PIS:    { type: string, pattern: "^[0-9]+$" }
 *             COFINS: { type: string, pattern: "^[0-9]+$" }
 *     PisCofinsConfirmInput:
 *       allOf:
 *         - $ref: '#/components/schemas/PisCofinsPreviewInput'
 *         - type: object
 *           required: [expectedAPagarCents]
 *           properties:
 *             expectedAPagarCents:
 *               type: object
 *               required: [PIS, COFINS]
 *               properties:
 *                 PIS:    { type: string, pattern: "^[0-9]+$" }
 *                 COFINS: { type: string, pattern: "^[0-9]+$" }
 *             supersedesIds: { type: array, maxItems: 2, items: { type: string } }
 */
const PisCofinsPreviewFields = {
  unitId: z.string().min(1),
  anoCalendario: z
    .number()
    .int()
    .min(2025)
    .max(2026, { message: `PIS/Cofins revogados a partir de 2027-01 (${PIS_COFINS_REVOGACAO_FONTE}) — CBS é da onda 3.` }),
  periodo: z.enum(PERIODOS_PIS_COFINS),
  ajustesBase: z
    .array(
      z
        .object({
          tipo: z.enum(['ALIQUOTA_ZERO_REVENDA', 'COTA_PARTE_PARCEIRO']),
          valorCents: Cents,
          documento: z.string().max(120).optional(), // obrigatório em COTA_PARTE_PARCEIRO (serviço, item 7)
        })
        .strict(),
    )
    .max(50)
    .default([]),
  outrosCreditos: z
    .array(
      z
        .object({
          inciso: z.enum(['III_ENERGIA', 'IV_ALUGUEL_PJ', 'V_ARRENDAMENTO', 'VI_VII_DEPRECIACAO', 'IX_FRETE_VENDA']),
          baseCents: Cents,
          documento: z.string().max(120).optional(),
        })
        .strict(),
    )
    .max(50)
    .default([]),
  retencoes: z
    .array(z.object({ tributo: z.enum(['PIS', 'COFINS']), valorCents: Cents, documento: z.string().max(120).optional() }).strict())
    .max(50)
    .default([]),
  saldoCredorAnterior: z.object({ PIS: Cents, COFINS: Cents }).strict().optional(), // F-PCB-2 (a): só no 1º mês apurado
};

export const PisCofinsPreviewSchema = z.object(PisCofinsPreviewFields).strict();
export type PisCofinsPreviewInput = z.infer<typeof PisCofinsPreviewSchema>;

export const PisCofinsConfirmSchema = z
  .object({
    ...PisCofinsPreviewFields,
    expectedAPagarCents: z.object({ PIS: Cents, COFINS: Cents }).strict(), // CAS ⇒ 409
    supersedesIds: z.array(z.string().min(1)).max(2).optional(),
  })
  .strict();
export type PisCofinsConfirmInput = z.infer<typeof PisCofinsConfirmSchema>;

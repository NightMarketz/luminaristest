import { z } from 'zod';
import { PERIODOS_TRIMESTRAIS } from '../models/taxAssessmentCalc';
import { LALUR_MESES } from '../models/Lalur.model';
import { PERIODOS_PIS_COFINS } from '../models/pisCofinsCalc';

/**
 * BE-INCR-TAX-ASSESSMENT Fase A PR-2 (nó X7, BRIEF itens 13, 14, 17; contrato §2) — `.strict()`, centavos como
 * string de dígitos. `unitId` = unidade lida (escopo/policy + proveniência, F-X7-7 a). Nos GET o `unitId` só resolve
 * escopo/policy: a lista é da PJ inteira (decisão do dono, 04/10 — o ListQuery do §2 não tinha `unitId`).
 */
const Cents = z.string().regex(/^\d+$/);
/** X7 Fase B (item 11, F-TB-1 a): `T01..T04` e `A00..A12` — o vocabulário do e-Lalur e do `PER_APUR` da ECF. */
export const PERIODOS_APURACAO = [...PERIODOS_TRIMESTRAIS, 'A00', ...LALUR_MESES] as const;
const Periodo = z.enum(PERIODOS_APURACAO);
const isMes = (p: string): boolean => (LALUR_MESES as readonly string[]).includes(p);

/** Item 10 / F-TB-2 (b) — o pago informado por mês e tributo, só no `A00`. */
export const EstimativaPagaSchema = z
  .object({ periodo: z.enum(LALUR_MESES), tributo: z.enum(['IRPJ', 'CSLL']), valorCents: Cents })
  .strict();

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
 *         periodo:       { type: string, enum: [T01, T02, T03, T04, A00, A01, A02, A03, A04, A05, A06, A07, A08, A09, A10, A11, A12], description: "T0x só na forma trimestral do perfil do ano; A00..A12 só na anual (senão 400)" }
 *         modoMensal:    { type: string, enum: [RECEITA_BRUTA, BALANCETE], description: "Obrigatório em A01..A12 e proibido nos demais (X7 Fase B item 11)" }
 *         estimativasPagas:
 *           type: array
 *           maxItems: 24
 *           description: "Só no A00 (F-TB-2 b): o pago por mês; mês ausente ⇒ assume o confirmado. (periodo, tributo) repetido ⇒ 400"
 *           items:
 *             type: object
 *             required: [periodo, tributo, valorCents]
 *             properties:
 *               periodo:    { type: string, enum: [A01, A02, A03, A04, A05, A06, A07, A08, A09, A10, A11, A12] }
 *               tributo:    { type: string, enum: [IRPJ, CSLL] }
 *               valorCents: { type: string, pattern: "^[0-9]+$" }
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
const TaxAssessmentPreviewFields = z
  .object({
    unitId: z.string().min(1),
    anoCalendario: z.number().int().min(2025),
    periodo: Periodo,
    deducoes: z.array(TaxAssessmentDeducaoSchema).max(50).default([]),
    // X7 Fase B (item 11): o modo do mês é escolha do contribuinte; IRPJ e CSLL no mesmo modo (art. 31 § 7º)
    modoMensal: z.enum(['RECEITA_BRUTA', 'BALANCETE']).optional(),
    estimativasPagas: z.array(EstimativaPagaSchema).max(24).optional(),
  })
  .strict();

/**
 * Item 11: `modoMensal` obrigatório ⇔ `A01..A12`; `estimativasPagas` só no `A00`, sem (periodo, tributo) repetido
 * (decisão do dono 05/10, lacuna 3 do PR-1 — nunca ignorar a 2ª entrada em silêncio). Forma × perfil é do serviço.
 */
function refinePeriodo(v: { periodo: string; modoMensal?: string; estimativasPagas?: { periodo: string; tributo: string }[] }, ctx: z.RefinementCtx): void {
  if (isMes(v.periodo) && !v.modoMensal) {
    ctx.addIssue({ code: 'custom', path: ['modoMensal'], message: `modoMensal é obrigatório em ${v.periodo} (RECEITA_BRUTA ou BALANCETE — X7 BRIEF B item 11).` });
  }
  if (!isMes(v.periodo) && v.modoMensal) {
    ctx.addIssue({ code: 'custom', path: ['modoMensal'], message: `modoMensal só existe em A01..A12; ${v.periodo} não tem modo mensal.` });
  }
  if (v.estimativasPagas !== undefined && v.periodo !== 'A00') {
    ctx.addIssue({ code: 'custom', path: ['estimativasPagas'], message: 'estimativasPagas só no ajuste anual (A00 — F-TB-2 b).' });
  }
  const vistos = new Set<string>();
  v.estimativasPagas?.forEach((p, i) => {
    const k = `${p.periodo}/${p.tributo}`;
    if (vistos.has(k)) ctx.addIssue({ code: 'custom', path: ['estimativasPagas', i], message: `estimativasPagas: ${k} repetido no mesmo payload.` });
    vistos.add(k);
  });
}

export const TaxAssessmentPreviewSchema = TaxAssessmentPreviewFields.superRefine(refinePeriodo);
export type TaxAssessmentPreviewInput = z.infer<typeof TaxAssessmentPreviewSchema>;

export const TaxAssessmentConfirmSchema = TaxAssessmentPreviewFields.extend({
  expectedAPagarCents: z.object({ IRPJ: Cents, CSLL: Cents }).strict(),
  supersedesIds: z.array(z.string().min(1)).max(2).optional(),
})
  .strict()
  .superRefine(refinePeriodo);
export type TaxAssessmentConfirmInput = z.infer<typeof TaxAssessmentConfirmSchema>;

/**
 * Sem boolean em query string (classe z.coerce.boolean). X8 PR-2 (BRIEF X8 itens 12 e 16): a leitura serve também as
 * linhas de PIS/Cofins — `periodo` aceita `M01..M12` e o filtro `tributo` aceita PIS/COFINS.
 */
export const TaxAssessmentListQuerySchema = z
  .object({
    unitId: z.string().min(1),
    anoCalendario: z.coerce.number().int(),
    periodo: z.enum([...PERIODOS_APURACAO, ...PERIODOS_PIS_COFINS]).optional(),
    tributo: z.enum(['IRPJ', 'CSLL', 'PIS', 'COFINS']).optional(),
    status: z.enum(['CONFIRMED', 'SUPERSEDED']).optional(),
  })
  .strict();
export type TaxAssessmentListQuery = z.infer<typeof TaxAssessmentListQuerySchema>;

export const TaxAssessmentScopeQuerySchema = z.object({ unitId: z.string().min(1) }).strict();

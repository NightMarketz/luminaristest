import { z } from 'zod';

/**
 * BE-INCR-TAX-ASSESSMENT-PERIODOS (nó TAX-ASSESSMENT-PERIODOS) — contratos da leitura dos períodos esperados do ano
 * por família de tributo. BRIEF `docs/accounting/BE-INCR-TAX-ASSESSMENT-PERIODOS-brief.md` §2 (itens 3, 7, 8);
 * forks F-P1..F-P4 ratificados em 08/10.
 */

/** Item 3: `unitId` não vazio, `anoCalendario` int 2000..2100; chave extra ⇒ 400. */
export const TaxAssessmentPeriodosQuerySchema = z
  .object({
    unitId: z.string().min(1),
    anoCalendario: z.coerce.number().int().min(2000).max(2100),
  })
  .strict();
export type TaxAssessmentPeriodosQuery = z.infer<typeof TaxAssessmentPeriodosQuerySchema>;

export const ESTADOS_PERIODO = ['SEM_APURACAO', 'CONFIRMED', 'SO_SUPERSEDED', 'FORA_DA_ATIVIDADE', 'REVOGADO'] as const;
export type EstadoPeriodo = (typeof ESTADOS_PERIODO)[number];

export const MOTIVOS_NAO_APURAVEL = ['PERFIL_AUSENTE', 'REGIME_DAS', 'REGIME_MEI', 'REGIME_NAO_SIMPLES', 'REGIME_SEM_APURACAO'] as const;
export type MotivoNaoApuravel = (typeof MOTIVOS_NAO_APURAVEL)[number];

/** Item 7 + F-P4 (a): `id` e `aPagarCents` só no estado `CONFIRMED`. */
export const EstadoTributoSchema = z
  .object({
    estado: z.enum(ESTADOS_PERIODO),
    id: z.string().min(1).optional(),
    aPagarCents: z.string().regex(/^-?\d+$/).optional(),
  })
  .strict();

export const PeriodoEsperadoSchema = z
  .object({
    periodo: z.string().min(1), // T01..T04 | A01..A12 | A00 | M01..M12 | YYYY-MM
    tributos: z.record(z.string(), EstadoTributoSchema), // IRPJ, CSLL | PIS, COFINS | DAS
    motivo: z.string().optional(),
  })
  .strict();

export const FamiliaPeriodosSchema = z
  .object({
    familia: z.enum(['X7', 'X8', 'SIMPLES']),
    apuravel: z.boolean(),
    motivo: z.enum(MOTIVOS_NAO_APURAVEL).optional(),
    forma: z.enum(['TRIMESTRAL', 'ANUAL']).optional(),
    modalidade: z.enum(['CUMULATIVO', 'NAO_CUMULATIVO']).optional(),
    periodos: z.array(PeriodoEsperadoSchema),
  })
  .strict();

export const TaxAssessmentPeriodosViewSchema = z
  .object({
    anoCalendario: z.number().int(),
    regime: z.string().nullable(),
    familias: z.array(FamiliaPeriodosSchema),
  })
  .strict();
export type TaxAssessmentPeriodosView = z.infer<typeof TaxAssessmentPeriodosViewSchema>;
export type FamiliaPeriodos = z.infer<typeof FamiliaPeriodosSchema>;
export type PeriodoEsperado = z.infer<typeof PeriodoEsperadoSchema>;

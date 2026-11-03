import { z } from 'zod';
import { isValidDateOnly } from '../models/dates';

/**
 * EFICIENCIA-FISCAL PR-1 itens 5 e 7 (BRIEF BE-INCR-EFICIENCIA-FISCAL §4.2/§4.3; ADR-INCR-EFICIENCIA-FISCAL D3, F-EF-1 a,
 * F-EF-3 a, F-EF-14 a) — política de eficiência fiscal da unidade, custo de serviço (piso) e decisão de sugestão. `.strict()`.
 * `severidadePisoProporcional` NÃO entra no PUT (F-EF-14 a: fixo por enquanto). Um schema para POST e PUT (sem `.partial()`).
 */
const dateOnly = (field: string) => z.string().refine(isValidDateOnly, `${field} deve ser uma data real YYYY-MM-DD`);

export const CRITERIOS_ALOCACAO = ['PROPORCIONAL_CATALOGO', 'CARGA_TRIBUTARIA'] as const;
export const PISOS_SERVICO = ['CUSTO_INFORMADO', 'CATALOGO_MINIMO', 'SEM_DESCONTO_ALEM_DO_PROPORCIONAL'] as const;
export const SUGGESTION_STATUSES = ['PROPOSED', 'ACCEPTED', 'REJECTED', 'EXPIRED'] as const;
export type SuggestionStatus = (typeof SUGGESTION_STATUSES)[number];

export const TaxOptimizationScopeQuerySchema = z.object({ unitId: z.string().min(1) }).strict();

export const UpdateTaxOptimizationPolicySchema = z
  .object({
    unitId: z.string().min(1),
    criterioAlocacao: z.enum(CRITERIOS_ALOCACAO),
    pisoServico: z.enum(PISOS_SERVICO),
    vigenteDesde: dateOnly('vigenteDesde'),
  })
  .strict();
export type UpdateTaxOptimizationPolicyInput = z.infer<typeof UpdateTaxOptimizationPolicySchema>;

const cents = z.coerce.bigint().min(0n).max(BigInt(Number.MAX_SAFE_INTEGER));

export const ServiceCostEvidenceCreateSchema = z
  .object({
    unitId: z.string().min(1),
    serviceRef: z.string().min(1),
    custoCents: cents.nullable().default(null),
    catalogoMinimoCents: cents.nullable().default(null),
    sourceDocumentId: z.string().min(1).nullable().default(null),
    vigenteDesde: dateOnly('vigenteDesde'),
    vigenteAte: dateOnly('vigenteAte').nullable().default(null),
  })
  .strict()
  .refine((v) => v.custoCents !== null || v.catalogoMinimoCents !== null, {
    message: 'informe custoCents (com evidência) ou catalogoMinimoCents (F-EF-1 a)',
    path: ['custoCents'],
  })
  .refine((v) => v.custoCents === null || v.sourceDocumentId !== null, {
    message: 'custo informado exige sourceDocumentId (evidência — BRIEF §4.1)',
    path: ['sourceDocumentId'],
  })
  .refine((v) => v.vigenteAte === null || v.vigenteAte >= v.vigenteDesde, { message: 'vigenteAte antes de vigenteDesde', path: ['vigenteAte'] });
export type ServiceCostEvidenceInput = z.infer<typeof ServiceCostEvidenceCreateSchema>;

export const TaxOptimizationIdParamSchema = z.object({ id: z.string().min(1) }).strict();

// `ownerUserId`: par contador × dono (resolver delegado do GOV-CONTADOR) — o contador lê e decide no livro do dono.
export const SuggestionListQuerySchema = z
  .object({ unitId: z.string().min(1), ownerUserId: z.string().min(1).optional(), status: z.enum(SUGGESTION_STATUSES).optional() })
  .strict();

export const DecideSuggestionSchema = z
  .object({ unitId: z.string().min(1), ownerUserId: z.string().min(1).optional(), reason: z.string().trim().min(3).max(280).optional() })
  .strict();
export type DecideSuggestionInput = z.infer<typeof DecideSuggestionSchema>;

/**
 * EFICIENCIA-FISCAL PR-4 itens 22–23 (BRIEF BE-INCR-EFICIENCIA-FISCAL §4.3; ADR D9; D-2026-10-28-EFICIENCIA-FISCAL-PR4-EXECUCAO
 * #5 e #6) — `GET /api/accounting/tax-optimization/report?competencia=`. Soma só ACCEPTED (I-11): PROPOSED/REJECTED/EXPIRED
 * aparecem em contagem, nunca em centavos. Policy `canManageTaxAssessment` (BRIEF §4.3).
 */
export const TaxOptimizationReportQuerySchema = z
  .object({
    unitId: z.string().min(1),
    competencia: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'competência = YYYY-MM'),
  })
  .strict();
export type TaxOptimizationReportQuery = z.infer<typeof TaxOptimizationReportQuerySchema>;

/** Linhas medidas (D9) além das práticas: a segregação e o desconto incondicional, só no Simples. */
export const CODIGOS_LINHA_MEDIDA = ['SEGREGACAO_MEDIDA', 'DESCONTO_INCONDICIONAL_MEDIDO'] as const;
export const TIPOS_LINHA_RELATORIO = ['SUGESTAO_ACEITA', 'MEDIDA', 'CONSUMIDA'] as const;

const centsString = z.string().regex(/^\d+$/, 'centavos ≥ 0 como string');

export const TaxOptimizationReportLinhaSchema = z
  .object({
    tipo: z.enum(TIPOS_LINHA_RELATORIO),
    codigo: z.string().min(1), // prática (TAX_PRACTICES) ou CODIGOS_LINHA_MEDIDA
    suggestionId: z.string().nullable(),
    disponivel: z.boolean(),
    /** null ⇔ NAO_DISPONIVEL. */
    economiaCents: centsString.nullable(),
    legalBasis: z.array(z.object({ norma: z.string(), artigo: z.string() }).strict()),
    detalhe: z.string(),
    /** Nó do plano de que a linha depende quando NAO_DISPONIVEL por falta de dado (item 22). */
    noDependente: z.string().nullable(),
  })
  .strict()
  .refine((l) => l.disponivel === (l.economiaCents !== null), { message: 'economiaCents null ⇔ NAO_DISPONIVEL', path: ['economiaCents'] });

export const TaxOptimizationReportSchema = z
  .object({
    competencia: z.string(),
    unitId: z.string(),
    linhas: z.array(TaxOptimizationReportLinhaSchema),
    totais: z.object({ aceitasCents: centsString, medidaCents: centsString, totalCents: centsString }).strict(),
    contagem: z.object({ PROPOSED: z.number().int().min(0), REJECTED: z.number().int().min(0), EXPIRED: z.number().int().min(0) }).strict(),
    parametrosSha256: z.string().regex(/^[0-9a-f]{64}$/),
  })
  .strict();
export type TaxOptimizationReport = z.infer<typeof TaxOptimizationReportSchema>;
export type TaxOptimizationReportLinha = z.infer<typeof TaxOptimizationReportLinhaSchema>;

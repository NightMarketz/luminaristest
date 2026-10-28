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

import { z } from 'zod';
import { ALERTAS_SERVICO } from '../models/servicoFiscalAvaliacao';

/**
 * EFICIENCIA-FISCAL PR-5 (BRIEF itens 27, 30, 31, 32; D-2026-10-28-EFICIENCIA-FISCAL-PR5-EXECUCAO lacuna 4) —
 * `POST /api/accounting/tax-optimization/servicos/avaliar?unitId=&ano=`: alertas de enquadramento dos serviços e as sugestões
 * `PRESUNCAO_HOSPITALAR` / `NBS_SAUDE_2027` do ano. `.strict()`. Arquivo próprio para não colidir com o PR-3/PR-4.
 */
export const ServicoFiscalAvaliacaoQuerySchema = z
  .object({ unitId: z.string().min(1), ano: z.coerce.number().int().gte(2025).lte(2100) })
  .strict();
export type ServicoFiscalAvaliacaoQuery = z.infer<typeof ServicoFiscalAvaliacaoQuerySchema>;

const centsStr = z.string().regex(/^\d+$/);

export const ServicoFiscalAvaliacaoResponseSchema = z
  .object({
    ano: z.number().int(),
    regime: z.string(),
    alertas: z.array(
      z
        .object({
          code: z.enum(ALERTAS_SERVICO),
          severity: z.enum(['WARN', 'INFO']),
          serviceRefs: z.array(z.string()),
          motivoInformativo: z.string(),
          legalBasis: z.string(),
        })
        .strict(),
    ),
    sugestoes: z.array(
      z
        .object({
          practice: z.enum(['PRESUNCAO_HOSPITALAR', 'NBS_SAUDE_2027']),
          serviceRef: z.string(),
          suggestionId: z.string(),
          estimatedSavingCents: centsStr,
          faltando: z.array(z.string()),
        })
        .strict(),
    ),
    avisos: z.array(z.string()),
  })
  .strict();
export type ServicoFiscalAvaliacaoView = z.infer<typeof ServicoFiscalAvaliacaoResponseSchema>;

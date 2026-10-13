import { z } from 'zod';

/**
 * Sugestão fiscal por serviço (BE-INCR-KIT-SETOR-EMENDA-1, PR-K3, itens 7b–7f; F-KE-3 b, F-KE-4 — dono 13/10).
 * Só sugere: nenhuma rota daqui grava perfil fiscal (7d). Aceitar é o PUT `/accounting/service-fiscal-profiles/:serviceRef`
 * que já existe, com o `cTribNac`/`cNBS` escolhido pelo usuário.
 */

export const SuggestionSchema = z
  .object({
    key: z.string(),
    cTribNac: z.string().regex(/^\d{6}$/),
    cNBS: z.string().regex(/^\d{9}$/).optional(),
    label: z.string(),
    origem: z.enum(['dicionario', 'ia']),
    /** Camada 1: o sinônimo que casou. */
    termo: z.string().optional(),
  })
  .strict();
export type Suggestion = z.infer<typeof SuggestionSchema>;

/** 7e — `GET /api/service-fiscal-suggestions?unitId=&ia=1`. `ia` só liga com `1` (nunca `z.coerce.boolean`). */
export const ServiceFiscalSuggestionsQuerySchema = z
  .object({
    unitId: z.string().min(1),
    ia: z.enum(['0', '1']).optional(),
  })
  .strict();
export type ServiceFiscalSuggestionsQuery = z.infer<typeof ServiceFiscalSuggestionsQuerySchema>;

/** 7f — `POST /api/service-fiscal-suggestions/preview`. */
export const ServiceFiscalSuggestionPreviewSchema = z
  .object({
    unitId: z.string().min(1),
    nome: z.string().trim().min(1).max(200),
  })
  .strict();
export type ServiceFiscalSuggestionPreviewInput = z.infer<typeof ServiceFiscalSuggestionPreviewSchema>;

/** Item da varredura: um serviço da tabela `services` do dono sem perfil fiscal nesta unidade. */
export const PendingServiceSuggestionSchema = z
  .object({
    serviceRef: z.string(),
    nome: z.string(),
    sugestoes: z.array(SuggestionSchema),
  })
  .strict();
export type PendingServiceSuggestion = z.infer<typeof PendingServiceSuggestionSchema>;

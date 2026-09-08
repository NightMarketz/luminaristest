import { z } from 'zod';
import { queryBoolean } from './queryPrimitives';

/**
 * BE-INCR-RECONCILE-PENDING (nó C7) — DTOs Zod para a tabela de pendências do reconcile.
 *
 * Autorização: CEDULA-DECISAO-2026-09-03-modulos.md, linha F-W2F-3/F-W2F-5 (RATIFICADO b);
 * forks de implementação (2, 3, 4, 5) e o residual 1-R ratificados por delegação em
 * CEDULA-DECISAO-2026-09-07-forks-sdd.md ("Ratifico as recomendações de todos os forks, segue").
 *
 * `.strict()` em toda entrada (checklist item 8): campo extra no corpo é REJEITADO (400), nunca
 * silenciosamente ignorado (classe `param-aceito-e-ignorado-e-bug`).
 */

/** Razão de pendência — poison (nunca resolve sozinho) vs transitório (resolve com tempo/ação). */
export const ReconcilePendingReasonCode = z.enum([
  'FAILED', // erro isolado não classificado (ex.: sale sem unitId)
  'ACCOUNTING_PERIOD_NOT_OPEN', // transitório — resolve quando o período reabre
  'MAX_CENTS_EXCEEDED', // poison — nunca resolve sem corrigir o dado de origem (Fork 1-R: RATIFICADO incluir)
]);
export type ReconcilePendingReasonCodeValue = z.infer<typeof ReconcilePendingReasonCode>;

/**
 * Query da listagem de pendências (GET /api/reconcile-pending, Fork 3-b).
 *
 * `includeResolved` usa `queryBoolean()` (memória `zod-coerce-boolean-inverte-query-string`) —
 * NUNCA `z.coerce.boolean()` cru: em query-string todo valor chega string e
 * `Boolean('false') === true` ligaria o filtro por engano.
 *
 * `cursor` (LACUNA DE SPEC assumida, registrada no relatório): o esboço do BRIEF só fixa a forma
 * (`z.string().optional()`), não a semântica. Assumido keyset por `id` crescente (cuid) — o
 * cursor é o `id` do último item da página anterior; a query seguinte pede `id > cursor`. Baixo
 * custo de estar errado (endpoint sem tela consumidora nesta fatia — Fork 3, tela fora).
 */
export const ListReconcilePendingQueryDto = z
  .object({
    unitId: z.string().min(1),
    reasonCode: ReconcilePendingReasonCode.optional(),
    includeResolved: queryBoolean(),
    cursor: z.string().min(1).optional(),
    limit: z.coerce.number().int().min(1).max(200).default(50),
  })
  .strict();
export type ListReconcilePendingQueryInput = z.infer<typeof ListReconcilePendingQueryDto>;

/**
 * Corpo do comando de re-varredura (POST /api/reconcile-pending/rescan, Fork 3-b). Sem
 * parâmetro livre. `ids` vazio/ausente = re-varre todas as pendências não resolvidas do escopo;
 * ids explícitos = subconjunto (checklist item 6).
 */
export const RescanReconcilePendingDto = z
  .object({
    unitId: z.string().min(1),
    ids: z.array(z.string().min(1)).max(500).optional(),
  })
  .strict();
export type RescanReconcilePendingInput = z.infer<typeof RescanReconcilePendingDto>;

/** Forma de saída de UM item pendente — nunca formato livre. */
export const ReconcilePendingItemViewDto = z
  .object({
    id: z.string(),
    sourceType: z.string(),
    sourceId: z.string(),
    reasonCode: ReconcilePendingReasonCode,
    reasonDetail: z.string(),
    firstSeenAt: z.string(), // ISO
    lastSeenAt: z.string(), // ISO
    resolvedAt: z.string().nullable(),
    attempts: z.number().int().nonnegative(),
  })
  .strict();
export type ReconcilePendingItemView = z.infer<typeof ReconcilePendingItemViewDto>;

/** Forma de saída da listagem paginada. */
export const ReconcilePendingListViewDto = z
  .object({
    items: z.array(ReconcilePendingItemViewDto),
    nextCursor: z.string().nullable(),
  })
  .strict();
export type ReconcilePendingListView = z.infer<typeof ReconcilePendingListViewDto>;

/** Forma de saída do comando de re-varredura. */
export const RescanReconcilePendingResultDto = z
  .object({
    attempted: z.number().int().nonnegative(),
    resolved: z.number().int().nonnegative(),
    stillPending: z.number().int().nonnegative(),
  })
  .strict();
export type RescanReconcilePendingResult = z.infer<typeof RescanReconcilePendingResultDto>;

import { z } from 'zod';

/**
 * DepreciationDto — comandos de depreciação mensal (BE-INCR-FIXED-ASSETS, nó C8, PR-3, Bloco C
 * itens 12/13). `.strict()` nos corpos, mesmo padrão do resto do módulo. `yearMonth` é o mês-alvo
 * do `runMonth` (não um intervalo — cada chamada processa UM mês para TODOS os ativos elegíveis
 * do escopo).
 */

const YEAR_MONTH_RE = /^\d{4}-(0[1-9]|1[0-2])$/;

/** @openapi
 * components:
 *   schemas:
 *     RunDepreciationInput:
 *       type: object
 *       required: [unitId, yearMonth]
 *       properties:
 *         unitId:    { type: string }
 *         yearMonth: { type: string, description: 'AAAA-MM — mês a rodar para todos os ativos ACTIVE depreciáveis do escopo' }
 */
export const RunDepreciationSchema = z
  .object({
    unitId: z.string().min(1),
    yearMonth: z.string().regex(YEAR_MONTH_RE, { message: 'yearMonth deve ser AAAA-MM.' }),
  })
  .strict();
export type RunDepreciationInput = z.infer<typeof RunDepreciationSchema>;

/** @openapi
 * components:
 *   schemas:
 *     ReconcileFixedAssetsInput:
 *       type: object
 *       required: [unitId]
 *       properties:
 *         unitId: { type: string }
 */
export const ReconcileFixedAssetsSchema = z
  .object({
    unitId: z.string().min(1),
  })
  .strict();
export type ReconcileFixedAssetsInput = z.infer<typeof ReconcileFixedAssetsSchema>;

/** Falha por ativo do `runMonth` — só `AccountingPeriodNotOpenError` vira `failed[]` (memória
 *  `erro-especifico-para-skip-em-job`); qualquer outro erro aborta a chamada inteira. */
export interface RunDepreciationFailure {
  assetId: string;
  code: 'PERIOD_NOT_OPEN';
  message: string;
}

export interface RunDepreciationResult {
  yearMonth: string;
  posted: number;
  skipped: number;
  failed: RunDepreciationFailure[];
}

/** `draftsCreated` é o gancho do re-drive de payables com `fixedAssetItems` sem rascunho (item
 *  13/22) — sempre 0 até o PR-5 existir; o teste desta PR chama e espera 0 (o gancho, não o vazio). */
export interface ReconcileFixedAssetsResult {
  checked: number;
  repaired: number;
  draftsCreated: number;
}

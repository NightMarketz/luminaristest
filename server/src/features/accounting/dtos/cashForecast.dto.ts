import { z } from 'zod';
import { isValidDateOnly } from '../models/dates';

/**
 * cashForecast.dto — contrato de entrada (query) da projeção de fluxo de caixa read-only
 * (FE-INCR-CASH-FORECAST, `docs/accounting/FE-INCR-CASH-FORECAST-brief.md`).
 *
 * `asOf` é a data-base da projeção (default hoje — OPCIONAL; omitida, o service usa
 * `scopeToday(scope)`). Quando fornecida, validada com `isValidDateOnly` (regex + round-trip de
 * calendário, `models/dates.ts`), NUNCA um regex nu: `new Date('2026-02-30')` rola silenciosamente
 * para 03-02, o que deslocaria a data-base e toda a janela de projeção
 * (date-only-rendering-utc-shift-class-bug).
 *
 * Sem `kind` (diferente de `aging.dto.ts`): o forecast mistura AP e AR na mesma resposta
 * (F-CF5→a exige as duas permissões de leitura, não um subrazão selecionável).
 *
 * Sem `horizonDays`/`groupBy` (F-CF1→a fixo 90 dias, F-CF3→a granularidade diária, ambos SEM
 * parâmetro — YAGNI, mesma filosofia de `AGING_BUCKETS` fixas, F-AG2→a).
 *
 * `.strict()` rejeita chaves desconhecidas para que um param com typo falhe alto (400) em vez de
 * ser silenciosamente descartado (param-aceito-e-ignorado-e-bug).
 */

/** @openapi
 * components:
 *   schemas:
 *     CashForecastQueryInput:
 *       type: object
 *       required: [unitId]
 *       properties:
 *         unitId: { type: string }
 *         asOf:   { type: string, description: "Date-only YYYY-MM-DD — data-base da projeção (default hoje). Horizonte fixo de 90 dias a partir de asOf (F-CF1)." }
 */
export const CashForecastQuerySchema = z
  .object({
    unitId: z.string().min(1),
    asOf: z
      .string()
      .refine(isValidDateOnly, 'asOf deve ser uma data real YYYY-MM-DD')
      .optional(),
  })
  .strict();

export type CashForecastQueryInput = z.infer<typeof CashForecastQuerySchema>;

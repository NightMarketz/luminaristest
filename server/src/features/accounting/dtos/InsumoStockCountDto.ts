import { z } from 'zod';
import { isValidDateOnly } from '../models/dates';
import { MAX_CENTS } from '../models/money';

/**
 * BE-INCR-INSUMO-INVENTARIO-PERIODICO (BRIEF item 4 e §2, F-ID-3 c, dono 21/11) — contagem do estoque de insumo do
 * serviço no fechamento. O valor contado vem valorizado pelo salão (PEPS ou custo médio, NBC TG 1002 item 13.5): o
 * sistema não guarda custo unitário de insumo. `.strict()`.
 */
export const CreateInsumoStockCountSchema = z
  .object({
    unitId: z.string().min(1),
    countDate: z.string().refine(isValidDateOnly, 'countDate deve ser uma data real YYYY-MM-DD'),
    countedValueCents: z.number().int().min(0).max(MAX_CENTS),
  })
  .strict();
export type CreateInsumoStockCountInput = z.infer<typeof CreateInsumoStockCountSchema>;

export const InsumoStockCountViewSchema = z
  .object({
    countDate: z.string(),
    bookValueCents: z.number().int(),
    countedValueCents: z.number().int(),
    /** saldo − contado: > 0 consumo (custo), < 0 sobra, 0 sem lançamento. */
    adjustmentCents: z.number().int(),
    entryId: z.string().nullable(),
  })
  .strict();
export type InsumoStockCountView = z.infer<typeof InsumoStockCountViewSchema>;

import { z } from 'zod';
import { PRODUCT_DESTINATION_DEFAULTS } from '../models/itemDestination';

/**
 * ITEM-DESTINATION PR-2 (BE-INCR-ITEM-DESTINATION BRIEF §2 + itens 16–18, F-ID-2 a) — destinação PADRÃO por
 * produto. `.strict()`. O default aceita só `REVENDA | INSUMO_SERVICO` (EMENDA 29/09 item 25: o imobilizado
 * precisa da classe, que não é do produto).
 */
export const UpsertProductDestinationSchema = z
  .object({ unitId: z.string().min(1), productRef: z.string().min(1), destination: z.enum(PRODUCT_DESTINATION_DEFAULTS) })
  .strict();
export type UpsertProductDestinationInput = z.infer<typeof UpsertProductDestinationSchema>;

export const ListProductDestinationsQuerySchema = z.object({ unitId: z.string().min(1) }).strict();

export const ProductDestinationParamsSchema = z.object({ productRef: z.string().min(1) }).strict();

export const ProductDestinationViewSchema = z
  .object({ productRef: z.string(), destination: z.enum(PRODUCT_DESTINATION_DEFAULTS), updatedAt: z.string() })
  .strict();
export type ProductDestinationView = z.infer<typeof ProductDestinationViewSchema>;

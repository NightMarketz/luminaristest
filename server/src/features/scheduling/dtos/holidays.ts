/**
 * BE-INCR-ESCALA-BASE §3.4 (itens 39 e 40) — DTOs do `POST /api/scheduling/holidays/sync`.
 */
import { z } from 'zod';

export const HolidaySyncBodySchema = z
  .object({
    unitId: z.string().min(1).optional(), // ausente = todas as unidades vivas do dono
    year: z.number().int().min(2024).max(2100),
  })
  .strict();

export const HolidaySyncResponseSchema = z
  .object({
    created: z.number().int(),
    skipped: z.number().int(),
    deletedByUser: z.number().int(),
  })
  .strict();

export type HolidaySyncBody = z.infer<typeof HolidaySyncBodySchema>;
export type HolidaySyncResponse = z.infer<typeof HolidaySyncResponseSchema>;

import { z } from 'zod';

/**
 * BE-INCR-DP-PONTE-RAZAO PR-P0 item 3 — o valor de uma linha de `TERCEIROS_FPAS` (IN RFB 2.110 art. 85 II e Anexo III).
 * Mora com quem o lê (`cpp.ts`); a borda de `legalParameters/` o registra como formato. §5.2: bp por código de terceiro
 * (4 dígitos), `totalBp` = soma das entidades.
 */
export const TerceirosFpasJson = z
  .object({
    entidades: z.record(z.string().regex(/^\d{4}$/), z.number().int().min(0).max(10_000)),
    totalBp: z.number().int().min(0).max(10_000),
  })
  .strict()
  .refine((v) => Object.keys(v.entidades).length > 0, { message: 'entidades vazio' })
  .refine((v) => Object.values(v.entidades).reduce((s, b) => s + b, 0) === v.totalBp, { message: 'totalBp ≠ soma das entidades' });
export type TerceirosFpas = z.infer<typeof TerceirosFpasJson>;

import { z } from 'zod';

/**
 * FixedAssetClassDto — classe de bem do imobilizado (BE-INCR-FIXED-ASSETS, nó C8, item 1).
 * `.strict()` nos corpos. `classId` no corpo do PATCH/DELETE precisa bater com o `:id` do path
 * (mesma defesa de `AccountingContactDto`/`param-aceito-e-ignorado-e-bug`) — divergência é 400
 * antes de qualquer leitura, nunca um dos dois ignorado silenciosamente.
 */

/** @openapi
 * components:
 *   schemas:
 *     CreateFixedAssetClassInput:
 *       type: object
 *       required: [unitId, code, name, depreciable, costAccountId]
 *       properties:
 *         unitId:                          { type: string }
 *         code:                            { type: string }
 *         name:                            { type: string }
 *         depreciable:                     { type: boolean, description: 'false para classes tipo terreno (LAND) — nunca gera quota (F-FA5 → a)' }
 *         costAccountId:                   { type: string, description: 'conta do bem (1.2.x)' }
 *         accumulatedDepreciationAccountId: { type: string, nullable: true, description: 'obrigatória quando depreciable=true (conta 1.2.9.x)' }
 */
export const CreateFixedAssetClassSchema = z
  .object({
    unitId: z.string().min(1),
    code: z.string().min(1),
    name: z.string().min(1),
    depreciable: z.boolean(),
    costAccountId: z.string().min(1),
    accumulatedDepreciationAccountId: z.string().min(1).optional(),
  })
  .strict()
  .superRefine((val, ctx) => {
    if (val.depreciable && !val.accumulatedDepreciationAccountId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['accumulatedDepreciationAccountId'],
        message: 'accumulatedDepreciationAccountId é obrigatório quando depreciable=true (BRIEF item 1).',
      });
    }
  });

/** @openapi
 * components:
 *   schemas:
 *     UpdateFixedAssetClassInput:
 *       type: object
 *       required: [unitId, classId]
 *       properties:
 *         unitId:                          { type: string }
 *         classId:                         { type: string, description: 'DEVE ser igual ao :id do path' }
 *         code:                            { type: string }
 *         name:                            { type: string }
 *         depreciable:                     { type: boolean }
 *         costAccountId:                   { type: string }
 *         accumulatedDepreciationAccountId: { type: string, nullable: true }
 */
export const UpdateFixedAssetClassSchema = z
  .object({
    unitId: z.string().min(1),
    classId: z.string().min(1),
    code: z.string().min(1).optional(),
    name: z.string().min(1).optional(),
    depreciable: z.boolean().optional(),
    costAccountId: z.string().min(1).optional(),
    accumulatedDepreciationAccountId: z.string().min(1).nullable().optional(),
  })
  .strict();

/** @openapi
 * components:
 *   schemas:
 *     FixedAssetClassScopeQuery:
 *       type: object
 *       required: [unitId]
 *       properties:
 *         unitId: { type: string }
 */
export const FixedAssetClassScopeQuerySchema = z.object({ unitId: z.string().min(1) });

/** @openapi
 * components:
 *   schemas:
 *     DeleteFixedAssetClassInput:
 *       type: object
 *       required: [unitId, classId]
 *       properties:
 *         unitId:  { type: string }
 *         classId: { type: string, description: 'DEVE ser igual ao :id do path' }
 */
export const DeleteFixedAssetClassSchema = z
  .object({
    unitId: z.string().min(1),
    classId: z.string().min(1),
  })
  .strict();

export type CreateFixedAssetClassInput = z.infer<typeof CreateFixedAssetClassSchema>;
export type UpdateFixedAssetClassInput = z.infer<typeof UpdateFixedAssetClassSchema>;
export type FixedAssetClassScopeQueryInput = z.infer<typeof FixedAssetClassScopeQuerySchema>;
export type DeleteFixedAssetClassInput = z.infer<typeof DeleteFixedAssetClassSchema>;

import { z } from 'zod';
import { MAX_CENTS } from '../models/money';
import { isValidDateOnly } from '../models/dates';
import { FIXED_ASSET_STATUSES } from '../models/FixedAsset.model';

/**
 * FixedAssetDto — bem do imobilizado (BE-INCR-FIXED-ASSETS, nó C8, itens 4/8/9/18). `.strict()` nos
 * corpos; money em CENTAVOS INTEIROS guardados por `MAX_CENTS` (mesmo padrão de `PayableDto` — a
 * persistência é `BigInt` desde BE-INCR-MONEY-BIGINT, mas o valor cabe em `number` seguro dentro do
 * teto de política; reuso do padrão estabelecido, não o "string(BigInt)" do rascunho do BRIEF §4).
 * `assetId` no corpo do PUT/activate/dispose precisa bater com o `:id` do path (mesma defesa de
 * `param-aceito-e-ignorado-e-bug`).
 */

const cents = (label: string) =>
  z
    .number()
    .int()
    .positive()
    .max(MAX_CENTS, { message: `${label} excede o limite suportado (máx ${MAX_CENTS}).` });

const centsNonNegative = (label: string) =>
  z
    .number()
    .int()
    .min(0)
    .max(MAX_CENTS, { message: `${label} excede o limite suportado (máx ${MAX_CENTS}).` });

const dateOnly = (field: string) =>
  z.string().refine(isValidDateOnly, `${field} deve ser uma data real YYYY-MM-DD`);

/** @openapi
 * components:
 *   schemas:
 *     CreateFixedAssetInput:
 *       type: object
 *       required: [unitId, classId, code, description, costCents, acquiredAt]
 *       properties:
 *         unitId:                { type: string }
 *         classId:                { type: string }
 *         code:                   { type: string }
 *         description:            { type: string }
 *         ncmPrefix:              { type: string, nullable: true }
 *         quantity:               { type: integer, minimum: 1, default: 1 }
 *         costCents:              { type: integer, minimum: 1, maximum: 2147483647 }
 *         residualValueCents:     { type: integer, minimum: 0, maximum: 2147483647, default: 0, description: 'deve ser < costCents' }
 *         acquiredAt:             { type: string, description: 'YYYY-MM-DD' }
 *         rateId:                 { type: string, description: 'XOR com annualRateBp — taxa do catálogo (Anexo III ou CUSTOM)' }
 *         annualRateBp:           { type: integer, minimum: 1, maximum: 10000, description: 'XOR com rateId — taxa explícita em basis points' }
 *         bookAnnualRateBp:       { type: integer, minimum: 1, maximum: 10000, description: 'taxa CONTÁBIL, se diverge da fiscal — exige bookRateJustification' }
 *         bookRateJustification:  { type: string }
 */
export const CreateFixedAssetSchema = z
  .object({
    unitId: z.string().min(1),
    classId: z.string().min(1),
    code: z.string().min(1),
    description: z.string().min(1),
    ncmPrefix: z.string().min(1).optional(),
    quantity: z.number().int().positive().default(1),
    costCents: cents('costCents'),
    residualValueCents: centsNonNegative('residualValueCents').default(0),
    acquiredAt: dateOnly('acquiredAt'),
    rateId: z.string().min(1).optional(),
    annualRateBp: z.number().int().min(1).max(10000).optional(),
    bookAnnualRateBp: z.number().int().min(1).max(10000).optional(),
    bookRateJustification: z.string().min(1).optional(),
  })
  .strict()
  .superRefine((val, ctx) => {
    const hasRateId = val.rateId !== undefined;
    const hasAnnualRateBp = val.annualRateBp !== undefined;
    if (hasRateId === hasAnnualRateBp) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Informe exatamente um entre rateId (taxa do catálogo) e annualRateBp (taxa explícita).',
      });
    }
    if (val.residualValueCents >= val.costCents) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['residualValueCents'],
        message: 'residualValueCents deve ser menor que costCents.',
      });
    }
    if (val.bookAnnualRateBp !== undefined && !val.bookRateJustification) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['bookRateJustification'],
        message: 'bookRateJustification é obrigatória quando bookAnnualRateBp é informado (item 8).',
      });
    }
  });

/** @openapi
 * components:
 *   schemas:
 *     UpdateFixedAssetInput:
 *       type: object
 *       required: [unitId, assetId]
 *       properties:
 *         unitId:                { type: string }
 *         assetId:                { type: string, description: 'DEVE ser igual ao :id do path' }
 *         classId:                { type: string }
 *         code:                   { type: string }
 *         description:            { type: string }
 *         ncmPrefix:              { type: string, nullable: true }
 *         quantity:               { type: integer, minimum: 1 }
 *         costCents:              { type: integer, minimum: 1, maximum: 2147483647 }
 *         residualValueCents:     { type: integer, minimum: 0, maximum: 2147483647 }
 *         acquiredAt:             { type: string }
 *         rateId:                 { type: string }
 *         annualRateBp:           { type: integer, minimum: 1, maximum: 10000 }
 *         bookAnnualRateBp:       { type: integer, minimum: 1, maximum: 10000, nullable: true }
 *         bookRateJustification:  { type: string, nullable: true }
 */
export const UpdateFixedAssetSchema = z
  .object({
    unitId: z.string().min(1),
    assetId: z.string().min(1),
    classId: z.string().min(1).optional(),
    code: z.string().min(1).optional(),
    description: z.string().min(1).optional(),
    ncmPrefix: z.string().min(1).nullable().optional(),
    quantity: z.number().int().positive().optional(),
    costCents: cents('costCents').optional(),
    residualValueCents: centsNonNegative('residualValueCents').optional(),
    acquiredAt: dateOnly('acquiredAt').optional(),
    rateId: z.string().min(1).optional(),
    annualRateBp: z.number().int().min(1).max(10000).optional(),
    bookAnnualRateBp: z.number().int().min(1).max(10000).nullable().optional(),
    bookRateJustification: z.string().min(1).nullable().optional(),
  })
  .strict();

/** @openapi
 * components:
 *   schemas:
 *     ActivateFixedAssetInput:
 *       type: object
 *       required: [unitId, assetId, activatedAt, version]
 *       properties:
 *         unitId:                    { type: string }
 *         assetId:                   { type: string, description: 'DEVE ser igual ao :id do path' }
 *         activatedAt:               { type: string, description: 'YYYY-MM-DD' }
 *         openingAccumulatedCents:   { type: integer, minimum: 0, maximum: 2147483647, description: 'obrigatório se activatedAt for anterior ao 1º período OPEN/SOFT_CLOSED do escopo (item 9)' }
 *         version:                   { type: integer, description: 'CAS — version atual do ativo (PENDING_ACTIVATION)' }
 */
export const ActivateFixedAssetSchema = z
  .object({
    unitId: z.string().min(1),
    assetId: z.string().min(1),
    activatedAt: dateOnly('activatedAt'),
    openingAccumulatedCents: centsNonNegative('openingAccumulatedCents').optional(),
    version: z.number().int(),
  })
  .strict();

/** @openapi
 * components:
 *   schemas:
 *     DisposeFixedAssetInput:
 *       type: object
 *       required: [unitId, assetId, disposedAt, proceedsCents, version]
 *       properties:
 *         unitId:                { type: string }
 *         assetId:                { type: string, description: 'DEVE ser igual ao :id do path' }
 *         disposedAt:             { type: string, description: 'YYYY-MM-DD' }
 *         proceedsCents:          { type: integer, minimum: 0, maximum: 2147483647, description: '0 = imprestável (art. 121 §4)' }
 *         counterpartAccountId:   { type: string, description: 'obrigatório quando proceedsCents > 0 (F-FA13 → a)' }
 *         version:                { type: integer, description: 'CAS — version atual do ativo (ACTIVE)' }
 */
export const DisposeFixedAssetSchema = z
  .object({
    unitId: z.string().min(1),
    assetId: z.string().min(1),
    disposedAt: dateOnly('disposedAt'),
    proceedsCents: centsNonNegative('proceedsCents'),
    counterpartAccountId: z.string().min(1).optional(),
    version: z.number().int(),
  })
  .strict()
  .superRefine((val, ctx) => {
    if (val.proceedsCents > 0 && !val.counterpartAccountId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['counterpartAccountId'],
        message: 'counterpartAccountId é obrigatório quando proceedsCents > 0 (F-FA13 → a).',
      });
    }
  });

/** @openapi
 * components:
 *   schemas:
 *     ListFixedAssetsQuery:
 *       type: object
 *       required: [unitId]
 *       properties:
 *         unitId:  { type: string }
 *         status:  { type: string, enum: [PENDING_ACTIVATION, ACTIVE, FULLY_DEPRECIATED, DISPOSED] }
 *         classId: { type: string }
 */
export const ListFixedAssetsQuerySchema = z.object({
  unitId: z.string().min(1),
  status: z.enum(FIXED_ASSET_STATUSES).optional(),
  classId: z.string().min(1).optional(),
});

/** @openapi
 * components:
 *   schemas:
 *     FixedAssetScopeQuery:
 *       type: object
 *       required: [unitId]
 *       properties:
 *         unitId: { type: string }
 */
export const FixedAssetScopeQuerySchema = z.object({ unitId: z.string().min(1) });

/** @openapi
 * components:
 *   schemas:
 *     DeleteFixedAssetInput:
 *       type: object
 *       required: [unitId, assetId]
 *       properties:
 *         unitId:  { type: string }
 *         assetId: { type: string, description: 'DEVE ser igual ao :id do path' }
 */
export const DeleteFixedAssetSchema = z
  .object({
    unitId: z.string().min(1),
    assetId: z.string().min(1),
  })
  .strict();

export type CreateFixedAssetInput = z.infer<typeof CreateFixedAssetSchema>;
export type UpdateFixedAssetInput = z.infer<typeof UpdateFixedAssetSchema>;
export type ActivateFixedAssetInput = z.infer<typeof ActivateFixedAssetSchema>;
export type DisposeFixedAssetInput = z.infer<typeof DisposeFixedAssetSchema>;
export type ListFixedAssetsQueryInput = z.infer<typeof ListFixedAssetsQuerySchema>;
export type FixedAssetScopeQueryInput = z.infer<typeof FixedAssetScopeQuerySchema>;
export type DeleteFixedAssetInput = z.infer<typeof DeleteFixedAssetSchema>;

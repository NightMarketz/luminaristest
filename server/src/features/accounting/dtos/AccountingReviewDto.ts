import { z } from 'zod';
import { isValidDateOnly } from '../models/dates';
import { CRC_NUMBER_RE, normalizeCrcNumber } from '../models/AccountingContact.model';
import {
  FINDING_SEVERITIES,
  RESOLUTION_TARGETS,
  REVIEW_REGISTERS,
} from '../models/AccountingReview.model';
import { REVIEW_STATUSES } from '../models/ledgerStatus';
import { PostEntryLineSchema } from './PostingDto';

/**
 * AccountingReviewDto — comandos da revisão profissional editável (BE-INCR-REVIEW-LAYER, nó C11).
 * Todos `.strict()`: chave desconhecida é 400, nunca descartada em silêncio.
 */

/** @openapi
 * components:
 *   schemas:
 *     OpenReviewInput:
 *       type: object
 *       required: [unitId, year]
 *       properties:
 *         unitId:   { type: string }
 *         year:     { type: integer, description: "Exercício revisado — tem de bater com o periodStart dos jobs" }
 *         ecdJobId: { type: string, description: "Job EXPORTED da ECD (pelo menos um dos dois é obrigatório)" }
 *         ecfJobId: { type: string, description: "Job EXPORTED da ECF" }
 */
export const OpenReviewSchema = z
  .object({
    unitId: z.string().min(1),
    year: z.number().int().min(2000).max(2100),
    ecdJobId: z.string().min(1).optional(),
    ecfJobId: z.string().min(1).optional(),
  })
  .strict()
  .refine((v) => v.ecdJobId || v.ecfJobId, { message: 'ecdJobId ou ecfJobId é obrigatório' });

/** @openapi
 * components:
 *   schemas:
 *     AddFindingInput:
 *       type: object
 *       required: [unitId, register, locator, description, severity]
 *       properties:
 *         unitId:      { type: string }
 *         register:    { type: string, enum: ['0000','I050','I051','I200','I250','J150','J930','M300','M350','M410','N630'] }
 *         locator:     { type: string, maxLength: 200, description: "Código de conta, nº do lançamento, linha" }
 *         description: { type: string, maxLength: 1000, description: "Texto livre — nunca entra na trilha de auditoria" }
 *         severity:    { type: string, enum: [BLOCKER, NOTE] }
 */
export const AddFindingSchema = z
  .object({
    unitId: z.string().min(1),
    register: z.enum(REVIEW_REGISTERS),
    locator: z.string().min(1).max(200),
    description: z.string().min(1).max(1000),
    severity: z.enum(FINDING_SEVERITIES),
  })
  .strict();

/** @openapi
 * components:
 *   schemas:
 *     ResolveFindingInput:
 *       oneOf:
 *         - type: object
 *           required: [unitId, resolution, targetType, targetId]
 *           properties:
 *             unitId:     { type: string }
 *             resolution: { type: string, enum: [DATA_EDIT] }
 *             targetType: { type: string, enum: [account, referential_mapping, counterparty, generation_input, journal_entry] }
 *             targetId:   { type: string, description: "Tem de existir no escopo — alvo inexistente é 400" }
 *         - type: object
 *           required: [unitId, resolution, resolutionNote]
 *           properties:
 *             unitId:         { type: string }
 *             resolution:     { type: string, enum: [NO_ACTION] }
 *             resolutionNote: { type: string, maxLength: 500, description: "Obrigatória — achado descartado sem justificativa é 400" }
 */
export const ResolveFindingSchema = z.discriminatedUnion('resolution', [
  z
    .object({
      unitId: z.string().min(1),
      resolution: z.literal('DATA_EDIT'),
      targetType: z.enum(RESOLUTION_TARGETS),
      targetId: z.string().min(1),
    })
    .strict(),
  z
    .object({
      unitId: z.string().min(1),
      resolution: z.literal('NO_ACTION'),
      resolutionNote: z.string().min(1).max(500),
    })
    .strict(),
]);

/** @openapi
 * components:
 *   schemas:
 *     AdjustmentEntryInput:
 *       type: object
 *       required: [unitId, postingDate, description, lines]
 *       properties:
 *         unitId:          { type: string }
 *         postingDate:     { type: string, description: "Date-only YYYY-MM-DD em período OPEN (F-C11-4 a — extemporâneo)" }
 *         description:     { type: string, maxLength: 500 }
 *         lines:           { type: array, minItems: 2, items: { $ref: '#/components/schemas/PostEntryLine' } }
 *         reverseOriginal: { type: boolean, description: "Só quando register='I200' — estorna o lançamento apontado pelo locator antes do acerto" }
 */
export const AdjustmentEntrySchema = z
  .object({
    unitId: z.string().min(1),
    postingDate: z.string().refine(isValidDateOnly, 'postingDate deve ser uma data real YYYY-MM-DD'),
    description: z.string().min(1).max(500),
    // Espelha PostEntryInput (BRIEF §4): mesma linha, mesmo teto de centavos, mesma regra de um lado só.
    lines: z.array(PostEntryLineSchema).min(2),
    reverseOriginal: z.boolean().optional(),
  })
  .strict();

/** @openapi
 * components:
 *   schemas:
 *     SignOffReviewInput:
 *       type: object
 *       required: [unitId, reviewerName, reviewerCrc, statement]
 *       properties:
 *         unitId:       { type: string }
 *         reviewerName: { type: string, minLength: 3, maxLength: 120 }
 *         reviewerCrc:  { type: string, description: "Máscara CFC UF-NNNNNN/O-D (mesma do contato, #305)" }
 *         statement:    { type: string, maxLength: 500 }
 */
export const SignOffReviewSchema = z
  .object({
    unitId: z.string().min(1),
    reviewerName: z.string().min(3).max(120),
    // Reuso do canônico (#305): normaliza as grafias usuais e exige a máscara CFC — nunca regex nova.
    reviewerCrc: z
      .string()
      .min(1)
      .transform((v, ctx) => {
        const n = normalizeCrcNumber(v);
        if (!n || !CRC_NUMBER_RE.test(n)) {
          ctx.addIssue({ code: 'custom', message: 'reviewerCrc deve seguir a máscara CFC UF-NNNNNN/O-D (ex.: SP-123456/O-1).' });
          return z.NEVER;
        }
        return n;
      }),
    statement: z.string().min(1).max(500),
  })
  .strict();

/** @openapi
 * components:
 *   schemas:
 *     RejectReviewInput:
 *       type: object
 *       required: [unitId, reason]
 *       properties:
 *         unitId: { type: string }
 *         reason: { type: string, maxLength: 500 }
 */
export const RejectReviewSchema = z
  .object({ unitId: z.string().min(1), reason: z.string().min(1).max(500) })
  .strict();

/** @openapi
 * components:
 *   schemas:
 *     ReplaceReviewJobsInput:
 *       type: object
 *       required: [unitId]
 *       properties:
 *         unitId:   { type: string }
 *         ecdJobId: { type: string, description: "Job regerado da ECD (F-C11-6 a: substitui; o par antigo fica no evento review.jobs_replaced)" }
 *         ecfJobId: { type: string }
 */
export const ReplaceReviewJobsSchema = z
  .object({
    unitId: z.string().min(1),
    ecdJobId: z.string().min(1).optional(),
    ecfJobId: z.string().min(1).optional(),
  })
  .strict()
  .refine((v) => v.ecdJobId || v.ecfJobId, { message: 'ecdJobId ou ecfJobId é obrigatório' });

/** @openapi
 * components:
 *   schemas:
 *     ListReviewsQuery:
 *       type: object
 *       required: [unitId]
 *       properties:
 *         unitId: { type: string }
 *         year:   { type: integer }
 *         status: { type: string, enum: [OPEN, SIGNED_OFF, REJECTED] }
 */
export const ListReviewsQuerySchema = z.object({
  unitId: z.string().min(1),
  year: z.coerce.number().int().min(2000).max(2100).optional(),
  status: z.enum(REVIEW_STATUSES).optional(),
});

export const ReviewScopeQuerySchema = z.object({ unitId: z.string().min(1) });

export type OpenReviewInput = z.infer<typeof OpenReviewSchema>;
export type AddFindingInput = z.infer<typeof AddFindingSchema>;
export type ResolveFindingInput = z.infer<typeof ResolveFindingSchema>;
export type AdjustmentEntryInput = z.infer<typeof AdjustmentEntrySchema>;
export type SignOffReviewInput = z.infer<typeof SignOffReviewSchema>;
export type RejectReviewInput = z.infer<typeof RejectReviewSchema>;
export type ReplaceReviewJobsInput = z.infer<typeof ReplaceReviewJobsSchema>;
export type ListReviewsQueryInput = z.infer<typeof ListReviewsQuerySchema>;

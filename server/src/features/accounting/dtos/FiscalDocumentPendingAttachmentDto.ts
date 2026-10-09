import { z } from 'zod';

/**
 * BE-INCR-DFE-ANEXO-PENDENTE (BRIEF §4) — contratos da pendência de anexo da NFS-e autorizada. Não há rota (BRIEF item
 * 12: sem DTO de entrada HTTP nem openapi); estes schemas validam o que o serviço GRAVA e LÊ de volta da coluna
 * `resultJson`, e o resumo que a varredura devolve ao `DfePollScheduler`.
 */

export const PENDING_ATTACHMENT_STATUSES = ['PENDING', 'DONE', 'FAILED', 'DISCARDED'] as const;
export const PendingAttachmentStatusSchema = z.enum(PENDING_ATTACHMENT_STATUSES);
export type PendingAttachmentStatus = z.infer<typeof PendingAttachmentStatusSchema>;

/** Valores do retorno do parceiro — strings BigInt-safe, o mesmo shape de `EmissaoResult.valores`. */
const ValoresSchema = z
  .object({
    vIssCents: z.string().optional(),
    aliqIssBp: z.number().int().optional(),
    vIbsCents: z.string().optional(),
    vCbsCents: z.string().optional(),
    baseIssCents: z.string().optional(),
  })
  .strict();

/** `resultJson` da pendência (BRIEF §4): só o retorno estrutural, sem PII do tomador (§1.12). */
export const PendingAttachmentResultSchema = z
  .object({
    chaveOuCodigo: z.string().min(1),
    nNFSe: z.string().nullable(),
    numero: z.string().nullable(),
    valores: ValoresSchema.nullable(),
  })
  .strict();
export type PendingAttachmentResult = z.infer<typeof PendingAttachmentResultSchema>;

/** Resumo de uma varredura (BRIEF §4 `drainPendingAttachmentsOnce`). */
export const PendingAttachmentDrainSummarySchema = z
  .object({
    total: z.number().int().nonnegative(),
    done: z.number().int().nonnegative(),
    failed: z.number().int().nonnegative(),
    discarded: z.number().int().nonnegative(),
  })
  .strict();
export type PendingAttachmentDrainSummary = z.infer<typeof PendingAttachmentDrainSummarySchema>;

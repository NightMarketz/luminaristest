import { z } from 'zod';
import { queryBoolean } from './queryPrimitives';

/**
 * BE-INCR-DFE (nó X10b, BRIEF §3 "Zod — entradas HTTP" + item 39) — DTOs `.strict()` das rotas de
 * documento fiscal. Fase B+C (PR-2): Emit/Preview/List/Scope/Params. Fase D (PR-3): Cancel +
 * `pendencias` no filtro de lista (item 30, campo derivado agora existe em `FiscalDocumentView`).
 */

export const EmitFiscalDocumentSchema = z
  .object({
    unitId: z.string().min(1),
    saleId: z.string().min(1),
    kind: z.enum(['NFSE', 'NFE']),
  })
  .strict();
export type EmitFiscalDocumentInput = z.infer<typeof EmitFiscalDocumentSchema>;

export const PreviewFiscalDocumentSchema = z
  .object({
    unitId: z.string().min(1),
    saleId: z.string().min(1),
    kind: z.enum(['NFSE', 'NFE']),
  })
  .strict();
export type PreviewFiscalDocumentInput = z.infer<typeof PreviewFiscalDocumentSchema>;

export const FiscalDocumentListQuerySchema = z
  .object({
    unitId: z.string().min(1),
    saleId: z.string().optional(),
    status: z.enum(['SENT', 'PROCESSING', 'AUTHORIZED', 'AUTHORIZED_DIVERGENT', 'REJECTED', 'CANCELLED']).optional(), // AUTHORIZED_DIVERGENT: F-MAN-2 (c)
    // item 30 (PR-3): true = só documentos com pendências (sale_cancelled_with_live_document |
    // cancelled_without_replacement). `queryBoolean()`, nunca `z.coerce.boolean()` (memória
    // zod-coerce-boolean-inverte-query-string) — ausente = false = sem filtro.
    pendencias: queryBoolean(),
  })
  .strict();
export type FiscalDocumentListQuery = z.infer<typeof FiscalDocumentListQuerySchema>;

export const FiscalDocumentScopeQuerySchema = z.object({ unitId: z.string().min(1) }).strict();

export const FiscalDocumentParamsSchema = z.object({ id: z.string().min(1) }).strict();

/** BE-INCR-DFE (item 29) — Anexo II e101101: cMotivo 1|2|9, xMotivo 15-255 caracteres. */
export const CancelFiscalDocumentSchema = z
  .object({
    unitId: z.string().min(1),
    cMotivo: z.union([z.literal(1), z.literal(2), z.literal(9)]),
    xMotivo: z.string().min(15).max(255),
  })
  .strict();
export type CancelFiscalDocumentInput = z.infer<typeof CancelFiscalDocumentSchema>;

/** BE-INCR-DFE (item 28) — :partner na rota pública do webhook. */
export const WebhookParamsSchema = z.object({ partner: z.string().min(1) }).strict();

/** BE-INCR-DFE (itens 26/27) — corpo mínimo de /consultar e /reenviar: só o escopo (o :id já
 *  identifica o documento). */
export const FiscalDocumentActionBodySchema = z.object({ unitId: z.string().min(1) }).strict();

/**
 * BE-INCR-DFE-MANUAL (itens 11–13) — retorno manual. O arquivo (XML da NFS-e autorizada / XML do evento de
 * cancelamento) chega pelo multer; o corpo só carrega o escopo e, na rejeição, os erros que o portal mostrou.
 */
export const RetornoManualBodySchema = z.object({ unitId: z.string().min(1) }).strict();

export const RejeicaoManualSchema = z
  .object({
    unitId: z.string().min(1),
    errors: z
      .array(z.object({ code: z.string().min(1).max(20), message: z.string().min(1).max(500) }).strict())
      .min(1)
      .max(20),
  })
  .strict();
export type RejeicaoManualInput = z.infer<typeof RejeicaoManualSchema>;

/**
 * F-MAN-5 (a) — cancelamento manual: o corpo reusa `CancelFiscalDocumentSchema` (item 13) e o XML do evento
 * `e101101` chega pelo multer. O `cMotivo` do corpo tem de ser o do XML (senão 422 — parâmetro aceito e ignorado é
 * bug); o texto gravado é o `xMotivo` do XML (transcrição §7).
 */
export const CancelamentoManualSchema = CancelFiscalDocumentSchema;

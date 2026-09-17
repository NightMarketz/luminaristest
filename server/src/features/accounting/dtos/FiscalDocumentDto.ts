import { z } from 'zod';

/**
 * BE-INCR-DFE (nó X10b, BRIEF §3 "Zod — entradas HTTP" + item 39) — DTOs `.strict()` das rotas de
 * documento fiscal (Fase B+C, PR-2). `CancelFiscalDocumentSchema` e o filtro `pendencias` (item 30,
 * campo derivado que ainda não existe em `FiscalDocumentView`) ficam para o PR-3 (Fase D) — regra 1
 * da sessão: não aceite um filtro que este serviço ainda não sabe honrar (classe
 * `param-aceito-e-ignorado-e-bug`).
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
    status: z.enum(['SENT', 'PROCESSING', 'AUTHORIZED', 'REJECTED', 'CANCELLED']).optional(),
  })
  .strict();
export type FiscalDocumentListQuery = z.infer<typeof FiscalDocumentListQuerySchema>;

export const FiscalDocumentScopeQuerySchema = z.object({ unitId: z.string().min(1) }).strict();

export const FiscalDocumentParamsSchema = z.object({ id: z.string().min(1) }).strict();

import { z } from 'zod';
import { queryBoolean } from './queryPrimitives';
import { SUBST_MOTIVOS, refineSubstMotivo } from './DpsPayloadDto';

/**
 * BE-INCR-DFE (nó X10b, BRIEF §3 "Zod — entradas HTTP" + item 39) — DTOs `.strict()` das rotas de
 * documento fiscal. Fase B+C (PR-2): Emit/Preview/List/Scope/Params. Fase D (PR-3): Cancel +
 * `pendencias` no filtro de lista (item 30, campo derivado agora existe em `FiscalDocumentView`).
 */

export const EmitFiscalDocumentSchema = z
  .object({
    unitId: z.string().min(1),
    saleId: z.string().min(1),
    kind: z.enum(['NFSE', 'NFE', 'NFCE']), // NFCE: BE-INCR-NFCE item 3
  })
  .strict();
export type EmitFiscalDocumentInput = z.infer<typeof EmitFiscalDocumentSchema>;

export const PreviewFiscalDocumentSchema = z
  .object({
    unitId: z.string().min(1),
    saleId: z.string().min(1),
    kind: z.enum(['NFSE', 'NFE', 'NFCE']), // NFCE: BE-INCR-NFCE item 3
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

/**
 * BE-INCR-DFE-EVENTOS (nó X11, itens 11 e 17) — POST …/documents/:id/substituir. `cMotivo` é o `TSCodJustSubst` do
 * XSD 1.01 (string de 2, nunca número — Anexo I [115]); `xMotivo` 15–255 ([116]), obrigatório com 99 (RN E0078).
 */
export const SubstituirFiscalDocumentSchema = z
  .object({
    unitId: z.string().min(1),
    cMotivo: z.enum(SUBST_MOTIVOS),
    xMotivo: z.string().min(15).max(255).optional(),
  })
  .strict()
  .superRefine(refineSubstMotivo);
export type SubstituirFiscalDocumentInput = z.infer<typeof SubstituirFiscalDocumentSchema>;

/**
 * BE-INCR-DFE-EVENTOS (nó X11, itens 3–4) — contrato de SAÍDA da janela de eventos na `FiscalDocumentView`.
 * ISO 8601 com fuso ou `null`. `substituirTeto` = base + 2 anos (Anexo I [114], único limite nacional);
 * `cancelarAte`/`substituirAte` só existem com o prazo do município configurado no perfil (F-EVT-1 a).
 */
export const JanelaEventosSchema = z
  .object({
    cancelarAte: z.string().datetime({ offset: true }).nullable(),
    substituirAte: z.string().datetime({ offset: true }).nullable(),
    substituirTeto: z.string().datetime({ offset: true }).nullable(),
    fonte: z.enum(['perfil', 'desconhecida']),
  })
  .strict();
export type JanelaEventos = z.infer<typeof JanelaEventosSchema>;

/**
 * BE-INCR-NFCE (nó X10a, itens 24 e 31) — `POST /api/nfe/dfe/inutilizacoes`. Campos do `inutNFe` (MOC 7.0 VG §5.3.1,
 * Tabela 5-9): série 0–889 (`[NFE-SERIE]`), nNFIni/nNFFin 1–999.999.999 (9 dígitos), xJust 15–255. O `ano` sai do relógio
 * do escopo (não é entrada); as guardas da Tabela 5-12 ficam no serviço.
 */
export const VoidNumberRangeSchema = z
  .object({
    unitId: z.string().min(1),
    kind: z.enum(['NFE', 'NFCE']),
    serie: z.number().int().min(0).max(889),
    nIni: z.number().int().min(1).max(999_999_999),
    nFin: z.number().int().min(1).max(999_999_999),
    xJust: z.string().trim().min(15).max(255),
  })
  .strict();
export type VoidNumberRangeInput = z.infer<typeof VoidNumberRangeSchema>;

/** BE-INCR-NFCE item 25 — `GET /api/nfe/dfe/inutilizacoes/pendentes?unitId&kind`. */
export const PendingVoidsQuerySchema = z.object({ unitId: z.string().min(1), kind: z.enum(['NFE', 'NFCE']) }).strict();
export type PendingVoidsQueryInput = z.infer<typeof PendingVoidsQuerySchema>;

/** Contrato de SAÍDA do pedido de inutilização (números como string: BigInt-safe). */
export const FiscalNumberVoidViewSchema = z
  .object({
    id: z.string(),
    kind: z.enum(['NFE', 'NFCE']),
    ambiente: z.enum(['producao', 'homologacao']),
    serie: z.number().int(),
    nIni: z.string().regex(/^\d+$/),
    nFin: z.string().regex(/^\d+$/),
    ano: z.number().int(),
    status: z.enum(['REQUESTED', 'HOMOLOGATED', 'REJECTED']),
    partner: z.string(),
    nProt: z.string().nullable(),
    errors: z.array(z.object({ code: z.string(), message: z.string() }).strict()),
  })
  .strict();
export type FiscalNumberVoidView = z.infer<typeof FiscalNumberVoidViewSchema>;

/** Contrato de SAÍDA de uma lacuna (item 25 + EMENDA-3 E3-2 a: aviso da UF e, na NFC-e, o texto da presunção). */
export const LacunaDeNumeracaoSchema = z
  .object({
    ambiente: z.string(),
    serie: z.number().int(),
    numero: z.string().regex(/^\d+$/),
    documentId: z.string().nullable(),
    status: z.enum(['SENT', 'PROCESSING', 'AUTHORIZED', 'AUTHORIZED_DIVERGENT', 'REJECTED', 'CANCELLED']).nullable(),
    avisos: z.array(z.string()),
    presuncao: z.string().optional(),
  })
  .strict();
export type LacunaDeNumeracaoView = z.infer<typeof LacunaDeNumeracaoSchema>;

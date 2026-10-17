import type { Request, Response } from 'express';
import { getFactory } from '../lib/factory';
import { handleApiError } from '../lib/apiUtils';
import { getUserContextFromRequest } from '../lib/authUtils';
import {
  AttachSourceDocumentSchema,
  ListSourceDocumentsQuerySchema,
} from '../features/accounting/dtos/SourceDocumentDto';
import { CreateSourceDocumentUploadSchema } from '../features/accounting/dtos/SourceDocumentUploadDto';
import { makeUploadMiddleware, validateMagicBytes } from '../lib/uploadSecurity';

/**
 * BE-INCR-PROVENANCE-ATTACH (NFE-X) — borda HTTP da proveniência formal de um lançamento
 * JÁ POSTADO. F-PA3→(b), ratificado 2026-08-28: o incremento entra COM borda, POST + GET.
 *
 * Ambos delegam ao `PostingService` (dono do seam), nunca ao repositório direto — a cadeia
 * `Route → Controller → Service → Repository` é requisito do Contrato §2/§3. As policies
 * ficam no serviço, como em todo o módulo de contabilidade: `canManage` para anexar,
 * `canRead` para listar (precedente do `DocumentAttachmentService`).
 */

/**
 * @openapi
 * /api/accounting/journal-entries/{entryId}/source-documents:
 *   post:
 *     tags: [Accounting]
 *     summary: Anexa proveniência formal a um lançamento já postado
 *     description: >
 *       404: Lançamento não encontrado no escopo
 *       Cria um SourceDocument e o vincula ao lançamento, sem repostar e sem escrever valor no
 *       razão. Idempotente pela `externalRef` humana (a chave de acesso da NF-e): reanexar o
 *       mesmo documento ao mesmo lançamento devolve o SourceDocument existente.
 *     parameters:
 *       - in: path
 *         name: entryId
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/AttachSourceDocument' }
 *     responses:
 *       201: { description: Proveniência anexada }
 *       400: { description: Corpo inválido }
 *       401: { description: Não autenticado }
 *       403: { description: Sem permissão para anexar proveniência }
 *       '404': { $ref: '#/components/responses/UnitNotFound' }
 *       '409': { $ref: '#/components/responses/UnitDeleted' }
 */
export const attachSourceDocument = async (req: Request, res: Response) => {
  try {
    const user = getUserContextFromRequest(req);
    if (!user) return res.status(401).json({ success: false, error: 'Unauthorized' });

    const parsed = AttachSourceDocumentSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ success: false, error: parsed.error.flatten() });
    }

    const scope = await getFactory().getAccountingScopeResolver().resolve(user, parsed.data.unitId, { access: 'write' });
    const data = await getFactory()
      .getPostingService()
      .attachSourceDocument(scope, req.params.entryId, {
        externalRef: parsed.data.externalRef,
        documentDate: parsed.data.documentDate,
        description: parsed.data.description,
        attachmentId: parsed.data.attachmentId,
        rawJson: parsed.data.rawJson,
        sourceType: parsed.data.sourceType,
      });

    return res.status(201).json({ success: true, data });
  } catch (error) {
    return handleApiError(error, res);
  }
};

/**
 * @openapi
 * /api/accounting/journal-entries/{entryId}/source-documents:
 *   get:
 *     tags: [Accounting]
 *     summary: Lista os documentos de origem vinculados a um lançamento
 *     parameters:
 *       - in: path
 *         name: entryId
 *         required: true
 *         schema: { type: string }
 *       - in: query
 *         name: unitId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Lista de vínculos com seus SourceDocuments }
 *       400: { description: Query inválida }
 *       401: { description: Não autenticado }
 *       403: { description: Sem permissão de leitura }
 *       '404': { $ref: '#/components/responses/UnitNotFound' }
 */
export const listSourceDocuments = async (req: Request, res: Response) => {
  try {
    const user = getUserContextFromRequest(req);
    if (!user) return res.status(401).json({ success: false, error: 'Unauthorized' });

    const parsed = ListSourceDocumentsQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      return res.status(400).json({ success: false, error: parsed.error.flatten() });
    }

    const scope = await getFactory().getAccountingScopeResolver().resolve(user, parsed.data.unitId, { access: 'read' });
    const data = await getFactory()
      .getPostingService()
      .listSourceDocuments(scope, req.params.entryId);

    return res.json({ success: true, data });
  } catch (error) {
    return handleApiError(error, res);
  }
};

/**
 * BE-INCR-SOURCE-DOCUMENT-UPLOAD F-SD-6 (b): só PDF/PNG/JPEG — o DAS é PDF e o documento do histórico é PDF ou imagem;
 * sem `octet-stream` (enfraquece o magic-bytes). Teto do anexo contábil reusado (50 MB, configurável).
 */
const SOURCE_DOCUMENT_MIME_TYPES = new Set(['application/pdf', 'image/png', 'image/jpeg']);
const MAX_SOURCE_DOCUMENT_SIZE_BYTES = Number(process.env.MAX_ATTACHMENT_SIZE_BYTES) || 50 * 1024 * 1024;

/** Multer do campo `file` (memória, allowlist F-SD-6 b, teto). */
export const sourceDocumentUpload = makeUploadMiddleware(SOURCE_DOCUMENT_MIME_TYPES, 'file', MAX_SOURCE_DOCUMENT_SIZE_BYTES);

/**
 * @openapi
 * /api/accounting/source-documents:
 *   post:
 *     tags: [Accounting]
 *     summary: Cria um documento de origem a partir de um arquivo (sem lançamento)
 *     description: >
 *       BE-INCR-SOURCE-DOCUMENT-UPLOAD (F-SD-1 a). Grava o arquivo como anexo do novo SourceDocument e devolve o id,
 *       que o cliente passa no `sourceDocumentId` do PUT do DAS ou do histórico do Simples. Nada é escrito no razão.
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema: { $ref: '#/components/schemas/CreateSourceDocumentUpload' }
 *     responses:
 *       201:
 *         description: Documento de origem criado
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/SourceDocumentUpload' }
 *       400: { description: Sem arquivo, tipo fora da allowlist ou corpo inválido }
 *       401: { description: Não autenticado }
 *       403: { description: Sem permissão para enviar documentos de origem }
 *       '404': { $ref: '#/components/responses/UnitNotFound' }
 *       '409': { $ref: '#/components/responses/UnitDeleted' }
 *       413: { description: Arquivo acima do teto }
 *       415: { description: Conteúdo não confere com o tipo declarado }
 */
export const createSourceDocumentUpload = async (req: Request, res: Response) => {
  try {
    const user = getUserContextFromRequest(req);
    if (!user) return res.status(401).json({ success: false, error: 'Unauthorized' });

    const file = (req as Request & { file?: Express.Multer.File }).file;
    if (!file) {
      return res.status(400).json({ success: false, error: 'File is required (field name: file)' });
    }
    // Magic-bytes secundário — anti MIME falsificado (mesmo guard do upload de anexo).
    if (!validateMagicBytes(file.buffer, file.mimetype)) {
      return res.status(415).json({ success: false, error: 'File content does not match declared type.' });
    }

    const parsed = CreateSourceDocumentUploadSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ success: false, error: parsed.error.flatten() });
    }

    const scope = await getFactory().getAccountingScopeResolver().resolve(user, parsed.data.unitId, { access: 'write' });
    const data = await getFactory().getSourceDocumentUploadService().createFromFile(scope, {
      sourceType: parsed.data.sourceType,
      externalRef: parsed.data.externalRef,
      documentDate: parsed.data.documentDate,
      description: parsed.data.description,
      fileName: file.originalname,
      mimeType: file.mimetype,
      buffer: file.buffer,
    });

    return res.status(201).json({ success: true, data });
  } catch (error) {
    return handleApiError(error, res);
  }
};

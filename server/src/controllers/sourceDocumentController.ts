import type { Request, Response } from 'express';
import { getFactory } from '../lib/factory';
import { handleApiError } from '../lib/apiUtils';
import { getUserContextFromRequest } from '../lib/authUtils';
import { resolveAccountingScope } from '../features/accounting/scope/AccountingScope';
import {
  AttachSourceDocumentSchema,
  ListSourceDocumentsQuerySchema,
} from '../features/accounting/dtos/SourceDocumentDto';

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
 *       404: { description: Lançamento não encontrado no escopo }
 */
export const attachSourceDocument = async (req: Request, res: Response) => {
  try {
    const user = getUserContextFromRequest(req);
    if (!user) return res.status(401).json({ success: false, error: 'Unauthorized' });

    const parsed = AttachSourceDocumentSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ success: false, error: parsed.error.flatten() });
    }

    const scope = resolveAccountingScope(user, parsed.data.unitId);
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
 */
export const listSourceDocuments = async (req: Request, res: Response) => {
  try {
    const user = getUserContextFromRequest(req);
    if (!user) return res.status(401).json({ success: false, error: 'Unauthorized' });

    const parsed = ListSourceDocumentsQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      return res.status(400).json({ success: false, error: parsed.error.flatten() });
    }

    const scope = resolveAccountingScope(user, parsed.data.unitId);
    const data = await getFactory()
      .getPostingService()
      .listSourceDocuments(scope, req.params.entryId);

    return res.json({ success: true, data });
  } catch (error) {
    return handleApiError(error, res);
  }
};

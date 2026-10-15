import { createHash, randomUUID } from 'node:crypto';
import { ForbiddenError } from '../../../lib/errors';
import * as storage from '../../../lib/attachmentStorage';
import type { AccountingScope } from '../scope/AccountingScope';
import type { IAccountingPolicy } from '../policies/IAccountingPolicy';
import type { IDocumentAttachmentRepository } from '../repositories/IDocumentAttachmentRepository';
import type { ISourceProvenanceRepository } from '../repositories/ISourceProvenanceRepository';
import type { AuditService } from './AuditService';
import type { DocumentoRef, SourceDocumentUploadType, SourceDocumentUploadView } from '../dtos/SourceDocumentUploadDto';

/** Evento de auditoria do upload (F-SD-7 → a) — só ids, hash, MIME e tamanho; nunca o nome do arquivo (texto livre). */
export const SOURCE_DOCUMENT_UPLOADED = 'source_document.uploaded';

/** Entrada do upload — bytes e metadados do arquivo vêm do multer no controller, nunca do corpo. */
export interface CreateSourceDocumentFromFileInput {
  sourceType: SourceDocumentUploadType;
  externalRef?: string;
  documentDate?: string;
  description?: string;
  fileName: string;
  mimeType: string;
  buffer: Buffer;
}

/**
 * BE-INCR-SOURCE-DOCUMENT-UPLOAD (BRIEF itens 3–4, 7; F-SD-1..11 ratificados 15/10) — cria um `SourceDocument` a partir
 * de um arquivo, sem lançamento, e resolve o documento para os consumidores (DAS e histórico do Simples, F-SD-9 a).
 * Serviço próprio (F-SD-2): o `DocumentAttachmentService.upload` exige alvo existente, e aqui o alvo nasce junto.
 *
 * Transação (TX-001, mesmo padrão do `DocumentAttachmentService.upload`): o id do SD é gerado ANTES (o caminho em disco
 * é por `targetId`); o binário vai ao disco antes da tx; anexo (`targetType` SOURCE_DOCUMENT) + SD + auditoria commitam
 * juntos; se a tx falha, o arquivo é apagado (compensação). Sem `postEntry` — nada no razão.
 */
export class SourceDocumentUploadService {
  constructor(
    private readonly attachmentRepo: Pick<IDocumentAttachmentRepository, 'create' | 'findActiveByIds' | 'runTransaction'>,
    private readonly provenanceRepo: Pick<ISourceProvenanceRepository, 'createSourceDocument' | 'findActiveSourceDocumentsByIds'>,
    private readonly policy: IAccountingPolicy,
    private readonly audit: AuditService,
  ) {}

  /** POST /api/accounting/source-documents — F-SD-5 → (a): `canManage`, como o upload de anexo. */
  public async createFromFile(scope: AccountingScope, input: CreateSourceDocumentFromFileInput): Promise<SourceDocumentUploadView> {
    if (!this.policy.canManage(scope)) {
      throw new ForbiddenError('Não autorizado a enviar documentos de origem.');
    }

    // BRIEF §5: nenhum gerador cuid no servidor — uuid v4 (o charset do idLike aceita hífen).
    const sourceDocumentId = randomUUID();
    const sha256 = createHash('sha256').update(input.buffer).digest('hex');
    const { storageKey, sanitizedName } = await storage.saveFile(scope.ownerUserId, scope.unitId, sourceDocumentId, input.fileName, input.buffer);

    try {
      return await this.attachmentRepo.runTransaction(async (tx) => {
        const att = await this.attachmentRepo.create(
          {
            userId: scope.ownerUserId,
            unitId: scope.unitId,
            targetType: 'SOURCE_DOCUMENT',
            targetId: sourceDocumentId,
            fileName: sanitizedName,
            mimeType: input.mimeType,
            fileSize: input.buffer.length,
            sha256,
            storageKey,
            uploadedById: scope.actorUserId,
          },
          tx,
        );
        const sd = await this.provenanceRepo.createSourceDocument(
          {
            id: sourceDocumentId,
            userId: scope.ownerUserId,
            unitId: scope.unitId,
            sourceType: input.sourceType,
            externalRef: input.externalRef ?? null,
            documentDate: input.documentDate ? new Date(input.documentDate) : null,
            description: input.description ?? null,
            attachmentId: att.id,
            createdById: scope.actorUserId,
          },
          tx,
        );
        await this.audit.append(tx, scope, {
          actorUserId: scope.actorUserId,
          eventType: SOURCE_DOCUMENT_UPLOADED,
          targetType: 'source_document',
          targetId: sd.id,
          payload: {
            sourceDocumentId: sd.id,
            attachmentId: att.id,
            sourceType: input.sourceType,
            mimeType: input.mimeType,
            sizeBytes: String(input.buffer.length),
            sha256,
          },
        });
        return {
          id: sd.id,
          sourceType: sd.sourceType,
          externalRef: sd.externalRef,
          documentDate: sd.documentDate ? sd.documentDate.toISOString().slice(0, 10) : null,
          description: sd.description,
          createdAt: sd.createdAt.toISOString(),
          attachment: { id: att.id, fileName: att.fileName, mimeType: att.mimeType, fileSize: att.fileSize, sha256: att.sha256 },
        };
      });
    } catch (e) {
      // TX-001: a tx falhou depois do disco — apaga o órfão (deleteFile é idempotente a ENOENT).
      await storage.deleteFile(storageKey);
      throw e;
    }
  }

  /**
   * F-SD-9 → (a): o documento de cada id, para o DAS e o histórico. SD retirado ou fora do escopo = sem entrada no mapa
   * (o consumidor expõe `documento: null`); SD sem anexo ativo = `attachmentId`/`fileName` nulos. Duas consultas, sem N+1.
   * Sem policy própria: quem chama já checou a leitura do consumidor.
   */
  public async documentosPorId(scope: AccountingScope, ids: ReadonlyArray<string | null>): Promise<Map<string, NonNullable<DocumentoRef>>> {
    const unicos = [...new Set(ids.filter((id): id is string => !!id))];
    const sds = await this.provenanceRepo.findActiveSourceDocumentsByIds(scope, unicos);
    const anexos = await this.attachmentRepo.findActiveByIds(scope, sds.map((s) => s.attachmentId).filter((id): id is string => !!id));
    const porAnexo = new Map(anexos.map((a) => [a.id, a]));
    return new Map(
      sds.map((s) => {
        const a = s.attachmentId ? porAnexo.get(s.attachmentId) : undefined;
        return [s.id, { sourceDocumentId: s.id, attachmentId: a?.id ?? null, fileName: a?.fileName ?? null }];
      }),
    );
  }
}

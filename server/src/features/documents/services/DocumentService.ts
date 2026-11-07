import { IDocument } from '../models/Document.model';
import { IDocumentRepository } from '../repositories/IDocumentRepository';
import { IChunkRepository } from '../repositories/IChunkRepository';
import type { IChunkVectorRepository } from '../repositories/IChunkVectorRepository';
import type { IUserEmbedder } from '@/lib/embedding/UserEmbedder';
import { DocumentProcessingService } from './DocumentProcessingService';
import { DocumentProcessingPipeline } from './DocumentProcessingPipeline';
import { UserContext } from '../../../lib/authUtils';
import { NotFoundError, ForbiddenError, ValidationError, UnauthorizedError } from '../../../lib/errors';
import {
  GeneratedContextSchema,
  type GeneratedContext,
  type UpdateDocumentContextDto,
  type UserEditableContextField,
} from '../dtos/DocumentDto';
import { DocumentContextUpdateInput, DocumentUpdateInput } from '../models/Document.model';
import type { IDocumentPolicy } from '../policies/IDocumentPolicy';
import { DocumentStatus, DocumentPurpose } from '../models/Document.model';
import { logger } from '@/lib/logger';
import type { IUserRepository } from '../../users/repositories/IUserRepository';

/**
 * Service implementation for Document business logic.
 * Handles all business operations for Document entities.
 */
export class DocumentService {
  private processingPipeline: DocumentProcessingPipeline;

    constructor(
    private readonly repository: IDocumentRepository,
    private readonly chunkRepository: IChunkRepository,
    private readonly vectorRepository: IChunkVectorRepository,
    private readonly processingService: DocumentProcessingService,
    private readonly policy: IDocumentPolicy,
    private readonly userRepository: IUserRepository,
    private readonly embedder: IUserEmbedder
  ) {
    this.processingPipeline = new DocumentProcessingPipeline(
      chunkRepository,
      vectorRepository,
      processingService,
      repository,
      userRepository,
      embedder
    );
  }

  /**
   * Retrieves all documents for a user with pagination
   */
  async getAllDocuments(userContext: UserContext, page: number, limit: number) {
    if (!userContext.userId) throw new UnauthorizedError('Authentication required');
    if (!this.policy.canListAll(userContext)) throw new ForbiddenError('Document listing forbidden by policy');
    return this.repository.findAll(userContext.userId, page, limit);
  }

  /**
   * Retrieves all documents for a user, returning only id and fileName.
   * Optimized for populating selection lists in the UI.
   */
  async getDocumentListForUser(userContext: UserContext): Promise<{ id: string; fileName: string }[]> {
    if (!userContext.userId) throw new UnauthorizedError('Authentication required');
    if (!this.policy.canListAll(userContext)) throw new ForbiddenError('Document listing forbidden by policy');
    return this.repository.findAllForUser(userContext.userId);
  }

  /**
   * Retrieves a specific document by ID
   */
  async getDocumentById(id: string, userContext: UserContext): Promise<IDocument> {
    if (!userContext.userId) throw new UnauthorizedError('Authentication required');

    const document = await this.repository.findById(id);
    if (!document) {
      throw new NotFoundError('Document not found');
    }
    // Returns 404 (not 403) for a non-owned document so existence isn't leaked.
    if (!this.policy.canView(userContext, document)) {
      throw new NotFoundError('Document not found');
    }
    return document;
  }

  /**
   * Handles document upload and starts async processing
   */
  async createDocument(
    fileBuffer: ArrayBuffer,
    fileName: string,
    fileType: string,
    fileSize: number,
    userContext: UserContext,
    documentPurpose: DocumentPurpose = DocumentPurpose.DATA_ANALYSIS
  ): Promise<IDocument> {
    if (!userContext.userId) throw new UnauthorizedError('Authentication required');
    if (!this.policy.canCreate(userContext)) throw new ForbiddenError('Document creation forbidden by policy');

    let mimeType: string;
    switch (fileType.toUpperCase()) {
      case 'PDF':
        mimeType = 'application/pdf';
        break;
      case 'DOCX':
        mimeType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
        break;
      case 'XLSX':
        mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
        break;
      default:
        throw new ValidationError(`Unsupported file type: ${fileType}`);
    }

    const doc = await this.repository.create({
      userId: userContext.userId,
      fileName,
      fileType: fileType.toUpperCase() as 'PDF' | 'DOCX' | 'XLSX',
      fileSize,
      textContent: '',
      status: DocumentStatus.PROCESSING,
      mimeType: mimeType,
      documentPurpose: documentPurpose,
    });

    setImmediate(() => {
      this.processDocumentAsync(doc.id, fileBuffer, mimeType).catch(error => {
        logger.error(`Error in async document processing for document ${doc.id}`, { error });
      });
    });

    return doc;
  }

  /**
   * Processes document asynchronously (parse text, generate embeddings, store in the vector index, update status).
   * On error: updates status to FAILED with errorMessage.
   */
  private async processDocumentAsync(
    docId: string,
    fileBuffer: ArrayBuffer,
    mimeType: string
  ): Promise<void> {
    try {
      // Re-fetch document to get latest state
      const document = await this.repository.findById(docId);
      if (!document) {
        logger.error(`processDocumentAsync: document ${docId} not found`);
        return;
      }

      // Parse text from file
      const text = await this.processingService.extractText(fileBuffer, mimeType);

      // Persist extracted text and keep status=PROCESSING
      await this.repository.update(docId, {
        status: DocumentStatus.PROCESSING,
        textContent: text,
        summary: document.summary,
        contextJson: document.contextJson,
        processingDate: null,
        processingError: null,
      });

      // Run chunking + embedding + vector storage; pipeline sets status=COMPLETED on success
      const docWithText: IDocument = { ...document, textContent: text };
      await this.processingPipeline.processDocument(docWithText, text);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown processing error';
      logger.error(`Async processing failed for document ${docId}`, { error });
      try {
        await this.repository.update(docId, {
          status: DocumentStatus.FAILED,
          summary: null,
          processingDate: new Date(),
          processingError: errorMessage,
        });
      } catch (updateError) {
        logger.error(`Failed to update document ${docId} status to FAILED`, { updateError });
      }
    }
  }

  /**
   * Deletes a document and its chunks/vectors
   */
  async deleteDocument(id: string, userContext: UserContext): Promise<void> {
    if (!userContext.userId) throw new UnauthorizedError('Authentication required');

    const document = await this.repository.findById(id);
    if (!document) {
      throw new NotFoundError('Document not found');
    }
    if (!this.policy.canDelete(userContext, document)) {
      throw new ForbiddenError('Access denied to delete document');
    }
    // RAG-PR-A item 9, caminho (2): a vec0 mora num arquivo próprio, fora da transação do Prisma.
    // 1. Vetores PRIMEIRO. Se falhar, nada no SQL foi tocado.
    await this.vectorRepository.deleteByDocument(id);
    // 2. Trechos + documento no SQL (uma transação). Se falhar depois do passo 1, os vetores já saíram e o SQL está
    //    intacto (a busca não acha o documento até o `rag:reindex`); vetor que sobrar some no VecOrphanSweepScheduler.
    try {
      await this.repository.deleteWithChunks(id);
    } catch (err) {
      logger.error('deleteDocument: SQL delete failed after the vectors were removed', { documentId: id, error: err });
      throw err;
    }
  }

  /**
   * Correção do usuário (RAG-PR-B item 18, F-RAG-4): `fileName`, `documentPurpose`, `summary` e os campos corrigíveis
   * do contexto gerado (`documentType`, `entities`). Status e estatísticas do processamento não passam por aqui — o
   * pipeline os grava pelo repositório. Todo campo do contexto corrigido entra em `userEditedFields` (o pipeline do
   * RAG-PR-D não sobrescreve campo editado). Leitura do contexto atual e escrita na mesma tx: duas correções
   * concorrentes não perdem a marca uma da outra.
   */
  async updateDocumentContext(
    id: string,
    data: UpdateDocumentContextDto,
    userContext: UserContext
  ): Promise<IDocument> {
    if (!userContext.userId) throw new UnauthorizedError('Authentication required');

    return this.repository.runInTransaction(async (tx) => {
      const document = await this.repository.findById(id, tx);
      if (!document) {
        throw new NotFoundError('Document not found');
      }
      if (!this.policy.canUpdate(userContext, document)) {
        throw new ForbiddenError('Access denied to update document');
      }

      const edited = (['summary', 'documentType', 'entities'] as const).filter((k) => data[k] !== undefined);
      const update: DocumentContextUpdateInput = {
        ...(data.fileName !== undefined && { fileName: data.fileName }),
        ...(data.documentPurpose !== undefined && { documentPurpose: data.documentPurpose }),
        ...(data.summary !== undefined && { summary: data.summary }),
      };
      if (edited.length > 0) {
        const current = currentGeneratedContext(document.generatedContext);
        const next: GeneratedContext = GeneratedContextSchema.parse({
          ...current,
          ...(data.documentType !== undefined && { documentType: data.documentType }),
          ...(data.entities !== undefined && { entities: data.entities }),
          userEditedFields: [...new Set<UserEditableContextField>([...current.userEditedFields, ...edited])],
        });
        update.generatedContext = next;
      }
      return this.repository.updateContext(id, update, tx);
    });
  }
}

/**
 * Contexto gravado (ou o vazio, antes do pipeline gerar). Valor gravado fora do `GeneratedContextSchema` não é
 * remendado em silêncio: o `parse` lança e a correção falha com 500, para o defeito aparecer.
 */
function currentGeneratedContext(stored: Record<string, unknown> | null): GeneratedContext {
  if (stored === null) return { version: 1, documentType: null, entities: [], userEditedFields: [] };
  return GeneratedContextSchema.parse(stored);
}

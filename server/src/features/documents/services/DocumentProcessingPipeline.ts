import { IChunkRepository } from '../repositories/IChunkRepository';
import type { IChunkVectorRepository } from '../repositories/IChunkVectorRepository';
import type { IUserEmbedder } from '@/lib/embedding/UserEmbedder';
import { DocumentProcessingService } from './DocumentProcessingService';
import { IDocumentRepository } from '../repositories/IDocumentRepository';
import { IDocument, DocumentStatus } from '../models/Document.model';
import { DocumentContext } from '../models/DocumentContext';
import { logger } from '@/lib/logger';
import type { IUserRepository } from '../../users/repositories/IUserRepository';
import { AppError, NotFoundError } from '@/lib/errors';

export class DocumentProcessingPipeline {
  private chunkRepository: IChunkRepository;
  private vectorRepository: IChunkVectorRepository;
  private processingService: DocumentProcessingService;
  private documentRepository: IDocumentRepository;
  private userRepository: IUserRepository;

  constructor(
    chunkRepository: IChunkRepository,
    vectorRepository: IChunkVectorRepository,
    processingService: DocumentProcessingService,
    documentRepository: IDocumentRepository,
    userRepository: IUserRepository,
    private readonly embedder: IUserEmbedder
  ) {
    this.chunkRepository = chunkRepository;
    this.vectorRepository = vectorRepository;
    this.processingService = processingService;
    this.documentRepository = documentRepository;
    this.userRepository = userRepository;
  }

  public async processDocument(document: IDocument, text:string): Promise<void> {
    const startTime = Date.now();
    const context: DocumentContext = {
      processing: {
        totalChunks: 0,
        processedChunks: 0,
        failedChunks: 0,
        duration: 0,
        startTime: new Date().toISOString(),
        endTime: '',
      },
      statistics: this.calculateStatistics(text),
      errors: [],
    };

    try {
      logger.info(`Starting document processing for document ${document.id}`);

      await this.documentRepository.update(document.id, {
        status: DocumentStatus.PROCESSING,
        contextJson: context,
        summary: null,
        processingDate: null,
        processingError: null,
      });

      // R26 aposentado (dono, 2026-10-29): sem extração estruturada; o dono do documento ainda tem de existir.
      const userRecord = await this.userRepository.getUserById(document.userId);
      if (!userRecord) {
        throw new NotFoundError(`User with id ${document.userId} not found for document ${document.id}`);
      }

      await this.processChunks(document, text, context);

      context.processing.duration = Date.now() - startTime;
      context.processing.endTime = new Date().toISOString();
      await this.documentRepository.update(document.id, {
        status: DocumentStatus.COMPLETED,
        processingDate: new Date(),
        contextJson: context,
        summary: null,
        processingError: null,
      });
      logger.info(`Document ${document.id} processed successfully`);
    } catch (error) {
      await this.handleProcessingError(document, error, context, startTime);
    }
  }

  /**
   * RAG-PR-A item 8 + §8.1: reprocessar é idempotente — os vetores e os trechos anteriores do documento saem antes
   * (vetor primeiro: a `vec0` resolve os ids pela `Chunk`). O lote de vetores entra numa transação só do arquivo de
   * vetor, então uma falha no meio não deixa vetor com o carimbo atual visível. O carimbo vai na `Chunk` depois.
   */
  private async processChunks(document: IDocument, text: string, context: DocumentContext): Promise<void> {
    await this.vectorRepository.deleteByDocument(document.id);
    await this.chunkRepository.deleteByDocument(document.id);

    const chunks = this.processingService.chunkText(text);
    context.processing.totalChunks = chunks.length;

    // Persist chunk records first so we have their IDs for the vector rows
    const chunkRecords: Array<{ id: string; text: string; index: number }> = [];
    for (let i = 0; i < chunks.length; i++) {
      try {
        const chunkText = chunks[i];
        const chunk = await this.chunkRepository.create({ text: chunkText, index: i, documentId: document.id });
        chunkRecords.push({ id: chunk.id, text: chunkText, index: i });
      } catch (error) {
        context.processing.failedChunks++;
        const errorMessage = 'Failed to persist a document chunk.';
        logger.error(`Error persisting chunk ${i} of document ${document.id}`, { error });
        context.errors = context.errors || [];
        context.errors.push({ code: 'CHUNK_PROCESSING_ERROR', message: errorMessage, timestamp: new Date().toISOString() });
      }
    }

    if (chunkRecords.length === 0) {
      if (context.processing.failedChunks > 0) {
        throw new Error(`${context.processing.failedChunks} chunks failed to process.`);
      }
      return;
    }

    // Um resolvedor só (item 6): o carimbo gravado é o mesmo que a busca vai pedir.
    let embedded: { vectors: Float32Array[]; stamp: string; dims: number };
    try {
      embedded = await this.embedder.embed(document.userId, chunkRecords.map(c => c.text));
    } catch (error) {
      const errorMessage = 'Failed to generate the document embeddings.';
      logger.error(`Batch embedding failed for document ${document.id}`, { error });
      context.processing.failedChunks += chunkRecords.length;
      context.errors = context.errors || [];
      context.errors.push({ code: 'CHUNK_PROCESSING_ERROR', message: errorMessage, timestamp: new Date().toISOString() });
      throw new Error(errorMessage);
    }

    await this.vectorRepository.upsert(
      chunkRecords.map((c, j) => ({ chunkId: c.id, userId: document.userId, stamp: embedded.stamp, vector: embedded.vectors[j] })),
    );
    await this.chunkRepository.setEmbeddingStamp(chunkRecords.map(c => c.id), embedded.stamp, embedded.dims);
    context.processing.processedChunks += chunkRecords.length;
    await this.documentRepository.update(document.id, {
      contextJson: context,
      status: DocumentStatus.PROCESSING,
      summary: null,
      processingDate: null,
      processingError: null
    });

    if (context.processing.failedChunks > 0) {
      throw new Error(`${context.processing.failedChunks} chunks failed to process.`);
    }
  }

  private async handleProcessingError(
    document: IDocument,
    error: unknown,
    context: DocumentContext,
    startTime: number
  ): Promise<void> {
    context.processing.duration = Date.now() - startTime;
    context.processing.endTime = new Date().toISOString();
    const errorMessage = error instanceof AppError ? error.message : 'Document processing failed.';
    context.errors = context.errors || [];
    context.errors.push({
      code: 'FATAL_PROCESSING_ERROR',
      message: errorMessage,
      timestamp: new Date().toISOString(),
    });
    logger.error(`Fatal error processing document ${document.id}`, { error });
    await this.documentRepository.update(document.id, {
      status: DocumentStatus.ERROR,
      processingError: errorMessage,
      processingDate: new Date(),
      contextJson: context,
      summary: null
    });
  }

  private calculateStatistics(text: string): DocumentContext['statistics'] {
    const words = text.split(/\s+/).filter(function(word) { return word.length > 0; });
    const wordCount = words.length;
    const charCount = text.length;
    const avgWordLength = wordCount > 0 ? charCount / wordCount : 0;
    return {
      wordCount: wordCount,
      charCount: charCount,
      avgWordLength: avgWordLength,
    };
  }
}


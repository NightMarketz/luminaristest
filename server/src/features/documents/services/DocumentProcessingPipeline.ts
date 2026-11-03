import { IChunkRepository } from '../repositories/IChunkRepository';
import { IVectorRepository } from '../repositories/IVectorRepository';
import { DocumentProcessingService } from './DocumentProcessingService';
import { IDocumentRepository } from '../repositories/IDocumentRepository';
import { IDocument, DocumentStatus } from '../models/Document.model';
import { DocumentContext } from '../models/DocumentContext';
import { logger } from '@/lib/logger';
import { v5 as uuidv5 } from 'uuid';
import type { IUserRepository } from '../../users/repositories/IUserRepository';
import { NotFoundError } from '@/lib/errors';

// Namespace UUID para gerar UUIDs determinísticos para os chunks. Deve ser um UUID válido.
const CHUNK_ID_NAMESPACE = 'f6db7260-569b-4559-835a-484f913119a4';

export class DocumentProcessingPipeline {
  private chunkRepository: IChunkRepository;
  private vectorRepository: IVectorRepository;
  private processingService: DocumentProcessingService;
  private documentRepository: IDocumentRepository;
  private userRepository: IUserRepository;

  constructor(
    chunkRepository: IChunkRepository,
    vectorRepository: IVectorRepository,
    processingService: DocumentProcessingService,
    documentRepository: IDocumentRepository,
    userRepository: IUserRepository
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

  private async processChunks(document: IDocument, text: string, context: DocumentContext): Promise<void> {
    const chunks = this.processingService.chunkText(text);
    context.processing.totalChunks = chunks.length;

    // Persist chunk records first so we have their IDs for vector point generation
    const chunkRecords: Array<{ id: string; text: string; index: number }> = [];
    for (let i = 0; i < chunks.length; i++) {
      try {
        const chunkText = chunks[i];
        const chunk = await this.chunkRepository.create({ text: chunkText, index: i, documentId: document.id });
        chunkRecords.push({ id: chunk.id, text: chunkText, index: i });
      } catch (error) {
        context.processing.failedChunks++;
        const errorMessage = error instanceof Error ? error.message : 'Unknown chunk processing error';
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

    // Batch-embed all chunk texts in a single OpenAI API call (R11: avoid N sequential calls)
    let vectors: number[][];
    try {
      vectors = await this.processingService.generateEmbeddings(chunkRecords.map(c => c.text));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown embedding error';
      logger.error(`Batch embedding failed for document ${document.id}`, { error });
      context.processing.failedChunks += chunkRecords.length;
      context.errors = context.errors || [];
      context.errors.push({ code: 'CHUNK_PROCESSING_ERROR', message: errorMessage, timestamp: new Date().toISOString() });
      throw new Error(`Batch embedding failed: ${errorMessage}`);
    }

    // Build vector points and upsert in batches of 10
    const vectorPoints: Array<{ id: string; payload: Record<string, string | number | boolean | null>; vector: number[] }> = [];
    for (let j = 0; j < chunkRecords.length; j++) {
      const { id: chunkId, text: chunkText, index } = chunkRecords[j];
      vectorPoints.push({
        id: uuidv5(chunkId, CHUNK_ID_NAMESPACE),
        payload: { documentId: document.id, userId: document.userId, index, textContent: chunkText, chunkId, fileName: document.fileName },
        vector: vectors[j],
      });
      context.processing.processedChunks++;
      if (vectorPoints.length >= 10 || j === chunkRecords.length - 1) {
        await this.vectorRepository.upsertChunks(vectorPoints);
        vectorPoints.length = 0;
        await this.documentRepository.update(document.id, {
          contextJson: context,
          status: DocumentStatus.PROCESSING,
          summary: null,
          processingDate: null,
          processingError: null
        });
      }
    }

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
    const errorMessage = error instanceof Error ? error.message : 'Unknown processing error';
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


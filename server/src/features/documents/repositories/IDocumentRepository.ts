import { IDocument } from '../models/Document.model';
import type { Prisma } from 'generated/prisma';
import { DocumentContextUpdateInput, DocumentCreateInput, DocumentUpdateInput } from '../models/Document.model';

/**
 * Interface defining the data access operations for Document entities.
 */
export interface IDocumentRepository {
  /**
   * Creates a new document
   */
  create(data: DocumentCreateInput): Promise<IDocument>;

  /**
   * Finds all documents for a user with pagination
   */
  /**
   * Finds all documents for a user, returning only essential fields for lists.
   */
  findAllForUser(userId: string): Promise<{ id: string; fileName: string }[]>;

  /**
   * Finds all documents for a user with pagination
   */
  findAll(userId: string, page: number, limit: number): Promise<{
    documents: IDocument[];
    totalCount: number;
  }>;

  /**
   * Finds a document by its ID
   */
  findById(id: string, tx?: Prisma.TransactionClient): Promise<IDocument | null>;

  /**
   * Grava a correção do usuário (RAG-PR-B item 18): só `fileName`, `documentPurpose`, `summary` e `generatedContext`.
   */
  updateContext(id: string, data: DocumentContextUpdateInput, tx: Prisma.TransactionClient): Promise<IDocument>;

  /** Seam de transação (a leitura do contexto atual e a escrita da correção na mesma tx). */
  runInTransaction<T>(fn: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T>;

  /**
   * Deletes a document
   */
  delete(id: string): Promise<void>;

  /**
   * Atomically deletes a document and all of its chunks in a single SQL transaction.
   * (Vector cleanup is handled separately by the service: the vec0 lives in its own SQLite file.)
   */
  deleteWithChunks(id: string): Promise<void>;

  /**
   * Atualiza os dados de processamento de um documento
   */
  update(id: string, data: DocumentUpdateInput): Promise<IDocument>;
} 
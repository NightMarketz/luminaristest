import { Chunk } from 'generated/prisma';

/** Trecho com o dono do documento (busca e reindexação do RAG). */
export type ChunkWithOwner = { id: string; text: string; index: number; documentId: string; userId: string; fileName: string };

/**
 * Interface defining the contract for Chunk data access operations.
 */
export interface IChunkRepository {
  /**
   * Creates a new text chunk linked to a document.
   */
  create(data: { id?: string; text: string; index: number; documentId: string }): Promise<Chunk>;
  /** RAG-PR-A §8.1 (item 8): reprocessar apaga os trechos anteriores antes de recriar. Devolve os ids apagados. */
  deleteByDocument(documentId: string): Promise<string[]>;
  /** RAG-PR-A item 3: grava o carimbo do embedding nos trechos indexados. */
  setEmbeddingStamp(chunkIds: string[], stamp: string, dims: number): Promise<void>;
  /** Hidrata os acertos da busca (texto, posição, documento). */
  findByIdsWithOwner(chunkIds: string[]): Promise<ChunkWithOwner[]>;
  /** RAG-PR-A item 10: trechos sem carimbo ou com carimbo ≠ `stamp`, em ordem de id, depois de `afterId`. */
  findStale(q: { stamp: string; userId?: string; afterId?: string; limit: number }): Promise<ChunkWithOwner[]>;
  /** Trechos já com o carimbo `stamp`, em páginas por id — o reindex confere se o vetor deles existe na vec0. */
  findStamped(q: { stamp: string; userId?: string; afterId?: string; limit: number }): Promise<ChunkWithOwner[]>;
  /** RAG-PR-A item 10: donos de documentos que têm trechos (a reindexação roda por usuário, com o carimbo dele). */
  findOwnerIdsWithChunks(): Promise<string[]>;
  /** RAG-PR-A item 9 (caminho 2): quais destes ids ainda existem na Chunk. */
  findExistingIds(chunkIds: string[]): Promise<string[]>;
}

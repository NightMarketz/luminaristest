/** BE-INCR-RAG-DOCUMENTOS §2.3 — substitui o antigo `IVectorRepository` (índice externo). Vetores na `vec0` do arquivo próprio. */
export interface IChunkVectorRepository {
  upsert(rows: { chunkId: string; userId: string; stamp: string; vector: Float32Array }[]): Promise<void>;
  search(q: {
    userId: string;
    stamp: string;
    vector: Float32Array;
    documentIds?: string[];
    limit: number;
  }): Promise<{ chunkId: string; distance: number }[]>;
  deleteByDocument(documentId: string): Promise<void>;
  deleteByUser(userId: string): Promise<void>;
  /** Dos `chunkIds` pedidos, os que têm linha na vec0. */
  findPresentChunkIds(chunkIds: string[]): Promise<Set<string>>;
}

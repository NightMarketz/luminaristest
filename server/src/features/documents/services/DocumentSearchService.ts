import type { IDocumentRepository } from '../repositories/IDocumentRepository';
import type { IChunkRepository } from '../repositories/IChunkRepository';
import type { IChunkVectorRepository } from '../repositories/IChunkVectorRepository';
import type { IDocumentPolicy } from '../policies/IDocumentPolicy';
import type { IUserEmbedder } from '@/lib/embedding/UserEmbedder';
import type { DocumentSearchHit } from '../dtos/DocumentDto';
import type { UserContext } from '@/lib/authUtils';
import { ForbiddenError, NotFoundError, UnauthorizedError } from '@/lib/errors';

export type DocumentSearchResult = { hits: DocumentSearchHit[]; stamp: string };

/**
 * RAG-PR-B item 13 (BRIEF BE-INCR-RAG-DOCUMENTOS, F-RAG-2): o único caminho de busca nos documentos — rota
 * `POST /documents/search` e ferramenta `search_documents` do agente.
 *
 * Ordem: posse primeiro, embedding depois. `documentIds` com algum documento que não é do usuário (ou que não existe)
 * → `NotFoundError` (padrão cross-tenant: não revela existência) ANTES de gastar o embedding da pergunta.
 */
export class DocumentSearchService {
  constructor(
    private readonly documents: IDocumentRepository,
    private readonly chunks: IChunkRepository,
    private readonly vectors: IChunkVectorRepository,
    private readonly policy: IDocumentPolicy,
    private readonly embedder: IUserEmbedder,
  ) {}

  async search(
    user: UserContext,
    query: string,
    opts: { documentIds?: string[]; limit: number },
  ): Promise<DocumentSearchResult> {
    if (!user.userId) throw new UnauthorizedError('Authentication required');
    if (!this.policy.canListAll(user)) throw new ForbiddenError('Document search forbidden by policy');

    const documentIds = opts.documentIds?.length ? [...new Set(opts.documentIds)] : undefined;
    if (documentIds) {
      for (const id of documentIds) {
        const doc = await this.documents.findById(id);
        // Só o dono: o índice é particionado por dono, então um ADMIN não buscaria nos vetores alheios de todo jeito.
        if (!doc || doc.userId !== user.userId || !this.policy.canView(user, doc)) {
          throw new NotFoundError('Document not found');
        }
      }
    }

    const { vectors, stamp } = await this.embedder.embed(user.userId, [query]);
    const found = await this.vectors.search({ userId: user.userId, stamp, vector: vectors[0], documentIds, limit: opts.limit });
    const byId = new Map((await this.chunks.findByIdsWithOwner(found.map((h) => h.chunkId))).map((c) => [c.id, c]));

    const hits: DocumentSearchHit[] = [];
    for (const h of found) {
      const c = byId.get(h.chunkId);
      // Defesa em profundidade: a vec0 já filtra pelo dono; o SQL confere de novo.
      if (!c || c.userId !== user.userId) continue;
      hits.push({ chunkId: c.id, documentId: c.documentId, fileName: c.fileName, chunkIndex: c.index, text: c.text, score: 1 - h.distance });
    }
    return { hits, stamp };
  }
}

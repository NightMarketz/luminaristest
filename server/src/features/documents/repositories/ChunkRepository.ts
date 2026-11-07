import prisma from '../../../lib/prisma';
import type { ChunkWithOwner, IChunkRepository } from './IChunkRepository';

const WITH_OWNER = { document: { select: { userId: true, fileName: true } } } as const;

type Row = { id: string; text: string; index: number; documentId: string; document: { userId: string; fileName: string } };

function toOwner(r: Row): ChunkWithOwner {
  return { id: r.id, text: r.text, index: r.index, documentId: r.documentId, userId: r.document.userId, fileName: r.document.fileName };
}

/**
 * Repository for managing text chunks in the relational database.
 */
export class ChunkRepository implements IChunkRepository {
  /**
   * Creates a new text chunk linked to a document
   */
  async create(data: { id?: string; text: string; index: number; documentId: string }) {
    return prisma.chunk.create({ data });
  }

  async deleteByDocument(documentId: string): Promise<string[]> {
    const ids = (await prisma.chunk.findMany({ where: { documentId }, select: { id: true } })).map((c) => c.id);
    if (ids.length) await prisma.chunk.deleteMany({ where: { id: { in: ids } } });
    return ids;
  }

  async setEmbeddingStamp(chunkIds: string[], stamp: string, dims: number): Promise<void> {
    if (chunkIds.length === 0) return;
    await prisma.chunk.updateMany({
      where: { id: { in: chunkIds } },
      data: { embeddingModel: stamp, embeddingDims: dims, embeddedAt: new Date() },
    });
  }

  async findByIdsWithOwner(chunkIds: string[]): Promise<ChunkWithOwner[]> {
    if (chunkIds.length === 0) return [];
    const rows = await prisma.chunk.findMany({ where: { id: { in: chunkIds } }, include: WITH_OWNER });
    return rows.map(toOwner);
  }

  async findStale(q: { stamp: string; userId?: string; afterId?: string; limit: number }): Promise<ChunkWithOwner[]> {
    const rows = await prisma.chunk.findMany({
      where: {
        OR: [{ embeddingModel: null }, { embeddingModel: { not: q.stamp } }],
        ...(q.userId ? { document: { userId: q.userId } } : {}),
        ...(q.afterId ? { id: { gt: q.afterId } } : {}),
      },
      include: WITH_OWNER,
      orderBy: { id: 'asc' },
      take: q.limit,
    });
    return rows.map(toOwner);
  }

  async findStamped(q: { stamp: string; userId?: string; afterId?: string; limit: number }): Promise<ChunkWithOwner[]> {
    const rows = await prisma.chunk.findMany({
      where: {
        embeddingModel: q.stamp,
        ...(q.userId ? { document: { userId: q.userId } } : {}),
        ...(q.afterId ? { id: { gt: q.afterId } } : {}),
      },
      include: WITH_OWNER,
      orderBy: { id: 'asc' },
      take: q.limit,
    });
    return rows.map(toOwner);
  }

  async findOwnerIdsWithChunks(): Promise<string[]> {
    const docs = await prisma.document.findMany({ where: { chunks: { some: {} } }, select: { userId: true }, distinct: ['userId'] });
    return docs.map((d) => d.userId);
  }

  async findExistingIds(chunkIds: string[]): Promise<string[]> {
    if (chunkIds.length === 0) return [];
    return (await prisma.chunk.findMany({ where: { id: { in: chunkIds } }, select: { id: true } })).map((c) => c.id);
  }
}

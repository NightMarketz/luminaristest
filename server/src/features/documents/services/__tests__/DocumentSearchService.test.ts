/**
 * RAG-PR-B item 13 — DocumentSearchService: posse antes do embedding; acertos hidratados com fileName e índice.
 * Cenário (régua A4): Ana e Bia; "contrato-ana.pdf", "recibo-ana.pdf" e "contrato-bia.pdf". Embedding falso.
 */
import { DocumentSearchService } from '../DocumentSearchService';
import { DocumentPolicy } from '../../policies/DocumentPolicy';
import { NotFoundError, UnauthorizedError } from '@/lib/errors';
import { ctxFor } from '@test/helpers/auth';
import type { IDocument } from '../../models/Document.model';
import type { ChunkWithOwner } from '../../repositories/IChunkRepository';

const ana = ctxFor({ id: 'ana', username: 'ana' });
const docs: Record<string, Pick<IDocument, 'id' | 'userId' | 'fileName'>> = {
  'contrato-ana': { id: 'contrato-ana', userId: 'ana', fileName: 'contrato-ana.pdf' },
  'recibo-ana': { id: 'recibo-ana', userId: 'ana', fileName: 'recibo-ana.pdf' },
  'contrato-bia': { id: 'contrato-bia', userId: 'bia', fileName: 'contrato-bia.pdf' },
};
const chunks: ChunkWithOwner[] = [
  { id: 'c-ana-0', text: 'cláusula primeira', index: 0, documentId: 'contrato-ana', userId: 'ana', fileName: 'contrato-ana.pdf' },
  { id: 'c-bia-0', text: 'cláusula da bia', index: 0, documentId: 'contrato-bia', userId: 'bia', fileName: 'contrato-bia.pdf' },
];

function make(found: { chunkId: string; distance: number }[] = []) {
  const documents = { findById: jest.fn(async (id: string) => (docs[id] as IDocument) ?? null) };
  const chunkRepo = { findByIdsWithOwner: jest.fn(async (ids: string[]) => chunks.filter((c) => ids.includes(c.id))) };
  const vectors = { search: jest.fn(async () => found) };
  const embedder = {
    currentStamp: jest.fn(),
    embed: jest.fn(async () => ({ vectors: [new Float32Array(768)], stamp: 'fake:det@768', dims: 768 })),
  };
  /* eslint-disable @typescript-eslint/no-explicit-any -- fakes de colaborador */
  const service = new DocumentSearchService(documents as any, chunkRepo as any, vectors as any, new DocumentPolicy(), embedder);
  /* eslint-enable @typescript-eslint/no-explicit-any */
  return { service, embedder, vectors };
}

describe('DocumentSearchService.search (item 13)', () => {
  it('documentIds com documento de outro usuário → NotFoundError e o embedding NÃO é chamado', async () => {
    const { service, embedder, vectors } = make();
    await expect(service.search(ana, 'cláusula', { documentIds: ['contrato-ana', 'contrato-bia'], limit: 5 })).rejects.toBeInstanceOf(NotFoundError);
    expect(embedder.embed).not.toHaveBeenCalled();
    expect(vectors.search).not.toHaveBeenCalled();
  });

  it('documentId inexistente → NotFoundError (mesma resposta: não revela existência)', async () => {
    const { service, embedder } = make();
    await expect(service.search(ana, 'q', { documentIds: ['nao-existe'], limit: 5 })).rejects.toBeInstanceOf(NotFoundError);
    expect(embedder.embed).not.toHaveBeenCalled();
  });

  it('busca com os documentos do dono: filtra pelo dono e pelos ids; devolve hits e o carimbo', async () => {
    const { service, vectors } = make([{ chunkId: 'c-ana-0', distance: 0.25 }]);
    const r = await service.search(ana, 'cláusula', { documentIds: ['contrato-ana'], limit: 5 });
    expect(vectors.search).toHaveBeenCalledWith(expect.objectContaining({ userId: 'ana', stamp: 'fake:det@768', documentIds: ['contrato-ana'], limit: 5 }));
    expect(r).toEqual({
      stamp: 'fake:det@768',
      hits: [{ documentId: 'contrato-ana', fileName: 'contrato-ana.pdf', chunkIndex: 0, text: 'cláusula primeira', score: 0.75 }],
    });
  });

  it('trecho de outro dono que escape do índice não volta (defesa em profundidade)', async () => {
    const { service } = make([{ chunkId: 'c-bia-0', distance: 0 }, { chunkId: 'c-ana-0', distance: 0.5 }]);
    const r = await service.search(ana, 'cláusula', { limit: 5 });
    expect(r.hits.map((h) => h.fileName)).toEqual(['contrato-ana.pdf']);
  });

  it('sem userId → UnauthorizedError', async () => {
    const { service } = make();
    await expect(service.search({ ...ana, userId: '' }, 'q', { limit: 5 })).rejects.toBeInstanceOf(UnauthorizedError);
  });
});

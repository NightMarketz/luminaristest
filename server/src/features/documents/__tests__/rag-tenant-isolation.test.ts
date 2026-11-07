/**
 * Security regression test: RAG cross-tenant data isolation (R3)
 *
 * Verifies that ChatService.generateResponse() refuses (NotFoundError, the cross-tenant pattern of BE-INCR-RAG item 13)
 * when a user supplies documentIds that do not belong to them, and that neither the embedding nor the vector store is
 * touched in that scenario. RAG-PR-B item 15: the ChatService goes through the REAL DocumentSearchService here — only its
 * repositories, policy and embedder are fakes.
 *
 * RAG-PR-A item 7: the second block runs the real `ChunkVectorRepository` over a vec0 on a temp file of its own —
 * the other owner's chunk is the NEAREST neighbour of the query (régua A2), so the partition filter is exercised.
 */
import fs from 'fs';
import os from 'os';
import path from 'path';
import { VecIndex } from '@/lib/vector/sqliteVec';
import { ChunkVectorRepository } from '../repositories/ChunkVectorRepository';

import { ChatService } from '@/features/chat/services/ChatService';
import { DocumentSearchService } from '../services/DocumentSearchService';
import { NotFoundError } from '@/lib/errors';

jest.mock('@/lib/logger', () => ({
  __esModule: true,
  default: { info: jest.fn(), debug: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

/* eslint-disable @typescript-eslint/no-explicit-any -- fakes de colaborador */
const DOCS: Record<string, { id: string; userId: string }> = {
  'doc-A': { id: 'doc-A', userId: 'user-A' },
  'doc-owned': { id: 'doc-owned', userId: 'user-A' },
  'doc-B': { id: 'doc-B', userId: 'user-B' },
};

function build() {
  const embedder = {
    currentStamp: jest.fn().mockResolvedValue('fake:det@768'),
    embed: jest.fn().mockResolvedValue({ vectors: [new Float32Array(768)], stamp: 'fake:det@768', dims: 768 }),
  };
  const vectors = { search: jest.fn().mockResolvedValue([]) };
  const documents = { findById: jest.fn(async (id: string) => DOCS[id] ?? null) };
  const chunks = { findByIdsWithOwner: jest.fn().mockResolvedValue([]) };
  const policy = { canListAll: () => true, canView: () => true };
  const search = new DocumentSearchService(documents as any, chunks as any, vectors as any, policy as any, embedder as any);
  const openai = { getChatCompletion: jest.fn(), getChatCompletionWithToolsAndHistory: jest.fn() };
  const agent = { getTools: jest.fn().mockResolvedValue([]), executeProposal: jest.fn(), handleToolCall: jest.fn(), getProposal: jest.fn() };
  const chat = new ChatService(
    search, openai as any, agent as any, { getGraphPrompt: jest.fn().mockResolvedValue('') } as any,
    { createMessage: jest.fn(), appendAssistantMessage: jest.fn() } as any,
  );
  return { chat, embedder, vectors, openai };
}

const as = (id: string) => ({ id, userId: id, email: `${id}@example.com` }) as any;
/* eslint-enable @typescript-eslint/no-explicit-any */

describe('RAG cross-tenant data isolation (R3)', () => {
  it('user-B asking for a document owned by user-A → NotFoundError; no embedding, no vector search, no LLM', async () => {
    const { chat, embedder, vectors, openai } = build();

    await expect(
      chat.generateResponse({ query: 'What is in doc-A?', documentIds: ['doc-A'], history: [], user: as('user-B') }),
    ).rejects.toThrow(NotFoundError);

    expect(embedder.embed).not.toHaveBeenCalled();
    expect(vectors.search).not.toHaveBeenCalled();
    expect(openai.getChatCompletion).not.toHaveBeenCalled();
  });

  it('a documentId that does not exist is refused the same way (does not reveal existence)', async () => {
    const { chat, vectors } = build();
    await expect(
      chat.generateResponse({ query: 'leak', documentIds: ['doc-X'], history: [], user: as('intruder') }),
    ).rejects.toThrow(NotFoundError);
    expect(vectors.search).not.toHaveBeenCalled();
  });

  it('does NOT throw when the user owns all requested documents; the search is scoped to the caller', async () => {
    const { chat, vectors } = build();

    const response = await chat.generateResponse({ query: 'What is in my doc?', documentIds: ['doc-A'], history: [], user: as('user-A') });

    expect(response.answer).toContain('não encontrei informações');
    expect(vectors.search).toHaveBeenCalledWith({
      userId: 'user-A', stamp: 'fake:det@768', vector: expect.any(Float32Array), documentIds: ['doc-A'], limit: 10,
    });
  });

  it('partial ownership (one own, one foreign) → NotFoundError, vector store untouched', async () => {
    const { chat, vectors } = build();
    await expect(
      chat.generateResponse({ query: 'leak', documentIds: ['doc-owned', 'doc-B'], history: [], user: as('user-A') }),
    ).rejects.toThrow(NotFoundError);
    expect(vectors.search).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// RAG-PR-A item 7 — ChunkVectorRepository over a real vec0 (own temp file)
// ---------------------------------------------------------------------------

/** Embedding falso determinístico (régua A4): 1 na posição `hot`, `tilt` na seguinte, normalizado pelo cosine. */
function vec(hot: number, tilt = 0): Float32Array {
  const a = new Float32Array(768);
  a[hot] = 1;
  if (tilt) a[hot + 1] = tilt;
  return a;
}

const STAMP = 'openai:text-embedding-3-small@768';
const OLD_STAMP = 'openai:text-embedding-3-small@1536';

describe('ChunkVectorRepository — vec0 real (cenário: Ana e Bia, 3 documentos, um da Bia)', () => {
  let dir: string;
  let index: VecIndex;
  let repo: ChunkVectorRepository;
  // documento → trechos, como a Chunk do banco principal responderia
  const chunksOf: Record<string, string[]> = {
    'doc-ana-contrato': ['ana-c1', 'ana-c2'],
    'doc-ana-recibo': ['ana-r1', 'ana-velho'],
    'doc-bia-contrato': ['bia-c1'],
  };

  beforeEach(async () => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'vec-iso-'));
    index = new VecIndex(path.join(dir, 'vectors.db'));
    repo = new ChunkVectorRepository(
      () => index.db,
      async (w) => (w.documentId ? chunksOf[w.documentId] ?? [] : (w.documentIds ?? []).flatMap((d) => chunksOf[d] ?? [])),
    );
    await repo.upsert([
      { chunkId: 'ana-c1', userId: 'ana', stamp: STAMP, vector: vec(0, 0.3) },
      { chunkId: 'ana-c2', userId: 'ana', stamp: STAMP, vector: vec(0, 0.9) },
      { chunkId: 'ana-r1', userId: 'ana', stamp: STAMP, vector: vec(10) },
      { chunkId: 'ana-velho', userId: 'ana', stamp: OLD_STAMP, vector: vec(0) },
      // vizinho mais próximo da consulta é da Bia (A2)
      { chunkId: 'bia-c1', userId: 'bia', stamp: STAMP, vector: vec(0) },
    ]);
  });

  afterEach(() => {
    index.close();
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it('busca da Ana nunca devolve o trecho da Bia, mesmo sendo o mais próximo; ordem por distância', async () => {
    const hits = await repo.search({ userId: 'ana', stamp: STAMP, vector: vec(0), limit: 10 });
    expect(hits.map((h) => h.chunkId)).toEqual(['ana-c1', 'ana-c2', 'ana-r1']);
    expect(hits[0].distance).toBeLessThan(hits[1].distance);
    expect(hits[1].distance).toBeLessThan(hits[2].distance);
  });

  it('trecho com carimbo antigo não aparece', async () => {
    const hits = await repo.search({ userId: 'ana', stamp: STAMP, vector: vec(0), limit: 10 });
    expect(hits.map((h) => h.chunkId)).not.toContain('ana-velho');
  });

  it('documentIds restringe aos trechos desses documentos; documento da Bia pedido pela Ana não vaza', async () => {
    const hits = await repo.search({ userId: 'ana', stamp: STAMP, vector: vec(0), documentIds: ['doc-ana-recibo', 'doc-bia-contrato'], limit: 10 });
    expect(hits.map((h) => h.chunkId)).toEqual(['ana-r1']);
  });

  it('upsert do mesmo chunk substitui o vetor (não duplica)', async () => {
    await repo.upsert([{ chunkId: 'ana-r1', userId: 'ana', stamp: STAMP, vector: vec(0) }]);
    const hits = await repo.search({ userId: 'ana', stamp: STAMP, vector: vec(0), limit: 10 });
    expect(hits.map((h) => h.chunkId)).toEqual(['ana-r1', 'ana-c1', 'ana-c2']);
  });

  it('deleteByDocument e deleteByUser apagam só o que é deles', async () => {
    await repo.deleteByDocument('doc-ana-contrato');
    expect((await repo.search({ userId: 'ana', stamp: STAMP, vector: vec(0), limit: 10 })).map((h) => h.chunkId)).toEqual(['ana-r1']);
    await repo.deleteByUser('ana');
    expect(await repo.search({ userId: 'ana', stamp: STAMP, vector: vec(0), limit: 10 })).toEqual([]);
    expect(await repo.listChunkIds(null, 10)).toEqual(['bia-c1']);
  });
});

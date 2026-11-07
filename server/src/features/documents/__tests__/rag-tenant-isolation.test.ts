/**
 * Security regression test: RAG cross-tenant data isolation (R3)
 *
 * Verifies that ChatService.generateResponse() throws ForbiddenError when a
 * user supplies documentIds that do not belong to them, and that the vector
 * store is never queried in that scenario.
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
import { ForbiddenError } from '@/lib/errors';

// ---------------------------------------------------------------------------
// Mock prisma BEFORE importing ChatService so the module picks up the mock
// ---------------------------------------------------------------------------
jest.mock('@/lib/prisma', () => ({
  __esModule: true,
  default: {
    document: {
      findMany: jest.fn(),
    },
    chunk: {
      findMany: jest.fn().mockResolvedValue([]),
    },
  },
}));

// We also need to prevent the real OpenAI / monitoring from being
// initialised during the test.
jest.mock('@/lib/logger', () => ({
  __esModule: true,
  default: {
    info: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

jest.mock('@/lib/monitoring', () => ({
  metrics: {
    startTimer: jest.fn(() => jest.fn()),
  },
}));

// ---------------------------------------------------------------------------
// Import the mocked prisma so we can configure return values per test
// ---------------------------------------------------------------------------
import prisma from '@/lib/prisma';
const mockPrisma = prisma as jest.Mocked<typeof prisma>;

// ---------------------------------------------------------------------------
// Build minimal stubs for ChatService constructor dependencies
// ---------------------------------------------------------------------------
const mockEmbedder = {
  currentStamp: jest.fn().mockResolvedValue('fake:det@768'),
  embed: jest.fn().mockResolvedValue({ vectors: [new Float32Array(768)], stamp: 'fake:det@768', dims: 768 }),
};

const mockVectorRepository = {
  search: jest.fn(),
  upsert: jest.fn(),
  deleteByDocument: jest.fn(),
  deleteByUser: jest.fn(),
};

const mockOpenAIService = {
  getChatCompletion: jest.fn(),
  getChatCompletionWithHistory: jest.fn(),
  getChatCompletionWithToolsAndHistory: jest.fn(),
};

const mockAgentService = {
  getTools: jest.fn().mockResolvedValue([]),
  executeProposal: jest.fn(),
  handleToolCall: jest.fn(),
  getProposal: jest.fn(),
};

const mockKnowledgeGraphService = {
  getGraphPrompt: jest.fn().mockResolvedValue(''),
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function buildChatService(): ChatService {
  return new ChatService(
    mockEmbedder as any,
    mockVectorRepository as any,
    mockOpenAIService as any,
    mockAgentService as any,
    mockKnowledgeGraphService as any,
    { createMessage: jest.fn(), appendAssistantMessage: jest.fn() } as any,
  );
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('RAG cross-tenant data isolation (R3)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('throws ForbiddenError when user-B requests a document owned by user-A', async () => {
    const docA = 'doc-A';
    const userA = 'user-A';
    const userB = 'user-B';

    // Prisma returns 0 rows because doc-A does NOT belong to user-B.
    (mockPrisma.document.findMany as jest.Mock).mockResolvedValue([]);

    const service = buildChatService();

    await expect(
      service.generateResponse({
        query: 'What is in doc-A?',
        documentIds: [docA],
        history: [],
        user: { id: userB, email: 'userb@example.com' } as any,
      }),
    ).rejects.toThrow(ForbiddenError);

    // The vector store must NEVER be contacted when ownership check fails.
    expect(mockVectorRepository.search).not.toHaveBeenCalled();

    // The ownership query must use BOTH the documentIds and the requesting userId.
    expect(mockPrisma.document.findMany).toHaveBeenCalledWith({
      where: { id: { in: [docA] }, userId: userB },
      select: { id: true },
    });
  });

  it('throws ForbiddenError with the correct message text', async () => {
    (mockPrisma.document.findMany as jest.Mock).mockResolvedValue([]);

    const service = buildChatService();

    await expect(
      service.generateResponse({
        query: 'leak',
        documentIds: ['doc-X'],
        history: [],
        user: { id: 'intruder', email: 'intruder@evil.com' } as any,
      }),
    ).rejects.toThrow('One or more documents do not belong to this user');
  });

  it('does NOT throw when user owns all requested documents', async () => {
    const docA = 'doc-A';
    const userA = 'user-A';

    // Prisma returns the document — it belongs to user-A.
    (mockPrisma.document.findMany as jest.Mock).mockResolvedValue([{ id: docA }]);

    // Stub the vector search to return empty (no chunks to show context).
    mockVectorRepository.search.mockResolvedValue([]);

    const service = buildChatService();

    const response = await service.generateResponse({
      query: 'What is in my doc?',
      documentIds: [docA],
      history: [],
      user: { id: userA, email: 'usera@example.com' } as any,
    });

    // Should not throw and should reach the "no results" branch.
    expect(response.answer).toContain('não encontrei informações');
    // Vector store WAS called — ownership passed.
    expect(mockVectorRepository.search).toHaveBeenCalledWith({
      userId: userA,
      stamp: 'fake:det@768',
      vector: expect.any(Float32Array),
      documentIds: [docA],
      limit: 10,
    });
  });

  it('throws ForbiddenError when only some documentIds belong to the user (partial ownership)', async () => {
    const userA = 'user-A';
    const docOwned = 'doc-owned';
    const docForeign = 'doc-foreign';

    // Prisma finds only 1 of the 2 requested docs for this user.
    (mockPrisma.document.findMany as jest.Mock).mockResolvedValue([{ id: docOwned }]);

    const service = buildChatService();

    await expect(
      service.generateResponse({
        query: 'leak',
        documentIds: [docOwned, docForeign],
        history: [],
        user: { id: userA, email: 'usera@example.com' } as any,
      }),
    ).rejects.toThrow(ForbiddenError);

    expect(mockVectorRepository.search).not.toHaveBeenCalled();
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

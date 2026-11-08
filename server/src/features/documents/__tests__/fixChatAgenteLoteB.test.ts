/**
 * FIX-CHAT-AGENTE lote B — testes-guarda dos achados §3.3 do ACHADOS-2026-10-19 (#9, #12, #15, #21, #23).
 * Autorização: dono, chat, 2026-10-21 ("Autorizo instrumentar e corrigir os achados de … FIX-CHAT-AGENTE (§3.3)")
 * e 2026-10-22 ("Todos os 22 em série").
 *
 * Cada `it` afirma o comportamento correto; antes do fix falha na asserção final.
 * Lote D (dono, 2026-10-29): o guarda do #21 saiu com o `ExcelStructuredExtractor` (R26 aposentado).
 * RAG-PR-A: o guarda do #12 (índice de userId no índice externo) virou a PARTITION KEY `user_id` da vec0,
 * guardada em `rag-tenant-isolation.test.ts`.
 */
import express from 'express';
import request from 'supertest';
import type { Request, Response, NextFunction } from 'express';

jest.mock('@/controllers/documentsController', () => {
  const ok = (_req: Request, res: Response) => res.status(200).json({ success: true });
  const pass = (_req: Request, _res: Response, next: NextFunction) => next();
  return {
  listDocuments: ok, listDocumentNames: ok, getDocumentById: ok, deleteDocument: ok, searchDocuments: ok,
  uploadDocument: ok, updateDocument: ok, uploadMiddleware: pass, 
  tokenCostUpload: pass, computeTokenCost: ok,
  };
});

import documentRoutes from '@/routes/documents';
import { EmbeddingService } from '@/lib/vector/embedding';

describe('#9 — rotas de documentos que chamam a OpenAI têm freio por usuário', () => {
  it.each(['/upload', '/search', '/token-cost'])('POST %s: a 21ª chamada do mesmo usuário no minuto recebe 429', async (path) => {
    const app = express();
    app.use(express.json());
    app.use('/api/documents', documentRoutes);

    let last = 0;
    for (let i = 0; i < 21; i++) {
      last = (await request(app).post(`/api/documents${path}`).set('x-user-id', `u-${path}`).send({})).status;
    }

    expect(last).toBe(429);
  });
});

describe('#23 — embeddings em lotes', () => {
  it('250 textos saem em requests de no máximo 100 entradas, na ordem', async () => {
    const svc = new EmbeddingService({ apiKey: 'ci-dummy-openai-key', expectedDimension: 2 });
    const create = jest.fn(async ({ input }: { input: string[] }) => ({ data: input.map((t, index) => ({ index, embedding: [Number(t), 0] })) }));
    (svc as unknown as { client: unknown }).client = { embeddings: { create } };
    const texts = Array.from({ length: 250 }, (_, i) => String(i));

    const vectors = await svc.embedTexts(texts);

    expect(create.mock.calls.map(([arg]) => arg.input.length)).toEqual([100, 100, 50]);
    expect(vectors.map((v) => v[0])).toEqual(texts.map(Number));
  });
});

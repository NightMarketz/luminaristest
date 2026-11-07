/**
 * ERRO-CRU-AO-CLIENTE (GAP-MAP, dono 2026-11-04) — `processingError` e `contextJson.errors[].message` saem no
 * `DocumentDto`. Erro que não é nosso (provedor de embedding, banco) fica só no log: o texto interno não pode
 * chegar ao cliente. Com a chave da instância de reserva (F-RAG-5b), o 401 do provedor ecoaria parte da chave.
 */
import { DocumentProcessingPipeline } from '../services/DocumentProcessingPipeline';
import { DocumentStatus, type IDocument } from '../models/Document.model';
import type { IChunkRepository } from '../repositories/IChunkRepository';
import type { IChunkVectorRepository } from '../repositories/IChunkVectorRepository';
import type { IUserEmbedder } from '@/lib/embedding/UserEmbedder';
import type { IDocumentRepository } from '../repositories/IDocumentRepository';
import type { IUserRepository } from '../../users/repositories/IUserRepository';
import type { DocumentProcessingService } from '../services/DocumentProcessingService';

const INTERNO = '401 Incorrect API key provided: sk-proj-****abcd. You can find your API key at https://platform.openai.com';

function build(embeddingError: Error) {
  const updates: Array<Record<string, unknown>> = [];
  const documentRepository = {
    update: jest.fn(async (_id: string, data: Record<string, unknown>) => {
      updates.push(data);
      return {};
    }),
  } as unknown as IDocumentRepository;
  const chunkRepository = {
    create: jest.fn(async (d: { index: number }) => ({ id: `c${d.index}` })),
    deleteByDocument: jest.fn(async () => []),
  } as unknown as IChunkRepository;
  const vectorRepository = { upsert: jest.fn(), deleteByDocument: jest.fn() } as unknown as IChunkVectorRepository;
  const processingService = {
    chunkText: jest.fn(() => ['trecho um', 'trecho dois']),
  } as unknown as DocumentProcessingService;
  const embedder = {
    embed: jest.fn(async () => {
      throw embeddingError;
    }),
  } as unknown as IUserEmbedder;
  const userRepository = { getUserById: jest.fn(async () => ({ id: 'u1' })) } as unknown as IUserRepository;
  const pipeline = new DocumentProcessingPipeline(
    chunkRepository,
    vectorRepository,
    processingService,
    documentRepository,
    userRepository,
    embedder,
  );
  return { pipeline, updates };
}

const doc = { id: 'd1', userId: 'u1', fileName: 'a.pdf' } as unknown as IDocument;

describe('DocumentProcessingPipeline — erro cru não chega ao cliente', () => {
  it('falha do provedor de embedding ⇒ processingError e contextJson.errors sem o texto do provedor', async () => {
    const { pipeline, updates } = build(new Error(INTERNO));
    await pipeline.processDocument(doc, 'texto qualquer');

    const final = updates[updates.length - 1];
    expect(final.status).toBe(DocumentStatus.ERROR);
    const publico = JSON.stringify({ processingError: final.processingError, errors: (final.contextJson as { errors?: unknown }).errors });
    expect(publico).not.toContain('sk-proj');
    expect(publico).not.toContain('Incorrect API key');
  });
});

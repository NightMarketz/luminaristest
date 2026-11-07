/**
 * RAG-PR-A itens 8, 9 e 10 contra a pilha real: Prisma no banco de teste + `ChunkVectorRepository` na vec0 do arquivo
 * de vetores DESTE arquivo de teste (VECTOR_DB_PATH próprio, test/jest.setupEnv.ts). Só o embedding é falso, e
 * determinístico (régua A4): o vetor sai do texto.
 *
 * Cenário: Ana e Bia, três documentos — "contrato-ana.pdf" (3 trechos), "recibo-ana.pdf" e "contrato-bia.pdf".
 */
import prisma from '@/lib/prisma';
import { getVecIndex } from '@/lib/vector/sqliteVec';
import { pushTestSchema, resetDb, disconnectDb, seedUser, seedDocument, ctxFor } from '@test/helpers';
import { Role } from '../../users/models/User.model';
import { UserService } from '../../users/services/UserService';
import { UserRepository } from '../../users/repositories/UserRepository';
import { UserPolicy } from '../../users/policies/UserPolicy';
import { ChunkRepository } from '../repositories/ChunkRepository';
import { ChunkVectorRepository } from '../repositories/ChunkVectorRepository';
import { DocumentRepository } from '../repositories/DocumentRepository';
import { DocumentPolicy } from '../policies/DocumentPolicy';
import { DocumentService } from '../services/DocumentService';
import { DocumentProcessingPipeline } from '../services/DocumentProcessingPipeline';
import { ChunkReindexService } from '../services/ChunkReindexService';
import { DocumentStatus, type IDocument } from '../models/Document.model';
import type { DocumentProcessingService } from '../services/DocumentProcessingService';
import type { IUserEmbedder } from '@/lib/embedding/UserEmbedder';

const DIMS = 768;

/** Vetor determinístico: posição = soma dos códigos do texto mod 768. */
function vectorOf(text: string, dims = DIMS): Float32Array {
  const v = new Float32Array(dims);
  let h = 0;
  for (const ch of text) h = (h + ch.charCodeAt(0)) % DIMS;
  v[h % dims] = 1;
  return v;
}

class FakeEmbedder implements IUserEmbedder {
  stamp = 'fake:det@768';
  badDimsFor: string | null = null;
  async currentStamp(): Promise<string> {
    return this.stamp;
  }
  async embed(_userId: string, texts: string[]) {
    return { vectors: texts.map((t) => vectorOf(t, t === this.badDimsFor ? DIMS - 1 : DIMS)), stamp: this.stamp, dims: DIMS };
  }
}

const TRECHOS = ['cláusula primeira do contrato', 'cláusula segunda do contrato', 'assinaturas das partes'];

const chunkRepo = new ChunkRepository();
const vectors = new ChunkVectorRepository(() => getVecIndex().db);
const documentRepo = new DocumentRepository();
const userRepo = new UserRepository();
const processing = { chunkText: () => TRECHOS } as unknown as DocumentProcessingService;
let embedder: FakeEmbedder;

const pipeline = () => new DocumentProcessingPipeline(chunkRepo, vectors, processing, documentRepo, userRepo, embedder);
const vecRows = () => vectors.listChunkIds(null, 1000);
const asDoc = async (id: string) => (await documentRepo.findById(id)) as IDocument;

beforeAll(() => {
  pushTestSchema();
}, 120000);

beforeEach(() => {
  embedder = new FakeEmbedder();
  getVecIndex().db.exec('DELETE FROM chunk_vec');
});

afterEach(async () => {
  await resetDb();
});

afterAll(async () => {
  getVecIndex().close();
  await disconnectDb();
});

async function cenario() {
  const ana = await seedUser({ username: 'ana' });
  const bia = await seedUser({ username: 'bia' });
  const contratoAna = await seedDocument({ userId: ana.id, fileName: 'contrato-ana.pdf' });
  const reciboAna = await seedDocument({ userId: ana.id, fileName: 'recibo-ana.pdf' });
  const contratoBia = await seedDocument({ userId: bia.id, fileName: 'contrato-bia.pdf' });
  return { ana, bia, contratoAna, reciboAna, contratoBia };
}

describe('item 8 — pipeline grava o vetor na vec0 e o carimbo na Chunk', () => {
  it('documento de 3 trechos ⇒ 3 linhas na vec0, carimbo nas 3 Chunk, COMPLETED', async () => {
    const { contratoAna } = await cenario();
    await pipeline().processDocument(await asDoc(contratoAna.id), TRECHOS.join(' '));

    const chunks = await prisma.chunk.findMany({ where: { documentId: contratoAna.id }, orderBy: { index: 'asc' } });
    expect(chunks.map((c) => c.text)).toEqual(TRECHOS);
    expect(chunks.every((c) => c.embeddingModel === 'fake:det@768' && c.embeddingDims === 768 && c.embeddedAt instanceof Date)).toBe(true);
    expect((await vecRows()).sort()).toEqual(chunks.map((c) => c.id).sort());
    expect((await asDoc(contratoAna.id)).status).toBe(DocumentStatus.COMPLETED);
  });

  it('reprocessar o mesmo documento deixa N Chunk e N linhas na vec0, não 2N', async () => {
    const { contratoAna } = await cenario();
    await pipeline().processDocument(await asDoc(contratoAna.id), 'x');
    await pipeline().processDocument(await asDoc(contratoAna.id), 'x');

    const chunkIds = (await prisma.chunk.findMany({ where: { documentId: contratoAna.id } })).map((c) => c.id);
    expect(chunkIds).toHaveLength(3);
    expect((await vecRows()).sort()).toEqual(chunkIds.sort());
  });

  it('falha no meio do lote de vetores não deixa vetor com o carimbo atual visível na busca', async () => {
    const { ana, contratoAna } = await cenario();
    embedder.badDimsFor = TRECHOS[1]; // o 2º vetor do lote tem 767 posições: a vec0 recusa no meio
    await pipeline().processDocument(await asDoc(contratoAna.id), 'x');

    expect((await asDoc(contratoAna.id)).status).toBe(DocumentStatus.ERROR);
    expect(await vecRows()).toEqual([]);
    expect(await vectors.search({ userId: ana.id, stamp: embedder.stamp, vector: vectorOf(TRECHOS[0]), limit: 10 })).toEqual([]);
  });
});

describe('item 9 — exclusão (caminho 2: vetor antes do SQL)', () => {
  it('excluir a Ana zera os vetores dela (LGPD art. 18 VI) e mantém os da Bia', async () => {
    const { ana, contratoAna, reciboAna, contratoBia } = await cenario();
    for (const d of [contratoAna, reciboAna, contratoBia]) await pipeline().processDocument(await asDoc(d.id), 'x');
    expect(await vecRows()).toHaveLength(9);

    await seedUser({ username: 'root', role: Role.ADMIN });
    const users = new UserService(userRepo, new UserPolicy(), vectors);
    await users.deleteUser(ana.id, ctxFor({ id: 'admin-x', username: 'root2', role: Role.ADMIN }));

    const biaChunks = (await prisma.chunk.findMany({ where: { documentId: contratoBia.id } })).map((c) => c.id);
    expect((await vecRows()).sort()).toEqual(biaChunks.sort());
    expect(await vectors.search({ userId: ana.id, stamp: embedder.stamp, vector: vectorOf(TRECHOS[0]), limit: 10 })).toEqual([]);
  });

  it('excluir o documento apaga os vetores dele e só os dele', async () => {
    const { ana, contratoAna, reciboAna } = await cenario();
    await pipeline().processDocument(await asDoc(contratoAna.id), 'x');
    await pipeline().processDocument(await asDoc(reciboAna.id), 'x');
    const reciboChunks = (await prisma.chunk.findMany({ where: { documentId: reciboAna.id } })).map((c) => c.id);

    const docs = new DocumentService(documentRepo, chunkRepo, vectors, processing, new DocumentPolicy(), userRepo, embedder);
    await docs.deleteDocument(contratoAna.id, ctxFor({ id: ana.id, username: 'ana' }));

    expect((await vecRows()).sort()).toEqual(reciboChunks.sort());
  });
});

describe('item 10 — reindexação', () => {
  it('trocar o modelo ⇒ a busca não vê nada ⇒ reindexar ⇒ a busca volta', async () => {
    const { ana, contratoAna } = await cenario();
    await pipeline().processDocument(await asDoc(contratoAna.id), 'x');
    const query = vectorOf(TRECHOS[2]);
    expect(await vectors.search({ userId: ana.id, stamp: embedder.stamp, vector: query, limit: 1 })).toHaveLength(1);

    embedder.stamp = 'fake:det-v2@768';
    expect(await vectors.search({ userId: ana.id, stamp: embedder.stamp, vector: query, limit: 10 })).toEqual([]);

    const summary = await new ChunkReindexService(chunkRepo, vectors, embedder).reindex();

    expect(summary).toEqual({ users: 1, reindexed: 3 });
    const hits = await vectors.search({ userId: ana.id, stamp: embedder.stamp, vector: query, limit: 1 });
    const top = await prisma.chunk.findUnique({ where: { id: hits[0].chunkId } });
    expect(top?.text).toBe(TRECHOS[2]);
    expect(top?.embeddingModel).toBe('fake:det-v2@768');
  });

  it('arquivo de vetores perdido com a Chunk carimbada ⇒ reindexar reconstrói (achado 2 da revisão do #1121)', async () => {
    const { ana, contratoAna } = await cenario();
    await pipeline().processDocument(await asDoc(contratoAna.id), 'x');
    getVecIndex().db.exec('DELETE FROM chunk_vec');
    const query = vectorOf(TRECHOS[2]);
    expect(await vectors.search({ userId: ana.id, stamp: embedder.stamp, vector: query, limit: 10 })).toEqual([]);

    const summary = await new ChunkReindexService(chunkRepo, vectors, embedder).reindex();

    expect(summary).toEqual({ users: 1, reindexed: 3 });
    expect((await vecRows()).length).toBe(3);
    const again = await new ChunkReindexService(chunkRepo, vectors, embedder).reindex();
    expect(again).toEqual({ users: 1, reindexed: 0 });
  });

  it('vec0 restaurada com o carimbo antigo e a Chunk com o atual ⇒ reindexar refaz (ressalva da r2 do #1121)', async () => {
    const { ana, contratoAna } = await cenario();
    await pipeline().processDocument(await asDoc(contratoAna.id), 'x');
    const chunks = await prisma.chunk.findMany({ where: { documentId: contratoAna.id } });
    await vectors.upsert(chunks.map((c) => ({ chunkId: c.id, userId: ana.id, stamp: 'fake:antigo@768', vector: vectorOf(c.text) })));
    const query = vectorOf(TRECHOS[2]);
    expect(await vectors.search({ userId: ana.id, stamp: embedder.stamp, vector: query, limit: 10 })).toEqual([]);

    const summary = await new ChunkReindexService(chunkRepo, vectors, embedder).reindex();

    expect(summary).toEqual({ users: 1, reindexed: 3 });
    expect((await vecRows()).length).toBe(3);
    expect((await vectors.search({ userId: ana.id, stamp: embedder.stamp, vector: query, limit: 10 })).length).toBe(3);
    expect(await new ChunkReindexService(chunkRepo, vectors, embedder).reindex()).toEqual({ users: 1, reindexed: 0 });
  });

  it('trechos sem carimbo (vindos do índice antigo) ganham vetor; --user restringe ao dono', async () => {
    const { ana, bia, contratoAna, contratoBia } = await cenario();
    await prisma.chunk.create({ data: { text: 'trecho antigo da ana', index: 0, documentId: contratoAna.id } });
    await prisma.chunk.create({ data: { text: 'trecho antigo da bia', index: 0, documentId: contratoBia.id } });

    const summary = await new ChunkReindexService(chunkRepo, vectors, embedder).reindex({ userId: ana.id });

    expect(summary).toEqual({ users: 1, reindexed: 1 });
    expect(await vectors.search({ userId: ana.id, stamp: embedder.stamp, vector: vectorOf('trecho antigo da ana'), limit: 10 })).toHaveLength(1);
    expect(await vectors.search({ userId: bia.id, stamp: embedder.stamp, vector: vectorOf('trecho antigo da bia'), limit: 10 })).toEqual([]);
  });
});

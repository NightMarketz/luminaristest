/**
 * RAG-PR-B itens 13, 14 e 16 contra a pilha real (régua A6): app Express real (supertest) e o agente da factory,
 * sobre o MESMO banco de teste e a MESMA vec0 (VECTOR_DB_PATH deste arquivo). Só o embedding é falso e determinístico
 * (régua A4): o vetor sai do texto, espionado no UserEmbedder da factory.
 *
 * Cenário: Ana e Bia, três documentos — "contrato-ana.pdf", "recibo-ana.pdf" e "contrato-bia.pdf". O trecho da Bia é
 * o vizinho MAIS PRÓXIMO da pergunta (régua A2): sem o filtro por dono ele seria o 1º acerto.
 */
import request from 'supertest';
import prisma from '@/lib/prisma';
import { getFactory } from '@/lib/factory';
import { getVecIndex } from '@/lib/vector/sqliteVec';
import { makeApp, pushTestSchema, resetDb, disconnectDb, seedUser, seedDocument, authHeader, ctxFor } from '@test/helpers';
import { ChunkVectorRepository } from '../repositories/ChunkVectorRepository';

const STAMP = 'fake:det@768';
const PERGUNTA = 'qual a multa rescisória';

/** Vetor determinístico de uma posição quente; `near` desloca de leve para ordenar o KNN. */
function vec(hot: number, near = 0): Float32Array {
  const v = new Float32Array(768);
  v[hot] = 1;
  if (near) v[(hot + 1) % 768] = near;
  return v;
}

let app: ReturnType<typeof makeApp>;
const vectors = new ChunkVectorRepository(() => getVecIndex().db);

beforeAll(() => {
  pushTestSchema();
  app = makeApp();
}, 120000);

beforeEach(() => {
  getVecIndex().db.exec('DELETE FROM chunk_vec');
  jest
    .spyOn(getFactory().getUserEmbedder(), 'embed')
    .mockImplementation(async (_u: string, texts: string[]) => ({ vectors: texts.map(() => vec(7)), stamp: STAMP, dims: 768 }));
});

afterEach(async () => {
  jest.restoreAllMocks();
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
  const cAna = await prisma.chunk.create({ data: { text: 'multa de 10% na rescisão', index: 2, documentId: contratoAna.id } });
  const cRecibo = await prisma.chunk.create({ data: { text: 'recibo de pagamento', index: 0, documentId: reciboAna.id } });
  const cBia = await prisma.chunk.create({ data: { text: 'multa da bia', index: 0, documentId: contratoBia.id } });
  await vectors.upsert([
    { chunkId: cBia.id, userId: bia.id, stamp: STAMP, vector: vec(7) }, // o mais próximo da pergunta
    { chunkId: cAna.id, userId: ana.id, stamp: STAMP, vector: vec(7, 0.2) },
    { chunkId: cRecibo.id, userId: ana.id, stamp: STAMP, vector: vec(7, 0.9) },
  ]);
  return { ana, bia, contratoAna, reciboAna, contratoBia };
}

describe('POST /api/documents/search (item 14)', () => {
  it('200 com os acertos da Ana, ordenados, e nada da Bia (vizinha mais próxima)', async () => {
    const { ana } = await cenario();
    const r = await request(app).post('/api/documents/search').set(authHeader({ id: ana.id, username: ana.username })).send({ query: PERGUNTA, limit: 10 });
    expect(r.status).toBe(200);
    expect(r.body.data.stamp).toBe(STAMP);
    expect(r.body.data.hits.map((h: { fileName: string; chunkIndex: number }) => [h.fileName, h.chunkIndex])).toEqual([
      ['contrato-ana.pdf', 2],
      ['recibo-ana.pdf', 0],
    ]);
  });

  it('documentIds restringe a busca aos documentos dados', async () => {
    const { ana, reciboAna } = await cenario();
    const r = await request(app).post('/api/documents/search').set(authHeader({ id: ana.id, username: ana.username })).send({ query: PERGUNTA, documentIds: [reciboAna.id] });
    expect(r.status).toBe(200);
    expect(r.body.data.hits.map((h: { fileName: string }) => h.fileName)).toEqual(['recibo-ana.pdf']);
  });

  it('documentIds com o documento da Bia → 404, sem embedding', async () => {
    const { ana, contratoBia } = await cenario();
    const embed = getFactory().getUserEmbedder().embed as jest.Mock;
    const r = await request(app).post('/api/documents/search').set(authHeader({ id: ana.id, username: ana.username })).send({ query: PERGUNTA, documentIds: [contratoBia.id] });
    expect(r.status).toBe(404);
    expect(embed).not.toHaveBeenCalled();
  });

  it('chave extra no corpo → 400 (.strict())', async () => {
    const { ana, bia } = await cenario();
    const r = await request(app).post('/api/documents/search').set(authHeader({ id: ana.id, username: ana.username })).send({ query: PERGUNTA, userId: bia.id });
    expect(r.status).toBe(400);
  });
});

describe('ferramenta search_documents do agente (item 16) — mesmo banco', () => {
  it('a Bia busca pela ferramenta e só vê o trecho dela; o resultado relido traz fileName e índice', async () => {
    const { bia } = await cenario();
    const out = (await getFactory()
      .getLuminarisAgentService()
      .handleToolCall(ctxFor({ id: bia.id, username: 'bia' }), 'search_documents', { query: PERGUNTA })) as { returned: number; results: string };
    expect(out.returned).toBe(1);
    expect(out.results).toContain('"fileName":"contrato-bia.pdf"');
    expect(out.results).toContain('"chunkIndex":0');
    expect(out.results).not.toContain('contrato-ana.pdf');
  });
});

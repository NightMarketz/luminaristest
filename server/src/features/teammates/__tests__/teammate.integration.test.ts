/**
 * BE-INCR-TEAMMATES PR-2, itens 10–13 — /api/teammates pela pilha real (makeApp + authHeader + SQLite; régua A6, com 2ª
 * leitura). Cenário: dono com 2 teammates de alçadas diferentes; outro tenant com servidor MCP próprio.
 */
import request from 'supertest';
import { randomBytes } from 'node:crypto';
import prisma from '@/lib/prisma';
import { makeApp, pushTestSchema, authHeader, resetDb } from '@test/helpers';

const app = makeApp();

const criarUsuario = (username: string) =>
  prisma.user.create({ data: { name: username, username, email: `${username}@test.local`, password: 'x', role: 'USER' } });

const conciliador = {
  name: 'Conciliador',
  role: 'Conciliação bancária',
  playbook: 'Concilie o extrato.',
  allowedTools: ['query_table_data', 'request_record_creation'],
  provider: 'anthropic',
  model: 'claude-x',
  fallbackProvider: 'openai',
  fallbackModel: 'gpt-x',
};

describe('/api/teammates — CRUD (itens 10–13)', () => {
  let dono: { id: string; username: string };
  let outro: { id: string; username: string };
  let mcpDoDono: string;
  let mcpDoOutro: string;

  beforeAll(async () => {
    pushTestSchema();
    await resetDb();
    dono = await criarUsuario('teammate-dono');
    outro = await criarUsuario('teammate-outro');
    mcpDoDono = (await prisma.mcpServer.create({ data: { userId: dono.id, name: 'CRM', url: 'https://mcp.exemplo.com' } })).id;
    mcpDoOutro = (await prisma.mcpServer.create({ data: { userId: outro.id, name: 'Alheio', url: 'https://mcp.alheio.com' } })).id;
    process.env.LLM_CREDENTIAL_KEYS = `1:${randomBytes(32).toString('base64')}`;
    process.env.LLM_CREDENTIAL_KEY_ACTIVE = '1';
  }, 120000);

  afterAll(async () => {
    delete process.env.LLM_CREDENTIAL_KEYS;
    delete process.env.LLM_CREDENTIAL_KEY_ACTIVE;
    await prisma.$disconnect();
  });

  it('sem Bearer → 401', async () => {
    expect((await request(app).get('/api/teammates')).status).toBe(401);
  });

  it('POST cria; GET /:id e GET / (2ª leitura) devolvem o mesmo teammate; a rota de credenciais segue viva', async () => {
    const post = await request(app).post('/api/teammates').set(authHeader(dono)).send(conciliador);
    expect(post.status).toBe(201);
    const id = post.body.data.id;
    const one = await request(app).get(`/api/teammates/${id}`).set(authHeader(dono));
    expect(one.status).toBe(200);
    expect(one.body.data).toMatchObject({ ...conciliador, toolOverrides: null, dailyTurnLimit: 50, status: 'ACTIVE' });
    expect(one.body.data.userId).toBeUndefined();
    const all = await request(app).get('/api/teammates').set(authHeader(dono));
    expect(all.body.data.map((t: { id: string }) => t.id)).toEqual([id]);
    expect((await request(app).get('/api/teammates/credentials').set(authHeader(dono))).status).toBe(200);
  });

  it('L-PR1-3: só fallbackProvider → 400', async () => {
    const { fallbackModel: _m, ...semModelo } = conciliador;
    expect((await request(app).post('/api/teammates').set(authHeader(dono)).send(semModelo)).status).toBe(400);
  });

  it('item 10: teammate de outro tenant → 404 em GET, PATCH e DELETE; a lista do outro vem vazia', async () => {
    const id = (await prisma.teammate.findFirstOrThrow({ where: { userId: dono.id } })).id;
    expect((await request(app).get(`/api/teammates/${id}`).set(authHeader(outro))).status).toBe(404);
    expect((await request(app).patch(`/api/teammates/${id}`).set(authHeader(outro)).send({ name: 'x' })).status).toBe(404);
    expect((await request(app).delete(`/api/teammates/${id}`).set(authHeader(outro))).status).toBe(404);
    expect((await request(app).get('/api/teammates').set(authHeader(outro))).body.data).toEqual([]);
  });

  it('item 11: marcar como LIVRE → 400 ALCADA_INVALIDA', async () => {
    const r = await request(app)
      .post('/api/teammates')
      .set(authHeader(dono))
      .send({ ...conciliador, toolOverrides: { request_record_creation: 'LIVRE' } });
    expect(r.status).toBe(400);
    expect(r.body.code).toBe('ALCADA_INVALIDA');
  });

  it('item 12: nome desconhecido e MCP de outro tenant → 400 FERRAMENTA_INVALIDA; MCP do próprio tenant entra', async () => {
    const desconhecido = await request(app).post('/api/teammates').set(authHeader(dono)).send({ ...conciliador, allowedTools: ['apagar_tudo'] });
    expect(desconhecido.status).toBe(400);
    expect(desconhecido.body.code).toBe('FERRAMENTA_INVALIDA');
    const alheio = await request(app).post('/api/teammates').set(authHeader(dono)).send({ ...conciliador, allowedTools: [`mcp:${mcpDoOutro}:buscar`] });
    expect(alheio.status).toBe(400);
    expect(alheio.body.code).toBe('FERRAMENTA_INVALIDA');
    const meu = await request(app)
      .post('/api/teammates')
      .set(authHeader(dono))
      .send({ ...conciliador, name: 'Pesquisador', allowedTools: [`mcp:${mcpDoDono}:buscar`], toolOverrides: undefined });
    expect(meu.status).toBe(201);
  });

  it('item 13: PATCH da alçada grava teammate.alcada_changed na trilha encadeada do tenant; PATCH do nome não', async () => {
    const id = (await prisma.teammate.findFirstOrThrow({ where: { userId: dono.id, name: 'Conciliador' } })).id;
    expect((await request(app).patch(`/api/teammates/${id}`).set(authHeader(dono)).send({ name: 'Conciliador' })).status).toBe(200);
    expect(await prisma.auditEvent.count({ where: { eventType: 'teammate.alcada_changed' } })).toBe(0);
    const patch = await request(app).patch(`/api/teammates/${id}`).set(authHeader(dono)).send({ toolOverrides: { query_table_data: 'PROPOSTA' } });
    expect(patch.status).toBe(200);
    expect((await request(app).get(`/api/teammates/${id}`).set(authHeader(dono))).body.data.toolOverrides).toEqual({ query_table_data: 'PROPOSTA' });
    const ev = await prisma.auditEvent.findFirstOrThrow({ where: { eventType: 'teammate.alcada_changed', targetId: id } });
    expect(ev).toMatchObject({ scopeUserId: dono.id, unitId: 'teammates' });
    expect(JSON.parse(ev.payload)).toEqual({
      teammateId: id,
      allowedTools: JSON.stringify(['query_table_data', 'request_record_creation']),
      previousAllowedTools: JSON.stringify(['query_table_data', 'request_record_creation']),
      toolOverrides: JSON.stringify({ query_table_data: 'PROPOSTA' }),
      previousToolOverrides: 'null',
    });
  });

  it('item 13: credencial criada e apagada grava llm_credential.created/deleted sem a chave', async () => {
    const KEY = 'sk-ant-api03-SEGREDO-TRILHA-77aa';
    const post = await request(app).post('/api/teammates/credentials').set(authHeader(dono)).send({ provider: 'anthropic', apiKey: KEY });
    expect(post.status).toBe(201);
    expect((await request(app).delete(`/api/teammates/credentials/${post.body.data.id}`).set(authHeader(dono))).status).toBe(200);
    const evs = await prisma.auditEvent.findMany({ where: { targetId: post.body.data.id }, orderBy: { seq: 'asc' } });
    expect(evs.map((e) => e.eventType)).toEqual(['llm_credential.created', 'llm_credential.deleted']);
    for (const e of evs) {
      expect(e.payload).not.toContain(KEY);
      expect(e.payload).not.toContain('77aa');
    }
  });

  it('DELETE é soft-delete: some do GET, a linha fica com deletedAt', async () => {
    const id = (await prisma.teammate.findFirstOrThrow({ where: { userId: dono.id, name: 'Pesquisador' } })).id;
    expect((await request(app).delete(`/api/teammates/${id}`).set(authHeader(dono))).status).toBe(200);
    expect((await request(app).get(`/api/teammates/${id}`).set(authHeader(dono))).status).toBe(404);
    expect((await prisma.teammate.findUniqueOrThrow({ where: { id } })).deletedAt).not.toBeNull();
  });
});

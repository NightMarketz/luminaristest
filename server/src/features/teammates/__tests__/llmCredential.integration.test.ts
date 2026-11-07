/**
 * BE-INCR-TEAMMATES PR-1, item 7 — /api/teammates/credentials pela pilha real (makeApp + authHeader + SQLite; régua A6,
 * com 2ª leitura). Prova: GET não contém a chave; blob copiado para outra linha não decifra; sem keyring → 503;
 * apagar e recriar o mesmo provedor não dá P2002 (rename-on-delete, ADR-INCR7 §3).
 */
import request from 'supertest';
import { randomBytes } from 'node:crypto';
import prisma from '@/lib/prisma';
import { getFactory } from '@/lib/factory';
import { makeApp, pushTestSchema, authHeader, resetDb } from '@test/helpers';

const app = makeApp();
const KEY = 'sk-ant-api03-SEGREDO-DO-TENANT-9f3a';
const KEYRING = `1:${randomBytes(32).toString('base64')}`;

const criarUsuario = (username: string) =>
  prisma.user.create({ data: { name: username, username, email: `${username}@test.local`, password: 'x', role: 'USER' } });

describe('/api/teammates/credentials — contrato HTTP (item 7)', () => {
  let dono: { id: string; username: string };
  let outro: { id: string; username: string };

  beforeAll(async () => {
    pushTestSchema();
    await resetDb();
    dono = await criarUsuario('llmcred-dono');
    outro = await criarUsuario('llmcred-outro');
  }, 120000);

  beforeEach(() => {
    process.env.LLM_CREDENTIAL_KEYS = KEYRING;
    process.env.LLM_CREDENTIAL_KEY_ACTIVE = '1';
  });

  afterAll(async () => {
    delete process.env.LLM_CREDENTIAL_KEYS;
    delete process.env.LLM_CREDENTIAL_KEY_ACTIVE;
    await prisma.$disconnect();
  });

  it('sem Bearer → 401', async () => {
    expect((await request(app).get('/api/teammates/credentials')).status).toBe(401);
    expect((await request(app).post('/api/teammates/credentials').send({ provider: 'anthropic', apiKey: KEY })).status).toBe(401);
  });

  it('sem keyring → 503 fechado e nada gravado', async () => {
    delete process.env.LLM_CREDENTIAL_KEYS;
    const r = await request(app).post('/api/teammates/credentials').set(authHeader(dono)).send({ provider: 'anthropic', apiKey: KEY });
    expect(r.status).toBe(503);
    expect(r.body.code).toBe('llm_credential_key_missing');
    expect(await prisma.llmCredential.count({ where: { userId: dono.id } })).toBe(0);
  });

  it('POST grava cifrado; o GET (2ª leitura) traz provider/last4 e nunca a chave', async () => {
    const post = await request(app)
      .post('/api/teammates/credentials')
      .set(authHeader(dono))
      .send({ provider: 'anthropic', apiKey: KEY, monthlyTokenBudget: 500000 });
    expect(post.status).toBe(201);
    expect(JSON.stringify(post.body)).not.toContain(KEY);

    const get = await request(app).get('/api/teammates/credentials').set(authHeader(dono));
    expect(get.status).toBe(200);
    expect(get.body.data).toEqual([
      { id: post.body.data.id, provider: 'anthropic', last4: '9f3a', monthlyTokenBudget: 500000, createdAt: expect.any(String) },
    ]);
    expect(JSON.stringify(get.body)).not.toContain(KEY);

    const row = await prisma.llmCredential.findUniqueOrThrow({ where: { id: post.body.data.id } });
    expect(Buffer.from(row.secret).toString('utf8')).not.toContain(KEY);
    expect(await getFactory().getLlmCredentialService().findApiKey(dono.id, 'anthropic')).toBe(KEY);
  });

  it('segundo cadastro vivo do mesmo provedor → 409', async () => {
    const r = await request(app).post('/api/teammates/credentials').set(authHeader(dono)).send({ provider: 'anthropic', apiKey: KEY });
    expect(r.status).toBe(409);
  });

  it('blob copiado para a linha de outro tenant não decifra (AAD = id)', async () => {
    const src = await prisma.llmCredential.findFirstOrThrow({ where: { userId: dono.id, provider: 'anthropic', deletedAt: null } });
    await prisma.llmCredential.create({
      data: { userId: outro.id, provider: 'anthropic', secret: src.secret, keyVersion: src.keyVersion, last4: src.last4 },
    });
    await expect(getFactory().getLlmCredentialService().findApiKey(outro.id, 'anthropic')).rejects.toThrow();
  });

  it('DELETE de credencial de outro tenant → 404; a credencial do dono segue viva', async () => {
    const mine = await prisma.llmCredential.findFirstOrThrow({ where: { userId: dono.id, deletedAt: null } });
    const r = await request(app).delete(`/api/teammates/credentials/${mine.id}`).set(authHeader(outro));
    expect(r.status).toBe(404);
    const get = await request(app).get('/api/teammates/credentials').set(authHeader(dono));
    expect(get.body.data).toHaveLength(1);
  });

  it('apagar e recriar o mesmo provedor não dá P2002; GET mostra só a nova', async () => {
    const mine = await prisma.llmCredential.findFirstOrThrow({ where: { userId: dono.id, deletedAt: null } });
    const del = await request(app).delete(`/api/teammates/credentials/${mine.id}`).set(authHeader(dono));
    expect(del.status).toBe(200);
    expect((await request(app).get('/api/teammates/credentials').set(authHeader(dono))).body.data).toEqual([]);
    expect(await getFactory().getLlmCredentialService().findApiKey(dono.id, 'anthropic')).toBeNull();

    const again = await request(app).post('/api/teammates/credentials').set(authHeader(dono)).send({ provider: 'anthropic', apiKey: `${KEY}-2` });
    expect(again.status).toBe(201);
    const get = await request(app).get('/api/teammates/credentials').set(authHeader(dono));
    expect(get.body.data.map((c: { id: string }) => c.id)).toEqual([again.body.data.id]);

    const apagada = await prisma.llmCredential.findUniqueOrThrow({ where: { id: mine.id } });
    expect(apagada.provider).toBe(`deleted:${mine.id}`);
    expect(apagada.deletedAt).not.toBeNull();
  });
});

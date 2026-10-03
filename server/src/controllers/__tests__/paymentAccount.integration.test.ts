/**
 * BE-INCR-PAYMENT-PROVIDER (nó F5) PR-1 — contrato HTTP ponta a ponta da conta de pagamento:
 * P1-2 (503 sem chave, sem efeito), P1-3 (folha, imutável), P1-4 (uma ACTIVE), P1-6 (só escrita),
 * P1-7 (credencial fora de resposta/audit/log), P1-8 (AAD = id), P1-9 (CRUD + soft-delete), P1-10 (audit).
 */
import { randomBytes } from 'node:crypto';
import request from 'supertest';
import prisma from '@/lib/prisma';
import { loadKeyring, open } from '@/lib/secretBox';
import { makeApp, pushTestSchema, authHeader } from '@test/helpers';

const app = makeApp();
const UNIT = 'unit-f5-pr1';
const BASE = '/api/payment-accounts';
const TOKEN = 'APP_USR-1234567890-FIXTURE-TOKEN-wxyz';
const SECRET = 'webhook-secret-FIXTURE-0001';

let dono: { id: string; username: string };
let outro: { id: string; username: string };
let folhaId: string;
let sinteticaId: string;
let folhaDoOutroId: string;

const body = (extra: Record<string, unknown> = {}) => ({
  unitId: UNIT,
  provider: 'MERCADO_PAGO',
  label: 'MP loja',
  glAccountId: folhaId,
  config: { provider: 'MERCADO_PAGO', credentialSource: 'OWN' },
  ...extra,
});
const create = (extra: Record<string, unknown> = {}, who = dono) =>
  request(app).post(BASE).set(authHeader(who)).send(body(extra));
const putCredential = (id: string, who = dono) =>
  request(app).put(`${BASE}/${id}/credential`).set(authHeader(who)).send({ unitId: UNIT, accessToken: TOKEN, webhookSecret: SECRET });
const patch = (id: string, b: Record<string, unknown>) =>
  request(app).patch(`${BASE}/${id}`).set(authHeader(dono)).send({ unitId: UNIT, ...b });
const eventos = (eventType: string) => prisma.auditEvent.findMany({ where: { eventType }, orderBy: { seq: 'asc' } });
const dump = (v: unknown) => JSON.stringify(v, (_k, x) => (typeof x === 'bigint' ? String(x) : x));

function withKey() {
  process.env.PAYMENT_CREDENTIAL_KEYS = `1:${randomBytes(32).toString('base64')}`;
  process.env.PAYMENT_CREDENTIAL_KEY_ACTIVE = '1';
}
function withoutKey() {
  delete process.env.PAYMENT_CREDENTIAL_KEYS;
  delete process.env.PAYMENT_CREDENTIAL_KEY_ACTIVE;
}

describe('F5 PR-1 — PaymentAccount + cifra da credencial', () => {
  const logged: string[] = [];
  const spies: jest.SpyInstance[] = [];

  beforeAll(async () => {
    pushTestSchema();
    dono = await prisma.user.create({ data: { name: 'f5', username: 'f5-dono', email: 'f5@test.local', password: 'x', role: 'USER' } });
    outro = await prisma.user.create({ data: { name: 'f5b', username: 'f5-outro', email: 'f5b@test.local', password: 'x', role: 'USER' } });
    folhaId = (await prisma.account.create({ data: { userId: dono.id, unitId: UNIT, code: '1.1.9', name: 'Saldo MP', nature: 'Asset', acceptsEntries: true } })).id;
    sinteticaId = (await prisma.account.create({ data: { userId: dono.id, unitId: UNIT, code: '1.1', name: 'Circulante', nature: 'Asset', acceptsEntries: false } })).id;
    folhaDoOutroId = (await prisma.account.create({ data: { userId: outro.id, unitId: UNIT, code: '1.1.9', name: 'Saldo MP', nature: 'Asset', acceptsEntries: true } })).id;
    for (const m of ['log', 'info', 'warn', 'error', 'debug'] as const) {
      spies.push(jest.spyOn(console, m).mockImplementation((...args: unknown[]) => { logged.push(dump(args)); }));
    }
  }, 120000);

  afterAll(async () => {
    spies.forEach((s) => s.mockRestore());
    withoutKey();
    await prisma.$disconnect();
  });

  let a1: string;
  let a2: string;

  it('POST cria DRAFT sem credencial; conta não-folha ou de outro escopo ⇒ 400 (P1-3)', async () => {
    const r = await create();
    expect(r.status).toBe(201);
    expect(r.body.data).toMatchObject({ status: 'DRAFT', glAccountId: folhaId, credentialSetAt: null, accessTokenLast4: null, credentialExpiresAt: null });
    expect(r.body.data.config).toEqual({ provider: 'MERCADO_PAGO', credentialSource: 'OWN' });
    a1 = r.body.data.id;
    expect((await create({ glAccountId: sinteticaId })).status).toBe(400);
    expect((await create({ glAccountId: folhaDoOutroId })).status).toBe(400);
    const oauth = await create({ config: { provider: 'MERCADO_PAGO', credentialSource: 'OAUTH' } });
    expect(oauth.status).toBe(400);
    expect(JSON.stringify(oauth.body)).toContain('credential_source_not_supported');
    const ev = await eventos('payment_account.created');
    expect(ev).toHaveLength(1);
    expect(JSON.parse(ev[0].payload)).toEqual({ paymentAccountId: a1, provider: 'MERCADO_PAGO', glAccountId: folhaId, status: 'DRAFT' });
  });

  it('sem chave-mestra: PUT da credencial ⇒ 503 payment_credential_key_missing e NADA é gravado (P1-2)', async () => {
    withoutKey();
    const before = await prisma.paymentAccount.findUniqueOrThrow({ where: { id: a1 } });
    const r = await putCredential(a1);
    expect(r.status).toBe(503);
    expect(r.body.code).toBe('payment_credential_key_missing');
    const after = await prisma.paymentAccount.findUniqueOrThrow({ where: { id: a1 } });
    expect(after).toEqual(before);
    expect(await eventos('payment_account.credential_set')).toHaveLength(0);
    // o resto da aplicação segue respondendo
    expect((await request(app).get(BASE).set(authHeader(dono)).query({ unitId: UNIT })).status).toBe(200);
  });

  it('com chave: cifra, ativa, devolve só last4 + credentialSetAt; credencial ausente de resposta, audit e log (P1-6/P1-7)', async () => {
    withKey();
    const r = await putCredential(a1);
    expect(r.status).toBe(200);
    expect(r.body.data).toMatchObject({ status: 'ACTIVE', accessTokenLast4: 'wxyz', credentialExpiresAt: null });
    expect(r.body.data.credentialSetAt).toEqual(expect.any(String));
    const get = await request(app).get(`${BASE}/${a1}`).set(authHeader(dono)).query({ unitId: UNIT });
    const list = await request(app).get(BASE).set(authHeader(dono)).query({ unitId: UNIT });
    const audit = await prisma.auditEvent.findMany({ where: { targetType: 'payment_account' } });
    const ev = await eventos('payment_account.credential_set');
    expect(JSON.parse(ev[0].payload)).toEqual({ paymentAccountId: a1, credentialKeyVersion: '1', fromStatus: 'DRAFT', toStatus: 'ACTIVE' });
    // A captura funciona: o 503 do teste anterior passou pelo handleApiError → logger → console.
    expect(logged.join('\n')).toContain('payment_credential_key_missing');
    for (const serialized of [dump(r.body), dump(get.body), dump(list.body), dump(audit), logged.join('\n')]) {
      expect(serialized).not.toContain(TOKEN);
      expect(serialized).not.toContain(SECRET);
    }
    expect(dump(get.body)).not.toContain('credentialCiphertext');
  });

  it('ciphertext decifra só com o próprio id: copiado para outra conta não decifra (P1-8)', async () => {
    const row = await prisma.paymentAccount.findUniqueOrThrow({ where: { id: a1 } });
    const ring = loadKeyring();
    expect(JSON.parse(open(row.credentialCiphertext!, a1, row.credentialKeyVersion!, ring))).toEqual({ accessToken: TOKEN, webhookSecret: SECRET });
    const r2 = await create({ label: 'MP filial' });
    a2 = r2.body.data.id;
    await prisma.paymentAccount.update({ where: { id: a2 }, data: { credentialCiphertext: row.credentialCiphertext, credentialKeyVersion: row.credentialKeyVersion } });
    const copied = await prisma.paymentAccount.findUniqueOrThrow({ where: { id: a2 } });
    expect(() => open(copied.credentialCiphertext!, a2, copied.credentialKeyVersion!, ring)).toThrow();
  });

  it('uma ACTIVE por (escopo, provedor): 2ª ativação ⇒ 409 payment_account_already_active, sem efeito (P1-4)', async () => {
    const r = await putCredential(a2);
    expect(r.status).toBe(409);
    expect(r.body.code).toBe('payment_account_already_active');
    expect((await prisma.paymentAccount.findUniqueOrThrow({ where: { id: a2 } })).status).toBe('DRAFT');
    // outro escopo não conta
    const doOutro = await create({ glAccountId: folhaDoOutroId }, outro);
    expect(doOutro.status).toBe(201);
    expect((await putCredential(doOutro.body.data.id, outro)).status).toBe(200);
  });

  it('PATCH: só ACTIVE↔DISABLED (o resto 409), label ⇒ .updated, glAccountId imutável (P1-9/P1-10)', async () => {
    expect((await patch(a2, { status: 'DISABLED' })).status).toBe(409); // DRAFT → DISABLED
    expect((await patch(a2, { status: 'ACTIVE' })).status).toBe(409); // DRAFT → ACTIVE (só a credencial ativa)
    expect((await patch(a1, { glAccountId: sinteticaId })).status).toBe(400);

    const off = await patch(a1, { status: 'DISABLED' });
    expect(off.status).toBe(200);
    expect(off.body.data.status).toBe('DISABLED');
    expect(JSON.parse((await eventos('payment_account.disabled'))[0].payload)).toEqual({ paymentAccountId: a1, fromStatus: 'ACTIVE' });

    expect((await putCredential(a2)).status).toBe(200); // a1 desativada libera a vaga
    const back = await patch(a1, { status: 'ACTIVE' });
    expect(back.status).toBe(409);
    expect(back.body.code).toBe('payment_account_already_active');

    const renamed = await patch(a1, { label: 'MP antiga' });
    expect(renamed.status).toBe(200);
    expect(renamed.body.data.label).toBe('MP antiga');
    const upd = await eventos('payment_account.updated');
    expect(upd).toHaveLength(1);
    expect(JSON.parse(upd[0].payload)).toEqual({ paymentAccountId: a1, fromStatus: 'DISABLED', toStatus: 'DISABLED' });
    expect(dump(upd)).not.toContain('MP antiga');
    expect((await prisma.paymentAccount.findUniqueOrThrow({ where: { id: a1 } })).glAccountId).toBe(folhaId);
  });

  it('cross-tenant ⇒ 404; DELETE é soft e a 2ª chamada é 404; sem evento de audit (P1-9)', async () => {
    expect((await request(app).get(`${BASE}/${a1}`).set(authHeader(outro)).query({ unitId: UNIT })).status).toBe(404);
    expect((await request(app).delete(`${BASE}/${a1}`).set(authHeader(outro)).query({ unitId: UNIT })).status).toBe(404);
    const before = await prisma.auditEvent.count();
    expect((await request(app).delete(`${BASE}/${a1}`).set(authHeader(dono)).query({ unitId: UNIT })).status).toBe(200);
    expect(await prisma.auditEvent.count()).toBe(before);
    expect((await prisma.paymentAccount.findUniqueOrThrow({ where: { id: a1 } })).deletedAt).not.toBeNull();
    expect((await request(app).delete(`${BASE}/${a1}`).set(authHeader(dono)).query({ unitId: UNIT })).status).toBe(404);
    const list = await request(app).get(BASE).set(authHeader(dono)).query({ unitId: UNIT });
    expect(list.body.data.map((a: { id: string }) => a.id)).toEqual([a2]);
  });

  it('rotas exigem autenticação (deny-by-default)', async () => {
    expect((await request(app).get(BASE).query({ unitId: UNIT })).status).toBe(401);
    expect((await request(app).put(`${BASE}/${a2}/credential`).send({ unitId: UNIT, accessToken: TOKEN, webhookSecret: SECRET })).status).toBe(401);
  });
});

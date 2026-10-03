/**
 * BE-INCR-ACCOUNTANT-GOVERNANCE (nó GOV-CONTADOR) — app Express REAL sobre supertest + SQLite REAL.
 * Cobre os testes 17b (os dois caminhos de reabertura pelo HTTP), 17d (CAS do período), 17f (slot unique sem o
 * check do serviço) e 17h (ponta a ponta: convite → aceite → dono 403 → contador 200 → trilha, e ADMIN sem
 * atribuição no próprio silo).
 */
import request from 'supertest';
import { Role } from '@/features/users/models/User.model';
import prisma from '@/lib/prisma';
import { makeApp, pushTestSchema, resetDb, authHeader } from '@test/helpers';
import { AccountingPeriodRepository } from '@/features/accounting/repositories/AccountingPeriodRepository';
import { resolveAccountingScope } from '@/features/accounting/scope/AccountingScope';

const app = makeApp();
const UNIT = 'unit-gov';
const ANO = 2027;

type Actor = { id: string; username: string; role?: Role };
let dono: Actor;
let contador: Actor;
let terceiro: Actor;

const criarUsuario = async (username: string, role: Role = Role.USER): Promise<Actor> => {
  const u = await prisma.user.create({
    data: { name: username, username, email: `${username}@test.local`, password: 'x', role: role === Role.ADMIN ? 'ADMIN' : 'USER' },
  });
  return { id: u.id, username: u.username, role };
};

const criarContato = (userId: string) =>
  prisma.accountingContact.create({
    data: {
      userId, unitId: UNIT, name: 'Maria Contadora', email: 'maria@cont.local', cpf: '52998224725',
      crcNumber: 'SP-123456/O-1', crcUf: 'SP',
    },
  });

const periodo = (userId: string, month: number, status: 'FUTURE' | 'OPEN' | 'SOFT_CLOSED' | 'HARD_CLOSED') =>
  prisma.accountingPeriod.create({ data: { userId, unitId: UNIT, year: ANO, month, status } });

const statusDe = async (id: string) => (await prisma.accountingPeriod.findUnique({ where: { id } }))!.status;

/** Convida + aceita pelo HTTP; devolve o id da atribuição ACTIVE. */
async function atribuir(): Promise<string> {
  const contato = await criarContato(dono.id);
  const inv = await request(app)
    .post('/api/accounting/accountant-assignments')
    .set(authHeader(dono))
    .send({ unitId: UNIT, accountingContactId: contato.id, accountantEmail: `${contador.username}@test.local` });
  expect(inv.status).toBe(201);
  const acc = await request(app)
    .post(`/api/accounting/accountant-assignments/${inv.body.data.id}/accept`)
    .set(authHeader(contador))
    .send({ declaresWrittenContract: true });
  expect(acc.status).toBe(200);
  return inv.body.data.id;
}

const reabrir = (actor: Actor, id: string) =>
  request(app).post(`/api/accounting/periods/${id}/reopen`).set(authHeader(actor)).send({ unitId: UNIT, periodId: id });
const abrir = (actor: Actor, id: string) =>
  request(app).post(`/api/accounting/periods/${id}/open`).set(authHeader(actor)).send({ unitId: UNIT });

describe('BE-INCR-ACCOUNTANT-GOVERNANCE — contador responsável pelo HTTP', () => {
  beforeAll(() => pushTestSchema(), 120000);

  beforeEach(async () => {
    await resetDb();
    dono = await criarUsuario('gov-dono');
    contador = await criarUsuario('gov-contador');
    terceiro = await criarUsuario('gov-terceiro');
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  // ─────────────────────────────────────────────── 17b — os dois caminhos, cada um com a própria mordida
  describe.each([
    ['reopenPeriod', reabrir],
    ['openPeriod(SOFT_CLOSED)', abrir],
  ] as const)('%s', (_name, call) => {
    it('dono sem atribuição → 200 (F-GOV-4 a)', async () => {
      const p = await periodo(dono.id, 3, 'SOFT_CLOSED');
      const r = await call(dono, p.id);
      expect(r.status).toBe(200);
      expect(await statusDe(p.id)).toBe('OPEN');
    });

    it('dono com atribuição ativa → 403 ACCOUNTANT_REQUIRED; o período não se move', async () => {
      await atribuir();
      const p = await periodo(dono.id, 3, 'SOFT_CLOSED');
      const r = await call(dono, p.id);
      expect(r.status).toBe(403);
      expect(r.body.code).toBe('ACCOUNTANT_REQUIRED');
      expect(await statusDe(p.id)).toBe('SOFT_CLOSED');
    });

    it('contador delegado → 200 no livro do dono', async () => {
      await atribuir();
      const p = await periodo(dono.id, 3, 'SOFT_CLOSED');
      const r = await call(contador, p.id);
      expect(r.status).toBe(200);
      expect(await statusDe(p.id)).toBe('OPEN');
    });
  });

  it('openPeriod(FUTURE) segue em canClosePeriod: o dono com atribuição ativa abre', async () => {
    await atribuir();
    const p = await periodo(dono.id, 4, 'FUTURE');
    expect((await abrir(dono, p.id)).status).toBe(200);
  });

  // ─────────────────────────────────────────────── 17h — ponta a ponta + trilha
  it('ponta a ponta: convite → aceite → dono 403 → contador 200; trilha com ator = contador e escopo = dono, íntegra', async () => {
    const assignmentId = await atribuir();
    const p = await periodo(dono.id, 5, 'SOFT_CLOSED');

    expect((await reabrir(dono, p.id)).status).toBe(403);
    expect((await reabrir(contador, p.id)).status).toBe(200);

    const reopened = await prisma.auditEvent.findFirst({ where: { eventType: 'period.reopened', targetId: p.id } });
    expect(reopened).toMatchObject({ actorUserId: contador.id, scopeUserId: dono.id, unitId: UNIT });
    expect(JSON.parse(reopened!.payload)).toMatchObject({ assignmentId });

    const accepted = await prisma.auditEvent.findFirst({ where: { eventType: 'accountant_assignment.accepted' } });
    expect(accepted).toMatchObject({ actorUserId: contador.id, scopeUserId: dono.id });

    const chain = await request(app).get(`/api/accounting/audit/verify-chain?unitId=${UNIT}`).set(authHeader(dono));
    expect(chain.status).toBe(200);
    expect(chain.body.data.ok).toBe(true);
  });

  it('o contador lê os períodos do dono pelo resolver delegado; um terceiro vê só o próprio silo', async () => {
    await atribuir();
    await periodo(dono.id, 6, 'OPEN');
    const doContador = await request(app).get(`/api/accounting/${UNIT}/periods?year=${ANO}`).set(authHeader(contador));
    expect(doContador.status).toBe(200);
    expect(doContador.body.data.map((x: { userId: string }) => x.userId)).toEqual([dono.id]);
    const doTerceiro = await request(app).get(`/api/accounting/${UNIT}/periods?year=${ANO}`).set(authHeader(terceiro));
    expect(doTerceiro.body.data).toEqual([]);
  });

  it('I-9: ADMIN sem atribuição recebe o próprio silo — não reabre o período do dono', async () => {
    const admin = await criarUsuario('gov-admin', Role.ADMIN);
    const p = await periodo(dono.id, 7, 'SOFT_CLOSED');
    const lista = await request(app).get(`/api/accounting/${UNIT}/periods?year=${ANO}`).set(authHeader(admin));
    expect(lista.body.data).toEqual([]);
    const r = await reabrir(admin, p.id);
    expect(r.status).toBe(400); // "não encontrado" no silo do admin (caracterização do PeriodService)
    expect(await statusDe(p.id)).toBe('SOFT_CLOSED');
  });

  // ─────────────────────────────────────────────── 17f — atribuição pelo HTTP
  it('convite: e-mail sem usuário 400, autoatribuição 400, PENDING duplicado 409, contato de outro dono 404', async () => {
    const contato = await criarContato(dono.id);
    const base = { unitId: UNIT, accountingContactId: contato.id };
    const post = (body: object, as: Actor = dono) =>
      request(app).post('/api/accounting/accountant-assignments').set(authHeader(as)).send(body);

    expect((await post({ ...base, accountantEmail: 'ninguem@test.local' })).body.code).toBe('ACCOUNTANT_USER_NOT_FOUND');
    expect((await post({ ...base, accountantEmail: 'gov-dono@test.local' })).body.code).toBe('SELF_ASSIGNMENT');
    expect((await post({ ...base, accountantEmail: 'gov-contador@test.local' })).status).toBe(201);
    const dup = await post({ ...base, accountantEmail: 'gov-terceiro@test.local' });
    expect(dup.status).toBe(409);
    expect(dup.body.code).toBe('ASSIGNMENT_PENDING_EXISTS');
    expect((await post({ ...base, accountantEmail: 'gov-contador@test.local' }, terceiro)).status).toBe(404);
  });

  it('aceite: sem declaração 400, outro ator 404; /mine lista com ownerEmail; encerramento: terceiro 404, sem motivo 400, dono 200', async () => {
    const contato = await criarContato(dono.id);
    const inv = await request(app)
      .post('/api/accounting/accountant-assignments')
      .set(authHeader(dono))
      .send({ unitId: UNIT, accountingContactId: contato.id, accountantEmail: 'gov-contador@test.local' });
    const id = inv.body.data.id as string;

    const mine = await request(app).get('/api/accounting/accountant-assignments/mine').set(authHeader(contador));
    expect(mine.status).toBe(200);
    expect(mine.body.data).toEqual([expect.objectContaining({ id, status: 'PENDING', ownerEmail: 'gov-dono@test.local' })]);

    const acceptUrl = `/api/accounting/accountant-assignments/${id}/accept`;
    expect((await request(app).post(acceptUrl).set(authHeader(contador)).send({})).status).toBe(400);
    expect((await request(app).post(acceptUrl).set(authHeader(dono)).send({ declaresWrittenContract: true })).status).toBe(404);
    expect((await request(app).post(acceptUrl).set(authHeader(contador)).send({ declaresWrittenContract: true })).status).toBe(200);

    const endUrl = `/api/accounting/accountant-assignments/${id}/end`;
    expect((await request(app).post(endUrl).set(authHeader(terceiro)).send({ reason: 'x' })).status).toBe(404);
    expect((await request(app).post(endUrl).set(authHeader(dono)).send({ reason: '  ' })).status).toBe(400);
    const ended = await request(app).post(endUrl).set(authHeader(dono)).send({ reason: 'distrato' });
    expect(ended.status).toBe(200);
    expect(ended.body.data).toMatchObject({ status: 'ENDED', endReason: 'distrato' });
    expect(ended.body.data.activeUntil).not.toBeNull();

    const hist = await request(app).get(`/api/accounting/accountant-assignments?unitId=${UNIT}`).set(authHeader(dono));
    expect(hist.body.data.map((a: { status: string }) => a.status)).toEqual(['ENDED']);
    const row = await prisma.accountantAssignment.findUnique({ where: { id } });
    expect(row).toMatchObject({ activeSlot: null, pendingSlot: null, endedById: dono.id });
  });

  it('substituição: o aceite do novo contador encerra o anterior como SUPERSEDED, e só um ACTIVE sobra', async () => {
    const first = await atribuir();
    const contato = await prisma.accountingContact.findFirstOrThrow({ where: { userId: dono.id } });
    const inv = await request(app)
      .post('/api/accounting/accountant-assignments')
      .set(authHeader(dono))
      .send({ unitId: UNIT, accountingContactId: contato.id, accountantEmail: 'gov-terceiro@test.local' });
    expect(inv.status).toBe(201);
    const acc = await request(app)
      .post(`/api/accounting/accountant-assignments/${inv.body.data.id}/accept`)
      .set(authHeader(terceiro))
      .send({ declaresWrittenContract: true });
    expect(acc.status).toBe(200);
    expect(await prisma.accountantAssignment.findUnique({ where: { id: first } })).toMatchObject({
      status: 'ENDED', endReason: 'SUPERSEDED', activeSlot: null,
    });
    expect(await prisma.accountantAssignment.count({ where: { userId: dono.id, unitId: UNIT, status: 'ACTIVE' } })).toBe(1);
  });

  it('17f: o slot unique segura um 2º ACTIVE no mesmo escopo mesmo sem o check do serviço', async () => {
    const contato = await criarContato(dono.id);
    const base = {
      userId: dono.id, unitId: UNIT, accountingContactId: contato.id, crcNumber: 'SP-123456/O-1', crcUf: 'SP',
      createdById: dono.id, status: 'ACTIVE', activeSlot: 'ACTIVE',
    };
    await prisma.accountantAssignment.create({ data: { ...base, accountantUserId: contador.id } });
    await expect(
      prisma.accountantAssignment.create({ data: { ...base, accountantUserId: terceiro.id } }),
    ).rejects.toMatchObject({ code: 'P2002' });
    // ENDED com slot NULL não colide (NULL distinto no SQLite).
    await prisma.accountantAssignment.create({ data: { ...base, accountantUserId: terceiro.id, status: 'ENDED', activeSlot: null } });
    await prisma.accountantAssignment.create({ data: { ...base, accountantUserId: terceiro.id, status: 'ENDED', activeSlot: null } });
  });

  // ─────────────────────────────────────────────── 17d — CAS do período
  it('17d: setStatus é CAS — status mudou entre a leitura e a escrita → 409 PERIOD_STATUS_CHANGED; HARD_CLOSED nunca volta a OPEN', async () => {
    const p = await periodo(dono.id, 8, 'HARD_CLOSED'); // um hardClose venceu a corrida
    const repo = new AccountingPeriodRepository();
    const scope = resolveAccountingScope({ userId: dono.id }, UNIT);
    await expect(
      prisma.$transaction((tx) => repo.setStatus(scope, ANO, 8, 'OPEN', dono.id, 'reabrir', tx, 'SOFT_CLOSED')),
    ).rejects.toMatchObject({ statusCode: 409, errorCode: 'PERIOD_STATUS_CHANGED' });
    expect(await statusDe(p.id)).toBe('HARD_CLOSED');
    expect(await prisma.accountingPeriodTransition.count({ where: { periodId: p.id } })).toBe(0);
  });
});

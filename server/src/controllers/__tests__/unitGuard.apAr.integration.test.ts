/**
 * BE-INCR-SCOPE-UNIT-GUARD (nó I6, BRIEF item 11) — lote do PR-3 (AP/AR e tesouraria). Uma rota de leitura
 * (`GET /api/payables`) e uma de escrita (`POST /api/payables`, que reconhece a despesa no razão) contra o guard:
 *   string livre → 404 UNIT_NOT_FOUND · unidade de outro dono → 404 · unidade apagada → leitura 200 / escrita 409
 *   UNIT_DELETED · unidade viva → como antes (201 + título + lançamento).
 * Depois de todo 404/409, nenhum título nem linha contábil nova sob o `unitId`. A unidade viva é o controle positivo.
 */
import request from 'supertest';
import prisma from '@/lib/prisma';
import { makeApp, pushTestSchema, resetDb, disconnectDb, seedUser, seedUnit, authHeader } from '@test/helpers';

const app = makeApp();
const DATA = '2026-06-15';

beforeAll(() => {
  pushTestSchema();
}, 120000);

afterEach(async () => {
  await resetDb();
});

afterAll(async () => {
  await disconnectDb();
});

async function dono(username: string) {
  const u = await seedUser({ username });
  return { user: u, auth: authHeader({ id: u.id, username: u.username }) };
}

/** Período OPEN + as contas do reconhecimento, arranjados direto na base sob o `unitId` dado. */
async function arranjarRazao(userId: string, unitId: string) {
  await prisma.accountingPeriod.create({
    data: { userId, unitId, year: 2026, month: 6, status: 'OPEN', openedAt: new Date(), openedById: userId },
  });
  const contas = [
    ['4.1', 'Expense'],
    ['2.1.2', 'Liability'],
    ['1.1.1', 'Asset'],
  ] as const;
  for (const [code, nature] of contas) {
    await prisma.account.create({ data: { userId, unitId, code, name: `Conta ${code}`, nature, acceptsEntries: true } });
  }
  return (await prisma.account.findFirstOrThrow({ where: { userId, unitId, code: '4.1' } })).id;
}

const titulo = (unitId: string, expenseAccountId: string) => ({
  unitId,
  supplierName: 'ACME guard',
  documentNumber: 'NF-guard-1',
  description: 'serviço',
  issueDate: DATA,
  dueDate: '2026-07-15',
  amountCents: 50000,
  expenseAccountId,
});

const linhas = async (unitId: string) => ({
  payables: await prisma.payable.count({ where: { unitId } }),
  entries: await prisma.journalEntry.count({ where: { unitId } }),
});

describe('I6 guard — /api/payables (PR-3)', () => {
  it('unidade viva: POST cria o título e o lançamento (201); GET lista (200)', async () => {
    const a = await dono('guard-ap-a');
    await seedUnit({ userId: a.user.id, id: 'unit-ap-viva' });
    const despesa = await arranjarRazao(a.user.id, 'unit-ap-viva');
    const gravar = await request(app).post('/api/payables').set(a.auth).send(titulo('unit-ap-viva', despesa));
    expect(gravar.status).toBe(201);
    const ler = await request(app).get('/api/payables').query({ unitId: 'unit-ap-viva' }).set(a.auth);
    expect(ler.status).toBe(200);
    expect(await linhas('unit-ap-viva')).toEqual({ payables: 1, entries: 1 });
  });

  it('string livre: leitura e escrita → 404 UNIT_NOT_FOUND, nada nasce', async () => {
    const a = await dono('guard-ap-a');
    await seedUnit({ userId: a.user.id, id: 'unit-ap-viva' });
    const ler = await request(app).get('/api/payables').query({ unitId: 'qualquer-coisa' }).set(a.auth);
    expect(ler.status).toBe(404);
    expect(ler.body.code).toBe('UNIT_NOT_FOUND');
    const gravar = await request(app).post('/api/payables').set(a.auth).send(titulo('qualquer-coisa', 'conta-x'));
    expect(gravar.status).toBe(404);
    expect(gravar.body.code).toBe('UNIT_NOT_FOUND');
    expect(await linhas('qualquer-coisa')).toEqual({ payables: 0, entries: 0 });
  });

  it('unidade de outro dono: leitura e escrita → 404 UNIT_NOT_FOUND, nada nasce sob ela', async () => {
    const a = await dono('guard-ap-a');
    const b = await dono('guard-ap-b');
    await seedUnit({ userId: b.user.id, id: 'unit-ap-do-b' });
    const despesaA = await arranjarRazao(a.user.id, 'unit-ap-do-b');
    const ler = await request(app).get('/api/payables').query({ unitId: 'unit-ap-do-b' }).set(a.auth);
    expect(ler.status).toBe(404);
    expect(ler.body.code).toBe('UNIT_NOT_FOUND');
    const gravar = await request(app).post('/api/payables').set(a.auth).send(titulo('unit-ap-do-b', despesaA));
    expect(gravar.status).toBe(404);
    expect(gravar.body.code).toBe('UNIT_NOT_FOUND');
    expect(await linhas('unit-ap-do-b')).toEqual({ payables: 0, entries: 0 });
  });

  it('unidade apagada: leitura 200; escrita 409 UNIT_DELETED e nada nasce', async () => {
    const a = await dono('guard-ap-a');
    await seedUnit({ userId: a.user.id, id: 'unit-ap-apagada', deleted: true });
    const despesa = await arranjarRazao(a.user.id, 'unit-ap-apagada');
    const ler = await request(app).get('/api/payables').query({ unitId: 'unit-ap-apagada' }).set(a.auth);
    expect(ler.status).toBe(200);
    const gravar = await request(app).post('/api/payables').set(a.auth).send(titulo('unit-ap-apagada', despesa));
    expect(gravar.status).toBe(409);
    expect(gravar.body.code).toBe('UNIT_DELETED');
    expect(await linhas('unit-ap-apagada')).toEqual({ payables: 0, entries: 0 });
  });
});

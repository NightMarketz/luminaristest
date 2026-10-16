/**
 * BE-INCR-SCOPE-UNIT-GUARD (nó I6, BRIEF item 11) — lote do PR-5 (imobilizado). Uma rota de leitura
 * (`GET /api/accounting/depreciation-rates`) e uma de escrita (`POST` na mesma, taxa própria com laudo) contra o guard:
 *   string livre → 404 UNIT_NOT_FOUND · unidade de outro dono → 404 · unidade apagada → leitura 200 / escrita 409
 *   UNIT_DELETED · unidade viva → como antes (201 + linha).
 * Depois de todo 404/409, nenhuma taxa nem linha contábil nova sob o `unitId`. A unidade viva é o controle positivo.
 */
import request from 'supertest';
import prisma from '@/lib/prisma';
import { makeApp, pushTestSchema, resetDb, disconnectDb, seedUser, seedUnit, authHeader } from '@test/helpers';

const app = makeApp();
const R = '/api/accounting/depreciation-rates';

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

const taxa = (unitId: string) => ({
  unitId,
  description: 'Máquina guard',
  lifeYears: 5,
  annualRateBp: 2000,
  justification: 'Laudo técnico',
});

const linhas = async (unitId: string) => ({
  rates: await prisma.depreciationRate.count({ where: { unitId } }),
  accounts: await prisma.account.count({ where: { unitId } }),
  entries: await prisma.journalEntry.count({ where: { unitId } }),
});

describe('I6 guard — /api/accounting/depreciation-rates (PR-5)', () => {
  it('unidade viva: POST cria a taxa própria (201); GET lista (200)', async () => {
    const a = await dono('guard-fa-a');
    await seedUnit({ userId: a.user.id, id: 'unit-fa-viva' });
    const gravar = await request(app).post(R).set(a.auth).send(taxa('unit-fa-viva'));
    expect(gravar.status).toBe(201);
    const ler = await request(app).get(R).query({ unitId: 'unit-fa-viva' }).set(a.auth);
    expect(ler.status).toBe(200);
    expect((await linhas('unit-fa-viva')).rates).toBe(1);
  });

  it('string livre: leitura e escrita → 404 UNIT_NOT_FOUND, nada nasce', async () => {
    const a = await dono('guard-fa-a');
    await seedUnit({ userId: a.user.id, id: 'unit-fa-viva' });
    const ler = await request(app).get(R).query({ unitId: 'qualquer-coisa' }).set(a.auth);
    expect(ler.status).toBe(404);
    expect(ler.body.code).toBe('UNIT_NOT_FOUND');
    const gravar = await request(app).post(R).set(a.auth).send(taxa('qualquer-coisa'));
    expect(gravar.status).toBe(404);
    expect(gravar.body.code).toBe('UNIT_NOT_FOUND');
    expect(await linhas('qualquer-coisa')).toEqual({ rates: 0, accounts: 0, entries: 0 });
  });

  it('unidade de outro dono: leitura e escrita → 404 UNIT_NOT_FOUND, nada nasce sob ela', async () => {
    const a = await dono('guard-fa-a');
    const b = await dono('guard-fa-b');
    await seedUnit({ userId: b.user.id, id: 'unit-fa-do-b' });
    const ler = await request(app).get(R).query({ unitId: 'unit-fa-do-b' }).set(a.auth);
    expect(ler.status).toBe(404);
    expect(ler.body.code).toBe('UNIT_NOT_FOUND');
    const gravar = await request(app).post(R).set(a.auth).send(taxa('unit-fa-do-b'));
    expect(gravar.status).toBe(404);
    expect(gravar.body.code).toBe('UNIT_NOT_FOUND');
    expect(await linhas('unit-fa-do-b')).toEqual({ rates: 0, accounts: 0, entries: 0 });
  });

  it('unidade apagada: leitura 200; escrita 409 UNIT_DELETED e nada nasce', async () => {
    const a = await dono('guard-fa-a');
    await seedUnit({ userId: a.user.id, id: 'unit-fa-apagada', deleted: true });
    const ler = await request(app).get(R).query({ unitId: 'unit-fa-apagada' }).set(a.auth);
    expect(ler.status).toBe(200);
    const gravar = await request(app).post(R).set(a.auth).send(taxa('unit-fa-apagada'));
    expect(gravar.status).toBe(409);
    expect(gravar.body.code).toBe('UNIT_DELETED');
    expect(await linhas('unit-fa-apagada')).toEqual({ rates: 0, accounts: 0, entries: 0 });
  });
});

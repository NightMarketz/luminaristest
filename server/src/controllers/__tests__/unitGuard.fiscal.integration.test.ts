/**
 * BE-INCR-SCOPE-UNIT-GUARD (nó I6, BRIEF item 11) — lote do PR-4 (fiscal/declarações). Uma rota de leitura
 * (`GET /api/accounting/iss-beneficios-municipais`) e uma de escrita (`POST` na mesma) contra o guard:
 *   string livre → 404 UNIT_NOT_FOUND · unidade de outro dono → 404 · unidade apagada → leitura 200 / escrita 409
 *   UNIT_DELETED · unidade viva → como antes (201 + linha).
 * Depois de todo 404/409, nenhum benefício nem linha contábil nova sob o `unitId`. A unidade viva é o controle positivo.
 */
import request from 'supertest';
import prisma from '@/lib/prisma';
import { makeApp, pushTestSchema, resetDb, disconnectDb, seedUser, seedUnit, authHeader } from '@test/helpers';

const app = makeApp();
const B = '/api/accounting/iss-beneficios-municipais';
const SP = '3550308';

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

/** Perfil fiscal do ator sob o `unitId` dado, arranjado direto na base (o teste é do guard, não do cadastro). */
const perfilFiscal = (userId: string, unitId: string) =>
  prisma.fiscalProfile.create({
    data: { userId, unitId, regimeTributario: 'SIMPLES_NACIONAL', pisCofinsRegime: 'CUMULATIVO', codMun: SP },
  });

const corpo = (unitId: string) => ({
  unitId,
  codMun: SP,
  tipo: 'REDUCAO_PERCENTUAL',
  reducaoBpPorFaixa: [2000],
  legislacao: 'Lei Municipal FICTÍCIA 1/2026 art. 2º',
  vigenteDesde: '2026-01-01',
});

const linhas = async (unitId: string) => ({
  beneficios: await prisma.issBeneficioMunicipal.count({ where: { unitId } }),
  accounts: await prisma.account.count({ where: { unitId } }),
  entries: await prisma.journalEntry.count({ where: { unitId } }),
});

describe('I6 guard — /api/accounting/iss-beneficios-municipais (PR-4)', () => {
  it('unidade viva: POST cria (201); GET lista (200, 1 linha)', async () => {
    const a = await dono('guard-fis-a');
    await seedUnit({ userId: a.user.id, id: 'unit-fis-viva' });
    await perfilFiscal(a.user.id, 'unit-fis-viva');
    const gravar = await request(app).post(B).set(a.auth).send(corpo('unit-fis-viva'));
    expect(gravar.status).toBe(201);
    const ler = await request(app).get(B).query({ unitId: 'unit-fis-viva' }).set(a.auth);
    expect(ler.status).toBe(200);
    expect(ler.body.data).toHaveLength(1);
  });

  it('string livre: leitura e escrita → 404 UNIT_NOT_FOUND, nada nasce', async () => {
    const a = await dono('guard-fis-a');
    await seedUnit({ userId: a.user.id, id: 'unit-fis-viva' });
    const ler = await request(app).get(B).query({ unitId: 'qualquer-coisa' }).set(a.auth);
    expect(ler.status).toBe(404);
    expect(ler.body.code).toBe('UNIT_NOT_FOUND');
    const gravar = await request(app).post(B).set(a.auth).send(corpo('qualquer-coisa'));
    expect(gravar.status).toBe(404);
    expect(gravar.body.code).toBe('UNIT_NOT_FOUND');
    expect(await linhas('qualquer-coisa')).toEqual({ beneficios: 0, accounts: 0, entries: 0 });
  });

  it('unidade de outro dono: leitura e escrita → 404 UNIT_NOT_FOUND, nada nasce sob ela', async () => {
    const a = await dono('guard-fis-a');
    const b = await dono('guard-fis-b');
    await seedUnit({ userId: b.user.id, id: 'unit-fis-do-b' });
    await perfilFiscal(a.user.id, 'unit-fis-do-b');
    const ler = await request(app).get(B).query({ unitId: 'unit-fis-do-b' }).set(a.auth);
    expect(ler.status).toBe(404);
    expect(ler.body.code).toBe('UNIT_NOT_FOUND');
    const gravar = await request(app).post(B).set(a.auth).send(corpo('unit-fis-do-b'));
    expect(gravar.status).toBe(404);
    expect(gravar.body.code).toBe('UNIT_NOT_FOUND');
    expect(await linhas('unit-fis-do-b')).toEqual({ beneficios: 0, accounts: 0, entries: 0 });
  });

  it('unidade apagada: leitura 200; escrita 409 UNIT_DELETED e nada nasce', async () => {
    const a = await dono('guard-fis-a');
    await seedUnit({ userId: a.user.id, id: 'unit-fis-apagada', deleted: true });
    await perfilFiscal(a.user.id, 'unit-fis-apagada');
    const ler = await request(app).get(B).query({ unitId: 'unit-fis-apagada' }).set(a.auth);
    expect(ler.status).toBe(200);
    const gravar = await request(app).post(B).set(a.auth).send(corpo('unit-fis-apagada'));
    expect(gravar.status).toBe(409);
    expect(gravar.body.code).toBe('UNIT_DELETED');
    expect(await linhas('unit-fis-apagada')).toEqual({ beneficios: 0, accounts: 0, entries: 0 });
  });
});

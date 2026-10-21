/**
 * BE-INCR-IRRF-DISTRIBUICAO PR-1 (item 6; dono 21/10: "(a) com 2.1.7.03", opção (b) do mapeamento, PROVISÓRIA) — as
 * folhas novas do plano padrão nascem em todo escopo e recebem o referencial RFB onde o escopo já mapeia uma versão, sem
 * sobrescrever mapeamento existente; a cobertura da ECD não cai por causa delas.
 */
import request from 'supertest';
import prisma from '@/lib/prisma';
import { makeApp, pushTestSchema, authHeader, seedUnit } from '@test/helpers';
import { REFERENCIAL_PLANO_PADRAO } from '@/features/accounting/fixtures/ChartOfAccountsFixture';

const app = makeApp();
const UNIT = 'unit-ird-plano';
const UNIT_SEM_MAPA = 'unit-ird-plano-2';
const NOVAS = ['2.1.7', '2.1.7.01', '2.1.7.02', '2.1.7.03', '2.3.2', '2.3.2.01', '2.3.3', '2.3.3.01', '4.3.4'];

let dono: { id: string; username: string };

const contas = async (unitId: string) => {
  const r = await request(app).get('/api/accounting/accounts').set(authHeader(dono)).query({ unitId });
  expect(r.status).toBe(200);
  return r.body.data.accounts as Array<{ id: string; code: string; acceptsEntries: boolean; nature: string }>;
};

describe('IRRF-DISTRIBUICAO PR-1 — plano padrão e referencial (item 6)', () => {
  beforeAll(async () => {
    pushTestSchema();
    dono = await prisma.user.create({ data: { name: 'irdp', username: 'irdp-dono', email: 'irdp@test.local', password: 'x', role: 'USER' } });
    await seedUnit({ userId: dono.id, id: UNIT });
    await seedUnit({ userId: dono.id, id: UNIT_SEM_MAPA });
  }, 120000);

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('o seed cria as folhas e sintéticas novas com a natureza certa', async () => {
    const porCodigo = new Map((await contas(UNIT)).map((a) => [a.code, a]));
    for (const c of NOVAS) expect([c, porCodigo.has(c)]).toEqual([c, true]);
    expect(porCodigo.get('2.1.7.03')).toMatchObject({ nature: 'Liability', acceptsEntries: true });
    expect(porCodigo.get('2.3.2.01')).toMatchObject({ nature: 'Equity', acceptsEntries: true });
    expect(porCodigo.get('4.3.4')).toMatchObject({ nature: 'Expense', acceptsEntries: true });
    expect(porCodigo.get('2.1.7')).toMatchObject({ acceptsEntries: false });
  });

  it('escopo que já mapeia 2025: as folhas novas recebem o referencial, o existente não é sobrescrito, nenhuma fica órfã', async () => {
    const lista = await contas(UNIT);
    const porCodigo = new Map(lista.map((a) => [a.code, a]));
    // Simula o escopo com o kit instalado: todas as folhas antigas mapeadas em 2025, e 2.1.7.01 mapeada à mão pelo usuário.
    const novasFolhas = new Set(REFERENCIAL_PLANO_PADRAO.map((e) => e.accountCode));
    for (const a of lista.filter((x) => x.acceptsEntries && !novasFolhas.has(x.code))) {
      await prisma.referentialMapping.create({ data: { userId: dono.id, unitId: UNIT, accountId: a.id, referentialCode: '9.99', label: 'x', mappingVersion: '2025' } });
    }
    const manual = porCodigo.get('2.1.7.01')!;
    await prisma.referentialMapping.create({ data: { userId: dono.id, unitId: UNIT, accountId: manual.id, referentialCode: '2.01.01.17.13.20', label: 'escolha do usuário', mappingVersion: '2025' } });

    await contas(UNIT); // listAccounts → ensureChartOfAccounts → ensureCanonicalMappings
    const maps = await prisma.referentialMapping.findMany({ where: { userId: dono.id, unitId: UNIT, mappingVersion: '2025' } });
    const porConta = new Map(maps.map((m) => [m.accountId, m.referentialCode]));
    for (const e of REFERENCIAL_PLANO_PADRAO.filter((x) => x.accountCode !== '2.1.7.01')) {
      expect([e.accountCode, porConta.get(porCodigo.get(e.accountCode)!.id)]).toEqual([e.accountCode, e.referentialCode]);
    }
    expect(porConta.get(manual.id)).toBe('2.01.01.17.13.20');

    const cov = await request(app).get('/api/accounting/referential/coverage').set(authHeader(dono)).query({ unitId: UNIT, version: '2025' });
    expect(cov.status).toBe(200);
    expect(cov.body.data.ready ?? cov.body.data.summary?.ready).toBe(true);
  });

  it('idempotente: segunda chamada não cria nada; escopo sem mapeamento nenhum não ganha versão inventada', async () => {
    const antes = await prisma.referentialMapping.count({ where: { userId: dono.id, unitId: UNIT } });
    await contas(UNIT);
    expect(await prisma.referentialMapping.count({ where: { userId: dono.id, unitId: UNIT } })).toBe(antes);
    await contas(UNIT_SEM_MAPA);
    expect(await prisma.referentialMapping.count({ where: { userId: dono.id, unitId: UNIT_SEM_MAPA } })).toBe(0);
  });
});

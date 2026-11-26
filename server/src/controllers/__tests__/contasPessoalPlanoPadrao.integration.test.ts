/**
 * BE-INCR-DP-PONTE-RAZAO item 28 (F-PNT-4 a; dono 26/11: "Pesquisar referencial e incluir") — as contas de pessoal do plano
 * padrão não derrubam a cobertura da ECD de unidade já mapeada (lacuna L-20261126-182656-393c): depois do
 * `ensureChartOfAccounts` e do `ensureCanonicalMappings`, `coverage().unmappedAccounts` fica vazio. Molde:
 * `irrfPlanoPadrao.integration.test.ts`.
 */
import request from 'supertest';
import prisma from '@/lib/prisma';
import { makeApp, pushTestSchema, authHeader, seedUnit } from '@test/helpers';
import { REFERENCIAL_PLANO_PADRAO } from '@/features/accounting/fixtures/ChartOfAccountsFixture';

const app = makeApp();
const UNIT = 'unit-dp-pessoal-plano';
const VERSAO = '2025';
const PESSOAL = ['1.1.10.01', '2.1.10.01', '2.1.10.02', '2.1.10.03', '2.1.10.04', '2.1.10.05', '2.1.10.06', '2.1.10.07', '2.1.10.08', '4.10.01', '4.10.02', '4.10.03', '4.10.04', '4.10.05', '4.10.06', '4.10.07', '4.10.08', '4.10.09', '4.10.10', '4.10.11'];

let dono: { id: string; username: string };

const contas = async () => {
  const r = await request(app).get('/api/accounting/accounts').set(authHeader(dono)).query({ unitId: UNIT });
  expect(r.status).toBe(200);
  return r.body.data.accounts as Array<{ id: string; code: string; acceptsEntries: boolean; nature: string }>;
};

const cobertura = async () => {
  const r = await request(app).get('/api/accounting/referential/coverage').set(authHeader(dono)).query({ unitId: UNIT, version: VERSAO });
  expect(r.status).toBe(200);
  return r.body.data as { ready: boolean; unmappedAccounts: Array<{ code: string }> };
};

describe('Item 28 da ponte — contas de pessoal no plano padrão × cobertura da ECD', () => {
  beforeAll(async () => {
    pushTestSchema();
    dono = await prisma.user.create({ data: { name: 'dpp', username: 'dpp-dono', email: 'dpp@test.local', password: 'x', role: 'USER' } });
    await seedUnit({ userId: dono.id, id: UNIT });
    // Catálogo da versão carregado com os destinos do plano padrão (analíticos): o `ensureCanonicalMappings` passa pelo
    // `destinoAceito` real, não pelo atalho de versão sem catálogo.
    for (const code of new Set(REFERENCIAL_PLANO_PADRAO.map((e) => e.referentialCode))) {
      await prisma.referentialAccount.upsert({
        where: { layoutVersion_code: { layoutVersion: VERSAO, code } },
        create: { layoutVersion: VERSAO, code, name: code, isAnalytic: true },
        update: { isAnalytic: true },
      });
    }
  }, 120000);

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('unidade mapeada antes do item 28: as folhas de pessoal recriadas recebem o referencial e a cobertura fica completa', async () => {
    const lista = await contas();
    const porCodigo = new Map(lista.map((a) => [a.code, a]));
    for (const c of PESSOAL) expect([c, porCodigo.get(c)?.acceptsEntries]).toEqual([c, true]);

    // Escopo mapeado pelo kit antes do deploy: toda folha fora do REFERENCIAL_PLANO_PADRAO já tem referencial em 2025.
    const doPlanoPadrao = new Set(REFERENCIAL_PLANO_PADRAO.map((e) => e.accountCode));
    for (const a of lista.filter((x) => x.acceptsEntries && !doPlanoPadrao.has(x.code))) {
      await prisma.referentialMapping.create({ data: { userId: dono.id, unitId: UNIT, accountId: a.id, referentialCode: '9.99', label: 'kit', mappingVersion: VERSAO } });
    }
    // Sem o complemento de sistema, as folhas de pessoal são exatamente o que falta (a checagem que falharia).
    expect((await cobertura()).unmappedAccounts.map((u) => u.code).filter((c) => PESSOAL.includes(c)).sort()).toEqual([...PESSOAL].sort());

    // Antes do deploy as folhas não existiam: apagá-las faz o próximo ensure criá-las e chamar o ensureCanonicalMappings.
    await prisma.account.deleteMany({ where: { userId: dono.id, unitId: UNIT, code: { in: [...doPlanoPadrao] } } });
    const recriadas = new Map((await contas()).map((a) => [a.code, a]));

    const maps = await prisma.referentialMapping.findMany({ where: { userId: dono.id, unitId: UNIT, mappingVersion: VERSAO } });
    const porConta = new Map(maps.map((m) => [m.accountId, m.referentialCode]));
    for (const e of REFERENCIAL_PLANO_PADRAO.filter((x) => PESSOAL.includes(x.accountCode))) {
      expect([e.accountCode, porConta.get(recriadas.get(e.accountCode)!.id)]).toEqual([e.accountCode, e.referentialCode]);
    }

    const cov = await cobertura();
    expect(cov.unmappedAccounts).toEqual([]);
    expect(cov.ready).toBe(true);
  });
});

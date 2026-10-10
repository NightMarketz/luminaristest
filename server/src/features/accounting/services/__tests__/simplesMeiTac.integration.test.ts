/**
 * SIMEI-TAC-12 (BRIEF docs/accounting/BE-INCR-SIMEI-TAC-12-brief.md §3 itens 4, 6, 7 e §9.5 itens 11, 13) — o DAS-MEI do
 * transportador autônomo de cargas pela rota de apuração: CPP de 12% (Res. CGSN 140 art. 101 I "c"; LC 123 art. 18-F III)
 * com o mesmo booleano do limite (F-TAC-2 a), o gate da tx com o transportador efetivo e, a partir de 2027, CBS/IBS do
 * Anexo VII da LC 123 (LC 214 arts. 517, 520). Os valores esperados são aritmética sobre a lei, não oráculo — o oráculo é a
 * guia do PGMEI (gate humano X14-DAS). Ocupações: B-0001 transportador de carga municipal (Tabela B); A-0050 cabeleireiro.
 */
import request from 'supertest';
import prisma from '@/lib/prisma';
import { makeApp, pushTestSchema, authHeader } from '@test/helpers';
import { resolveAccountingScope } from '@/features/accounting/scope/AccountingScope';
import { CompanyFiscalProfileRepository } from '@/features/accounting/repositories/CompanyFiscalProfileRepository';
import { ApplicationFactory } from '@/lib/factory';

const app = makeApp();
const S = '/api/accounting/simples';
const f = () => ApplicationFactory.getInstance();
type Cenario = { user: { id: string; username: string }; unit: string };

const cenario = async (nome: string): Promise<Cenario> => {
  const u = await prisma.user.create({ data: { name: nome, username: nome, email: `${nome}@test.local`, password: 'x', role: 'USER' } });
  const c = { user: { id: u.id, username: u.username }, unit: `unit-${nome}` };
  await f().getPostingService().ensureChartOfAccounts(resolveAccountingScope({ userId: u.id }, c.unit));
  return c;
};
const perfil = (c: Cenario, ano: number, extra: Record<string, unknown>) =>
  request(app).put(`/api/accounting/company-fiscal-profile/${ano}`).set(authHeader(c.user)).send({ unitId: c.unit, regime: 'MEI', ...extra });
const calcular = (c: Cenario, comp: string) => request(app).post(`${S}/apuracoes/${comp}/calcular`).set(authHeader(c.user)).send({ unitId: c.unit });
const das = (c: Cenario, comp: string, body: Record<string, unknown>) =>
  request(app).put(`${S}/apuracoes/${comp}/das`).set(authHeader(c.user)).send({ unitId: c.unit, vencimento: '2026-04-20', ...body });
const alerta = (body: { data: { alertas: Array<{ codigo: string; detalhe: string }> } }, codigo: string) => body.data.alertas.find((a) => a.codigo === codigo);
const ids = (body: { data: { tabela: Array<{ legalParameterId: string }> } }) => body.data.tabela.map((t) => t.legalParameterId);
const TAC = { meiContribuinteIcms: true, meiContribuinteIss: true, meiTransportadorCargas: true };

/** Contas do DAS e período aberto — o registro provisiona pelo valor oficial (BRIEF item 8, inalterado). */
const prepararRegistro = async (c: Cenario) => {
  const deducao = await prisma.account.create({ data: { userId: c.user.id, unitId: c.unit, code: '3.9', name: 'DAS', nature: 'Revenue', acceptsEntries: true } });
  const recolher = await prisma.account.create({ data: { userId: c.user.id, unitId: c.unit, code: '2.1.9', name: 'DAS a recolher', nature: 'Liability', acceptsEntries: true } });
  await prisma.fiscalProfile.create({
    data: { userId: c.user.id, unitId: c.unit, regimeTributario: 'SIMPLES', pisCofinsRegime: 'SIMPLES', simplesDasDeducaoAccountId: deducao.id, simplesRecolherAccountId: recolher.id },
  });
  await prisma.accountingPeriod.create({ data: { userId: c.user.id, unitId: c.unit, year: 2026, month: 3, status: 'OPEN', openedAt: new Date() } });
};

beforeAll(() => pushTestSchema());
afterAll(() => prisma.$disconnect());

describe('item 4 — o transportador efetivo decide CPP e limite (F-TAC-2/F-TAC-3 a)', () => {
  it('só Tabela B ⇒ CPP 12% (R$ 194,52 de R$ 1.621) + limite MEI_TAC; a memória cita a linha CPP_TAC_PCT', async () => {
    const c = await cenario('tac4b');
    expect((await perfil(c, 2026, { ...TAC, meiOcupacoes: ['B-0001'] })).status).toBe(200);
    const r = await calcular(c, '2026-05');
    expect(r.status).toBe(200);
    expect(r.body.data).toMatchObject({ transportadorCargas: true, cppAliquotaBp: 1_200, tributos: { CPP: 19_452, ICMS: 100, ISS: 500 }, tributosMilesimos: {}, totalCalculadoCents: 20_052, limiteAnoCents: 25_160_000 });
    expect(ids(r.body)).toContain('sn5-simei-cpp-tac-pct');
    expect(ids(r.body)).not.toContain('sn1-simei-cpp-pct');
    expect(alerta(r.body, 'MEI_TAC_COM_OCUPACAO_A')).toBeUndefined();
  });

  it('Tabela B + Tabela A ⇒ CPP 5% + limite geral + MEI_TAC_COM_OCUPACAO_A citando a CPP de 5% (§ 1º-B)', async () => {
    const c = await cenario('tac4ab');
    expect((await perfil(c, 2026, { ...TAC, meiOcupacoes: ['B-0001', 'A-0050'] })).status).toBe(200);
    const r = await calcular(c, '2026-05');
    expect(r.status).toBe(200);
    expect(r.body.data).toMatchObject({ transportadorCargas: false, cppAliquotaBp: 500, tributos: { CPP: 8_105, ICMS: 100, ISS: 500 }, limiteAnoCents: 8_100_000 });
    expect(alerta(r.body, 'MEI_TAC_COM_OCUPACAO_A')?.detalhe).toContain('CPP de 5%');
  });

  it('MEI comum (flag false) ⇒ CPP 5%, transportadorCargas false', async () => {
    const c = await cenario('tac4comum');
    expect((await perfil(c, 2026, { meiContribuinteIcms: false, meiContribuinteIss: true, meiOcupacoes: ['A-0050'] })).status).toBe(200);
    const r = await calcular(c, '2026-05');
    expect(r.body.data).toMatchObject({ transportadorCargas: false, cppAliquotaBp: 500, tributos: { CPP: 8_105, ISS: 500 }, totalCalculadoCents: 8_605 });
  });
});

describe('itens 6 e 7 — gate da tx e divergência do DAS do TAC', () => {
  it('item 7: DAS do PGMEI de R$ 200,52 para o TAC ⇒ divergência 0 (antes do nó: R$ 113,47)', async () => {
    const c = await cenario('tac7');
    await prepararRegistro(c);
    expect((await perfil(c, 2026, { ...TAC, meiOcupacoes: ['B-0001'] })).status).toBe(200);
    const r = await das(c, '2026-03', { numeroDocumento: '07202603000000101', valorCents: 20_052 });
    expect(r.status).toBe(200);
    expect(r.body.data).toMatchObject({ regime: 'MEI', totalCalculadoCents: 20_052, divergenciaCents: 0, dasOficial: { valorCents: 20_052, provisaoPendente: false } });
  });

  it('item 6: a flag do transportador muda entre o cálculo e o registro ⇒ 409, nada gravado', async () => {
    const c = await cenario('tac6');
    await prepararRegistro(c);
    expect((await perfil(c, 2026, { ...TAC, meiOcupacoes: ['B-0001'] })).status).toBe(200);
    const original = CompanyFiscalProfileRepository.prototype.findByYear;
    const spy = jest.spyOn(CompanyFiscalProfileRepository.prototype, 'findByYear').mockImplementation(async function (this: CompanyFiscalProfileRepository, s, ano, tx) {
      const row = await original.call(this, s, ano, tx);
      return tx && row ? { ...row, meiTransportadorCargas: false } : row;
    });
    const r = await das(c, '2026-03', { numeroDocumento: '07202603000000102', valorCents: 20_052 });
    spy.mockRestore();
    expect(r.status).toBe(409);
    expect(await prisma.simplesApuracao.count({ where: { userId: c.user.id } })).toBe(0);
  });
});

describe('§9.5 itens 11 e 13 — 2027: CBS/IBS do Anexo VII no DAS-MEI (F-TAC-7/F-TAC-8 a)', () => {
  it('2026-12 sem CBS/IBS; 2027-01 com CBS R$ 0,994 + IBS R$ 0,006 (total + R$ 1,00) e as linhas na memória', async () => {
    const c = await cenario('tac2027');
    expect((await perfil(c, 2026, { ...TAC, meiOcupacoes: ['B-0001'] })).status).toBe(200);
    expect((await perfil(c, 2027, { ...TAC, meiOcupacoes: ['B-0001'] })).status).toBe(200);
    const dez = await calcular(c, '2026-12');
    expect(dez.body.data).toMatchObject({ tributos: { CPP: 19_452, ICMS: 100, ISS: 500 }, tributosMilesimos: {}, totalCalculadoCents: 20_052 });
    const jan = await calcular(c, '2027-01');
    expect(jan.status).toBe(200);
    expect(jan.body.data).toMatchObject({ transportadorCargas: true, tributos: { CPP: 19_452, ICMS: 100, ISS: 500 }, tributosMilesimos: { CBS: 994, IBS: 6 }, totalCalculadoCents: 20_152 });
    expect(ids(jan.body)).toEqual(expect.arrayContaining(['sn5-simei-cbs-2027', 'sn5-simei-ibs-2027']));
  });
});

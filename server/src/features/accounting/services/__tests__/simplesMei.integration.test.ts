/**
 * BE-INCR-SIMPLES-NACIONAL PR-4 (nó X14, BRIEF itens 25–27, 29, 31) — o MEI pelas rotas: SIMEI calculado, DAS oficial
 * registrado pela mesma rota do ME/EPP (regime 'MEI') com provisão, gate dentro da tx, limite do MEI, DASN-SIMEI e a
 * conferência NFS-e × receita. Os valores esperados são aritmética sobre a lei (Res. CGSN 140 arts. 100, 101, 109, 115
 * e os decretos do salário mínimo), não oráculo — o oráculo é o DAS do portal (gate humano X14-DAS).
 */
import request from 'supertest';
import prisma from '@/lib/prisma';
import { makeApp, pushTestSchema, authHeader } from '@test/helpers';
import { resolveAccountingScope, type AccountingScope } from '@/features/accounting/scope/AccountingScope';
import { CompanyFiscalProfileRepository } from '@/features/accounting/repositories/CompanyFiscalProfileRepository';
import { SIMPLES_DAS_PROVISION_SOURCE_TYPE } from '@/features/accounting/services/SimplesApuracaoService';
import { ApplicationFactory } from '@/lib/factory';
import { storePublished } from '@/features/legalParameters/services/legalParameterCache';

const app = makeApp();
let user: { id: string; username: string };
const UNIT = 'unit-mei';
const S = '/api/accounting/simples';
const scope = (): AccountingScope => resolveAccountingScope({ userId: user.id }, UNIT);
const f = () => ApplicationFactory.getInstance();

const perfil = (ano: number, extra: Record<string, unknown> = {}) =>
  request(app).put(`/api/accounting/company-fiscal-profile/${ano}`).set(authHeader(user)).send({ unitId: UNIT, regime: 'MEI', ...extra });
const calcular = (c: string) => request(app).post(`${S}/apuracoes/${c}/calcular`).set(authHeader(user)).send({ unitId: UNIT });
const das = (c: string, body: Record<string, unknown>) =>
  request(app).put(`${S}/apuracoes/${c}/das`).set(authHeader(user)).send({ unitId: UNIT, vencimento: '2026-04-20', ...body });
const historico = (c: string, cents: number) => f().getSimplesEntradasService().upsertHistorico(scope(), c, { unitId: UNIT, receitaBrutaCents: cents });
const codigos = (body: { data: { alertas: Array<{ codigo: string }> } }) => body.data.alertas.map((a) => a.codigo);
let seq = 0;
const linhaReceita = (competencia: string, natureza: 'SERVICO' | 'REVENDA', cents: number) =>
  prisma.receitaFiscalLinha.create({
    data: { userId: user.id, unitId: UNIT, competencia, dia: `${competencia}-10`, saleId: `sale-${++seq}`, itemRef: `item-${seq}`, natureza, cTribNac: natureza === 'SERVICO' ? '060101' : null, receitaCents: BigInt(cents), excluir: [], tomadorTipo: 'CNPJ' }, // F-PR4-9: só o tomador CNPJ exige NFS-e do MEI
  });
const nfse = (dCompet: string, cents: number, status = 'AUTHORIZED') =>
  prisma.fiscalDocument.create({
    data: { userId: user.id, unitId: UNIT, kind: 'NFSE', status, saleId: `nf-${++seq}`, saleKey: `nf-${seq}`, cTribNac: '060101', anchorEntryId: 'x', ambiente: 'producao', partner: 'manual', serie: 1, dCompet, vServCents: BigInt(cents) },
  });

beforeAll(() => pushTestSchema());
beforeAll(async () => {
  const u = await prisma.user.create({ data: { name: 'x14p4', username: 'x14p4', email: 'x14p4@test.local', password: 'x', role: 'USER' } });
  user = { id: u.id, username: u.username };
  await f().getPostingService().ensureChartOfAccounts(scope());
  await prisma.accountingPeriod.create({ data: { userId: user.id, unitId: UNIT, year: 2026, month: 3, status: 'OPEN', openedAt: new Date() } });
});
afterAll(() => prisma.$disconnect());

describe('item 25 — SIMEI pela rota de apuração', () => {
  it('perfil MEI sem o enquadramento do Anexo XI ⇒ 400 pedindo a declaração', async () => {
    expect((await perfil(2026)).status).toBe(200);
    const r = await calcular('2026-03');
    expect(r.status).toBe(400);
    expect(JSON.stringify(r.body)).toContain('Anexo XI');
  });

  it('o enquadramento ICMS/ISS só é aceito no regime MEI (Res. CGSN 140 art. 101 § 1º)', async () => {
    const r = await request(app).put('/api/accounting/company-fiscal-profile/2026').set(authHeader(user)).send({ unitId: UNIT, regime: 'SIMPLES', meiContribuinteIss: true });
    expect(r.status).toBe(400);
  });

  it('2026, contribuinte de ICMS e ISS: R$ 81,05 (5% de R$ 1.621) + R$ 1 + R$ 5 = R$ 87,05', async () => {
    expect((await perfil(2026, { meiContribuinteIcms: true, meiContribuinteIss: true, meiOcupacoes: ['A-0002'] })).status).toBe(200);
    const r = await calcular('2026-03');
    expect(r.status).toBe(200);
    expect(r.body.data).toMatchObject({ regime: 'MEI', salarioMinimoCents: 162_100, tributos: { CPP: 8_105, ICMS: 100, ISS: 500 }, totalCalculadoCents: 8_705, dasOficial: null });
    expect(r.body.data.enquadramento).toEqual({ contribuinteIcms: true, contribuinteIss: true });
  });

  it('registro do DAS do MEI: linha regime MEI, provisão pelo valor oficial', async () => {
    const deducao = await prisma.account.create({ data: { userId: user.id, unitId: UNIT, code: '3.9', name: 'DAS', nature: 'Revenue', acceptsEntries: true } });
    const recolher = await prisma.account.create({ data: { userId: user.id, unitId: UNIT, code: '2.1.9', name: 'DAS a recolher', nature: 'Liability', acceptsEntries: true } });
    await prisma.fiscalProfile.create({
      data: { userId: user.id, unitId: UNIT, regimeTributario: 'SIMPLES', pisCofinsRegime: 'SIMPLES', simplesDasDeducaoAccountId: deducao.id, simplesRecolherAccountId: recolher.id },
    });
    const r = await das('2026-03', { numeroDocumento: '07202603000000001', valorCents: 8_705 });
    expect(r.status).toBe(200);
    expect(r.body.data).toMatchObject({ regime: 'MEI', divergenciaCents: 0, dasOficial: { valorCents: 8_705, provisaoPendente: false } });
    const [row] = await prisma.simplesApuracao.findMany({ where: { userId: user.id } });
    expect([row.regime, Number(row.valorOficialCents), Number(row.totalCalculadoCents)]).toEqual(['MEI', 8_705, 8_705]);
    const vivas = await prisma.journalEntry.findMany({ where: { userId: user.id, sourceType: SIMPLES_DAS_PROVISION_SOURCE_TYPE, status: 'Posted', reversedById: null } });
    expect(vivas.map((v) => v.sourceId)).toEqual([row.id]);
  });

  it('item 20 no MEI: enquadramento mudou entre o cálculo e o registro ⇒ 409, nada gravado', async () => {
    const antes = await prisma.simplesApuracao.count({ where: { userId: user.id } });
    const original = CompanyFiscalProfileRepository.prototype.findByYear;
    const spy = jest.spyOn(CompanyFiscalProfileRepository.prototype, 'findByYear').mockImplementation(async function (this: CompanyFiscalProfileRepository, s, ano, tx) {
      const row = await original.call(this, s, ano, tx);
      return tx && row ? { ...row, meiContribuinteIcms: false } : row;
    });
    const r = await das('2026-03', { numeroDocumento: '07202603000000002', valorCents: 8_605 });
    spy.mockRestore();
    expect(r.status).toBe(409);
    expect(await prisma.simplesApuracao.count({ where: { userId: user.id } })).toBe(antes);
  });

  it('item 29: a rota de alíquotas recusa o MEI (valores fixos, sem alíquota efetiva)', async () => {
    const r = await request(app).get(`${S}/aliquotas/2026-04`).query({ unitId: UNIT }).set(authHeader(user));
    expect(r.status).toBe(400);
  });
});

describe('item 26 — limite do MEI (Res. CGSN 140 arts. 100 e 115)', () => {
  it('excesso até 20% de R$ 81.000 ⇒ desenquadramento a partir de 1º/01 do ano seguinte', async () => {
    await perfil(2025, { meiContribuinteIcms: false, meiContribuinteIss: true });
    await historico('2025-01', 9_000_000);
    const r = await calcular('2025-02');
    expect(r.body.data.limiteAnoCents).toBe(8_100_000);
    expect(r.body.data.receitaAcumuladaAnoCents).toBe(9_000_000);
    const alerta = r.body.data.alertas.find((a: { codigo: string }) => a.codigo === 'LIMITE_MEI_EXCEDIDO');
    expect(alerta.detalhe).toContain('a partir de 1º/01/2026');
  });

  it('excesso acima de 20% ⇒ retroativo a 1º/01 do ano do excesso', async () => {
    await historico('2025-02', 1_000_000);
    const r = await calcular('2025-02');
    const alerta = r.body.data.alertas.find((a: { codigo: string }) => a.codigo === 'LIMITE_MEI_EXCEDIDO');
    expect(alerta.detalhe).toContain('retroativo a 1º/01/2025');
  });

  it('ano de início (julho): limite proporcional R$ 6.750 × 6 = R$ 40.500', async () => {
    await perfil(2024, { meiContribuinteIcms: false, meiContribuinteIss: true, inicioAtividadeEm: '2024-07-01' });
    await historico('2024-07', 4_000_000);
    const dentro = await calcular('2024-07');
    expect(dentro.body.data.limiteAnoCents).toBe(4_050_000);
    expect(codigos(dentro.body)).not.toContain('LIMITE_MEI_EXCEDIDO');
    await historico('2024-08', 100_000);
    expect(codigos((await calcular('2024-08')).body)).toContain('LIMITE_MEI_EXCEDIDO');
  });

  // Guarda: sem linha SIMPLES_LIMITE/MEI vigente (ex.: revogada), o limite do MEI não pode virar 0 e pular a checagem
  // de desenquadramento em silêncio — a apuração bloqueia (SemLinhaVigenteError ⇒ 400). O cache vazio é o estado que o
  // serviço vê depois de uma revogação; o beforeEach de jest.integrationLegalParams.ts o reaquece no teste seguinte.
  it('sem linha SIMPLES_LIMITE vigente ⇒ 400 nomeando a tabela, nunca limite 0 calado', async () => {
    await perfil(2025, { meiContribuinteIcms: false, meiContribuinteIss: true });
    expect((await calcular('2025-03')).status).toBe(200);
    storePublished('SIMPLES_LIMITE', []);
    const r = await calcular('2025-03');
    expect(r.status).toBe(400);
    expect(JSON.stringify(r.body)).toContain('SIMPLES_LIMITE/MEI');
  });
});

describe('item 27 — DASN-SIMEI espelho anual (Res. CGSN 140 art. 109)', () => {
  it('receita total do ano, parcela do ICMS (revenda do subrazão), prazo em 31/05 e o campo digitado', async () => {
    await linhaReceita('2025-03', 'REVENDA', 200_000);
    await linhaReceita('2025-03', 'SERVICO', 300_000);
    const g = await request(app).get(`${S}/dasn-simei/2025`).query({ unitId: UNIT }).set(authHeader(user));
    expect(g.status).toBe(200);
    expect(g.body.data).toEqual({
      ano: 2025,
      prazo: '2026-05-31',
      receitaBrutaTotalCents: 9_000_000 + 1_000_000 + 500_000,
      receitaIcmsCents: 200_000,
      mesesSemSubrazao: ['2025-01', '2025-02'],
      digitado: null,
    });
    const p = await request(app).put(`${S}/dasn-simei/2025`).set(authHeader(user)).send({ unitId: UNIT, contratouEmpregado: true });
    expect(p.status).toBe(200);
    expect(p.body.data.digitado).toEqual({ contratouEmpregado: true });
  });

  it('ano sem perfil MEI ⇒ 400; corpo fora do contrato ⇒ 400', async () => {
    expect((await request(app).get(`${S}/dasn-simei/2023`).query({ unitId: UNIT }).set(authHeader(user))).status).toBe(400);
    expect((await request(app).put(`${S}/dasn-simei/2025`).set(authHeader(user)).send({ unitId: UNIT, contratouEmpregado: true, extra: 1 })).status).toBe(400);
  });

  it('DEFIS é da ME/EPP: ano MEI ⇒ 400', async () => {
    expect((await request(app).get(`${S}/defis/2025`).query({ unitId: UNIT }).set(authHeader(user))).status).toBe(400);
  });
});

describe('item 31 — conferência NFS-e emitidas × receita de serviços (alerta, não bloqueio)', () => {
  it('serviço sem NFS-e ⇒ NFSE_DIVERGE_RECEITA; NFS-e autorizada do mesmo valor ⇒ some; cancelada não conta', async () => {
    await linhaReceita('2026-03', 'SERVICO', 150_000);
    await linhaReceita('2026-03', 'REVENDA', 90_000);
    expect(codigos((await calcular('2026-03')).body)).toContain('NFSE_DIVERGE_RECEITA');
    await nfse('2026-03-10', 150_000, 'CANCELLED');
    expect(codigos((await calcular('2026-03')).body)).toContain('NFSE_DIVERGE_RECEITA');
    await nfse('2026-03-10', 150_000);
    expect(codigos((await calcular('2026-03')).body)).not.toContain('NFSE_DIVERGE_RECEITA');
  });
});

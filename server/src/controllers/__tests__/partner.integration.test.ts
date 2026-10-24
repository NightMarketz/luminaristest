/**
 * BE-INCR-IRRF-DISTRIBUICAO PR-1 (BRIEF itens 1–4, 7 e 8; F-IRD-2, F-IRD-7, F-IRD-14, F-IRD-15) — contrato HTTP ponta a
 * ponta do cadastro de sócios, das contas da distribuição no perfil fiscal da unidade e do mapa do PL no perfil da empresa.
 */
import request from 'supertest';
import prisma from '@/lib/prisma';
import { makeApp, pushTestSchema, authHeader, seedUnit } from '@test/helpers';

const app = makeApp();
const UNIT = 'unit-ird';
const UNIT_OUTRO = 'unit-ird-outro';
const BASE = '/api/accounting/partners';
const CPF = '52998224725';
const CNPJ = '11222333000181';
const SOCIO = { unitId: UNIT, nome: 'Maria Sócia', taxId: CPF, residenteBrasil: true, participacaoBp: 6000, entradaEm: '2026-01-01' };

let dono: { id: string; username: string };
let outro: { id: string; username: string };

const post = (body: Record<string, unknown>, who = dono) => request(app).post(BASE).set(authHeader(who)).send(body);
const list = (data?: string) => request(app).get(BASE).set(authHeader(dono)).query({ unitId: UNIT, ...(data ? { data } : {}) });
const conta = (userId: string, unitId: string, code: string, nature: string) =>
  prisma.account.create({ data: { userId, unitId, code, name: code, nature, acceptsEntries: true } });
const ultimoEvento = async (eventType: string): Promise<Record<string, string>> =>
  JSON.parse((await prisma.auditEvent.findFirst({ where: { eventType }, orderBy: { seq: 'desc' } }))?.payload ?? '{}');

describe('IRRF-DISTRIBUICAO PR-1 — sócios (itens 1–4)', () => {
  beforeAll(async () => {
    pushTestSchema();
    dono = await prisma.user.create({ data: { name: 'ird', username: 'ird-dono', email: 'ird@test.local', password: 'x', role: 'USER' } });
    await seedUnit({ userId: dono.id, id: UNIT });
    outro = await prisma.user.create({ data: { name: 'ird2', username: 'ird-outro', email: 'ird2@test.local', password: 'x', role: 'USER' } });
    await seedUnit({ userId: outro.id, id: UNIT_OUTRO });
  }, 120000);

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('item 1: CPF com DV errado → 400; CPF e CNPJ válidos → 201 com tipoPessoa derivado; auditoria sem nome nem CPF', async () => {
    expect((await post({ ...SOCIO, taxId: '52998224724' })).status).toBe(400);
    const pf = await post(SOCIO);
    expect(pf.status).toBe(201);
    expect(pf.body.data).toMatchObject({ taxId: CPF, tipoPessoa: 'PF', participacaoBp: 6000, saidaEm: null });
    const ev = await ultimoEvento('partner.created');
    expect(ev).toEqual({ partnerId: pf.body.data.id, tipoPessoa: 'PF', residenteBrasil: 'true', participacaoBp: '6000', entradaEm: '2026-01-01', saidaEm: '' });
    expect(JSON.stringify(ev)).not.toContain(CPF);
    expect(JSON.stringify(ev)).not.toContain('Maria');
    const pj = await post({ ...SOCIO, nome: 'Holding', taxId: CNPJ, participacaoBp: 3000 });
    expect([pj.status, pj.body.data.tipoPessoa]).toEqual([201, 'PJ']);
  });

  it('item 2: vigência que se cruza para o mesmo taxId → 409; a que começa depois da saída passa; PUT não colide consigo', async () => {
    const r = await post({ ...SOCIO, entradaEm: '2026-05-01' });
    expect([r.status, r.body.error?.code ?? r.body.errorCode ?? JSON.stringify(r.body)]).toEqual([409, expect.stringContaining('VIGENCIA_SOBREPOSTA')]);
    const fechado = await post({ ...SOCIO, taxId: '39053344705', entradaEm: '2026-01-01', saidaEm: '2026-03-31', participacaoBp: 0 });
    expect(fechado.status).toBe(201);
    expect((await post({ ...SOCIO, taxId: '39053344705', entradaEm: '2026-03-31', participacaoBp: 0 })).status).toBe(409);
    const depois = await post({ ...SOCIO, taxId: '39053344705', entradaEm: '2026-04-01', participacaoBp: 0 });
    expect(depois.status).toBe(201);
    const put = await request(app).put(`${BASE}/${depois.body.data.id}`).set(authHeader(dono)).send({ ...SOCIO, taxId: '39053344705', entradaEm: '2026-04-15', participacaoBp: 0 });
    expect([put.status, put.body.data.entradaEm]).toEqual([200, '2026-04-15']);
  });

  it('item 2: duas criações concorrentes com vigências sobrepostas → exatamente uma 201 e uma 409 (gate dentro da tx)', async () => {
    const taxId = '86288366757';
    const [a, b] = await Promise.all([
      post({ ...SOCIO, taxId, entradaEm: '2026-02-01', participacaoBp: 0 }),
      post({ ...SOCIO, taxId, entradaEm: '2026-03-01', participacaoBp: 0 }),
    ]);
    expect([a.status, b.status].sort()).toEqual([201, 409]);
    expect(await prisma.partner.count({ where: { userId: dono.id, taxId, deletedAt: null } })).toBe(1);
  });

  it('item 3: GET ?data= devolve os vigentes e a soma; soma 9000 → aviso, sem bloquear; fora da vigência some', async () => {
    const r = await list('2026-03-15');
    expect(r.status).toBe(200);
    expect(r.body.data.somaParticipacaoBp).toBe(9000);
    expect(r.body.data.aviso).toContain('9000');
    expect(r.body.data.socios.map((s: { taxId: string }) => s.taxId).sort()).toEqual([CPF, CNPJ, '39053344705', '86288366757'].sort());
    const antes = await list('2025-12-31');
    expect([antes.body.data.socios, antes.body.data.somaParticipacaoBp]).toEqual([[], 0]);
    expect((await list('2026-02-30')).status).toBe(400);
  });

  it('item 3: soma 10000 → sem aviso', async () => {
    const extra = await post({ ...SOCIO, taxId: '11144477735', participacaoBp: 1000, entradaEm: '2026-06-01' });
    expect(extra.status).toBe(201);
    const r = await list('2026-06-15');
    expect([r.body.data.somaParticipacaoBp, r.body.data.aviso]).toEqual([10000, null]);
  });

  it('item 4: sócio não residente é aceito no cadastro (F-IRD-7)', async () => {
    const r = await post({ ...SOCIO, taxId: '15350946056', residenteBrasil: false, participacaoBp: 0, entradaEm: '2027-01-01' });
    expect([r.status, r.body.data.residenteBrasil]).toEqual([201, false]);
  });

  it('tenancy e soft-delete: id de outra PJ → 404; DELETE some da lista e libera a vigência', async () => {
    const r = await post({ ...SOCIO, taxId: '71428793860', participacaoBp: 0 });
    const id = r.body.data.id as string;
    expect((await request(app).get(`${BASE}/${id}`).set(authHeader(outro)).query({ unitId: UNIT_OUTRO })).status).toBe(404);
    expect((await request(app).delete(`${BASE}/${id}`).set(authHeader(dono)).query({ unitId: UNIT })).status).toBe(200);
    expect((await request(app).get(`${BASE}/${id}`).set(authHeader(dono)).query({ unitId: UNIT })).status).toBe(404);
    expect(await ultimoEvento('partner.deleted')).toEqual({ partnerId: id });
    expect((await post({ ...SOCIO, taxId: '71428793860', participacaoBp: 0 })).status).toBe(201);
  });
});

describe('IRRF-DISTRIBUICAO PR-1 — contas do perfil fiscal (item 7) e mapa do PL (item 8)', () => {
  const putUnidade = (body: Record<string, unknown>) =>
    request(app)
      .put('/api/accounting/fiscal-profile')
      .set(authHeader(dono))
      .send({ unitId: UNIT, regimeTributario: 'REAL', icmsContribuinte: false, pisCofinsRegime: 'NAO_CUMULATIVO', ...body });
  const putEmpresa = (body: Record<string, unknown>) =>
    request(app)
      .put('/api/accounting/company-fiscal-profile/2026')
      .set(authHeader(dono))
      .send({ unitId: UNIT, regime: 'REAL', ecf: { indAliqCsll: '1', indRecReceita: '2' }, ...body });
  const vazio = { CAPITAL_INTEGRALIZADO: [], RESERVAS_CAPITAL: [], RESERVAS_LUCROS: [], ACOES_TESOURARIA: [], LUCROS_ACUMULADOS: [] };

  it('item 7: grava as 4 contas com a natureza certa; natureza errada → 400 com o rótulo; evento com os ids', async () => {
    const div = await conta(dono.id, UNIT, '2.1.9.01', 'Liability');
    const jcp = await conta(dono.id, UNIT, '2.1.9.02', 'Liability');
    const irrf = await conta(dono.id, UNIT, '2.1.9.03', 'Liability');
    const desp = await conta(dono.id, UNIT, '4.9.1', 'Expense');
    const ok = await putUnidade({ dividendosPagarAccountId: div.id, jcpPagarAccountId: jcp.id, irrfRecolherAccountId: irrf.id, jcpDespesaAccountId: desp.id });
    expect(ok.status).toBe(200);
    expect(ok.body.data).toMatchObject({ dividendosPagarAccountId: div.id, jcpPagarAccountId: jcp.id, irrfRecolherAccountId: irrf.id, jcpDespesaAccountId: desp.id });
    expect(await ultimoEvento('fiscal_profile.updated')).toMatchObject({ dividendosPagarAccountId: div.id, jcpDespesaAccountId: desp.id });
    for (const [campo, id, rotulo] of [
      ['dividendosPagarAccountId', desp.id, 'dividendos a pagar'],
      ['jcpPagarAccountId', desp.id, 'JCP a pagar'],
      ['irrfRecolherAccountId', desp.id, 'IRRF a recolher'],
      ['jcpDespesaAccountId', irrf.id, 'despesa de juros sobre o capital próprio'],
    ] as const) {
      const r = await putUnidade({ [campo]: id });
      expect([campo, r.status]).toEqual([campo, 400]);
      expect(JSON.stringify(r.body)).toContain(rotulo);
    }
  });

  it('item 8: mapa do PL com contas Equity do escopo grava; conta de outra PJ → 404; conta não-Equity → 400', async () => {
    const capital = await conta(dono.id, UNIT, '2.3.9.01', 'Equity');
    const lucros = await conta(dono.id, UNIT, '2.3.9.02', 'Equity');
    const ok = await putEmpresa({ jcpBaseContas: { ...vazio, CAPITAL_INTEGRALIZADO: [capital.id], LUCROS_ACUMULADOS: [lucros.id] } });
    expect(ok.status).toBe(200);
    expect(ok.body.data.jcpBaseContas).toEqual({ ...vazio, CAPITAL_INTEGRALIZADO: [capital.id], LUCROS_ACUMULADOS: [lucros.id] });
    expect(JSON.parse((await ultimoEvento('company_fiscal_profile.updated')).jcpBaseContas)).toMatchObject({ CAPITAL_INTEGRALIZADO: [capital.id] });

    const alheia = await conta(outro.id, UNIT_OUTRO, '2.3.9.01', 'Equity');
    expect((await putEmpresa({ jcpBaseContas: { ...vazio, CAPITAL_INTEGRALIZADO: [alheia.id] } })).status).toBe(404);
    const ativo = await conta(dono.id, UNIT, '1.9.9.01', 'Asset');
    const r = await putEmpresa({ jcpBaseContas: { ...vazio, RESERVAS_CAPITAL: [ativo.id] } });
    expect(r.status).toBe(400);
    expect(JSON.stringify(r.body)).toContain('Equity');
    expect((await putEmpresa({ jcpBaseContas: { ...vazio, OUTRO: [] } })).status).toBe(400);
  });
});

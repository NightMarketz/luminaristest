/**
 * ISS-TRANSICAO-IBS PR-2 (BRIEF `docs/accounting/BE-INCR-ISS-TRANSICAO-IBS-brief.md` itens 10, 12 e 13; régua A4/A6/A8) —
 * pilha HTTP da apuração do Simples (Route→Controller→SimplesApuracaoService) com o piso lido da linha
 * ISS_LIMITE/ALIQUOTA_MIN_BP na data do PA (P-ISS-1 → leitura b, ADCT art. 128; fold de 30/10) e o aviso
 * BENEFICIO_ISS_TRANSICAO_8B (P-ISS-2 → ramo § 3º). Competências literais; lei municipal FICTÍCIA.
 */
import request from 'supertest';
import prisma from '@/lib/prisma';
import { makeApp, pushTestSchema, authHeader, seedUnit } from '@test/helpers';
import { ApplicationFactory } from '@/lib/factory';
import { resolveAccountingScopeInternal } from '@/features/accounting/scope/resolveAccountingScopeInternal';

const app = makeApp();
const f = () => ApplicationFactory.getInstance();
let n = 0;

async function cenario(nome: string) {
  const u = await prisma.user.create({ data: { name: nome, username: nome, email: `${nome}@test.local`, password: 'x', role: 'USER' } });
  const unit = `unit-${nome}`;
  const scope = () => resolveAccountingScopeInternal({ userId: u.id }, unit);
  await seedUnit({ userId: u.id, id: unit });
  await f().getPostingService().ensureChartOfAccounts(scope());
  await prisma.fiscalProfile.create({ data: { userId: u.id, unitId: unit, regimeTributario: 'SIMPLES_NACIONAL', pisCofinsRegime: 'CUMULATIVO', codMun: '3550308' } });
  await prisma.serviceFiscalProfile.create({ data: { userId: u.id, unitId: unit, serviceRef: 'srv-060101', cTribNac: '060101' } });
  const user = { id: u.id, username: u.username };
  for (const ano of [2027, 2028, 2029, 2033]) {
    expect((await request(app).put(`/api/accounting/company-fiscal-profile/${ano}`).set(authHeader(user)).send({ unitId: unit, regime: 'SIMPLES' })).status).toBe(200);
  }
  return { user, unit, scope };
}
type C = Awaited<ReturnType<typeof cenario>>;
const historico = async (c: C, de: [number, number], meses: number) => {
  for (let i = 0; i < meses; i++) {
    await f().getSimplesEntradasService().upsertHistorico(c.scope(), new Date(Date.UTC(de[0], de[1] - 1 + i, 1)).toISOString().slice(0, 7), { unitId: c.unit, receitaBrutaCents: 5_000_000 });
  }
};
const venda = (c: C, competencia: string) =>
  prisma.receitaFiscalLinha.create({
    data: { userId: c.user.id, unitId: c.unit, competencia, dia: `${competencia}-10`, saleId: `sale-${++n}`, itemRef: `item-${n}`, natureza: 'SERVICO', cTribNac: '060101', receitaCents: 5_000_000n, excluir: [] },
  });
const beneficio = (c: C, over: Record<string, unknown> = {}) =>
  request(app)
    .post('/api/accounting/iss-beneficios-municipais')
    .set(authHeader(c.user))
    .send({ unitId: c.unit, codMun: '3550308', tipo: 'ISENCAO', reducaoBpPorFaixa: null, legislacao: 'Lei Municipal FICTÍCIA 9/2026 art. 1º', vigenteDesde: '2026-01-01', ...over });
const calcular = (c: C, m: string) => request(app).post(`/api/accounting/simples/apuracoes/${m}/calcular`).set(authHeader(c.user)).send({ unitId: c.unit });
type Body = { data: { atividades: Array<{ cTribNac: string | null; tributos?: Record<string, number> }>; alertas: Array<{ codigo: string; severity: string; detalhe: string }> } };
const issDe = (b: Body) => b.data.atividades.find((a) => a.cTribNac === '060101')?.tributos?.ISS;
const alerta = (b: Body, codigo: string) => b.data.alertas.find((a) => a.codigo === codigo);

beforeAll(() => pushTestSchema());
afterAll(() => prisma.$disconnect());

describe('ISS-TRANSICAO-IBS PR-2 — apuração do Simples com benefício que cruza 2029', () => {
  it('itens 10 e 12: isenção vigente desde 2026 — PA 2028-12 ⇒ piso 2% (R$ 1.000,00), sem aviso; PA 2029-01 ⇒ piso 1,80% (R$ 900,00) e BENEFICIO_ISS_TRANSICAO_8B (WARNING)', async () => {
    const c = await cenario('isspr2cruza');
    await historico(c, [2027, 1], 24);
    expect((await beneficio(c)).status).toBe(201);
    await venda(c, '2028-12');
    await venda(c, '2029-01');
    const dez = await calcular(c, '2028-12');
    const jan = await calcular(c, '2029-01');
    expect([dez.status, jan.status]).toEqual([200, 200]);
    expect([issDe(dez.body), issDe(jan.body)]).toEqual([100_000, 90_000]);
    expect(alerta(dez.body, 'BENEFICIO_ISS_TRANSICAO_8B')).toBeUndefined();
    expect(alerta(jan.body, 'BENEFICIO_ISS_TRANSICAO_8B')).toMatchObject({ severity: 'WARNING' });
    expect(alerta(jan.body, 'BENEFICIO_ISS_TRANSICAO_8B')?.detalhe).toContain('ADCT art. 128 § 3º');
  });

  it('item 12: benefício que começa em 2029 não gera o aviso', async () => {
    const c = await cenario('isspr2novo');
    await historico(c, [2027, 1], 24);
    expect((await beneficio(c, { vigenteDesde: '2029-01-01' })).status).toBe(201);
    await venda(c, '2029-01');
    const r = await calcular(c, '2029-01');
    expect(r.status).toBe(200);
    expect(alerta(r.body, 'BENEFICIO_ISS_TRANSICAO_8B')).toBeUndefined();
  });

  it('item 10: o texto do BENEFICIO_MUNICIPAL_INAPLICAVEL_DESVANTAJOSO interpola o piso lido (2028: "piso de 2.00%")', async () => {
    const c = await cenario('isspr2desv');
    await f().getSimplesEntradasService().upsertHistorico(c.scope(), '2027-12', { unitId: c.unit, receitaBrutaCents: 18_000_001 });
    expect((await beneficio(c)).status).toBe(201);
    await venda(c, '2028-12');
    const r = await calcular(c, '2028-12');
    expect(r.status).toBe(200);
    expect(alerta(r.body, 'BENEFICIO_MUNICIPAL_INAPLICAVEL_DESVANTAJOSO')?.detalhe).toContain('piso de 2.00%');
  });

  it('item 13: PA 2033-01 com o benefício cadastrado — sem ISS, sem piso, sem 400 por falta da linha de 2033', async () => {
    const c = await cenario('isspr2fim');
    await historico(c, [2031, 1], 24);
    expect((await beneficio(c)).status).toBe(201);
    await venda(c, '2033-01');
    const r = await calcular(c, '2033-01');
    expect(r.status).toBe(200);
    expect(issDe(r.body)).toBeUndefined();
  });
});

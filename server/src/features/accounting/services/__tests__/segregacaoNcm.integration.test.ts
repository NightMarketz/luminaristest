/**
 * BE-INCR-EFICIENCIA-FISCAL PR-2 (nó EFICIENCIA-FISCAL, BRIEF itens 13–14; ADR D7, I-8) — de ponta a ponta: a venda de um
 * cosmético finalizada pela ponte real grava `ReceitaFiscalLinha.excluir` pela NCM do `ProductFiscalProfile`; a apuração usa
 * essas marcas; a segregação manual da competência prevalece com `SEGREGACAO_DIVERGE`. A ST semeada (SP, DRAFT) não exclui
 * ICMS (D-2026-10-27-EFICIENCIA-FISCAL-PR2-EXECUCAO, decisão 2).
 */
import request from 'supertest';
import prisma from '@/lib/prisma';
import { makeApp, pushTestSchema, authHeader } from '@test/helpers';
import { ApplicationFactory } from '@/lib/factory';
import type { AccountingScope } from '@/features/accounting/scope/AccountingScope';
import { resolveAccountingScopeInternal } from '@/features/accounting/scope/resolveAccountingScopeInternal';
import { maybeSyncSaleFinalized } from '@/features/accounting/sync/bridges/SaleSalesAccountingBridge';

const app = makeApp();
let user: { id: string; username: string };
let tables: Record<'sales' | 'saleItems' | 'units', string>;
let UNIT: string;
const scope = (): AccountingScope => resolveAccountingScopeInternal({ userId: user.id }, UNIT);
const f = () => ApplicationFactory.getInstance();

async function row(table: keyof typeof tables, data: Record<string, unknown>) {
  const stored = typeof data.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(data.date) ? { ...data, date: `${data.date}T00:00:00.000Z` } : data;
  return prisma.dynamicTableData.create({ data: { dynamicTableId: tables[table], data: stored as never } });
}
async function vendaProduto(date: string, reais: number, productId: string) {
  const sale = await row('sales', { status: 'Finalized', unitId: UNIT, totalAmount: reais, currency: 'BRL', date, paymentStatus: 'Pending' });
  await row('saleItems', { saleId: sale.id, type: 'Product', productId, description: productId, quantity: 1, unitPrice: reais });
  await maybeSyncSaleFinalized({ userId: user.id }, tables.sales, { id: sale.id, data: sale.data });
  return sale;
}
const calcular = (c: string) => request(app).post(`/api/accounting/simples/apuracoes/${c}/calcular`).set(authHeader(user)).send({ unitId: UNIT });
const codigos = (a: { alertas: Array<{ codigo: string }> }) => a.alertas.map((x) => x.codigo).sort();
const revenda = (a: { atividades: Array<{ natureza: string; tributos: Record<string, number> }> }) => a.atividades.find((x) => x.natureza === 'REVENDA')!;

beforeAll(() => pushTestSchema());
beforeAll(async () => {
  const u = await prisma.user.create({ data: { name: 'efpr2', username: 'efpr2', email: 'efpr2@test.local', password: 'x', role: 'USER' } });
  user = { id: u.id, username: u.username };
  const created = await request(app).post('/api/dashboard/create').set(authHeader(user)).send({ suiteKey: 'beautySalon', unit: { name: 'Matriz' } });
  expect(created.status).toBe(201);
  const byName = async (n: string) => (await prisma.dynamicTable.findFirstOrThrow({ where: { userId: user.id, internalName: n } })).id;
  tables = { sales: await byName('sales'), saleItems: await byName('saleItems'), units: await byName('units') };
  UNIT = (await row('units', { name: 'Matriz', cnpj: '11222333000181' })).id;
  await f().getPostingService().ensureChartOfAccounts(scope());
  for (const month of [2, 3]) {
    await prisma.accountingPeriod.create({ data: { userId: user.id, unitId: UNIT, year: 2026, month, status: 'OPEN', openedAt: new Date() } });
  }
  // Unidade em São Paulo (IBGE 3550308 ⇒ UF 35).
  await prisma.fiscalProfile.create({ data: { userId: user.id, unitId: UNIT, regimeTributario: 'SIMPLES', pisCofinsRegime: 'SIMPLES', codMun: '3550308' } });
  const base = { origem: 0, cfopPadrao: '5102', uCom: 'UN', cEan: 'SEM GTIN', cstPis: '49', cstCofins: '49' };
  await prisma.productFiscalProfile.create({ data: { ...base, userId: user.id, productRef: 'prd-shampoo', ncm: '33051000', csosn: '500' } });
  await prisma.productFiscalProfile.create({ data: { ...base, userId: user.id, productRef: 'prd-tesoura', ncm: '82130000', csosn: '102' } });
  const perfil = await request(app).put('/api/accounting/company-fiscal-profile/2026').set(authHeader(user)).send({ unitId: UNIT, regime: 'SIMPLES' });
  expect(perfil.status).toBe(200);
  for (let i = 0; i < 12; i++) {
    const m = new Date(Date.UTC(2025, 1 + i, 1)).toISOString().slice(0, 7);
    if (m < '2026-02') await f().getSimplesEntradasService().upsertHistorico(scope(), m, { unitId: UNIT, receitaBrutaCents: 1_000_000 });
  }
});
afterAll(() => prisma.$disconnect());

describe('item 13 — a subrazão grava o excluir derivado da NCM', () => {
  it('cosmético (3305.10.00) ⇒ [PIS, COFINS]; ferramenta (8213) ⇒ []; produto sem perfil ⇒ []', async () => {
    const s1 = await vendaProduto('2026-02-10', 400, 'prd-shampoo');
    const s2 = await vendaProduto('2026-02-11', 600, 'prd-tesoura');
    const s3 = await vendaProduto('2026-02-12', 100, 'prd-sem-perfil');
    const linhas = await prisma.receitaFiscalLinha.findMany({ where: { userId: user.id, saleId: { in: [s1.id, s2.id, s3.id] } } });
    const por = new Map(linhas.map((l) => [l.saleId, l.excluir]));
    expect([por.get(s1.id), por.get(s2.id), por.get(s3.id)]).toEqual([['PIS', 'COFINS'], [], []]);
  });

  it('item 13/14 — a apuração usa as marcas: PIS/COFINS fora da parcela do cosmético; ICMS fica (ST DRAFT); avisos SEM_NCM e ICMS_ST_NAO_CONFERIDA', async () => {
    const r = await calcular('2026-02');
    expect(r.status).toBe(200);
    const a = r.body.data;
    expect(codigos(a)).toEqual(expect.arrayContaining(['ICMS_ST_NAO_CONFERIDA', 'SEM_NCM']));
    expect(codigos(a)).not.toContain('SEGREGACAO_DIVERGE');
    const rev = revenda(a);
    expect(rev.tributos.PIS).toBeGreaterThan(0);
    expect(rev.tributos.ICMS).toBeGreaterThan(0);
  });

  it('I-8 — a segregação manual da competência prevalece sobre a derivada, com SEGREGACAO_DIVERGE', async () => {
    const antes = revenda((await calcular('2026-02')).body.data).tributos.PIS;
    await f().getSimplesEntradasService().upsertSegregacao(scope(), '2026-02', { unitId: UNIT, parcelas: [{ natureza: 'REVENDA', receitaCents: 20_000, motivo: 'MONOFASICO' }] });
    const a = (await calcular('2026-02')).body.data;
    expect(codigos(a)).toEqual(expect.arrayContaining(['SEGREGACAO_DIVERGE', 'SEGREGACAO_MANUAL']));
    expect(codigos(a)).not.toContain('SEGREGACAO_INDEVIDA');
    // Derivada: PIS sobre R$ 700 (tesoura + sem perfil). Manual: PIS sobre R$ 900 (R$ 1.100 − R$ 200). Mesma alíquota.
    expect(revenda(a).tributos.PIS / antes).toBeCloseTo(900 / 700, 2);
  });

  it('item 14 — manual monofásica acima do que a NCM sustenta ⇒ SEGREGACAO_INDEVIDA (LC 123 art. 29 V)', async () => {
    await f().getSimplesEntradasService().upsertSegregacao(scope(), '2026-02', { unitId: UNIT, parcelas: [{ natureza: 'REVENDA', receitaCents: 110_000, motivo: 'MONOFASICO' }] });
    const a = (await calcular('2026-02')).body.data;
    expect(a.alertas.find((x: { codigo: string }) => x.codigo === 'SEGREGACAO_INDEVIDA')?.detalhe).toContain('LC 123 art. 29 V');
  });
});

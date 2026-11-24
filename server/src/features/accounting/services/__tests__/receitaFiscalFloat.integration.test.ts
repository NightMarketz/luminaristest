/**
 * Onda 2.3 (auditoria fiscal/contábil de 24/11/2026) — float residual em reais → centavos, SEM MOCK: venda de
 * quantidade × preço que quebra em float, pelas pontes reais (finalização, liquidação, cancelamento), repositórios reais e
 * SQLite. A prova é a PARIDADE: o subrazão fiscal (`ReceitaFiscalLinha`) fecha com o razão (`tieOut`), o recebimento
 * grava o mesmo valor que o razão lançou, e o estorno fecha de novo.
 */
import prisma from '@/lib/prisma';
import request from 'supertest';
import { makeApp, pushTestSchema, authHeader } from '@test/helpers';
import { ApplicationFactory } from '@/lib/factory';
import type { AccountingScope } from '@/features/accounting/scope/AccountingScope';
import { resolveAccountingScopeInternal } from '@/features/accounting/scope/resolveAccountingScopeInternal';
import { maybeSyncSaleFinalized } from '@/features/accounting/sync/bridges/SaleSalesAccountingBridge';
import { maybeSyncSaleSettled } from '@/features/accounting/sync/bridges/SaleSettlementBridge';
import { maybeReverseSale } from '@/features/accounting/sync/bridges/SaleReversalBridge';
import { scopeToday } from '@/features/accounting/models/dates';

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

interface Item {
  quantity: number;
  unitPrice: number;
}
/** Venda Finalized pela ponte real; itens = `quantity × unitPrice` cru (o contrato do bridge). */
async function venda(date: string, totalAmount: number, itens: Item[]) {
  const sale = await row('sales', { status: 'Finalized', unitId: UNIT, totalAmount, currency: 'BRL', date, paymentStatus: 'Pending' });
  for (const [i, it] of itens.entries()) {
    await row('saleItems', { saleId: sale.id, type: 'Service', serviceId: `srv-${i}`, description: `item ${i}`, ...it });
  }
  await maybeSyncSaleFinalized({ userId: user.id }, tables.sales, { id: sale.id, data: sale.data });
  return sale;
}
async function pagar(sale: { id: string; data: unknown }, meio: string, paidDay: string) {
  const data = { ...(sale.data as Record<string, unknown>), paymentStatus: 'Paid', paymentMethod: meio, paidAt: `${paidDay}T15:00:00.000Z` };
  await prisma.dynamicTableData.update({ where: { id: sale.id }, data: { data: data as never } });
  await maybeSyncSaleSettled({ userId: user.id }, tables.sales, { id: sale.id, data });
  return data;
}
async function cancelar(saleId: string) {
  const atual = await prisma.dynamicTableData.findUniqueOrThrow({ where: { id: saleId } });
  const data = { ...(atual.data as Record<string, unknown>), status: 'Cancelled' };
  await prisma.dynamicTableData.update({ where: { id: saleId }, data: { data: data as never } });
  await maybeReverseSale({ userId: user.id }, tables.sales, { id: saleId, data });
}
const linhas = async (saleId: string, tipo = 'VENDA') =>
  (await prisma.receitaFiscalLinha.findMany({ where: { saleId, tipo }, orderBy: { itemRef: 'asc' } })).map((l) => Number(l.receitaCents));
const soma = (xs: number[]) => xs.reduce((s, v) => s + v, 0);
const creditoDoRazao = async (saleId: string) => {
  const e = await f().getPostingService().findEntryBySource(scope(), 'sale.finalized', saleId);
  const legs = await prisma.posting.findMany({ where: { entryId: e!.id } });
  return legs.reduce((s, l) => s + Number(l.creditCents), 0);
};
const tieOut = (ym: string) => f().getReceitaFiscalService().tieOut(scope(), ym);

beforeAll(() => pushTestSchema());
beforeAll(async () => {
  const u = await prisma.user.create({ data: { name: 'onda23', username: 'onda23', email: 'onda23@test.local', password: 'x', role: 'USER' } });
  user = { id: u.id, username: u.username };
  const created = await request(app).post('/api/dashboard/create').set(authHeader(user)).send({ suiteKey: 'beautySalon', unit: { name: 'Matriz' } });
  expect(created.status).toBe(201);
  const byName = async (n: string) => (await prisma.dynamicTable.findFirstOrThrow({ where: { userId: user.id, internalName: n } })).id;
  tables = { sales: await byName('sales'), saleItems: await byName('saleItems'), units: await byName('units') };
  UNIT = (await row('units', { name: 'Matriz', cnpj: '11222333000181' })).id;
  await f().getPostingService().ensureChartOfAccounts(scope());
  const hoje = scopeToday(scope());
  for (const ym of new Set(['2026-11', hoje.slice(0, 7)])) {
    await prisma.accountingPeriod.create({ data: { userId: user.id, unitId: UNIT, year: Number(ym.slice(0, 4)), month: Number(ym.slice(5, 7)), status: 'OPEN', openedAt: new Date() } });
  }
  const perfil = await request(app).put('/api/accounting/company-fiscal-profile/2026').set(authHeader(user)).send({ unitId: UNIT, regime: 'SIMPLES' });
  expect(perfil.status).toBe(200);
});
afterAll(() => prisma.$disconnect());

describe('subrazão × razão com quantidade × preço que quebra em float', () => {
  it('0,333 × 10,00 + 2,5 × 33,33 (total 86,66): o subrazão soma o crédito do razão e o tie-out fecha', async () => {
    const v = await venda('2026-11-10', 86.66, [
      { quantity: 0.333, unitPrice: 10 },
      { quantity: 2.5, unitPrice: 33.33 },
    ]);
    const l = await linhas(v.id);
    expect(soma(l)).toBe(await creditoDoRazao(v.id));
    expect(soma(l)).toBe(8666);
    expect(l).toHaveLength(2);
    expect(await tieOut('2026-11')).toMatchObject({ ok: true });
  });

  it('empate exato de meio centavo (0,01 e 0,19 para 0,10): o centavo vai à 1ª linha e o tie-out fecha', async () => {
    const v = await venda('2026-11-10', 0.1, [
      { quantity: 1, unitPrice: 0.01 },
      { quantity: 1, unitPrice: 0.19 },
    ]);
    const ordenadas = (await prisma.receitaFiscalLinha.findMany({ where: { saleId: v.id, tipo: 'VENDA' } })).sort((a, b) => (a.itemRef < b.itemRef ? -1 : 1));
    const porItem = new Map((await prisma.dynamicTableData.findMany({ where: { dynamicTableId: tables.saleItems } })).map((r) => [r.id, (r.data as { unitPrice: number }).unitPrice]));
    expect(ordenadas.map((l) => [porItem.get(l.itemRef), Number(l.receitaCents)]).sort()).toEqual([[0.01, 1], [0.19, 9]]);
    expect(await tieOut('2026-11')).toMatchObject({ ok: true });
  });

  it('cancelar a venda float: as linhas negativas espelham as da venda e o tie-out fecha de novo', async () => {
    const v = await venda('2026-11-11', 86.66, [
      { quantity: 0.333, unitPrice: 10 },
      { quantity: 2.5, unitPrice: 33.33 },
    ]);
    const antes = await linhas(v.id);
    await cancelar(v.id);
    const estorno = await linhas(v.id, 'CANCELAMENTO');
    expect(estorno.map((x) => -x).sort()).toEqual([...antes].sort());
    expect(soma(estorno)).toBe(-8666);
    const hoje = scopeToday(scope());
    expect(await tieOut(hoje.slice(0, 7))).toMatchObject({ ok: true });
    expect(await tieOut('2026-11')).toMatchObject({ ok: true });
  });
});

describe('recebimento da venda com total em float', () => {
  it.each([
    [0.1 + 0.2, 30n],
    [1.005, 100n],
    [86.66, 8666n],
  ])('total %p ⇒ recebimento de %p centavos, o mesmo que o razão lançou na liquidação', async (total, esperado) => {
    const v = await venda('2026-11-12', total, [{ quantity: 1, unitPrice: total }]);
    await pagar(v, 'Pix', '2026-11-13');
    const [r, ...resto] = await prisma.receitaFiscalRecebimento.findMany({ where: { saleId: v.id } });
    expect(resto).toHaveLength(0);
    expect(r.valorCents).toBe(esperado);
    const liquidacao = await f().getPostingService().findEntryBySource(scope(), 'sale.settled', v.id);
    const legs = await prisma.posting.findMany({ where: { entryId: liquidacao!.id } });
    expect(legs.filter((l) => l.debitCents > 0n).reduce((s, l) => s + l.debitCents, 0n)).toBe(esperado);
  });
});

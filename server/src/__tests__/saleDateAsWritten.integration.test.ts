/**
 * FIX-SALE-DATE-AS-WRITTEN (F2 do BRIEF PACOTE-VALIDADE-PENDENCIAS; F-PP-3 b) — TESTE-GUARDA da sessão de instrumentação.
 *
 * Lacuna: o motor DynamicTable grava o campo `date` como ISO à meia-noite UTC (`2026-11-25T00:00:00.000Z`) e a ponte de
 * receita (`SaleSalesAccountingBridge`) o lê por `scopeDay`, que converte esse instante para o dia ANTERIOR em Brasília.
 * A competência da receita de produto/serviço sai datada um dia antes da venda; na virada do mês, no período anterior. Os
 * fallbacks de `data.date` da liquidação e do estorno (quando faltam `paidAt`/`returnedAt`) têm o mesmo defeito, e a
 * reconciliação (que passa o ISO cru) data no dia escrito: a mesma venda sai em D-1 ou D conforme quem a lança.
 *
 * Comportamento correto esperado: o lançamento de uma venda leva o DIA ESCRITO da venda, pela ponte ou pela reconciliação.
 *
 * A venda nasce pelo CAMINHO REAL do motor (POST Draft → item → PUT Finalized; é o controller que dispara a ponte). O e2e do
 * #483 grava a venda por Prisma com `YYYY-MM-DD` e por isso não via — regra de fixture do BRIEF (item 8).
 */
import request from 'supertest';
import prisma from '@/lib/prisma';
import { makeApp, pushTestSchema, authHeader } from '@test/helpers';
import { ApplicationFactory } from '@/lib/factory';
import { resolveAccountingScope } from '@/features/accounting/scope/AccountingScope';
import { reconcileSaleSales } from '@/jobs/accountingSyncReconcile.job';
import { maybeSyncSaleSettled } from '@/features/accounting/sync/bridges/SaleSettlementBridge';
import { maybeReverseSale } from '@/features/accounting/sync/bridges/SaleReversalBridge';

const app = makeApp();
const CNPJ = '11222333000181';
const DAY = '2026-11-25';

let user: { id: string; username: string };
let tables: Record<'sales' | 'saleItems' | 'services' | 'customers' | 'units', string>;
let unitId: string;
let customerId: string;
let serviceId: string;

async function row(table: keyof typeof tables, data: Record<string, unknown>) {
  return prisma.dynamicTableData.create({ data: { dynamicTableId: tables[table], data: data as never } });
}

/** Venda de serviço pelo caminho real: POST (Draft) → POST do item → PUT Finalized. Devolve o id e o `data` guardado. */
async function engineSale(date: string): Promise<{ id: string; data: Record<string, unknown> }> {
  const auth = authHeader(user);
  const created = await request(app)
    .post(`/api/dynamic-tables/${tables.sales}/data`)
    .set(auth)
    .send({ data: { status: 'Draft', unitId, customerId, date, totalAmount: 100, subtotal: 100, paymentStatus: 'Pending' } });
  expect(created.status).toBe(201);
  const id: string = created.body.data?.id ?? created.body.id;
  const item = await request(app).post(`/api/dynamic-tables/${tables.saleItems}/data`).set(auth).send({ data: { saleId: id, type: 'Service', serviceId, quantity: 1, unitPrice: 100 } });
  expect(item.status).toBe(201);
  const finalized = await request(app).put(`/api/dynamic-tables/${tables.sales}/data/${id}`).set(auth).send({ data: { status: 'Finalized' } });
  expect(finalized.status).toBe(200);
  const stored = await prisma.dynamicTableData.findUniqueOrThrow({ where: { id } });
  return { id, data: stored.data as Record<string, unknown> };
}

async function entryDay(sourceType: string, sourceId: string): Promise<string> {
  const e = await prisma.journalEntry.findFirstOrThrow({ where: { userId: user.id, unitId, sourceType, sourceId } });
  return e.date.toISOString().slice(0, 10);
}

describe('data do lançamento de venda = o dia ESCRITO (motor grava ISO à meia-noite UTC)', () => {
  beforeAll(async () => {
    pushTestSchema();
    const u = await prisma.user.create({ data: { name: 'sd', username: 'sale-date', email: 'sale-date@test.local', password: 'x', role: 'USER' } });
    user = { id: u.id, username: u.username };
    expect((await request(app).post('/api/dashboard/create').set(authHeader(user)).send({ suiteKey: 'beautySalon', unit: { name: 'Matriz' } })).status).toBe(201);
    const byName = async (n: string) => (await prisma.dynamicTable.findFirstOrThrow({ where: { userId: user.id, internalName: n } })).id;
    tables = { sales: await byName('sales'), saleItems: await byName('saleItems'), services: await byName('services'), customers: await byName('customers'), units: await byName('units') };
    unitId = (await row('units', { name: 'Filial', cnpj: CNPJ })).id;
    await ApplicationFactory.getInstance().getPostingService().ensureChartOfAccounts(resolveAccountingScope({ userId: user.id }, unitId));
    for (const [year, month] of [[2026, 10], [2026, 11], [2026, 12], [2027, 1]]) {
      await prisma.accountingPeriod.create({ data: { userId: user.id, unitId, year, month, status: 'OPEN', openedAt: new Date() } });
    }
    customerId = (await row('customers', { name: 'Ana', email: 'ana@test.local' })).id;
    serviceId = (await row('services', { name: 'Escova', price: 100 })).id;
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('premissa: o motor guarda o campo `date` como ISO à meia-noite UTC (se isto mudar, o teste deixa de provar o que diz)', async () => {
    const sale = await engineSale(DAY);
    expect(String(sale.data.date)).toBe(`${DAY}T00:00:00.000Z`);
  });

  it('a receita de uma venda de serviço leva o dia escrito (25/11), não o anterior (24/11)', async () => {
    const sale = await engineSale(DAY);
    expect(await entryDay('sale.finalized', sale.id)).toBe(DAY);
  });

  it('venda do dia 1º do mês fica no mês da venda: 2026-12-01 não cai em novembro', async () => {
    const sale = await engineSale('2026-12-01');
    expect(await entryDay('sale.finalized', sale.id)).toBe('2026-12-01');
  });

  it('a ponte e a reconciliação lançam a MESMA venda no mesmo dia', async () => {
    const viaBridge = await engineSale(DAY);
    // Mesma venda, escrita como o motor escreve, lançada pela reconciliação (que passa o `date` cru ao evento).
    const other = await row('sales', { ...viaBridge.data, status: 'Finalized' });
    await reconcileSaleSales({
      listFinalizedSales: async () => [{ ownerUserId: user.id, saleId: other.id, unitId, amount: 100, currency: 'BRL', occurredAt: String(viaBridge.data.date) }],
      hasExistingEntry: async () => false,
      sync: (scope, event) => ApplicationFactory.getInstance().getAccountingSyncService().sync(scope, event),
    });
    expect(await entryDay('sale.finalized', other.id)).toBe(await entryDay('sale.finalized', viaBridge.id));
  });

  it('liquidação sem `paidAt` (fallback para `data.date`) é lançada no dia escrito', async () => {
    const sale = await engineSale(DAY);
    await maybeSyncSaleSettled({ userId: user.id }, tables.sales, { id: sale.id, data: { ...sale.data, paymentStatus: 'Paid', paymentMethod: 'Pix' } });
    expect(await entryDay('sale.settled', sale.id)).toBe(DAY);
  });

  it('devolução sem `returnedAt` (fallback para `data.date`) é lançada no dia escrito', async () => {
    const sale = await engineSale(DAY);
    await maybeReverseSale({ userId: user.id }, tables.sales, { id: sale.id, data: { ...sale.data, status: 'Returned' } });
    expect(await entryDay('sale.returned', sale.id)).toBe(DAY);
  });
});

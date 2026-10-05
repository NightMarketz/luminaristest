/**
 * FE-INCR-PACOTE-VALIDADE — achado do revisor independente (B1): o motor DynamicTable grava o campo `date` como ISO à
 * meia-noite UTC (`2026-11-25T00:00:00.000Z`). A ponte `SalePackageSoldBridge` convertia esse instante para o dia anterior
 * em Brasília (`scopeDay`): o saldo vencia 2 dias ANTES do último dia que o cliente aceitou (24/12 × 26/12) e o lançamento
 * de origem saía datado do dia anterior. O e2e do #483 grava a venda direto no Prisma com `YYYY-MM-DD`, então não via.
 *
 * Aqui a venda nasce pelo CAMINHO REAL: POST (Draft) → POST do item → PUT Finalized, e é o controller quem dispara a ponte.
 */
import request from 'supertest';
import prisma from '@/lib/prisma';
import { makeApp, pushTestSchema, authHeader } from '@test/helpers';
import { ApplicationFactory } from '@/lib/factory';
import { resolveAccountingScope } from '@/features/accounting/scope/AccountingScope';
import { lastValidDay } from '@/features/packages/models/validity';

const app = makeApp();
const CNPJ = '11222333000181';
const SALE_DAY = '2026-11-25'; // + 30 = 25/12 (feriado) → 26/12/2026

let user: { id: string; username: string };
let tables: Record<'sales' | 'saleItems' | 'packages' | 'customers' | 'units', string>;
let unitId: string;
let customerId: string;
let packageId: string;

async function row(table: keyof typeof tables, data: Record<string, unknown>) {
  return prisma.dynamicTableData.create({ data: { dynamicTableId: tables[table], data: data as never } });
}

describe('venda de pacote criada pelo motor (date em ISO UTC) — validade do saldo e data do lançamento', () => {
  beforeAll(async () => {
    pushTestSchema();
    const u = await prisma.user.create({ data: { name: 'iso', username: 'pv-iso', email: 'pv-iso@test.local', password: 'x', role: 'USER' } });
    user = { id: u.id, username: u.username };
    expect((await request(app).post('/api/dashboard/create').set(authHeader(user)).send({ suiteKey: 'beautySalon', unit: { name: 'Matriz' } })).status).toBe(201);
    const byName = async (n: string) => (await prisma.dynamicTable.findFirstOrThrow({ where: { userId: user.id, internalName: n } })).id;
    tables = { sales: await byName('sales'), saleItems: await byName('saleItems'), packages: await byName('packages'), customers: await byName('customers'), units: await byName('units') };
    unitId = (await row('units', { name: 'Filial', cnpj: CNPJ })).id;
    const scope = resolveAccountingScope({ userId: user.id }, unitId);
    await ApplicationFactory.getInstance().getPostingService().ensureChartOfAccounts(scope);
    for (const month of [10, 11, 12]) {
      await prisma.accountingPeriod.create({ data: { userId: user.id, unitId, year: 2026, month, status: 'OPEN', openedAt: new Date() } });
    }
    customerId = (await row('customers', { name: 'Ana', email: 'ana@test.local' })).id;
    packageId = (await row('packages', { name: '10 escovas', price: 250, validityDays: 30 })).id;
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('o saldo vence no último dia que o cliente aceitou e o lançamento de origem leva o dia da venda', async () => {
    const auth = authHeader(user);
    const created = await request(app)
      .post(`/api/dynamic-tables/${tables.sales}/data`)
      .set(auth)
      .send({ data: { status: 'Draft', unitId, customerId, date: SALE_DAY, totalAmount: 250, subtotal: 250, paymentStatus: 'Pending' } });
    expect(created.status).toBe(201);
    const saleId: string = created.body.data?.id ?? created.body.id;
    // premissa do achado: o motor guarda o ISO (se isto mudar, o teste deixa de provar o que diz)
    const stored = await prisma.dynamicTableData.findUniqueOrThrow({ where: { id: saleId } });
    expect(String((stored.data as Record<string, unknown>).date)).toBe(`${SALE_DAY}T00:00:00.000Z`);

    const item = await request(app).post(`/api/dynamic-tables/${tables.saleItems}/data`).set(auth).send({ data: { saleId, type: 'Package', packageId, quantity: 1, unitPrice: 250 } });
    expect(item.status).toBe(201);
    const finalized = await request(app).put(`/api/dynamic-tables/${tables.sales}/data/${saleId}`).set(auth).send({ data: { status: 'Finalized' } });
    expect(finalized.status).toBe(200);

    const expected = lastValidDay(SALE_DAY, 30)!; // 2026-12-26: a MESMA regra que o aceite grava
    const balance = await prisma.customerPackageBalance.findFirstOrThrow({ where: { userId: user.id, unitId, customerId, packageId } });
    expect(balance.expiresAt?.toISOString().slice(0, 10)).toBe(expected);

    const entry = await prisma.journalEntry.findFirstOrThrow({ where: { userId: user.id, unitId, sourceType: 'sale.package.sold', sourceId: saleId } });
    expect(entry.date.toISOString().slice(0, 10)).toBe(SALE_DAY);
  });
});

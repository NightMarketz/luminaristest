/**
 * Teste-guarda (GAP-MAP Nível 3) — a comissão materializada ao finalizar a venda nasce SEM a taxa.
 *
 * `sales/commissions.ts` `materializeCommissions` grava a chave `commissionRate`, mas o preset `CommissionsModule`
 * usa o field preset `commissionRate` cujo `name` é `'rate'` (NumberPresets.ts); o motor remove chaves fora do
 * schema (Zod strip), então a linha de `commissions` fica sem taxa.
 *
 * Cenário via API real: `POST /api/dashboard/create` beautySalon → funcionário → produto → entrada manual de estoque →
 * venda Draft → item Product (responsibleEmployeeId, unitPrice 50, commission 10) → `PUT status=Finalized`.
 * Comportamento correto esperado: a linha de `commissions` tem `rate` = 20 (10 / 50 × 100), `amount` = 10,
 * `employeeId`, `saleId` e `saleItemId` do item.
 *
 * Roda via `npm run test:integration` (ou `test:integration:single` com o caminho deste arquivo).
 */
import request from 'supertest';
import prisma from '@/lib/prisma';
import { makeApp, pushTestSchema, authHeader } from '@test/helpers';

const app = makeApp();

type Actor = { id: string; username: string };
let user: Actor;
let unitId: string;
let tables: Record<'employees' | 'products' | 'stockMovements' | 'sales' | 'saleItems' | 'commissions', string>;

const post = (tableId: string, data: Record<string, unknown>) =>
  request(app).post(`/api/dynamic-tables/${tableId}/data`).set(authHeader(user)).send({ data });
const put = (tableId: string, dataId: string, data: Record<string, unknown>) =>
  request(app).put(`/api/dynamic-tables/${tableId}/data/${dataId}`).set(authHeader(user)).send({ data });

describe('SalesPlugin × comissões — Finalized materializa a comissão COM a taxa (via API)', () => {
  let employeeId: string;
  let productId: string;
  let saleId: string;
  let saleItemId: string;

  beforeAll(async () => {
    pushTestSchema();
    const u = await prisma.user.create({ data: { name: 'Dona', username: 'fin-comm', email: 'fin-comm@test.local', password: 'x', role: 'USER' } });
    user = { id: u.id, username: u.username };
    const created = await request(app).post('/api/dashboard/create').set(authHeader(user)).send({ suiteKey: 'beautySalon', unit: { name: 'Matriz' } });
    expect(created.status).toBe(201);
    unitId = created.body.data.unitId;
    const byName = async (n: string) => (await prisma.dynamicTable.findFirstOrThrow({ where: { userId: user.id, internalName: n } })).id;
    tables = {
      employees: await byName('employees'),
      products: await byName('products'),
      stockMovements: await byName('stockMovements'),
      sales: await byName('sales'),
      saleItems: await byName('saleItems'),
      commissions: await byName('commissions'),
    };

    const employee = await post(tables.employees, { name: 'Bia Vendedora', role: 'Vendedora', email: 'bia@salao.local', unitId });
    expect(employee.status).toBe(201);
    employeeId = employee.body.data.id;

    const product = await post(tables.products, { name: 'Shampoo 300ml', usageType: 'Sale' });
    expect(product.status).toBe(201);
    productId = product.body.data.id;
    expect((await post(tables.stockMovements, { productId, unitId, type: 'In', quantity: 10, reason: 'Adjustment' })).status).toBe(201);

    const sale = await post(tables.sales, { unitId, date: '2026-10-19', status: 'Draft', simpleCustomer: true, simpleCustomerName: 'Ana Souza' });
    expect(sale.status).toBe(201);
    saleId = sale.body.data.id;

    const item = await post(tables.saleItems, {
      saleId, type: 'Product', productId, description: 'Shampoo', quantity: 1, unitPrice: 50, responsibleEmployeeId: employeeId, commission: 10,
    });
    expect(item.status).toBe(201);
    saleItemId = item.body.data.id;
  }, 120000);

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('PUT status=Finalized: uma linha em commissions com rate = 20 (10 / 50 × 100), amount 10 e as chaves do item', async () => {
    const fin = await put(tables.sales, saleId, { status: 'Finalized' });
    expect(fin.status).toBe(200);
    expect(fin.body.data.data.status).toBe('Finalized');

    const rows = await prisma.dynamicTableData.findMany({ where: { dynamicTableId: tables.commissions, deletedAt: null } });
    expect(rows).toHaveLength(1);
    expect(rows[0].data).toMatchObject({ employeeId, saleId, saleItemId, amount: 10, status: 'Pending', rate: 20 });
  });
});

/**
 * Teste-guarda (GAP-MAP Nível 3) — o estoque NÃO baixa quando a venda é finalizada.
 *
 * Cenário via API real (mesmo caminho do browser): `POST /api/dashboard/create` instala o preset do salão →
 * produto (o ProductAutoStockPlugin provisiona `productUnits` com stock 0) → entrada manual de 10 em
 * `stockMovements` (StockMovementsApplyPlugin: stock 10) → venda Draft → item Product qty 2 (reserva 2) →
 * `PUT status=Finalized` → `PUT status=Returned`.
 *
 * Comportamento correto esperado: ao finalizar, `stock` 10→8 e `reserved` 2→0; ao devolver, `stock` 8→10.
 * Lacuna lida em `sales/stockSync.ts` (`processSaleStockUpdate`): a "guarda de idempotência" relê a venda já
 * persistida — que em `afterUpdate` JÁ está Finalized — e retorna antes de aplicar o delta.
 *
 * Deliberadamente fora de `plugins.integration.test.ts` (que exclui "stock application on finalize").
 * Roda via `npm run test:integration` (ou `test:integration:single` com o caminho deste arquivo).
 */
import request from 'supertest';
import prisma from '@/lib/prisma';
import { makeApp, pushTestSchema, authHeader } from '@test/helpers';

const app = makeApp();

type Actor = { id: string; username: string };
let user: Actor;
let unitId: string;
let tables: Record<'products' | 'productUnits' | 'stockMovements' | 'sales' | 'saleItems', string>;

const post = (tableId: string, data: Record<string, unknown>) =>
  request(app).post(`/api/dynamic-tables/${tableId}/data`).set(authHeader(user)).send({ data });
const put = (tableId: string, dataId: string, data: Record<string, unknown>) =>
  request(app).put(`/api/dynamic-tables/${tableId}/data/${dataId}`).set(authHeader(user)).send({ data });

/** Lê a linha de productUnits (productId, unitId) como está gravada. */
async function productUnit(productId: string): Promise<{ stock: number; reserved: number }> {
  const rows = await prisma.dynamicTableData.findMany({ where: { dynamicTableId: tables.productUnits, deletedAt: null } });
  const row = rows.find((r) => {
    const d = r.data as Record<string, unknown>;
    return d.productId === productId && d.unitId === unitId;
  });
  if (!row) throw new Error(`productUnits sem linha para (${productId}, ${unitId})`);
  const d = row.data as Record<string, unknown>;
  return { stock: Number(d.stock ?? 0), reserved: Number(d.reserved ?? 0) };
}

describe('SalesPlugin × estoque — Finalized baixa, Returned devolve (via API)', () => {
  let productId: string;
  let saleId: string;

  beforeAll(async () => {
    pushTestSchema();
    const u = await prisma.user.create({ data: { name: 'Dona', username: 'fin-stock', email: 'fin-stock@test.local', password: 'x', role: 'USER' } });
    user = { id: u.id, username: u.username };
    const created = await request(app).post('/api/dashboard/create').set(authHeader(user)).send({ suiteKey: 'beautySalon', unit: { name: 'Matriz' } });
    expect(created.status).toBe(201);
    unitId = created.body.data.unitId;
    const byName = async (n: string) => (await prisma.dynamicTable.findFirstOrThrow({ where: { userId: user.id, internalName: n } })).id;
    tables = {
      products: await byName('products'),
      productUnits: await byName('productUnits'),
      stockMovements: await byName('stockMovements'),
      sales: await byName('sales'),
      saleItems: await byName('saleItems'),
    };

    const product = await post(tables.products, { name: 'Shampoo 300ml', usageType: 'Sale' });
    expect(product.status).toBe(201);
    productId = product.body.data.id;

    // Entrada manual: stock 0 → 10 (StockMovementsApplyPlugin.beforeCreate).
    const entrada = await post(tables.stockMovements, { productId, unitId, type: 'In', quantity: 10, reason: 'Adjustment' });
    expect(entrada.status).toBe(201);
    expect(await productUnit(productId)).toEqual({ stock: 10, reserved: 0 });

    const sale = await post(tables.sales, { unitId, date: '2026-10-19', status: 'Draft', simpleCustomer: true, simpleCustomerName: 'Ana Souza' });
    expect(sale.status).toBe(201);
    saleId = sale.body.data.id;

    // Item de produto qty 2: reserva 2 (adjustReservationForItemChange).
    const item = await post(tables.saleItems, { saleId, type: 'Product', productId, description: 'Shampoo', quantity: 2, unitPrice: 50 });
    expect(item.status).toBe(201);
    expect(await productUnit(productId)).toEqual({ stock: 10, reserved: 2 });
  }, 120000);

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('PUT status=Finalized: stock 10→8 e reserved 2→0', async () => {
    const fin = await put(tables.sales, saleId, { status: 'Finalized' });
    expect(fin.status).toBe(200);
    expect(fin.body.data.data.status).toBe('Finalized');
    expect(await productUnit(productId)).toEqual({ stock: 8, reserved: 0 });
  });

  // A venda Finalized é imutável no PUT genérico (immutableAfter scope:'all'); a devolução vai pela rota
  // dedicada `POST /api/sales/return` (SalesCancellationService, isSystem) — o mesmo caminho do browser.
  it('POST /api/sales/return: stock 8→10 (devolve só o que saiu), reserved segue 0', async () => {
    const ret = await request(app).post('/api/sales/return').set(authHeader(user)).send({ tableId: tables.sales, saleId });
    expect(ret.status).toBe(200);
    const sale = await prisma.dynamicTableData.findUniqueOrThrow({ where: { id: saleId } });
    expect((sale.data as Record<string, unknown>).status).toBe('Returned');
    expect(await productUnit(productId)).toEqual({ stock: 10, reserved: 0 });
  });
});

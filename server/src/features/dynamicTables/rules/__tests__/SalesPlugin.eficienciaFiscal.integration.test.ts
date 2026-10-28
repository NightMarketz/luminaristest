/**
 * EFICIENCIA-FISCAL PR-1 itens 1, 2 e 6 (BRIEF §3; ADR-INCR-EFICIENCIA-FISCAL D4, I-1, I-4, I-4b) pelo caminho real do
 * browser: preset do salão instalado por `POST /api/dashboard/create`, venda e itens pela API genérica, finalize pelo
 * `PUT`, guarda pelo `POST /api/sales/:id/fiscal-check`.
 *  - item 1: os campos novos existem no preset instalado e o custo não entra pela criação (só o guard o grava);
 *  - item 2: finalize com desconto exige discountKind, rateio fechado e preço = catálogo (400 nomeado);
 *  - item 6: o fiscal-check grava `custoSnapshotCents` UMA vez por escrita isSystem numa venda já finalizada.
 */
import request from 'supertest';
import prisma from '@/lib/prisma';
import { makeApp, pushTestSchema, authHeader } from '@test/helpers';

const app = makeApp();

type Actor = { id: string; username: string };
let user: Actor;
let unitId: string;
let tables: Record<'products' | 'stockMovements' | 'sales' | 'saleItems', string>;
let productId: string;

const post = (tableId: string, data: Record<string, unknown>) =>
  request(app).post(`/api/dynamic-tables/${tableId}/data`).set(authHeader(user)).send({ data });
const put = (tableId: string, dataId: string, data: Record<string, unknown>) =>
  request(app).put(`/api/dynamic-tables/${tableId}/data/${dataId}`).set(authHeader(user)).send({ data });
const itemData = async (id: string) => (await prisma.dynamicTableData.findUniqueOrThrow({ where: { id } })).data as Record<string, unknown>;

async function vendaCom(header: Record<string, unknown>, itens: Array<Record<string, unknown>>): Promise<{ saleId: string; itemIds: string[] }> {
  const sale = await post(tables.sales, { unitId, date: '2026-10-19', status: 'Draft', simpleCustomer: true, simpleCustomerName: 'Ana Souza', ...header });
  expect(sale.status).toBe(201);
  const itemIds: string[] = [];
  for (const it of itens) {
    const r = await post(tables.saleItems, { saleId: sale.body.data.id, type: 'Product', productId, description: 'Shampoo', quantity: 1, ...it });
    expect(r.status).toBe(201);
    itemIds.push(r.body.data.id);
  }
  return { saleId: sale.body.data.id, itemIds };
}

beforeAll(async () => {
  pushTestSchema();
  const u = await prisma.user.create({ data: { name: 'Dona', username: 'ef-pr1', email: 'ef-pr1@test.local', password: 'x', role: 'USER' } });
  user = { id: u.id, username: u.username };
  const created = await request(app).post('/api/dashboard/create').set(authHeader(user)).send({ suiteKey: 'beautySalon', unit: { name: 'Matriz' } });
  expect(created.status).toBe(201);
  unitId = created.body.data.unitId;
  const byName = async (n: string) => (await prisma.dynamicTable.findFirstOrThrow({ where: { userId: user.id, internalName: n } })).id;
  tables = { products: await byName('products'), stockMovements: await byName('stockMovements'), sales: await byName('sales'), saleItems: await byName('saleItems') };
  const product = await post(tables.products, { name: 'Shampoo 300ml', usageType: 'Sale' });
  productId = product.body.data.id;
  expect((await post(tables.stockMovements, { productId, unitId, type: 'In', quantity: 50, reason: 'Adjustment' })).status).toBe(201);
  // Custo médio do subrazão de estoque (o que o guard lê): R$ 300 / 10 = R$ 30,00 por unidade.
  await prisma.inventoryItem.create({ data: { userId: user.id, unitId, productRef: productId, qtyOnHand: 10, totalValueCents: 30_000n } });
}, 120000);

afterAll(() => prisma.$disconnect());

describe('item 1 — preset instalado', () => {
  it('saleItems e sales têm os campos novos', async () => {
    const schema = (id: string) => prisma.dynamicTable.findUniqueOrThrow({ where: { id } }).then((t) => (t.schema as { fields: Array<{ name: string }> }).fields.map((f) => f.name));
    expect(await schema(tables.saleItems)).toEqual(expect.arrayContaining(['catalogUnitPrice', 'discountCents', 'custoSnapshotCents', 'kitRef', 'principalItem']));
    expect(await schema(tables.sales)).toContain('discountKind');
  });

  it('o custo enviado na criação é descartado (só o guard grava — I-4b)', async () => {
    const { itemIds } = await vendaCom({}, [{ unitPrice: 50, custoSnapshotCents: 1 }]);
    expect((await itemData(itemIds[0])).custoSnapshotCents).toBeUndefined();
  });
});

describe('item 2 — guarda do finalize', () => {
  it('desconto só no cabeçalho sem discountKind (wizard de hoje) finaliza — dono, 26/10', async () => {
    const { saleId } = await vendaCom({ discountAmount: 10 }, [{ unitPrice: 50 }]);
    expect((await put(tables.sales, saleId, { status: 'Finalized' })).status).toBe(200);
  });

  it('desconto destacado por item sem discountKind ⇒ 400 DESCONTO_SEM_TIPO', async () => {
    const { saleId } = await vendaCom({ discountAmount: 10 }, [{ unitPrice: 50, catalogUnitPrice: 50, discountCents: 1_000 }]);
    const r = await put(tables.sales, saleId, { status: 'Finalized' });
    expect(r.status).toBe(400);
    expect(r.body.code).toBe('DESCONTO_SEM_TIPO');
  });

  it('preço abaixo do catálogo sem desconto destacado ⇒ 400 PRECO_DIFERENTE_DO_CATALOGO_SEM_DESCONTO', async () => {
    const { saleId } = await vendaCom({}, [{ unitPrice: 40, catalogUnitPrice: 50 }]);
    const r = await put(tables.sales, saleId, { status: 'Finalized' });
    expect(r.status).toBe(400);
    expect(r.body.code).toBe('PRECO_DIFERENTE_DO_CATALOGO_SEM_DESCONTO');
  });

  it('Σ descontos dos itens ≠ desconto da venda ⇒ 400 RATEIO_NAO_FECHA', async () => {
    const { saleId } = await vendaCom({ discountAmount: 30, discountKind: 'UNCONDITIONAL' }, [
      { unitPrice: 50, catalogUnitPrice: 50, discountCents: 1_000 },
      { unitPrice: 50, catalogUnitPrice: 50, discountCents: 1_000 },
    ]);
    const r = await put(tables.sales, saleId, { status: 'Finalized' });
    expect(r.status).toBe(400);
    expect(r.body.code).toBe('RATEIO_NAO_FECHA');
  });
});

describe('item 6 — fiscal-check na venda finalizada', () => {
  it('grava o custo médio uma vez (isSystem), não recalcula e devolve a guarda', async () => {
    const { saleId, itemIds } = await vendaCom({ discountAmount: 20, discountKind: 'UNCONDITIONAL' }, [
      { unitPrice: 50, catalogUnitPrice: 50, discountCents: 1_000 },
      { unitPrice: 50, catalogUnitPrice: 50, discountCents: 1_000 },
    ]);
    expect((await put(tables.sales, saleId, { status: 'Finalized' })).status).toBe(200);

    const r = await request(app).post(`/api/sales/${saleId}/fiscal-check`).set(authHeader(user)).send({});
    expect(r.status).toBe(200);
    expect(r.body.data).toMatchObject({ saleId, ok: true, criterio: 'PROPORCIONAL_CATALOGO', economiaPotencialCents: null, suggestionId: null });
    expect(r.body.data.alocacao).toEqual(
      itemIds.map((itemRef) => ({ itemRef, discountCents: '1000', pisoCents: '3000', cargaBp: null })).sort((a, b) => (a.itemRef < b.itemRef ? -1 : 1)),
    );
    expect((await itemData(itemIds[0])).custoSnapshotCents).toBe(3_000);

    // O custo médio muda depois; o snapshot da venda não (I-4b).
    await prisma.inventoryItem.updateMany({ where: { userId: user.id, productRef: productId }, data: { totalValueCents: 90_000n } });
    await request(app).post(`/api/sales/${saleId}/fiscal-check`).set(authHeader(user)).send({});
    expect((await itemData(itemIds[0])).custoSnapshotCents).toBe(3_000);
    await prisma.inventoryItem.updateMany({ where: { userId: user.id, productRef: productId }, data: { totalValueCents: 30_000n } });

    // Item de venda finalizada continua imutável pela API genérica.
    expect((await put(tables.saleItems, itemIds[0], { custoSnapshotCents: 1 })).status).toBe(400);
  });

  it('corpo com chave desconhecida ⇒ 400; venda inexistente ⇒ 404', async () => {
    const { saleId } = await vendaCom({}, [{ unitPrice: 50 }]);
    expect((await request(app).post(`/api/sales/${saleId}/fiscal-check`).set(authHeader(user)).send({ x: 1 })).status).toBe(400);
    expect((await request(app).post('/api/sales/nao-existe/fiscal-check').set(authHeader(user)).send({})).status).toBe(404);
  });
});

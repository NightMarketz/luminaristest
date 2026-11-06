/**
 * Teste-guarda VP-1b — o subtotal da venda ignora a quantidade do serviço.
 *
 * Decisão do dono, chat, 2026-11-04 (pergunta do handoff da orquestradora): *"serviço vendido com quantidade deve contar a
 * quantidade"*. As pontes contábeis já seguem `quantity × unitPrice` (`lib/saleLine.ts`); o `SalesPlugin` contava serviço
 * como 1 — divergência registrada no review do #913 e mantida no VP-1 (#1052), que só corrigiu o pacote.
 *
 * Cenário via API real, irmão do `SalesPlugin.packageQuantity.integration.test.ts`: `POST /api/dashboard/create` instala o
 * preset do salão → serviço no catálogo (R$ 100) → venda Draft → item Service `quantity: 2`, `unitPrice: 100` →
 * `PUT status=Finalized`. Esperado: `subtotal` = 200 (e a guarda "desconto ≤ subtotal" compara contra 200).
 *
 * Roda um arquivo por vez: `npx jest <este caminho> --selectProjects integration --runInBand`.
 */
import request from 'supertest';
import prisma from '@/lib/prisma';
import { makeApp, pushTestSchema, authHeader } from '@test/helpers';

const app = makeApp();

type Actor = { id: string; username: string };
let user: Actor;
let unitId: string;
let serviceId: string;
let tables: Record<'services' | 'sales' | 'saleItems', string>;

const post = (tableId: string, data: Record<string, unknown>) =>
  request(app).post(`/api/dynamic-tables/${tableId}/data`).set(authHeader(user)).send({ data });
const put = (tableId: string, dataId: string, data: Record<string, unknown>) =>
  request(app).put(`/api/dynamic-tables/${tableId}/data/${dataId}`).set(authHeader(user)).send({ data });

/** Venda Draft com um item Service de quantidade 2 × R$ 100. */
async function draftServiceSale(): Promise<string> {
  const sale = await post(tables.sales, { unitId, date: '2026-11-04', status: 'Draft', simpleCustomer: true, simpleCustomerName: 'Cliente VP-1b' });
  expect(sale.status).toBe(201);
  const item = await post(tables.saleItems, { saleId: sale.body.data.id, type: 'Service', serviceId, description: 'Escova', quantity: 2, unitPrice: 100 });
  expect(item.status).toBe(201);
  return sale.body.data.id;
}

/** Cabeçalho da venda como está gravado (depois do `afterUpdate`). */
async function saleHeader(saleId: string): Promise<Record<string, unknown>> {
  const row = await prisma.dynamicTableData.findUniqueOrThrow({ where: { id: saleId } });
  return row.data as Record<string, unknown>;
}

describe('SalesPlugin × serviço — subtotal conta a quantidade (VP-1b, via API)', () => {
  beforeAll(async () => {
    pushTestSchema();
    const u = await prisma.user.create({ data: { name: 'Dona', username: 'vp1b-svc-qty', email: 'vp1b-svc-qty@test.local', password: 'x', role: 'USER' } });
    user = { id: u.id, username: u.username };
    const created = await request(app).post('/api/dashboard/create').set(authHeader(user)).send({ suiteKey: 'beautySalon', unit: { name: 'Matriz' } });
    expect(created.status).toBe(201);
    unitId = created.body.data.unitId;
    const byName = async (n: string) => (await prisma.dynamicTable.findFirstOrThrow({ where: { userId: user.id, internalName: n } })).id;
    tables = { services: await byName('services'), sales: await byName('sales'), saleItems: await byName('saleItems') };

    const svc = await post(tables.services, { name: 'Escova', category: 'Cabelo', duration: 60, price: 100 });
    expect({ status: svc.status, body: svc.status === 201 ? 'ok' : svc.body }).toEqual({ status: 201, body: 'ok' });
    serviceId = svc.body.data.id;
  }, 120000);

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('PUT status=Finalized: item Service 2 × 100 grava subtotal 200 e totalAmount 200', async () => {
    const saleId = await draftServiceSale();
    const fin = await put(tables.sales, saleId, { status: 'Finalized' });
    expect(fin.status).toBe(200);
    const header = await saleHeader(saleId);
    expect(header.status).toBe('Finalized');
    expect({ subtotal: header.subtotal, totalAmount: header.totalAmount }).toEqual({ subtotal: 200, totalAmount: 200 });
  });

  it('PUT status=Finalized com desconto 150: aceito (150 ≤ 200), totalAmount 50', async () => {
    const saleId = await draftServiceSale();
    const fin = await put(tables.sales, saleId, { status: 'Finalized', discountAmount: 150 });
    // O corpo entra na comparação para a falha mostrar a mensagem de recusa, não só o 400.
    expect({ status: fin.status, body: fin.status === 200 ? 'ok' : fin.body }).toEqual({ status: 200, body: 'ok' });
    const header = await saleHeader(saleId);
    expect({ subtotal: header.subtotal, totalAmount: header.totalAmount }).toEqual({ subtotal: 200, totalAmount: 50 });
  });
});

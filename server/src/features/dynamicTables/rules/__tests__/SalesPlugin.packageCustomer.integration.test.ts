/**
 * Teste-guarda INV F-14.2 — venda de pacote sem cliente cadastrado: o servidor finaliza (aceita "cliente simples"), a ponte
 * lança o passivo (D 1.1.2 / C 2.1.1) e pula o crédito de saldo — passivo sem saldo de ninguém para consumir. Só a tela exige
 * cliente (`packageSale.ts:60`).
 *
 * Ficha: `git show f5f70b03f:docs/estruturas-implicitas/INVENTARIO-INV.md` (INV-14, F-14.2). Ação: a guarda do finalizar exige
 * `customerId` quando a venda é só de pacote.
 *
 * Cenário via API real (preset do salão): venda Draft com "cliente simples" → item Package → `PUT status=Finalized`.
 * Esperado: 400 e a venda continua Draft.
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
let packageId: string;
let tables: Record<'packages' | 'sales' | 'saleItems', string>;

const post = (tableId: string, data: Record<string, unknown>) =>
  request(app).post(`/api/dynamic-tables/${tableId}/data`).set(authHeader(user)).send({ data });
const put = (tableId: string, dataId: string, data: Record<string, unknown>) =>
  request(app).put(`/api/dynamic-tables/${tableId}/data/${dataId}`).set(authHeader(user)).send({ data });

describe('SalesPlugin × pacote — finalizar exige cliente cadastrado (INV F-14.2, via API)', () => {
  beforeAll(async () => {
    pushTestSchema();
    const u = await prisma.user.create({ data: { name: 'Dona', username: 'inv-f14-2', email: 'inv-f14-2@test.local', password: 'x', role: 'USER' } });
    user = { id: u.id, username: u.username };
    const created = await request(app).post('/api/dashboard/create').set(authHeader(user)).send({ suiteKey: 'beautySalon', unit: { name: 'Matriz' } });
    expect(created.status).toBe(201);
    unitId = created.body.data.unitId;
    const byName = async (n: string) => (await prisma.dynamicTable.findFirstOrThrow({ where: { userId: user.id, internalName: n } })).id;
    tables = { packages: await byName('packages'), sales: await byName('sales'), saleItems: await byName('saleItems') };
    const pkg = await post(tables.packages, { name: 'Pacote 10 escovas', price: 320 });
    expect(pkg.status).toBe(201);
    packageId = pkg.body.data.id;
  }, 120000);

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('INV F-14.2: PUT Finalized de venda só de pacote com "cliente simples" → 400, venda fica Draft', async () => {
    const sale = await post(tables.sales, { unitId, date: '2026-11-10', status: 'Draft', simpleCustomer: true, simpleCustomerName: 'Cliente F-14.2' });
    expect(sale.status).toBe(201);
    const item = await post(tables.saleItems, { saleId: sale.body.data.id, type: 'Package', packageId, description: 'Pacote 10 escovas', quantity: 1, unitPrice: 320 });
    expect(item.status).toBe(201);

    const fin = await put(tables.sales, sale.body.data.id, { status: 'Finalized' });
    const header = (await prisma.dynamicTableData.findUniqueOrThrow({ where: { id: sale.body.data.id } })).data as Record<string, unknown>;
    expect({ status: fin.status, saleStatus: header.status }).toEqual({ status: 400, saleStatus: 'Draft' });
  });
});

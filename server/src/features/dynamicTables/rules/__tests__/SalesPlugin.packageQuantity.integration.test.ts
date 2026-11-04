/**
 * Teste-guarda VP-1 (runbook VENDA-PACOTE, passo 5 — PR #1035) — o subtotal da venda ignora a quantidade do pacote.
 *
 * Cenário via API real (mesmo caminho do browser): `POST /api/dashboard/create` instala o preset do salão → pacote no
 * catálogo (R$ 320) → venda Draft → item Package `quantity: 2`, `unitPrice: 320` → `PUT status=Finalized`.
 *
 * Comportamento correto esperado: o `afterUpdate` grava `subtotal` = Σ quantidade × preço = 640 (e `totalAmount` = 640 −
 * desconto), o mesmo valor que o lançamento `sale.package.sold` e o saldo do cliente levaram no runbook; e a validação
 * "desconto ≤ subtotal" do `beforeUpdate` compara contra esse mesmo 640.
 * Lacuna lida em `SalesPlugin.ts` (`afterUpdate` ~323 e `beforeUpdate` ~153): `qty = isProduct ? quantity : 1` — linha
 * de pacote vale sempre 1 (grava 320; desconto de 500 é recusado como maior que o subtotal).
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

/** Venda Draft com um item Package de quantidade 2 × R$ 320. */
async function draftPackageSale(): Promise<string> {
  const sale = await post(tables.sales, { unitId, date: '2026-11-04', status: 'Draft', simpleCustomer: true, simpleCustomerName: 'Cliente H2' });
  expect(sale.status).toBe(201);
  const item = await post(tables.saleItems, { saleId: sale.body.data.id, type: 'Package', packageId, description: 'Pacote 10 escovas', quantity: 2, unitPrice: 320 });
  expect(item.status).toBe(201);
  return sale.body.data.id;
}

/** Cabeçalho da venda como está gravado (depois do `afterUpdate`). */
async function saleHeader(saleId: string): Promise<Record<string, unknown>> {
  const row = await prisma.dynamicTableData.findUniqueOrThrow({ where: { id: saleId } });
  return row.data as Record<string, unknown>;
}

describe('SalesPlugin × pacote — subtotal conta a quantidade (VP-1, via API)', () => {
  beforeAll(async () => {
    pushTestSchema();
    const u = await prisma.user.create({ data: { name: 'Dona', username: 'vp1-pkg-qty', email: 'vp1-pkg-qty@test.local', password: 'x', role: 'USER' } });
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

  it('PUT status=Finalized: item Package 2 × 320 grava subtotal 640 e totalAmount 640', async () => {
    const saleId = await draftPackageSale();
    const fin = await put(tables.sales, saleId, { status: 'Finalized' });
    expect(fin.status).toBe(200);
    const header = await saleHeader(saleId);
    expect(header.status).toBe('Finalized');
    expect({ subtotal: header.subtotal, totalAmount: header.totalAmount }).toEqual({ subtotal: 640, totalAmount: 640 });
  });

  it('PUT status=Finalized com desconto 500: aceito (500 ≤ 640), totalAmount 140', async () => {
    const saleId = await draftPackageSale();
    const fin = await put(tables.sales, saleId, { status: 'Finalized', discountAmount: 500 });
    // O corpo entra na comparação para a falha mostrar a mensagem de recusa, não só o 400.
    expect({ status: fin.status, body: fin.status === 200 ? 'ok' : fin.body }).toEqual({ status: 200, body: 'ok' });
    const header = await saleHeader(saleId);
    expect({ subtotal: header.subtotal, totalAmount: header.totalAmount }).toEqual({ subtotal: 640, totalAmount: 140 });
  });
});

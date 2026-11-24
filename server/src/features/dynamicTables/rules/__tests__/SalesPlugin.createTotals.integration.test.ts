/**
 * Teste-guarda INV F-40.1 — na criação da venda o servidor grava o `subtotal` e o `totalAmount` que o cliente mandou.
 *
 * Ficha: `git show f5f70b03f:docs/estruturas-implicitas/INVENTARIO-INV.md` (INV-40, F-40.1). Decisão do dono (questionário,
 * 2026-11-10, Q-11): a criação só aceita rascunho de quem não é o sistema, e o servidor ignora os totais recebidos na criação —
 * quem calcula é o recálculo do `SalesPlugin` na atualização (`afterUpdate`), a partir dos itens gravados.
 *
 * Cenário via API real (mesmo preset do `SalesPlugin.serviceQuantity.integration.test.ts`): `POST` de venda Draft, sem itens,
 * com `subtotal` e `totalAmount` 500. Esperado: o cabeçalho gravado tem os dois em 0.
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
let salesTableId: string;

describe('SalesPlugin × criação da venda — totais do cliente (INV F-40.1, via API)', () => {
  beforeAll(async () => {
    pushTestSchema();
    const u = await prisma.user.create({ data: { name: 'Dona', username: 'inv-f40-1', email: 'inv-f40-1@test.local', password: 'x', role: 'USER' } });
    user = { id: u.id, username: u.username };
    const created = await request(app).post('/api/dashboard/create').set(authHeader(user)).send({ suiteKey: 'beautySalon', unit: { name: 'Matriz' } });
    expect(created.status).toBe(201);
    unitId = created.body.data.unitId;
    salesTableId = (await prisma.dynamicTable.findFirstOrThrow({ where: { userId: user.id, internalName: 'sales' } })).id;
  }, 120000);

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('INV F-40.1: POST de venda ignora subtotal e totalAmount recebidos (grava 0)', async () => {
    const sale = await request(app)
      .post(`/api/dynamic-tables/${salesTableId}/data`)
      .set(authHeader(user))
      .send({ data: { unitId, date: '2026-11-10', status: 'Draft', simpleCustomer: true, simpleCustomerName: 'Cliente F-40.1', subtotal: 500, totalAmount: 500 } });
    expect({ status: sale.status, body: sale.status === 201 ? 'ok' : sale.body }).toEqual({ status: 201, body: 'ok' });
    const row = await prisma.dynamicTableData.findUniqueOrThrow({ where: { id: sale.body.data.id } });
    const header = row.data as Record<string, unknown>;
    expect({ subtotal: header.subtotal, totalAmount: header.totalAmount }).toEqual({ subtotal: 0, totalAmount: 0 });
  });
});

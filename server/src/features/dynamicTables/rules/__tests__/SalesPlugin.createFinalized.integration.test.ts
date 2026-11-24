/**
 * Teste-guarda INV F-40.2 — venda criada já `Finalized` pula as guardas do finalizar (item, desconto, cliente, agendamento,
 * estoque) e os efeitos da transição (baixa de estoque, comissão), e a ponte lança a receita.
 *
 * Ficha: `git show f5f70b03f:docs/estruturas-implicitas/INVENTARIO-INV.md` (INV-40, F-40.2). Decisão do dono (questionário,
 * 2026-11-10, Q-11): a criação só aceita rascunho de quem não é o sistema; o `POST` recusa `Finalized` de fora do sistema.
 *
 * Cenário via API real: `POST` de venda `Finalized`, sem itens. Esperado: 400 e nenhuma linha de venda gravada.
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

describe('SalesPlugin × criação já finalizada (INV F-40.2, via API)', () => {
  beforeAll(async () => {
    pushTestSchema();
    const u = await prisma.user.create({ data: { name: 'Dona', username: 'inv-f40-2', email: 'inv-f40-2@test.local', password: 'x', role: 'USER' } });
    user = { id: u.id, username: u.username };
    const created = await request(app).post('/api/dashboard/create').set(authHeader(user)).send({ suiteKey: 'beautySalon', unit: { name: 'Matriz' } });
    expect(created.status).toBe(201);
    unitId = created.body.data.unitId;
    salesTableId = (await prisma.dynamicTable.findFirstOrThrow({ where: { userId: user.id, internalName: 'sales' } })).id;
  }, 120000);

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('INV F-40.2: POST de venda com status Finalized de fora do sistema → 400, nada gravado', async () => {
    const sale = await request(app)
      .post(`/api/dynamic-tables/${salesTableId}/data`)
      .set(authHeader(user))
      .send({ data: { unitId, date: '2026-11-10', status: 'Finalized', simpleCustomer: true, simpleCustomerName: 'Cliente F-40.2', totalAmount: 500 } });
    const rows = await prisma.dynamicTableData.count({ where: { dynamicTableId: salesTableId, deletedAt: null } });
    expect({ status: sale.status, rows }).toEqual({ status: 400, rows: 0 });
  });
});

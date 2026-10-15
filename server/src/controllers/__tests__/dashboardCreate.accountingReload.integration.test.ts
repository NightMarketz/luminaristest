/**
 * BE-INCR-ONBOARDING-ACTIVATION (nó I4) item 13 — A PROVA DO NÓ (F-I4-4 a): `POST /dashboard/create` (salão, bloco
 * fiscal derivável) → venda finalizada pelo caminho normal de escrita, SEM reiniciar o processo → existe `JournalEntry`
 * `sale.finalized` da venda. O controller do onboarding recarrega os mappers pela MESMA cadeia serializada da LAC-B
 * (`reloadAccountingMappersSerialized`).
 *
 * O registro começa como no boot real: `initializeAccountingSyncFromBindings()` sobre o banco, com o binding de OUTRO
 * tenant (o feeder não aborta por "nenhum Active"). Sem a recarga, a unidade nova fica sem mapper e o teste reprova
 * (BRIEF §9: falsificador rodado nesta execução).
 */
import request from 'supertest';
import prisma from '@/lib/prisma';
import { makeApp, pushTestSchema, authHeader } from '@test/helpers';
import { ApplicationFactory } from '@/lib/factory';
import { SALE_BINDING_V1 } from '@/features/accountingBinding/fixtures/saleBinding';

const app = makeApp();

let user: { id: string; username: string };
let tables: Record<'sales' | 'saleItems' | 'services' | 'customers', string>;
let unitId: string;
let customerId: string;
let serviceId: string;

async function row(table: keyof typeof tables, data: Record<string, unknown>) {
  return prisma.dynamicTableData.create({ data: { dynamicTableId: tables[table], data: data as never } });
}

/** Venda de serviço pelo caminho real (mesmo roteiro de `activateDefault.reload.integration.test.ts`). */
async function engineSale(date: string): Promise<string> {
  const auth = authHeader(user);
  const created = await request(app)
    .post(`/api/dynamic-tables/${tables.sales}/data`)
    .set(auth)
    .send({ data: { status: 'Draft', unitId, customerId, date, totalAmount: 100, subtotal: 100, paymentStatus: 'Pending' } });
  expect(created.status).toBe(201);
  const id: string = created.body.data?.id ?? created.body.id;
  const item = await request(app)
    .post(`/api/dynamic-tables/${tables.saleItems}/data`)
    .set(auth)
    .send({ data: { saleId: id, type: 'Service', serviceId, quantity: 1, unitPrice: 100 } });
  expect(item.status).toBe(201);
  const finalized = await request(app).put(`/api/dynamic-tables/${tables.sales}/data/${id}`).set(auth).send({ data: { status: 'Finalized' } });
  expect(finalized.status).toBe(200);
  return id;
}

describe('I4 item 13 — o onboarding recarrega os mappers: a 1ª venda lança sem reiniciar', () => {
  beforeAll(async () => {
    pushTestSchema();
    const u = await prisma.user.create({ data: { name: 'i4r', username: 'i4-reload', email: 'i4-reload@test.local', password: 'x', role: 'USER' } });
    user = { id: u.id, username: u.username };

    // Boot real: registro montado a partir do banco. O binding de outro tenant só evita o NoActiveAccountingBindingsError.
    const outro = await prisma.user.create({ data: { name: 'o', username: 'i4-reload-outro', email: 'i4-reload-outro@test.local', password: 'x', role: 'USER' } });
    await prisma.accountingBinding.create({
      data: {
        userId: outro.id,
        unitId: 'unit-outro-tenant',
        sectorKey: 'beautySalon',
        bindingVersion: 1,
        compiledAt: new Date(),
        compiledFromHash: 'sha256:outro-tenant',
        payload: JSON.stringify(SALE_BINDING_V1),
        status: 'Active',
        createdById: outro.id,
      },
    });
    await ApplicationFactory.getInstance().initializeAccountingSyncFromBindings();
  }, 120000);

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('POST /dashboard/create (salão, PRESUMIDO, icms "não") ⇒ Active, e a venda finalizada em seguida tem JournalEntry sale.finalized', async () => {
    const res = await request(app)
      .post('/api/dashboard/create')
      .set(authHeader(user))
      .send({ suiteKey: 'beautySalon', unit: { name: 'Matriz' }, fiscal: { regime: 'PRESUMIDO', icmsContribuinte: false } });
    expect(res.status).toBe(201);
    expect(res.body.data.accounting.status).toBe('Active');
    unitId = res.body.data.unitId;
    expect(ApplicationFactory.getInstance().getAccountingSyncService().hasMapper(unitId, 'sale.finalized')).toBe(true);

    const byName = async (name: string) => (await prisma.dynamicTable.findFirstOrThrow({ where: { userId: user.id, internalName: name } })).id;
    tables = { sales: await byName('sales'), saleItems: await byName('saleItems'), services: await byName('services'), customers: await byName('customers') };
    customerId = (await row('customers', { name: 'Ana', email: 'ana@test.local' })).id;
    serviceId = (await row('services', { name: 'Escova', price: 100 })).id;

    const saleId = await engineSale(new Date().toISOString().slice(0, 10));
    const entry = await prisma.journalEntry.findFirst({ where: { userId: user.id, unitId, sourceType: 'sale.finalized', sourceId: saleId } });
    expect(entry).not.toBeNull();
  }, 120000);
});

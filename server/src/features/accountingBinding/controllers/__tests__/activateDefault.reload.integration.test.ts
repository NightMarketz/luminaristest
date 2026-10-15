/**
 * LAC-B PR-0 — a PROVA da EMENDA-1 item 0b (F-BA-2 → b): depois de `POST /accounting-binding/activate-default` devolver
 * `Active`, uma venda da unidade finalizada pelo caminho normal (POST Draft → item → PUT Finalized; o controller dispara
 * a ponte) é lançada SEM reiniciar o processo.
 *
 * O registro começa como no boot real: `initializeAccountingSyncFromBindings()` sobre o banco (com o binding de OUTRO
 * tenant, para o feeder não abortar por "nenhum Active"). A premissa confere que a unidade nova nasce SEM mapper — sem
 * ela o teste passaria com o registro de bootstrap do construtor e não provaria a recarga.
 */
import request from 'supertest';
import prisma from '@/lib/prisma';
import { makeApp, pushTestSchema, authHeader } from '@test/helpers';
import { ApplicationFactory } from '@/lib/factory';
import { SALE_BINDING_V1 } from '@/features/accountingBinding/fixtures/saleBinding';

const app = makeApp();

let user: { id: string; username: string };
let tables: Record<'sales' | 'saleItems' | 'services' | 'customers' | 'units', string>;
let unitId: string;
let customerId: string;
let serviceId: string;

async function row(table: keyof typeof tables, data: Record<string, unknown>) {
  return prisma.dynamicTableData.create({ data: { dynamicTableId: tables[table], data: data as never } });
}

/** Venda de serviço pelo caminho real (mesmo roteiro de `saleDateAsWritten.integration.test.ts`). */
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

describe('LAC-B PR-0 — activate-default recarrega os mappers: a venda lança sem reiniciar', () => {
  beforeAll(async () => {
    pushTestSchema();
    const u = await prisma.user.create({ data: { name: 'rl', username: 'lacb-reload', email: 'lacb-reload@test.local', password: 'x', role: 'USER' } });
    user = { id: u.id, username: u.username };
    expect((await request(app).post('/api/dashboard/create').set(authHeader(user)).send({ suiteKey: 'beautySalon', unit: { name: 'Matriz' } })).status).toBe(201);
    const byName = async (n: string) => (await prisma.dynamicTable.findFirstOrThrow({ where: { userId: user.id, internalName: n } })).id;
    tables = { sales: await byName('sales'), saleItems: await byName('saleItems'), services: await byName('services'), customers: await byName('customers'), units: await byName('units') };
    unitId = (await row('units', { name: 'Filial', cnpj: '11222333000181' })).id;
    customerId = (await row('customers', { name: 'Ana', email: 'ana@test.local' })).id;
    serviceId = (await row('services', { name: 'Escova', price: 100 })).id;
    // E-5: o kit vigente preenche contas do perfil fiscal — o perfil vem antes.
    await prisma.fiscalProfile.create({ data: { userId: user.id, unitId, regimeTributario: 'PRESUMIDO', pisCofinsRegime: 'CUMULATIVO', d1fConfirmado: false } });

    // Boot real: registro montado a partir do banco. O binding de outro tenant só evita o NoActiveAccountingBindingsError.
    const outro = await prisma.user.create({ data: { name: 'o', username: 'lacb-reload-outro', email: 'lacb-reload-outro@test.local', password: 'x', role: 'USER' } });
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

  it('premissa: a unidade nova nasce sem mapper (sem isso o teste não prova a recarga)', () => {
    expect(ApplicationFactory.getInstance().getAccountingSyncService().hasMapper(unitId, 'sale.finalized')).toBe(false);
  });

  it('POST activate-default (salão) ⇒ Active, e a venda finalizada em seguida tem JournalEntry sale.finalized', async () => {
    const res = await request(app)
      .post('/api/accounting-binding/activate-default')
      .set(authHeader(user))
      .send({ unitId, installChartIfEmpty: true, openCurrentPeriodIfMissing: true });
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('Active');

    const saleId = await engineSale(new Date().toISOString().slice(0, 10));
    const entry = await prisma.journalEntry.findFirst({ where: { userId: user.id, unitId, sourceType: 'sale.finalized', sourceId: saleId } });
    expect(entry).not.toBeNull();
  });
});

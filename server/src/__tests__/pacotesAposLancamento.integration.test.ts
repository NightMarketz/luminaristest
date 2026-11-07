/**
 * BE-INCR-MODULOS-BASE-SUBMODULOS PR-5, item 29 (F-MS-5 a: "sem caminho novo") — Pacotes depois do 1º lançamento.
 *
 * O PR-5 destrava VEN-PAC no onboarding (item 28, F-MB-5). Este teste prova que, depois que uma venda de pacote foi
 * lançada na contabilidade, as guardas que JÁ existem seguram a tabela e a linha:
 *  - apagar a tabela `packages`: não há rota de exclusão de tabela; o único caminho é o reset do sistema
 *    (`DELETE /api/dashboard/system`), que com movimento contábil responde 409 `SYSTEM_RESET_BLOCKED_BY_ACCOUNTING`
 *    e deixa as tabelas dinâmicas no lugar (BE-INCR-RESET-CONSISTENTE item 13);
 *  - apagar a linha do pacote vendido: recusado pela constraint `RESTRICT` de `saleItems.packageId`.
 *
 * Fluxo real: preset do salão por `POST /api/dashboard/create`; venda de pacote pela PONTE
 * (`maybeSyncSalePackageSold`), como em `pacoteValidade.e2e.integration.test.ts`.
 */
import request from 'supertest';
import prisma from '@/lib/prisma';
import { makeApp, pushTestSchema, authHeader } from '@test/helpers';
import { ApplicationFactory } from '@/lib/factory';
import { resolveAccountingScopeInternal } from '@/features/accounting/scope/resolveAccountingScopeInternal';
import { scopeToday } from '@/features/accounting/models/dates';
import { maybeSyncSalePackageSold } from '@/features/accounting/sync/bridges/SalePackageSoldBridge';

const app = makeApp();
const CPF = '11144477735'; // DV válido
const CNPJ = '11222333000181'; // DV válido

let user: { id: string; username: string };
let tables: Record<'sales' | 'saleItems' | 'packages' | 'customers' | 'units', string>;

/** Grava a linha como o motor grava a data (ISO à meia-noite UTC). */
async function row(table: keyof typeof tables, data: Record<string, unknown>) {
  const stored = typeof data.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(data.date) ? { ...data, date: `${data.date}T00:00:00.000Z` } : data;
  return prisma.dynamicTableData.create({ data: { dynamicTableId: tables[table], data: stored as never } });
}

describe('PR-5 item 29 — Pacotes depois do 1º lançamento (guardas atuais)', () => {
  let packageId: string;

  beforeAll(async () => {
    pushTestSchema();
    const u = await prisma.user.create({ data: { name: 'pac', username: 'pac-pr5', email: 'pac-pr5@test.local', password: 'x', role: 'USER' } });
    user = { id: u.id, username: u.username };
    const created = await request(app).post('/api/dashboard/create').set(authHeader(user)).send({ suiteKey: 'beautySalon', unit: { name: 'Matriz' } });
    expect(created.status).toBe(201);
    const byName = async (n: string) => (await prisma.dynamicTable.findFirstOrThrow({ where: { userId: user.id, internalName: n } })).id;
    tables = {
      sales: await byName('sales'),
      saleItems: await byName('saleItems'),
      packages: await byName('packages'),
      customers: await byName('customers'),
      units: await byName('units'),
    };

    const unit = await row('units', { name: 'Loja', cnpj: CNPJ });
    const scope = resolveAccountingScopeInternal({ userId: user.id }, unit.id);
    await ApplicationFactory.getInstance().getPostingService().ensureChartOfAccounts(scope);
    const today = scopeToday(scope);
    await prisma.accountingPeriod.create({
      data: { userId: user.id, unitId: unit.id, year: Number(today.slice(0, 4)), month: Number(today.slice(5, 7)), status: 'OPEN', openedAt: new Date() },
    });

    const customerId = (await row('customers', { name: 'Cliente', taxId: CPF })).id;
    packageId = (await row('packages', { name: '10 escovas', price: 100, validityDays: 30 })).id;
    const sale = await row('sales', { status: 'Finalized', unitId: unit.id, customerId, totalAmount: 100, currency: 'BRL', date: today, paymentStatus: 'Pending' });
    await row('saleItems', { saleId: sale.id, type: 'Package', packageId, quantity: 1, unitPrice: 100 });
    await maybeSyncSalePackageSold({ userId: user.id }, tables.sales, { id: sale.id, data: sale.data });

    // pré-condição: a venda de pacote foi lançada
    expect(await prisma.journalEntry.count({ where: { userId: user.id, unitId: unit.id } })).toBeGreaterThan(0);
  }, 120000);

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('apagar a tabela packages é recusado: reset do sistema → 409 com movimento e a tabela continua lá', async () => {
    const res = await request(app).delete('/api/dashboard/system').set(authHeader(user));
    expect(res.status).toBe(409);
    expect(res.body.errorCode ?? res.body.code ?? JSON.stringify(res.body)).toMatch(/SYSTEM_RESET_BLOCKED_BY_ACCOUNTING/);
    expect(await prisma.dynamicTable.count({ where: { id: tables.packages } })).toBe(1);
  });

  it('apagar a linha do pacote vendido é recusado (saleItems.packageId RESTRICT) e a linha fica', async () => {
    const res = await request(app).delete(`/api/dynamic-tables/${tables.packages}/data/${packageId}`).set(authHeader(user));
    expect(res.status).toBeGreaterThanOrEqual(400);
    expect(res.status).toBeLessThan(500);
    expect(await prisma.dynamicTableData.count({ where: { id: packageId, deletedAt: null } })).toBe(1);
  });
});

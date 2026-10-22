/**
 * Teste-guarda (sessao-instrumentacao) — cancelar uma venda Finalized deixa lançamentos de pé.
 *
 * Autorização do dono (chat, 22/10/2026): "Autorizo: sessão de instrumentação para o cancelamento de venda que não
 * estorna sale.cogs nem sale.package.sold e não devolve o saldo do pacote. Só o teste-guarda vermelho, sem correção."
 *
 * GAP-MAP Nível 5:
 *   • E-1 "Pacote — cancelar ou devolver venda de pacote contabiliza errado" (registrado 29/09, "Só registrar");
 *   • "Venda — cancelar venda com produto não estorna o CMV" (registrado 22/10 com esta sessão).
 *
 * Comportamento correto esperado: cancelar uma venda Finalized desfaz no razão TODO lançamento que ela gerou —
 * receita, CMV e passivo do pacote — e tira do saldo do cliente o crédito que ela deu. Os casos usam só o
 * cancelamento (`POST /api/sales/cancel`) e pacote ainda não consumido: devolução e pacote parcialmente consumido
 * pedem decisão do dono sobre o esperado e ficam fora.
 *
 * Fluxo real: preset do salão por `POST /api/dashboard/create`; a venda passa pelas pontes reais
 * (`maybeSyncSaleFinalized` → receita + CMV pelo `InventoryService.recordSaleCogs`; `maybeSyncSalePackageSold` →
 * D 1.1.2 / C 2.1.1 + crédito); o cancelamento vai pela rota (SalesCancellationService → SaleReversalBridge).
 * Cada caso confere a PRÉ-CONDIÇÃO (o lançamento existe antes do cancelamento), para que o vermelho só possa vir
 * da asserção do estorno.
 */
import request from 'supertest';
import prisma from '@/lib/prisma';
import { makeApp, pushTestSchema, authHeader } from '@test/helpers';
import { ApplicationFactory } from '@/lib/factory';
import { resolveAccountingScopeInternal } from '@/features/accounting/scope/resolveAccountingScopeInternal';
import type { AccountingScope } from '@/features/accounting/scope/AccountingScope';
import { dateOnlyFromDayNumber, dayNumberFromDateOnly, scopeToday } from '@/features/accounting/models/dates';
import { centsFromDb } from '@/features/accounting/models/money';
import { LEDGER_STATUSES } from '@/features/accounting/models/ledgerStatus';
import { maybeSyncSalePackageSold } from '@/features/accounting/sync/bridges/SalePackageSoldBridge';
import { maybeSyncSaleFinalized } from '@/features/accounting/sync/bridges/SaleSalesAccountingBridge';

const app = makeApp();
const CNPJ = '11222333000181'; // DV válido
const CPF = '11144477735'; // DV válido

let user: { id: string; username: string };
let tables: Record<'sales' | 'saleItems' | 'packages' | 'customers' | 'units', string>;
let today: string;
const addDays = (d: string, n: number) => dateOnlyFromDayNumber(dayNumberFromDateOnly(d) + n);
const scopeOf = (unitId: string): AccountingScope => resolveAccountingScopeInternal({ userId: user.id }, unitId);

/** Grava a linha como o motor grava: `date` date-only vira ISO à meia-noite UTC (regra de fixture FIX-SALE-DATE-AS-WRITTEN). */
async function row(table: keyof typeof tables, data: Record<string, unknown>) {
  const stored = typeof data.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(data.date) ? { ...data, date: `${data.date}T00:00:00.000Z` } : data;
  return prisma.dynamicTableData.create({ data: { dynamicTableId: tables[table], data: stored as never } });
}

async function newUnit(name: string) {
  const unit = await row('units', { name, cnpj: CNPJ });
  await ApplicationFactory.getInstance().getPostingService().ensureChartOfAccounts(scopeOf(unit.id));
  for (const ym of new Set([addDays(today, -5).slice(0, 7), today.slice(0, 7)])) {
    await prisma.accountingPeriod.create({
      data: { userId: user.id, unitId: unit.id, year: Number(ym.slice(0, 4)), month: Number(ym.slice(5, 7)), status: 'OPEN', openedAt: new Date() },
    });
  }
  return unit.id;
}

/** Saldo de uma conta pelo código, com o sinal da natureza: débito-normal (CMV) = Σd − Σc; crédito-normal (passivo) = Σc − Σd. */
async function balanceCents(unitId: string, code: string, nature: 'debit' | 'credit') {
  const account = await prisma.account.findFirstOrThrow({ where: { userId: user.id, unitId, code, deletedAt: null } });
  const agg = await prisma.posting.aggregate({
    where: { accountId: account.id, entry: { status: { in: LEDGER_STATUSES } } },
    _sum: { debitCents: true, creditCents: true },
  });
  const d = centsFromDb(agg._sum.debitCents ?? 0n);
  const c = centsFromDb(agg._sum.creditCents ?? 0n);
  return nature === 'debit' ? d - c : c - d;
}

async function cancel(saleId: string) {
  return request(app).post('/api/sales/cancel').set(authHeader(user)).send({ tableId: tables.sales, saleId, reason: 'cliente desistiu' });
}

describe('Cancelamento de venda — estorno incompleto (teste-guarda, SQLite real)', () => {
  beforeAll(async () => {
    pushTestSchema();
    const u = await prisma.user.create({ data: { name: 'sc', username: 'sale-cancel-gaps', email: 'sale-cancel-gaps@test.local', password: 'x', role: 'USER' } });
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
    today = scopeToday(scopeOf('x'));
  }, 180000);

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('GAP-MAP N5 (CMV): cancelar venda de produto estorna o sale.cogs — o CMV (4.2) volta a zero', async () => {
    const unitId = await newUnit('Produto');
    const productId = 'prod-shampoo';
    // Estoque valorado: 10 un a R$ 4,00 → baixa de 2 un = R$ 8,00 de CMV (custo médio).
    await prisma.inventoryItem.create({
      data: { userId: user.id, unitId, productRef: productId, qtyOnHand: 10, totalValueCents: 4000, status: 'ACTIVE' },
    });
    const sale = await row('sales', { status: 'Finalized', unitId, totalAmount: 50, currency: 'BRL', date: addDays(today, -1), paymentStatus: 'Pending' });
    await row('saleItems', { saleId: sale.id, type: 'Product', productId, description: 'Shampoo', quantity: 2, unitPrice: 25 });
    await maybeSyncSaleFinalized({ userId: user.id }, tables.sales, { id: sale.id, data: sale.data });

    // Pré-condição: a venda gerou o CMV (sem isto, o vermelho seria de setup).
    expect(await prisma.journalEntry.count({ where: { userId: user.id, unitId, sourceType: 'sale.cogs', sourceId: sale.id } })).toBe(1);
    expect(await balanceCents(unitId, '4.2', 'debit')).toBe(800);

    const res = await cancel(sale.id);
    expect(res.status).toBe(200);
    // Controle: a receita da mesma venda foi estornada pelo mesmo cancelamento.
    expect(await prisma.journalEntry.count({ where: { userId: user.id, unitId, sourceType: 'sale.finalized', sourceId: sale.id, status: 'Reversed' } })).toBe(1);

    // O comportamento esperado: o CMV da venda cancelada não fica no resultado.
    expect(await balanceCents(unitId, '4.2', 'debit')).toBe(0);
  }, 60000);

  it('GAP-MAP N5 E-1 (pacote): cancelar venda de pacote não consumido estorna o sale.package.sold — o passivo 2.1.1.01 volta a zero', async () => {
    const unitId = await newUnit('Pacote razão');
    const customerId = (await row('customers', { name: 'Cliente razão', taxId: CPF })).id;
    const packageId = (await row('packages', { name: '10 escovas', price: 100, validityDays: 30 })).id;
    const sale = await row('sales', { status: 'Finalized', unitId, customerId, totalAmount: 100, currency: 'BRL', date: addDays(today, -1), paymentStatus: 'Pending' });
    await row('saleItems', { saleId: sale.id, type: 'Package', packageId, quantity: 1, unitPrice: 100 });
    await maybeSyncSalePackageSold({ userId: user.id }, tables.sales, { id: sale.id, data: sale.data });

    // Pré-condição: o passivo do pacote existe antes do cancelamento.
    expect(await prisma.journalEntry.count({ where: { userId: user.id, unitId, sourceType: 'sale.package.sold', sourceId: sale.id } })).toBe(1);
    expect(await balanceCents(unitId, '2.1.1.01', 'credit')).toBe(10000);

    const res = await cancel(sale.id);
    expect(res.status).toBe(200);

    // O comportamento esperado: a obrigação de um pacote cancelado sai do passivo.
    expect(await balanceCents(unitId, '2.1.1.01', 'credit')).toBe(0);
  }, 60000);

  it('GAP-MAP N5 E-1 (saldo): cancelar venda de pacote não consumido tira do cliente o crédito que ela deu', async () => {
    const unitId = await newUnit('Pacote saldo');
    const customerId = (await row('customers', { name: 'Cliente saldo', taxId: CPF })).id;
    const packageId = (await row('packages', { name: '5 hidratações', price: 60, validityDays: 30 })).id;
    const sale = await row('sales', { status: 'Finalized', unitId, customerId, totalAmount: 60, currency: 'BRL', date: addDays(today, -1), paymentStatus: 'Pending' });
    await row('saleItems', { saleId: sale.id, type: 'Package', packageId, quantity: 1, unitPrice: 60 });
    await maybeSyncSalePackageSold({ userId: user.id }, tables.sales, { id: sale.id, data: sale.data });

    const balanceOf = () => prisma.customerPackageBalance.findFirstOrThrow({ where: { userId: user.id, unitId, customerId, packageId } });
    // Pré-condição: o crédito do pacote está no saldo do cliente.
    expect(centsFromDb((await balanceOf()).balanceCents)).toBe(6000);

    const res = await cancel(sale.id);
    expect(res.status).toBe(200);

    // O comportamento esperado: o cliente não fica com saldo de um pacote cancelado.
    expect(centsFromDb((await balanceOf()).balanceCents)).toBe(0);
  }, 60000);
});

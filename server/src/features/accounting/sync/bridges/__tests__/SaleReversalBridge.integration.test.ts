/**
 * Onda 2.2 — `SaleReversalBridge` contra o banco REAL (SQLite) e as pontes reais de venda: sem `jest.fn`, sem `spyOn`.
 * O irmão `SaleReversalBridge.test.ts` prova o roteamento com 9 colaboradores falsos; este prova o EFEITO NO RAZÃO.
 *
 * Só os ramos que as integrações existentes NÃO provam (lidas antes de escrever):
 *   • `saleCancellation.reversalGaps.integration` — CMV (`sale.cogs`) e pacote NÃO consumido (passivo 2.1.1.01 + saldo);
 *   • `simplesApuracao.integration` — Returned com receita e o subrazão; cancelamento + reconcile do subrazão;
 *   • `simplesCaixaPr1.integration` — o STATUS do recebimento (REVERTED) ao cancelar venda paga, não os saldos do razão.
 * Aqui entram: os SALDOS do `sale.settled`; pacote JÁ CONSUMIDO (o passivo fica); Returned SEM receita (bloqueada, e
 * re-dirigida quando a receita posta); Returned de venda só de pacote; cancelamento sem lançamento nenhum; e o erro
 * ENGOLIDO (período de hoje de fato fechado) com a re-condução exata-uma-vez depois de reabrir.
 *
 * Armadilha tratada: o estorno é datado em `scopeToday` (janela UTC 00:00–03:00) — os períodos abertos vêm dela.
 */
import request from 'supertest';
import prisma from '@/lib/prisma';
import { makeApp, pushTestSchema, authHeader } from '@test/helpers';
import { ApplicationFactory } from '@/lib/factory';
import type { AccountingScope } from '@/features/accounting/models/AccountingScope';
import { resolveAccountingScopeInternal } from '@/features/accounting/models/resolveAccountingScopeInternal';
import { dateOnlyFromDayNumber, dayNumberFromDateOnly, scopeToday } from '@/features/accounting/models/dates';
import { centsFromDb } from '@/features/accounting/models/money';
import { LEDGER_STATUSES } from '@/features/accounting/models/ledgerStatus';
import { maybeSyncSaleFinalized } from '@/features/accounting/sync/bridges/SaleSalesAccountingBridge';
import { maybeSyncSaleSettled } from '@/features/accounting/sync/bridges/SaleSettlementBridge';
import { maybeSyncSalePackageSold } from '@/features/accounting/sync/bridges/SalePackageSoldBridge';
import { maybeReverseSale } from '@/features/accounting/sync/bridges/SaleReversalBridge';

const app = makeApp();
const CNPJ = '11222333000181';
const CPF = '11144477735';

let user: { id: string; username: string };
let tables: Record<'sales' | 'saleItems' | 'packages' | 'customers' | 'units', string>;
let today: string;
const addDays = (d: string, n: number) => dateOnlyFromDayNumber(dayNumberFromDateOnly(d) + n);
const scopeOf = (unitId: string): AccountingScope => resolveAccountingScopeInternal({ userId: user.id }, unitId);
const f = () => ApplicationFactory.getInstance();

async function row(table: keyof typeof tables, data: Record<string, unknown>) {
  const stored = typeof data.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(data.date) ? { ...data, date: `${data.date}T00:00:00.000Z` } : data;
  return prisma.dynamicTableData.create({ data: { dynamicTableId: tables[table], data: stored as never } });
}

async function newUnit(name: string) {
  const unit = await row('units', { name, cnpj: CNPJ });
  await f().getPostingService().ensureChartOfAccounts(scopeOf(unit.id));
  for (const ym of new Set([addDays(today, -5).slice(0, 7), today.slice(0, 7)])) {
    await prisma.accountingPeriod.create({
      data: { userId: user.id, unitId: unit.id, year: Number(ym.slice(0, 4)), month: Number(ym.slice(5, 7)), status: 'OPEN', openedAt: new Date() },
    });
  }
  return unit.id;
}

/** Saldo por código (sinal da natureza), todos os lançamentos vivos da unidade — oráculo direto no banco. */
async function saldo(unitId: string, code: string, nature: 'debit' | 'credit') {
  const account = await prisma.account.findFirstOrThrow({ where: { userId: user.id, unitId, code, deletedAt: null } });
  const agg = await prisma.posting.aggregate({ where: { accountId: account.id, entry: { status: { in: LEDGER_STATUSES } } }, _sum: { debitCents: true, creditCents: true } });
  const d = centsFromDb(agg._sum.debitCents ?? 0n);
  const c = centsFromDb(agg._sum.creditCents ?? 0n);
  return nature === 'debit' ? d - c : c - d;
}
const entries = (unitId: string, sourceType: string, sourceId?: string) =>
  prisma.journalEntry.findMany({ where: { userId: user.id, unitId, sourceType, ...(sourceId ? { sourceId } : {}) } });

async function vendaServico(unitId: string, reais: number, extra: Record<string, unknown> = {}) {
  const sale = await row('sales', { status: 'Finalized', unitId, totalAmount: reais, currency: 'BRL', date: addDays(today, -1), paymentStatus: 'Pending', customerId: 'cli-1', ...extra });
  await row('saleItems', { saleId: sale.id, type: 'Service', serviceId: 'srv-corte', description: 'Corte', quantity: 1, unitPrice: reais });
  return sale;
}
const finalizar = (s: { id: string; data: unknown }) => maybeSyncSaleFinalized({ userId: user.id }, tables.sales, { id: s.id, data: s.data });

/** Grava o novo estado da linha (como o motor) e dirige a ponte REAL de estorno. */
async function reverter(saleId: string, patch: Record<string, unknown>) {
  const atual = await prisma.dynamicTableData.findUniqueOrThrow({ where: { id: saleId } });
  const data = { ...(atual.data as Record<string, unknown>), ...patch };
  await prisma.dynamicTableData.update({ where: { id: saleId }, data: { data: data as never } });
  await maybeReverseSale({ userId: user.id }, tables.sales, { id: saleId, data });
}

beforeAll(async () => {
  pushTestSchema();
  const u = await prisma.user.create({ data: { name: 'srb', username: 'sale-reversal-bridge-int', email: 'sale-reversal-bridge-int@test.local', password: 'x', role: 'USER' } });
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
}, 180_000);
afterAll(() => prisma.$disconnect());

describe('SaleReversalBridge × razão real', () => {
  it('Cancelled com receita + liquidação (sale.settled): os DOIS lançamentos saem do razão — caixa, a receber e receita voltam a zero; re-conduzir não estorna de novo', async () => {
    const unitId = await newUnit('Liquidada');
    const sale = await vendaServico(unitId, 150);
    await finalizar(sale);
    const pago = { ...(sale.data as Record<string, unknown>), paymentStatus: 'Paid', paymentMethod: 'Pix', paidAt: `${today}T15:00:00.000Z` };
    await prisma.dynamicTableData.update({ where: { id: sale.id }, data: { data: pago as never } });
    await maybeSyncSaleSettled({ userId: user.id }, tables.sales, { id: sale.id, data: pago });

    // Pré-condição: os dois lançamentos existem e há saldo a desfazer (o vermelho só pode vir do estorno).
    const [settled] = await entries(unitId, 'sale.settled', sale.id);
    const debito = await prisma.posting.findFirstOrThrow({ where: { entryId: settled.id, debitCents: { gt: 0n } }, include: { account: true } });
    expect(await saldo(unitId, '3.1', 'credit')).toBe(15_000);
    expect(await saldo(unitId, debito.account.code, 'debit')).toBe(15_000);

    await reverter(sale.id, { status: 'Cancelled' });

    expect((await entries(unitId, 'sale.finalized', sale.id)).map((e) => e.status)).toEqual(['Reversed']);
    expect((await entries(unitId, 'sale.settled', sale.id)).map((e) => e.status)).toEqual(['Reversed']);
    expect(await entries(unitId, 'reversal')).toHaveLength(2);
    expect(await saldo(unitId, '3.1', 'credit')).toBe(0);
    expect(await saldo(unitId, debito.account.code, 'debit')).toBe(0);
    // Todo posting do estorno é espelho exato do original (nenhum centavo sobra em nenhuma conta).
    const agg = await prisma.posting.aggregate({ where: { entry: { unitId, status: { in: LEDGER_STATUSES } } }, _sum: { debitCents: true, creditCents: true } });
    expect(agg._sum.debitCents).toBe(agg._sum.creditCents);

    await reverter(sale.id, { status: 'Cancelled' }); // re-condução (reconcile): idempotente
    expect(await entries(unitId, 'reversal')).toHaveLength(2);
    expect(await saldo(unitId, '3.1', 'credit')).toBe(0);
  }, 60_000);

  it('Cancelled sem NENHUM lançamento (receita nunca postou): não lança, não estorna, não joga', async () => {
    const unitId = await newUnit('Sem lançamento');
    const sale = await vendaServico(unitId, 80);
    await expect(reverter(sale.id, { status: 'Cancelled' })).resolves.toBeUndefined();
    expect(await prisma.journalEntry.count({ where: { userId: user.id, unitId } })).toBe(0);
  }, 60_000);

  it('pacote JÁ CONSUMIDO: o cancelamento deixa o passivo 2.1.1.01, o lançamento do pacote e o saldo do cliente como estavam (pendência do dono 22/10)', async () => {
    const unitId = await newUnit('Pacote consumido');
    const customerId = (await row('customers', { name: 'Cliente consumido', taxId: CPF })).id;
    const packageId = (await row('packages', { name: '10 escovas', price: 100, validityDays: 30 })).id;
    const sale = await row('sales', { status: 'Finalized', unitId, customerId, totalAmount: 100, currency: 'BRL', date: addDays(today, -1), paymentStatus: 'Pending' });
    await row('saleItems', { saleId: sale.id, type: 'Package', packageId, quantity: 1, unitPrice: 100 });
    await maybeSyncSalePackageSold({ userId: user.id }, tables.sales, { id: sale.id, data: sale.data });
    const balance = () => prisma.customerPackageBalance.findFirstOrThrow({ where: { userId: user.id, unitId, customerId, packageId } });
    expect(centsFromDb((await balance()).balanceCents)).toBe(10_000);
    expect(await saldo(unitId, '2.1.1.01', 'credit')).toBe(10_000);

    // Consumo parcial real: o saldo cai abaixo do crédito que a venda deu.
    await prisma.customerPackageBalance.update({ where: { id: (await balance()).id }, data: { balanceCents: 4_000n } });

    await expect(reverter(sale.id, { status: 'Cancelled' })).resolves.toBeUndefined();

    expect(centsFromDb((await balance()).balanceCents)).toBe(4_000);
    expect(await saldo(unitId, '2.1.1.01', 'credit')).toBe(10_000);
    expect((await entries(unitId, 'sale.package.sold', sale.id)).map((e) => e.status)).toEqual(['Posted']);
    expect(await entries(unitId, 'reversal')).toHaveLength(0);
    expect(await prisma.packageBalanceMovement.count({ where: { userId: user.id, saleId: sale.id, kind: 'reversal' } })).toBe(0);
  }, 60_000);

  it('Returned SEM receita lançada = bloqueada (nada de D 3.2 órfão nem linha DEVOLUCAO); quando a receita posta, a MESMA ponte re-dirigida lança a devolução uma vez', async () => {
    const unitId = await newUnit('Devolução sem receita');
    const sale = await vendaServico(unitId, 120);

    await reverter(sale.id, { status: 'Returned', returnedAt: `${today}T15:00:00.000Z` });
    expect(await entries(unitId, 'sale.returned', sale.id)).toHaveLength(0);
    expect(await prisma.journalEntry.count({ where: { userId: user.id, unitId } })).toBe(0);
    expect(await prisma.receitaFiscalLinha.count({ where: { saleId: sale.id } })).toBe(0);

    await finalizar(sale); // a receita posta depois (reconcile do dia seguinte, p.ex.)
    expect(await saldo(unitId, '3.1', 'credit')).toBe(12_000);
    await reverter(sale.id, { status: 'Returned', returnedAt: `${today}T15:00:00.000Z` });
    await reverter(sale.id, { status: 'Returned', returnedAt: `${today}T15:00:00.000Z` }); // idempotente (@@unique do sync)

    expect(await entries(unitId, 'sale.returned', sale.id)).toHaveLength(1);
    expect(await saldo(unitId, '3.2', 'debit')).toBe(12_000);
    expect(await saldo(unitId, '3.1', 'credit')).toBe(12_000); // a devolução não toca a receita: é contra-receita (D 3.2), não estorno
    expect(await prisma.receitaFiscalLinha.findMany({ where: { saleId: sale.id, tipo: 'DEVOLUCAO' }, select: { receitaCents: true } })).toEqual([{ receitaCents: -12_000n }]);
  }, 60_000);

  it('erro ENGOLIDO: período de hoje de fato FECHADO ⇒ a ponte não joga e NADA é estornado; reaberto, a re-condução estorna exatamente uma vez', async () => {
    const unitId = await newUnit('Período fechado');
    const sale = await vendaServico(unitId, 200);
    await finalizar(sale);
    expect(await saldo(unitId, '3.1', 'credit')).toBe(20_000);

    const [ano, mes] = [Number(today.slice(0, 4)), Number(today.slice(5, 7))];
    const periodo = () => prisma.accountingPeriod.findFirstOrThrow({ where: { userId: user.id, unitId, year: ano, month: mes } });
    await prisma.accountingPeriod.update({ where: { id: (await periodo()).id }, data: { status: 'HARD_CLOSED' } });

    await expect(reverter(sale.id, { status: 'Cancelled' })).resolves.toBeUndefined();
    expect((await entries(unitId, 'sale.finalized', sale.id)).map((e) => e.status)).toEqual(['Posted']);
    expect(await entries(unitId, 'reversal')).toHaveLength(0);
    expect(await saldo(unitId, '3.1', 'credit')).toBe(20_000);
    // O subrazão também não gravou o cancelamento: o par (razão, subrazão) segue consistente.
    expect(await prisma.receitaFiscalLinha.count({ where: { saleId: sale.id, tipo: 'CANCELAMENTO' } })).toBe(0);

    await prisma.accountingPeriod.update({ where: { id: (await periodo()).id }, data: { status: 'OPEN' } });
    await reverter(sale.id, { status: 'Cancelled' });
    await reverter(sale.id, { status: 'Cancelled' });
    expect((await entries(unitId, 'sale.finalized', sale.id)).map((e) => e.status)).toEqual(['Reversed']);
    expect(await entries(unitId, 'reversal')).toHaveLength(1);
    expect(await saldo(unitId, '3.1', 'credit')).toBe(0);
    expect(await prisma.receitaFiscalLinha.count({ where: { saleId: sale.id, tipo: 'CANCELAMENTO' } })).toBe(1);
  }, 60_000);
});

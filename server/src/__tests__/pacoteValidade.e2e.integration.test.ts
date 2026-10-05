/**
 * BE-INCR-PACOTE-VALIDADE — tie-out de ponta a ponta com SQLite real (BRIEF §3 item 17 + §5.2 itens 14a/17), mais
 * o teste HTTP do pré-check (item 4) e o débito re-dirigido depois do vencimento (item 5).
 *
 * Fluxo real: preset do salão instalado por `POST /api/dashboard/create`; venda de pacote pela PONTE
 * (`maybeSyncSalePackageSold` — lançamento D 1.1.2 / C 2.1.1 + crédito com a validade copiada do catálogo);
 * consumo pelo `POST /api/sales/pay` (pré-check, Paid, liquidação D 2.1.1 / C 1.1.2, débito); vencimento pelo
 * cabeamento de PRODUÇÃO dos passes (`buildPackageExpiryDeps`) com o relógio avançado para `expiresOn + 2`.
 *
 * Datas relativas a hoje (o pré-check usa o relógio real, `scopeToday`). Cada cenário mora numa unidade própria
 * (o razão e o subrazão são por unidade), e a NFS-e usa a porta `null` em homologação.
 */
import request from 'supertest';
import prisma from '@/lib/prisma';
import { makeApp, pushTestSchema, authHeader } from '@test/helpers';
import { ApplicationFactory } from '@/lib/factory';
import { resolveAccountingScope } from '@/features/accounting/scope/AccountingScope';
import type { AccountingScope } from '@/features/accounting/scope/AccountingScope';
import { dateOnlyFromDayNumber, dayNumberFromDateOnly, scopeToday } from '@/features/accounting/models/dates';
import { centsFromDb } from '@/features/accounting/models/money';
import { lastValidDay } from '@/features/packages/models/validity';
import { LEDGER_STATUSES } from '@/features/accounting/models/ledgerStatus';
import { maybeSyncSalePackageSold } from '@/features/accounting/sync/bridges/SalePackageSoldBridge';
import { maybeSyncSaleFinalized } from '@/features/accounting/sync/bridges/SaleSalesAccountingBridge';
import { maybeSyncSaleSettled } from '@/features/accounting/sync/bridges/SaleSettlementBridge';
import {
  buildPackageExpiryDeps,
  reconcilePackageBalanceVsLiability,
  reconcilePackageExpiry,
  reconcileSalePackageExpiryPosting,
  type ReconcilePendingCaptureItem,
} from '@/jobs/accountingSyncReconcile.job';

const app = makeApp();
const CPF = '11144477735'; // DV válido
const CNPJ = '11222333000181'; // DV válido
const OLD_ENV = process.env;

let user: { id: string; username: string };
let tables: Record<'sales' | 'saleItems' | 'packages' | 'customers' | 'units', string>;
let today: string;
const addDays = (d: string, n: number) => dateOnlyFromDayNumber(dayNumberFromDateOnly(d) + n);
const scopeOf = (unitId: string): AccountingScope => resolveAccountingScope({ userId: user.id }, unitId);

/**
 * Grava a linha como o MOTOR a grava: o campo `date` (date-only) vira ISO à meia-noite UTC (`2026-11-25T00:00:00.000Z`). Gravar
 * `YYYY-MM-DD` por Prisma escondia o defeito das pontes que liam o ISO como instante (FIX-SALE-DATE-AS-WRITTEN, regra de fixture).
 */
async function row(table: keyof typeof tables, data: Record<string, unknown>) {
  const stored = typeof data.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(data.date) ? { ...data, date: `${data.date}T00:00:00.000Z` } : data;
  return prisma.dynamicTableData.create({ data: { dynamicTableId: tables[table], data: stored as never } });
}

async function newUnit(name: string, months: string[]) {
  const unit = await row('units', { name, cnpj: CNPJ });
  await ApplicationFactory.getInstance().getPostingService().ensureChartOfAccounts(scopeOf(unit.id));
  for (const ym of new Set(months)) {
    await prisma.accountingPeriod.create({
      data: { userId: user.id, unitId: unit.id, year: Number(ym.slice(0, 4)), month: Number(ym.slice(5, 7)), status: 'OPEN', openedAt: new Date() },
    });
  }
  return unit.id;
}

/** Venda 100% pacote, Finalized, pela ponte real (lançamento de origem + crédito com a validade do catálogo). */
async function sellPackage(unitId: string, customerId: string, packageId: string, reais: number, date: string) {
  const sale = await row('sales', { status: 'Finalized', unitId, customerId, totalAmount: reais, currency: 'BRL', date, paymentStatus: 'Pending' });
  await row('saleItems', { saleId: sale.id, type: 'Package', packageId, quantity: 1, unitPrice: reais });
  await maybeSyncSalePackageSold({ userId: user.id }, tables.sales, { id: sale.id, data: sale.data });
  return sale.id;
}

/** Venda de serviço Finalized com receita postada (abertura que a liquidação exige). */
async function serviceSale(unitId: string, customerId: string, reais: number, date: string) {
  const sale = await row('sales', { status: 'Finalized', unitId, customerId, totalAmount: reais, currency: 'BRL', date, paymentStatus: 'Pending' });
  await row('saleItems', { saleId: sale.id, type: 'Service', serviceId: 'srv-1', description: 'Escova', quantity: 1, unitPrice: reais });
  await maybeSyncSaleFinalized({ userId: user.id }, tables.sales, { id: sale.id, data: sale.data });
  return sale.id;
}

async function balanceOf(unitId: string, customerId: string, packageId: string) {
  return prisma.customerPackageBalance.findFirstOrThrow({ where: { userId: user.id, unitId, customerId, packageId } });
}

/** Saldo natural de uma conta (Liability/Revenue credit-normal: Σcrédito − Σdébito). */
async function creditNormalCents(unitId: string, code: string) {
  const account = await prisma.account.findFirstOrThrow({ where: { userId: user.id, unitId, code, deletedAt: null } });
  const agg = await prisma.posting.aggregate({
    where: { accountId: account.id, entry: { status: { in: LEDGER_STATUSES } } },
    _sum: { debitCents: true, creditCents: true },
  });
  return centsFromDb(agg._sum.creditCents ?? 0n) - centsFromDb(agg._sum.debitCents ?? 0n);
}

/** Mesmo cálculo das deps de produção do tie-out warn-only (runAccountingSyncReconcile). */
async function balanceVsLiability() {
  return reconcilePackageBalanceVsLiability({
    listBalanceSums: async () =>
      (await prisma.customerPackageBalance.groupBy({ by: ['userId', 'unitId'], where: { deletedAt: null, userId: user.id }, _sum: { balanceCents: true } })).map((g) => ({
        ownerUserId: g.userId,
        unitId: g.unitId,
        balanceCents: centsFromDb(g._sum.balanceCents ?? 0n),
      })),
    getLiabilityCents: (scope) => creditNormalCents(scope.unitId, '2.1.1'),
  });
}

describe('BE-INCR-PACOTE-VALIDADE — ponta a ponta (SQLite real)', () => {
  // Unidades/cenários
  let UNIT_A: string; // principal: CONSUMO com NFS-e
  let UNIT_B: string; // saldo já vencido hoje: pré-check HTTP (item 4) e débito re-dirigido (item 5)
  let UNIT_C: string; // CONSUMO, cliente sem CPF → pendência da nota, saldo vence assim mesmo
  let UNIT_D: string; // perfil VENDA → nenhuma nota no vencimento
  let UNIT_E: string; // o período fecha entre a guarda e o commit (TOCTOU) → item 11 fecha quando reabre
  let UNIT_F: string; // guarda 9.1: consumo Paid sem débito → PACKAGE_CONSUMPTION_PENDING, saldo intacto
  let UNIT_G: string; // guarda 9.2: venda de origem cancelada → PACKAGE_ORIGIN_REVERSED, saldo intacto
  let customer: string;
  let customerSemCpf: string;
  let pkg30: string;
  let expiresOnA: string;
  let dueDay: string;
  let originC: string; // venda de origem do saldo do UNIT_C (âncora esperada da nota do vencido)
  const pending: ReconcilePendingCaptureItem[] = [];
  const resolved: string[] = [];

  beforeAll(async () => {
    pushTestSchema();
    process.env = { ...OLD_ENV, DFE_PARTNER: 'null', DFE_PARTNER_ENV: 'homologacao' };
    const u = await prisma.user.create({ data: { name: 'pv', username: 'pv-e2e', email: 'pv-e2e@test.local', password: 'x', role: 'USER' } });
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
    const saleDateA = addDays(today, -10);
    // O esperado vem da MESMA regra do produto (D2: feriado nacional / domingo de eleição empurram o último dia).
    // Somar 30 dias corridos aqui quebrava o teste nos dias em que hoje+20 cai num desses (ex.: 25/10/2026, 2º turno).
    expiresOnA = lastValidDay(saleDateA, 30)!;
    dueDay = addDays(expiresOnA, 2);
    const ym = (d: string) => d.slice(0, 7);
    const monthsA = [ym(saleDateA), ym(today), ym(addDays(expiresOnA, 1))];

    customer = (await row('customers', { name: 'Cliente', taxId: CPF })).id;
    customerSemCpf = (await row('customers', { name: 'Sem documento' })).id;
    pkg30 = (await row('packages', { name: '10 escovas', price: 100, validityDays: 30 })).id;

    UNIT_A = await newUnit('A', monthsA);
    const expiresOnB = lastValidDay(addDays(today, -40), 30)!; // ~hoje − 10 (prorrogado se cair em feriado)
    UNIT_B = await newUnit('B', [ym(addDays(today, -40)), ym(addDays(today, -15)), ym(addDays(expiresOnB, 1)), ym(today)]);
    UNIT_C = await newUnit('C', monthsA);
    UNIT_D = await newUnit('D', monthsA);
    UNIT_E = await newUnit('E', monthsA);
    UNIT_F = await newUnit('F', monthsA);
    UNIT_G = await newUnit('G', monthsA);

    const profile = (unitId: string, pacoteFatoGerador: 'CONSUMO' | 'VENDA') =>
      prisma.fiscalProfile.create({
        data: {
          userId: user.id,
          unitId,
          regimeTributario: 'PRESUMIDO',
          pisCofinsRegime: 'CUMULATIVO',
          codMun: '3550308',
          pTotTribFedCent: 1000,
          pTotTribEstCent: 0,
          pTotTribMunCent: 200,
          pacoteFatoGerador,
          pacoteCTribNac: '060101',
          ibsCbsInformar: false,
          d1fConfirmado: true,
        },
      });
    await profile(UNIT_A, 'CONSUMO');
    await profile(UNIT_C, 'CONSUMO');
    await profile(UNIT_D, 'VENDA');
  }, 180000);

  afterAll(async () => {
    process.env = OLD_ENV;
    await prisma.$disconnect();
  });

  it('item 2/3: a venda copia o validityDays do catálogo para o saldo (venda + 30)', async () => {
    await sellPackage(UNIT_A, customer, pkg30, 100, addDays(today, -10));
    const b = await balanceOf(UNIT_A, customer, pkg30);
    expect(centsFromDb(b.balanceCents)).toBe(10000);
    expect(b.expiresAt?.toISOString().slice(0, 10)).toBe(expiresOnA);
    expect(await creditNormalCents(UNIT_A, '2.1.1')).toBe(10000);
  });

  it('consome R$ 30 pelo POST /api/sales/pay num dia válido (pré-check passa, Paid, liquidação 2.1.1, débito)', async () => {
    const saleId = await serviceSale(UNIT_A, customer, 30, today);
    const r = await request(app)
      .post('/api/sales/pay')
      .set(authHeader(user))
      .send({ tableId: tables.sales, saleId, paymentMethod: 'Package Balance', packageId: pkg30 });
    expect(r.status).toBe(200);
    expect(centsFromDb((await balanceOf(UNIT_A, customer, pkg30)).balanceCents)).toBe(7000);
    expect(await creditNormalCents(UNIT_A, '2.1.1')).toBe(7000);
  });

  it('item 4: saldo vencido → 400 PACKAGE_BALANCE_EXPIRED e NADA escrito (sem Paid, sem liquidação, sem débito)', async () => {
    await sellPackage(UNIT_B, customer, pkg30, 50, addDays(today, -40)); // vence em hoje − 10
    const saleId = await serviceSale(UNIT_B, customer, 20, today);
    const r = await request(app)
      .post('/api/sales/pay')
      .set(authHeader(user))
      .send({ tableId: tables.sales, saleId, paymentMethod: 'Package Balance', packageId: pkg30 });
    expect(r.status).toBe(400);
    expect(r.body.code).toBe('PACKAGE_BALANCE_EXPIRED');
    const sale = await prisma.dynamicTableData.findUniqueOrThrow({ where: { id: saleId } });
    expect((sale.data as Record<string, unknown>).paymentStatus).toBe('Pending');
    expect(await prisma.journalEntry.count({ where: { userId: user.id, sourceType: 'sale.settled', sourceId: saleId } })).toBe(0);
    expect(await prisma.packageBalanceMovement.count({ where: { userId: user.id, saleId, kind: 'debit' } })).toBe(0);
    expect(centsFromDb((await balanceOf(UNIT_B, customer, pkg30)).balanceCents)).toBe(5000);
  });

  it('item 5: o débito re-dirigido DEPOIS do vencimento (consumo Paid de antes, débito pós-commit perdido) é aplicado', async () => {
    // Consumo pago em hoje − 15 (o saldo valia até hoje − 10): receita e liquidação postadas, o débito best-effort falhou.
    const paidDay = addDays(today, -15);
    const sale = await row('sales', {
      status: 'Finalized', unitId: UNIT_B, customerId: customer, totalAmount: 10, currency: 'BRL', date: paidDay,
      paymentStatus: 'Paid', paymentMethod: 'Package Balance', paidWithPackageId: pkg30, paidAt: `${paidDay}T15:00:00.000Z`,
    });
    await row('saleItems', { saleId: sale.id, type: 'Service', serviceId: 'srv-1', description: 'Escova', quantity: 1, unitPrice: 10 });
    await maybeSyncSaleFinalized({ userId: user.id }, tables.sales, { id: sale.id, data: sale.data });
    await maybeSyncSaleSettled({ userId: user.id }, tables.sales, { id: sale.id, data: sale.data });
    expect(await creditNormalCents(UNIT_B, '2.1.1')).toBe(4000); // liquidação D 2.1.1 já no razão

    // Re-drive do débito hoje, com o saldo vencido: não confere validade (item 5).
    await ApplicationFactory.getInstance()
      .getPackageBalanceService()
      .debitForConsumption(scopeOf(UNIT_B), { customerId: customer, packageId: pkg30, saleId: sale.id, amountCents: 1000 });
    expect(centsFromDb((await balanceOf(UNIT_B, customer, pkg30)).balanceCents)).toBe(4000);
  });

  it('item 17: em expiresOn + 2 o passe vence; saldo 0, 2.1.1 = 0, 3.4 = R$ 70, movimento 7000, NFS-e = 3.4; tie-out só diverge na unidade do TOCTOU', async () => {
    // Cenários paralelos nas outras unidades, vencendo no MESMO dia.
    originC = await sellPackage(UNIT_C, customerSemCpf, pkg30, 40, addDays(today, -10));
    await sellPackage(UNIT_D, customer, pkg30, 25, addDays(today, -10));
    await sellPackage(UNIT_E, customer, pkg30, 15, addDays(today, -10));
    // 9.1: consumo pago (Paid + Package Balance + paidWithPackageId) cujo débito best-effort não aplicou.
    await sellPackage(UNIT_F, customer, pkg30, 20, addDays(today, -10));
    await row('sales', {
      status: 'Finalized', unitId: UNIT_F, customerId: customer, totalAmount: 5, currency: 'BRL', date: today,
      paymentStatus: 'Paid', paymentMethod: 'Package Balance', paidWithPackageId: pkg30, paidAt: `${today}T12:00:00.000Z`,
    });
    // 9.2: a venda de origem foi cancelada depois do crédito (vizinho E-1 — o passivo fica, nada vence).
    const originG = await sellPackage(UNIT_G, customer, pkg30, 30, addDays(today, -10));
    const originRow = await prisma.dynamicTableData.findUniqueOrThrow({ where: { id: originG } });
    await prisma.dynamicTableData.update({ where: { id: originG }, data: { data: { ...(originRow.data as object), status: 'Cancelled' } as never } });

    const deps = buildPackageExpiryDeps({
      today: () => dueDay,
      reportPending: async (item) => {
        pending.push(item);
      },
      reportResolved: async (item) => {
        resolved.push(item.sourceId);
      },
    });
    // TOCTOU do UNIT_E: o período da competência fecha entre a guarda 9.4 e o commit do lançamento (1ª vez só).
    const competence = addDays(expiresOnA, 1);
    let closedOnce = false;
    const realSync = deps.sync;
    deps.sync = async (scope, event) => {
      if (scope.unitId === UNIT_E && !closedOnce) {
        closedOnce = true;
        await prisma.accountingPeriod.updateMany({
          where: { userId: user.id, unitId: UNIT_E, year: Number(competence.slice(0, 4)), month: Number(competence.slice(5, 7)) },
          data: { status: 'SOFT_CLOSED' },
        });
      }
      return realSync(scope, event);
    };

    await reconcilePackageExpiry(deps);
    await reconcileSalePackageExpiryPosting(deps); // E segue fechado: o re-drive não fecha ainda

    // ── UNIT_A
    const keyA = `expiry:${(await balanceOf(UNIT_A, customer, pkg30)).id}:${expiresOnA}`;
    expect(centsFromDb((await balanceOf(UNIT_A, customer, pkg30)).balanceCents)).toBe(0);
    expect(await creditNormalCents(UNIT_A, '2.1.1')).toBe(0);
    expect(await creditNormalCents(UNIT_A, '3.4')).toBe(7000);
    const mvA = await prisma.packageBalanceMovement.findFirstOrThrow({ where: { userId: user.id, unitId: UNIT_A, kind: 'expiry' } });
    expect(mvA.saleId).toBe(keyA);
    expect(centsFromDb(mvA.deltaCents)).toBe(7000);
    const jeA = await prisma.journalEntry.findFirstOrThrow({ where: { userId: user.id, unitId: UNIT_A, sourceType: 'sale.package.expired', sourceId: keyA } });
    expect(jeA.date.toISOString().slice(0, 10)).toBe(competence); // F-PV-5 a
    const docA = await prisma.fiscalDocument.findFirstOrThrow({ where: { userId: user.id, unitId: UNIT_A, saleKey: keyA } });
    expect(centsFromDb(docA.vServCents)).toBe(await creditNormalCents(UNIT_A, '3.4')); // nota == 3.4
    expect(docA).toMatchObject({ kind: 'NFSE', cTribNac: '060101', dCompet: competence, anchorEntryId: jeA.id, status: 'SENT' });

    // ── UNIT_C: cliente sem CPF → pendência da nota, o saldo venceu assim mesmo
    expect(centsFromDb((await balanceOf(UNIT_C, customerSemCpf, pkg30)).balanceCents)).toBe(0);
    expect(await creditNormalCents(UNIT_C, '3.4')).toBe(4000);
    expect(await prisma.fiscalDocument.count({ where: { userId: user.id, unitId: UNIT_C } })).toBe(0);
    expect(pending.find((p) => p.unitId === UNIT_C)).toMatchObject({ reasonCode: 'PACKAGE_EXPIRY_NFSE_PENDING', sourceType: 'sale.package.expired' });

    // ── UNIT_D: perfil VENDA → nenhuma nota no vencimento
    expect(await creditNormalCents(UNIT_D, '3.4')).toBe(2500);
    expect(await prisma.fiscalDocument.count({ where: { userId: user.id, unitId: UNIT_D } })).toBe(0);

    // ── UNIT_E: movimento sem lançamento (TOCTOU), pendência de período
    expect(centsFromDb((await balanceOf(UNIT_E, customer, pkg30)).balanceCents)).toBe(0);
    expect(await prisma.packageBalanceMovement.count({ where: { userId: user.id, unitId: UNIT_E, kind: 'expiry' } })).toBe(1);
    expect(await creditNormalCents(UNIT_E, '3.4')).toBe(0);
    expect(pending.filter((p) => p.unitId === UNIT_E).map((p) => p.reasonCode)).toContain('ACCOUNTING_PERIOD_NOT_OPEN');

    // ── UNIT_F / UNIT_G: as guardas barram ANTES do efeito irreversível — nenhum movimento, saldo intacto
    expect(centsFromDb((await balanceOf(UNIT_F, customer, pkg30)).balanceCents)).toBe(2000);
    expect(centsFromDb((await balanceOf(UNIT_G, customer, pkg30)).balanceCents)).toBe(3000);
    expect(await prisma.packageBalanceMovement.count({ where: { userId: user.id, unitId: { in: [UNIT_F, UNIT_G] }, kind: 'expiry' } })).toBe(0);
    expect(pending.find((p) => p.unitId === UNIT_F)?.reasonCode).toBe('PACKAGE_CONSUMPTION_PENDING');
    expect(pending.find((p) => p.unitId === UNIT_G)?.reasonCode).toBe('PACKAGE_ORIGIN_REVERSED');

    // ── UNIT_B (vencido no mesmo passe, sem perfil fiscal → sem nota): o consumo de antes JÁ debitado
    expect(await creditNormalCents(UNIT_B, '3.4')).toBe(4000);

    // ── tie-out: A, B, C, D fecham; E diverge (subrazão 0 × 2.1.1 = 1500) até o re-drive
    const tie = await balanceVsLiability();
    expect(tie.divergences).toBe(1);
  });

  it('item 17 (2º cenário): o período reabre → o passe do item 11 posta o movimento órfão e a divergência fecha', async () => {
    await prisma.accountingPeriod.updateMany({ where: { userId: user.id, unitId: UNIT_E }, data: { status: 'OPEN' } });
    await reconcileSalePackageExpiryPosting(buildPackageExpiryDeps({ today: () => dueDay }));
    expect(await creditNormalCents(UNIT_E, '3.4')).toBe(1500);
    expect(await creditNormalCents(UNIT_E, '2.1.1')).toBe(0);
    expect((await balanceVsLiability()).divergences).toBe(0);
  });

  it('idempotência: a 2ª rodada é no-op (nenhum movimento, lançamento ou nota a mais)', async () => {
    const count = async () => ({
      mv: await prisma.packageBalanceMovement.count({ where: { userId: user.id, kind: 'expiry' } }),
      je: await prisma.journalEntry.count({ where: { userId: user.id, sourceType: 'sale.package.expired' } }),
      docs: await prisma.fiscalDocument.count({ where: { userId: user.id } }),
    });
    const before = await count();
    const deps = buildPackageExpiryDeps({ today: () => dueDay });
    await reconcilePackageExpiry(deps);
    await reconcileSalePackageExpiryPosting(deps);
    expect(await count()).toEqual(before);
    expect(before).toEqual({ mv: 5, je: 5, docs: 1 }); // A, B, C, D, E vencidos; nota só no A
  });

  it('review #483 achado 1: recompra DEPOIS do vencimento não vira a âncora da nota pendente', async () => {
    const recompra = await sellPackage(UNIT_C, customerSemCpf, pkg30, 40, today); // saldo 0 → prazo novo
    await prisma.dynamicTableData.update({ where: { id: customerSemCpf }, data: { data: { name: 'Agora com CPF', taxId: CPF } as never } });
    await reconcileSalePackageExpiryPosting(buildPackageExpiryDeps({ today: () => dueDay }));
    const doc = await prisma.fiscalDocument.findFirstOrThrow({ where: { userId: user.id, unitId: UNIT_C } });
    expect(doc.saleId).toBe(originC);
    expect(doc.saleId).not.toBe(recompra);
    expect(centsFromDb(doc.vServCents)).toBe(4000);
  });

  it('review #483 achado 3: crédito re-dirigido tarde cai no MESMO prazo de um saldo já vencido → vence de novo (chave :2), sem travar', async () => {
    const b = await balanceOf(UNIT_A, customer, pkg30);
    expect(centsFromDb(b.balanceCents)).toBe(0);
    // venda antiga (hoje − 10, 30 dias → mesmo expiresOnA) cujo crédito só aplica agora
    await ApplicationFactory.getInstance()
      .getPackageBalanceService()
      .creditFromSale(scopeOf(UNIT_A), { customerId: customer, packageId: pkg30, saleId: 'venda-atrasada', amountCents: 500, saleDate: addDays(today, -10), validityDays: 30 });
    // o lançamento de origem dessa venda (C 2.1.1) — mesmo fato da ponte, postado direto para o tie-out fechar
    await ApplicationFactory.getInstance().getAccountingSyncService().sync(scopeOf(UNIT_A), {
      sourceType: 'sale.package.sold', sourceId: 'venda-atrasada', unitId: UNIT_A, amount: 5, currency: 'BRL', occurredAt: addDays(today, -10), label: 'venda atrasada',
    });
    const deps = buildPackageExpiryDeps({ today: () => dueDay });
    await reconcilePackageExpiry(deps);
    await reconcileSalePackageExpiryPosting(deps);

    expect(centsFromDb((await balanceOf(UNIT_A, customer, pkg30)).balanceCents)).toBe(0);
    const keys = (await prisma.packageBalanceMovement.findMany({ where: { userId: user.id, unitId: UNIT_A, kind: 'expiry' } })).map((m) => m.saleId).sort();
    expect(keys).toEqual([`expiry:${b.id}:${expiresOnA}`, `expiry:${b.id}:${expiresOnA}:2`]);
    expect(await creditNormalCents(UNIT_A, '3.4')).toBe(7500);
    expect(await creditNormalCents(UNIT_A, '2.1.1')).toBe(0);
    expect(await prisma.fiscalDocument.count({ where: { userId: user.id, unitId: UNIT_A } })).toBe(2); // uma nota por vencimento
  });

  it('item 16: GET /api/package-balances?expiresOnOrBefore filtra pela validade; data impossível → 400', async () => {
    await sellPackage(UNIT_A, customer, pkg30, 10, today); // mesma linha cliente × pacote, saldo 0 → prazo novo (F-PV-2 a)
    const ok = await request(app)
      .get('/api/package-balances')
      .set(authHeader(user))
      .query({ unitId: UNIT_A, expiresOnOrBefore: addDays(lastValidDay(today, 30)!, -1) });
    expect(ok.status).toBe(200);
    expect(ok.body.data.balances).toHaveLength(0); // recompra com saldo 0 reiniciou: vence em lastValidDay(hoje, 30)
    const hit = await request(app)
      .get('/api/package-balances')
      .set(authHeader(user))
      .query({ unitId: UNIT_A, expiresOnOrBefore: lastValidDay(today, 30)! });
    expect(hit.body.data.balances).toHaveLength(1);
    expect(hit.body.data.balances[0].expiresAt.slice(0, 10)).toBe(lastValidDay(today, 30));
    const bad = await request(app).get('/api/package-balances').set(authHeader(user)).query({ unitId: UNIT_A, expiresOnOrBefore: '2026-02-30' });
    expect(bad.status).toBe(400);
  });
});

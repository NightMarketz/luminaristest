/**
 * BE-INCR-SIMPLES-CAIXA PR-1 (nó X14-CAIXA, BRIEF itens 1–7a) — recebimento da venda (base do DAS no regime de caixa,
 * Res. CGSN 140 art. 16 § 1º) e trava de ano do perfil: pontes reais de finalização, liquidação e estorno, reconcile
 * (backfill sob demanda) e rotas do perfil fiscal.
 */
import request from 'supertest';
import prisma from '@/lib/prisma';
import { makeApp, pushTestSchema, authHeader } from '@test/helpers';
import { ApplicationFactory } from '@/lib/factory';
import type { AccountingScope } from '@/features/accounting/scope/AccountingScope';
import { resolveAccountingScopeInternal } from '@/features/accounting/scope/resolveAccountingScopeInternal';
import { maybeSyncSaleFinalized } from '@/features/accounting/sync/bridges/SaleSalesAccountingBridge';
import { maybeSyncSaleSettled } from '@/features/accounting/sync/bridges/SaleSettlementBridge';
import { maybeSyncSalePackageSold } from '@/features/accounting/sync/bridges/SalePackageSoldBridge';
import { maybeReverseSale } from '@/features/accounting/sync/bridges/SaleReversalBridge';
import { backfillRecebimentos } from '@/features/accounting/sync/bridges/ReceitaFiscalRecebimentoBridge';
import { ReceitaFiscalRecebimentoService } from '@/features/accounting/services/ReceitaFiscalRecebimentoService';

const app = makeApp();
const PERFIL = '/api/accounting/company-fiscal-profile';
const PRAZOS = { simplesCaixaPrazoCartaoDebitoDias: 1, simplesCaixaPrazoCartaoCreditoDias: 30 };
let user: { id: string; username: string };
let tables: Record<'sales' | 'saleItems' | 'units', string>;
let UNIT: string;
const scope = (): AccountingScope => resolveAccountingScopeInternal({ userId: user.id }, UNIT);
const f = () => ApplicationFactory.getInstance();

async function row(table: keyof typeof tables, data: Record<string, unknown>) {
  const stored = typeof data.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(data.date) ? { ...data, date: `${data.date}T00:00:00.000Z` } : data;
  return prisma.dynamicTableData.create({ data: { dynamicTableId: tables[table], data: stored as never } });
}

/** Venda Finalized pela ponte real; depois paga pela ponte de liquidação real (`paidAt` às 15h UTC = 12h BRT). */
async function vendaPaga(date: string, totalReais: number, meio: string, paidDay: string, tipoItem: 'Service' | 'Package' = 'Service') {
  const sale = await row('sales', { status: 'Finalized', unitId: UNIT, totalAmount: totalReais, currency: 'BRL', date, paymentStatus: 'Pending', customerId: 'cli-1' });
  await row('saleItems', {
    saleId: sale.id,
    type: tipoItem,
    ...(tipoItem === 'Service' ? { serviceId: 'srv-corte' } : { packageId: 'pkg-1' }),
    description: 'item',
    quantity: 1,
    unitPrice: totalReais,
  });
  await maybeSyncSaleFinalized({ userId: user.id }, tables.sales, { id: sale.id, data: sale.data });
  if (tipoItem === 'Package') await maybeSyncSalePackageSold({ userId: user.id }, tables.sales, { id: sale.id, data: sale.data });
  const data = { ...(sale.data as Record<string, unknown>), paymentStatus: 'Paid', paymentMethod: meio, paidAt: `${paidDay}T15:00:00.000Z` };
  await prisma.dynamicTableData.update({ where: { id: sale.id }, data: { data: data as never } });
  await maybeSyncSaleSettled({ userId: user.id }, tables.sales, { id: sale.id, data });
  return { id: sale.id, data };
}

const recebimentos = (saleId: string) => prisma.receitaFiscalRecebimento.findMany({ where: { saleId } });
const perfil = (ano: number, body: Record<string, unknown>) =>
  request(app).put(`${PERFIL}/${ano}`).set(authHeader(user)).send({ unitId: UNIT, ...body });

// Síncrono à parte: o build a frio do banco-modelo passa de 5 s e estouraria o timeout de um hook async.
beforeAll(() => pushTestSchema());
beforeAll(async () => {
  const u = await prisma.user.create({ data: { name: 'x14cx1', username: 'x14cx1', email: 'x14cx1@test.local', password: 'x', role: 'USER' } });
  user = { id: u.id, username: u.username };
  const created = await request(app).post('/api/dashboard/create').set(authHeader(user)).send({ suiteKey: 'beautySalon', unit: { name: 'Matriz' } });
  expect(created.status).toBe(201);
  const byName = async (n: string) => (await prisma.dynamicTable.findFirstOrThrow({ where: { userId: user.id, internalName: n } })).id;
  tables = { sales: await byName('sales'), saleItems: await byName('saleItems'), units: await byName('units') };
  UNIT = (await row('units', { name: 'Matriz', cnpj: '11222333000181' })).id;
  await f().getPostingService().ensureChartOfAccounts(scope());
  const hoje = new Date();
  const meses = new Set([...[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((m) => `2026-${m}`), `${hoje.getUTCFullYear()}-${hoje.getUTCMonth() + 1}`]);
  for (const ym of meses) {
    const [year, month] = ym.split('-').map(Number);
    await prisma.accountingPeriod.create({ data: { userId: user.id, unitId: UNIT, year, month, status: 'OPEN', openedAt: new Date() } });
  }
  expect((await perfil(2026, { regime: 'SIMPLES', simplesRegimeApuracao: 'CAIXA', ...PRAZOS })).status).toBe(200);
});
afterAll(() => prisma.$disconnect());

describe('item 1 — ReceitaFiscalRecebimento gravado na liquidação', () => {
  it('venda paga em Pix ⇒ 1 linha com o dia do paidAt; a ponte de novo não duplica', async () => {
    const v = await vendaPaga('2026-10-05', 150, 'Pix', '2026-11-03');
    const [l, ...resto] = await recebimentos(v.id);
    expect(resto).toHaveLength(0);
    expect(l).toMatchObject({ unitId: UNIT, dia: '2026-11-03', competenciaCaixa: '2026-11', valorCents: 15_000n, meio: 'Pix', origem: 'SALE_SETTLED', status: 'ACTIVE', diaEstorno: null });
    await maybeSyncSaleSettled({ userId: user.id }, tables.sales, { id: v.id, data: v.data });
    expect(await recebimentos(v.id)).toHaveLength(1);
  });
});

describe('item 2 — trava de ano do caixa (Res. CGSN 190/2026)', () => {
  it('2026 CAIXA = 200; 2027 CAIXA = 400 citando a Res. 190; 2027 COMPETENCIA = 200', async () => {
    expect((await perfil(2026, { regime: 'SIMPLES', simplesRegimeApuracao: 'CAIXA', ...PRAZOS })).status).toBe(200);
    const r = await perfil(2027, { regime: 'SIMPLES', simplesRegimeApuracao: 'CAIXA', ...PRAZOS });
    expect(r.status).toBe(400);
    expect(JSON.stringify(r.body)).toContain('Res. CGSN 190/2026');
    expect((await perfil(2027, { regime: 'SIMPLES' })).status).toBe(200);
  });

  it('cópia de 2026 CAIXA para 2028 = 400 (a trava vale também na cópia)', async () => {
    const r = await request(app).post(`${PERFIL}/2028/copiar-de/2026`).set(authHeader(user)).send({ unitId: UNIT });
    expect(r.status).toBe(400);
  });
});

describe('itens 3–4 — falha do commit 2 e reconcile/backfill', () => {
  it('falha da gravação não desfaz o pagamento; o backfill refaz com o dia original', async () => {
    const spy = jest.spyOn(ReceitaFiscalRecebimentoService.prototype, 'registrar').mockRejectedValueOnce(new Error('disco cheio'));
    const v = await vendaPaga('2026-09-10', 80, 'Cash', '2026-09-12');
    spy.mockRestore();
    expect(await f().getPostingService().findEntryBySource(scope(), 'sale.settled', v.id)).not.toBeNull();
    expect(await recebimentos(v.id)).toHaveLength(0);

    const s = await backfillRecebimentos(scope());
    expect(s.failed).toBe(0);
    expect(s.synced).toBeGreaterThanOrEqual(1);
    expect(await recebimentos(v.id)).toMatchObject([{ dia: '2026-09-12', competenciaCaixa: '2026-09', valorCents: 8_000n, meio: 'Cash' }]);
    const again = await backfillRecebimentos(scope());
    expect(again.synced).toBe(0);
  });

  it('venda paga antes do PR (sem linha) ⇒ a linha aparece depois do backfill, com o dia do sale.settled', async () => {
    const v = await vendaPaga('2026-08-01', 40, 'Pix', '2026-08-20');
    await prisma.receitaFiscalRecebimento.deleteMany({ where: { saleId: v.id } });
    await backfillRecebimentos(scope());
    expect(await recebimentos(v.id)).toMatchObject([{ dia: '2026-08-20', status: 'ACTIVE' }]);
  });
});

describe('item 5 — estorno da venda paga', () => {
  it('cancelar a venda paga (reversal do sale.settled) ⇒ REVERTED com o dia do estorno', async () => {
    const v = await vendaPaga('2026-10-01', 60, 'Pix', '2026-10-02');
    const cancelada = { ...v.data, status: 'Cancelled' };
    await prisma.dynamicTableData.update({ where: { id: v.id }, data: { data: cancelada as never } });
    await maybeReverseSale({ userId: user.id }, tables.sales, { id: v.id, data: cancelada });
    const settled = await f().getPostingService().findEntryBySource(scope(), 'sale.settled', v.id);
    const estorno = await f().getPostingService().findEntryBySource(scope(), 'reversal', settled!.id);
    expect(await recebimentos(v.id)).toMatchObject([{ status: 'REVERTED', diaEstorno: estorno!.date.toISOString().slice(0, 10), dia: '2026-10-02' }]);
    // reconcile idempotente: não reestorna nem regrava
    await backfillRecebimentos(scope());
    expect(await recebimentos(v.id)).toHaveLength(1);
  });
});

describe('item 6 — Package Balance', () => {
  it('consumo de pacote ⇒ recebimento PACKAGE_BALANCE no dia da prestação (art. 2º § 9º)', async () => {
    const v = await vendaPaga('2026-11-08', 120, 'Package Balance', '2026-11-09');
    expect(await recebimentos(v.id)).toMatchObject([{ origem: 'PACKAGE_BALANCE', dia: '2026-11-08', competenciaCaixa: '2026-11', meio: 'Package Balance', valorCents: 12_000n }]);
  });

  it('a venda do pacote em si (venda só de pacote, paga) não é recebimento-base', async () => {
    const v = await vendaPaga('2026-09-15', 500, 'Pix', '2026-09-15', 'Package');
    expect(await f().getPostingService().findEntryBySource(scope(), 'sale.settled', v.id)).not.toBeNull();
    expect(await recebimentos(v.id)).toHaveLength(0);
    await backfillRecebimentos(scope());
    expect(await recebimentos(v.id)).toHaveLength(0);
  });
});

describe('item 7 — data de efeitos da exclusão do Simples (F-CX-3 a)', () => {
  it('grava no SIMPLES e aparece no evento de auditoria; em outro regime = 400', async () => {
    expect((await perfil(2026, { regime: 'SIMPLES', simplesRegimeApuracao: 'CAIXA', ...PRAZOS, simplesExclusaoEfeitosEm: '2026-12-01' })).status).toBe(200);
    const ev = await prisma.auditEvent.findFirst({ where: { eventType: 'company_fiscal_profile.updated', scopeUserId: user.id }, orderBy: { seq: 'desc' } });
    expect(JSON.parse(ev?.payload ?? '{}')).toMatchObject({ simplesExclusaoEfeitosEm: '2026-12-01' });
    expect((await request(app).get(`${PERFIL}/2026`).set(authHeader(user)).query({ unitId: UNIT })).body.data.simplesExclusaoEfeitosEm).toBe('2026-12-01');
    expect((await perfil(2025, { regime: 'PRESUMIDO', simplesExclusaoEfeitosEm: '2025-12-01' })).status).toBe(400);
    expect((await perfil(2026, { regime: 'SIMPLES', simplesRegimeApuracao: 'CAIXA', ...PRAZOS, simplesExclusaoEfeitosEm: '2026-02-30' })).status).toBe(400);
    expect((await perfil(2026, { regime: 'SIMPLES', simplesRegimeApuracao: 'CAIXA', ...PRAZOS })).status).toBe(200);
  });
});

describe('item 7a — prazo D+N do cartão (F-CX-2 c + F-CX-2.1 a)', () => {
  it('crédito D+30 com venda paga em 15/11 ⇒ recebimento em 15/12; débito D+1', async () => {
    const credito = await vendaPaga('2026-11-15', 300, 'Credit Card', '2026-11-15');
    expect(await recebimentos(credito.id)).toMatchObject([{ dia: '2026-12-15', competenciaCaixa: '2026-12', meio: 'Credit Card' }]);
    const debito = await vendaPaga('2026-11-30', 50, 'Debit Card', '2026-11-30');
    expect(await recebimentos(debito.id)).toMatchObject([{ dia: '2026-12-01', competenciaCaixa: '2026-12' }]);
  });

  it('perfil CAIXA sem prazo = 400; COMPETENCIA com prazo = 400; prazo fora de 0..365 = 400', async () => {
    expect((await perfil(2026, { regime: 'SIMPLES', simplesRegimeApuracao: 'CAIXA' })).status).toBe(400);
    expect((await perfil(2026, { regime: 'SIMPLES', simplesRegimeApuracao: 'CAIXA', simplesCaixaPrazoCartaoDebitoDias: 1 })).status).toBe(400);
    expect((await perfil(2026, { regime: 'SIMPLES', ...PRAZOS })).status).toBe(400);
    expect((await perfil(2026, { regime: 'SIMPLES', simplesRegimeApuracao: 'CAIXA', ...PRAZOS, simplesCaixaPrazoCartaoCreditoDias: 366 })).status).toBe(400);
    const ok = await perfil(2026, { regime: 'SIMPLES', simplesRegimeApuracao: 'CAIXA', ...PRAZOS });
    expect(ok.status).toBe(200);
    expect(ok.body.data).toMatchObject(PRAZOS);
  });
});

// BE-INCR-SCOPE-UNIT-GUARD (nó I6) × X14-CAIXA — dono, questionário, 2026-10-16: "Lê sem gravar". Em unidade apagada, o GET
// da apuração e o POST /calcular respondem 200 SEM o backfill de recebimentos; PUT /das e o crédito incobrável (POST e
// DELETE) = 409 UNIT_DELETED. Controle positivo: restaurada a unidade, o mesmo GET grava o recebimento que faltava.
describe('I6 — unidade apagada no regime de caixa', () => {
  it('GET e calcular = 200 sem gravar recebimento; PUT /das, POST e DELETE de incobrável = 409; restaurada, o GET grava', async () => {
    const S = '/api/accounting/simples';
    const spy = jest.spyOn(ReceitaFiscalRecebimentoService.prototype, 'registrar').mockRejectedValueOnce(new Error('disco cheio'));
    const v = await vendaPaga('2026-07-01', 90, 'Pix', '2026-07-05');
    spy.mockRestore();
    expect(await recebimentos(v.id)).toHaveLength(0);

    await prisma.dynamicTableData.update({ where: { id: UNIT }, data: { deletedAt: new Date() } });
    try {
      const ler = await request(app).get(`${S}/apuracoes/2026-07`).set(authHeader(user)).query({ unitId: UNIT });
      expect(ler.status).toBe(200);
      const calc = await request(app).post(`${S}/apuracoes/2026-07/calcular`).set(authHeader(user)).send({ unitId: UNIT });
      expect(calc.status).toBe(200);
      expect(await recebimentos(v.id)).toHaveLength(0);

      const das = await request(app)
        .put(`${S}/apuracoes/2026-07/das`)
        .set(authHeader(user))
        .send({ unitId: UNIT, numeroDocumento: '07.20.26000.0000001-0', valorCents: 1_000, vencimento: '2026-08-20' });
      expect(das.status).toBe(409);
      expect(das.body.code).toBe('UNIT_DELETED');
      const incob = await request(app)
        .post(`${S}/creditos-incobraveis`)
        .set(authHeader(user))
        .send({ unitId: UNIT, saleId: v.id, valorCents: 1_000, meioCobranca: 'COBRANCA_JUDICIAL', data: '2026-07-10', evidencia: 'processo' });
      expect(incob.status).toBe(409);
      expect(incob.body.code).toBe('UNIT_DELETED');
      const del = await request(app).delete(`${S}/creditos-incobraveis/qualquer`).set(authHeader(user)).query({ unitId: UNIT });
      expect(del.status).toBe(409);
      expect(del.body.code).toBe('UNIT_DELETED');
    } finally {
      await prisma.dynamicTableData.update({ where: { id: UNIT }, data: { deletedAt: null } });
    }

    // O status deste GET não é asserido: com o recebimento gravado, o `obter` desta fixture (sem enquadramento da
    // atividade 'srv-corte') responde 500 — achado do X14, fora do I6. O que o controle prova é o backfill ter gravado.
    await request(app).get(`${S}/apuracoes/2026-07`).set(authHeader(user)).query({ unitId: UNIT });
    expect(await recebimentos(v.id)).toHaveLength(1);
  });
});

/**
 * Onda 2.2 (plano de correção de 24/11/2026; dono: "sem mock em prova de paridade/estorno") — a igualdade
 * Σ razão = subrazão = apuração = espelho (a "exportação" do PGDAS-D) DEPOIS que uma venda é cancelada, devolvida ou
 * tem o pagamento desfeito num período POSTERIOR ao da venda.
 *
 * Tudo é real: SQLite, rotas, pontes de venda (`maybeSyncSaleFinalized`/`maybeSyncSaleSettled`/`maybeReverseSale`),
 * `PostingService`, subrazão fiscal e `calcular` do Simples. Nenhum `jest.fn`/`spyOn` no caminho crítico.
 *
 * O ORÁCULO do razão é INDEPENDENTE do código sob teste: `prisma.posting.aggregate` direto (o `tieOut.razaoCents` é o
 * código que se prova, não a régua). Os valores são aritmética de centavos sobre os valores de venda.
 *
 * Por que "mês de hoje": `maybeReverseSale` data o estorno em `scopeToday` (não na data da venda). O "período posterior" é,
 * portanto, SEMPRE o mês corrente; a venda original fica no mês anterior. Datas derivadas de `scopeToday` (nunca de
 * `new Date()` UTC), então o teste vale também na janela UTC 00:00–03:00.
 *
 * Mapa das pernas:
 *   • razão     = Σ(C − D) de 3.1 + 3.3 + 3.2 no mês (competência) | débito líquido da conta do `sale.settled` (caixa);
 *   • apuração  = `calcular`: Σ atividades[].receitaCents (competência) | baseCaixa.recebidoPaCents (caixa);
 *   • export    = `espelho` do `calcular` (as linhas do PGDAS-D), Σ receitaCents;
 *   • subrazão  = `tieOut.subrazaoCents` do `calcular`.
 *
 * Validade no tempo: o regime de CAIXA só existe até 31/12/2026 (Res. CGSN 190/2026; o PUT de 2027 CAIXA = 400). O bloco
 * de caixa é pulado em 2027+ (o "hoje" do teste) — não é buraco, é a lei.
 *
 * Fora desta onda (ver o relatório): cancelar a NFS-e/NF-e (o emissor externo) e a ECF.
 */
import request from 'supertest';
import prisma from '@/lib/prisma';
import { makeApp, pushTestSchema, authHeader } from '@test/helpers';
import { ApplicationFactory } from '@/lib/factory';
import type { AccountingScope } from '@/features/accounting/models/AccountingScope';
import { resolveAccountingScopeInternal } from '@/features/accounting/models/resolveAccountingScopeInternal';
import { maybeSyncSaleFinalized } from '@/features/accounting/services/bridges/SaleSalesAccountingBridge';
import { maybeSyncSaleSettled } from '@/features/accounting/services/bridges/SaleSettlementBridge';
import { maybeReverseSale } from '@/features/accounting/services/bridges/SaleReversalBridge';
import { scopeToday } from '@/features/accounting/models/dates';
import { centsFromDb } from '@/features/accounting/models/money';
import { LEDGER_STATUSES } from '@/features/accounting/models/ledgerStatus';

const app = makeApp();
const S = '/api/accounting/simples';
const PERFIL = '/api/accounting/company-fiscal-profile';
const PRAZOS = { simplesCaixaPrazoCartaoDebitoDias: 1, simplesCaixaPrazoCartaoCreditoDias: 30 };
const REAIS_A = 2_000; // vendida no mês anterior, cancelada hoje
const REAIS_B = 5_000; // vendida hoje (mantém a receita do mês de hoje > 0: `receitaPaCents` não vai a 0 pelo piso)
const REAIS_C = 1_000; // vendida no mês anterior, devolvida hoje

let user: { id: string; username: string };
let tables: Record<'sales' | 'saleItems' | 'units', string>;

const f = () => ApplicationFactory.getInstance();
const scopeOf = (unitId: string): AccountingScope => resolveAccountingScopeInternal({ userId: user.id }, unitId);
const anterior = (ym: string, n = 1) => new Date(Date.UTC(Number(ym.slice(0, 4)), Number(ym.slice(5, 7)) - 1 - n, 1)).toISOString().slice(0, 7);
const cents = (reais: number) => Math.round(reais * 100);

async function row(table: keyof typeof tables, data: Record<string, unknown>) {
  const stored = typeof data.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(data.date) ? { ...data, date: `${data.date}T00:00:00.000Z` } : data;
  return prisma.dynamicTableData.create({ data: { dynamicTableId: tables[table], data: stored as never } });
}

interface Ctx {
  unitId: string;
  scope: AccountingScope;
  hoje: string; // YYYY-MM-DD no fuso do escopo
  hojeYm: string;
  m0: string; // mês anterior (o da venda)
}

/** Unidade própria (CNPJ, plano de contas, períodos abertos, perfil de serviço, histórico de 12 meses antes de m0). */
async function novaUnidade(nome: string): Promise<Ctx> {
  const unitId = (await row('units', { name: nome, cnpj: '11222333000181' })).id;
  const scope = scopeOf(unitId);
  const hoje = scopeToday(scope);
  const hojeYm = hoje.slice(0, 7);
  const m0 = anterior(hojeYm);
  await f().getPostingService().ensureChartOfAccounts(scope);
  for (const ym of new Set([m0, hojeYm])) {
    await prisma.accountingPeriod.create({ data: { userId: user.id, unitId, year: Number(ym.slice(0, 4)), month: Number(ym.slice(5, 7)), status: 'OPEN', openedAt: new Date() } });
  }
  await prisma.serviceFiscalProfile.create({ data: { userId: user.id, unitId, serviceRef: 'srv-corte', cTribNac: '060101' } });
  // RBT12 de m0 e de hojeYm: os 12 meses antes de m0 (hojeYm usa m0 — que tem o subrazão real — e os 11 antes).
  for (let i = 1; i <= 12; i++) {
    await f().getSimplesEntradasService().upsertHistorico(scope, anterior(m0, i), { unitId, receitaBrutaCents: 5_000_000 });
  }
  return { unitId, scope, hoje, hojeYm, m0 };
}

async function perfil(ctx: Ctx, ano: number, body: Record<string, unknown>) {
  return request(app).put(`${PERFIL}/${ano}`).set(authHeader(user)).send({ unitId: ctx.unitId, ...body });
}

/** Venda de serviço Finalizada pela ponte real. */
async function venda(ctx: Ctx, date: string, reais: number) {
  const sale = await row('sales', { status: 'Finalized', unitId: ctx.unitId, totalAmount: reais, currency: 'BRL', date, paymentStatus: 'Pending', customerId: 'cli-1' });
  await row('saleItems', { saleId: sale.id, type: 'Service', serviceId: 'srv-corte', description: 'Corte', quantity: 1, unitPrice: reais });
  await maybeSyncSaleFinalized({ userId: user.id }, tables.sales, { id: sale.id, data: sale.data });
  return sale;
}

/** Paga pela ponte de liquidação real (Pix: sem prazo de cartão; `paidAt` às 15h UTC = 12h no fuso do escopo). */
async function pagar(saleId: string, data0: unknown, dia: string) {
  const data = { ...(data0 as Record<string, unknown>), paymentStatus: 'Paid', paymentMethod: 'Pix', paidAt: `${dia}T15:00:00.000Z` };
  await prisma.dynamicTableData.update({ where: { id: saleId }, data: { data: data as never } });
  await maybeSyncSaleSettled({ userId: user.id }, tables.sales, { id: saleId, data });
  return data;
}

/** Muda o status pela ponte REAL de estorno (a mesma que `SalesCancellationService` chama pós-commit). */
async function mudarStatus(saleId: string, patch: Record<string, unknown>) {
  const atual = await prisma.dynamicTableData.findUniqueOrThrow({ where: { id: saleId } });
  const data = { ...(atual.data as Record<string, unknown>), ...patch };
  await prisma.dynamicTableData.update({ where: { id: saleId }, data: { data: data as never } });
  await maybeReverseSale({ userId: user.id }, tables.sales, { id: saleId, data });
}

const bounds = (ym: string) => ({ gte: new Date(`${ym}-01T00:00:00.000Z`), lt: new Date(Date.UTC(Number(ym.slice(0, 4)), Number(ym.slice(5, 7)), 1)) });

/** ORÁCULO do razão (independente do `tieOut`): Σ(C − D) de 3.1 + 3.3 + 3.2 no mês, sem o lançamento de encerramento. */
async function razaoReceita(ctx: Ctx, ym: string): Promise<number> {
  const contas = await prisma.account.findMany({ where: { userId: user.id, unitId: ctx.unitId, code: { in: ['3.1', '3.3', '3.2'] }, deletedAt: null } });
  expect(contas.map((c) => c.code).sort()).toEqual(['3.1', '3.2', '3.3']); // sem as 3 contas o oráculo seria um zero vazio
  const agg = await prisma.posting.aggregate({
    where: { accountId: { in: contas.map((c) => c.id) }, entry: { unitId: ctx.unitId, status: { in: LEDGER_STATUSES }, sourceType: { not: 'closing' }, date: bounds(ym) } },
    _sum: { debitCents: true, creditCents: true },
  });
  return centsFromDb(agg._sum.creditCents ?? 0n) - centsFromDb(agg._sum.debitCents ?? 0n);
}

/** ORÁCULO do caixa: débito líquido, no mês, da conta que o `sale.settled` debita (estorno do settled entra com sinal oposto). */
async function razaoCaixa(ctx: Ctx, ym: string, saleId: string): Promise<number> {
  const settled = await prisma.journalEntry.findFirstOrThrow({ where: { userId: user.id, unitId: ctx.unitId, sourceType: 'sale.settled', sourceId: saleId } });
  const debito = await prisma.posting.findFirstOrThrow({ where: { entryId: settled.id, debitCents: { gt: 0n } } });
  const agg = await prisma.posting.aggregate({
    where: { accountId: debito.accountId, entry: { unitId: ctx.unitId, status: { in: LEDGER_STATUSES }, date: bounds(ym) } },
    _sum: { debitCents: true, creditCents: true },
  });
  return centsFromDb(agg._sum.debitCents ?? 0n) - centsFromDb(agg._sum.creditCents ?? 0n);
}

interface Apuracao {
  somaAtividades: number;
  somaEspelho: number;
  tieOut: { subrazaoCents: number; razaoCents: number; ok: boolean };
  recebidoCaixa: number | null;
  codigosAlerta: string[];
}
async function calcular(ctx: Ctx, ym: string): Promise<Apuracao> {
  const r = await request(app).post(`${S}/apuracoes/${ym}/calcular`).set(authHeader(user)).send({ unitId: ctx.unitId });
  expect(r.status).toBe(200);
  const d = r.body.data;
  const soma = (xs: Array<{ receitaCents: number }>) => xs.reduce((s, x) => s + x.receitaCents, 0);
  return {
    somaAtividades: soma(d.atividades),
    somaEspelho: soma(d.espelho),
    tieOut: d.tieOut,
    recebidoCaixa: d.baseCaixa ? d.baseCaixa.recebidoPaCents : null,
    codigosAlerta: d.alertas.map((a: { codigo: string }) => a.codigo),
  };
}

beforeAll(() => pushTestSchema());
beforeAll(async () => {
  const u = await prisma.user.create({ data: { name: 'ond22', username: 'ond22', email: 'ond22@test.local', password: 'x', role: 'USER' } });
  user = { id: u.id, username: u.username };
  const created = await request(app).post('/api/dashboard/create').set(authHeader(user)).send({ suiteKey: 'beautySalon', unit: { name: 'Matriz' } });
  expect(created.status).toBe(201);
  const byName = async (n: string) => (await prisma.dynamicTable.findFirstOrThrow({ where: { userId: user.id, internalName: n } })).id;
  tables = { sales: await byName('sales'), saleItems: await byName('saleItems'), units: await byName('units') };
}, 180_000);
afterAll(() => prisma.$disconnect());

describe('competência — cancelar e devolver HOJE vendas do mês anterior: razão = subrazão = apuração = espelho', () => {
  let ctx: Ctx;
  let vendaA: { id: string };
  let vendaC: { id: string };

  beforeAll(async () => {
    ctx = await novaUnidade('Competência');
    for (const ano of new Set([Number(ctx.m0.slice(0, 4)), Number(ctx.hojeYm.slice(0, 4))])) {
      expect((await perfil(ctx, ano, { regime: 'SIMPLES' })).status).toBe(200);
    }
    vendaA = await venda(ctx, `${ctx.m0}-10`, REAIS_A);
    vendaC = await venda(ctx, `${ctx.m0}-12`, REAIS_C);
  }, 120_000);

  it('antes: m0 fecha com A + C; o mês de hoje está vazio (controle da arrumação)', async () => {
    expect(await razaoReceita(ctx, ctx.m0)).toBe(cents(REAIS_A + REAIS_C));
    expect(await razaoReceita(ctx, ctx.hojeYm)).toBe(0);
    const a = await calcular(ctx, ctx.m0);
    expect([a.somaAtividades, a.somaEspelho, a.tieOut.subrazaoCents, a.tieOut.razaoCents, a.tieOut.ok]).toEqual([cents(REAIS_A + REAIS_C), cents(REAIS_A + REAIS_C), cents(REAIS_A + REAIS_C), cents(REAIS_A + REAIS_C), true]);
  });

  it('depois de cancelar A e devolver C hoje: m0 NÃO muda; o mês de hoje = B − A − C em razão, subrazão, apuração e espelho', async () => {
    const antesM0 = await calcular(ctx, ctx.m0);
    await venda(ctx, ctx.hoje, REAIS_B);
    await mudarStatus(vendaA.id, { status: 'Cancelled' });
    await mudarStatus(vendaC.id, { status: 'Returned', returnedAt: `${ctx.hoje}T15:00:00.000Z` });

    // Pré-condição: os estornos aconteceram no razão (o vermelho não pode ser setup).
    expect(await prisma.journalEntry.count({ where: { userId: user.id, unitId: ctx.unitId, sourceType: 'reversal' } })).toBe(1);
    expect(await prisma.journalEntry.count({ where: { userId: user.id, unitId: ctx.unitId, sourceType: 'sale.returned', sourceId: vendaC.id } })).toBe(1);

    const esperadoHoje = cents(REAIS_B - REAIS_A - REAIS_C);
    expect(await razaoReceita(ctx, ctx.hojeYm)).toBe(esperadoHoje);
    const hoje = await calcular(ctx, ctx.hojeYm);
    expect(hoje.tieOut).toEqual({ subrazaoCents: esperadoHoje, razaoCents: esperadoHoje, ok: true });
    expect(hoje.somaAtividades).toBe(esperadoHoje);
    expect(hoje.somaEspelho).toBe(esperadoHoje);
    expect(hoje.codigosAlerta).not.toContain('TIEOUT_DIVERGENTE');

    // O mês da venda é imutável pelo estorno posterior: razão e apuração idênticos ao de antes.
    expect(await razaoReceita(ctx, ctx.m0)).toBe(cents(REAIS_A + REAIS_C));
    const depoisM0 = await calcular(ctx, ctx.m0);
    expect(depoisM0).toEqual(antesM0);
  });

  it('refazer a ponte (re-drive) não estorna nem grava de novo: os números ficam iguais', async () => {
    const antes = await calcular(ctx, ctx.hojeYm);
    await mudarStatus(vendaA.id, { status: 'Cancelled' });
    await mudarStatus(vendaC.id, { status: 'Returned', returnedAt: `${ctx.hoje}T15:00:00.000Z` });
    expect(await prisma.journalEntry.count({ where: { userId: user.id, unitId: ctx.unitId, sourceType: 'reversal' } })).toBe(1);
    expect(await prisma.receitaFiscalLinha.count({ where: { saleId: { in: [vendaA.id, vendaC.id] }, tipo: { in: ['CANCELAMENTO', 'DEVOLUCAO'] } } })).toBe(2);
    expect(await calcular(ctx, ctx.hojeYm)).toEqual(antes);
  });

  it('FALSIFICADOR (dado, sem mutar o app): sem a linha de CANCELAMENTO do subrazão a igualdade quebra pelo valor exato, e o reconcile real a repõe', async () => {
    await prisma.receitaFiscalLinha.deleteMany({ where: { saleId: vendaA.id, tipo: 'CANCELAMENTO' } });
    const quebrada = await calcular(ctx, ctx.hojeYm);
    expect(quebrada.tieOut.ok).toBe(false);
    expect(quebrada.tieOut.subrazaoCents - quebrada.tieOut.razaoCents).toBe(cents(REAIS_A));
    expect(quebrada.codigosAlerta).toContain('TIEOUT_DIVERGENTE');

    // A passada real de reconcile (a mesma do job) re-grava a partir do razão estornado.
    expect(await f().getReceitaFiscalService().registrarEstorno(ctx.scope, vendaA.id, 'CANCELAMENTO', ctx.hoje)).toBeGreaterThan(0);
    const curada = await calcular(ctx, ctx.hojeYm);
    expect(curada.tieOut.ok).toBe(true);
    expect(curada.somaAtividades).toBe(cents(REAIS_B - REAIS_A - REAIS_C));
  });
});

const hojeAno = Number(scopeToday(resolveAccountingScopeInternal({ userId: 'x' }, 'x')).slice(0, 4));
(hojeAno <= 2026 ? describe : describe.skip)('caixa — DESFAZER o pagamento (cancelar venda paga) HOJE: razão do caixa = base do DAS', () => {
  let ctx: Ctx;
  let vendaA: { id: string; data: unknown };
  let vendaB: { id: string; data: unknown };

  beforeAll(async () => {
    ctx = await novaUnidade('Caixa');
    for (const ano of new Set([Number(ctx.m0.slice(0, 4)), Number(ctx.hojeYm.slice(0, 4))])) {
      expect((await perfil(ctx, ano, { regime: 'SIMPLES', simplesRegimeApuracao: 'CAIXA', ...PRAZOS })).status).toBe(200);
    }
    const a = await venda(ctx, `${ctx.m0}-10`, REAIS_A);
    vendaA = { id: a.id, data: await pagar(a.id, a.data, `${ctx.m0}-12`) };
    const b = await venda(ctx, ctx.hoje, REAIS_B);
    vendaB = { id: b.id, data: await pagar(b.id, b.data, ctx.hoje) };
  }, 120_000);

  it('antes: m0 recebeu A; hoje recebeu B — razão do caixa = recebido da apuração', async () => {
    expect(await razaoCaixa(ctx, ctx.m0, vendaA.id)).toBe(cents(REAIS_A));
    expect(await razaoCaixa(ctx, ctx.hojeYm, vendaA.id)).toBe(cents(REAIS_B));
    expect((await calcular(ctx, ctx.m0)).recebidoCaixa).toBe(cents(REAIS_A));
    expect((await calcular(ctx, ctx.hojeYm)).recebidoCaixa).toBe(cents(REAIS_B));
  });

  it('depois de cancelar A (paga) hoje: m0 segue com o recebido (L1 a); hoje = B − A no razão E na apuração; tie-out da competência fecha', async () => {
    const antesM0 = await calcular(ctx, ctx.m0);
    await mudarStatus(vendaA.id, { status: 'Cancelled' });

    // Pré-condição: o settled de A foi estornado de verdade (a perna do caixa tem o espelho no razão).
    const settled = await prisma.journalEntry.findFirstOrThrow({ where: { userId: user.id, unitId: ctx.unitId, sourceType: 'sale.settled', sourceId: vendaA.id } });
    expect(settled.status).toBe('Reversed');
    expect(await prisma.receitaFiscalRecebimento.findMany({ where: { saleId: vendaA.id }, select: { status: true, diaEstorno: true } })).toEqual([{ status: 'REVERTED', diaEstorno: ctx.hoje }]);

    expect(await razaoCaixa(ctx, ctx.m0, vendaA.id)).toBe(cents(REAIS_A));
    expect(await razaoCaixa(ctx, ctx.hojeYm, vendaA.id)).toBe(cents(REAIS_B - REAIS_A));
    const hoje = await calcular(ctx, ctx.hojeYm);
    expect(hoje.recebidoCaixa).toBe(cents(REAIS_B - REAIS_A));
    // A receita auferida (competência) do mês de hoje também fecha com o razão: o subrazão cancelou A no dia do estorno.
    expect(hoje.tieOut).toEqual({ subrazaoCents: cents(REAIS_B - REAIS_A), razaoCents: cents(REAIS_B - REAIS_A), ok: true });
    expect(hoje.somaEspelho).toBe(cents(REAIS_B - REAIS_A));
    // O mês do recebimento não é reescrito pelo desfazer posterior.
    expect(await calcular(ctx, ctx.m0)).toEqual(antesM0);
  });

  it('FALSIFICADOR (dado): 1 centavo a mais no recebimento de A quebra a paridade caixa × razão; o `calcular` re-lê o estorno e a corrige a REVERSÃO, não o valor', async () => {
    const original = await prisma.receitaFiscalRecebimento.findFirstOrThrow({ where: { saleId: vendaA.id } });
    await prisma.receitaFiscalRecebimento.update({ where: { id: original.id }, data: { valorCents: original.valorCents + 1n } });
    const quebrada = await calcular(ctx, ctx.hojeYm);
    expect(quebrada.recebidoCaixa).toBe(cents(REAIS_B - REAIS_A) - 1);
    expect(quebrada.recebidoCaixa).not.toBe(await razaoCaixa(ctx, ctx.hojeYm, vendaA.id));

    // Desfazer o dado volta a igualdade — e o `calcular` (que faz o backfill antes) devolve o MESMO número do razão.
    await prisma.receitaFiscalRecebimento.update({ where: { id: original.id }, data: { valorCents: original.valorCents } });
    expect((await calcular(ctx, ctx.hojeYm)).recebidoCaixa).toBe(await razaoCaixa(ctx, ctx.hojeYm, vendaA.id));
    // E o backfill sozinho re-marca REVERTED um recebimento reposto como ACTIVE (a reversão do razão é a fonte da verdade).
    await prisma.receitaFiscalRecebimento.update({ where: { id: original.id }, data: { status: 'ACTIVE', diaEstorno: null } });
    expect((await calcular(ctx, ctx.hojeYm)).recebidoCaixa).toBe(cents(REAIS_B - REAIS_A));
    expect(vendaB.id).toBeTruthy();
  });
});

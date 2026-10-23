/**
 * BE-INCR-IRRF-DISTRIBUICAO PR-4 (BRIEF itens 27–31; F-IRD-11; lacunas L-IRD-4/5/6 de 23/10) — confirmação do JCP,
 * lançamento real, Parte A `system` do e-Lalur/e-Lacs, cancelamento e DARF 5706. Os nomes dos casos do item 27/28 são os
 * que o cabeçalho `atomicUntil` do InterestOnEquityService cita.
 *
 * Números: capital 1.000.000,00 + lucros acumulados 100.000,00 em 31/12/2025 ⇒ juros pela TJLP no T01 ≈ 25,2 mil;
 * sem receita no período, o limite é 50% dos lucros acumulados (50.000,00) ou os juros, o menor.
 */
import request from 'supertest';
import prisma from '@/lib/prisma';
import { getFactory } from '@/lib/factory';
import { InterestOnEquityRepository } from '@/features/accounting/repositories/InterestOnEquityRepository';
import { resolveAccountingScopeInternal } from '@/features/accounting/scope/resolveAccountingScopeInternal';
import { makeApp, pushTestSchema, authHeader, seedUnit } from '@test/helpers';

const app = makeApp();
const BASE = '/api/accounting/jcp';
const FONTE = 'jcp.credit';
const CONTAS = [
  { code: '1.1.1.01', name: 'Banco', nature: 'Asset' },
  { code: '2.1.7.02', name: 'JCP a Pagar', nature: 'Liability' },
  { code: '2.1.7.03', name: 'IRRF a Recolher', nature: 'Liability' },
  { code: '2.3.1.01', name: 'Lucros Acumulados', nature: 'Equity' },
  { code: '2.3.2.01', name: 'Capital Social Integralizado', nature: 'Equity' },
  { code: '2.3.3.01', name: 'Reserva Legal', nature: 'Equity' },
  { code: '4.3.4', name: 'Juros sobre o Capital Próprio', nature: 'Expense' },
];
type Dono = { id: string; username: string; unitId: string; ids: Record<string, string>; socios: string[] };

let seq = 0;
async function cenario(opts: { marcoFechado?: boolean } = {}): Promise<Dono> {
  seq += 1;
  const u = await prisma.user.create({ data: { name: `jcpc-${seq}`, username: `jcpc-${seq}`, email: `jcpc-${seq}@test.local`, password: 'x', role: 'USER' } });
  const unitId = `unit-jcpc-${seq}`;
  await seedUnit({ userId: u.id, id: unitId });
  const ids: Record<string, string> = {};
  for (const c of CONTAS) ids[c.code] = (await prisma.account.create({ data: { userId: u.id, unitId, ...c, acceptsEntries: true } })).id;
  for (const year of [2025, 2026]) {
    for (let month = 1; month <= 12; month++) {
      await prisma.accountingPeriod.create({ data: { userId: u.id, unitId, year, month, status: 'OPEN', openedAt: new Date() } });
    }
  }
  await prisma.companyFiscalProfile.create({
    data: {
      userId: u.id,
      anoCalendario: 2026,
      regime: 'REAL',
      ecfIndAliqCsll: '1',
      ecfIndRecReceita: '2',
      jcpBaseContas: {
        CAPITAL_INTEGRALIZADO: [ids['2.3.2.01']],
        RESERVAS_CAPITAL: [],
        RESERVAS_LUCROS: [ids['2.3.3.01']],
        ACOES_TESOURARIA: [],
        LUCROS_ACUMULADOS: [ids['2.3.1.01']],
      },
    },
  });
  await prisma.fiscalProfile.create({
    data: {
      userId: u.id,
      unitId,
      regimeTributario: 'REAL',
      pisCofinsRegime: 'NAO_CUMULATIVO',
      jcpDespesaAccountId: ids['4.3.4'],
      jcpPagarAccountId: ids['2.1.7.02'],
      irrfRecolherAccountId: ids['2.1.7.03'],
    },
  });
  const socios: string[] = [];
  for (const [i, [taxId, bp]] of ([['52998224725', 6000], ['39053344705', 4000]] as const).entries()) {
    socios.push((await prisma.partner.create({ data: { userId: u.id, nome: `S${i}`, taxId, tipoPessoa: 'PF', residenteBrasil: true, participacaoBp: bp, entradaEm: '2025-01-01' } })).id);
  }
  const dono = { ...u, unitId, ids, socios };
  await lancar(dono, '2025-12-31', '1.1.1.01', '2.3.2.01', 100_000_000);
  await lancar(dono, '2025-12-31', '1.1.1.01', '2.3.1.01', 10_000_000);
  if (opts.marcoFechado) await prisma.accountingPeriod.updateMany({ where: { userId: u.id, year: 2026, month: 3 }, data: { status: 'HARD_CLOSED' } });
  return dono;
}

async function lancar(dono: Dono, date: string, debito: string, credito: string, cents: number): Promise<void> {
  seq += 1;
  await getFactory().getPostingService().postEntry(resolveAccountingScopeInternal({ userId: dono.id }, dono.unitId), {
    unitId: dono.unitId,
    date,
    description: `teste ${seq}`,
    sourceType: 'manual',
    lines: [{ accountCode: debito, debitCents: cents, creditCents: 0 }, { accountCode: credito, debitCents: 0, creditCents: cents }],
  });
}

const corpo = (dono: Dono, extra: Record<string, unknown> = {}) => ({
  unitId: dono.unitId,
  anoCalendario: 2026,
  periodo: 'T01',
  dataCredito: '2026-03-25',
  forma: 'DESPESA',
  totalCents: 1_000_000,
  ...extra,
});
const previa = (dono: Dono, extra: Record<string, unknown> = {}) => request(app).post(`${BASE}/preview`).set(authHeader(dono)).send(corpo(dono, extra));
async function confirmar(dono: Dono, extra: Record<string, unknown> = {}) {
  const p = await previa(dono, extra);
  expect(p.status).toBe(200);
  return { previa: p.body.data, r: await request(app).post(BASE).set(authHeader(dono)).send({ ...corpo(dono, extra), previaSha256: p.body.data.previaSha256 }) };
}
const lancamentos = (dono: Dono) =>
  prisma.journalEntry.findMany({ where: { userId: dono.id, sourceType: FONTE }, include: { postings: { include: { account: true } } }, orderBy: { createdAt: 'asc' } });
const pernas = (e: { postings: Array<{ debitCents: bigint; creditCents: bigint; account: { code: string } }> }) =>
  e.postings.map((p) => [p.account.code, Number(p.debitCents), Number(p.creditCents)]).sort();
const parteA = (dono: Dono, vivas = true) =>
  prisma.lalurEntry.findMany({ where: { userId: dono.id, ...(vivas ? { deletedAt: null } : {}) }, include: { journalLinks: true }, orderBy: { livro: 'asc' } });

describe('IRRF-DISTRIBUICAO PR-4 — confirmação, lançamento, e-Lalur e cancelamento do JCP', () => {
  beforeAll(async () => {
    pushTestSchema();
  }, 120000);

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('itens 27 e 28 (DESPESA sem excesso): D despesa total / C JCP a pagar líquido / C IRRF; alocações gravadas; Parte A vazia', async () => {
    const dono = await cenario();
    const { r } = await confirmar(dono);
    expect(r.status).toBe(201);
    expect(r.body.data).toMatchObject({ status: 'POSTED', totalCents: 1_000_000, irrfCents: 175_000, liquidoCents: 825_000, excessoCents: 0, lalurEntryIds: [] });
    expect(r.body.data.alocacoes).toEqual([
      { partnerId: dono.socios[0], participacaoBp: 6000, brutoCents: 600_000, irrfCents: 105_000, liquidoCents: 495_000 },
      { partnerId: dono.socios[1], participacaoBp: 4000, brutoCents: 400_000, irrfCents: 70_000, liquidoCents: 330_000 },
    ]);
    const es = await lancamentos(dono);
    expect(es.map((e) => e.id)).toEqual([r.body.data.entryId]);
    expect(pernas(es[0])).toEqual([['2.1.7.02', 0, 825_000], ['2.1.7.03', 0, 175_000], ['4.3.4', 1_000_000, 0]]);
    expect(await parteA(dono)).toHaveLength(0);
  });

  it.each([
    ['DESPESA com excesso: adição "20" pelo excesso, ligada à despesa e ao lançamento', 'DESPESA', 6_000_000, '20', 'excesso'],
    ['PL sem excesso: exclusão "166.03" pelo total, ligada à conta de PL', 'PL', 1_000_000, '166.03', 'total'],
    ['PL com excesso: exclusão "166.03" só pelo limite, sem adição', 'PL', 6_000_000, '166.03', 'limite'],
  ] as const)('item 29 — %s; despesa líquida de ajustes = limite', async (_n, forma, total, codigo, valor) => {
    const dono = await cenario();
    const extra = { forma, totalCents: total, ...(forma === 'PL' ? { debitoPlAccountId: dono.ids['2.3.1.01'] } : {}) };
    const { r, previa: p } = await confirmar(dono, extra);
    expect([r.status, r.body.data.status]).toEqual([201, 'POSTED']);
    const lim = p.limiteDedutivelCents;
    const esperado = valor === 'excesso' ? total - lim : valor === 'total' ? total : lim;
    const linhas = await parteA(dono);
    expect(linhas.map((l) => [l.livro, l.codigo, Number(l.valorCents), l.origem, l.indRelacao, l.accountId, l.journalLinks.map((j) => j.journalEntryId)])).toEqual(
      ['lacs', 'lalur'].map((livro) => [livro, codigo, esperado, 'system', '2', forma === 'PL' ? dono.ids['2.3.1.01'] : dono.ids['4.3.4'], [r.body.data.entryId]]),
    );
    expect(r.body.data.lalurEntryIds.sort()).toEqual(linhas.map((l) => l.id).sort());
    // DESPESA: despesa − adição = limite; PL: exclusão = min(total, limite).
    const deducao = forma === 'DESPESA' ? total - esperado : esperado;
    expect(deducao).toBe(Math.min(total, lim));
    if (forma === 'PL') expect(pernas((await lancamentos(dono))[0])[2]).toEqual(['2.3.1.01', total, 0]);
  });

  it('item 27: a confirmação recalcula na tx — prévia velha → 409 PREVIA_DESATUALIZADA; outra no mesmo período → 409', async () => {
    const dono = await cenario();
    const p = await previa(dono);
    await lancar(dono, '2026-02-10', '1.1.1.01', '2.3.2.01', 1_000_000); // aumento de capital muda a base
    const velha = await request(app).post(BASE).set(authHeader(dono)).send({ ...corpo(dono), previaSha256: p.body.data.previaSha256 });
    expect([velha.status, velha.body.code]).toEqual([409, 'PREVIA_DESATUALIZADA']);
    expect(await prisma.interestOnEquityCalculation.count({ where: { userId: dono.id } })).toBe(0);
    expect((await confirmar(dono)).r.status).toBe(201);
    const outra = await confirmar(dono, { totalCents: 500_000 });
    expect([outra.r.status, outra.r.body.code]).toEqual([409, 'JCP_JA_CONFIRMADO_NO_PERIODO']);
  });

  it('item 28: período fechado ⇒ ACCOUNTING_PERIOD_NOT_OPEN e nada grava (nem cálculo, nem lançamento)', async () => {
    const dono = await cenario({ marcoFechado: true });
    const { r } = await confirmar(dono);
    expect(r.body.code).toBe('ACCOUNTING_PERIOD_NOT_OPEN');
    expect(await prisma.interestOnEquityCalculation.count({ where: { userId: dono.id } })).toBe(0);
    expect(await lancamentos(dono)).toHaveLength(0);
  });

  it('item 28 (commit 2 — CAS): crash entre o postEntry e o CAS ⇒ pendente; reconcile reaproveita o lançamento e grava a Parte A', async () => {
    const dono = await cenario();
    const spy = jest.spyOn(InterestOnEquityRepository.prototype, 'markPosted').mockRejectedValueOnce(new Error('crash entre commits'));
    const { r } = await confirmar(dono, { totalCents: 6_000_000 });
    spy.mockRestore();
    expect([r.status, r.body.data.status, r.body.data.entryId, r.body.data.lalurEntryIds]).toEqual([201, 'PENDING_POST', null, null]);
    expect(await lancamentos(dono)).toHaveLength(1);
    expect(await parteA(dono)).toHaveLength(0);
    const rec = await request(app).post(`${BASE}/${r.body.data.id}/lancamento`).set(authHeader(dono)).send({ unitId: dono.unitId });
    expect([rec.status, rec.body.data.status]).toEqual([200, 'POSTED']);
    const es = await lancamentos(dono);
    expect(es).toHaveLength(1);
    expect(rec.body.data.entryId).toBe(es[0].id);
    expect(await parteA(dono)).toHaveLength(2);
  });

  it('item 28 (reconcile): 2ª chamada não lança nem grava a Parte A de novo', async () => {
    const dono = await cenario();
    const spy = jest.spyOn(InterestOnEquityRepository.prototype, 'setLalurEntryIds').mockRejectedValueOnce(new Error('crash na Parte A'));
    const { r } = await confirmar(dono, { totalCents: 6_000_000 });
    spy.mockRestore();
    expect([r.body.data.status, r.body.data.lalurEntryIds]).toEqual(['POSTED', null]);
    expect(await parteA(dono)).toHaveLength(0); // a tx da Parte A desfez as linhas junto com o CAS
    const rec = () => request(app).post(`${BASE}/${r.body.data.id}/lancamento`).set(authHeader(dono)).send({ unitId: dono.unitId });
    const um = await rec();
    const dois = await rec();
    expect(dois.body.data.lalurEntryIds).toEqual(um.body.data.lalurEntryIds);
    expect(um.body.data.lalurEntryIds).toHaveLength(2);
    expect(await parteA(dono)).toHaveLength(2);
    expect(await lancamentos(dono)).toHaveLength(1);
  });

  it('item 30: cancelar estorna e arquiva a Parte A, e libera o período; JCP pago (baixa no JCP a pagar) → 409', async () => {
    const dono = await cenario();
    const { r } = await confirmar(dono, { totalCents: 6_000_000 });
    const cancelar = (id: string) => request(app).post(`${BASE}/${id}/cancel`).set(authHeader(dono)).send({ unitId: dono.unitId });
    const c = await cancelar(r.body.data.id);
    expect([c.status, c.body.data.status]).toEqual([200, 'CANCELLED']);
    expect((await prisma.journalEntry.findUnique({ where: { id: r.body.data.entryId } }))?.status).toBe('Reversed');
    expect(await parteA(dono)).toHaveLength(0);
    expect((await parteA(dono, false)).every((l) => l.deletedAt !== null && l.codigo.startsWith('deleted:'))).toBe(true);

    const de2 = await confirmar(dono); // o período ficou livre
    expect(de2.r.status).toBe(201);
    await lancar(dono, '2026-04-05', '2.1.7.02', '1.1.1.01', 100_000); // pagamento ao sócio
    const pago = await cancelar(de2.r.body.data.id);
    expect([pago.status, pago.body.code]).toEqual([409, 'JCP_JA_PAGO']);
    expect((await prisma.journalEntry.findUnique({ where: { id: de2.r.body.data.entryId } }))?.status).toBe('Posted');
  });

  it('item 31 (L13, L16): DARF 5706 por decêndio — crédito em 25/03 vence em 03/04/2026', async () => {
    const dono = await cenario();
    const { r } = await confirmar(dono);
    const s = await request(app).get(`${BASE}/irrf`).set(authHeader(dono)).query({ unitId: dono.unitId, competencia: '2026-03' });
    expect(s.status).toBe(200);
    expect(s.body.data).toEqual({ competencia: '2026-03', codigoReceita: '5706', totalCents: 175_000, darfs: [{ decendio: 3, vencimento: '2026-04-03', totalCents: 175_000, calculos: [r.body.data.id] }] });
  });
});

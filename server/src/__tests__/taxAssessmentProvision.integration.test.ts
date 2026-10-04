/**
 * BE-INCR-TAX-ASSESSMENT Fase A PR-3 (nó X7, BRIEF itens 15, 16, 18; testes 23 a) — provisão no razão em 2 commits,
 * reconcile idempotente e encerramento × provisão pendente, sobre SQLite real.
 *
 * Cada cenário usa um ANO próprio: a Fase A recusa outra unidade da PJ com movimento no trimestre (F-X7-7 a), e o
 * perfil da empresa é por ano.
 *
 * Conta de mão (Presumido, serviço, sem LC 224): receita 100.000,00 → base 32.000,00 → IRPJ 4.800,00; CSLL 9% 2.880,00.
 */
import request from 'supertest';
import prisma from '@/lib/prisma';
import { ApplicationFactory } from '@/lib/factory';
import { TaxAssessmentRepository } from '@/features/accounting/repositories/TaxAssessmentRepository';
import { resolveAccountingScope } from '@/features/accounting/scope/AccountingScope';
import { makeApp, pushTestSchema, authHeader } from '@test/helpers';

const app = makeApp();
const BASE = '/api/accounting/tax-assessments';
const PROVISION = 'tax.assessment.provision';

let dono: { id: string; username: string };
const scopeOf = (unitId: string) => resolveAccountingScope({ userId: dono.id }, unitId);

const CONTAS = [
  { code: '1.1.1', name: 'Banco', nature: 'Asset' },
  { code: '2.3.1', name: 'Lucros ou Prejuízos Acumulados', nature: 'Equity' },
  { code: '3.1', name: 'Receita de Serviços', nature: 'Revenue' },
  { code: '4.9.1', name: 'IRPJ', nature: 'Expense' },
  { code: '4.9.2', name: 'CSLL', nature: 'Expense' },
  { code: '2.1.9.1', name: 'IRPJ a recolher', nature: 'Liability' },
  { code: '2.1.9.2', name: 'CSLL a recolher', nature: 'Liability' },
];

/** Unidade com plano, 12 períodos abertos, perfil da empresa do ano e receita de serviço no T01. */
async function cenario(unitId: string, ano: number, opts: { regime?: string; contas?: boolean } = {}) {
  const ids: Record<string, string> = {};
  for (const c of CONTAS) ids[c.code] = (await prisma.account.create({ data: { userId: dono.id, unitId, ...c, acceptsEntries: true } })).id;
  for (let month = 1; month <= 12; month++) {
    await prisma.accountingPeriod.create({ data: { userId: dono.id, unitId, year: ano, month, status: 'OPEN', openedAt: new Date() } });
  }
  await prisma.companyFiscalProfile.create({
    data: { userId: dono.id, anoCalendario: ano, regime: opts.regime ?? 'PRESUMIDO', ecfIndAliqCsll: '1', ecfIndRecReceita: '2', lucroRealObrigatorio: opts.regime === 'REAL' ? false : null },
  });
  await prisma.fiscalProfile.create({
    data: {
      userId: dono.id, unitId, regimeTributario: opts.regime ?? 'PRESUMIDO', pisCofinsRegime: 'CUMULATIVO',
      ...(opts.contas === false ? {} : { irpjDespesaAccountId: ids['4.9.1'], csllDespesaAccountId: ids['4.9.2'], irpjRecolherAccountId: ids['2.1.9.1'], csllRecolherAccountId: ids['2.1.9.2'] }),
    },
  });
  await ApplicationFactory.getInstance().getPostingService().postEntry(scopeOf(unitId), {
    unitId, date: `${ano}-02-10`, sourceType: 'manual', description: 'Serviço',
    lines: [{ accountCode: '1.1.1', debitCents: 10_000_000, creditCents: 0 }, { accountCode: '3.1', debitCents: 0, creditCents: 10_000_000 }],
  });
  return ids;
}

async function confirmar(unitId: string, ano: number, periodo = 'T01', extra: Record<string, unknown> = {}) {
  const p = await request(app).post(`${BASE}/preview`).set(authHeader(dono)).send({ unitId, anoCalendario: ano, periodo });
  expect(p.status).toBe(200);
  const r = await request(app)
    .post(BASE)
    .set(authHeader(dono))
    .send({ unitId, anoCalendario: ano, periodo, expectedAPagarCents: { IRPJ: p.body.data.irpj.aPagarCents, CSLL: p.body.data.csll.aPagarCents }, ...extra });
  expect(r.status).toBe(201);
  // contrato do #504: { irpj, csll, reconfirmar }
  return { preview: p.body.data, views: [r.body.data.irpj, r.body.data.csll] as Array<{ id: string; tributo: string; provisaoPendente: boolean }> };
}

const reconcile = (unitId: string, id: string) => request(app).post(`${BASE}/${id}/provisao`).set(authHeader(dono)).send({ unitId });
const provisoes = (unitId: string) =>
  prisma.journalEntry.findMany({ where: { unitId, sourceType: PROVISION }, include: { postings: { include: { account: true } } }, orderBy: { createdAt: 'asc' } });
const fecharMarco = (unitId: string, ano: number, status: 'OPEN' | 'HARD_CLOSED') =>
  prisma.accountingPeriod.updateMany({ where: { userId: dono.id, unitId, year: ano, month: 3 }, data: { status } });

describe('X7 PR-3 — provisão (2 commits), reconcile e encerramento', () => {
  beforeAll(async () => {
    pushTestSchema();
    dono = await prisma.user.create({ data: { name: 'x7p', username: 'x7-pr3', email: 'x7-pr3@test.local', password: 'x', role: 'USER' } });
  }, 120000);

  afterAll(async () => {
    jest.restoreAllMocks();
    await prisma.$disconnect();
  });

  it('item 15: confirmar provisiona — D despesa / C a recolher, valor = devido, no último dia do trimestre; provisaoEntryId gravado', async () => {
    const U = 'u-x7p-ok';
    await cenario(U, 2030);
    const { views } = await confirmar(U, 2030);
    expect(views.map((v) => v.provisaoPendente)).toEqual([false, false]);
    const entries = await provisoes(U);
    expect(entries).toHaveLength(2);
    const irpj = await prisma.taxAssessment.findFirstOrThrow({ where: { unitId: U, tributo: 'IRPJ' } });
    const e = entries.find((x) => x.sourceId === irpj.id)!;
    expect(irpj.provisaoEntryId).toBe(e.id);
    expect(e.date.toISOString().slice(0, 10)).toBe('2030-03-31');
    expect(e.postings.map((p) => [p.account.code, Number(p.debitCents), Number(p.creditCents)]).sort()).toEqual([
      ['2.1.9.1', 0, 480_000],
      ['4.9.1', 480_000, 0],
    ]);
  });

  it('item 15 (commit 1 — razão): período fechado ⇒ a confirmação fica, provisão pendente, nenhum lançamento', async () => {
    const U = 'u-x7p-fechado';
    await cenario(U, 2031);
    await fecharMarco(U, 2031, 'HARD_CLOSED');
    const { views } = await confirmar(U, 2031);
    expect(views.map((v) => v.provisaoPendente)).toEqual([true, true]);
    expect(await prisma.taxAssessment.count({ where: { unitId: U, status: 'CONFIRMED' } })).toBe(2);
    expect(await provisoes(U)).toHaveLength(0);
  });

  it('item 16 + ADR §13 item 11: reconcile completa e é idempotente — 2ª chamada sem lançamento novo, mesmo provisaoEntryId', async () => {
    const U = 'u-x7p-fechado';
    await fecharMarco(U, 2031, 'OPEN');
    const row = await prisma.taxAssessment.findFirstOrThrow({ where: { unitId: U, tributo: 'CSLL' } });
    const r1 = await reconcile(U, row.id);
    expect(r1.status).toBe(200);
    expect(r1.body.data.provisaoPendente).toBe(false);
    const depois1 = await prisma.taxAssessment.findUniqueOrThrow({ where: { id: row.id } });
    const n1 = (await provisoes(U)).length;
    const r2 = await reconcile(U, row.id);
    expect(r2.status).toBe(200);
    const depois2 = await prisma.taxAssessment.findUniqueOrThrow({ where: { id: row.id } });
    expect(n1).toBe(1);
    expect((await provisoes(U)).length).toBe(n1);
    expect(depois2.provisaoEntryId).toBe(depois1.provisaoEntryId);
  });

  it('item 15 (commit 2 — CAS): crash entre o postEntry e o CAS ⇒ pendente; reconcile reaproveita o lançamento (sem 2º)', async () => {
    const U = 'u-x7p-crash';
    await cenario(U, 2032);
    const spy = jest.spyOn(TaxAssessmentRepository.prototype, 'setProvisaoEntryId').mockRejectedValue(new Error('crash entre commits'));
    const { views } = await confirmar(U, 2032);
    spy.mockRestore();
    expect(views.map((v) => v.provisaoPendente)).toEqual([true, true]);
    expect(await provisoes(U)).toHaveLength(2); // o razão já tem as provisões; só o vínculo falhou
    for (const v of views) expect((await reconcile(U, v.id)).status).toBe(200);
    const entries = await provisoes(U);
    expect(entries).toHaveLength(2);
    const rows = await prisma.taxAssessment.findMany({ where: { unitId: U } });
    expect(rows.map((r) => r.provisaoEntryId).sort()).toEqual(entries.map((e) => e.id).sort());
  });

  it('F-TA-7: contas não configuradas ⇒ pendente; reconcile 400 até configurar; depois provisiona', async () => {
    const U = 'u-x7p-semconta';
    const ids = await cenario(U, 2033, { contas: false });
    const { views } = await confirmar(U, 2033);
    expect(views.every((v) => v.provisaoPendente)).toBe(true);
    const r = await reconcile(U, views[0].id);
    expect(r.status).toBe(400);
    expect(JSON.stringify(r.body)).toContain('não configurada');
    await prisma.fiscalProfile.updateMany({
      where: { userId: dono.id, unitId: U },
      data: { irpjDespesaAccountId: ids['4.9.1'], csllDespesaAccountId: ids['4.9.2'], irpjRecolherAccountId: ids['2.1.9.1'], csllRecolherAccountId: ids['2.1.9.2'] },
    });
    expect((await reconcile(U, views[0].id)).body.data.provisaoPendente).toBe(false);
  });

  it('item 15 (substituição): estorna a provisão da substituída e a dos posteriores da cascata, e posta a da nova', async () => {
    const U = 'u-x7p-ok';
    // T02 com receita (devido > 0 ⇒ provisionado), para a cascata do #504 ter o que estornar ao substituir o T01
    await ApplicationFactory.getInstance().getPostingService().postEntry(scopeOf(U), {
      unitId: U, date: '2030-05-10', sourceType: 'manual', description: 'Serviço T02',
      lines: [{ accountCode: '1.1.1', debitCents: 5_000_000, creditCents: 0 }, { accountCode: '3.1', debitCents: 0, creditCents: 5_000_000 }],
    });
    const t02 = (await confirmar(U, 2030, 'T02')).views;
    expect(t02.map((v) => v.provisaoPendente)).toEqual([false, false]);
    const antigas = await prisma.taxAssessment.findMany({ where: { unitId: U, status: 'CONFIRMED', periodo: 'T01' } });
    await confirmar(U, 2030, 'T01', { supersedesIds: antigas.map((a) => a.id) });
    for (const a of [...antigas, ...(await prisma.taxAssessment.findMany({ where: { id: { in: t02.map((v) => v.id) } } }))]) {
      const original = await prisma.journalEntry.findUniqueOrThrow({ where: { id: a.provisaoEntryId! } });
      expect(original.status).toBe('Reversed');
      expect(original.reversedById).not.toBeNull();
    }
    const novas = await prisma.taxAssessment.findMany({ where: { unitId: U, status: 'CONFIRMED' } });
    expect(novas.map((n) => n.periodo)).toEqual(['T01', 'T01']); // o T02 caiu na cascata e espera reconfirmação
    expect(novas.every((n) => n.provisaoEntryId !== null)).toBe(true);
    // invariante do razão: só as provisões das CONFIRMED estão vivas
    const vivas = await prisma.journalEntry.findMany({ where: { unitId: U, sourceType: PROVISION, status: 'Posted' } });
    expect(vivas.map((e) => e.sourceId).sort()).toEqual(novas.map((n) => n.id).sort());
  });

  it('item 15 (substituição × vínculo perdido): a substituída postada sem provisaoEntryId é estornada — 1 provisão viva por tributo', async () => {
    const U = 'u-x7p-vinculo';
    await cenario(U, 2036);
    const spy = jest.spyOn(TaxAssessmentRepository.prototype, 'setProvisaoEntryId').mockRejectedValue(new Error('crash entre commits'));
    const { views } = await confirmar(U, 2036);
    spy.mockRestore();
    expect(views.every((v) => v.provisaoPendente)).toBe(true); // postadas, sem vínculo
    await confirmar(U, 2036, 'T01', { supersedesIds: views.map((v) => v.id) });
    const vivas = await prisma.journalEntry.findMany({ where: { unitId: U, sourceType: PROVISION, status: 'Posted' } });
    expect(vivas).toHaveLength(2);
    const novas = await prisma.taxAssessment.findMany({ where: { unitId: U, status: 'CONFIRMED' } });
    expect(vivas.map((e) => e.sourceId).sort()).toEqual(novas.map((n) => n.id).sort());
  });

  it('achado 4: reconcile de substituição já completa depois do fechamento do período ⇒ 200, nada novo (sem gate de período)', async () => {
    const U = 'u-x7p-ok';
    await fecharMarco(U, 2030, 'HARD_CLOSED');
    const atual = await prisma.taxAssessment.findFirstOrThrow({ where: { unitId: U, status: 'CONFIRMED', tributo: 'IRPJ' } });
    const antigas = await prisma.taxAssessment.findMany({ where: { unitId: U, status: 'SUPERSEDED' } });
    const n = await prisma.journalEntry.count({ where: { unitId: U } });
    expect((await reconcile(U, atual.id)).status).toBe(200);
    for (const a of antigas) expect((await reconcile(U, a.id)).status).toBe(200);
    expect(await prisma.journalEntry.count({ where: { unitId: U } })).toBe(n);
    await fecharMarco(U, 2030, 'OPEN');
  });

  it('23(a): no Real, a base é a mesma antes e depois da provisão (guarda de circularidade)', async () => {
    const U = 'u-x7p-real';
    await cenario(U, 2034, { regime: 'REAL' });
    await prisma.lalurParteBClosing.create({ data: { userId: dono.id, unitId: U, year: 2034, quarter: 'T01', balancesSha256: 'x' } });
    const { preview: antes } = await confirmar(U, 2034);
    expect(await provisoes(U)).toHaveLength(2);
    const depois = await request(app).post(`${BASE}/preview`).set(authHeader(dono)).send({ unitId: U, anoCalendario: 2034, periodo: 'T01' });
    expect(depois.body.data.irpj.baseCents).toBe(antes.irpj.baseCents);
    expect(depois.body.data.csll.baseCents).toBe(antes.csll.baseCents);
    expect(BigInt(antes.irpj.baseCents)).toBeGreaterThan(0n);
  });

  it('item 18 (F-TA-8 a + L-D): encerrar o ano com apuração CONFIRMED de provisão pendente ⇒ 400 com os ids; depois do reconcile encerra', async () => {
    const U = 'u-x7p-enc';
    await cenario(U, 2035);
    await fecharMarco(U, 2035, 'HARD_CLOSED');
    const { views } = await confirmar(U, 2035);
    const closing = ApplicationFactory.getInstance().getExerciseClosingService();
    // L-D: qualquer apuração da PJ no ano bloqueia — inclusive o encerramento de OUTRA unidade da mesma PJ. A outra
    // unidade tem saldo de resultado (receita em dezembro, fora do T01), senão o 400 viria de "sem saldo a encerrar".
    const OUTRA = 'u-x7p-enc-outra';
    for (const c of CONTAS) await prisma.account.create({ data: { userId: dono.id, unitId: OUTRA, ...c, acceptsEntries: true } });
    await prisma.accountingPeriod.create({ data: { userId: dono.id, unitId: OUTRA, year: 2035, month: 12, status: 'OPEN', openedAt: new Date() } });
    await ApplicationFactory.getInstance().getPostingService().postEntry(scopeOf(OUTRA), {
      unitId: OUTRA, date: '2035-12-10', sourceType: 'manual', description: 'Serviço',
      lines: [{ accountCode: '1.1.1', debitCents: 1000, creditCents: 0 }, { accountCode: '3.1', debitCents: 0, creditCents: 1000 }],
    });
    const errOutra = (await closing.closeExercise(scopeOf(OUTRA), 2035).catch((e: unknown) => e)) as { details: { taxAssessmentIds: string[] } };
    expect(errOutra.details.taxAssessmentIds.sort()).toEqual(views.map((v) => v.id).sort());
    const err = (await closing.closeExercise(scopeOf(U), 2035).catch((e: unknown) => e)) as { details: { taxAssessmentIds: string[] } };
    expect(err.details.taxAssessmentIds.sort()).toEqual(views.map((v) => v.id).sort());
    await fecharMarco(U, 2035, 'OPEN');
    for (const v of views) await reconcile(U, v.id);
    const entry = await closing.closeExercise(scopeOf(U), 2035);
    expect(entry.sourceType).toBe('closing');
  });
});

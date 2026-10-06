/**
 * BE-INCR-PIS-COFINS PR-3 (nó X8, BRIEF itens 17–19) — provisão de PIS/Cofins no razão (bridge do X7 item 15, 2 commits),
 * reconcile pela rota do X7 e encerramento × provisão pendente, sobre SQLite real. Cada cenário tem um dono próprio (a
 * apuração é da PJ inteira e o DTO só aceita 2025–2026).
 *
 * Conta de mão:
 *  - Presumido M03/2026, serviço R$ 100.000,00 ⇒ PIS 0,65% = 650,00; Cofins 3% = 3.000,00 ⇒ D 4.9.3 / C 2.1.9.3 650,00 e
 *    D 4.9.4 / C 2.1.9.4 3.000,00, em 2026-03-31.
 *  - Real M01/2026, serviço R$ 100,00 ⇒ débito PIS 1,65 / Cofins 7,60; NF-e do mês PIS 10,00 / Cofins 46,00 ⇒ crédito da
 *    NF-e aproveitado = min(NF-e, débito) = 1,65 / 7,60 (o resto — saldo credor 8,35 / 38,40 — fica no ativo).
 *    M02, serviço R$ 100.000,00 ⇒ débito 1.650,00 / 7.600,00; NF-e de fevereiro 165,00 / 835,00 ⇒ aproveitado 165,00 /
 *    835,00; saldo credor de janeiro consumido (8,35 / 38,40) também sai do "a recuperar" (L-2 → "baixar também o saldo
 *    usado", dono 06/10) — uma baixa só de 173,35 no PIS ⇒ "a recolher" líquido = DARF. Retenções não são lançadas.
 *  - L-5 (dono 06/10): Real, aluguel de R$ 1.000,00 em janeiro (PIS 16,50 / Cofins 76,00) contra débito 1,65 / 7,60 ⇒
 *    D a recuperar / C redutora 16,50 / 76,00, baixa 1,65 / 7,60, saldo credor 14,85 / 68,40; fevereiro com débito
 *    16,50 / 76,00 consome o saldo inteiro ⇒ "a recuperar" termina em 0 (nunca credor) e "a recolher" = DARF.
 *  - Real M01/2026 (1º mês), serviço R$ 100,00, sem NF-e, saldo informado PIS 1,00 / Cofins 10,00 ⇒ PIS consome 1,00 todo
 *    (a pagar 0,65); Cofins consome só 7,60 dos 10,00 (parcial; saldo credor 2,40 fica no ativo).
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
const U = 'unit-x8-pr3';
type Dono = { id: string; username: string };

const CONTAS = [
  { code: '1.1.1', name: 'Banco', nature: 'Asset' },
  { code: '1.1.9', name: 'PIS/COFINS a recuperar', nature: 'Asset' },
  { code: '2.3.1', name: 'Lucros ou Prejuízos Acumulados', nature: 'Equity' },
  { code: '3.1', name: 'Receita de Serviços', nature: 'Revenue' },
  { code: '4.9.3', name: 'PIS', nature: 'Expense' },
  { code: '4.9.4', name: 'Cofins', nature: 'Expense' },
  { code: '4.9.5', name: 'Créditos de PIS/Cofins s/ despesas (redutora)', nature: 'Expense' },
  { code: '2.1.9.3', name: 'PIS a recolher', nature: 'Liability' },
  { code: '2.1.9.4', name: 'Cofins a recolher', nature: 'Liability' },
];

let seq = 0;
/** Dono com plano, 12 períodos abertos de 2026, perfil da empresa e da unidade; `contas` decide as da provisão. */
async function cenario(regime: 'PRESUMIDO' | 'REAL', contas: 'todas' | 'sem-recuperavel' | 'nenhuma' = 'todas') {
  seq += 1;
  const dono: Dono = await prisma.user.create({ data: { name: `x8p3-${seq}`, username: `x8p3-${seq}`, email: `x8p3-${seq}@test.local`, password: 'x', role: 'USER' } });
  const ids: Record<string, string> = {};
  for (const c of CONTAS) ids[c.code] = (await prisma.account.create({ data: { userId: dono.id, unitId: U, ...c, acceptsEntries: true } })).id;
  for (let month = 1; month <= 12; month++) {
    await prisma.accountingPeriod.create({ data: { userId: dono.id, unitId: U, year: 2026, month, status: 'OPEN', openedAt: new Date() } });
  }
  await prisma.companyFiscalProfile.create({
    data: { userId: dono.id, anoCalendario: 2026, regime, ecfIndAliqCsll: '1', ecfIndRecReceita: '2', lucroRealObrigatorio: regime === 'REAL' ? false : null },
  });
  const provisao = {
    pisDespesaAccountId: ids['4.9.3'], cofinsDespesaAccountId: ids['4.9.4'], pisRecolherAccountId: ids['2.1.9.3'], cofinsRecolherAccountId: ids['2.1.9.4'],
  };
  await prisma.fiscalProfile.create({
    data: {
      userId: dono.id, unitId: U, regimeTributario: regime, pisCofinsRegime: regime === 'REAL' ? 'NAO_CUMULATIVO' : 'CUMULATIVO',
      ...(contas === 'nenhuma' ? {} : provisao),
      ...(contas === 'todas' ? { pisCofinsRecuperavelAccountId: ids['1.1.9'], pisCofinsCreditoOutrosAccountId: ids['4.9.5'] } : {}),
    },
  });
  return { dono, ids, scope: resolveAccountingScope({ userId: dono.id }, U) };
}

async function receita(dono: Dono, data: string, cents: number) {
  await ApplicationFactory.getInstance().getPostingService().postEntry(resolveAccountingScope({ userId: dono.id }, U), {
    unitId: U, date: data, sourceType: 'manual', description: 'Serviço',
    lines: [{ accountCode: '1.1.1', debitCents: cents, creditCents: 0 }, { accountCode: '3.1', debitCents: 0, creditCents: cents }],
  });
}

/** NF-e de compra já importada (linha `PIS_COFINS` gravada pelo PR-1 com as parcelas). */
async function nota(dono: Dono, issueDate: string, pisCents: number, cofinsCents: number) {
  const cp = await prisma.counterparty.create({ data: { userId: dono.id, unitId: U, type: 'SUPPLIER', name: `F-${issueDate}`, nameNormalized: `f-${issueDate}` } });
  const rec = await prisma.account.findFirstOrThrow({ where: { userId: dono.id, unitId: U, code: '1.1.9' } });
  await prisma.payable.create({
    data: {
      userId: dono.id, unitId: U, supplierName: 'Fornecedor', counterpartyId: cp.id, documentNumber: `NF-${issueDate}`, description: 'compra',
      issueDate: new Date(`${issueDate}T00:00:00.000Z`), dueDate: new Date(`${issueDate}T00:00:00.000Z`), amountCents: 100_000n, status: 'OPEN',
      recoverableTaxLines: JSON.stringify([{ accountId: rec.id, accountCode: '1.1.9', amountCents: pisCents + cofinsCents, kind: 'PIS_COFINS', pisCents, cofinsCents }]),
    },
  });
}

async function confirmar(dono: Dono, periodo: string, extra: { supersedesIds?: string[] } = {}) {
  const p = await request(app).post(`${BASE}/pis-cofins/preview`).set(authHeader(dono)).send({ unitId: U, anoCalendario: 2026, periodo });
  expect(p.status).toBe(200);
  const r = await request(app)
    .post(`${BASE}/pis-cofins`)
    .set(authHeader(dono))
    .send({ unitId: U, anoCalendario: 2026, periodo, expectedAPagarCents: { PIS: p.body.data.pis.aPagarCents, COFINS: p.body.data.cofins.aPagarCents }, ...extra });
  expect(r.status).toBe(201);
  return [r.body.data.pis, r.body.data.cofins] as Array<{ id: string; tributo: string; provisaoPendente: boolean; aPagarCents: string }>;
}

const reconcile = (dono: Dono, id: string) => request(app).post(`${BASE}/${id}/provisao`).set(authHeader(dono)).send({ unitId: U });
const provisoes = (dono: Dono) =>
  prisma.journalEntry.findMany({ where: { userId: dono.id, sourceType: PROVISION }, include: { postings: { include: { account: true } } }, orderBy: { createdAt: 'asc' } });
const aRecolher = (e: { postings: Array<{ account: { code: string }; debitCents: bigint | number; creditCents: bigint | number }> }, code: string) =>
  e.postings.filter((p) => p.account.code === code).reduce((s, p) => s + Number(p.creditCents) - Number(p.debitCents), 0);
const pernas = (e: { postings: Array<{ account: { code: string }; debitCents: bigint | number; creditCents: bigint | number }> }) =>
  e.postings.map((p) => [p.account.code, Number(p.debitCents), Number(p.creditCents)]).sort();

describe('X8 PR-3 — provisão de PIS/Cofins (2 commits), reconcile e encerramento', () => {
  beforeAll(async () => {
    pushTestSchema();
  }, 120000);

  afterAll(async () => {
    jest.restoreAllMocks();
    await prisma.$disconnect();
  });

  it('item 17 (cumulativo): confirmar provisiona D despesa (Expense) / C a recolher = débito, no último dia do mês; provisaoEntryId gravado', async () => {
    const { dono } = await cenario('PRESUMIDO');
    await receita(dono, '2026-03-10', 10_000_000);
    const views = await confirmar(dono, 'M03');
    expect(views.map((v) => v.provisaoPendente)).toEqual([false, false]);
    const entries = await provisoes(dono);
    expect(entries).toHaveLength(2);
    const rows = await prisma.taxAssessment.findMany({ where: { userId: dono.id } });
    for (const row of rows) {
      const e = entries.find((x) => x.sourceId === row.id)!;
      expect(row.provisaoEntryId).toBe(e.id);
      expect(e.date.toISOString().slice(0, 10)).toBe('2026-03-31');
    }
    const pis = rows.find((r) => r.tributo === 'PIS')!;
    const cofins = rows.find((r) => r.tributo === 'COFINS')!;
    expect(pernas(entries.find((e) => e.sourceId === pis.id)!)).toEqual([['2.1.9.3', 0, 65_000], ['4.9.3', 65_000, 0]]);
    expect(pernas(entries.find((e) => e.sourceId === cofins.id)!)).toEqual([['2.1.9.4', 0, 300_000], ['4.9.4', 300_000, 0]]);
  });

  it('item 17 (não cumulativo): + D a recolher / C PIS/COFINS a recuperar = crédito da NF-e aproveitado; saldo credor anterior consumido também é baixado', async () => {
    const { dono } = await cenario('REAL');
    await receita(dono, '2026-01-15', 10_000);
    await nota(dono, '2026-01-10', 1_000, 4_600);
    await confirmar(dono, 'M01');
    const m01 = await prisma.taxAssessment.findMany({ where: { userId: dono.id, periodo: 'M01' } });
    const e01 = await provisoes(dono);
    const pis01 = e01.find((e) => e.sourceId === m01.find((r) => r.tributo === 'PIS')!.id)!;
    // débito 165; NF-e 1.000 > débito ⇒ aproveitado 165; o resto (835) fica no ativo como saldo credor
    expect(pernas(pis01)).toEqual([['1.1.9', 0, 165], ['2.1.9.3', 0, 165], ['2.1.9.3', 165, 0], ['4.9.3', 165, 0]]);
    expect(m01.find((r) => r.tributo === 'PIS')!.saldoNegativoCents).toBe(835n);

    await receita(dono, '2026-02-15', 10_000_000);
    await nota(dono, '2026-02-01', 16_500, 83_500);
    const [pis02] = await confirmar(dono, 'M02');
    expect(pis02.aPagarCents).toBe(String(165_000 - 16_500 - 835));
    const e02 = (await provisoes(dono)).find((e) => e.sourceId === pis02.id)!;
    // L-3: um lançamento — despesa/a recolher e UMA baixa do crédito consumido: NF-e (16.500) + saldo de janeiro (835)
    expect(pernas(e02)).toEqual([['1.1.9', 0, 17_335], ['2.1.9.3', 0, 165_000], ['2.1.9.3', 17_335, 0], ['4.9.3', 165_000, 0]]);
    // L-2: o "a recolher" líquido do mês = o DARF (a pagar)
    expect(aRecolher(e02, '2.1.9.3')).toBe(Number(pis02.aPagarCents));
  });

  it('item 17 / L-5: outros créditos entram no a recuperar; o mês seguinte consome o saldo que os inclui — a recuperar nunca credor, a recolher = DARF', async () => {
    const { dono, ids } = await cenario('REAL');
    await receita(dono, '2026-01-15', 10_000);
    const outros = { outrosCreditos: [{ inciso: 'IV_ALUGUEL_PJ', baseCents: '100000', documento: 'contrato de locação' }] };
    // item 13 + L-5: sem a redutora, a prévia avisa que a provisão ficará pendente
    await prisma.fiscalProfile.updateMany({ where: { userId: dono.id, unitId: U }, data: { pisCofinsCreditoOutrosAccountId: null } });
    const sem = await request(app).post(`${BASE}/pis-cofins/preview`).set(authHeader(dono)).send({ unitId: U, anoCalendario: 2026, periodo: 'M01', ...outros });
    expect(sem.body.data.provisaoContasConfiguradas).toBe(false);
    await prisma.fiscalProfile.updateMany({ where: { userId: dono.id, unitId: U }, data: { pisCofinsCreditoOutrosAccountId: ids['4.9.5'] } });

    const p1 = await request(app).post(`${BASE}/pis-cofins/preview`).set(authHeader(dono)).send({ unitId: U, anoCalendario: 2026, periodo: 'M01', ...outros });
    expect(p1.body.data.provisaoContasConfiguradas).toBe(true);
    const c1 = await request(app).post(`${BASE}/pis-cofins`).set(authHeader(dono)).send({
      unitId: U, anoCalendario: 2026, periodo: 'M01', ...outros, expectedAPagarCents: { PIS: p1.body.data.pis.aPagarCents, COFINS: p1.body.data.cofins.aPagarCents },
    });
    expect(c1.status).toBe(201);
    expect([c1.body.data.pis.saldoNegativoCents, c1.body.data.cofins.saldoNegativoCents]).toEqual(['1485', '6840']);
    const e1 = await provisoes(dono);
    expect(pernas(e1.find((e) => e.sourceId === c1.body.data.pis.id)!)).toEqual([
      ['1.1.9', 0, 165], ['1.1.9', 1_650, 0], ['2.1.9.3', 0, 165], ['2.1.9.3', 165, 0], ['4.9.3', 165, 0], ['4.9.5', 0, 1_650],
    ]);

    await receita(dono, '2026-02-15', 100_000);
    const [pis02, cofins02] = await confirmar(dono, 'M02');
    expect([pis02.aPagarCents, cofins02.aPagarCents]).toEqual(['165', '760']);
    const todas = await provisoes(dono);
    const e2pis = todas.find((e) => e.sourceId === pis02.id)!;
    const e2cofins = todas.find((e) => e.sourceId === cofins02.id)!;
    expect(pernas(e2pis)).toEqual([['1.1.9', 0, 1_485], ['2.1.9.3', 0, 1_650], ['2.1.9.3', 1_485, 0], ['4.9.3', 1_650, 0]]);
    expect(aRecolher(e2pis, '2.1.9.3')).toBe(165);
    expect(aRecolher(e2cofins, '2.1.9.4')).toBe(760);
    // o "a recuperar" (débito − crédito) nunca fica credor: termina em 0 depois de fevereiro
    const recuperar = todas.flatMap((e) => e.postings).filter((p) => p.account.code === '1.1.9').reduce((s, p) => s + Number(p.debitCents) - Number(p.creditCents), 0);
    expect(recuperar).toBe(0);
  });

  it('item 17 / L-2 (saldo parcialmente consumido): 1º mês com saldo informado — baixa só a parte usada; "a recolher" = DARF nos 2 tributos', async () => {
    const { dono } = await cenario('REAL');
    await receita(dono, '2026-01-15', 10_000);
    const p = await request(app).post(`${BASE}/pis-cofins/preview`).set(authHeader(dono)).send({ unitId: U, anoCalendario: 2026, periodo: 'M01', saldoCredorAnterior: { PIS: '100', COFINS: '1000' } });
    expect(p.status).toBe(200);
    const r = await request(app).post(`${BASE}/pis-cofins`).set(authHeader(dono)).send({
      unitId: U, anoCalendario: 2026, periodo: 'M01', saldoCredorAnterior: { PIS: '100', COFINS: '1000' },
      expectedAPagarCents: { PIS: p.body.data.pis.aPagarCents, COFINS: p.body.data.cofins.aPagarCents },
    });
    expect(r.status).toBe(201);
    expect([r.body.data.pis.aPagarCents, r.body.data.cofins.aPagarCents, r.body.data.cofins.saldoNegativoCents]).toEqual(['65', '0', '240']);
    const entries = await provisoes(dono);
    const pis = entries.find((e) => e.sourceId === r.body.data.pis.id)!;
    const cofins = entries.find((e) => e.sourceId === r.body.data.cofins.id)!;
    expect(pernas(pis)).toEqual([['1.1.9', 0, 100], ['2.1.9.3', 0, 165], ['2.1.9.3', 100, 0], ['4.9.3', 165, 0]]);
    expect(pernas(cofins)).toEqual([['1.1.9', 0, 760], ['2.1.9.4', 0, 760], ['2.1.9.4', 760, 0], ['4.9.4', 760, 0]]);
    expect(aRecolher(pis, '2.1.9.3')).toBe(65);
    expect(aRecolher(cofins, '2.1.9.4')).toBe(0);
    // reconcile repetido não duplica (L-3: chave = apuração)
    for (const v of [r.body.data.pis, r.body.data.cofins]) expect((await reconcile(dono, v.id)).status).toBe(200);
    expect(await provisoes(dono)).toHaveLength(2);
  });

  it('item 17 (F-TA-7): conta a recuperar ausente com crédito da NF-e ⇒ pendente; reconcile 400 nomeando a conta; depois provisiona', async () => {
    const { dono, ids } = await cenario('REAL', 'sem-recuperavel');
    await receita(dono, '2026-01-15', 10_000);
    await nota(dono, '2026-01-10', 1_000, 4_600);
    const views = await confirmar(dono, 'M01');
    expect(views.map((v) => v.provisaoPendente)).toEqual([true, true]);
    expect(await provisoes(dono)).toHaveLength(0);
    const r = await reconcile(dono, views[0].id);
    expect(r.status).toBe(400);
    expect(JSON.stringify(r.body)).toContain('PIS/COFINS a recuperar');
    await prisma.fiscalProfile.updateMany({ where: { userId: dono.id, unitId: U }, data: { pisCofinsRecuperavelAccountId: ids['1.1.9'] } });
    expect((await reconcile(dono, views[0].id)).body.data.provisaoPendente).toBe(false);
  });

  it('itens 18 + 19 (D4 + D6 do PR-2): mês confirmado com débito > 0 e provisão pendente bloqueia o encerramento; o reconcile (2×, idempotente) provisiona e o encerramento passa', async () => {
    const { dono, ids, scope } = await cenario('PRESUMIDO', 'nenhuma');
    await receita(dono, '2026-03-10', 10_000_000);
    const views = await confirmar(dono, 'M03');
    expect(views.map((v) => v.provisaoPendente)).toEqual([true, true]);

    const closing = ApplicationFactory.getInstance().getExerciseClosingService();
    const err = (await closing.closeExercise(scope, 2026).catch((e: unknown) => e)) as { details: { taxAssessmentIds: string[] } };
    expect(err.details.taxAssessmentIds.sort()).toEqual(views.map((v) => v.id).sort());

    // D4: o reconcile do X7 servia 400 "PR-3" para PIS/COFINS; agora o 400 é o da conta não configurada (F-TA-7).
    const semConta = await reconcile(dono, views[0].id);
    expect(semConta.status).toBe(400);
    expect(JSON.stringify(semConta.body)).toContain('não configurada');
    expect(JSON.stringify(semConta.body)).not.toContain('PR-3');

    await prisma.fiscalProfile.updateMany({
      where: { userId: dono.id, unitId: U },
      data: { pisDespesaAccountId: ids['4.9.3'], cofinsDespesaAccountId: ids['4.9.4'], pisRecolherAccountId: ids['2.1.9.3'], cofinsRecolherAccountId: ids['2.1.9.4'] },
    });
    for (const v of views) {
      const r1 = await reconcile(dono, v.id);
      expect(r1.status).toBe(200);
      expect(r1.body.data.provisaoPendente).toBe(false);
      const id1 = (await prisma.taxAssessment.findUniqueOrThrow({ where: { id: v.id } })).provisaoEntryId;
      const n1 = (await provisoes(dono)).length;
      // item 18: a 2ª chamada é asserida — sem lançamento novo, mesmo provisaoEntryId
      const r2 = await reconcile(dono, v.id);
      expect(r2.status).toBe(200);
      expect((await provisoes(dono)).length).toBe(n1);
      expect((await prisma.taxAssessment.findUniqueOrThrow({ where: { id: v.id } })).provisaoEntryId).toBe(id1);
    }
    expect(await provisoes(dono)).toHaveLength(2);

    const entry = await closing.closeExercise(scope, 2026);
    expect(entry.sourceType).toBe('closing');
  });

  it('item 17 (commit 2 — CAS): crash entre o postEntry e o CAS ⇒ pendente; reconcile reaproveita o lançamento (sem 2º)', async () => {
    const { dono } = await cenario('PRESUMIDO');
    await receita(dono, '2026-03-10', 10_000_000);
    const spy = jest.spyOn(TaxAssessmentRepository.prototype, 'setProvisaoEntryId').mockRejectedValue(new Error('crash entre commits'));
    const views = await confirmar(dono, 'M03');
    spy.mockRestore();
    expect(views.map((v) => v.provisaoPendente)).toEqual([true, true]);
    expect(await provisoes(dono)).toHaveLength(2);
    for (const v of views) expect((await reconcile(dono, v.id)).status).toBe(200);
    const entries = await provisoes(dono);
    expect(entries).toHaveLength(2);
    const rows = await prisma.taxAssessment.findMany({ where: { userId: dono.id } });
    expect(rows.map((r) => r.provisaoEntryId).sort()).toEqual(entries.map((e) => e.id).sort());
  });

  it('item 17 (substituição): estorna a provisão da substituída e posta a da nova — 1 provisão viva por tributo; período fechado ⇒ confirmação fica, pendente', async () => {
    const { dono } = await cenario('PRESUMIDO');
    await receita(dono, '2026-03-10', 10_000_000);
    const antigas = await confirmar(dono, 'M03');
    await confirmar(dono, 'M03', { supersedesIds: antigas.map((v) => v.id) });
    for (const a of await prisma.taxAssessment.findMany({ where: { id: { in: antigas.map((v) => v.id) } } })) {
      const original = await prisma.journalEntry.findUniqueOrThrow({ where: { id: a.provisaoEntryId! } });
      expect(original.status).toBe('Reversed');
    }
    const novas = await prisma.taxAssessment.findMany({ where: { userId: dono.id, status: 'CONFIRMED' } });
    const vivas = await prisma.journalEntry.findMany({ where: { userId: dono.id, sourceType: PROVISION, status: 'Posted' } });
    expect(vivas.map((e) => e.sourceId).sort()).toEqual(novas.map((n) => n.id).sort());

    // commit 1 intacto quando o razão recusa: março fechado ⇒ a 3ª confirmação grava, a provisão fica pendente
    await prisma.accountingPeriod.updateMany({ where: { userId: dono.id, unitId: U, year: 2026, month: 3 }, data: { status: 'HARD_CLOSED' } });
    const terceira = await confirmar(dono, 'M03', { supersedesIds: novas.map((n) => n.id) });
    expect(terceira.map((v) => v.provisaoPendente)).toEqual([true, true]);
    expect(await prisma.taxAssessment.count({ where: { userId: dono.id, status: 'CONFIRMED' } })).toBe(2);
  });
});

/**
 * Bloco F no fechamento da Parte B (C8 emenda 3.2, P3 — E15–E22, E26) — app Express REAL sobre supertest + SQLite REAL.
 * O que só a fiação prova: a factory entrega o `FixedAssetParteBReader` ao `LalurService`, o leitor acha as quotas que o
 * `/depreciation/run` postou no razão, e as linhas `system` (com os links M305 da tabela `lalur_entry_parte_b_links`
 * e o M312) chegam ao banco e ao M500 dentro da tx do fechamento.
 *
 * Cenário: bem de 1.200,00 com taxa fiscal 10% a.a. (Anexo) e contábil 20% a.a. (override) — quota contábil 20,00/mês,
 * fiscal 10,00/mês. T01/2025: contábil 60,00 × fiscal 30,00 ⇒ adição 30,00 na linha 86, conta 1071, no IRPJ e na CSLL.
 */
import request from 'supertest';
import prisma from '@/lib/prisma';
import { makeApp, pushTestSchema, authHeader, seedUnit } from '@test/helpers';

const app = makeApp();
const UNIT = 'unit-lalur-bloco-f';
const T01 = { unitId: UNIT, year: 2025, quarter: 'T01' };

let dono: { id: string; username: string };
let depExpenseId: string;
const pb: Record<string, string> = {};

const criarConta = (code: string, nature: string) =>
  prisma.account.create({ data: { userId: dono.id, unitId: UNIT, code, name: `Conta ${code}`, nature, acceptsEntries: true } });

const criarParteB = async (codCtaB: string, codPbRfb: string, codTributo: 'I' | 'C') => {
  const res = await request(app)
    .post('/api/lalur/parte-b')
    .set(authHeader(dono))
    .send({ unitId: UNIT, codCtaB, descricao: `Conta ${codCtaB}`, dtCriacao: '2024-12-31', codPbRfb, codTributo, saldoIniCents: 0, indSaldoIni: 'D' });
  expect(res.status).toBe(201);
  return res.body.data.id as string;
};

describe('POST /api/lalur/parte-b/close — Bloco F com ativo override (C8 emenda 3.2, E26)', () => {
  beforeAll(async () => {
    pushTestSchema();
    dono = await prisma.user.create({ data: { name: 'blocof', username: 'lalur-bloco-f', email: 'lalur-bloco-f@test.local', password: 'x', role: 'USER' } });
    await seedUnit({ userId: dono.id, id: UNIT });
    for (const month of [1, 2, 3]) {
      await prisma.accountingPeriod.create({ data: { userId: dono.id, unitId: UNIT, year: 2025, month, status: 'OPEN', openedAt: new Date(), openedById: dono.id } });
    }
    const cost = await criarConta('1.2.1', 'Asset');
    const accDep = await criarConta('1.2.9.1', 'Asset');
    const gain = await criarConta('3.9', 'Revenue');
    const loss = await criarConta('4.9', 'Expense');
    depExpenseId = (await criarConta('4.1', 'Expense')).id;
    const settings = await request(app)
      .put('/api/accounting/settings')
      .set(authHeader(dono))
      .send({ unitId: UNIT, disposalGainAccountId: gain.id, disposalLossAccountId: loss.id, depreciationExpenseAccountId: depExpenseId });
    expect(settings.status).toBe(200);

    const klass = await request(app)
      .post('/api/accounting/fixed-asset-classes')
      .set(authHeader(dono))
      .send({ unitId: UNIT, code: 'MOV', name: 'Móveis', depreciable: true, costAccountId: cost.id, accumulatedDepreciationAccountId: accDep.id });
    expect(klass.status).toBe(201);
    const asset = await request(app)
      .post('/api/accounting/fixed-assets')
      .set(authHeader(dono))
      .send({
        unitId: UNIT, classId: klass.body.data.id, code: 'CADEIRA', description: 'Cadeira de salão', costCents: 120_000, residualValueCents: 0,
        acquiredAt: '2025-01-01', annualRateBp: 1000, bookAnnualRateBp: 2000, bookRateJustification: 'uso intenso (laudo)',
      });
    expect(asset.status).toBe(201);
    const activated = await request(app)
      .post(`/api/accounting/fixed-assets/${asset.body.data.id}/activate`)
      .set(authHeader(dono))
      .send({ unitId: UNIT, assetId: asset.body.data.id, activatedAt: '2025-01-01', version: 1 });
    expect(activated.status).toBe(200);
    for (const yearMonth of ['2025-01', '2025-02', '2025-03']) {
      const run = await request(app).post('/api/accounting/fixed-assets/depreciation/run').set(authHeader(dono)).send({ unitId: UNIT, yearMonth });
      expect(run.status).toBe(200);
      expect(run.body.data.posted).toBe(1);
    }
    // resultado T01 = −60,00 (despesa) + adição 30,00 ⇒ base −30,00 ⇒ o PF/BC também é derivado (contas 1000/1003)
    pb.pf = await criarParteB('PF', '1000', 'I');
    pb.bc = await criarParteB('BC', '1003', 'C');
  }, 120000);

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('E18: diferença ≠ 0 sem a conta 1071 ⇒ 400 nomeando o código e o tributo; nada gravado', async () => {
    const res = await request(app).post('/api/lalur/parte-b/close').set(authHeader(dono)).send(T01);
    expect(res.status).toBe(400);
    expect(res.body.message ?? res.body.error?.message ?? JSON.stringify(res.body)).toMatch(/COD_PB_RFB 1071 \(I, IRPJ\)/);
    expect(await prisma.lalurEntry.count({ where: { unitId: UNIT } })).toBe(0);
    expect(await prisma.lalurParteBClosing.count({ where: { unitId: UNIT } })).toBe(0);
  });

  it('E16/E16b/E17: fecha T01 — 86 system no lalur e no lacs, IND_RELACAO 3 com a despesa e as 3 quotas (M312), M305 pelos links; M500 1071 = 30,00 D', async () => {
    pb.i1071 = await criarParteB('DEP-A-I', '1071', 'I');
    pb.c1071 = await criarParteB('DEP-A-C', '1071', 'C');
    const res = await request(app).post('/api/lalur/parte-b/close').set(authHeader(dono)).send(T01);
    expect(res.status).toBe(200);

    const linhas = await prisma.lalurEntry.findMany({
      where: { unitId: UNIT, origem: 'system', deletedAt: null },
      include: { parteBLinks: true, journalLinks: true },
      orderBy: { livro: 'asc' },
    });
    expect(linhas.map((e) => [e.livro, e.quarter, e.codigo, e.valorCents, e.indRelacao, e.accountId, e.parteBId])).toEqual([
      ['lacs', 'T01', '86', 3_000n, '3', depExpenseId, null],
      ['lalur', 'T01', '86', 3_000n, '3', depExpenseId, null],
    ]);
    const quotas = await prisma.journalEntry.findMany({ where: { unitId: UNIT, sourceType: 'fixed_asset.depreciation' }, select: { id: true } });
    expect(quotas).toHaveLength(3);
    for (const e of linhas) expect(e.journalLinks.map((j) => j.journalEntryId).sort()).toEqual(quotas.map((q) => q.id).sort());
    expect(linhas.map((e) => e.parteBLinks.map((l) => [l.parteBId, l.valorCents]))).toEqual([[[pb.c1071, 3_000n]], [[pb.i1071, 3_000n]]]);

    const byId = Object.fromEntries((res.body.data.balances as Array<Record<string, unknown>>).map((b) => [b.parteBId, b]));
    expect(byId[pb.i1071]).toMatchObject({ vlParteACents: 3000, indVlParteA: 'D', sdFimCents: 3000, indSdFim: 'D' });
    expect(byId[pb.c1071]).toMatchObject({ vlParteACents: 3000, indVlParteA: 'D', sdFimCents: 3000, indSdFim: 'D' });
    // F-EM-9 d: nenhum M410 do Bloco F; o único system é o PF/BC, cuja base JÁ inclui a adição (−60,00 + 30,00)
    const movs = await prisma.lalurParteBMovement.findMany({ where: { unitId: UNIT, origem: 'system', deletedAt: null } });
    expect(movs.map((m) => [m.indicador, m.valorCents]).sort()).toEqual([['BC', 3_000n], ['PF', 3_000n]]);

    const diag = await request(app).get('/api/lalur/parte-b/balances').set(authHeader(dono)).query({ unitId: UNIT, year: 2025 });
    expect(diag.status).toBe(200);
    expect(diag.body.data.divergences).toEqual([]);
    expect(diag.body.data.warnings).toEqual([]); // M312 presente ⇒ sem aviso X4-14
  });

  it('refechar substitui as linhas system (uma viva por livro, as antigas arquivadas com rename-on-key)', async () => {
    const res = await request(app).post('/api/lalur/parte-b/close').set(authHeader(dono)).send(T01);
    expect(res.status).toBe(200);
    expect(await prisma.lalurEntry.count({ where: { unitId: UNIT, origem: 'system', deletedAt: null } })).toBe(2);
    const arquivadas = await prisma.lalurEntry.findMany({ where: { unitId: UNIT, origem: 'system', deletedAt: { not: null } } });
    expect(arquivadas).toHaveLength(2);
    expect(arquivadas.every((e) => e.codigo === `deleted:${e.id}:86`)).toBe(true);
  });

  it('archive da conta 1071 com link M305 vivo é 400 (o saldo sumiria do recompute)', async () => {
    const res = await request(app).post(`/api/lalur/parte-b/${pb.i1071}/archive`).set(authHeader(dono)).send({ unitId: UNIT });
    expect(res.status).toBe(400);
  });

  it('E22: ajuste do usuário na linha 86 do período ⇒ 400 no fechamento, nomeando o ajuste', async () => {
    await request(app).post('/api/lalur/parte-b/reopen').set(authHeader(dono)).send(T01);
    // o 86 system ocupa a chave viva: arquiva-o para o usuário poder lançar o manual (como faria pela tela)
    for (const e of await prisma.lalurEntry.findMany({ where: { unitId: UNIT, origem: 'system', deletedAt: null, livro: 'lalur' } })) {
      expect((await request(app).post(`/api/lalur/entries/${e.id}/archive`).set(authHeader(dono)).send({ unitId: UNIT })).status).toBe(200);
    }
    const manual = await request(app)
      .post('/api/lalur/entries')
      .set(authHeader(dono))
      .send({ unitId: UNIT, year: 2025, quarter: 'T01', livro: 'lalur', codigo: '86', valorCents: 100, indRelacao: '1', parteBId: pb.i1071 });
    expect(manual.status).toBe(201);
    const res = await request(app).post('/api/lalur/parte-b/close').set(authHeader(dono)).send(T01);
    expect(res.status).toBe(400);
    expect(JSON.stringify(res.body)).toContain(`ajuste ${manual.body.data.id} do usuário na linha 86 do lalur`);
  });
});

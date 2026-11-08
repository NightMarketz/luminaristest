/**
 * BE-INCR-RETENCOES-FONTE PR-2 (BRIEF itens 12 e 14–23; invariantes 3, 5, 6, 7, 8 e 9) — contrato HTTP ponta a ponta das
 * retenções FEITAS no AP: reconhecimento com IRRF/INSS, baixa com CSRF (bruto derivado do pago), título de imposto por
 * código e competência (soma, complementar, DARF < R$ 10), estorno, re-drive, F7 e a leitura que a EFD-REINF consome.
 */
import request from 'supertest';
import prisma from '@/lib/prisma';
import { getFactory } from '@/lib/factory';
import { PostingService } from '@/features/accounting/services/PostingService';
import { PayableRepository } from '@/features/accounting/repositories/PayableRepository';
import type { AccountingScope } from '@/features/accounting/scope/AccountingScope';
import { makeApp, pushTestSchema, authHeader, seedUnit } from '@test/helpers';

const app = makeApp();
const UNIT = 'unit-ret2';
const CNPJ_A = '11222333000181';
const CNPJ_B = '45997418000153';
const CNPJ_C = '19131243000197';
const CNPJ_D = '33000167000101';
const D = (s: string) => new Date(`${s}T00:00:00.000Z`);

let dono: { id: string; username: string };
let expenseId: string;
let bankAccountId: string;
const conta: Record<string, string> = {};
const cp: Record<string, string> = {};

const scope = (): AccountingScope => ({ ownerUserId: dono.id, actorUserId: dono.id, unitId: UNIT, ledgerCode: 'DEFAULT', baseCurrencyCode: 'BRL', timeZone: 'America/Sao_Paulo' });
const criarConta = async (code: string, nature: string) =>
  (await prisma.account.findFirst({ where: { userId: dono.id, unitId: UNIT, code } })) ??
  prisma.account.create({ data: { userId: dono.id, unitId: UNIT, code, name: `Conta ${code}`, nature, acceptsEntries: true } });
const contraparte = async (name: string, taxId: string, regimeTributario: string) => {
  const r = await request(app).post('/api/counterparties').set(authHeader(dono)).send({ unitId: UNIT, type: 'SUPPLIER', name, taxId, regimeTributario });
  expect(r.status).toBe(201);
  return r.body.data.id as string;
};
const perfil = async (counterpartyId: string, body: Record<string, unknown>) => {
  const r = await request(app)
    .post('/api/accounting/withholding-profiles')
    .set(authHeader(dono))
    .send({ unitId: UNIT, counterpartyId, irrf: false, csrf: false, inss: false, issRetido: false, fonte: 'RIR/2018 art. 714 § 1º', vigenteDesde: '2026-01-01', ...body });
  expect(r.status).toBe(201);
};
const criarTitulo = (counterpartyId: string, documentNumber: string, amountCents: number, issueDate: string, extra: Record<string, unknown> = {}) =>
  request(app)
    .post('/api/payables')
    .set(authHeader(dono))
    .send({ unitId: UNIT, supplierName: `F ${documentNumber}`, counterpartyId, documentNumber, description: 'serviço', issueDate, dueDate: issueDate, amountCents, expenseAccountId: expenseId, ...extra });
const pagar = (payableId: string, amountCents: number, paidAt: string, method = 'Pix') =>
  request(app).post(`/api/payables/${payableId}/settlements`).set(authHeader(dono)).send({ unitId: UNIT, method, paidAt, amountCents });
const cancelarPagamento = (payableId: string, paymentId: string, reversalDate: string) =>
  request(app).post(`/api/payables/${payableId}/settlements/${paymentId}/cancel`).set(authHeader(dono)).send({ unitId: UNIT, reversalDate });
const cancelarTitulo = (payableId: string, reversalDate: string) =>
  request(app).post(`/api/payables/${payableId}/cancel`).set(authHeader(dono)).send({ unitId: UNIT, reversalDate });
const titulo = (id: string) => prisma.payable.findUniqueOrThrow({ where: { id } });
const tituloImposto = (documentNumber: string) => prisma.payable.findFirst({ where: { userId: dono.id, unitId: UNIT, origin: 'WITHHOLDING_TAX', documentNumber } });
const retencoes = (titleId: string) => prisma.taxWithholding.findMany({ where: { titleId }, orderBy: [{ createdAt: 'asc' }, { tributo: 'asc' }] });
const linhasDoLancamento = async (sourceType: string, sourceId: string) => {
  const e = await prisma.journalEntry.findFirst({ where: { userId: dono.id, sourceType, sourceId }, include: { postings: { include: { account: true } } } });
  return e ? e.postings.map((p) => [p.account.code, Number(p.debitCents), Number(p.creditCents)]).sort() : null;
};
const ultimoEvento = async (eventType: string): Promise<Record<string, string>> =>
  JSON.parse((await prisma.auditEvent.findFirst({ where: { eventType }, orderBy: { seq: 'desc' } }))?.payload ?? '{}');

describe('RETENCOES-FONTE PR-2 — retenções feitas no AP', () => {
  beforeAll(async () => {
    pushTestSchema();
    dono = await prisma.user.create({ data: { name: 'ret2', username: 'ret2-dono', email: 'ret2@test.local', password: 'x', role: 'USER' } });
    await seedUnit({ userId: dono.id, id: UNIT });
    for (const [year, month] of [...Array.from({ length: 12 }, (_, i) => [2026, i + 1]), [2027, 1]]) {
      await prisma.accountingPeriod.create({ data: { userId: dono.id, unitId: UNIT, year, month, status: 'OPEN', openedAt: new Date(), openedById: dono.id } });
    }
    await request(app).get('/api/accounting/accounts').set(authHeader(dono)).query({ unitId: UNIT }); // plano padrão (2.1.7.03)
    expenseId = (await criarConta('4.1', 'Expense')).id;
    bankAccountId = (await criarConta('1.1.1.01', 'Asset')).id;
    conta.irrf = (await prisma.account.findFirstOrThrow({ where: { userId: dono.id, unitId: UNIT, code: '2.1.7.03' } })).id;
    conta.csrf = (await criarConta('2.1.99.01', 'Liability')).id;
    conta.inss = (await criarConta('2.1.99.02', 'Liability')).id;
    conta.iss = (await criarConta('2.1.99.03', 'Liability')).id;
    for (const ano of [2026, 2027]) {
      const r = await request(app).put(`/api/accounting/company-fiscal-profile/${ano}`).set(authHeader(dono)).send({ unitId: UNIT, regime: 'REAL', ecf: { indAliqCsll: '1', indRecReceita: '2' } });
      expect([ano, r.status]).toEqual([ano, 200]);
    }
    const fp = await request(app).put('/api/accounting/fiscal-profile').set(authHeader(dono)).send({
      unitId: UNIT, regimeTributario: 'REAL', icmsContribuinte: false, pisCofinsRegime: 'NAO_CUMULATIVO',
      retencaoIrrfRecolherAccountId: conta.irrf, retencaoCsrfRecolherAccountId: conta.csrf, retencaoInssRecolherAccountId: conta.inss, retencaoIssRecolherAccountId: conta.iss,
    });
    expect(fp.status).toBe(200);
    cp.A = await contraparte('Fisio Ltda', CNPJ_A, 'PRESUMIDO'); // IRRF + CSRF
    await perfil(cp.A, { naturezaServico: 'SERVICO_PROFISSIONAL', natRend: '15022', irrf: true, csrf: true });
    cp.B = await contraparte('Limpeza SA', CNPJ_B, 'REAL'); // só CSRF
    await perfil(cp.B, { naturezaServico: 'OUTRO', natRend: '15043', csrf: true, fonte: 'Lei 10.833 art. 30' });
    cp.C = await contraparte('Mão de Obra Ltda', CNPJ_C, 'PRESUMIDO'); // INSS 11% + ISS
    await perfil(cp.C, { naturezaServico: 'CESSAO_MAO_DE_OBRA', inss: true, inssTpServico: '100000003', issRetido: true, issCodMun: '3550308', issAliquotaBp: 200, issVencimentoDia: 15, fonte: 'Lei 8.212 art. 31' });
    cp.D = await contraparte('Optante ME', CNPJ_D, 'SIMPLES'); // IRRF sem declaração ⇒ retém qualquer valor
    await perfil(cp.D, { naturezaServico: 'SERVICO_PROFISSIONAL', natRend: '15022', irrf: true });
  }, 180000);

  afterAll(async () => {
    jest.restoreAllMocks();
    await prisma.$disconnect();
  });

  let tA: string;

  it('review A2 (dono 25/10 "somar e desfazer"): a tardia soma no título que absorveu a competência; se ela passa de R$ 10, volta a ter título próprio e o absorvente encolhe', async () => {
    // Competências de 2025, encerradas (o 5ec322a4 não estaciona competência corrente).
    for (let month = 2; month <= 5; month++) {
      await prisma.accountingPeriod.create({ data: { userId: dono.id, unitId: UNIT, year: 2025, month, status: 'OPEN', openedAt: new Date(), openedById: dono.id } });
    }
    const p = await request(app).put('/api/accounting/company-fiscal-profile/2025').set(authHeader(dono)).send({ unitId: UNIT, regime: 'REAL', ecf: { indAliqCsll: '1', indRecReceita: '2' } });
    expect(p.status).toBe(200);
    const em2025 = { vigenteDesde: '2025-01-01', vigenteAte: '2025-12-31' };
    await perfil(cp.D, { naturezaServico: 'SERVICO_PROFISSIONAL', natRend: '15022', irrf: true, ...em2025 });
    await perfil(cp.A, { naturezaServico: 'SERVICO_PROFISSIONAL', natRend: '15022', irrf: true, csrf: true, ...em2025 });
    expect((await criarTitulo(cp.D, 'NF-RE1', 30_000, '2025-02-05')).status).toBe(201); // 4,50 em 02
    expect((await criarTitulo(cp.D, 'NF-RE2', 46_667, '2025-03-05')).status).toBe(201); // 7,00 em 03 ⇒ absorve 02
    const marco = (await tituloImposto('170806-202503+202502'))!;
    const fev = (await tituloImposto('170806-202502'))!;
    expect([Number(marco.amountCents), fev.status]).toEqual([1150, 'DEFERRED']);
    const r3 = await criarTitulo(cp.D, 'NF-RE3', 30_000, '2025-02-20'); // tardia 4,50 ⇒ 02 = 9,00 < 10 ⇒ soma no de 03
    expect(r3.status).toBe(201);
    expect((await retencoes(r3.body.data.id))[0].taxPayableId).toBe(marco.id);
    expect(Number((await titulo(marco.id)).amountCents)).toBe(1600);
    const r4 = await criarTitulo(cp.D, 'NF-RE4', 46_667, '2025-02-25'); // tardia 7,00 ⇒ 02 = 16,00 ≥ 10 ⇒ desfaz
    expect(r4.status).toBe(201);
    const fevDepois = await titulo(fev.id);
    expect([fevDepois.status, Number(fevDepois.amountCents), fevDepois.documentNumber, fevDepois.dueDate.toISOString().slice(0, 10)]).toEqual(['OPEN', 1600, '170806-202502', '2025-03-20']);
    const marcoDepois = await titulo(marco.id);
    expect([Number(marcoDepois.amountCents), marcoDepois.documentNumber]).toEqual([700, '170806-202503']);
    expect(await prisma.taxWithholding.count({ where: { taxPayableId: fev.id, status: 'ACTIVE' } })).toBe(3);
  });

  it('review A2: competência encerrada que nasce < R$ 10 com título posterior aberto soma nele; a tardia que a leva a ≥ R$ 10 abre o título próprio dela', async () => {
    expect((await criarTitulo(cp.A, 'NF-RE5', 100_000, '2025-05-10')).status).toBe(201); // 15,00 em 05 (absorve os 7,00 de 03)
    const maio = (await tituloImposto('170806-202505+202503'))!;
    expect(Number(maio.amountCents)).toBe(2200);
    const r = await criarTitulo(cp.D, 'NF-RE6', 30_000, '2025-04-10'); // 4,50 em 04, depois do título de 05
    expect(r.status).toBe(201);
    expect((await retencoes(r.body.data.id))[0].taxPayableId).toBe(maio.id);
    expect(Number((await titulo(maio.id)).amountCents)).toBe(2650);
    expect((await titulo(maio.id)).documentNumber).toBe('170806-202505+202503+202504');
    const r2 = await criarTitulo(cp.D, 'NF-RE7', 46_667, '2025-04-20'); // tardia 7,00 ⇒ 04 = 11,50 ≥ 10 ⇒ título próprio
    expect(r2.status).toBe(201);
    const abril = (await tituloImposto('170806-202504'))!;
    expect([abril.status, Number(abril.amountCents), abril.dueDate.toISOString().slice(0, 10)]).toEqual(['OPEN', 1150, '2025-05-20']);
    expect((await retencoes(r.body.data.id))[0].taxPayableId).toBe(abril.id);
    const maioDepois = await titulo(maio.id);
    expect([Number(maioDepois.amountCents), maioDepois.documentNumber]).toEqual([2200, '170806-202505+202503']);
  });


  it('item 15: R$ 1.000 a PJ Presumido, serviço profissional ⇒ IRRF R$ 15,00, paidCents 1500, remainingCents 98500, razão balanceado', async () => {
    const r = await criarTitulo(cp.A, 'NF-A1', 100_000, '2026-03-10', { documentoSerie: '1' });
    expect([r.status, r.body.data.withholdingAvisos]).toEqual([201, []]);
    tA = r.body.data.id;
    const get = await request(app).get(`/api/payables/${tA}`).set(authHeader(dono)).query({ unitId: UNIT });
    expect([get.body.data.paidCents, get.body.data.remainingCents, get.body.data.status]).toEqual([1500, 98500, 'PARTIALLY_PAID']);
    const [tw] = await retencoes(tA);
    expect(tw).toMatchObject({ direction: 'MADE', tributo: 'IRRF', event: 'RECOGNITION', amountCents: 1500n, codigoReceita: '170806', competencia: '2026-03', natRend: '15022', documentoSerie: '1', status: 'ACTIVE' });
    const pay = await prisma.payablePayment.findUniqueOrThrow({ where: { id: tw.settlementId! } });
    expect([pay.kind, pay.method, Number(pay.amountCents), !!pay.entryId]).toEqual(['WITHHOLDING', 'NONE', 1500, true]);
    expect(await linhasDoLancamento('ap.withholding', pay.id)).toEqual([['2.1.2.01', 1500, 0], ['2.1.7.03', 0, 1500]]);
    expect(await linhasDoLancamento('ap.payable', tA)).toEqual([['2.1.2.01', 0, 100_000], ['4.1', 100_000, 0]]);
    const ev = await ultimoEvento('ap.withholding.recorded');
    expect(ev).toMatchObject({ payableId: tA, tributo: 'IRRF', amountCents: '1500', codigoReceita: '170806' });
    expect(JSON.stringify(ev)).not.toContain(CNPJ_A);
  });

  it('item 19 / invariantes 7 e 8: título de imposto 170806-202603 da UNIÃO, vence em 20/04 (dia útil), sem reconhecimento; 2ª retenção do mês soma', async () => {
    const t1 = (await tituloImposto('170806-202603'))!;
    expect([t1.supplierName, Number(t1.amountCents), t1.dueDate.toISOString().slice(0, 10), t1.liabilityAccountId, t1.status]).toEqual(['UNIAO', 1500, '2026-04-20', conta.irrf, 'OPEN']);
    expect(await linhasDoLancamento('ap.payable', t1.id)).toBeNull();
    const r = await criarTitulo(cp.A, 'NF-A2', 100_000, '2026-03-20');
    expect(r.status).toBe(201);
    expect(Number((await titulo(t1.id)).amountCents)).toBe(3000);
    expect((await retencoes(r.body.data.id))[0].taxPayableId).toBe(t1.id);
  });

  it('item 12: sobrescrita para menos com motivo é aceita e auditada; para mais ⇒ 400; tributo sem linha ⇒ 400', async () => {
    const menos = await criarTitulo(cp.A, 'NF-A3', 100_000, '2026-03-21', { withholdings: [{ tributo: 'IRRF', amountCents: 1000, motivo: 'decisão judicial' }] });
    expect(menos.status).toBe(201);
    expect((await retencoes(menos.body.data.id))[0]).toMatchObject({ amountCents: 1000n, overrideMotivo: 'decisão judicial' });
    expect((await criarTitulo(cp.A, 'NF-A4', 100_000, '2026-03-21', { withholdings: [{ tributo: 'IRRF', amountCents: 1501, motivo: 'a mais' }] })).status).toBe(400);
    expect((await criarTitulo(cp.A, 'NF-A5', 100_000, '2026-03-21', { withholdings: [{ tributo: 'INSS', amountCents: 0, motivo: 'sem linha' }] })).status).toBe(400);
  });

  it('item 17: título de R$ 1.000 a quem só sofre CSRF, uma baixa de R$ 953,50 em caixa ⇒ bruto 1.000, CSRF R$ 46,50 em 3 linhas AGREGADO', async () => {
    const t = (await criarTitulo(cp.B, 'NF-B1', 100_000, '2026-03-05')).body.data.id as string;
    const r = await pagar(t, 95_350, '2026-03-25');
    expect(r.status).toBe(201);
    expect([(await titulo(t)).status, Number((await titulo(t)).paidCents)]).toEqual(['PAID', 100_000]);
    const tws = await retencoes(t);
    expect(tws.map((x) => [x.tributo, Number(x.amountCents), x.codigoReceita, x.event, x.originSettlementId === r.body.data.id]).sort()).toEqual([
      ['COFINS', 3000, '595207', 'SETTLEMENT', true],
      ['CSLL', 1000, '595207', 'SETTLEMENT', true],
      ['PIS', 650, '595207', 'SETTLEMENT', true],
    ]);
    expect(await linhasDoLancamento('ap.payment', r.body.data.id)).toEqual([['1.1.1.01', 0, 95_350], ['2.1.2.01', 95_350, 0]]);
    const agregado = (await tituloImposto('595207-202603'))!;
    expect([Number(agregado.amountCents), agregado.liabilityAccountId]).toEqual([4650, conta.csrf]);
  });

  it('itens 17–18 / invariante 6: 4 parcelas de R$ 238,37 em caixa ⇒ 4 × (bruto 250, CSRF 11,63) e o título fecha R$ 1.000 exatos', async () => {
    const t = (await criarTitulo(cp.B, 'NF-B2', 100_000, '2026-04-02')).body.data.id as string;
    for (let i = 0; i < 4; i++) expect([i, (await pagar(t, 23_837, '2026-04-10')).status]).toEqual([i, 201]);
    const row = await titulo(t);
    expect([row.status, Number(row.paidCents)]).toEqual(['PAID', 100_000]);
    const csrf = (await retencoes(t)).reduce((s, x) => s + Number(x.amountCents), 0);
    expect(csrf).toBe(4 * 1163);
  });

  it('invariante 5: 5 parcelas de R$ 200 (CSRF R$ 9,30) ⇒ dispensa MINIMO_R10, sem baixa sem caixa, título PAID', async () => {
    const t = (await criarTitulo(cp.B, 'NF-B3', 100_000, '2026-04-03')).body.data.id as string;
    for (let i = 0; i < 5; i++) expect((await pagar(t, 20_000, '2026-04-11')).status).toBe(201);
    expect((await titulo(t)).status).toBe('PAID');
    const tws = await retencoes(t);
    expect(tws.every((x) => x.amountCents === 0n && x.dispensa === 'MINIMO_R10' && x.settlementId === null)).toBe(true);
    expect(tws).toHaveLength(15);
    expect(await prisma.payablePayment.count({ where: { payableId: t, kind: 'WITHHOLDING' } })).toBe(0);
  });

  it('item 14: method NONE numa baixa comum ⇒ 400; a baixa sem caixa não se estorna sozinha ⇒ 400', async () => {
    expect((await pagar(tA, 1000, '2026-03-30', 'NONE')).status).toBe(400);
    const [tw] = await retencoes(tA);
    expect((await cancelarPagamento(tA, tw.settlementId!, '2026-03-30')).status).toBe(400);
  });

  it('item 16: INSS 11% sobre o bruto da NF com o código 116201 e título do INSS no dia 20 (PR de dado 29/10); ISS vence no dia do perfil', async () => {
    const r = await criarTitulo(cp.C, 'NF-C1', 100_000, '2026-03-12');
    expect(r.status).toBe(201);
    expect(r.body.data.withholdingAvisos).toEqual([]);
    const tws = await retencoes(r.body.data.id);
    expect(tws.map((x) => [x.tributo, Number(x.amountCents), x.codigoReceita, x.taxPayableId === null])).toEqual([
      ['INSS', 11_000, '116201', false],
      ['ISS', 2_000, null, false],
    ]);
    const inss = (await tituloImposto('116201-202603'))!;
    expect([inss.supplierName, inss.dueDate.toISOString().slice(0, 10), Number(inss.amountCents)]).toEqual(['INSS', '2026-04-20', 11_000]);
    const iss = (await tituloImposto('ISS-202603'))!;
    expect([iss.supplierName, iss.dueDate.toISOString().slice(0, 10), Number(iss.amountCents)]).toEqual(['MUNICIPIO:3550308', '2026-04-15', 2000]);
    expect((await titulo(r.body.data.id)).paidCents).toBe(13_000n);
  });

  it('item 20: DARF < R$ 10 — R$ 4,50 em 05 + R$ 7,00 em 06 ⇒ um título de R$ 11,50 que vence pela competência 06; o de 05 fica DEFERRED', async () => {
    expect((await criarTitulo(cp.D, 'NF-D1', 30_000, '2026-05-10')).status).toBe(201); // 1,5% = 4,50 (optante sem declaração retém)
    const maio = (await tituloImposto('170806-202605'))!;
    expect([Number(maio.amountCents), maio.status]).toEqual([450, 'OPEN']);
    expect((await criarTitulo(cp.D, 'NF-D2', 46_667, '2026-06-10')).status).toBe(201); // 7,00
    const junho = (await tituloImposto('170806-202606+202605'))!;
    expect([Number(junho.amountCents), junho.dueDate.toISOString().slice(0, 10), junho.status]).toEqual([1150, '2026-07-20', 'OPEN']);
    expect((await titulo(maio.id)).status).toBe('DEFERRED');
    expect(await prisma.taxWithholding.count({ where: { taxPayableId: junho.id, status: 'ACTIVE' } })).toBe(2);
    const s = await request(app).get('/api/accounting/withholdings/summary').set(authHeader(dono)).query({ unitId: UNIT, competencia: '2026-06' });
    expect(s.body.data.feitas).toEqual([expect.objectContaining({ codigoReceita: '170806', totalCents: '1150', vencimento: '2026-07-20', competenciasSomadas: ['2026-06', '2026-05'] })]);
  });

  it('item 21: cancelar o título estorna a retenção do reconhecimento (razão + subrazão) e encolhe/cancela o título de imposto', async () => {
    const t = (await criarTitulo(cp.A, 'NF-A8', 100_000, '2026-08-10')).body.data.id as string;
    const [tw] = await retencoes(t);
    const imposto = (await tituloImposto('170806-202608'))!;
    const r = await cancelarTitulo(t, '2026-08-11');
    expect(r.status).toBe(200);
    expect((await titulo(t)).status).toBe('CANCELLED');
    expect((await prisma.taxWithholding.findUniqueOrThrow({ where: { id: tw.id } })).status).toBe('REVERSED');
    expect((await titulo(imposto.id)).status).toBe('CANCELLED');
    const original = await prisma.journalEntry.findFirstOrThrow({ where: { userId: dono.id, sourceType: 'ap.withholding', sourceId: tw.settlementId! } });
    expect(original.reversedById).not.toBeNull();
    expect(await ultimoEvento('ap.withholding.reversed')).toMatchObject({ withholdingId: tw.id, tributo: 'IRRF', amountCents: '1500' });
  });

  it('item 21 / invariante 7: imposto já recolhido ⇒ cancelar o título de origem dá 409; a baixa do título de imposto debita a conta a recolher', async () => {
    const t = (await criarTitulo(cp.A, 'NF-A9', 100_000, '2026-09-10')).body.data.id as string;
    const imposto = (await tituloImposto('170806-202609'))!;
    const darf = await pagar(imposto.id, 1500, '2026-10-20');
    expect(darf.status).toBe(201);
    expect(await linhasDoLancamento('ap.payment', darf.body.data.id)).toEqual([['1.1.1.01', 0, 1500], ['2.1.7.03', 1500, 0]]);
    const r = await cancelarTitulo(t, '2026-09-11');
    expect([r.status, JSON.stringify(r.body)]).toEqual([409, expect.stringContaining('IMPOSTO_JA_RECOLHIDO')]);
    expect((await titulo(t)).status).toBe('PARTIALLY_PAID');
    expect((await cancelarTitulo(imposto.id, '2026-09-11')).status).toBe(400); // gerido pelas retenções
    // retenção nova da mesma competência depois da baixa ⇒ título complementar
    expect((await criarTitulo(cp.A, 'NF-A10', 100_000, '2026-09-15')).status).toBe(201);
    expect(Number((await tituloImposto('170806-202609-C1'))!.amountCents)).toBe(1500);
  });

  it('item 21: estornar o PAYMENT estorna a CSRF da parcela, encolhe o título AGREGADO e devolve o bruto ao saldo', async () => {
    const t = (await criarTitulo(cp.B, 'NF-B5', 100_000, '2026-11-05')).body.data.id as string;
    const p = await pagar(t, 95_350, '2026-11-06');
    const agregado = (await tituloImposto('595207-202611'))!;
    expect(Number(agregado.amountCents)).toBe(4650);
    const r = await cancelarPagamento(t, p.body.data.id, '2026-11-07');
    expect(r.status).toBe(200);
    const row = await titulo(t);
    expect([row.status, Number(row.paidCents)]).toEqual(['OPEN', 0]);
    expect((await retencoes(t)).every((x) => x.status === 'REVERSED')).toBe(true);
    expect((await titulo(agregado.id)).status).toBe('CANCELLED');
  });

  it('item 21: o reconcile refaz o lançamento WITHHOLDING que faltou, idempotente', async () => {
    const real = PostingService.prototype.postEntry;
    const spy = jest.spyOn(PostingService.prototype, 'postEntry').mockImplementation(function (this: PostingService, s, input) {
      if (input.sourceType === 'ap.withholding') return Promise.reject(new Error('crash simulado'));
      return real.call(this, s, input);
    });
    const t = (await criarTitulo(cp.A, 'NF-A12', 100_000, '2026-12-01')).body.data.id as string;
    spy.mockRestore();
    const [tw] = await retencoes(t);
    expect(await linhasDoLancamento('ap.withholding', tw.settlementId!)).toBeNull();
    const svc = getFactory().getPayableService();
    const r1 = await svc.reconcilePayables(scope());
    expect(r1.settlementsPosted).toBeGreaterThanOrEqual(1);
    expect(await linhasDoLancamento('ap.withholding', tw.settlementId!)).toEqual([['2.1.2.01', 1500, 0], ['2.1.7.03', 0, 1500]]);
    expect((await svc.reconcilePayables(scope())).settlementsPosted).toBe(0);
  });

  it('invariante 1 no AP: baixa em 2027-01 ⇒ só CSLL 1% com o código 598707', async () => {
    const t = (await criarTitulo(cp.B, 'NF-B7', 200_000, '2026-12-20')).body.data.id as string;
    const r = await pagar(t, 198_000, '2027-01-08');
    expect(r.status).toBe(201);
    expect((await retencoes(t)).map((x) => [x.tributo, Number(x.amountCents), x.codigoReceita])).toEqual([['CSLL', 2000, '598707']]);
  });

  it('item 22 (F-RET-12 a): F7 — linha de R$ 953,50 contra o título de R$ 1.000 ⇒ PAYMENT 953,50 + WITHHOLDING 46,50, sem shortfall', async () => {
    const t = (await criarTitulo(cp.B, 'NF-B8', 100_000, '2026-07-01')).body.data.id as string;
    await prisma.payable.update({ where: { id: t }, data: { dueDate: D('2026-07-18') } });
    const st = await prisma.bankStatement.create({ data: { userId: dono.id, unitId: UNIT, glAccountId: bankAccountId, periodStart: D('2026-07-01'), periodEnd: D('2026-07-31'), sha256: 'sha-ret2' } });
    const line = await prisma.bankStatementLine.create({
      data: { userId: dono.id, unitId: UNIT, statementId: st.id, lineNumber: 1, date: D('2026-07-18'), amountCents: -95_350, description: 'pix', externalRef: 'NF-B8', status: 'UNMATCHED', rawJson: '[]' },
    });
    expect((await request(app).post('/api/bank-settlements/scan').set(authHeader(dono)).send({ unitId: UNIT, statementId: st.id })).status).toBe(200);
    const item = await prisma.bankSettlementItem.findFirstOrThrow({ where: { statementLineId: line.id } });
    expect([Number(item.proposedCents), Number(item.chargeCents)]).toEqual([95_350, 0]);
    const c = await request(app).post(`/api/bank-settlements/${item.id}/confirm`).set(authHeader(dono)).send({ unitId: UNIT, method: 'Pix' });
    expect(c.status).toBe(200);
    const row = await titulo(t);
    expect([row.status, Number(row.paidCents)]).toEqual(['PAID', 100_000]);
    expect((await retencoes(t)).reduce((s, x) => s + Number(x.amountCents), 0)).toBe(4650);
  });

  it('item 23: rota de linhas e porta da Reinf devolvem o mesmo conjunto; taxId só na linha; resumo por código com vencimento', async () => {
    const r = await request(app).get('/api/accounting/withholdings').set(authHeader(dono)).query({ unitId: UNIT, direction: 'MADE', competencia: '2026-03' });
    expect(r.status).toBe(200);
    const porta = await getFactory().getTaxWithholdingReadPort().findMadeForReinf(scope(), '2026-03');
    expect(r.body.data.map((l: { id: string }) => l.id).sort()).toEqual(porta.map((l) => l.id).sort());
    const irrf = r.body.data.find((l: { tributo: string; titulo: { documentNumber: string } }) => l.tributo === 'IRRF' && l.titulo.documentNumber === 'NF-A1');
    expect(irrf).toMatchObject({ beneficiario: { taxId: CNPJ_A, kind: 'CNPJ', regime: 'PRESUMIDO' }, natRend: '15022', codigoReceita: '170806', amountCents: '1500', titulo: { documentoSerie: '1' } });
    const inss = r.body.data.find((l: { tributo: string }) => l.tributo === 'INSS');
    expect(inss.inss).toEqual({ tpServico: '100000003', cprb: null });
    const csrf = porta.find((l) => l.tributo === 'CSLL');
    expect(csrf?.originSettlementId).toBeTruthy();
    const s = await request(app).get('/api/accounting/withholdings/summary').set(authHeader(dono)).query({ unitId: UNIT, competencia: '2026-03' });
    expect(s.status).toBe(200);
    expect(s.body.data.feitas).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ codigoReceita: '170806', totalCents: '4000', vencimento: '2026-04-20', status: 'OPEN' }),
        expect.objectContaining({ codigoReceita: '595207', tributos: expect.arrayContaining(['CSLL', 'COFINS', 'PIS']), vencimento: '2026-04-20' }),
      ]),
    );
    // PR de dado 29/10: o INSS ganhou o código 116201 — nenhuma linha do mês fica sem código.
    expect(s.body.data.avisos).toEqual([]);
    expect((await request(app).get('/api/accounting/withholdings').set(authHeader(dono)).query({ unitId: UNIT, direction: 'SUFFERED', competencia: '2026-03' })).status).toBe(400);
  });

  it('item 11 (F-RET-17 a): PF — 2º pagamento no mês ao mesmo CPF retém pela diferença sobre a soma; 10002 só em DRAFT ⇒ código null + aviso', async () => {
    // Emenda 22/10 item 1: a 10002 fica fora da carga; o perfil de PF só nasce com a natureza em DRAFT (aceita com aviso).
    await prisma.legalParameter.create({
      data: {
        id: 'teste-natrend-10002', tabela: 'NATUREZA_RENDIMENTO', chave: '10002', status: 'DRAFT', motivo: 'teste', proposedById: 'teste', fonte: 'teste', vigenteDesde: '2023-09-01',
        valorJson: JSON.stringify({ descricao: 'Rendimento decorrente do trabalho sem vínculo empregatício', grupo: 10, declarante: 'PJ', tributos: ['IR'], tiposIsencao: [] }),
      },
    });
    const pf = await contraparte('Autônomo Silva', '52998224725', 'PF');
    await perfil(pf, { naturezaServico: 'TRABALHO_NAO_ASSALARIADO_PF', natRend: '10002', irrf: true, fonte: 'RIR/2018 art. 685' });
    const r1 = await criarTitulo(pf, 'RPA-1', 400_000, '2026-10-05');
    expect([r1.status, r1.body.data.withholdingAvisos]).toEqual([201, ['CODIGO_RECEITA_DRAFT']]);
    expect((await retencoes(r1.body.data.id))[0]).toMatchObject({ tributo: 'IRRF', amountCents: 0n, codigoReceita: null, aliquotaBp: null });
    const r2 = await criarTitulo(pf, 'RPA-2', 400_000, '2026-10-20', { pfDeducoes: { dependentes: 0 } });
    const [segundo] = await retencoes(r2.body.data.id);
    // R$ 8.000 no mês, desconto simplificado: base 7.392,80 ⇒ 27,5% (2.033,02) − 908,73 = 1.124,29; sem redução (> R$ 7.350).
    expect([segundo.amountCents, segundo.baseCents, segundo.taxPayableId]).toEqual([112_429n, 739_280n, null]);
    expect(JSON.parse(segundo.pfDetalhe!)).toMatchObject({ descontoSimplificadoCents: '60720', retidoAntesNoMesCents: '0', reducaoArt3ACents: '0' });
  });

  // ── Review independente de 25/10 (`.claude/retornos/retencoes-fonte-review.md`), achados A1–A6 ─────────────────────────

  it('review A1: título com IRRF no reconhecimento pago inteiro (R$ 938,50) ⇒ CSRF R$ 46,50 sobre o bruto da NF (R$ 1.000) e título PAID', async () => {
    const t = (await criarTitulo(cp.A, 'NF-RA1', 100_000, '2026-02-02')).body.data.id as string;
    expect((await pagar(t, 93_850, '2026-02-10')).status).toBe(201);
    const row = await titulo(t);
    expect([row.status, Number(row.paidCents)]).toEqual(['PAID', 100_000]);
    const csrf = (await retencoes(t)).filter((x) => x.event === 'SETTLEMENT');
    expect(csrf.map((x) => [x.tributo, Number(x.brutoCents), Number(x.baseCents), Number(x.amountCents)]).sort()).toEqual([
      ['COFINS', 100_000, 100_000, 3000],
      ['CSLL', 100_000, 100_000, 1000],
      ['PIS', 100_000, 100_000, 650],
    ]);
  });

  it('review A1: duas parcelas de R$ 469,25 ⇒ cada uma sobre bruto proporcional de R$ 500 (CSRF 23,25) e o título fecha', async () => {
    const t = (await criarTitulo(cp.A, 'NF-RA2', 100_000, '2026-02-03')).body.data.id as string;
    expect((await pagar(t, 46_925, '2026-02-11')).status).toBe(201);
    expect((await pagar(t, 46_925, '2026-02-12')).status).toBe(201);
    const row = await titulo(t);
    expect([row.status, Number(row.paidCents)]).toEqual(['PAID', 100_000]);
    const csrf = (await retencoes(t)).filter((x) => x.event === 'SETTLEMENT');
    expect(csrf.every((x) => x.brutoCents === 50_000n)).toBe(true);
    expect(csrf.reduce((s, x) => s + Number(x.amountCents), 0)).toBe(4650);
  });

  it('review A2: retenção tardia de competência já somada (DEFERRED) vai ao título que a somou — nenhum título < R$ 10 aberto', async () => {
    expect((await criarTitulo(cp.D, 'NF-RD1', 30_000, '2026-05-20')).status).toBe(201); // 4,50 em 05, depois do acúmulo
    expect(await tituloImposto('170806-202605-C1')).toBeNull();
    expect(Number((await tituloImposto('170806-202606+202605'))!.amountCents)).toBe(1600);
  });

  it('review A2 (variante): 1º título < R$ 10 de competência encerrada cuja seguinte já tem título aberto ⇒ soma no seguinte', async () => {
    expect((await criarTitulo(cp.D, 'NF-RD2', 46_667, '2026-08-20')).status).toBe(201); // 7,00 em 08 (o 08 do NF-A8 foi cancelado)
    expect((await criarTitulo(cp.D, 'NF-RD3', 30_000, '2026-07-10')).status).toBe(201); // 4,50 em 07, lançado depois
    // Agosto e julho estão encerrados e < R$ 10: ambos vão ao título aberto seguinte do código — o complementar de setembro
    // (1.500) —, que passa a listar as duas competências. Nenhum título próprio de 07/08 abaixo do mínimo fica aberto.
    expect(await tituloImposto('170806-202607')).toBeNull();
    expect(await tituloImposto('170806-202608')).toBeNull();
    const setembro = (await tituloImposto('170806-202609-C1+202608+202607'))!;
    expect([Number(setembro.amountCents), setembro.status]).toEqual([2650, 'OPEN']);
  });

  it('review A3: pfDeducoes com contraparte PJ ⇒ 400 (parâmetro aceito e ignorado é bug)', async () => {
    const r = await criarTitulo(cp.A, 'NF-RA3', 100_000, '2026-02-04', { pfDeducoes: { dependentes: 2 } });
    expect([r.status, JSON.stringify(r.body)]).toEqual([400, expect.stringContaining('PF_DEDUCOES_FORA_DE_PF')]);
  });

  it('review A4: o claim da baixa do título de imposto confere o valor lido (valor velho ⇒ 0, nada muda)', async () => {
    const imposto = await prisma.payable.findFirstOrThrow({ where: { userId: dono.id, unitId: UNIT, origin: 'WITHHOLDING_TAX', documentNumber: { startsWith: '170806-202612' } } });
    const repo = new PayableRepository();
    const lido = Number(imposto.amountCents);
    // Leitura velha: o título valia mais antes de uma retenção encolher — sem a guarda, o claim passaria e fecharia com saldo.
    expect(await repo.claimForPayment(scope(), imposto.id, lido + 1, lido + 1)).toBe(0);
    expect((await titulo(imposto.id)).status).toBe('OPEN');
    expect(Number((await titulo(imposto.id)).paidCents)).toBe(0);
  });

  it('review A5: o complementar não reusa o número de um título cancelado (sem P2002)', async () => {
    const p1 = (await criarTitulo(cp.A, 'NF-RA51', 100_000, '2026-04-05')).body.data.id as string;
    const base = (await tituloImposto('170806-202604'))!;
    const pagBase = await pagar(base.id, 1500, '2026-05-20');
    expect(pagBase.status).toBe(201);
    expect((await criarTitulo(cp.A, 'NF-RA52', 100_000, '2026-04-06')).status).toBe(201); // ⇒ -C1
    const c1 = (await tituloImposto('170806-202604-C1'))!;
    expect((await cancelarPagamento(base.id, pagBase.body.data.id, '2026-05-21')).status).toBe(200); // base volta a OPEN sem baixa
    expect((await pagar(c1.id, 1500, '2026-05-21')).status).toBe(201);
    expect((await cancelarTitulo(p1, '2026-05-22')).status).toBe(200); // base zera e é cancelado
    const r = await criarTitulo(cp.A, 'NF-RA53', 100_000, '2026-04-07');
    expect(r.status).toBe(201);
    expect(Number((await tituloImposto('170806-202604-C2'))!.amountCents)).toBe(1500);
  });

  it('review A6: o re-drive credita a conta do título de imposto, não a do perfil fiscal atual', async () => {
    const real = PostingService.prototype.postEntry;
    const spy = jest.spyOn(PostingService.prototype, 'postEntry').mockImplementation(function (this: PostingService, s, input) {
      if (input.sourceType === 'ap.withholding') return Promise.reject(new Error('crash simulado'));
      return real.call(this, s, input);
    });
    const t = (await criarTitulo(cp.A, 'NF-RA6', 100_000, '2026-01-15')).body.data.id as string;
    spy.mockRestore();
    const nova = await criarConta('2.1.99.04', 'Liability');
    const perfilFiscal = (troca: string) =>
      request(app).put('/api/accounting/fiscal-profile').set(authHeader(dono)).send({
        unitId: UNIT, regimeTributario: 'REAL', icmsContribuinte: false, pisCofinsRegime: 'NAO_CUMULATIVO',
        retencaoIrrfRecolherAccountId: troca, retencaoCsrfRecolherAccountId: conta.csrf, retencaoInssRecolherAccountId: conta.inss, retencaoIssRecolherAccountId: conta.iss,
      });
    expect((await perfilFiscal(nova.id)).status).toBe(200);
    try {
      await getFactory().getPayableService().reconcilePayables(scope());
      const [tw] = await retencoes(t);
      expect(await linhasDoLancamento('ap.withholding', tw.settlementId!)).toEqual([['2.1.2.01', 1500, 0], ['2.1.7.03', 0, 1500]]);
    } finally {
      expect((await perfilFiscal(conta.irrf)).status).toBe(200);
    }
  });

  it('invariante 3: tie-out de 2.1.2 fecha — os títulos de imposto ficam fora da soma do AP', async () => {
    const r = await request(app).get('/api/accounting/reports/tie-out').set(authHeader(dono)).query({ unitId: UNIT });
    expect(r.status).toBe(200);
    const ap = (r.body.data.checks ?? r.body.data).find((c: { id: string }) => c.id === 'payables');
    expect(ap.subledgerCents).toBe(ap.ledgerCents);
  });
});

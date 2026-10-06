/**
 * BE-INCR-PIS-COFINS PR-2 (nó X8, BRIEF itens 7–16, 20–23) — prévia, confirmação e leitura da apuração mensal de PIS e
 * Cofins ponta a ponta pelo HTTP. Cada cenário usa um dono próprio (a apuração é da PJ inteira).
 *
 * Números:
 *  - Presumido (cumulativo), M03/2026, serviço R$ 100.000,00 ⇒ PIS 0,65% = 650,00; Cofins 3% = 3.000,00 (IN 2.121 art. 128).
 *  - Real (não cumulativo), M01/2026, serviço R$ 100,00 ⇒ débito PIS 1,65 / Cofins 7,60; NF-e de janeiro: nota nova
 *    (PIS 10,00 + Cofins 46,00 = 56,00) + nota antiga (9,25 ⇒ DERIVADO 165:760 = 1,65 + 7,60) + saldo informado no 1º mês
 *    (PIS 1,00 / Cofins 2,00) ⇒ crédito 12,65 / 55,60 ⇒ a pagar 0, saldo credor 11,00 / 48,00.
 *    M02, serviço R$ 100.000,00 ⇒ 1.650,00 − 11,00 = 1.639,00; 7.600,00 − 48,00 = 7.552,00.
 *  - X7 Presumido T01 com os R$ 100.000,00 de março: base 32% = 32.000,00; IRPJ 4.800,00; CSLL 9% = 2.880,00.
 * Os itens 17–19 (provisão) estão em `pisCofinsProvision.integration.test.ts` (PR-3); (f) e (g) seguem com um lançamento
 * manual D despesa / C a recolher de mesma forma (o que provam é a natureza Expense da conta, não o bridge).
 */
import { readFile } from 'node:fs/promises';
import request from 'supertest';
import prisma from '@/lib/prisma';
import { makeApp, pushTestSchema, authHeader } from '@test/helpers';
import { ApplicationFactory } from '@/lib/factory';
import { resolveReadPath } from '@/lib/attachmentStorage';
import { PAYLOAD_ALLOWLIST } from '@/features/accounting/audit/auditCanonical';
import type { AccountingScope } from '@/features/accounting/scope/AccountingScope';
import type { SpedEcfRequestDto } from '@/features/accounting/dtos/SpedEcfDto';

const app = makeApp();
const UNIT = 'unit-x8-pr2';
const BASE = '/api/accounting/tax-assessments';
type Dono = { id: string; username: string };
type Linha = { codigo: string; valorCents: string; descricao: string; fonte: string };

let seq = 0;
async function novoDono(regime: string, opts: { modalidade?: string; empresa?: Record<string, unknown>; unidade?: Record<string, unknown> } = {}): Promise<Dono> {
  seq += 1;
  const u = await prisma.user.create({ data: { name: `x8p2-${seq}`, username: `x8p2-${seq}`, email: `x8p2-${seq}@test.local`, password: 'x', role: 'USER' } });
  await prisma.companyFiscalProfile.create({
    data: { userId: u.id, anoCalendario: 2026, regime, ecfIndAliqCsll: '1', ecfIndRecReceita: '2', createdById: u.id, updatedById: u.id, ...opts.empresa },
  });
  const modalidade = opts.modalidade ?? (regime === 'REAL' ? 'NAO_CUMULATIVO' : regime === 'PRESUMIDO' ? 'CUMULATIVO' : 'SIMPLES');
  await prisma.fiscalProfile.create({ data: { userId: u.id, unitId: UNIT, regimeTributario: regime, pisCofinsRegime: modalidade, ...opts.unidade } });
  return u;
}

const conta = async (dono: Dono, unitId: string, code: string, nature: string) =>
  (await prisma.account.findFirst({ where: { userId: dono.id, unitId, code } })) ??
  prisma.account.create({ data: { userId: dono.id, unitId, code, name: code, nature, acceptsEntries: true } });

async function lancar(dono: Dono, unitId: string, data: string, cents: number, debito = '1.1', credito = '3.1'): Promise<void> {
  const nat = (c: string) => (c.startsWith('1') ? 'Asset' : c.startsWith('2') ? 'Liability' : c.startsWith('3') ? 'Revenue' : 'Expense');
  const d = await conta(dono, unitId, debito, nat(debito));
  const c = await conta(dono, unitId, credito, nat(credito));
  const e = await prisma.journalEntry.create({ data: { userId: dono.id, unitId, date: new Date(`${data}T12:00:00.000Z`), description: 'lançamento', status: 'Posted' } });
  await prisma.posting.create({ data: { userId: dono.id, unitId, entryId: e.id, accountId: d.id, debitCents: cents, creditCents: 0 } });
  await prisma.posting.create({ data: { userId: dono.id, unitId, entryId: e.id, accountId: c.id, debitCents: 0, creditCents: cents } });
}

/** Nota de compra já importada (o PR-1 grava a linha `PIS_COFINS`); `parcelas` ausente = nota antiga (DERIVADO). */
async function nota(dono: Dono, issueDate: string, amountCents: number, parcelas?: { pisCents: number; cofinsCents: number }): Promise<void> {
  const cp =
    (await prisma.counterparty.findFirst({ where: { userId: dono.id, unitId: UNIT } })) ??
    (await prisma.counterparty.create({ data: { userId: dono.id, unitId: UNIT, type: 'SUPPLIER', name: 'Fornecedor', nameNormalized: 'fornecedor' } }));
  const rec = await conta(dono, UNIT, '1.1.9', 'Asset');
  await prisma.payable.create({
    data: {
      userId: dono.id, unitId: UNIT, supplierName: 'Fornecedor', counterpartyId: cp.id, documentNumber: `NF-${issueDate}-${amountCents}`, description: 'compra',
      issueDate: new Date(`${issueDate}T00:00:00.000Z`), dueDate: new Date(`${issueDate}T00:00:00.000Z`), amountCents: 100_000n, status: 'OPEN',
      recoverableTaxLines: JSON.stringify([{ accountId: rec.id, accountCode: '1.1.9', amountCents, kind: 'PIS_COFINS', ...parcelas }]),
    },
  });
}

const preview = (dono: Dono, periodo: string, extra: Record<string, unknown> = {}) =>
  request(app).post(`${BASE}/pis-cofins/preview`).set(authHeader(dono)).send({ unitId: UNIT, anoCalendario: 2026, periodo, ...extra });
const confirm = (dono: Dono, periodo: string, pis: string, cofins: string, extra: Record<string, unknown> = {}) =>
  request(app)
    .post(`${BASE}/pis-cofins`)
    .set(authHeader(dono))
    .send({ unitId: UNIT, anoCalendario: 2026, periodo, expectedAPagarCents: { PIS: pis, COFINS: cofins }, ...extra });
const linhas = (dono: Dono) => prisma.taxAssessment.findMany({ where: { userId: dono.id }, orderBy: [{ periodo: 'asc' }, { tributo: 'asc' }, { createdAt: 'asc' }] });
const eventos = async (dono: Dono, eventType: string): Promise<Record<string, string>[]> =>
  (await prisma.auditEvent.findMany({ where: { scopeUserId: dono.id, eventType }, orderBy: { seq: 'asc' } })).map((e) => JSON.parse(e.payload));
const mem = (memoria: Linha[], codigo: string) => memoria.find((m) => m.codigo === codigo)?.valorCents;
const corpo = (r: request.Response) => JSON.stringify(r.body);

describe('X8 PR-2 — apuração mensal de PIS/Cofins: prévia, confirmação, leitura', () => {
  beforeAll(async () => {
    pushTestSchema();
  }, 120000);

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('23 (a) / itens 13, 14, 16, 22: Presumido M03 — prévia, CAS 409, confirmação 201, auditoria, 2ª 409, leitura, substituição; o X7 não enxerga as linhas', async () => {
    const dono = await novoDono('PRESUMIDO');
    await lancar(dono, UNIT, '2026-03-10', 100_000_00);

    const p = await preview(dono, 'M03');
    expect(p.status).toBe(200);
    expect(p.body.data.pis).toMatchObject({ periodo: 'M03', modo: 'PIS_COFINS_CUMULATIVO', codigoReceita: '810902', baseCents: '10000000', devidoCents: '65000', aPagarCents: '65000' });
    expect(p.body.data.cofins).toMatchObject({ codigoReceita: '217201', devidoCents: '300000', aPagarCents: '300000' });
    expect(p.body.data.provisaoContasConfiguradas).toBe(false);
    expect(p.body.data.avisos.join(' ')).toContain('provisão ficará pendente');
    expect(await linhas(dono)).toHaveLength(0); // a prévia não persiste

    const cas = await confirm(dono, 'M03', '64999', '300000');
    expect(cas.status).toBe(409);
    expect(corpo(cas)).toContain('TAX_ASSESSMENT_CAS');
    expect(await linhas(dono)).toHaveLength(0);

    const ok = await confirm(dono, 'M03', '65000', '300000');
    expect(ok.status).toBe(201);
    expect(ok.body.data.pis).toMatchObject({ tributo: 'PIS', periodo: 'M03', status: 'CONFIRMED', supersedesId: null, provisaoPendente: true, aPagarCents: '65000' });
    expect(ok.body.data.cofins).toMatchObject({ tributo: 'COFINS', aPagarCents: '300000' });
    const rows = await linhas(dono);
    expect(rows.map((r) => [r.tributo, r.status, r.regime, r.forma, r.periodo, r.modo, r.codigoReceita, r.unitId])).toEqual([
      ['COFINS', 'CONFIRMED', 'PRESUMIDO', 'MENSAL', 'M03', 'PIS_COFINS_CUMULATIVO', '217201', UNIT],
      ['PIS', 'CONFIRMED', 'PRESUMIDO', 'MENSAL', 'M03', 'PIS_COFINS_CUMULATIVO', '810902', UNIT],
    ]);
    // Sem trava de forma (item 14): PIS/Cofins não travam o perfil.
    expect((await prisma.companyFiscalProfile.findFirstOrThrow({ where: { userId: dono.id } })).formaApuracaoTravadaEm).toBeNull();

    const ev = await eventos(dono, 'tax.assessment.confirmed');
    expect(ev).toHaveLength(2);
    expect(Object.keys(ev[0]).sort()).toEqual([...PAYLOAD_ALLOWLIST['tax.assessment.confirmed']].sort());
    expect(ev.find((e) => e.tributo === 'PIS')).toMatchObject({ periodo: 'M03', anoCalendario: '2026', aPagarCents: '65000', modo: 'PIS_COFINS_CUMULATIVO', diferencaPostergadaCents: '0' });

    expect((await confirm(dono, 'M03', '65000', '300000')).status).toBe(409);
    expect(corpo(await confirm(dono, 'M03', '65000', '300000'))).toContain('TAX_ASSESSMENT_ALREADY_CONFIRMED');

    // Item 16: os GET do X7 servem; o filtro tributo aceita PIS/COFINS.
    const lista = await request(app).get(BASE).query({ unitId: UNIT, anoCalendario: 2026, tributo: 'PIS' }).set(authHeader(dono));
    expect(lista.status).toBe(200);
    expect(lista.body.data.map((r: { tributo: string; periodo: string }) => [r.tributo, r.periodo])).toEqual([['PIS', 'M03']]);
    const um = await request(app).get(`${BASE}/${ok.body.data.cofins.id}`).query({ unitId: UNIT }).set(authHeader(dono));
    expect(um.status).toBe(200);
    expect(mem(um.body.data.memoria, 'DEBITO')).toBe('300000');

    // PR-3 (item 18): o reconcile do X7 serve a linha de PIS; sem as contas de PIS/Cofins no perfil ⇒ 400 nomeando a
    // conta (F-TA-7), nunca as contas da CSLL.
    const rec = await request(app).post(`${BASE}/${ok.body.data.pis.id}/provisao`).set(authHeader(dono)).send({ unitId: UNIT });
    expect(rec.status).toBe(400);
    expect(corpo(rec)).toContain('despesa de PIS');
    expect(await prisma.journalEntry.count({ where: { userId: dono.id, sourceType: 'tax.assessment.provision' } })).toBe(0);

    // O X7 não enxerga as linhas de PIS/Cofins: o T01 de IRPJ/CSLL confirma normalmente.
    const x7 = await request(app).post(BASE).set(authHeader(dono)).send({ unitId: UNIT, anoCalendario: 2026, periodo: 'T01', expectedAPagarCents: { IRPJ: '480000', CSLL: '288000' } });
    expect(x7.status).toBe(201);

    // Substituição (item 14): supersedesIds com as 2 linhas vivas.
    const sub = await confirm(dono, 'M03', '65000', '300000', { supersedesIds: [ok.body.data.pis.id, ok.body.data.cofins.id] });
    expect(sub.status).toBe(201);
    expect(sub.body.data.pis.supersedesId).toBe(ok.body.data.pis.id);
    const pis = (await linhas(dono)).filter((r) => r.tributo === 'PIS');
    expect(Object.fromEntries(pis.map((r) => [r.id, r.status]))).toEqual({ [ok.body.data.pis.id]: 'SUPERSEDED', [sub.body.data.pis.id]: 'CONFIRMED' });
    expect((await eventos(dono, 'tax.assessment.superseded')).map((e) => e.tributo).sort()).toEqual(['COFINS', 'PIS']);
  });

  it('23 (a)(b)(c) / itens 6, 8, 11: Real — crédito da NF-e (nova + DERIVADO) > débito ⇒ saldo credor; M02 o consome; ordem e "de trás para frente"', async () => {
    const dono = await novoDono('REAL');
    await lancar(dono, UNIT, '2026-01-15', 100_00);
    await nota(dono, '2026-01-10', 56_00, { pisCents: 10_00, cofinsCents: 46_00 });
    await nota(dono, '2026-01-31', 9_25); // nota antiga ⇒ 925 × 165/925 = 165 / 760
    await nota(dono, '2026-02-01', 1_000_00, { pisCents: 165_00, cofinsCents: 835_00 }); // fevereiro — fora do M01

    const saldo = { saldoCredorAnterior: { PIS: '100', COFINS: '200' } }; // 1º mês apurado (F-PCB-2 a)
    const p = await preview(dono, 'M01', saldo);
    expect(p.status).toBe(200);
    const { pis, cofins } = p.body.data;
    expect(pis).toMatchObject({ modo: 'PIS_COFINS_NAO_CUMULATIVO', codigoReceita: '691201', devidoCents: '165', aPagarCents: '0', saldoNegativoCents: '1100' });
    expect(cofins).toMatchObject({ codigoReceita: '585601', devidoCents: '760', aPagarCents: '0', saldoNegativoCents: '4800' });
    // 23 (c): Σ PIS + Σ Cofins das NF-e do mês = Σ amountCents das linhas PIS_COFINS (5.600 + 925)
    const somaNfe = ['CREDITO_NFE', 'CREDITO_NFE_DERIVADO'].reduce((s, c) => s + Number(mem(pis.memoria, c)) + Number(mem(cofins.memoria, c)), 0);
    expect(somaNfe).toBe(56_00 + 9_25);
    expect([mem(pis.memoria, 'CREDITO_NFE_DERIVADO'), mem(cofins.memoria, 'CREDITO_NFE_DERIVADO')]).toEqual(['165', '760']);
    expect(pis.memoria.find((m: Linha) => m.codigo === 'SALDO_CREDOR_ANTERIOR').descricao).toContain('informado');
    expect(p.body.data.avisos.join(' ')).toContain('derivado por 165:760');
    expect((await confirm(dono, 'M01', '0', '0', saldo)).status).toBe(201);

    // M02: o saldo credor é lido de M01 — informar de novo ⇒ 400.
    await lancar(dono, UNIT, '2026-02-15', 100_000_00);
    const informado = await preview(dono, 'M02', saldo);
    expect(informado.status).toBe(400);
    expect(corpo(informado)).toContain('saldoCredorAnterior só no 1º mês apurado');
    const m02 = await preview(dono, 'M02');
    expect(m02.status).toBe(200);
    // crédito de fevereiro (16.500 / 83.500) + saldo de janeiro (1.100 / 4.800)
    expect(m02.body.data.pis).toMatchObject({ devidoCents: '165000', aPagarCents: String(165_000 - 16_500 - 1_100), saldoNegativoCents: '0' });
    expect(m02.body.data.cofins).toMatchObject({ devidoCents: '760000', aPagarCents: String(760_000 - 83_500 - 4_800) });
    expect(m02.body.data.pis.memoria.find((m: Linha) => m.codigo === 'SALDO_CREDOR_ANTERIOR')).toMatchObject({ valorCents: '1100', descricao: expect.stringContaining('M01/2026') });
    expect((await confirm(dono, 'M02', m02.body.data.pis.aPagarCents, m02.body.data.cofins.aPagarCents)).status).toBe(201);

    // Ordem (item 11): M04 sem M03 ⇒ 409 na prévia e na confirmação.
    for (const r of [await preview(dono, 'M04'), await confirm(dono, 'M04', '0', '0')]) {
      expect(r.status).toBe(409);
      expect(corpo(r)).toContain('TAX_ASSESSMENT_ORDER');
    }
    // Item 14: substituir M01 com M02 confirmado ⇒ 409 "de trás para frente"; nada muda.
    const m01 = (await linhas(dono)).filter((r) => r.periodo === 'M01').map((r) => r.id);
    const tras = await confirm(dono, 'M01', '0', '0', { ...saldo, supersedesIds: m01 });
    expect(tras.status).toBe(409);
    expect(corpo(tras)).toContain('substitua de trás para frente');
    expect((await linhas(dono)).every((r) => r.status === 'CONFIRMED')).toBe(true);
  });

  it('item 8 / 23 (d): Real com outros créditos e retenções; cumulativo com outros créditos ⇒ 400; ajuste acima da receita ⇒ 400; aviso de ajustes', async () => {
    const real = await novoDono('REAL');
    await lancar(real, UNIT, '2026-05-10', 10_000_00);
    const r = await preview(real, 'M05', {
      outrosCreditos: [{ inciso: 'IV_ALUGUEL_PJ', baseCents: '200000', documento: 'contrato de locação' }],
      retencoes: [{ tributo: 'COFINS', valorCents: '1000' }],
    });
    expect(r.status).toBe(200);
    // débito 16.500 / 76.000; aluguel 2.000,00 × 1,65% = 3.300 / × 7,6% = 15.200
    expect(r.body.data.pis).toMatchObject({ devidoCents: '16500', aPagarCents: String(16_500 - 3_300) });
    expect(r.body.data.cofins).toMatchObject({ aPagarCents: String(76_000 - 15_200 - 1_000) });
    expect(r.body.data.pis.memoria.find((m: Linha) => m.codigo === 'CREDITO_IV_ALUGUEL_PJ_1').fonte).toBe('Lei 10.833/2003 art. 3º IV');

    const presumido = await novoDono('PRESUMIDO');
    await lancar(presumido, UNIT, '2026-05-10', 10_000_00);
    await lancar(presumido, UNIT, '2026-05-11', 2_000_00, '1.1', '3.3'); // revenda
    const cum = await preview(presumido, 'M05', { outrosCreditos: [{ inciso: 'III_ENERGIA', baseCents: '100' }] });
    expect(cum.status).toBe(400);
    expect(corpo(cum)).toContain('cumulativo não tem crédito');
    const acima = await preview(presumido, 'M05', { ajustesBase: [{ tipo: 'ALIQUOTA_ZERO_REVENDA', valorCents: '200001' }] });
    expect(acima.status).toBe(400);
    expect(corpo(acima)).toContain('ALIQUOTA_ZERO_REVENDA');
    const semDoc = await preview(presumido, 'M05', { ajustesBase: [{ tipo: 'COTA_PARTE_PARCEIRO', valorCents: '100' }] });
    expect(semDoc.status).toBe(400);
    expect(corpo(semDoc)).toContain('contrato de parceria');
    const aviso = await preview(presumido, 'M05');
    expect(aviso.status).toBe(200);
    expect(aviso.body.data.avisos.join(' ')).toContain('ajustes não informados: a base tributa toda a receita');
    expect(aviso.body.data.pis.baseCents).toBe('1200000');
  });

  it('23 (e) / item 9: 2027 ⇒ 400; SIMPLES ⇒ 400; caixa ⇒ 400; unidade divergente (REAL + CUMULATIVO) ⇒ 400; multiunidade ⇒ 400; perfil ausente ⇒ 400', async () => {
    const dono = await novoDono('PRESUMIDO');
    const em2027 = await request(app).post(`${BASE}/pis-cofins/preview`).set(authHeader(dono)).send({ unitId: UNIT, anoCalendario: 2027, periodo: 'M01' });
    expect(em2027.status).toBe(400);
    expect(corpo(em2027)).toContain('LC 214/2025 art. 542');

    const semPerfil = await request(app).post(`${BASE}/pis-cofins/preview`).set(authHeader(dono)).send({ unitId: UNIT, anoCalendario: 2025, periodo: 'M12' });
    expect(semPerfil.status).toBe(400);
    expect(corpo(semPerfil)).toContain('perfil fiscal da empresa de 2025 ausente');

    const simples = await novoDono('SIMPLES');
    for (const r of [await preview(simples, 'M01'), await confirm(simples, 'M01', '0', '0')]) {
      expect(r.status).toBe(400);
      expect(corpo(r)).toContain('DAS');
    }

    const caixa = await novoDono('PRESUMIDO', { empresa: { ecfIndRecReceita: '1' } });
    const c = await preview(caixa, 'M01');
    expect(c.status).toBe(400);
    expect(corpo(c)).toContain('IN RFB 2.121/2022 art. 127');

    const divergente = await novoDono('REAL', { modalidade: 'CUMULATIVO' });
    const d = await preview(divergente, 'M01');
    expect(d.status).toBe(400);
    expect(corpo(d)).toContain('diverge da modalidade');

    const multi = await novoDono('PRESUMIDO');
    await lancar(multi, UNIT, '2026-04-10', 1_000_00);
    await lancar(multi, 'unit-x8-filial', '2026-04-20', 1_000_00);
    await lancar(multi, 'unit-x8-outra', '2026-05-01', 1_000_00); // maio — fora do M04
    const m = await preview(multi, 'M04');
    expect(m.status).toBe(400);
    expect(corpo(m)).toContain('unit-x8-filial');
    expect(corpo(m)).not.toContain('unit-x8-outra');

    for (const d2 of [simples, caixa, divergente, multi]) expect(await linhas(d2)).toHaveLength(0);
  });

  it('23 (g): a base do Real do X7 (LAIR) inclui a despesa de PIS/Cofins provisionada — fora da guarda de circularidade', async () => {
    const dono = await novoDono('REAL', { empresa: { lucroRealObrigatorio: true } });
    await lancar(dono, UNIT, '2026-02-10', 100_000_00);
    await lancar(dono, UNIT, '2026-03-31', 1_650_00, '4.9.3', '2.1.9.3'); // no lugar da provisão do PR-3: D despesa PIS / C PIS a recolher
    await prisma.lalurParteBClosing.create({ data: { userId: dono.id, unitId: UNIT, year: 2026, quarter: 'T01', balancesSha256: 'x' } });
    const p = await request(app).post(`${BASE}/preview`).set(authHeader(dono)).send({ unitId: UNIT, anoCalendario: 2026, periodo: 'T01' });
    expect(p.status).toBe(200);
    expect(mem(p.body.data.irpj.memoria, 'LAIR')).toBe(String(100_000_00 - 1_650_00));
  });
});

describe('X8 PR-2 — 23 (f): a ECF Presumido de um ano com provisão de PIS/Cofins lançada gera (F-PCB-1 b: conta Expense, gate intocado)', () => {
  const DONO = 'u-x8-pr2-ecf';
  const UNIDADE = 'unit-x8-pr2-ecf';
  const scope: AccountingScope = { ownerUserId: DONO, actorUserId: DONO, unitId: UNIDADE, ledgerCode: 'DEFAULT', baseCurrencyCode: 'BRL', timeZone: 'America/Sao_Paulo' };
  const dto = {
    unitId: UNIDADE,
    year: 2025,
    declarant: {
      cnpj: '11222333000181', nome: 'SALAO TESTE LTDA', codNat: '2062', cnaeFiscal: '9602501', endereco: 'RUA DAS FLORES', num: '100', bairro: 'CENTRO',
      uf: 'DF', codMun: '5300108', cep: '70000000', numTel: '6133334444', email: 'salao@teste.com',
    },
    fiscal: { indAliqCsll: '1', indRecReceita: '2' },
    signers: [
      { identNom: 'CONTADOR', identCpfCnpj: '11122233396', identQualif: '900', indCrc: 'DF-123456/O-1', email: 'c@d.com', fone: '6133334444' },
      { identNom: 'SOCIO', identCpfCnpj: '98765432100', identQualif: '205', email: 's@d.com', fone: '6133335555' },
    ],
  } as SpedEcfRequestDto;

  beforeAll(async () => {
    pushTestSchema();
    await prisma.user.create({ data: { id: DONO, name: DONO, username: DONO, email: `${DONO}@test.local`, password: 'x', role: 'USER' } });
    for (const acc of [
      { code: '1.1.1', nature: 'Asset' },
      { code: '2.1.9.3', nature: 'Liability' },
      { code: '2.1.9.4', nature: 'Liability' },
      { code: '2.3.1', nature: 'Equity' },
      { code: '3.1', nature: 'Revenue' },
      { code: '4.9.3', nature: 'Expense' },
      { code: '4.9.4', nature: 'Expense' },
    ]) {
      await prisma.account.create({ data: { userId: DONO, unitId: UNIDADE, name: acc.code, ...acc, acceptsEntries: true } });
    }
    await prisma.accountingPeriod.create({ data: { userId: DONO, unitId: UNIDADE, year: 2025, month: 10, status: 'OPEN', openedAt: new Date() } });
  }, 120000);

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('receita de serviço + D despesa de PIS/Cofins / C a recolher ⇒ a ECF sai, com o serviço em P200(8)', async () => {
    const posting = ApplicationFactory.getInstance().getPostingService();
    await posting.postEntry(scope, {
      unitId: UNIDADE, date: '2025-10-15', sourceType: 'manual', description: 'Serviço prestado em outubro',
      lines: [
        { accountCode: '1.1.1', debitCents: 1_000_000, creditCents: 0 },
        { accountCode: '3.1', debitCents: 0, creditCents: 1_000_000 },
      ],
    });
    await posting.postEntry(scope, {
      unitId: UNIDADE, date: '2025-10-31', sourceType: 'manual', description: 'Provisão de PIS/Cofins de outubro (no lugar da do PR-3)',
      lines: [
        { accountCode: '4.9.3', debitCents: 6_500, creditCents: 0 },
        { accountCode: '4.9.4', debitCents: 30_000, creditCents: 0 },
        { accountCode: '2.1.9.3', debitCents: 0, creditCents: 6_500 },
        { accountCode: '2.1.9.4', debitCents: 0, creditCents: 30_000 },
      ],
    });
    const job = await ApplicationFactory.getInstance().getSpedEcfGenerationService().generate(scope, dto);
    const row = await prisma.accountingDataExchangeJob.findUniqueOrThrow({ where: { id: job.id } });
    const text = (await readFile(resolveReadPath(row.storageKey!))).toString('latin1');
    expect(text).toContain('|P200|8||10000,00|');
  });
});

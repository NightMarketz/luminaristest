/**
 * IBS-CBS-2027 PR-2 (BRIEF `docs/accounting/BE-INCR-IBS-CBS-2027-brief.md` itens 6–13) — apuração mensal de IBS/CBS pelo
 * HTTP, sobre SQLite real: débito por documento, bloqueios de escopo, CAS/ordem/cascata, trilha e a reclassificação
 * receita → passivo em 2 commits (F-IBS-8 c, F-IBS-14 a). Cada cenário tem um dono próprio (a apuração é da PJ).
 *
 * Conta de mão (jan/2027, Presumido): NFS-e A IBS 100 / CBS 800; NF-e B IBS 30 / CBS 270 ⇒ IBS 130 (serviço 100,
 * mercadoria 30), CBS 1.070 (serviço 800, mercadoria 270). Reclassificação do IBS: D 3.1 100 / D 3.3 30 / C 2.1.9.5 130,
 * em 2027-01-31.
 */
import request from 'supertest';
import prisma from '@/lib/prisma';
import { ApplicationFactory } from '@/lib/factory';
import { ConsumptionTaxAssessmentRepository } from '@/features/accounting/repositories/ConsumptionTaxAssessmentRepository';
import { PAYLOAD_ALLOWLIST } from '@/features/accounting/audit/auditCanonical';
import { resolveAccountingScopeInternal } from '@/features/accounting/scope/resolveAccountingScopeInternal';
import { IBS_CBS_INICIO_MSG } from '@/features/accounting/dtos/IbsCbsAssessmentDto';
import { makeApp, pushTestSchema, authHeader, seedUnit } from '@test/helpers';

const app = makeApp();
const BASE = '/api/accounting/ibs-cbs-assessments';
const SOURCE = 'ibs_cbs_assessment';
type Dono = { id: string; username: string; unitId: string };
type Linha = { codigo: string; valorCents: string; descricao: string };

const CONTAS = [
  { code: '1.1.1', name: 'Banco', nature: 'Asset' },
  { code: '2.3.1', name: 'Lucros ou Prejuízos Acumulados', nature: 'Equity' },
  { code: '3.1', name: 'Receita de Serviços', nature: 'Revenue' },
  { code: '3.3', name: 'Receita de Revenda de Mercadorias', nature: 'Revenue' },
  { code: '2.1.9.5', name: 'IBS a recolher', nature: 'Liability' },
  { code: '2.1.9.6', name: 'CBS a recolher', nature: 'Liability' },
];

let seq = 0;
async function cenario(regime: 'PRESUMIDO' | 'REAL' | 'SIMPLES' = 'PRESUMIDO', contas = true) {
  seq += 1;
  const u = await prisma.user.create({ data: { name: `ibs2-${seq}`, username: `ibs2-${seq}`, email: `ibs2-${seq}@test.local`, password: 'x', role: 'USER' } });
  const unitId = `unit-ibs2-${seq}`;
  await seedUnit({ userId: u.id, id: unitId });
  const dono: Dono = { ...u, unitId };
  const ids: Record<string, string> = {};
  for (const c of CONTAS) ids[c.code] = (await prisma.account.create({ data: { userId: dono.id, unitId, ...c, acceptsEntries: true } })).id;
  for (let month = 1; month <= 12; month++) {
    await prisma.accountingPeriod.create({ data: { userId: dono.id, unitId, year: 2027, month, status: 'OPEN', openedAt: new Date() } });
  }
  await prisma.companyFiscalProfile.create({
    data: { userId: dono.id, anoCalendario: 2027, regime, ecfIndAliqCsll: '1', ecfIndRecReceita: '2', lucroRealObrigatorio: regime === 'REAL' ? false : null },
  });
  await prisma.fiscalProfile.create({
    data: {
      userId: dono.id, unitId, regimeTributario: regime === 'SIMPLES' ? 'SIMPLES' : regime, pisCofinsRegime: regime === 'SIMPLES' ? 'SIMPLES' : 'CUMULATIVO',
      ...(contas ? { ibsRecolherAccountId: ids['2.1.9.5'], cbsRecolherAccountId: ids['2.1.9.6'] } : {}),
    },
  });
  return dono;
}

let nota = 0;
async function documento(dono: Dono, over: Record<string, unknown> = {}) {
  nota += 1;
  return prisma.fiscalDocument.create({
    data: {
      userId: dono.id, unitId: dono.unitId, kind: 'NFSE', status: 'AUTHORIZED', saleId: `sale-ibs-${nota}`, saleKey: `sale-ibs-${nota}`,
      cTribNac: '060101', anchorEntryId: `je-ibs-${nota}`, ambiente: 'producao', partner: 'manual', serie: 1, numero: BigInt(nota),
      dCompet: '2027-01-10', vServCents: 100_000n, vIbsCents: 100n, vCbsCents: 800n, ...over,
    },
  });
}

/** Lançamento de receita no razão (a reclassificação debita 3.1/3.3 contra ele). `sourceType` opcional (venda liquidada). */
async function receita(dono: Dono, data: string, cents: number, code = '3.1', fonte?: { sourceType: string; sourceId: string }) {
  await ApplicationFactory.getInstance().getPostingService().postEntry(resolveAccountingScopeInternal({ userId: dono.id }, dono.unitId), {
    unitId: dono.unitId, date: data, sourceType: fonte?.sourceType ?? 'manual', ...(fonte ? { sourceId: fonte.sourceId } : {}), description: 'Venda',
    lines: [{ accountCode: '1.1.1', debitCents: cents, creditCents: 0 }, { accountCode: code, debitCents: 0, creditCents: cents }],
  });
}

const preview = (dono: Dono, body: Record<string, unknown>) => request(app).post(`${BASE}/preview`).set(authHeader(dono)).send({ unitId: dono.unitId, anoCalendario: 2027, mes: 1, tributo: 'IBS', ...body });
const confirm = (dono: Dono, body: Record<string, unknown>) => request(app).post(BASE).set(authHeader(dono)).send({ unitId: dono.unitId, anoCalendario: 2027, mes: 1, tributo: 'IBS', expectedSupersedesId: null, ...body });
async function confirmar(dono: Dono, body: Record<string, unknown> = {}) {
  const p = await preview(dono, body);
  expect(p.status).toBe(200);
  const r = await confirm(dono, { ...body, expectedSupersedesId: p.body.data.expectedSupersedesId });
  expect(r.status).toBe(201);
  return r.body.data as { apuracao: { id: string; provisaoPendente: boolean; provisaoEntryId: string | null; debitosCents: string; saldoCents: string }; reconfirmar: string[] };
}
const reconcile = (dono: Dono, id: string) => request(app).post(`${BASE}/${id}/provisao`).set(authHeader(dono)).send({ unitId: dono.unitId });
const reclassificacoes = (dono: Dono) =>
  prisma.journalEntry.findMany({ where: { userId: dono.id, sourceType: SOURCE }, include: { postings: { include: { account: true } } }, orderBy: { createdAt: 'asc' } });
const pernas = (e: { postings: Array<{ account: { code: string }; debitCents: bigint | number; creditCents: bigint | number }> }) =>
  e.postings.map((p) => [p.account.code, Number(p.debitCents), Number(p.creditCents)]).sort();
const eventos = async (dono: Dono, eventType: string): Promise<Record<string, string>[]> =>
  (await prisma.auditEvent.findMany({ where: { scopeUserId: dono.id, eventType }, orderBy: { seq: 'asc' } })).map((e) => JSON.parse(e.payload));
const corpo = (r: request.Response) => JSON.stringify(r.body);
const fechar = (dono: Dono, status: 'OPEN' | 'HARD_CLOSED') =>
  prisma.accountingPeriod.updateMany({ where: { userId: dono.id, unitId: dono.unitId, year: 2027, month: 1 }, data: { status } });

describe('IBS-CBS-2027 PR-2 — apuração mensal de IBS/CBS', () => {
  beforeAll(async () => {
    pushTestSchema();
  }, 120000);

  afterAll(async () => {
    jest.restoreAllMocks();
    await prisma.$disconnect();
  });

  it('item 10: SIMPLES ⇒ 400 nomeado na prévia e na confirmação; ano < 2027 ⇒ 400 nomeado em toda rota', async () => {
    const simples = await cenario('SIMPLES');
    for (const r of [await preview(simples, {}), await confirm(simples, {})]) {
      expect(r.status).toBe(400);
      expect(corpo(r)).toContain('art. 41 § 1º');
    }
    const dono = await cenario();
    for (const r of [
      await preview(dono, { anoCalendario: 2026 }),
      await confirm(dono, { anoCalendario: 2026 }),
      await request(app).get(BASE).set(authHeader(dono)).query({ unitId: dono.unitId, anoCalendario: 2026 }),
    ]) {
      expect(r.status).toBe(400);
      expect(corpo(r)).toContain(IBS_CBS_INICIO_MSG);
    }
  });

  it('itens 6, 7, 11: débito = soma do declarado nos documentos autorizados vivos em produção; cancelado e homologação fora; sem grupo conta; venda liquidada sem documento avisa; CBS 2027 sem alíquota não dá 400', async () => {
    const dono = await cenario();
    await documento(dono, { vIbsCents: 100n, vCbsCents: 800n });
    await documento(dono, { kind: 'NFE', status: 'AUTHORIZED_DIVERGENT', vIbsCents: 30n, vCbsCents: 270n });
    await documento(dono, { status: 'CANCELLED', vIbsCents: 9_999n });
    await documento(dono, { ambiente: 'homologacao', vIbsCents: 9_999n });
    await documento(dono, { vIbsCents: null, vCbsCents: null });
    await documento(dono, { dCompet: '2027-02-01', vIbsCents: 9_999n }); // fevereiro — fora de janeiro
    const comDoc = await documento(dono, { dCompet: '2026-12-20', vIbsCents: 0n, vCbsCents: 0n }); // nota de dezembro, paga em janeiro
    await receita(dono, '2027-01-15', 5_000, '3.1', { sourceType: 'sale.settled', sourceId: comDoc.saleId });
    await receita(dono, '2027-01-16', 7_000, '3.1', { sourceType: 'sale.settled', sourceId: 'venda-sem-nota' });

    const ibs = await preview(dono, {});
    expect(ibs.status).toBe(200);
    const m: Linha[] = ibs.body.data.memoria;
    expect([ibs.body.data.debitosCents, ibs.body.data.creditosCents, ibs.body.data.saldoCents]).toEqual(['130', '0', '130']);
    expect(m.filter((l) => l.codigo.startsWith('DEBITO_DOC_')).map((l) => l.valorCents)).toEqual(['100', '30']);
    expect(m.find((l) => l.codigo === 'DEBITO_SERVICO')!.valorCents).toBe('100');
    expect(m.find((l) => l.codigo === 'DEBITO_MERCADORIA')!.valorCents).toBe('30');
    expect(m.find((l) => l.codigo === 'DOCUMENTOS_SEM_GRUPO')!.descricao).toMatch(/^1 documento/);
    expect(m.filter((l) => l.codigo.startsWith('VENDA_SEM_DOCUMENTO_')).map((l) => l.descricao)).toEqual([expect.stringContaining('venda-sem-nota')]);
    expect(m.find((l) => l.codigo === 'CREDITOS_NAO_IMPLEMENTADOS_PR3')).toBeDefined();
    expect(m.find((l) => l.codigo === 'RECEITA_BRUTA_ATE_APURACAO')).toBeDefined();
    expect(m.find((l) => l.codigo === 'SALDO')).toMatchObject({ valorCents: '130', descricao: expect.stringContaining('UF 5 bp + município 5 bp') });

    const cbs = await preview(dono, { tributo: 'CBS' });
    expect(cbs.status).toBe(200);
    expect(cbs.body.data.debitosCents).toBe('1070');
  });

  it('item 9: outra unidade da PJ com movimento no mês ⇒ 400', async () => {
    const dono = await cenario();
    const outra = `${dono.unitId}-b`;
    await seedUnit({ userId: dono.id, id: outra });
    for (const c of CONTAS) await prisma.account.create({ data: { userId: dono.id, unitId: outra, ...c, acceptsEntries: true } });
    await prisma.accountingPeriod.create({ data: { userId: dono.id, unitId: outra, year: 2027, month: 1, status: 'OPEN', openedAt: new Date() } });
    await receita({ ...dono, unitId: outra }, '2027-01-05', 1_000);
    const r = await preview(dono, {});
    expect(r.status).toBe(400);
    expect(corpo(r)).toContain('outra unidade');
  });

  it('item 9: CAS divergente ⇒ 409; mês novo atrás de um posterior confirmado ⇒ 409; substituir M derruba M+1 (reconfirmar) e a trilha não leva PII', async () => {
    const dono = await cenario();
    await receita(dono, '2027-01-05', 100_000);
    await documento(dono);
    await documento(dono, { dCompet: '2027-03-10' });
    const fev = await confirmar(dono, { mes: 2 });
    expect(fev.apuracao.debitosCents).toBe('0');
    // janeiro é novo e fevereiro já está confirmado ⇒ 409 de ordem (dono 21/10)
    const ordem = await confirm(dono, {});
    expect(ordem.status).toBe(409);
    expect(corpo(ordem)).toContain('IBS_CBS_ASSESSMENT_ORDER');

    const dono2 = await cenario();
    await receita(dono2, '2027-01-05', 100_000);
    await documento(dono2);
    const jan = await confirmar(dono2);
    const fev2 = await confirmar(dono2, { mes: 2 });
    const cas = await confirm(dono2, { expectedSupersedesId: null });
    expect(cas.status).toBe(409);
    expect(corpo(cas)).toContain('IBS_CBS_ASSESSMENT_CAS');
    expect((await confirm(dono2, { expectedSupersedesId: 'outro-id' })).status).toBe(409);

    const sub = await confirmar(dono2);
    expect(sub.reconfirmar).toEqual(['02/2027']);
    const rows = await prisma.consumptionTaxAssessment.findMany({ where: { userId: dono2.id }, orderBy: { confirmedAt: 'asc' } });
    expect(rows.map((r) => [r.mes, r.status])).toEqual([[1, 'SUPERSEDED'], [2, 'SUPERSEDED'], [1, 'CONFIRMED']]);
    expect(rows[2].supersedesId).toBe(jan.apuracao.id);

    const conf = await eventos(dono2, 'tax.ibs_cbs_assessment.confirmed');
    expect(Object.keys(conf[0]).sort()).toEqual([...PAYLOAD_ALLOWLIST['tax.ibs_cbs_assessment.confirmed']].sort());
    expect(conf[0]).toMatchObject({ tributo: 'IBS', anoCalendario: '2027', mes: '1', saldoCents: '100' });
    const sup = await eventos(dono2, 'tax.ibs_cbs_assessment.superseded');
    expect(sup.map((e) => [e.assessmentId, e.supersededById])).toEqual([[jan.apuracao.id, sub.apuracao.id], [fev2.apuracao.id, sub.apuracao.id]]);

    const lista = await request(app).get(BASE).set(authHeader(dono2)).query({ unitId: dono2.unitId, anoCalendario: 2027 });
    expect(lista.status).toBe(200);
    expect(lista.body.data).toHaveLength(3);
  });

  it('item 12 (commit 1 — razão): D 3.1 / D 3.3 / C a recolher pelo débito dos documentos; soma = debitosCents', async () => {
    const dono = await cenario();
    await receita(dono, '2027-01-05', 100_000);
    await receita(dono, '2027-01-05', 30_000, '3.3');
    await documento(dono, { vIbsCents: 100n, vCbsCents: 800n });
    await documento(dono, { kind: 'NFE', vIbsCents: 30n, vCbsCents: 270n });
    const ibs = await confirmar(dono);
    const cbs = await confirmar(dono, { tributo: 'CBS' });
    expect([ibs.apuracao.provisaoPendente, cbs.apuracao.provisaoPendente]).toEqual([false, false]);
    const [eIbs, eCbs] = await reclassificacoes(dono);
    expect(eIbs.date.toISOString().slice(0, 10)).toBe('2027-01-31');
    expect(pernas(eIbs)).toEqual([['2.1.9.5', 0, 130], ['3.1', 100, 0], ['3.3', 30, 0]]);
    expect(pernas(eCbs)).toEqual([['2.1.9.6', 0, 1_070], ['3.1', 800, 0], ['3.3', 270, 0]]);
    expect(eIbs.postings.reduce((s, p) => s + Number(p.debitCents), 0)).toBe(Number(ibs.apuracao.debitosCents));
    expect(ibs.apuracao.provisaoEntryId).toBe(eIbs.id);
  });

  it('item 12 (commit 1 — razão): período fechado ⇒ a confirmação fica, reclassificação pendente, nenhum lançamento', async () => {
    const dono = await cenario();
    await receita(dono, '2027-01-05', 100_000);
    await documento(dono);
    await fechar(dono, 'HARD_CLOSED');
    const r = await confirmar(dono);
    expect(r.apuracao.provisaoPendente).toBe(true);
    expect(await prisma.consumptionTaxAssessment.count({ where: { userId: dono.id, status: 'CONFIRMED' } })).toBe(1);
    expect(await reclassificacoes(dono)).toHaveLength(0);
  });

  it('item 12 (reconcile): completa e é idempotente — 2ª chamada sem lançamento novo, mesmo provisaoEntryId', async () => {
    const dono = await cenario('PRESUMIDO', false);
    await receita(dono, '2027-01-05', 100_000);
    await documento(dono);
    const p = await preview(dono, {});
    expect(p.body.data.provisaoContasConfiguradas).toBe(false);
    const r = await confirmar(dono);
    expect(r.apuracao.provisaoPendente).toBe(true);
    const semConta = await reconcile(dono, r.apuracao.id);
    expect(semConta.status).toBe(400);
    expect(corpo(semConta)).toContain('IBS a recolher');

    const conta = await prisma.account.findFirstOrThrow({ where: { userId: dono.id, unitId: dono.unitId, code: '2.1.9.5' } });
    await prisma.fiscalProfile.updateMany({ where: { userId: dono.id, unitId: dono.unitId }, data: { ibsRecolherAccountId: conta.id } });
    const a = await reconcile(dono, r.apuracao.id);
    const b = await reconcile(dono, r.apuracao.id);
    expect([a.status, b.status]).toEqual([200, 200]);
    expect(a.body.data.provisaoPendente).toBe(false);
    expect(b.body.data.provisaoEntryId).toBe(a.body.data.provisaoEntryId);
    expect(await reclassificacoes(dono)).toHaveLength(1);
  });

  it('item 12 (commit 2 — CAS): crash entre o postEntry e o CAS ⇒ pendente; reconcile reaproveita o lançamento (sem 2º)', async () => {
    const dono = await cenario();
    await receita(dono, '2027-01-05', 100_000);
    await documento(dono);
    const spy = jest.spyOn(ConsumptionTaxAssessmentRepository.prototype, 'setProvisaoEntryId').mockRejectedValue(new Error('crash entre commits'));
    const r = await confirmar(dono);
    spy.mockRestore();
    expect(r.apuracao.provisaoPendente).toBe(true);
    expect(await reclassificacoes(dono)).toHaveLength(1);
    expect((await reconcile(dono, r.apuracao.id)).status).toBe(200);
    const entries = await reclassificacoes(dono);
    expect(entries).toHaveLength(1);
    expect((await prisma.consumptionTaxAssessment.findUniqueOrThrow({ where: { id: r.apuracao.id } })).provisaoEntryId).toBe(entries[0].id);
  });

  it('item 12 (substituição): estorna a reclassificação da substituída e posta a da nova — 1 viva por tributo', async () => {
    const dono = await cenario();
    await receita(dono, '2027-01-05', 100_000);
    await documento(dono);
    const antiga = await confirmar(dono);
    await documento(dono, { vIbsCents: 50n });
    const nova = await confirmar(dono);
    expect(nova.apuracao.debitosCents).toBe('150');
    const original = await prisma.journalEntry.findUniqueOrThrow({ where: { id: antiga.apuracao.provisaoEntryId! } });
    expect(original.status).toBe('Reversed');
    const vivas = await prisma.journalEntry.findMany({ where: { userId: dono.id, sourceType: SOURCE, status: 'Posted' } });
    expect(vivas.map((e) => e.sourceId)).toEqual([nova.apuracao.id]);
  });
});

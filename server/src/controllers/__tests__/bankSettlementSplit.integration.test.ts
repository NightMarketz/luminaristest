/**
 * IBS-CBS-2027 PR-4 (BRIEF `docs/accounting/BE-INCR-IBS-CBS-2027-brief.md` itens 19–20 + EMENDA PR-4, dono 22/10) —
 * split payment no F7 pelo HTTP. O provedor retém o IBS/CBS e a linha chega menor que o título; o confirm informa os dois
 * valores e o resto do título é quitado por recibos sem caixa (D IBS|CBS a recolher / C cliente). Invariante §10.7: nunca
 * tarifa. Cada cenário usa um dono próprio.
 *
 * Números: título 100,00; linha Pix 90,00; IBS 1,00 + CBS 9,00 retidos; competência 01/2027.
 */
import request from 'supertest';
import prisma from '@/lib/prisma';
import { makeApp, pushTestSchema, authHeader, seedUnit } from '@test/helpers';
import { PAYLOAD_ALLOWLIST } from '@/features/accounting/audit/auditCanonical';
import { ReconciliationService } from '@/features/accounting/services/ReconciliationService';
import { ValidationError } from '@/lib/errors';

const app = makeApp();
const D = (s: string) => new Date(`${s}T00:00:00.000Z`);
type Dono = { id: string; username: string; unitId: string; accounts: Record<string, string>; statementId: string };

let seq = 0;
async function novoDono(regime: string, opts: { contasNoPerfil?: boolean } = {}): Promise<Dono> {
  seq += 1;
  const u = await prisma.user.create({ data: { name: `split-${seq}`, username: `split-${seq}`, email: `split-${seq}@test.local`, password: 'x', role: 'USER' } });
  const unitId = `unit-split-${seq}`;
  await seedUnit({ userId: u.id, id: unitId });
  await prisma.accountingPeriod.create({ data: { userId: u.id, unitId, year: 2027, month: 1, status: 'OPEN', openedAt: new Date(), openedById: u.id } });
  const accounts: Record<string, string> = {};
  for (const [code, nature] of [
    ['1.1.1.01', 'Asset'], ['1.1.2.03', 'Asset'], ['3.1', 'Revenue'], ['4.1', 'Expense'], ['2.1.2.01', 'Liability'],
    ['2.1.8.01', 'Liability'], ['2.1.8.02', 'Liability'],
  ] as const) {
    const a = await prisma.account.create({ data: { userId: u.id, unitId, code, name: `Conta ${code}`, nature, acceptsEntries: true } });
    accounts[code] = a.id;
  }
  await prisma.companyFiscalProfile.create({ data: { userId: u.id, anoCalendario: 2027, regime, ecfIndAliqCsll: '1', ecfIndRecReceita: '2', createdById: u.id, updatedById: u.id } });
  await prisma.fiscalProfile.create({
    data: {
      userId: u.id, unitId, regimeTributario: regime, pisCofinsRegime: 'CUMULATIVO',
      ...(opts.contasNoPerfil === false ? {} : { ibsRecolherAccountId: accounts['2.1.8.01'], cbsRecolherAccountId: accounts['2.1.8.02'] }),
    },
  });
  const st = await prisma.bankStatement.create({
    data: { userId: u.id, unitId, glAccountId: accounts['1.1.1.01'], periodStart: D('2027-01-01'), periodEnd: D('2027-01-31'), sha256: `sha-split-${seq}` },
  });
  return { ...u, unitId, accounts, statementId: st.id };
}

async function receivable(dono: Dono, documentNumber: string, amountCents = 10_000): Promise<string> {
  const r = await request(app)
    .post('/api/receivables')
    .set(authHeader(dono))
    .send({ unitId: dono.unitId, customerName: 'Cliente split', documentNumber, description: 'x', issueDate: '2027-01-05', dueDate: '2027-01-20', amountCents, revenueAccountId: dono.accounts['3.1'] });
  expect(r.status).toBe(201);
  return r.body.data.id as string;
}

let lineNo = 0;
async function itemDaLinha(dono: Dono, amountCents: number, externalRef: string): Promise<string> {
  lineNo += 1;
  const line = await prisma.bankStatementLine.create({
    data: { userId: dono.id, unitId: dono.unitId, statementId: dono.statementId, lineNumber: lineNo, date: D('2027-01-15'), amountCents, description: `linha ${lineNo}`, externalRef, status: 'UNMATCHED', rawJson: '[]' },
  });
  const scan = await request(app).post('/api/bank-settlements/scan').set(authHeader(dono)).send({ unitId: dono.unitId, statementId: dono.statementId });
  expect(scan.status).toBe(200);
  return (await prisma.bankSettlementItem.findFirstOrThrow({ where: { statementLineId: line.id } })).id;
}

const confirm = (dono: Dono, id: string, extra: Record<string, unknown> = {}) =>
  request(app).post(`/api/bank-settlements/${id}/confirm`).set(authHeader(dono)).send({ unitId: dono.unitId, method: 'Pix', ...extra });
const splitReceipts = (receivableId: string) =>
  prisma.receivableReceipt.findMany({ where: { receivableId, kind: 'SPLIT_IBS_CBS' }, orderBy: { amountCents: 'asc' } });

describe('IBS-CBS-2027 PR-4 — split payment no F7', () => {
  beforeAll(async () => {
    pushTestSchema();
  }, 120000);

  afterEach(() => jest.restoreAllMocks());

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('item 19c: split quita o título — D IBS a recolher / D CBS a recolher / C cliente, nunca tarifa', async () => {
    const dono = await novoDono('PRESUMIDO');
    const recId = await receivable(dono, 'FAT-S1');
    const itemId = await itemDaLinha(dono, 9_000, 'FAT-S1');

    const res = await confirm(dono, itemId, { split: { ibsCents: 100, cbsCents: 900 } });
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ status: 'CONFIRMED', proposedCents: 9_000, chargeCents: 0, feeCents: 0, feeEntryId: null, chargeEntryId: null });
    expect(res.body.data.split).toMatchObject({ ibsCents: 100, cbsCents: 900, competencia: '2027-01' });

    // O título fecha: 90,00 do banco + 10,00 de split.
    expect((await prisma.receivable.findUniqueOrThrow({ where: { id: recId } })).status).toBe('RECEIVED');
    const splits = await splitReceipts(recId);
    expect(splits.map((r) => [Number(r.amountCents), r.method, r.debitAccountId, r.status])).toEqual([
      [100, 'SplitPayment', dono.accounts['2.1.8.01'], 'ACTIVE'],
      [900, 'SplitPayment', dono.accounts['2.1.8.02'], 'ACTIVE'],
    ]);
    expect([res.body.data.split.ibsReceiptId, res.body.data.split.cbsReceiptId]).toEqual(splits.map((r) => r.id));

    // Razão: cada recibo de split é D a recolher / C clientes, no dia da linha; nenhum lançamento de tarifa ou encargo.
    for (const [r, conta] of [[splits[0], '2.1.8.01'], [splits[1], '2.1.8.02']] as const) {
      const postings = await prisma.posting.findMany({ where: { entryId: r.entryId! } });
      expect(postings.map((p) => [p.accountId, Number(p.debitCents), Number(p.creditCents)]).sort()).toEqual(
        [[dono.accounts[conta], Number(r.amountCents), 0], [dono.accounts['1.1.2.03'], 0, Number(r.amountCents)]].sort(),
      );
      expect((await prisma.journalEntry.findUniqueOrThrow({ where: { id: r.entryId! } })).date.toISOString().slice(0, 10)).toBe('2027-01-15');
    }
    expect(await prisma.journalEntry.count({ where: { userId: dono.id, sourceType: { in: ['provider.fee', 'bank.charge'] } } })).toBe(0);

    // A linha concilia só com a perna de banco da baixa (os recibos de split não tocam o banco).
    const item = await prisma.bankSettlementItem.findUniqueOrThrow({ where: { id: itemId }, include: { statementLine: true } });
    expect(item.statementLine.status).toBe('MATCHED');
    expect(item.shortfallTreatment).toBe('SPLIT_IBS_CBS');

    // Item 19d: auditoria com os valores e ids do split, dentro da allowlist.
    const ev = await prisma.auditEvent.findFirstOrThrow({ where: { scopeUserId: dono.id, eventType: 'bank_settlement.confirmed' } });
    const payload = JSON.parse(ev.payload) as Record<string, string>;
    expect(payload).toMatchObject({ splitIbsCents: '100', splitCbsCents: '900', splitCompetencia: '2027-01', splitIbsReceiptId: splits[0].id, splitCbsReceiptId: splits[1].id });
    expect(Object.keys(payload).every((k) => PAYLOAD_ALLOWLIST['bank_settlement.confirmed'].includes(k))).toBe(true);
  });

  it('item 20: a apuração da competência mostra SPLIT_EXTINCAO_n por tributo; saldo segue débitos − créditos', async () => {
    const dono = await novoDono('REAL');
    const recId = await receivable(dono, 'FAT-S2');
    const itemId = await itemDaLinha(dono, 9_000, 'FAT-S2');
    expect((await confirm(dono, itemId, { split: { ibsCents: 100, cbsCents: 900 } })).status).toBe(200);

    const preview = (tributo: string, mes = 1) =>
      request(app).post('/api/accounting/ibs-cbs-assessments/preview').set(authHeader(dono)).send({ unitId: dono.unitId, anoCalendario: 2027, mes, tributo });
    const cbs = await preview('CBS');
    expect(cbs.status).toBe(200);
    const linha = (m: { codigo: string; valorCents: string }[], c: string) => m.find((l) => l.codigo === c)?.valorCents;
    expect(linha(cbs.body.data.memoria, 'SPLIT_EXTINCAO_1')).toBe('900');
    expect(cbs.body.data).toMatchObject({ debitosCents: '0', creditosCents: '0', saldoCents: '0' });
    expect(linha((await preview('IBS')).body.data.memoria, 'SPLIT_EXTINCAO_1')).toBe('100');
    // Outra competência não vê o split.
    expect((await preview('CBS', 2)).body.data.memoria.map((l: { codigo: string }) => l.codigo)).not.toContain('SPLIT_EXTINCAO_1');

    // Recibo de split cancelado não extingue nada: some da apuração.
    const [, cbsReceipt] = await splitReceipts(recId);
    await prisma.receivableReceipt.update({ where: { id: cbsReceipt.id }, data: { status: 'CANCELLED' } });
    expect((await preview('CBS')).body.data.memoria.map((l: { codigo: string }) => l.codigo)).not.toContain('SPLIT_EXTINCAO_1');
  });

  it('item 19a: linha + split que não fecha o saldo ⇒ 400 split_mismatch, sem efeito; o item volta a PENDING sem split gravado', async () => {
    const dono = await novoDono('PRESUMIDO');
    const recId = await receivable(dono, 'FAT-S3');
    const itemId = await itemDaLinha(dono, 9_000, 'FAT-S3');

    const res = await confirm(dono, itemId, { split: { ibsCents: 100, cbsCents: 800 } });
    expect(res.status).toBe(400);
    expect(JSON.stringify(res.body)).toContain('split_mismatch');
    const item = await prisma.bankSettlementItem.findUniqueOrThrow({ where: { id: itemId } });
    expect(item).toMatchObject({ status: 'PENDING', shortfallTreatment: null, splitIbsCents: 0n, splitCbsCents: 0n, settlementId: null });
    expect(await prisma.receivableReceipt.count({ where: { receivableId: recId } })).toBe(0);

    // Sem split, a mesma linha é a baixa PARCIAL de sempre (invariante §10.7).
    const parcial = await confirm(dono, itemId);
    expect(parcial.status).toBe(200);
    expect(parcial.body.data.split).toBeNull();
    expect((await prisma.receivable.findUniqueOrThrow({ where: { id: recId } })).status).toBe('PARTIALLY_RECEIVED');
    expect(await splitReceipts(recId)).toHaveLength(0);
  });

  it('item 19a: split em título a pagar ⇒ 400 split_not_allowed_payable', async () => {
    const dono = await novoDono('PRESUMIDO');
    const p = await request(app)
      .post('/api/payables')
      .set(authHeader(dono))
      .send({ unitId: dono.unitId, supplierName: 'Fornecedor', documentNumber: 'NF-S4', description: 'x', issueDate: '2027-01-05', dueDate: '2027-01-20', amountCents: 10_000, expenseAccountId: dono.accounts['4.1'] });
    expect(p.status).toBe(201);
    const itemId = await itemDaLinha(dono, -9_000, 'NF-S4');
    const res = await confirm(dono, itemId, { split: { ibsCents: 100, cbsCents: 900 } });
    expect(res.status).toBe(400);
    expect(JSON.stringify(res.body)).toContain('split_not_allowed_payable');
    expect((await prisma.bankSettlementItem.findUniqueOrThrow({ where: { id: itemId } })).status).toBe('PENDING');
  });

  it('item 19a (invariante §10.9): optante pelo Simples na competência ⇒ 400 IBS_CBS_SIMPLES_MEI', async () => {
    const dono = await novoDono('SIMPLES');
    await receivable(dono, 'FAT-S5');
    const itemId = await itemDaLinha(dono, 9_000, 'FAT-S5');
    const res = await confirm(dono, itemId, { split: { ibsCents: 100, cbsCents: 900 } });
    expect(res.status).toBe(400);
    expect(JSON.stringify(res.body)).toContain('IBS_CBS_SIMPLES_MEI');
  });

  it('item 19a: competência antes de 2027 ⇒ 400 na borda; conta a recolher fora do perfil ⇒ 400 split_account_not_configured', async () => {
    const dono = await novoDono('PRESUMIDO', { contasNoPerfil: false });
    await receivable(dono, 'FAT-S6');
    const itemId = await itemDaLinha(dono, 9_000, 'FAT-S6');

    const antes = await confirm(dono, itemId, { split: { ibsCents: 100, cbsCents: 900, competencia: '2026-12' } });
    expect(antes.status).toBe(400);
    expect(JSON.stringify(antes.body)).toContain('começa em 01/2027');

    const semConta = await confirm(dono, itemId, { split: { ibsCents: 100, cbsCents: 900 } });
    expect(semConta.status).toBe(400);
    expect(JSON.stringify(semConta.body)).toContain('split_account_not_configured');
    expect((await prisma.bankSettlementItem.findUniqueOrThrow({ where: { id: itemId } })).status).toBe('PENDING');
  });

  it('item 19b/19c: retry relê o split gravado e não duplica recibo — nem pelo id gravado, nem quando o id se perdeu (órfão adotado)', async () => {
    const dono = await novoDono('PRESUMIDO');
    const recId = await receivable(dono, 'FAT-S7');
    const itemId = await itemDaLinha(dono, 9_000, 'FAT-S7');

    // Falha na conciliação (etapa MATCH): baixa e recibos de split já feitos, ids gravados no FAILED.
    jest.spyOn(ReconciliationService.prototype, 'manualMatch').mockRejectedValueOnce(new ValidationError('falha injetada'));
    const falha = await confirm(dono, itemId, { split: { ibsCents: 100, cbsCents: 900, competencia: '2027-01' } });
    expect(falha.status).toBe(400);
    const failed = await prisma.bankSettlementItem.findUniqueOrThrow({ where: { id: itemId } });
    expect(failed).toMatchObject({ status: 'FAILED', failedStep: 'MATCH' });
    expect(failed.splitIbsReceiptId).not.toBeNull();
    expect(failed.splitCbsReceiptId).not.toBeNull();

    // Simula o crash entre o recibo e a gravação do id: o retry tem de adotar os recibos ATIVOS, não criar outros.
    await prisma.bankSettlementItem.update({ where: { id: itemId }, data: { splitIbsReceiptId: null, splitCbsReceiptId: null } });
    const retry = await request(app).post(`/api/bank-settlements/${itemId}/retry`).set(authHeader(dono)).send({ unitId: dono.unitId, method: 'Pix' });
    expect(retry.status).toBe(200);
    expect(retry.body.data).toMatchObject({ status: 'CONFIRMED', split: { ibsCents: 100, cbsCents: 900, competencia: '2027-01', ibsReceiptId: failed.splitIbsReceiptId, cbsReceiptId: failed.splitCbsReceiptId } });
    expect(await splitReceipts(recId)).toHaveLength(2);
    expect((await prisma.receivable.findUniqueOrThrow({ where: { id: recId } })).status).toBe('RECEIVED');
  });
});

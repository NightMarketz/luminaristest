/**
 * BE-INCR-BANK-SETTLEMENT (nó F7) — item 15: scan (2/3), confirm exato, parcial, com encargo (conta
 * configurada), sem conta → 400, reject, retry de FAILED, stale (10), idempotência do scan, outro
 * tenant → 404, concorrência (2 confirm → 1 efeito; CI Linux é o oráculo — classe
 * `windows-serializa-sqlite`), receivable, e o contrato de PUT /accounting/settings (natureza).
 *
 * Extrato e linhas nascem por Prisma direto (mesmo padrão de `ReconciliationRepository.*.integration`);
 * títulos nascem pela API (o AP/AR é dono da escrita — BRIEF §0).
 */
import request from 'supertest';
import prisma from '@/lib/prisma';
import { makeApp, pushTestSchema, authHeader } from '@test/helpers';
import { ReconciliationService } from '@/features/accounting/services/ReconciliationService';
import { ValidationError } from '@/lib/errors';

const app = makeApp();
const UNIT = 'unit-bank-settle';
const D = (s: string) => new Date(`${s}T00:00:00.000Z`);

let dono: { id: string; username: string };
let outro: { id: string; username: string };
let bankAccountId: string;
let statementId: string;
const payableIds: Record<string, string> = {};
let receivableId: string;

const criarUsuario = (username: string) =>
  prisma.user.create({ data: { name: username, username, email: `${username}@test.local`, password: 'x', role: 'USER' } });
const criarConta = (code: string, nature: string) =>
  prisma.account.create({ data: { userId: dono.id, unitId: UNIT, code, name: `Conta ${code}`, nature, acceptsEntries: true } });

async function criarPayable(documentNumber: string, amountCents: number, dueDate: string): Promise<string> {
  const expense = await prisma.account.findFirstOrThrow({ where: { userId: dono.id, unitId: UNIT, code: '4.1' } });
  const res = await request(app)
    .post('/api/payables')
    .set(authHeader(dono))
    .send({ unitId: UNIT, supplierName: `Fornecedor ${documentNumber}`, documentNumber, description: 'x', issueDate: '2026-06-01', dueDate, amountCents, expenseAccountId: expense.id });
  expect(res.status).toBe(201);
  return res.body.data.id as string;
}

async function criarLinha(lineNumber: number, amountCents: number, externalRef: string | null, date = '2026-06-18'): Promise<string> {
  const row = await prisma.bankStatementLine.create({
    data: { userId: dono.id, unitId: UNIT, statementId, lineNumber, date: D(date), amountCents, description: `linha ${lineNumber}`, externalRef, status: 'UNMATCHED', rawJson: '[]' },
  });
  return row.id;
}

const scan = () => request(app).post('/api/bank-settlements/scan').set(authHeader(dono)).send({ unitId: UNIT, statementId });
const list = (q: Record<string, string> = {}) => request(app).get('/api/bank-settlements').set(authHeader(dono)).query({ unitId: UNIT, statementId, ...q });
const confirm = (id: string, method = 'Pix', ator = dono) =>
  request(app).post(`/api/bank-settlements/${id}/confirm`).set(authHeader(ator)).send({ unitId: UNIT, method });

async function itemByLine(lineId: string) {
  const row = await prisma.bankSettlementItem.findFirstOrThrow({ where: { statementLineId: lineId }, orderBy: { createdAt: 'desc' } });
  return row;
}

describe('/api/bank-settlements — F7', () => {
  const lines: Record<string, string> = {};

  beforeAll(async () => {
    pushTestSchema();
    dono = await criarUsuario('bank-settle-a');
    outro = await criarUsuario('bank-settle-b');
    await prisma.accountingPeriod.create({
      data: { userId: dono.id, unitId: UNIT, year: 2026, month: 6, status: 'OPEN', openedAt: new Date(), openedById: dono.id },
    });
    await criarConta('4.1', 'Expense');
    await criarConta('2.1.2', 'Liability');
    await criarConta('3.1', 'Revenue');
    await criarConta('1.1.5', 'Asset');
    await criarConta('1.1.3', 'Asset'); // Cash — NÃO é a conta do extrato
    const bank = await criarConta('1.1.1', 'Asset'); // Pix/TED/Boleto
    bankAccountId = bank.id;
    await criarConta('4.9', 'Expense'); // encargo pago (código = decisão do contador; aqui só fixture)
    await criarConta('3.9', 'Revenue'); // encargo recebido

    const st = await prisma.bankStatement.create({
      data: { userId: dono.id, unitId: UNIT, glAccountId: bankAccountId, periodStart: D('2026-06-01'), periodEnd: D('2026-06-30'), sha256: 'sha-f7' },
    });
    statementId = st.id;

    payableIds.P1 = await criarPayable('NF-1', 10000, '2026-06-20'); // exata (L1)
    payableIds.P2 = await criarPayable('NF-2', 30000, '2026-06-22'); // parcial (L2)
    payableIds.P3 = await criarPayable('NF-3', 5000, '2026-04-01'); // fora da janela
    payableIds.P4 = await criarPayable('NF-4', 20000, '2026-06-22'); // com encargo (L3) — dentro da janela +5d
    const revenue = await prisma.account.findFirstOrThrow({ where: { userId: dono.id, unitId: UNIT, code: '3.1' } });
    const r = await request(app)
      .post('/api/receivables')
      .set(authHeader(dono))
      .send({ unitId: UNIT, customerName: 'Cliente F7', documentNumber: 'FAT-1', description: 'x', issueDate: '2026-06-01', dueDate: '2026-06-21', amountCents: 8000, revenueAccountId: revenue.id });
    expect(r.status).toBe(201);
    receivableId = r.body.data.id;

    lines.L1 = await criarLinha(1, -10000, 'NF-1');
    lines.L2 = await criarLinha(2, -7000, 'NF-2');
    lines.L3 = await criarLinha(3, -23000, 'NF-4'); // 20000 + 3000 (15% < cap 20%)
    lines.L4 = await criarLinha(4, -5000, null); // parcial elegível de P2 e P4 sem ref → ambiguous
    lines.L5 = await criarLinha(5, -99999, null); // acima de todo saldo + cap → none
    lines.L6 = await criarLinha(6, 8000, null); // receivable exata
  }, 120000);

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('sem Bearer → 401 nas 5 rotas (deny-by-default)', async () => {
    expect((await request(app).get('/api/bank-settlements')).status).toBe(401);
    expect((await request(app).post('/api/bank-settlements/scan').send({})).status).toBe(401);
    expect((await request(app).post('/api/bank-settlements/x/confirm').send({})).status).toBe(401);
    expect((await request(app).post('/api/bank-settlements/x/reject').send({})).status).toBe(401);
    expect((await request(app).post('/api/bank-settlements/x/retry').send({})).status).toBe(401);
  });

  it('scan — fixture literal: 4 itens (exata, parcial, encargo, receivable), 1 ambiguous, 1 none; valores por item', async () => {
    const res = await scan();
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual({ created: 4, skippedExisting: 0, ambiguous: 1, none: 1, stale: 0 });

    const i1 = await itemByLine(lines.L1);
    expect([i1.titleType, i1.titleId, Number(i1.proposedCents), Number(i1.chargeCents), i1.status]).toEqual(['PAYABLE', payableIds.P1, 10000, 0, 'PENDING']);
    const i2 = await itemByLine(lines.L2);
    expect([i2.titleId, Number(i2.proposedCents), Number(i2.chargeCents)]).toEqual([payableIds.P2, 7000, 0]);
    const i3 = await itemByLine(lines.L3);
    expect([i3.titleId, Number(i3.proposedCents), Number(i3.chargeCents)]).toEqual([payableIds.P4, 20000, 3000]);
    const i6 = await itemByLine(lines.L6);
    expect([i6.titleType, i6.titleId, Number(i6.proposedCents)]).toEqual(['RECEIVABLE', receivableId, 8000]);
    expect(await prisma.bankSettlementItem.count({ where: { statementLineId: { in: [lines.L4, lines.L5] } } })).toBe(0);
  });

  it('scan é idempotente — 2ª chamada devolve created 0 e skippedExisting 4 (item 2)', async () => {
    const res = await scan();
    expect(res.body.data.created).toBe(0);
    expect(res.body.data.skippedExisting).toBe(4);
    expect(await prisma.bankSettlementItem.count({ where: { userId: dono.id, unitId: UNIT } })).toBe(4);
  });

  it('list — paginada, com linha e título (saldo aberto recalculado na leitura)', async () => {
    const res = await list({ status: 'PENDING', limit: '2' });
    expect(res.status).toBe(200);
    expect(res.body.data.total).toBe(4);
    expect(res.body.data.items).toHaveLength(2);
    const item = res.body.data.items[0];
    expect(item.line).toEqual(expect.objectContaining({ date: expect.stringMatching(/^2026-06-18$/), amountCents: expect.any(Number) }));
    expect(item.title).toEqual(expect.objectContaining({ openCents: expect.any(Number), counterpartyName: expect.any(String) }));
  });

  it('outro tenant não vê nem confirma (404 pelo escopo), e nada é escrito', async () => {
    const i1 = await itemByLine(lines.L1);
    expect((await confirm(i1.id, 'Pix', outro)).status).toBe(404);
    expect((await itemByLine(lines.L1)).status).toBe('PENDING');
  });

  it('confirm com method cujo conta ≠ conta do extrato → 400 method_account_mismatch, sem efeito (F-F7-3 a)', async () => {
    const i1 = await itemByLine(lines.L1);
    const res = await confirm(i1.id, 'Cash');
    expect(res.status).toBe(400);
    expect(JSON.stringify(res.body)).toMatch(/method_account_mismatch/);
    expect((await itemByLine(lines.L1)).status).toBe('PENDING'); // CAS devolvido
    expect(await prisma.payablePayment.count({ where: { payableId: payableIds.P1 } })).toBe(0);
  });

  it('confirm exato (item 6/7): P1 PAID, linha MATCHED com 1 vínculo, item CONFIRMED com settlementId, evento na trilha', async () => {
    const i1 = await itemByLine(lines.L1);
    const res = await confirm(i1.id);
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('CONFIRMED');
    expect(res.body.data.settlementId).toBeTruthy();
    expect(res.body.data.chargeEntryId).toBeNull();
    expect((await prisma.payable.findUniqueOrThrow({ where: { id: payableIds.P1 } })).status).toBe('PAID');
    expect((await prisma.bankStatementLine.findUniqueOrThrow({ where: { id: lines.L1 } })).status).toBe('MATCHED');
    expect(await prisma.reconciliationMatch.count({ where: { statementLineId: lines.L1, unmatchedAt: null } })).toBe(1);
    expect(await prisma.auditEvent.count({ where: { unitId: UNIT, eventType: 'bank_settlement.confirmed', targetId: i1.id } })).toBe(1);
  });

  it('confirm de item já CONFIRMED → 400 (não está PENDING), sem 2º pagamento', async () => {
    const i1 = await itemByLine(lines.L1);
    expect((await confirm(i1.id)).status).toBe(400);
    expect(await prisma.payablePayment.count({ where: { payableId: payableIds.P1, status: 'ACTIVE' } })).toBe(1);
  });

  it('confirm parcial (L2 = 7000 de 30000): P2 PARTIALLY_PAID, linha fecha exata com o leg de 7000', async () => {
    const i2 = await itemByLine(lines.L2);
    const res = await confirm(i2.id, 'TED');
    expect(res.status).toBe(200);
    const p2 = await prisma.payable.findUniqueOrThrow({ where: { id: payableIds.P2 } });
    expect(p2.status).toBe('PARTIALLY_PAID');
    expect(Number(p2.paidCents)).toBe(7000);
    expect((await prisma.bankStatementLine.findUniqueOrThrow({ where: { id: lines.L2 } })).status).toBe('MATCHED');
  });

  it('confirm com encargo SEM conta configurada → 400 charge_account_not_configured, item volta a PENDING, zero efeito (item 8)', async () => {
    const i3 = await itemByLine(lines.L3);
    const res = await confirm(i3.id);
    expect(res.status).toBe(400);
    expect(JSON.stringify(res.body)).toMatch(/charge_account_not_configured/);
    expect((await itemByLine(lines.L3)).status).toBe('PENDING');
    expect(await prisma.payablePayment.count({ where: { payableId: payableIds.P4 } })).toBe(0);
  });

  it('PUT /accounting/settings rejeita conta com natureza errada (Revenue como encargo pago) e aceita a Expense', async () => {
    const wrong = await prisma.account.findFirstOrThrow({ where: { userId: dono.id, unitId: UNIT, code: '3.1' } });
    const bad = await request(app).put('/api/accounting/settings').set(authHeader(dono)).send({ unitId: UNIT, bankChargeExpenseAccountId: wrong.id });
    expect(bad.status).toBe(400);
    const exp = await prisma.account.findFirstOrThrow({ where: { userId: dono.id, unitId: UNIT, code: '4.9' } });
    const inc = await prisma.account.findFirstOrThrow({ where: { userId: dono.id, unitId: UNIT, code: '3.9' } });
    const ok = await request(app).put('/api/accounting/settings').set(authHeader(dono)).send({ unitId: UNIT, bankChargeExpenseAccountId: exp.id, bankChargeIncomeAccountId: inc.id });
    expect(ok.status).toBe(200);
    expect(ok.body.data.bankChargeExpenseAccountId).toBe(exp.id);
    const read = await request(app).get('/api/accounting/settings').set(authHeader(dono)).query({ unitId: UNIT });
    expect(read.body.data.bankChargeIncomeAccountId).toBe(inc.id);
    // campo extra → 400 (.strict)
    expect((await request(app).put('/api/accounting/settings').set(authHeader(dono)).send({ unitId: UNIT, foo: 1 })).status).toBe(400);
  });

  it('confirm com encargo (L3 = 20000 + 3000): P4 PAID, lançamento bank.charge D 4.9 / C 1.1.1, linha fecha 23000 com 2 legs', async () => {
    const i3 = await itemByLine(lines.L3);
    const res = await confirm(i3.id, 'Boleto');
    expect(res.status).toBe(200);
    expect(res.body.data.chargeEntryId).toBeTruthy();
    expect((await prisma.payable.findUniqueOrThrow({ where: { id: payableIds.P4 } })).status).toBe('PAID');
    const entry = await prisma.journalEntry.findUniqueOrThrow({ where: { id: res.body.data.chargeEntryId }, include: { postings: { include: { account: true } } } });
    expect(entry.sourceType).toBe('bank.charge');
    expect(entry.sourceId).toBe(i3.id);
    const d = entry.postings.find((p) => Number(p.debitCents) > 0)!;
    const c = entry.postings.find((p) => Number(p.creditCents) > 0)!;
    expect([d.account.code, Number(d.debitCents), c.account.code, Number(c.creditCents)]).toEqual(['4.9', 3000, '1.1.1', 3000]);
    expect(await prisma.reconciliationMatch.count({ where: { statementLineId: lines.L3, unmatchedAt: null } })).toBe(2);
    expect((await prisma.bankStatementLine.findUniqueOrThrow({ where: { id: lines.L3 } })).status).toBe('MATCHED');
  });

  it('receivable (L6 = +8000): R1 RECEIVED, leg de banco a débito casa a linha positiva', async () => {
    const i6 = await itemByLine(lines.L6);
    const res = await confirm(i6.id);
    expect(res.status).toBe(200);
    expect((await prisma.receivable.findUniqueOrThrow({ where: { id: receivableId } })).status).toBe('RECEIVED');
    expect((await prisma.bankStatementLine.findUniqueOrThrow({ where: { id: lines.L6 } })).status).toBe('MATCHED');
  });

  it('reject (item 5): PENDING → REJECTED com motivo, linha continua UNMATCHED; reject de novo → 400', async () => {
    const p5 = await criarPayable('NF-5', 4000, '2026-06-19');
    const l7 = await criarLinha(7, -4000, 'NF-5');
    // O scan também pode promover L4 (antes ambiguous) agora que P4 quitou — por isso a assertiva é no item de L7, não em `created`.
    expect((await scan()).status).toBe(200);
    const item = await itemByLine(l7);
    expect(item.titleId).toBe(p5);
    const res = await request(app).post(`/api/bank-settlements/${item.id}/reject`).set(authHeader(dono)).send({ unitId: UNIT, reason: 'não é este título' });
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('REJECTED');
    expect((await prisma.bankStatementLine.findUniqueOrThrow({ where: { id: l7 } })).status).toBe('UNMATCHED');
    expect((await request(app).post(`/api/bank-settlements/${item.id}/reject`).set(authHeader(dono)).send({ unitId: UNIT, reason: 'x' })).status).toBe(400);
    // REJECTED para o MESMO título não renasce no scan seguinte (item 2)
    expect((await scan()).body.data.created).toBe(0);
    expect(await prisma.payablePayment.count({ where: { payableId: p5 } })).toBe(0);
  });

  it('retry (item 9): falha injetada na etapa (iii) → FAILED com settlementId preservado; retry fecha sem 2º pagamento', async () => {
    const p6 = await criarPayable('NF-6', 6000, '2026-06-19');
    const l8 = await criarLinha(8, -6000, 'NF-6');
    expect((await scan()).body.data.created).toBe(1);
    const item = await itemByLine(l8);
    const spy = jest.spyOn(ReconciliationService.prototype, 'manualMatch').mockRejectedValueOnce(new ValidationError('boom simulado no match'));
    try {
      const res = await confirm(item.id);
      expect(res.status).toBe(400);
    } finally {
      spy.mockRestore();
    }
    const failed = await itemByLine(l8);
    expect(failed.status).toBe('FAILED');
    expect(failed.failedStep).toBe('MATCH');
    expect(failed.settlementId).toBeTruthy();
    expect(failed.reason).toMatch(/boom simulado/);
    expect((await prisma.bankStatementLine.findUniqueOrThrow({ where: { id: l8 } })).status).toBe('UNMATCHED');
    expect(await prisma.auditEvent.count({ where: { unitId: UNIT, eventType: 'bank_settlement.failed', targetId: item.id } })).toBe(1);

    // retry de PENDING/CONFIRMED → 400; de FAILED → retoma só (iii)-(iv)
    const i1 = await itemByLine(lines.L1);
    expect((await request(app).post(`/api/bank-settlements/${i1.id}/retry`).set(authHeader(dono)).send({ unitId: UNIT, method: 'Pix' })).status).toBe(400);
    const retry = await request(app).post(`/api/bank-settlements/${item.id}/retry`).set(authHeader(dono)).send({ unitId: UNIT, method: 'Pix' });
    expect(retry.status).toBe(200);
    expect(retry.body.data.status).toBe('CONFIRMED');
    expect(retry.body.data.settlementId).toBe(failed.settlementId);
    expect(await prisma.payablePayment.count({ where: { payableId: p6, status: 'ACTIVE' } })).toBe(1);
    expect((await prisma.bankStatementLine.findUniqueOrThrow({ where: { id: l8 } })).status).toBe('MATCHED');
  });

  it('stale (item 10): título cancelado após o scan → confirm 400 title_not_open; scan seguinte marca STALE', async () => {
    const p7 = await criarPayable('NF-7', 3000, '2026-06-19');
    const l9 = await criarLinha(9, -3000, 'NF-7');
    expect((await scan()).body.data.created).toBe(1);
    const item = await itemByLine(l9);
    const cancel = await request(app).post(`/api/payables/${p7}/cancel`).set(authHeader(dono)).send({ unitId: UNIT, reversalDate: '2026-06-18', reason: 'duplicado' });
    expect(cancel.status).toBe(200);
    const res = await confirm(item.id);
    expect(res.status).toBe(400);
    expect(JSON.stringify(res.body)).toMatch(/title_not_open/);
    expect((await itemByLine(l9)).status).toBe('PENDING');
    const rescan = await scan();
    expect(rescan.body.data.stale).toBe(1);
    expect((await itemByLine(l9)).status).toBe('STALE');
  });

  it('concorrência (item 15): 2 confirm simultâneos no mesmo item → exatamente 1 efeito', async () => {
    const p8 = await criarPayable('NF-8', 2000, '2026-06-19');
    const l10 = await criarLinha(10, -2000, 'NF-8');
    expect((await scan()).body.data.created).toBe(1);
    const item = await itemByLine(l10);
    const [a, b] = await Promise.all([confirm(item.id), confirm(item.id)]);
    expect([a.status, b.status].sort()).toEqual([200, 400]);
    expect(await prisma.payablePayment.count({ where: { payableId: p8, status: 'ACTIVE' } })).toBe(1);
    expect(await prisma.reconciliationMatch.count({ where: { statementLineId: l10, unmatchedAt: null } })).toBe(1);
  });

  // ── Achados do review independente do PR #326 (par vermelho→verde no mesmo PR) ────────────────────

  it('review F2 (blocker): saldo do título SUBIU entre scan e confirm (cancel de parcial) → 400 title_balance_changed, sem efeito — principal nunca vira encargo', async () => {
    const p9 = await criarPayable('NF-9', 9000, '2026-06-19');
    const parcial = await request(app).post(`/api/payables/${p9}/settlements`).set(authHeader(dono)).send({ unitId: UNIT, method: 'Pix', paidAt: '2026-06-17', amountCents: 1000 });
    expect(parcial.status).toBe(201);
    const l11 = await criarLinha(11, -9000, 'NF-9'); // open 8000 → proposto 8000 + encargo 1000
    expect((await scan()).status).toBe(200);
    const item = await itemByLine(l11);
    expect([Number(item.proposedCents), Number(item.chargeCents)]).toEqual([8000, 1000]);
    const cancel = await request(app).post(`/api/payables/${p9}/settlements/${parcial.body.data.id}/cancel`).set(authHeader(dono)).send({ unitId: UNIT, reversalDate: '2026-06-18', reason: 'erro' });
    expect(cancel.status).toBe(200); // open volta a 9000: a linha de 9000 agora é baixa EXATA, não 8000+1000
    const res = await confirm(item.id);
    expect(res.status).toBe(400);
    expect(JSON.stringify(res.body)).toMatch(/title_balance_changed/);
    expect((await itemByLine(l11)).status).toBe('PENDING');
    expect(await prisma.journalEntry.count({ where: { sourceType: 'bank.charge', sourceId: item.id } })).toBe(0);
    // o scan seguinte re-avalia e o confirm passa como baixa exata (encargo 0)
    expect((await scan()).body.data.stale).toBeGreaterThanOrEqual(1);
    expect((await scan()).status).toBe(200);
    const renasce = await itemByLine(l11);
    expect([renasce.status, Number(renasce.proposedCents), Number(renasce.chargeCents)]).toEqual(['PENDING', 9000, 0]);
  });

  it('review F4 (should-fix): STALE que renasce PENDING grava os valores RE-AVALIADOS, não os velhos', async () => {
    const p10 = await criarPayable('NF-10', 5000, '2026-06-19');
    const l12 = await criarLinha(12, -5000, 'NF-10');
    expect((await scan()).status).toBe(200);
    const antes = await itemByLine(l12);
    expect([Number(antes.proposedCents), Number(antes.chargeCents)]).toEqual([5000, 0]);
    // parcial de 2000 → open 3000: a mesma linha de 5000 vira 3000 + encargo 2000 (≤ 20%? não: 2000 > 600 → none)
    // então usamos parcial de 500 → open 4500: 4500 + 500 de encargo (500 ≤ 900 cap) — item precisa mudar de valores
    const parcial = await request(app).post(`/api/payables/${p10}/settlements`).set(authHeader(dono)).send({ unitId: UNIT, method: 'Pix', paidAt: '2026-06-17', amountCents: 500 });
    expect(parcial.status).toBe(201);
    const r1 = await scan(); // o MESMO scan marca STALE (title_balance) e renasce o (linha, título) com 4500 + 500
    expect(r1.body.data.stale).toBeGreaterThanOrEqual(1);
    const depois = await itemByLine(l12);
    expect([depois.status, Number(depois.proposedCents), Number(depois.chargeCents)]).toEqual(['PENDING', 4500, 500]);
  });

  it('review F3 (should-fix): linha em período FECHADO/inexistente sem encargo → 400 period_not_open no pré-cheque, item volta a PENDING, zero pagamento', async () => {
    const p11 = await criarPayable('NF-11', 1500, '2026-07-10');
    const l13 = await criarLinha(13, -1500, 'NF-11', '2026-07-08'); // julho: sem período aberto no fixture
    expect((await scan()).status).toBe(200);
    const item = await itemByLine(l13);
    const res = await confirm(item.id);
    expect(res.status).toBe(400);
    expect(JSON.stringify(res.body)).toMatch(/period_not_open/);
    expect((await itemByLine(l13)).status).toBe('PENDING');
    expect(await prisma.payablePayment.count({ where: { payableId: p11 } })).toBe(0);
  });

  it('review F5 (should-fix): item preso em CONFIRMING (crash) — retry o retoma depois da janela de staleness', async () => {
    const p12 = await criarPayable('NF-12', 1200, '2026-06-19');
    const l14 = await criarLinha(14, -1200, 'NF-12');
    expect((await scan()).status).toBe(200);
    const item = await itemByLine(l14);
    // simula crash entre o CAS e o precheck: CONFIRMING antigo, sem ids
    await prisma.bankSettlementItem.update({ where: { id: item.id }, data: { status: 'CONFIRMING', updatedAt: new Date(Date.now() - 20 * 60 * 1000) } });
    expect((await confirm(item.id)).status).toBe(400); // confirm continua exigindo PENDING
    const retry = await request(app).post(`/api/bank-settlements/${item.id}/retry`).set(authHeader(dono)).send({ unitId: UNIT, method: 'Pix' });
    expect(retry.status).toBe(200);
    expect(retry.body.data.status).toBe('CONFIRMED');
    // CONFIRMING RECENTE (outro chamador vivo) não é retomável
    const p13 = await criarPayable('NF-13', 1300, '2026-06-19');
    const l15 = await criarLinha(15, -1300, 'NF-13');
    expect((await scan()).status).toBe(200);
    const vivo = await itemByLine(l15);
    await prisma.bankSettlementItem.update({ where: { id: vivo.id }, data: { status: 'CONFIRMING' } });
    expect((await request(app).post(`/api/bank-settlements/${vivo.id}/retry`).set(authHeader(dono)).send({ unitId: UNIT, method: 'Pix' })).status).toBe(400);
    expect(await prisma.payablePayment.count({ where: { payableId: p13 } })).toBe(0);
  });

  it('review F6 (should-fix): FAILED em SETTLE sem settlementId, mas o título já tem pagamento ACTIVE igual (crash do AP após postEntry) → retry bloqueia com settlement_orphan_suspected, sem 2º pagamento', async () => {
    const p14 = await criarPayable('NF-14', 1400, '2026-06-19');
    const l16 = await criarLinha(16, -1400, 'NF-14');
    expect((await scan()).status).toBe(200);
    const item = await itemByLine(l16);
    // o pagamento "órfão": mesmo (paidAt, amount, method), feito pelo AP antes do crash que impediu gravar o id
    const orfao = await request(app).post(`/api/payables/${p14}/settlements`).set(authHeader(dono)).send({ unitId: UNIT, method: 'Pix', paidAt: '2026-06-18', amountCents: 1400 });
    expect(orfao.status).toBe(201);
    await prisma.bankSettlementItem.update({ where: { id: item.id }, data: { status: 'FAILED', failedStep: 'SETTLE', reason: 'crash simulado', settlementId: null } });
    const retry = await request(app).post(`/api/bank-settlements/${item.id}/retry`).set(authHeader(dono)).send({ unitId: UNIT, method: 'Pix' });
    expect(retry.status).toBe(400);
    expect(JSON.stringify(retry.body)).toMatch(/settlement_orphan_suspected/);
    expect(await prisma.payablePayment.count({ where: { payableId: p14, status: 'ACTIVE' } })).toBe(1);
    expect((await itemByLine(l16)).status).toBe('FAILED');
  });

  it('review-delta ADV-9 (should-fix): 2 linhas IGUAIS (valor, data, método) para o MESMO título — a 2ª confirma; pagamento já vinculado a outro item não é "órfão"', async () => {
    const p15 = await criarPayable('NF-15', 6000, '2026-06-19');
    const la = await criarLinha(17, -3000, 'NF-15');
    const lb = await criarLinha(18, -3000, 'NF-15');
    expect((await scan()).status).toBe(200);
    const ia = await itemByLine(la);
    const ib = await itemByLine(lb);
    expect((await confirm(ia.id)).status).toBe(200);
    const res = await confirm(ib.id);
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('CONFIRMED');
    expect((await prisma.payable.findUniqueOrThrow({ where: { id: p15 } })).status).toBe('PAID');
    expect(await prisma.payablePayment.count({ where: { payableId: p15, status: 'ACTIVE' } })).toBe(2);
  });

  it('review-delta nit: precheck que falha no retry grava a causa real em reason, não o texto do claim', async () => {
    const p16 = await criarPayable('NF-16', 700, '2026-06-19');
    const l19 = await criarLinha(19, -700, 'NF-16');
    expect((await scan()).status).toBe(200);
    const item = await itemByLine(l19);
    await prisma.bankSettlementItem.update({ where: { id: item.id }, data: { status: 'CONFIRMING', updatedAt: new Date(Date.now() - 20 * 60 * 1000) } });
    const res = await request(app).post(`/api/bank-settlements/${item.id}/retry`).set(authHeader(dono)).send({ unitId: UNIT, method: 'Cash' }); // conta errada → precheck falha
    expect(res.status).toBe(400);
    const after = await itemByLine(l19);
    expect(after.status).toBe('FAILED');
    expect(after.reason).toMatch(/method_account_mismatch/);
  });
});

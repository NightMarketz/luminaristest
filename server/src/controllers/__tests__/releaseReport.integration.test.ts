/**
 * BE-INCR-PAYMENT-PROVIDER (nó F5) PR-3 — relatório de liberações → extrato da PaymentAccount → F7, ponta a ponta.
 * Nenhuma chamada real ao Mercado Pago: o upload é o CSV de fixture e o job usa um adaptador FAKE em memória.
 * Itens: P3-1..P3-12; decisões G1..G8 do dono (D-2026-10-10-F5-PR3-FORKS).
 * Fixture escrito a partir da descrição das colunas (M11) — o BRIEF §9 item 4 manda trocá-lo pelo CSV real da sonda.
 */
import { randomBytes } from 'node:crypto';
import request from 'supertest';
import prisma from '@/lib/prisma';
import { getFactory } from '@/lib/factory';
import { makeApp, pushTestSchema, authHeader } from '@test/helpers';
import { ReleaseReportService } from '@/features/accounting/services/ReleaseReportService';
import { PaymentAccountRepository } from '@/features/accounting/repositories/PaymentAccountRepository';
import { ReconciliationRepository } from '@/features/accounting/repositories/ReconciliationRepository';
import { AccountingPolicy } from '@/features/accounting/policies/AccountingPolicy';
import { CollectionProviderError, type CollectionProviderPort } from '@/features/accounting/collection/CollectionProviderPort';
import { resolveAccountingScope } from '@/features/accounting/scope/AccountingScope';

const app = makeApp();
const UNIT = 'unit-f5-pr3';
const TOKEN = 'APP_USR-FIXTURE-TOKEN-PR3-0000000000-abcd';
const SECRET = 'webhook-secret-FIXTURE-PR3-0001';
const HEADER =
  'DATE,SOURCE_ID,EXTERNAL_REFERENCE,RECORD_TYPE,DESCRIPTION,NET_CREDIT_AMOUNT,NET_DEBIT_AMOUNT,GROSS_AMOUNT,MP_FEE_AMOUNT,FINANCING_FEE_AMOUNT,SHIPPING_FEE_AMOUNT,TAXES_AMOUNT,COUPON_AMOUNT,BALANCE_AMOUNT,PAYMENT_METHOD';
const csv = (...rows: string[]) => Buffer.from([HEADER, ...rows].join('\n'));
const release = (date: string, sourceId: string, ref: string, desc: string, net: string, gross: string, fee: string) =>
  `${date},${sourceId},${ref},release,${desc},${net.startsWith('-') ? '0.00' : net},${net.startsWith('-') ? net.slice(1) : '0.00'},${gross},${fee},0.00,0.00,0.00,0.00,0.00,pix`;

let dono: { id: string; username: string };
let glMp: string;
let glBanco: string;
let feeAccountId: string;
let revenueId: string;
let paId: string;
const rec: Record<string, string> = {};
const charge: Record<string, string> = {};

async function novoTitulo(doc: string, amountCents: number): Promise<string> {
  const r = await request(app)
    .post('/api/receivables')
    .set(authHeader(dono))
    .send({ unitId: UNIT, customerName: 'Cliente F5', documentNumber: doc, description: 'x', issueDate: '2026-10-01', dueDate: '2026-10-20', amountCents, revenueAccountId: revenueId });
  expect(r.status).toBe(201);
  return r.body.data.id as string;
}
async function novaCobranca(receivableId: string, status: string, providerPaymentRef: string): Promise<string> {
  const c = await prisma.collectionCharge.create({
    data: {
      userId: dono.id, unitId: UNIT, paymentAccountId: paId, receivableId, kind: 'PIX', amountCents: 10000n,
      expiresAt: new Date('2026-10-05T00:00:00Z'), status, providerRef: `ORD-${providerPaymentRef}`, providerPaymentRef, payerSnapshotJson: '{}',
    },
  });
  return c.id;
}
const upload = (buf: Buffer, fields: Record<string, string> = {}, gl = glMp) => {
  let req = request(app).post('/api/accounting/reconciliation/statements').set(authHeader(dono));
  const all = { unitId: UNIT, glAccountId: gl, periodStart: '2026-10-01', periodEnd: '2026-10-31', format: 'mp_release', ...fields };
  for (const [k, v] of Object.entries(all)) req = req.field(k, v);
  return req.attach('file', buf, { filename: 'release.csv', contentType: 'text/csv' });
};
const scan = (statementId: string) => request(app).post('/api/bank-settlements/scan').set(authHeader(dono)).send({ unitId: UNIT, statementId });
const confirm = (id: string, method: string) => request(app).post(`/api/bank-settlements/${id}/confirm`).set(authHeader(dono)).send({ unitId: UNIT, method });
const eventos = (eventType: string) => prisma.auditEvent.findMany({ where: { eventType }, orderBy: { seq: 'asc' } });

describe('F5 PR-3 — relatório de liberações → extrato da PaymentAccount → F7', () => {
  let statementId: string;
  const lineByRef: Record<string, string> = {};

  beforeAll(async () => {
    pushTestSchema();
    process.env.PAYMENT_CREDENTIAL_KEYS = `1:${randomBytes(32).toString('base64')}`;
    process.env.PAYMENT_CREDENTIAL_KEY_ACTIVE = '1';
    dono = await prisma.user.create({ data: { name: 'f5c', username: 'f5-pr3', email: 'f5pr3@test.local', password: 'x', role: 'USER' } });
    await prisma.accountingPeriod.create({ data: { userId: dono.id, unitId: UNIT, year: 2026, month: 10, status: 'OPEN', openedAt: new Date(), openedById: dono.id } });
    const conta = (code: string, nature: string) =>
      prisma.account.create({ data: { userId: dono.id, unitId: UNIT, code, name: `Conta ${code}`, nature, acceptsEntries: true } });
    glMp = (await conta('1.1.9', 'Asset')).id;
    glBanco = (await conta('1.1.1', 'Asset')).id;
    await conta('1.1.5', 'Asset');
    revenueId = (await conta('3.1', 'Revenue')).id;
    feeAccountId = (await conta('4.8', 'Expense')).id;
    const cfg = { provider: 'MERCADO_PAGO', label: 'MP', config: { provider: 'MERCADO_PAGO', credentialSource: 'OWN' } };
    paId = (await request(app).post('/api/payment-accounts').set(authHeader(dono)).send({ unitId: UNIT, glAccountId: glMp, ...cfg })).body.data.id;
    const put = await request(app).put(`/api/payment-accounts/${paId}/credential`).set(authHeader(dono)).send({ unitId: UNIT, accessToken: TOKEN, webhookSecret: SECRET });
    expect(put.status).toBe(200);

    rec.A = await novoTitulo('FAT-A', 10000); // casa por EXTERNAL_REFERENCE, tarifa 3,00
    rec.B = await novoTitulo('FAT-B', 10000); // casa por SOURCE_ID, cobrança EXPIRED (G7)
    rec.C = await novoTitulo('FAT-C', 10000); // linha com dedução que não bate (G3)
    charge.A = await novaCobranca(rec.A, 'PAID', 'PAY01AAA');
    charge.B = await novaCobranca(rec.B, 'EXPIRED', 'PAY01BBB');
    charge.C = await novaCobranca(rec.C, 'PAID', 'PAY01CCC');
  }, 120000);

  afterAll(async () => {
    await prisma.$disconnect();
  });

  const arquivo = csv(
    '2026-10-01T00:00:00-03:00,,,initial_available_balance,,0.00,0.00,,,,,,,0.00,',
    release('2026-10-01T23:30:00-04:00', 'PAY01AAA', 'CHARGE_A', 'payment', '97.00', '100.00', '-3.00'),
    release('2026-10-02T10:00:00-03:00', 'PAY01BBB', '', 'payment', '100.00', '100.00', '0.00'),
    release('2026-10-02T11:00:00-03:00', 'PAY01CCC', 'CHARGE_C', 'payment', '97.00', '100.00', '-2.00'),
    release('2026-10-02T12:00:00-03:00', 'PAY01ZZZ', 'sem-cobranca', 'payment', '50.00', '50.00', '0.00'),
    release('2026-10-02T13:00:00-03:00', 'PAY01AAA', 'CHARGE_A', 'refund', '-10.00', '-10.00', '0.00'),
    ',,,total,,,,,,,,,,,',
    '2026-10-02T23:59:59-03:00,,,available_balance,,337.00,0.00,,,,,,,337.00,',
  );
  const arquivoFinal = () => Buffer.from(arquivo.toString('utf8').replace('CHARGE_A', charge.A).replace('CHARGE_A', charge.A).replace('CHARGE_C', charge.C));

  it('G6: mp_release numa folha sem conta MP ⇒ 409 release_report_no_payment_account', async () => {
    const res = await upload(arquivoFinal(), {}, glBanco);
    expect(res.status).toBe(409);
    expect(JSON.stringify(res.body)).toContain('release_report_no_payment_account');
  });

  it('G2: saldo informado no DTO com mp_release ⇒ 400 (os saldos vêm só do arquivo)', async () => {
    const res = await upload(arquivoFinal(), { openingBalanceCents: '0' });
    expect(res.status).toBe(400);
    expect(JSON.stringify(res.body)).toContain('release_report_balance_from_file');
  });

  it('P3-3 pela borda: coluna ausente ⇒ 400 release_report_missing_columns, nada importado', async () => {
    const res = await upload(Buffer.from('DATE,SOURCE_ID\n2026-10-01T10:00:00-03:00,PAY01'));
    expect(res.status).toBe(400);
    expect(JSON.stringify(res.body)).toContain('release_report_missing_columns');
    expect(await prisma.bankStatement.count({ where: { unitId: UNIT } })).toBe(0);
  });

  it('P3-1/P3-2/G1/G8: import cria o extrato da PaymentAccount, saldos do arquivo, dia de Brasília e audit com a faixa', async () => {
    const res = await upload(arquivoFinal());
    expect(res.status).toBe(201);
    statementId = res.body.data.statement.id;
    const st = await prisma.bankStatement.findUniqueOrThrow({ where: { id: statementId } });
    expect(st.paymentAccountId).toBe(paId);
    expect(st.openingBalanceCents).toBe(0n);
    expect(st.closingBalanceCents).toBe(33700n);
    const lines = await prisma.bankStatementLine.findMany({ where: { statementId }, orderBy: { lineNumber: 'asc' } });
    expect(lines).toHaveLength(5);
    expect(lines[0].date.toISOString().slice(0, 10)).toBe('2026-10-02'); // 23:30-04:00 ⇒ 02/10 em Brasília
    expect(lines[0].amountCents).toBe(9700n);
    expect(JSON.parse(lines[0].rawJson).GROSS_AMOUNT).toBe('100.00');
    for (const l of lines) lineByRef[`${JSON.parse(l.rawJson).SOURCE_ID}:${l.description}`] = l.id;
    const ev = await eventos('payment_account.release_report_imported');
    expect(ev).toHaveLength(1);
    expect(ev[0].targetId).toBe(paId);
    expect(JSON.parse(ev[0].payload)).toEqual({
      statementId,
      lineCount: '5',
      fromUtc: '2026-10-01T03:00:00.000Z',
      toUtc: '2026-10-03T02:59:59.000Z',
    });
  });

  it('P3-4: arquivo com SOURCE_ID + DESCRIPTION já importado para a conta ⇒ 400 release_report_overlap, nada importado', async () => {
    const outro = csv(
      release('2026-10-03T10:00:00-03:00', 'PAY01NEW', 'x', 'payment', '5.00', '5.00', '0.00'),
      release('2026-10-03T10:00:00-03:00', 'PAY01AAA', charge.A, 'payment', '97.00', '100.00', '-3.00'),
    );
    const before = await prisma.bankStatementLine.count();
    const res = await upload(outro);
    expect(res.status).toBe(400);
    expect(JSON.stringify(res.body)).toContain('release_report_overlap');
    expect(JSON.stringify(res.body)).toContain('PAY01AAA');
    expect(JSON.stringify(res.body)).not.toContain('PAY01NEW');
    expect(await prisma.bankStatementLine.count()).toBe(before);
  });

  it('P3-6/P3-7/G3/G7: scan só pelo passo novo — bruto, tarifa, aviso terminal; G3 que não bate = ambiguous', async () => {
    const res = await scan(statementId);
    expect(res.status).toBe(200);
    // A (ref) + B (SOURCE_ID) = 2; C = ambiguous (G3); sem cobrança e refund = none (o genérico NÃO roda: F-PPB-5 a).
    expect(res.body.data).toEqual({ created: 2, skippedExisting: 0, ambiguous: 1, none: 2, stale: 0 });
    const a = await prisma.bankSettlementItem.findFirstOrThrow({ where: { statementLineId: lineByRef['PAY01AAA:payment'] } });
    expect([a.titleId, a.proposedCents, a.chargeCents, a.feeCents, a.reason]).toEqual([rec.A, 10000n, 0n, 300n, null]);
    const b = await prisma.bankSettlementItem.findFirstOrThrow({ where: { statementLineId: lineByRef['PAY01BBB:payment'] } });
    expect([b.titleId, b.proposedCents, b.feeCents]).toEqual([rec.B, 10000n, 0n]);
    expect(b.reason).toBe('Cobrança em estado terminal no Luminaris (EXPIRED).');
    expect(await prisma.bankSettlementItem.count({ where: { statementLine: { statementId } } })).toBe(2);
  });

  it('P3-9: método de banco no extrato da conta MP ⇒ 400 method_account_mismatch; P3-8 sem conta de tarifa ⇒ 400 sem efeito', async () => {
    const a = await prisma.bankSettlementItem.findFirstOrThrow({ where: { statementLineId: lineByRef['PAY01AAA:payment'] } });
    const pix = await confirm(a.id, 'Pix');
    expect(pix.status).toBe(400);
    expect(JSON.stringify(pix.body)).toContain('method_account_mismatch');
    const journal = await prisma.journalEntry.count();
    const semConta = await confirm(a.id, 'ProviderBalance');
    expect(semConta.status).toBe(400);
    expect(JSON.stringify(semConta.body)).toContain('fee_account_not_configured');
    expect(await prisma.journalEntry.count()).toBe(journal);
    expect((await prisma.bankSettlementItem.findUniqueOrThrow({ where: { id: a.id } })).status).toBe('PENDING');
  });

  it('P3-11: settings aceita providerFeeExpenseAccountId (Expense) e recusa natureza errada', async () => {
    const errado = await request(app).put('/api/accounting/settings').set(authHeader(dono)).send({ unitId: UNIT, providerFeeExpenseAccountId: glMp });
    expect(errado.status).toBe(400);
    const ok = await request(app).put('/api/accounting/settings').set(authHeader(dono)).send({ unitId: UNIT, providerFeeExpenseAccountId: feeAccountId });
    expect(ok.status).toBe(200);
    expect(ok.body.data.providerFeeExpenseAccountId).toBe(feeAccountId);
  });

  it('P3-7/P3-8/P3-9/P3-10/P3-12: confirm ProviderBalance — recibo de 100 na conta MP, tarifa de 3, linha de 97 MATCHED', async () => {
    const a = await prisma.bankSettlementItem.findFirstOrThrow({ where: { statementLineId: lineByRef['PAY01AAA:payment'] } });
    const res = await confirm(a.id, 'ProviderBalance');
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('CONFIRMED');
    const item = await prisma.bankSettlementItem.findUniqueOrThrow({ where: { id: a.id } });
    expect(item.feeEntryId).toBeTruthy();
    const receipt = await prisma.receivableReceipt.findUniqueOrThrow({ where: { id: item.settlementId! } });
    expect([receipt.method, receipt.debitAccountId, receipt.amountCents]).toEqual(['ProviderBalance', glMp, 10000n]);
    const receiptLegs = await prisma.posting.findMany({ where: { entryId: receipt.entryId! } });
    expect(receiptLegs.find((p) => p.accountId === glMp)?.debitCents).toBe(10000n);
    const fee = await prisma.journalEntry.findUniqueOrThrow({ where: { id: item.feeEntryId! }, include: { postings: true } });
    expect([fee.sourceType, fee.sourceId]).toEqual(['provider.fee', a.id]);
    expect(fee.postings.find((p) => p.accountId === feeAccountId)?.debitCents).toBe(300n);
    expect(fee.postings.find((p) => p.accountId === glMp)?.creditCents).toBe(300n);
    expect((await prisma.bankStatementLine.findUniqueOrThrow({ where: { id: a.statementLineId } })).status).toBe('MATCHED');
    expect((await prisma.receivable.findUniqueOrThrow({ where: { id: rec.A } })).status).toBe('RECEIVED');
    const ev = (await eventos('bank_settlement.confirmed')).find((e) => e.targetId === a.id)!;
    expect(JSON.parse(ev.payload)).toMatchObject({ feeCents: '300', feeEntryId: item.feeEntryId });
  });

  it('G7: cobrança terminal vira proposta, mas nada acontece sem o confirm humano', async () => {
    const b = await prisma.bankSettlementItem.findFirstOrThrow({ where: { statementLineId: lineByRef['PAY01BBB:payment'] } });
    expect(b.status).toBe('PENDING');
    expect(await prisma.receivableReceipt.count({ where: { receivableId: rec.B } })).toBe(0);
  });

  it('P3-9: ProviderBalance fora do F7 (recibo avulso) ⇒ 400 provider_balance_requires_payment_account', async () => {
    const res = await request(app)
      .post(`/api/receivables/${rec.C}/receive`)
      .set(authHeader(dono))
      .send({ unitId: UNIT, method: 'ProviderBalance', receivedAt: '2026-10-02', amountCents: 1000 });
    expect(res.status).toBe(400);
    expect(JSON.stringify(res.body)).toContain('provider_balance_requires_payment_account');
  });

  it('P3-9 (F-PPB-3 a): o re-post do reconcile do AR lança o recibo ProviderBalance na conta gravada, não no mapa', async () => {
    const id = await novoTitulo('FAT-R', 5000);
    const receipt = await prisma.receivableReceipt.create({
      data: { userId: dono.id, unitId: UNIT, receivableId: id, amountCents: 5000n, method: 'ProviderBalance', receivedAt: new Date('2026-10-02T00:00:00Z'), status: 'ACTIVE', debitAccountId: glMp },
    });
    await prisma.receivable.update({ where: { id }, data: { status: 'RECEIVING', receivedCents: 5000n } });
    await getFactory().getReceivableService().reconcileReceivables(resolveAccountingScope({ userId: dono.id }, UNIT));
    const entry = await prisma.journalEntry.findFirstOrThrow({ where: { sourceType: 'ar.receipt', sourceId: receipt.id }, include: { postings: true } });
    expect(entry.postings.find((p) => p.debitCents > 0n)?.accountId).toBe(glMp);
  });

  describe('P3-5 job mpReleaseReportFetch (adaptador fake)', () => {
    const calls: string[] = [];
    const files: Array<{ fileName: string; beginDate: string; endDate: string }> = [];
    let fail401 = false;
    const port = {
      name: 'MERCADO_PAGO',
      capabilities: {} as CollectionProviderPort['capabilities'],
      createCharge: jest.fn(),
      getCharge: jest.fn(),
      cancelCharge: jest.fn(),
      verifyWebhook: jest.fn(),
      requestReleaseReport: async (acc: { credential: { accessToken: string } }, range: { fromUtc: string; toUtc: string }) => {
        expect(acc.credential.accessToken).toBe(TOKEN);
        calls.push(`request ${range.fromUtc} ${range.toUtc}`);
      },
      listReleaseReports: async () => {
        if (fail401) throw new CollectionProviderError('Mercado Pago respondeu 401', 401);
        calls.push('list');
        return files;
      },
      downloadReleaseReport: async (_acc: unknown, name: string) => {
        calls.push(`download ${name}`);
        return csv(release('2026-10-08T10:00:00-03:00', 'PAY01JOB', 'job', 'payment', '20.00', '20.00', '0.00'));
      },
    } as unknown as CollectionProviderPort;
    const marks = new Map<string, Date>();
    const invalid: string[] = [];
    const now = new Date('2026-10-10T15:00:00Z');
    const service = () =>
      new ReleaseReportService(
        new PaymentAccountRepository(),
        new ReconciliationRepository(),
        getFactory().getReconciliationService(),
        getFactory().getAuditService(),
        new AccountingPolicy(),
        () => port,
        { get: async (k) => marks.get(k) ?? null, set: async (k, v) => void marks.set(k, v) },
        async (acc) => void invalid.push(acc.id),
        () => now,
      );

    beforeAll(async () => {
      // G4: a 1ª faixa começa às 00:00 BRT do dia em que a credencial foi gravada.
      await prisma.paymentAccount.update({ where: { id: paId }, data: { credentialSetAt: new Date('2026-10-07T12:00:00Z') } });
    });

    it('G4/G5: sem watermark pede [00:00 BRT do dia da credencial, hoje 00:00 BRT) e NÃO avança a watermark', async () => {
      const s = await service().fetchAll();
      expect(s).toMatchObject({ requested: 1, imported: 0 });
      expect(calls).toContain('request 2026-10-07T03:00:00.000Z 2026-10-10T03:00:00.000Z');
      expect(marks.size).toBe(0);
    });

    it('arquivo listado a partir da watermark ⇒ baixa, importa contra a conta e só ENTÃO avança a watermark', async () => {
      files.push({ fileName: 'release-1.csv', beginDate: '2026-10-07T03:00:00Z', endDate: '2026-10-10T03:00:00Z' });
      const before = await eventos('payment_account.release_report_imported');
      const s = await service().fetchAll();
      expect(s).toMatchObject({ imported: 1, failed: 0 });
      expect(calls).toContain('download release-1.csv');
      expect(marks.get(`mp_release:${paId}`)?.toISOString()).toBe('2026-10-10T03:00:00.000Z');
      const st = await prisma.bankStatement.findFirstOrThrow({ where: { statementRef: 'release-1.csv' } });
      expect([st.paymentAccountId, st.glAccountId, st.importedById]).toEqual([paId, glMp, dono.id]);
      expect(st.periodStart.toISOString().slice(0, 10)).toBe('2026-10-07');
      expect(st.periodEnd.toISOString().slice(0, 10)).toBe('2026-10-09');
      expect((await eventos('payment_account.release_report_imported')).length).toBe(before.length + 1);
      // Nenhuma baixa: o job só importa (resposta 20).
      expect(await prisma.bankSettlementItem.count({ where: { statementLine: { statementId: st.id } } })).toBe(0);
    });

    it('faixa já coberta (watermark = hoje 00:00 BRT) ⇒ nada a pedir', async () => {
      calls.length = 0;
      const s = await service().fetchAll();
      expect(s).toMatchObject({ skipped: 1, requested: 0, imported: 0 });
      expect(calls).toEqual([]);
    });

    it('G5: conta sem ator (credencial sem credentialSetById) é pulada', async () => {
      marks.clear();
      await prisma.paymentAccount.update({ where: { id: paId }, data: { credentialSetById: null } });
      calls.length = 0;
      const s = await service().fetchAll();
      expect(s).toMatchObject({ skipped: 1 });
      expect(calls).toEqual([]);
      await prisma.paymentAccount.update({ where: { id: paId }, data: { credentialSetById: dono.id } });
    });

    it('P2-4 no job: 401 do MP ⇒ conta marcada CREDENTIAL_INVALID, watermark parada', async () => {
      fail401 = true;
      const s = await service().fetchAll();
      expect(s).toMatchObject({ failed: 1 });
      expect(invalid).toEqual([paId]);
      expect(marks.size).toBe(0);
    });
  });
});

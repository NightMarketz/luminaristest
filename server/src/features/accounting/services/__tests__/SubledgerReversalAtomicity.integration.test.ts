/**
 * ONDA 2.1 (auditoria 24/11/2026) — atomicidade do ESTORNO de recebimento/pagamento/título.
 *
 * `cancelReceipt`/`cancelPayment`/`cancelReceivable` fazem 2 commits: `PostingService.reverseEntry` (tx raiz própria,
 * commit 1 — razão) e depois a tx do subrazão (commit 2). Se o processo morre/falha ENTRE os dois, o razão fica
 * estornado e o recibo/pagamento continua ACTIVE (o título continua RECEIVED/PAID). A rede de segurança é o reconcile
 * (server/CLAUDE.md gate 6), que até aqui só re-dirigia a direção POSTAGEM e podia até "finalizar" um recibo cujo
 * lançamento já está Reversed.
 *
 * SEM MOCK (memória `repositorios-de-contabilidade-nao-sao-exercitados`): serviços reais da factory, repositórios reais,
 * SQLite real. A falha é injetada sem `jest.fn`: o `reverseEntry` REAL roda sozinho (= commit 1 completo) e o
 * serviço de subrazão nunca é chamado — exatamente o estado que um crash entre os dois commits deixa em disco.
 */
import prisma from '@/lib/prisma';
import { pushTestSchema, seedUnit } from '@test/helpers';
import { getFactory } from '@/lib/factory';
import { resolveAccountingScopeInternal } from '@/features/accounting/scope/resolveAccountingScopeInternal';
import type { AccountingScope } from '@/features/accounting/scope/AccountingScope';

const UNIT = 'unit-subledger-reversal-atomicity';
const DONO = 'u-subledger-reversal-atomicity';
const scope = (): AccountingScope => resolveAccountingScopeInternal({ userId: DONO }, UNIT);

// 6 = caminho feliz; 7/8 = AR, período que FECHA depois do commit 1 (retry / reconcile); 11 = idem no AP; 9 = invariante quebrado; 10 = RECEIVING/PAYING preso.
const mes = (m: number) => `2026-${String(m).padStart(2, '0')}-15`;
const fecha = (month: number) =>
  prisma.accountingPeriod.updateMany({ where: { userId: DONO, unitId: UNIT, year: 2026, month }, data: { status: 'HARD_CLOSED', closedAt: new Date() } });

const posting = () => getFactory().getPostingService();
const ar = () => getFactory().getReceivableService();
const ap = () => getFactory().getPayableService();

let revenueId: string;
let expenseId: string;
let seq = 0;

/** Título a receber + 1 recebimento total no mês `m`. Devolve ids e o lançamento do recebimento. */
async function recebido(m: number) {
  seq += 1;
  const rec = await ar().createReceivable(scope(), {
    unitId: UNIT, customerName: `Cliente ${seq}`, documentNumber: `FAT-${seq}`, description: 'serviço',
    issueDate: mes(m), dueDate: '2026-12-15', amountCents: 50000, revenueAccountId: revenueId,
  });
  const receipt = await ar().registerReceipt(scope(), rec.id, { unitId: UNIT, method: 'Pix', receivedAt: mes(m), amountCents: 50000 });
  const settlement = await posting().findEntryBySource(scope(), 'ar.receipt', receipt.id);
  expect(settlement?.status).toBe('Posted');
  return { receivableId: rec.id, receiptId: receipt.id, settlementId: settlement!.id };
}

async function pago(m: number) {
  seq += 1;
  const pay = await ap().createPayable(scope(), {
    unitId: UNIT, supplierName: `Fornecedor ${seq}`, documentNumber: `NF-${seq}`, description: 'serviço',
    issueDate: mes(m), dueDate: '2026-12-15', amountCents: 50000, expenseAccountId: expenseId,
  });
  const payment = await ap().registerPayment(scope(), pay.id, { unitId: UNIT, method: 'Pix', paidAt: mes(m), amountCents: 50000 });
  const settlement = await posting().findEntryBySource(scope(), 'ap.payment', payment.id);
  expect(settlement?.status).toBe('Posted');
  return { payableId: pay.id, paymentId: payment.id, settlementId: settlement!.id };
}

/** COMMIT 1 sozinho: o `reverseEntry` real, sem o serviço de subrazão. */
const soCommit1 = (lancamentoId: string, m: number) =>
  posting().reverseEntry(scope(), { unitId: UNIT, lancamentoId, reversalPostingDate: mes(m), reason: 'crash entre os dois commits', automaticWriter: true });

describe('Onda 2.1 — estorno atômico até o subrazão (2 commits + reconcile)', () => {
  beforeAll(async () => {
    pushTestSchema();
    await prisma.user.create({ data: { id: DONO, name: DONO, username: DONO, email: `${DONO}@test.local`, password: 'x', role: 'USER' } });
    await seedUnit({ userId: DONO, id: UNIT });
    for (const m of [6, 7, 8, 9, 10, 11]) {
      await prisma.accountingPeriod.create({ data: { userId: DONO, unitId: UNIT, year: 2026, month: m, status: 'OPEN', openedAt: new Date(), openedById: DONO } });
    }
    const conta = (code: string, nature: string) =>
      prisma.account.create({ data: { userId: DONO, unitId: UNIT, code, name: `Conta ${code}`, nature, acceptsEntries: true } });
    revenueId = (await conta('3.1', 'Revenue')).id;
    expenseId = (await conta('4.1', 'Expense')).id;
    await conta('1.1.5', 'Asset');
    await conta('1.1.1', 'Asset');
    await conta('2.1.2', 'Liability');
  }, 120000);

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('AR — recebimento', () => {
    it('findBySource devolve o lançamento JÁ Reversed (é o que permite ao reconcile reconhecer a direção reversa)', async () => {
      const t = await recebido(6);
      await soCommit1(t.settlementId, 6);
      const achado = await posting().findEntryBySource(scope(), 'ar.receipt', t.receiptId);
      expect(achado?.id).toBe(t.settlementId);
      expect(achado?.status).toBe('Reversed');
      expect(achado?.reversedById).toBeTruthy();
    });

    it('razão estornado + recibo ACTIVE → reconcileReceivables conclui o estorno (recibo CANCELLED, título reaberto, 1 auditoria, sem 2º estorno)', async () => {
      const t = await recebido(6);
      const r1 = await soCommit1(t.settlementId, 6);
      // Estado deixado pelo crash: razão estornado, subrazão intacto.
      expect((await prisma.receivableReceipt.findUniqueOrThrow({ where: { id: t.receiptId } })).status).toBe('ACTIVE');
      expect((await prisma.receivable.findUniqueOrThrow({ where: { id: t.receivableId } })).status).toBe('RECEIVED');

      const out = await ar().reconcileReceivables(scope());
      expect(out.failed).toBe(0);
      expect(out.blocked).toBe(0);
      expect(out.reversalsCompleted).toBeGreaterThanOrEqual(1);

      const receipt = await prisma.receivableReceipt.findUniqueOrThrow({ where: { id: t.receiptId } });
      expect(receipt.status).toBe('CANCELLED');
      const row = await prisma.receivable.findUniqueOrThrow({ where: { id: t.receivableId } });
      expect(row.status).toBe('OPEN');
      expect(Number(row.receivedCents)).toBe(0);
      // O estorno do razão é o do commit 1 — nenhum segundo lançamento 'reversal' para o mesmo original.
      expect(await prisma.journalEntry.count({ where: { userId: DONO, unitId: UNIT, sourceType: 'reversal', sourceId: t.settlementId } })).toBe(1);
      const eventos = await prisma.auditEvent.findMany({ where: { scopeUserId: DONO, unitId: UNIT, targetId: t.receivableId, eventType: 'receivable.settlement_cancelled' } });
      expect(eventos).toHaveLength(1);
      expect(eventos[0].payload).toContain(r1.reversal.id);
      // Idempotente: 2ª passada não reemite nem decrementa de novo.
      const out2 = await ar().reconcileReceivables(scope());
      expect(out2.reversalsCompleted).toBe(0);
      expect(Number((await prisma.receivable.findUniqueOrThrow({ where: { id: t.receivableId } })).receivedCents)).toBe(0);
      expect(await prisma.auditEvent.count({ where: { scopeUserId: DONO, unitId: UNIT, targetId: t.receivableId, eventType: 'receivable.settlement_cancelled' } })).toBe(1);
    });

    it('o estorno já está no razão e o período dele FECHOU → repetir cancelReceipt conclui (a idempotência do reverseEntry vem ANTES do gate de período)', async () => {
      const t = await recebido(7);
      await soCommit1(t.settlementId, 7);
      await fecha(7);
      const done = await ar().cancelReceipt(scope(), t.receivableId, t.receiptId, { unitId: UNIT, reversalDate: mes(7), reason: 'retry' });
      expect(done.status).toBe('CANCELLED');
      expect((await prisma.receivable.findUniqueOrThrow({ where: { id: t.receivableId } })).status).toBe('OPEN');
    });

    it('o estorno já está no razão e o período FECHOU → o reconcile também conclui (não depende de período aberto)', async () => {
      const t = await recebido(8);
      await soCommit1(t.settlementId, 8);
      await fecha(8);
      const out = await ar().reconcileReceivables(scope());
      expect(out.failed).toBe(0);
      expect(out.blocked).toBe(0);
      expect((await prisma.receivableReceipt.findUniqueOrThrow({ where: { id: t.receiptId } })).status).toBe('CANCELLED');
      expect((await prisma.receivable.findUniqueOrThrow({ where: { id: t.receivableId } })).status).toBe('OPEN');
    });

    it('invariante violado (receivedCents < recibo) com o razão já estornado → BLOCKED, não failed; nada muta; a passada seguinte dá o mesmo veredito', async () => {
      const t = await recebido(9);
      await soCommit1(t.settlementId, 9);
      await prisma.receivable.update({ where: { id: t.receivableId }, data: { receivedCents: 1000 } });
      const auditoriasAntes = await prisma.auditEvent.count({ where: { scopeUserId: DONO, unitId: UNIT, targetId: t.receivableId } });

      const out = await ar().reconcileReceivables(scope());
      expect(out.blocked).toBeGreaterThanOrEqual(1);
      expect(out.failed).toBe(0);
      expect((await prisma.receivableReceipt.findUniqueOrThrow({ where: { id: t.receiptId } })).status).toBe('ACTIVE');
      expect(Number((await prisma.receivable.findUniqueOrThrow({ where: { id: t.receivableId } })).receivedCents)).toBe(1000);
      expect(await prisma.auditEvent.count({ where: { scopeUserId: DONO, unitId: UNIT, targetId: t.receivableId } })).toBe(auditoriasAntes);
      expect((await ar().reconcileReceivables(scope())).blocked).toBeGreaterThanOrEqual(1);
      // CANCELLING PR-0 (F-AR-1 a, 9d3e): o BLOCKED deixou de ser só log — fica na bandeja, com alerta na 1ª captura, e a 2ª passada não duplica a linha.
      const pend = await prisma.reconcilePendingItem.findMany({ where: { userId: DONO, unitId: UNIT, sourceType: 'receipt.cancel', sourceId: t.receiptId } });
      expect(pend).toHaveLength(1);
      expect(pend[0].reasonCode).toBe('RECEIPT_REVERSAL_INVARIANT_VIOLATED');
      expect(pend[0].alertedAt).not.toBeNull();
      expect(pend[0].attempts).toBe(2);
      await prisma.receivable.update({ where: { id: t.receivableId }, data: { receivedCents: 50000 } }); // restaura p/ não contaminar os demais
      await prisma.receivableReceipt.update({ where: { id: t.receiptId }, data: { status: 'CANCELLED' } });
    });

    it('recibo RECEIVING preso cujo lançamento já está Reversed NÃO é finalizado como recebido: o reconcile conclui o estorno e reabre o título', async () => {
      const t = await recebido(10);
      // Simula o crash do registerReceipt entre o post e o finalize: título RECEIVING (recibo em trânsito).
      await prisma.receivable.update({ where: { id: t.receivableId }, data: { status: 'RECEIVING' } });
      await soCommit1(t.settlementId, 10);
      const registradosAntes = await prisma.auditEvent.count({ where: { scopeUserId: DONO, unitId: UNIT, targetId: t.receivableId, eventType: 'receivable.settlement_registered' } });

      const out = await ar().reconcileReceivables(scope());
      expect(out.finalized).toBe(0);
      expect(await prisma.auditEvent.count({ where: { scopeUserId: DONO, unitId: UNIT, targetId: t.receivableId, eventType: 'receivable.settlement_registered' } })).toBe(registradosAntes);
      expect((await prisma.receivableReceipt.findUniqueOrThrow({ where: { id: t.receiptId } })).status).toBe('CANCELLED');
      const row = await prisma.receivable.findUniqueOrThrow({ where: { id: t.receivableId } });
      expect(Number(row.receivedCents)).toBe(0);
      expect(row.status).toBe('OPEN'); // RECEIVING com 0 centavos não tem recibo em trânsito: não fica preso
    });
  });

  describe('AR — cancelamento do título', () => {
    it('reconhecimento estornado + título OPEN → reconcileReceivables conclui o cancelamento (CANCELLED, deletedAt, chave de negócio liberada)', async () => {
      seq += 1;
      const rec = await ar().createReceivable(scope(), {
        unitId: UNIT, customerName: 'Cliente cancel', documentNumber: `FAT-C-${seq}`, description: 'serviço',
        issueDate: mes(6), dueDate: '2026-12-15', amountCents: 20000, revenueAccountId: revenueId,
      });
      const reconhecimento = await posting().findEntryBySource(scope(), 'ar.receivable', rec.id);
      await soCommit1(reconhecimento!.id, 6);
      expect((await prisma.receivable.findUniqueOrThrow({ where: { id: rec.id } })).status).toBe('OPEN');

      const out = await ar().reconcileReceivables(scope());
      expect(out.failed).toBe(0);
      const row = await prisma.receivable.findUniqueOrThrow({ where: { id: rec.id } });
      expect(row.status).toBe('CANCELLED');
      expect(row.deletedAt).not.toBeNull();
      expect(row.documentNumber).not.toBe(`FAT-C-${seq}`);
    });
  });

  describe('AP — pagamento', () => {
    it('razão estornado + pagamento ACTIVE → reconcilePayables conclui o estorno (CANCELLED, título reaberto, 1 auditoria, sem 2º estorno)', async () => {
      const t = await pago(6);
      const r1 = await soCommit1(t.settlementId, 6);
      expect((await prisma.payablePayment.findUniqueOrThrow({ where: { id: t.paymentId } })).status).toBe('ACTIVE');

      const out = await ap().reconcilePayables(scope());
      expect(out.failed).toBe(0);
      expect(out.blocked).toBe(0);
      expect(out.reversalsCompleted).toBeGreaterThanOrEqual(1);

      expect((await prisma.payablePayment.findUniqueOrThrow({ where: { id: t.paymentId } })).status).toBe('CANCELLED');
      const row = await prisma.payable.findUniqueOrThrow({ where: { id: t.payableId } });
      expect(row.status).toBe('OPEN');
      expect(Number(row.paidCents)).toBe(0);
      expect(await prisma.journalEntry.count({ where: { userId: DONO, unitId: UNIT, sourceType: 'reversal', sourceId: t.settlementId } })).toBe(1);
      const eventos = await prisma.auditEvent.findMany({ where: { scopeUserId: DONO, unitId: UNIT, targetId: t.payableId, eventType: 'payable.settlement_cancelled' } });
      expect(eventos).toHaveLength(1);
      expect(eventos[0].payload).toContain(r1.reversal.id);
      expect((await ap().reconcilePayables(scope())).reversalsCompleted).toBe(0);
    });

    it('o estorno já está no razão e o período FECHOU → repetir cancelPayment conclui', async () => {
      const t = await pago(11);
      await soCommit1(t.settlementId, 11);
      await fecha(11);
      const done = await ap().cancelPayment(scope(), t.payableId, t.paymentId, { unitId: UNIT, reversalDate: mes(11), reason: 'retry' });
      expect(done.status).toBe('CANCELLED');
      expect((await prisma.payable.findUniqueOrThrow({ where: { id: t.payableId } })).status).toBe('OPEN');
    });

    it('invariante violado (paidCents < pagamento) com o razão já estornado → BLOCKED, não failed; nada muta', async () => {
      const t = await pago(9);
      await soCommit1(t.settlementId, 9);
      await prisma.payable.update({ where: { id: t.payableId }, data: { paidCents: 1000 } });

      const out = await ap().reconcilePayables(scope());
      expect(out.blocked).toBeGreaterThanOrEqual(1);
      expect(out.failed).toBe(0);
      expect((await prisma.payablePayment.findUniqueOrThrow({ where: { id: t.paymentId } })).status).toBe('ACTIVE');
      expect(Number((await prisma.payable.findUniqueOrThrow({ where: { id: t.payableId } })).paidCents)).toBe(1000);
    });

    it('pagamento PAYING preso cujo lançamento já está Reversed NÃO é finalizado como pago', async () => {
      const t = await pago(10);
      await prisma.payable.update({ where: { id: t.payableId }, data: { status: 'PAYING' } });
      await soCommit1(t.settlementId, 10);
      const out = await ap().reconcilePayables(scope());
      expect(out.finalized).toBe(0);
      expect((await prisma.payablePayment.findUniqueOrThrow({ where: { id: t.paymentId } })).status).toBe('CANCELLED');
      const row = await prisma.payable.findUniqueOrThrow({ where: { id: t.payableId } });
      expect(Number(row.paidCents)).toBe(0);
      expect(row.status).toBe('OPEN');
    });
  });
});

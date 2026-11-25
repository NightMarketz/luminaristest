/**
 * BE-INCR-CANCELAMENTO-CANCELLING PR-0 (69c7 / 9d3e) — o cancelamento do título (AP) em 2 commits com a INTENÇÃO gravada antes.
 *
 * SEM MOCK (memória `repositorios-de-contabilidade-nao-sao-exercitados`): serviços reais da factory, repositórios reais, SQLite real.
 * A falha é injetada sem `jest.fn`: o estado que um crash deixa em disco é montado com as próprias operações reais
 * (`casStartCancelling`, `reverseEntry`, `reverseStockForReceipt`), exatamente como o `SubledgerReversalAtomicity.integration.test.ts` faz.
 *
 * Concorrência (corrida registerPayment × casStartCancelling): o SQLite serializa no Windows, então um teste de corrida local não prova nada;
 * o CAS é provado pela contagem (2ª chamada devolve 0) e a corrida real é do CI Linux.
 */
import prisma from '@/lib/prisma';
import { pushTestSchema, seedUnit } from '@test/helpers';
import { getFactory } from '@/lib/factory';
import { resolveAccountingScopeInternal } from '@/features/accounting/scope/resolveAccountingScopeInternal';
import type { AccountingScope } from '@/features/accounting/scope/AccountingScope';
import { PayableRepository } from '@/features/accounting/repositories/PayableRepository';
import { BankSettlementRepository } from '@/features/accounting/repositories/BankSettlementRepository';
import { ReconcilePendingRepository } from '@/features/accounting/repositories/ReconcilePendingRepository';
import { ReconcilePendingRecorder } from '@/features/accounting/services/reconcilePendingRecorder';
import { retryOneReconcilePendingItem } from '@/jobs/accountingSyncReconcile.job';
import { ESTOQUES_CODE, FORNECEDORES_A_PAGAR_CODE } from '@/features/accounting/fixtures/ChartOfAccountsFixture';
import { INVENTORY_INBOUND_SOURCE_TYPE } from '@/features/accounting/models/Inventory.model';

const UNIT = 'unit-payable-cancelling';
const DONO = 'u-payable-cancelling';
const scope = (): AccountingScope => resolveAccountingScopeInternal({ userId: DONO }, UNIT);
const mes = (m: number) => `2026-${String(m).padStart(2, '0')}-15`;
const fecha = (month: number) =>
  prisma.accountingPeriod.updateMany({ where: { userId: DONO, unitId: UNIT, year: 2026, month }, data: { status: 'HARD_CLOSED', closedAt: new Date() } });

const posting = () => getFactory().getPostingService();
const ap = () => getFactory().getPayableService();
const repo = new PayableRepository();

let expenseId: string;
let productsTableId: string;
let seq = 0;

async function titulo(m: number, over: { amountCents?: number } = {}) {
  seq += 1;
  const pay = await ap().createPayable(scope(), {
    unitId: UNIT, supplierName: `Fornecedor ${seq}`, documentNumber: `NF-CX-${seq}`, description: 'serviço',
    issueDate: mes(m), dueDate: '2026-12-15', amountCents: over.amountCents ?? 50000, expenseAccountId: expenseId,
  });
  const rec = await posting().findEntryBySource(scope(), 'ap.payable', pay.id);
  expect(rec?.status).toBe('Posted');
  return { payableId: pay.id, recognitionId: rec!.id, documentNumber: `NF-CX-${seq}` };
}

/** Compra de estoque: 10 unidades a R$ 100,00 (1 INBOUND). */
async function compraDeEstoque(m: number) {
  seq += 1;
  // 1 produto por compra: cada item de estoque é só dela (o saldo não mistura entradas de outros testes).
  const productRef = (await prisma.dynamicTableData.create({ data: { dynamicTableId: productsTableId, data: { name: `Shampoo ${seq}` } } })).id;
  const pay = await ap().createPayable(scope(), {
    unitId: UNIT, supplierName: `Forn estoque ${seq}`, documentNumber: `NF-EST-${seq}`, description: 'mercadoria',
    issueDate: mes(m), dueDate: '2026-12-15', amountCents: 10000, inventoryProductRef: productRef, inventoryQty: 10,
  });
  const rec = await posting().findEntryBySource(scope(), 'ap.payable', pay.id);
  expect(rec?.status).toBe('Posted');
  const item = await prisma.inventoryItem.findFirstOrThrow({ where: { userId: DONO, unitId: UNIT, productRef } });
  return { payableId: pay.id, recognitionId: rec!.id, itemId: item.id, productRef };
}

/** O que o `cancelPayable` grava na tx da intenção — montado com o CAS real do repositório. */
async function gravaIntencao(payableId: string, m: number, reason: string | null = 'erro de lançamento') {
  const won = await prisma.$transaction((tx) =>
    repo.casStartCancelling(scope(), payableId, { fromStatuses: ['OPEN'], cancelledById: DONO, cancelReason: reason, cancelReversalDate: mes(m) }, tx),
  );
  expect(won).toBe(1);
}

const soReverseEntry = (lancamentoId: string, m: number) =>
  posting().reverseEntry(scope(), { unitId: UNIT, lancamentoId, reversalPostingDate: mes(m), reason: 'crash depois do estorno', automaticWriter: true });

const eventos = (payableId: string, eventType: string) =>
  prisma.auditEvent.findMany({ where: { scopeUserId: DONO, unitId: UNIT, targetId: payableId, eventType } });
const qtyOnHand = async (itemId: string) => (await prisma.inventoryItem.findUniqueOrThrow({ where: { id: itemId } })).qtyOnHand;
const estado = (payableId: string) => prisma.payable.findUniqueOrThrow({ where: { id: payableId } });
const pendencia = (sourceType: string, sourceId: string) =>
  prisma.reconcilePendingItem.findFirst({ where: { userId: DONO, unitId: UNIT, sourceType, sourceId } });

describe('CANCELLING PR-0 — cancelPayable em 2 commits (intenção persistida) + reconcile passo 1b', () => {
  beforeAll(async () => {
    pushTestSchema();
    await prisma.user.create({ data: { id: DONO, name: DONO, username: DONO, email: `${DONO}@test.local`, password: 'x', role: 'USER' } });
    await seedUnit({ userId: DONO, id: UNIT });
    for (const m of [6, 7, 8, 9, 10, 11, 12]) {
      await prisma.accountingPeriod.create({ data: { userId: DONO, unitId: UNIT, year: 2026, month: m, status: 'OPEN', openedAt: new Date(), openedById: DONO } });
    }
    const conta = (code: string, nature: string) =>
      prisma.account.create({ data: { userId: DONO, unitId: UNIT, code, name: `Conta ${code}`, nature, acceptsEntries: true } });
    expenseId = (await conta('4.1', 'Expense')).id;
    await conta('1.1.1', 'Asset');
    await conta('2.1.2', 'Liability');
    await conta(ESTOQUES_CODE, 'Asset');
    await conta(FORNECEDORES_A_PAGAR_CODE, 'Liability');
    // Catálogo `products` do dono (o gate de existência do productRef) com 1 produto.
    productsTableId = (await prisma.dynamicTable.create({ data: { userId: DONO, name: 'Products', internalName: 'products', category: 'inventory', schema: { fields: [] } } })).id;
  }, 120000);

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('0.1 — colunas novas', () => {
    it('payables.cancelReversalDate e reconcile_pending_items.alertedAt existem; linha antiga lê null', async () => {
      const cols = async (t: string) => (await prisma.$queryRawUnsafe<{ name: string }[]>(`PRAGMA table_info("${t}")`)).map((c) => c.name);
      expect(await cols('payables')).toContain('cancelReversalDate');
      expect(await cols('reconcile_pending_items')).toContain('alertedAt');
      const t = await titulo(6);
      expect((await estado(t.payableId)).cancelReversalDate).toBeNull();
    });
  });

  describe('0.3 — CAS do repositório', () => {
    it('casStartCancelling: a 2ª chamada devolve 0; casCompleteCancelling só parte de CANCELLING', async () => {
      const t = await titulo(6);
      await gravaIntencao(t.payableId, 6);
      const de = (fromStatuses: ('OPEN' | 'PARTIALLY_PAID' | 'PAID')[]) =>
        prisma.$transaction((tx) => repo.casStartCancelling(scope(), t.payableId, { fromStatuses, cancelledById: DONO, cancelReason: null, cancelReversalDate: mes(7) }, tx));
      expect(await de(['OPEN'])).toBe(0);
      const row = await estado(t.payableId);
      expect(row.status).toBe('CANCELLING');
      expect(row.cancelReversalDate).toBe(mes(6)); // a 1ª intenção é a que vale
      expect(row.cancelledById).toBe(DONO);
      const outro = await titulo(6);
      expect(await prisma.$transaction((tx) => repo.casCompleteCancelling(scope(), outro.payableId, { deletedAt: new Date(), documentNumber: null }, tx))).toBe(0); // OPEN não conclui
    });
  });

  describe('0.4 / 0.6 — caminho feliz', () => {
    it('OPEN → CANCELLED: intenção gravada, 1 payable.cancel_requested (sem texto livre), 1 payable.cancelled, razão estornado, chave de negócio liberada', async () => {
      const t = await titulo(6);
      const done = await ap().cancelPayable(scope(), t.payableId, { unitId: UNIT, reversalDate: mes(6), reason: 'lançado em duplicidade' });
      expect(done.status).toBe('CANCELLED');
      const row = await estado(t.payableId);
      expect(row.status).toBe('CANCELLED');
      expect(row.deletedAt).not.toBeNull();
      expect(row.cancelReversalDate).toBe(mes(6));
      expect(row.cancelledById).toBe(DONO);
      expect(row.cancelReason).toBe('lançado em duplicidade');
      expect(row.documentNumber).toBe(`deleted:${t.payableId}:${t.documentNumber}`);
      expect((await posting().findEntryBySource(scope(), 'ap.payable', t.payableId))?.status).toBe('Reversed');
      const pedido = await eventos(t.payableId, 'payable.cancel_requested');
      expect(pedido).toHaveLength(1);
      expect(pedido[0].payload).toContain(mes(6));
      expect(pedido[0].payload).not.toContain('duplicidade'); // só "motivo informado ou não"
      expect(await eventos(t.payableId, 'payable.cancelled')).toHaveLength(1);
    });
  });

  describe('0.4 — gate dentro da tx (AC-2.3-2: gate falha ⇒ nada persiste)', () => {
    it('título com baixa em trânsito (PAYING) ⇒ recusa e NADA persiste: sem intenção, sem audit, sem estorno', async () => {
      const t = await titulo(6);
      await prisma.payable.update({ where: { id: t.payableId }, data: { status: 'PAYING' } });
      await expect(ap().cancelPayable(scope(), t.payableId, { unitId: UNIT, reversalDate: mes(6) })).rejects.toMatchObject({ statusCode: 400 });
      const row = await estado(t.payableId);
      expect(row.status).toBe('PAYING');
      expect(row.cancelReversalDate).toBeNull();
      expect(await eventos(t.payableId, 'payable.cancel_requested')).toHaveLength(0);
      expect((await posting().findEntryBySource(scope(), 'ap.payable', t.payableId))?.status).toBe('Posted');
      await prisma.payable.update({ where: { id: t.payableId }, data: { status: 'OPEN' } });
    });

    it('período fechado na data do estorno ⇒ o pré-cheque recusa ANTES da intenção (nada mutou; o título segue OPEN)', async () => {
      const t = await titulo(12);
      await fecha(12);
      await expect(ap().cancelPayable(scope(), t.payableId, { unitId: UNIT, reversalDate: mes(12) })).rejects.toMatchObject({ errorCode: 'ACCOUNTING_PERIOD_NOT_OPEN' });
      expect((await estado(t.payableId)).status).toBe('OPEN');
      expect(await eventos(t.payableId, 'payable.cancel_requested')).toHaveLength(0);
    });

    it('estoque já baixado ⇒ o pré-cheque recusa ANTES da intenção; o título e o estoque ficam como estavam', async () => {
      const c = await compraDeEstoque(6);
      await prisma.inventoryItem.update({ where: { id: c.itemId }, data: { qtyOnHand: 3 } }); // parte já vendida
      await expect(ap().cancelPayable(scope(), c.payableId, { unitId: UNIT, reversalDate: mes(6) })).rejects.toMatchObject({ statusCode: 400 });
      expect((await estado(c.payableId)).status).toBe('OPEN');
      expect(await qtyOnHand(c.itemId)).toBe(3);
      await prisma.inventoryItem.update({ where: { id: c.itemId }, data: { qtyOnHand: 10 } });
    });
  });

  describe('0.4 — crash depois da intenção (CANCELLING) e retomada', () => {
    it('crash DEPOIS do estoque desfeito: título CANCELLING; o 2º cancelPayable conclui sem 2º decremento, sem 2º estorno e com 1 payable.cancelled', async () => {
      const c = await compraDeEstoque(6);
      expect(await qtyOnHand(c.itemId)).toBe(10);
      await gravaIntencao(c.payableId, 6);
      // O que o passo (iii) fez antes de morrer: só o estoque.
      await getFactory().getInventoryService().reverseStockForReceipt(scope(), {
        sourceType: INVENTORY_INBOUND_SOURCE_TYPE, sourceId: c.payableId, reversalEventId: `${c.payableId}:cancel`, reversalDate: new Date(mes(6)),
      });
      expect(await qtyOnHand(c.itemId)).toBe(0);
      expect((await estado(c.payableId)).status).toBe('CANCELLING');
      expect((await posting().findEntryBySource(scope(), 'ap.payable', c.payableId))?.status).toBe('Posted');

      const done = await ap().cancelPayable(scope(), c.payableId, { unitId: UNIT, reversalDate: mes(6), reason: 'retomada' });
      expect(done.status).toBe('CANCELLED');
      expect(await qtyOnHand(c.itemId)).toBe(0); // não decrementou de novo (nem ficou negativo)
      expect(await prisma.stockMovement.count({ where: { inventoryItemId: c.itemId, kind: 'REVERSAL', sourceId: `${c.payableId}:cancel` } })).toBe(1);
      expect(await prisma.journalEntry.count({ where: { userId: DONO, unitId: UNIT, sourceType: 'reversal', sourceId: c.recognitionId } })).toBe(1);
      expect(await eventos(c.payableId, 'payable.cancelled')).toHaveLength(1);
      expect((await estado(c.payableId)).status).toBe('CANCELLED');
    });

    it('retomada com reversalDate/reason DIFERENTES: a intenção persistida prevalece', async () => {
      const t = await titulo(6);
      await gravaIntencao(t.payableId, 6, 'motivo original');
      const done = await ap().cancelPayable(scope(), t.payableId, { unitId: UNIT, reversalDate: mes(7), reason: 'outro motivo' });
      expect(done.status).toBe('CANCELLED');
      const estorno = await posting().findEntryBySource(scope(), 'reversal', t.recognitionId);
      expect(estorno?.date.toISOString().slice(0, 7)).toBe('2026-06'); // a data gravada, não a do corpo novo
      const row = await estado(t.payableId);
      expect(row.cancelReason).toBe('motivo original');
      expect(row.cancelReversalDate).toBe(mes(6));
    });

    it('cancelPayable sobre título já CANCELLED: 404 (o soft-delete esconde a linha) e nenhum 2º payable.cancelled — NÃO é o "devolve idempotente" que o BRIEF 0.5 supõe', async () => {
      const t = await titulo(6);
      await ap().cancelPayable(scope(), t.payableId, { unitId: UNIT, reversalDate: mes(6) });
      await expect(ap().cancelPayable(scope(), t.payableId, { unitId: UNIT, reversalDate: mes(6) })).rejects.toMatchObject({ statusCode: 404 });
      expect(await eventos(t.payableId, 'payable.cancelled')).toHaveLength(1); // o soft-delete esconde a linha; nenhum 2º evento
    });
  });

  describe('0.7 — reconcile passo 1 pula CANCELLING e o passo 1b conclui', () => {
    it('título de compra de estoque CANCELLING não recebe estoque nem reposta nada no passo 1 (regressão: o estoque desfeito segue desfeito)', async () => {
      const c = await compraDeEstoque(7);
      await gravaIntencao(c.payableId, 7);
      await getFactory().getInventoryService().reverseStockForReceipt(scope(), {
        sourceType: INVENTORY_INBOUND_SOURCE_TYPE, sourceId: c.payableId, reversalEventId: `${c.payableId}:cancel`, reversalDate: new Date(mes(7)),
      });
      expect(await qtyOnHand(c.itemId)).toBe(0);
      const inboundsAntes = await prisma.stockMovement.count({ where: { inventoryItemId: c.itemId, kind: 'INBOUND' } });

      const out = await ap().reconcilePayables(scope());
      expect(out.failed).toBe(0);
      expect(out.reversalsCompleted).toBeGreaterThanOrEqual(1);
      expect(await prisma.stockMovement.count({ where: { inventoryItemId: c.itemId, kind: 'INBOUND' } })).toBe(inboundsAntes); // nenhum recebimento novo
      expect(await qtyOnHand(c.itemId)).toBe(0);
      expect((await estado(c.payableId)).status).toBe('CANCELLED');
      // 2ª passada: nada a repetir (a 2ª chamada é a que prova o idempotente).
      const out2 = await ap().reconcilePayables(scope());
      expect(out2.reversalsCompleted).toBe(0);
      expect(await eventos(c.payableId, 'payable.cancelled')).toHaveLength(1);
    });

    it('estoque desfeito + razão intacto ⇒ o passo 1b conclui (estorna o reconhecimento e fecha o título)', async () => {
      const c = await compraDeEstoque(8);
      await gravaIntencao(c.payableId, 8);
      await getFactory().getInventoryService().reverseStockForReceipt(scope(), {
        sourceType: INVENTORY_INBOUND_SOURCE_TYPE, sourceId: c.payableId, reversalEventId: `${c.payableId}:cancel`, reversalDate: new Date(mes(8)),
      });
      const out = await ap().reconcilePayables(scope());
      expect(out.failed).toBe(0);
      expect((await estado(c.payableId)).status).toBe('CANCELLED');
      expect((await posting().findEntryBySource(scope(), 'ap.payable', c.payableId))?.status).toBe('Reversed');
      expect(await qtyOnHand(c.itemId)).toBe(0);
    });

    it('razão JÁ estornado + período FECHOU ⇒ conclui (o replay do reverseEntry vem antes do gate de período)', async () => {
      const t = await titulo(9);
      await gravaIntencao(t.payableId, 9);
      await soReverseEntry(t.recognitionId, 9);
      await fecha(9);
      const out = await ap().reconcilePayables(scope());
      expect(out.failed).toBe(0);
      expect(out.blocked).toBe(0);
      expect((await estado(t.payableId)).status).toBe('CANCELLED');
      expect(await prisma.journalEntry.count({ where: { userId: DONO, unitId: UNIT, sourceType: 'reversal', sourceId: t.recognitionId } })).toBe(1);
      // 2ª passada: 2ª chamada não reemite.
      expect((await ap().reconcilePayables(scope())).reversalsCompleted).toBe(0);
      expect(await eventos(t.payableId, 'payable.cancelled')).toHaveLength(1);
    });

    it('reconhecimento ausente (create pendurado) ⇒ conclui sem estorno', async () => {
      const t = await titulo(10);
      await gravaIntencao(t.payableId, 10);
      await prisma.journalEntry.deleteMany({ where: { userId: DONO, unitId: UNIT, sourceType: 'ap.payable', sourceId: t.payableId } }); // dangling create
      const redrive = await ap().redriveCancelling(scope(), t.payableId);
      expect(redrive.outcome).toBe('completed');
      expect((await estado(t.payableId)).status).toBe('CANCELLED');
      expect((await eventos(t.payableId, 'payable.cancelled'))[0].payload).not.toContain('"reversalEntryId":"'); // sem estorno ⇒ sem id (null não entra no canônico)
    });

    it('o passo 1 NÃO re-posta o reconhecimento de um título CANCELLING (create pendurado + intenção): recognitionsPosted 0 e nenhum ap.payable nasce', async () => {
      // Falsificável: sem o `continue` de CANCELLING no passo 1, o reconcile reconstruiria o lançamento que o cancelamento acabou de dispensar.
      const t = await titulo(10);
      await gravaIntencao(t.payableId, 10);
      await prisma.journalEntry.deleteMany({ where: { userId: DONO, unitId: UNIT, sourceType: 'ap.payable', sourceId: t.payableId } });
      const out = await ap().reconcilePayables(scope());
      expect(out.recognitionsPosted).toBe(0);
      expect(await prisma.journalEntry.count({ where: { userId: DONO, unitId: UNIT, sourceType: 'ap.payable', sourceId: t.payableId } })).toBe(0);
      expect((await estado(t.payableId)).status).toBe('CANCELLED');
    });

    it('`grace`: título CANCELLING mais novo que o grace fica para a passada seguinte', async () => {
      const t = await titulo(10);
      await gravaIntencao(t.payableId, 10);
      const out = await ap().reconcilePayables(scope(), { cancellingGraceMs: 3_600_000 });
      expect(out.reversalsCompleted).toBe(0);
      expect((await estado(t.payableId)).status).toBe('CANCELLING');
      await ap().redriveCancelling(scope(), t.payableId); // não deixa sujeira para os demais
    });
  });

  describe('0.8 — escritas novas recusam CANCELLING', () => {
    it('registerPayment ⇒ 409 TITULO_EM_CANCELAMENTO; receiveInventoryItems ⇒ 409; apropriarCreditoIbsCbs ⇒ 409', async () => {
      const t = await titulo(11);
      const { productRef } = await compraDeEstoque(11); // só para ter um productRef válido no recebimento
      await gravaIntencao(t.payableId, 11);
      await expect(
        ap().registerPayment(scope(), t.payableId, { unitId: UNIT, method: 'Pix', paidAt: mes(11), amountCents: 50000 }),
      ).rejects.toMatchObject({ statusCode: 409, errorCode: 'TITULO_EM_CANCELAMENTO' });
      await expect(
        ap().receiveInventoryItems(scope(), { payableId: t.payableId, occurredAt: new Date(mes(11)), description: 'x', items: [{ productRef, qty: 1, valueCents: 100 }] as never }),
      ).rejects.toMatchObject({ statusCode: 409, errorCode: 'TITULO_EM_CANCELAMENTO' });
      const doc = await prisma.sourceDocument.create({ data: { userId: DONO, unitId: UNIT, sourceType: 'test.cancelling', externalRef: `doc-${t.payableId}` } });
      await expect(
        ap().apropriarCreditoIbsCbs(scope(), { unitId: UNIT, payableId: t.payableId, tributo: 'IBS', sourceDocumentId: doc.id, expectedStatus: 'PENDENTE' }),
      ).rejects.toMatchObject({ statusCode: 409, errorCode: 'TITULO_EM_CANCELAMENTO' });
      await ap().redriveCancelling(scope(), t.payableId);
    });
  });

  describe('0.9 — BLOCKED persistido na bandeja e alerta na 1ª captura', () => {
    const alerta = () => jest.fn();
    const recorder = (alert: jest.Mock) => new ReconcilePendingRecorder(new ReconcilePendingRepository(), alert, () => new Date('2026-11-25T12:00:00.000Z'));

    it('1ª passada grava + alerta; a 2ª NÃO repete o alerta e attempts sobe; resolver marca resolvedAt e zera alertedAt; reaparecer alerta de novo', async () => {
      const alert = alerta();
      const r = recorder(alert);
      const item = { sourceType: 'payment.cancel', sourceId: 'pay-x-1', reasonCode: 'PAYMENT_REVERSAL_INVARIANT_VIOLATED' as const, reasonDetail: 'invariante', alert: 'permanent' as const };

      await r.record(scope(), item);
      expect(alert).toHaveBeenCalledTimes(1);
      expect(alert.mock.calls[0][0]).toMatchObject({ source: 'subledger_redrive', event: 'blocked_permanent', sourceType: 'payment.cancel', reasonCode: 'PAYMENT_REVERSAL_INVARIANT_VIOLATED' });
      expect(JSON.stringify(alert.mock.calls[0][0])).not.toContain('invariante'); // sem texto livre
      let row = (await pendencia('payment.cancel', 'pay-x-1'))!;
      expect(row.alertedAt).not.toBeNull();
      expect(row.attempts).toBe(1);

      await r.record(scope(), item);
      expect(alert).toHaveBeenCalledTimes(1); // 2ª passada: sem 2º alerta
      row = (await pendencia('payment.cancel', 'pay-x-1'))!;
      expect(row.attempts).toBe(2);

      await r.resolve(scope(), 'payment.cancel', 'pay-x-1');
      row = (await pendencia('payment.cancel', 'pay-x-1'))!;
      expect(row.resolvedAt).not.toBeNull();
      expect(row.alertedAt).toBeNull();

      await r.record(scope(), item); // reaparece depois de resolvido
      expect(alert).toHaveBeenCalledTimes(2);
      expect((await pendencia('payment.cancel', 'pay-x-1'))!.resolvedAt).toBeNull();
    });

    it('transitório (alert none) grava sem alertar; falha de gravação NUNCA lança', async () => {
      const alert = alerta();
      const r = recorder(alert);
      await r.record(scope(), { sourceType: 'payable.cancel', sourceId: 'pay-x-2', reasonCode: 'CANCEL_REDRIVE_FAILED', reasonDetail: 'estoque', alert: 'none' });
      expect(alert).not.toHaveBeenCalled();
      expect((await pendencia('payable.cancel', 'pay-x-2'))!.alertedAt).toBeNull();
      const quebrado = new ReconcilePendingRecorder({ upsertPending: async () => { throw new Error('banco fora'); } } as never, alert);
      await expect(quebrado.record(scope(), { sourceType: 'payable.cancel', sourceId: 'pay-x-3', reasonCode: 'CANCEL_REDRIVE_FAILED', reasonDetail: 'x', alert: 'permanent' })).resolves.toBeUndefined();
    });

    it('falha do cancelamento DEPOIS da intenção (período fechou entre o pré-cheque e o estorno): o título fica CANCELLING, o erro original sobe e a pendência transitória é gravada', async () => {
      const t = await titulo(10);
      await gravaIntencao(t.payableId, 10);
      await fecha(10);
      await expect(ap().cancelPayable(scope(), t.payableId, { unitId: UNIT, reversalDate: mes(10) })).rejects.toMatchObject({ errorCode: 'ACCOUNTING_PERIOD_NOT_OPEN' });
      expect((await estado(t.payableId)).status).toBe('CANCELLING');
      const p = await pendencia('payable.cancel', t.payableId);
      expect(p?.reasonCode).toBe('ACCOUNTING_PERIOD_NOT_OPEN');
      expect(p?.alertedAt).toBeNull(); // transitório: sem alerta imediato
      // O job/reconcile devolve BLOCKED (código de período) e não conclui; o operador reabre o período e a retomada conclui e fecha a pendência.
      expect((await ap().redriveCancelling(scope(), t.payableId)).outcome).toBe('blocked');
      await prisma.accountingPeriod.updateMany({ where: { userId: DONO, unitId: UNIT, year: 2026, month: 10 }, data: { status: 'OPEN', closedAt: null } });
      expect((await ap().redriveCancelling(scope(), t.payableId)).outcome).toBe('completed');
      expect((await pendencia('payable.cancel', t.payableId))!.resolvedAt).not.toBeNull();
    });

    it('BLOCKED do AP (invariante com o razão já estornado) vai à bandeja com alerta; a 2ª passada não duplica a linha', async () => {
      seq += 1;
      const pay = await ap().createPayable(scope(), {
        unitId: UNIT, supplierName: `Fornecedor ${seq}`, documentNumber: `NF-BL-${seq}`, description: 'serviço',
        issueDate: mes(7), dueDate: '2026-12-15', amountCents: 50000, expenseAccountId: expenseId,
      });
      const payment = await ap().registerPayment(scope(), pay.id, { unitId: UNIT, method: 'Pix', paidAt: mes(7), amountCents: 50000 });
      const liq = await posting().findEntryBySource(scope(), 'ap.payment', payment.id);
      await soReverseEntry(liq!.id, 7);
      await prisma.payable.update({ where: { id: pay.id }, data: { paidCents: 1000 } });

      const out = await ap().reconcilePayables(scope());
      expect(out.blocked).toBeGreaterThanOrEqual(1);
      const row = await pendencia('payment.cancel', payment.id);
      expect(row?.reasonCode).toBe('PAYMENT_REVERSAL_INVARIANT_VIOLATED');
      expect(row?.alertedAt).not.toBeNull();
      await ap().reconcilePayables(scope());
      expect(await prisma.reconcilePendingItem.count({ where: { userId: DONO, unitId: UNIT, sourceType: 'payment.cancel', sourceId: payment.id } })).toBe(1);
      // o operador repõe o saldo: a conclusão (por qualquer caminho) fecha a pendência sem rescan
      await prisma.payable.update({ where: { id: pay.id }, data: { paidCents: 50000 } });
      await ap().reconcilePayables(scope());
      expect((await pendencia('payment.cancel', payment.id))!.resolvedAt).not.toBeNull();
    });
  });

  describe('0.6 / 0.10 — concluir por qualquer caminho fecha a pendência; despacho do rescan', () => {
    it('pendência payable.cancel aberta + retomada pelo usuário ⇒ resolvedAt preenchido, sem rescan', async () => {
      const t = await titulo(10);
      await gravaIntencao(t.payableId, 10);
      const r = new ReconcilePendingRecorder(new ReconcilePendingRepository(), jest.fn());
      await r.record(scope(), { sourceType: 'payable.cancel', sourceId: t.payableId, reasonCode: 'CANCEL_REDRIVE_FAILED', reasonDetail: 'x', alert: 'none' });
      expect((await pendencia('payable.cancel', t.payableId))!.resolvedAt).toBeNull();
      await ap().cancelPayable(scope(), t.payableId, { unitId: UNIT, reversalDate: mes(10) });
      expect((await pendencia('payable.cancel', t.payableId))!.resolvedAt).not.toBeNull();
    });

    it('retryOneReconcilePendingItem despacha payable.cancel / payment.cancel / receipt.cancel (o rescan manual passa a re-dirigir)', async () => {
      const t = await titulo(10);
      await gravaIntencao(t.payableId, 10);
      expect(await retryOneReconcilePendingItem(scope(), { sourceType: 'payable.cancel', sourceId: t.payableId })).toEqual({ outcome: 'resolved' });
      expect((await estado(t.payableId)).status).toBe('CANCELLED');
      // pendência obsoleta (nada a concluir) ⇒ resolved
      expect(await retryOneReconcilePendingItem(scope(), { sourceType: 'payment.cancel', sourceId: 'nao-existe' })).toEqual({ outcome: 'resolved' });
      expect(await retryOneReconcilePendingItem(scope(), { sourceType: 'receipt.cancel', sourceId: 'nao-existe' })).toEqual({ outcome: 'resolved' });
    });
  });

  describe('0.13 / F-CX-3 (a) — leituras', () => {
    it('findOutstanding inclui o CANCELLING com o saldo; findPisCofinsCredits o conta como vivo; findSettleableTitles o exclui', async () => {
      seq += 1;
      const pay = await ap().createPayable(scope(), {
        unitId: UNIT, supplierName: `Fornecedor ${seq}`, documentNumber: `NF-RD-${seq}`, description: 'serviço',
        issueDate: mes(6), dueDate: '2026-12-15', amountCents: 50000, expenseAccountId: expenseId,
      });
      await prisma.payable.update({ where: { id: pay.id }, data: { recoverableTaxLines: JSON.stringify([{ accountId: expenseId, accountCode: '4.1', amountCents: 900, kind: 'PIS_COFINS' }]) } });
      await gravaIntencao(pay.id, 6);
      const aberto = await repo.findOutstanding(scope());
      expect(aberto.map((p) => p.id)).toContain(pay.id);
      const creditos = await repo.findPisCofinsCredits(scope(), '2026-06-01', '2026-06-30', { pisBp: 165, cofinsBp: 760 });
      expect(creditos.map((c) => c.payableId)).toContain(pay.id);
      const baixaveis = await new BankSettlementRepository().findSettleableTitles(scope(), 'PAYABLE');
      expect(baixaveis.map((b) => b.id)).not.toContain(pay.id);
      await ap().redriveCancelling(scope(), pay.id);
    });
  });
});

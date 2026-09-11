/**
 * TESTES-GUARDA (sessao-instrumentacao, 2026-09-11) — achados F1/F2/F3 do review independente do
 * PR #307 (`BE-INCR-PARTIAL-SETTLEMENT`, commit 45084cfb), reproduzidos pelo revisor contra app real.
 * Cada caso afirma o comportamento CORRETO e hoje falha pela asserção final (não por setup).
 *
 *  F1 (ALTO)  — `cancelPayment`/`cancelReceipt` postam o estorno ANTES do gate autoritativo; um comando
 *               que a API rejeita (400) já mutou o razão. Correto: nenhuma escrita no razão quando o
 *               comando é rejeitado; e o cancelamento de um recibo JÁ finalizado não pode ser
 *               rejeitado só porque OUTRO recibo está em trânsito (PAYING) — o decremento é atômico e o
 *               status fica para o finalize (F-PS3 → a: qualquer recibo, qualquer ordem).
 *  F2 (ALTO)  — `revertClaim` restaura o status a partir de `paidBefore` (leitura pré-CAS, stale).
 *               Correto: o status vem do row RE-LIDO dentro da tx, depois do decremento.
 *  F3 (MÉDIO) — o payload de `settlement_registered` usa `paidBefore + amount` (stale no mesmo
 *               interleaving). Correto: `paidCentsAfter`/`remainingCents` vêm do row re-lido na tx.
 *
 * Interleaving simulado nos fakes: a leitura pré-CAS vê `paidCents=0`; entre ela e a tx outra
 * liquidação inteira completou (`findById` dentro da tx devolve o saldo REAL).
 */
import { ValidationError } from '../../../../lib/errors';
import { PayableService } from '../PayableService';
import { ReceivableService } from '../ReceivableService';
import { AP_PAYMENT_SOURCE_TYPE } from '../../models/Payable.model';
import { AR_RECEIPT_SOURCE_TYPE } from '../../models/Receivable.model';
import type { AccountingScope } from '../../scope/AccountingScope';

const scope: AccountingScope = {
  ownerUserId: 'owner-1', actorUserId: 'owner-1', unitId: 'unit-1', ledgerCode: 'DEFAULT',
  baseCurrencyCode: 'BRL', timeZone: 'America/Sao_Paulo',
};

type Row = Record<string, unknown>;
const base = (over: Row = {}): Row => ({
  id: 'pay-1', userId: 'owner-1', unitId: 'unit-1', supplierName: 'ACME', customerName: 'Cliente', supplierRef: null,
  customerRef: null, counterpartyId: 'cp-1', documentNumber: 'NF-1', description: 'x', issueDate: new Date('2026-06-10'),
  dueDate: new Date('2026-07-10'), amountCents: BigInt(50000), paidCents: BigInt(0), receivedCents: BigInt(0),
  expenseAccountId: 'exp-1', revenueAccountId: 'rev-1', inventoryProductRef: null, inventoryQty: null, inventoryMultiItem: null,
  status: 'OPEN', createdById: 'owner-1', cancelledById: null, cancelReason: null, createdAt: new Date(),
  updatedAt: new Date(), deletedAt: null, ...over,
});
const child = (over: Row = {}): Row => ({
  id: 'child-1', userId: 'owner-1', unitId: 'unit-1', payableId: 'pay-1', receivableId: 'pay-1', amountCents: BigInt(20000),
  method: 'Pix', paidAt: new Date('2026-07-05'), receivedAt: new Date('2026-07-05'), paidByUserId: 'owner-1',
  receivedByUserId: 'owner-1', status: 'ACTIVE', entryId: 'set-1', createdAt: new Date(), updatedAt: new Date(), ...over,
});

interface Fakes {
  preCasRow: Row;      // o que findByIdWith* devolve (leitura pré-CAS)
  inTxRow: Row;        // o que findById devolve (re-leitura dentro da tx)
  releaseResult?: number;
  postRejects?: boolean;
  childRow?: Row;
}

function buildAp(f: Fakes) {
  const repo = {
    findById: jest.fn(async () => f.inTxRow),
    findByIdWithPayments: jest.fn(async () => ({ ...f.preCasRow, payments: [] })),
    claimForPayment: jest.fn(async () => 1),
    finalizeIfPaying: jest.fn(async () => 1),
    releaseSettlement: jest.fn(async () => f.releaseResult ?? 1),
    updatePayable: jest.fn(async (_s: unknown, id: string, data: Row) => ({ ...f.inTxRow, id, ...data })),
    createPayment: jest.fn(async (data: Row) => child({ id: 'paym-new', ...data })),
    findPaymentById: jest.fn(async () => f.childRow ?? child()),
    findActivePayment: jest.fn(async () => null),
    updatePayment: jest.fn(async (_s: unknown, id: string, data: Row) => child({ id, ...data })),
    runTransaction: jest.fn(async (fn: (tx: unknown) => Promise<unknown>) => fn({})),
  };
  const posting = {
    postEntry: jest.fn(async () => { if (f.postRejects) throw new Error('period closed'); return { id: 'entry-1' }; }),
    reverseEntry: jest.fn(async () => ({ reversal: { id: 'rev-1' }, original: { id: 'set-1' } })),
    findEntryBySource: jest.fn(async (_s: unknown, type: string) => (type === AP_PAYMENT_SOURCE_TYPE ? { id: 'set-1' } : null)),
  };
  const audit = { append: jest.fn(async () => undefined) };
  const policy = { canManagePayable: () => true, canReadPayable: () => true, canManageCounterparty: () => true };
  const accountRepo = { findById: jest.fn(async () => ({ id: 'exp-1', code: '4.1', nature: 'Expense', acceptsEntries: true })) };
  const counterpartyRepo = { findById: jest.fn(async () => ({ id: 'cp-1', userId: 'owner-1', unitId: 'unit-1', type: 'SUPPLIER' })), findByName: jest.fn(async () => null), create: jest.fn() };
  /* eslint-disable @typescript-eslint/no-explicit-any */
  const service = new PayableService(repo as any, accountRepo as any, posting as any, audit as any, policy as any, counterpartyRepo as any);
  /* eslint-enable @typescript-eslint/no-explicit-any */
  return { service, repo, posting, audit };
}

function buildAr(f: Fakes) {
  const repo = {
    findById: jest.fn(async () => f.inTxRow),
    findByIdWithReceipts: jest.fn(async () => ({ ...f.preCasRow, receipts: [] })),
    claimForReceipt: jest.fn(async () => 1),
    finalizeIfReceiving: jest.fn(async () => 1),
    releaseSettlement: jest.fn(async () => f.releaseResult ?? 1),
    updateReceivable: jest.fn(async (_s: unknown, id: string, data: Row) => ({ ...f.inTxRow, id, ...data })),
    createReceipt: jest.fn(async (data: Row) => child({ id: 'recp-new', ...data })),
    findReceiptById: jest.fn(async () => f.childRow ?? child()),
    findActiveReceipt: jest.fn(async () => null),
    updateReceipt: jest.fn(async (_s: unknown, id: string, data: Row) => child({ id, ...data })),
    runTransaction: jest.fn(async (fn: (tx: unknown) => Promise<unknown>) => fn({})),
  };
  const posting = {
    postEntry: jest.fn(async () => { if (f.postRejects) throw new Error('period closed'); return { id: 'entry-1' }; }),
    reverseEntry: jest.fn(async () => ({ reversal: { id: 'rev-1' }, original: { id: 'set-1' } })),
    findEntryBySource: jest.fn(async (_s: unknown, type: string) => (type === AR_RECEIPT_SOURCE_TYPE ? { id: 'set-1' } : null)),
  };
  const audit = { append: jest.fn(async () => undefined) };
  const policy = { canManageReceivable: () => true, canReadReceivable: () => true, canManageCounterparty: () => true };
  const accountRepo = { findById: jest.fn(async () => ({ id: 'rev-1', code: '3.1', nature: 'Revenue', acceptsEntries: true })) };
  const counterpartyRepo = { findById: jest.fn(async () => ({ id: 'cp-1', userId: 'owner-1', unitId: 'unit-1', type: 'CUSTOMER' })), findByName: jest.fn(async () => null), create: jest.fn() };
  /* eslint-disable @typescript-eslint/no-explicit-any */
  const service = new ReceivableService(repo as any, accountRepo as any, posting as any, audit as any, policy as any, counterpartyRepo as any);
  /* eslint-enable @typescript-eslint/no-explicit-any */
  return { service, repo, posting, audit };
}

const payDto = { unitId: 'unit-1', method: 'Pix', paidAt: '2026-07-05', amountCents: 10000 };
const recDto = { unitId: 'unit-1', method: 'Pix', receivedAt: '2026-07-05', amountCents: 10000 };
const cancelDto = { unitId: 'unit-1', reversalDate: '2026-07-14' };
const statusWrites = (calls: unknown[][]) => calls.filter((c) => 'status' in (c[2] as object)).map((c) => (c[2] as { status: string }).status);

describe('F2 — revertClaim recomputa o status do row RE-LIDO na tx (nunca de paidBefore)', () => {
  it('AP: leitura pré-CAS viu 0; outra liquidação de 20000 completou; falha pré-post → status PARTIALLY_PAID, não OPEN', async () => {
    const { service, repo } = buildAp({ preCasRow: base(), inTxRow: base({ status: 'PAYING', paidCents: BigInt(20000) }), postRejects: true });
    await expect(service.registerPayment(scope, 'pay-1', payDto as never)).rejects.toThrow('period closed');
    const writes = statusWrites(repo.updatePayable.mock.calls as unknown[][]);
    expect(writes.at(-1)).toBe('PARTIALLY_PAID'); // LACUNA: hoje 'OPEN' (derivado de paidBefore=0)
  });

  it('AR espelho', async () => {
    const { service, repo } = buildAr({ preCasRow: base(), inTxRow: base({ status: 'RECEIVING', receivedCents: BigInt(20000) }), postRejects: true });
    await expect(service.registerReceipt(scope, 'pay-1', recDto as never)).rejects.toThrow('period closed');
    expect(statusWrites(repo.updateReceivable.mock.calls as unknown[][]).at(-1)).toBe('PARTIALLY_RECEIVED');
  });
});

describe('F3 — payload de settlement_registered reflete o saldo RE-LIDO na tx', () => {
  it('AP: leitura pré-CAS viu 0; row na tx tem 30000 (20000 de outro + 10000 deste) → paidCentsAfter 30000 / remaining 20000', async () => {
    const { service, audit } = buildAp({ preCasRow: base(), inTxRow: base({ status: 'PARTIALLY_PAID', paidCents: BigInt(30000) }) });
    await service.registerPayment(scope, 'pay-1', payDto as never);
    const evt = (audit.append.mock.calls as unknown as Array<[unknown, unknown, { eventType: string; payload: Record<string, string> }]>)
      .find((c) => c[2].eventType === 'payable.settlement_registered')!;
    expect(evt[2].payload).toMatchObject({ paidCentsAfter: '30000', remainingCents: '20000' }); // LACUNA: hoje '10000'/'40000'
  });

  it('AR espelho', async () => {
    const { service, audit } = buildAr({ preCasRow: base(), inTxRow: base({ status: 'PARTIALLY_RECEIVED', receivedCents: BigInt(30000) }) });
    await service.registerReceipt(scope, 'pay-1', recDto as never);
    const evt = (audit.append.mock.calls as unknown as Array<[unknown, unknown, { eventType: string; payload: Record<string, string> }]>)
      .find((c) => c[2].eventType === 'receivable.settlement_registered')!;
    expect(evt[2].payload).toMatchObject({ receivedCentsAfter: '30000', remainingCents: '20000' });
  });
});

describe('F1 — comando rejeitado NÃO muta o razão; recibo já finalizado cancela mesmo com outro em trânsito', () => {
  it('AP: saldo liquidado (10000) menor que o recibo (20000) = invariante quebrado → 400 ANTES de reverseEntry', async () => {
    const { service, posting } = buildAp({ preCasRow: base(), inTxRow: base({ status: 'PARTIALLY_PAID', paidCents: BigInt(10000) }), releaseResult: 0 });
    await expect(service.cancelPayment(scope, 'pay-1', 'child-1', cancelDto as never)).rejects.toBeInstanceOf(ValidationError);
    expect(posting.reverseEntry).not.toHaveBeenCalled(); // LACUNA: hoje o estorno já foi postado quando o 400 sai
  });

  it('AP: título PAYING (outro recibo em trânsito) → cancelar recibo finalizado SUCEDE: release chamado, status NÃO sobrescrito (fica para o finalize)', async () => {
    const { service, repo, posting } = buildAp({ preCasRow: base(), inTxRow: base({ status: 'PAYING', paidCents: BigInt(35000) }) });
    await service.cancelPayment(scope, 'pay-1', 'child-1', cancelDto as never);
    expect(posting.reverseEntry).toHaveBeenCalledTimes(1);
    expect(repo.releaseSettlement).toHaveBeenCalledWith(scope, 'pay-1', 20000, expect.anything());
    expect(statusWrites(repo.updatePayable.mock.calls as unknown[][])).toHaveLength(0); // LACUNA: hoje recomputa e escreve status por cima do PAYING
  });

  it('AR: invariante quebrado → 400 antes de reverseEntry', async () => {
    const { service, posting } = buildAr({ preCasRow: base(), inTxRow: base({ status: 'PARTIALLY_RECEIVED', receivedCents: BigInt(10000) }), releaseResult: 0 });
    await expect(service.cancelReceipt(scope, 'pay-1', 'child-1', cancelDto as never)).rejects.toBeInstanceOf(ValidationError);
    expect(posting.reverseEntry).not.toHaveBeenCalled();
  });

  it('AR: título RECEIVING → cancelar recibo finalizado sucede sem sobrescrever o status', async () => {
    const { service, repo } = buildAr({ preCasRow: base(), inTxRow: base({ status: 'RECEIVING', receivedCents: BigInt(35000) }) });
    await service.cancelReceipt(scope, 'pay-1', 'child-1', cancelDto as never);
    expect(repo.releaseSettlement).toHaveBeenCalledWith(scope, 'pay-1', 20000, expect.anything());
    expect(statusWrites(repo.updateReceivable.mock.calls as unknown[][])).toHaveLength(0);
  });
});

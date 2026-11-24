import { describe, it, expect } from 'vitest';
import type { PayablePayment } from '../accountsPayable.service';
import type { ReceivableReceipt } from '../accountsReceivable.service';

/**
 * SOT F-02.1 — os tipos de RESPOSTA do AP/AR descrevem o que o servidor grava.
 *
 * Guarda de TIPO: o vermelho é o `npm run test:types` (tsc), não o vitest. Os objetos abaixo são linhas que o servidor
 * grava hoje e devolve na leitura (`include: { payments: true }` / `{ receipts: true }`, sem filtro de kind):
 * - AP: baixa de retenção, `method = 'NONE'` + `kind = 'WITHHOLDING'` (`WithholdingService.ts`, `Payable.model.ts`
 *   `WITHHOLDING_METHOD`/`WITHHOLDING_KIND`);
 * - AR: recebimento por saldo no provedor, `method = 'ProviderBalance'` (`Receivable.model.ts` `PROVIDER_BALANCE_METHOD`);
 * - AR: recibo de split do IBS/CBS, `method = 'SplitPayment'` + `kind = 'SPLIT_IBS_CBS'` (`BankSettlement.model.ts`).
 * `kind` vem de `SETTLEMENT_KINDS` (`BankSettlement.model.ts`). Com o tipo antigo (4 métodos, sem `kind`) não compila.
 */
const base = { userId: 'o1', unitId: 'u1', amountCents: 100, status: 'ACTIVE' as const, entryId: 'e1', createdAt: '2026-11-10T00:00:00Z', updatedAt: '2026-11-10T00:00:00Z' };

const retencao: PayablePayment = { ...base, id: 'p1', payableId: 'ap1', method: 'NONE', kind: 'WITHHOLDING', paidAt: '2026-11-10', paidByUserId: 'o1' };
const saldoProvedor: ReceivableReceipt = { ...base, id: 'r1', receivableId: 'ar1', method: 'ProviderBalance', kind: 'PAYMENT', receivedAt: '2026-11-10', receivedByUserId: 'o1' };
const split: ReceivableReceipt = { ...base, id: 'r2', receivableId: 'ar1', method: 'SplitPayment', kind: 'SPLIT_IBS_CBS', receivedAt: '2026-11-10', receivedByUserId: 'o1' };

describe('SOT F-02.1 — tipos de resposta do AP/AR', () => {
  it('SOT F-02.1: as linhas gravadas pelo servidor cabem nos tipos de resposta (o guarda é o test:types)', () => {
    expect([retencao.method, saldoProvedor.method, split.method]).toEqual(['NONE', 'ProviderBalance', 'SplitPayment']);
  });
});

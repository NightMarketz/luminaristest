/**
 * TESTE-GUARDA (sessao-instrumentacao, 2026-09-11) — nó C7r do grafo 11/09, resíduo da rodada 3
 * (BE-INCR-RECONCILE-PENDING, #296): dois "blocked" do reconcile NÃO entram na tabela de pendências
 * porque não têm `reasonCode` no enum — o item some sem rastro, exatamente a classe que a rodada 3
 * veio fechar. Ratificado **(a)** — "o enum ganha os 2 códigos novos e ambos passam a ir para a
 * tabela" — na `docs/accounting/CEDULA-DECISAO-2026-09-10-entrevista.md` §2 resposta 23.
 *
 * Localização da lacuna (verificada por leitura):
 *   - `accountingSyncReconcile.job.ts` ordering-gate de `reconcileSaleSettlements` ("opening entry
 *     missing"): `summary.blocked++` + `logger.warn` + `continue`, sem `reportPending`.
 *   - `accountingSyncReconcile.job.ts` `reconcileSalePackageConsumption`
 *     ('blocked_missing_paid_with_package_id'): idem.
 *   - `ReconcilePendingDto.ts` `ReconcilePendingReasonCode` = 3 valores, nenhum para esses casos.
 *
 * Comportamento correto esperado (contra o qual este teste afirma): cada um dos dois "blocked" chama
 * `reportPending` com um `reasonCode` PRÓPRIO (aceito pelo enum, distinto de `FAILED` — forçar
 * `FAILED` rotularia errado, como o próprio código registra) e o item aparece na tabela. Os NOMES dos
 * dois códigos são detalhe da sessão de correção: este teste afirma existência, aceitação pelo enum e
 * distinção, não a grafia.
 */
import { ReconcilePendingReasonCode } from '../../features/accounting/dtos/ReconcilePendingDto';
import {
  reconcileSaleSettlements,
  reconcileSalePackageConsumption,
  type SaleSettlementReconcileDeps,
  type SalePackageConsumptionReconcileDeps,
} from '../accountingSyncReconcile.job';

const LEGACY_CODES = ['FAILED', 'ACCOUNTING_PERIOD_NOT_OPEN', 'MAX_CENTS_EXCEEDED'];

function settlementDeps(over: Partial<SaleSettlementReconcileDeps> = {}): SaleSettlementReconcileDeps {
  return {
    listSettledSales: jest.fn(async () => [
      { ownerUserId: 'owner-1', saleId: 'sale-no-opening', unitId: 'unit-1', amount: 250, currency: 'BRL', occurredAt: '2026-06-26T00:00:00.000Z', paymentMethod: 'Pix' },
    ]),
    // Nem a liquidação nem a ABERTURA existem → o ordering-gate bloqueia.
    hasExistingEntry: jest.fn(async () => false),
    sync: jest.fn(async () => ({ entryId: 'never' })),
    reportPending: jest.fn(async () => undefined),
    ...over,
  };
}

function consumptionDeps(over: Partial<SalePackageConsumptionReconcileDeps> = {}): SalePackageConsumptionReconcileDeps {
  return {
    listPackageConsumptions: jest.fn(async () => [
      { ownerUserId: 'owner-1', saleId: 'sale-no-pkg', unitId: 'unit-1', amount: 80, customerId: 'cust-1', paidWithPackageId: '' },
    ]),
    hasDebitMovement: jest.fn(async () => false),
    debitBalance: jest.fn(async () => undefined),
    reportPending: jest.fn(async () => undefined),
    ...over,
  };
}

describe('C7r — os 2 "blocked" sem reasonCode passam a ser capturados na tabela de pendências (cédula 10/09 resposta 23 → a)', () => {
  it('ordering-gate de reconcileSaleSettlements (abertura ausente) → reportPending com reasonCode próprio aceito pelo enum', async () => {
    const deps = settlementDeps();
    const summary = await reconcileSaleSettlements(deps);

    expect(summary.blocked).toBe(1); // comportamento pré-existente: continua bloqueado, não falha
    expect(deps.sync).not.toHaveBeenCalled();

    const calls = (deps.reportPending as jest.Mock).mock.calls as Array<[{ sourceType: string; sourceId: string; reasonCode: string }]>;
    expect(calls).toHaveLength(1); // LACUNA: hoje 0 — o item some sem rastro
    const item = calls[0][0];
    expect(item).toMatchObject({ sourceType: 'sale.settled', sourceId: 'sale-no-opening' });
    expect(ReconcilePendingReasonCode.options).toContain(item.reasonCode);
    expect(LEGACY_CODES).not.toContain(item.reasonCode); // código PRÓPRIO, nunca FAILED "forçado"
  });

  it('reconcileSalePackageConsumption sem paidWithPackageId → reportPending com reasonCode próprio aceito pelo enum', async () => {
    const deps = consumptionDeps();
    const summary = await reconcileSalePackageConsumption(deps);

    expect(summary.blocked).toBe(1);
    expect(deps.debitBalance).not.toHaveBeenCalled();

    const calls = (deps.reportPending as jest.Mock).mock.calls as Array<[{ sourceType: string; sourceId: string; reasonCode: string }]>;
    expect(calls).toHaveLength(1); // LACUNA: hoje 0
    const item = calls[0][0];
    expect(item).toMatchObject({ sourceType: 'sale.package.consumption', sourceId: 'sale-no-pkg' });
    expect(ReconcilePendingReasonCode.options).toContain(item.reasonCode);
    expect(LEGACY_CODES).not.toContain(item.reasonCode);
  });

  it('os dois códigos novos são DISTINTOS entre si (um é dependência de ordenação auto-resolvível, o outro é dado ausente)', async () => {
    const a = settlementDeps();
    const b = consumptionDeps();
    await reconcileSaleSettlements(a);
    await reconcileSalePackageConsumption(b);
    const codeA = ((a.reportPending as jest.Mock).mock.calls[0]?.[0] as { reasonCode?: string } | undefined)?.reasonCode;
    const codeB = ((b.reportPending as jest.Mock).mock.calls[0]?.[0] as { reasonCode?: string } | undefined)?.reasonCode;
    expect(codeA).toBeDefined(); // LACUNA: hoje undefined (nenhuma captura)
    expect(codeB).toBeDefined();
    expect(codeA).not.toBe(codeB);
    // O enum ratificado tinha 3 valores; (a) acrescenta exatamente os 2.
    expect(ReconcilePendingReasonCode.options).toHaveLength(5);
  });
});

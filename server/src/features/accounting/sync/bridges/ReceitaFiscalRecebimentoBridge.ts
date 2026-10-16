/**
 * ReceitaFiscalRecebimentoBridge — BE-INCR-SIMPLES-CAIXA PR-1 (nó X14-CAIXA, itens 3–6; F-CX-1 a).
 *
 * Grava o recebimento da venda (`ReceitaFiscalRecebimentoService`), base do DAS no regime de caixa (Res. CGSN 140
 * art. 16 § 1º), DEPOIS do `sale.settled`. Vive no mundo contábil (Prisma first-class) e roda post-commit, a partir da
 * ponte de liquidação e da de estorno — NUNCA dentro de `DynamicTableService`, `RuleContext` ou `RulePlugin` (§2.1).
 *
 * Best-effort e não fatal como as outras pontes: uma falha não desfaz o pagamento; `reconcileReceitaFiscalRecebimentos`
 * (passada do job de reconcile e `backfillRecebimentos`, sob demanda) refaz, idempotente pela @@unique.
 *
 * Os dias vêm do RAZÃO: recebimento = dia do `sale.settled`; prestação = dia do `sale.finalized`; estorno = dia do
 * lançamento de estorno do `sale.settled`. O meio vem da venda (o razão não distingue débito de crédito em 1.1.4).
 */

import { getFactory } from '../../../../lib/factory';
import logger from '../../../../lib/logger';
import { resolveAccountingScope, type AccountingScope } from '../../scope/AccountingScope';
import { isAllPackageSale } from './saleItems';

/** Mesmo shape do `ReconcileSummary` do job (a feature não importa de `jobs/`). */
export interface RecebimentoReconcileSummary {
  total: number;
  synced: number;
  idempotentHits: number;
  failed: number;
}

/** Venda Finalized+Paid (ou Cancelled depois de paga) normalizada da linha da DynamicTable. */
export interface RecebimentoSale {
  ownerUserId: string;
  saleId: string;
  unitId: string;
  amount: number;
  paymentMethod: string;
  /** Venda só de pacote: a venda do pacote em si não é recebimento-base (item 6). */
  isAllPackage: boolean;
}

export interface RecebimentoReconcileDeps {
  listSales: () => Promise<RecebimentoSale[]>;
  /** Dia (YYYY-MM-DD) do lançamento `sourceType` da venda, ou null se não existe. */
  entryDay: (scope: AccountingScope, sourceType: 'sale.settled' | 'sale.finalized', saleId: string) => Promise<string | null>;
  /** Dia do estorno do `sale.settled`, ou null se não foi estornado. */
  settledReversalDay: (scope: AccountingScope, saleId: string) => Promise<string | null>;
}

const diaDe = (e: { date: Date } | null) => (e ? e.date.toISOString().slice(0, 10) : null);

/**
 * Itens 3–5 — espelha a liquidação (e o estorno dela) no recebimento. Venda sem `sale.settled` não tem o que espelhar
 * (o passe de liquidações cuida dela antes). Idempotente: gravado fica; ACTIVE estornado vira REVERTED uma vez.
 */
export async function reconcileReceitaFiscalRecebimentos(deps: RecebimentoReconcileDeps): Promise<RecebimentoReconcileSummary> {
  const svc = getFactory().getReceitaFiscalRecebimentoService();
  const sales = await deps.listSales();
  const summary: RecebimentoReconcileSummary = { total: sales.length, synced: 0, idempotentHits: 0, failed: 0 };
  for (const sale of sales) {
    try {
      if (sale.isAllPackage) {
        summary.idempotentHits++;
        continue;
      }
      if (!sale.unitId) throw new Error(`Venda '${sale.saleId}' sem unitId — recebimento não reconciliável.`);
      const scope = resolveAccountingScope({ userId: sale.ownerUserId }, sale.unitId);
      const diaPagamento = await deps.entryDay(scope, 'sale.settled', sale.saleId);
      if (diaPagamento === null) {
        summary.idempotentHits++;
        continue;
      }
      let mudou = false;
      if (!(await svc.registrado(scope, sale.saleId))) {
        const diaPrestacao = (await deps.entryDay(scope, 'sale.finalized', sale.saleId)) ?? diaPagamento;
        mudou = await svc.registrar(scope, { saleId: sale.saleId, amount: sale.amount, meio: sale.paymentMethod, diaPagamento, diaPrestacao });
      }
      const diaEstorno = await deps.settledReversalDay(scope, sale.saleId);
      if (diaEstorno !== null && (await svc.estornar(scope, sale.saleId, diaEstorno)) > 0) mudou = true;
      if (mudou) summary.synced++;
      else summary.idempotentHits++;
    } catch (error) {
      summary.failed++;
      logger.error('Receita fiscal (recebimento) reconcile failed — continuing', {
        saleId: sale.saleId,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
  return summary;
}

/** Os dias do razão pelo `PostingService` (leitura com policy do escopo). */
export function ledgerDays(): Pick<RecebimentoReconcileDeps, 'entryDay' | 'settledReversalDay'> {
  const posting = () => getFactory().getPostingService();
  return {
    entryDay: async (scope, sourceType, saleId) => diaDe(await posting().findEntryBySource(scope, sourceType, saleId)),
    settledReversalDay: async (scope, saleId) => {
      const settled = await posting().findEntryBySource(scope, 'sale.settled', saleId);
      return settled?.reversedById ? diaDe(await posting().findEntryBySource(scope, 'reversal', settled.id)) : null;
    },
  };
}

/** Normaliza uma linha da tabela `sales` para o passe de recebimentos. */
export function recebimentoSaleFromRow(ownerUserId: string, row: { id: string; data: Record<string, unknown> }, isAllPackage: boolean): RecebimentoSale {
  return {
    ownerUserId,
    saleId: row.id,
    unitId: typeof row.data.unitId === 'string' ? row.data.unitId : '',
    amount: typeof row.data.totalAmount === 'number' ? row.data.totalAmount : NaN,
    paymentMethod: typeof row.data.paymentMethod === 'string' ? row.data.paymentMethod : '',
    isAllPackage,
  };
}

/**
 * Item 3 — chamada pela ponte de liquidação logo depois do `sale.settled`. Não fatal: falha fica para o reconcile.
 */
export async function maybeRecordRecebimento(scope: AccountingScope, sale: RecebimentoSale): Promise<void> {
  try {
    await reconcileReceitaFiscalRecebimentos({ listSales: async () => [sale], ...ledgerDays() });
  } catch (error) {
    logger.error('Recebimento (sale settled) failed — left for reconciliation', {
      saleId: sale.saleId,
      unitId: scope.unitId,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

/**
 * Item 4 — backfill sob demanda (antes da apuração CAIXA): TODAS as vendas Finalized+Paid e Cancelled da unidade, sem
 * a janela de watermark do job — cobre as vendas pagas antes deste PR, com o dia original do razão.
 */
export async function backfillRecebimentos(scope: AccountingScope): Promise<RecebimentoReconcileSummary> {
  const repo = getFactory().getDynamicTableRepository();
  const salesTable = await repo.findTableByInternalName(scope.ownerUserId, 'sales');
  if (!salesTable) return { total: 0, synced: 0, idempotentHits: 0, failed: 0 };
  const rows = [
    ...(await repo.findRowsByFieldValue(salesTable.id, 'status', 'Finalized')).filter((r) => (r.data as Record<string, unknown>).paymentStatus === 'Paid'),
    ...(await repo.findRowsByFieldValue(salesTable.id, 'status', 'Cancelled')),
  ].filter((r) => (r.data as Record<string, unknown>).unitId === scope.unitId);
  const sales: RecebimentoSale[] = [];
  for (const r of rows) {
    sales.push(recebimentoSaleFromRow(scope.ownerUserId, { id: r.id, data: r.data as Record<string, unknown> }, await isAllPackageSale(scope.ownerUserId, r.id)));
  }
  return reconcileReceitaFiscalRecebimentos({ listSales: async () => sales, ...ledgerDays() });
}

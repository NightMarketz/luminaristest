/**
 * SaleReversalBridge — Incremento D integration seam (estorno/devolução).
 *
 * Turns a Cancelled or Returned sale (a DynamicTable `sales` row) into the matching
 * accounting effect. It lives in the accounting (Prisma first-class) world and is invoked
 * POST-COMMIT from SalesCancellationService — NEVER inside DynamicTableService, RuleContext
 * or a RulePlugin (§2.1 boundary). No accounting code crosses into features/dynamicTables;
 * the dependency points one way.
 *
 * Mirrors maybeSyncSaleFinalized (seam C): best-effort and non-fatal — a failure must
 * NOT undo the cancellation/return; the reconciliation job re-drives it idempotently. There
 * is NO idempotency pre-check here (G3): the engine is the authority —
 *   • Cancelled → PostingService.reverseEntry (mirror legs, original → Reversed, reversedById
 *     + @@unique[sourceType=reversal,sourceId] make a double-reversal impossible);
 *   • Returned  → AccountingSync.sync (@@unique[userId,unitId,sourceType,sourceId] dedupes).
 *
 * Money (G4): a cancellation reverses the entry and only MIRRORS the cents already stored — no
 * conversion. A return books a fresh contra-revenue entry; the reais→cents conversion happens
 * exactly once, inside SaleReturnedMapper.
 */

import { getFactory } from '../../../../lib/factory';
import logger from '../../../../lib/logger';
import { resolveAccountingScope, type AccountingScope } from '../../scope/AccountingScope';
import { saleDayAsWritten, scopeDay, scopeToday } from '../../models/dates';
import { buildSaleReturnedEvent, syncSkipErrorCode } from '../AccountingSyncPort';

/** The minimal shape this bridge reads from a DynamicTable data row (update result). */
interface SaleRow {
  id: string;
  data?: unknown;
}

/**
 * If `row` is a Cancelled or Returned sale in the BeautySalon `sales` table, apply the
 * matching accounting effect. Returns silently (no throw) for every non-applicable case and
 * swallows errors (left for reconciliation).
 *
 * @param actor   authenticated user context (owner === actor today; tenancy unchanged)
 * @param tableId the DynamicTable id the row belongs to (authoritative — from the service)
 * @param row     the updated data row (id = saleId, data = the sale fields incl. new status)
 */
export async function maybeReverseSale(
  actor: { userId: string },
  tableId: string,
  row: SaleRow,
): Promise<void> {
  try {
    const data = (row.data ?? {}) as Record<string, unknown>;

    // Trigger gate (D2-Q5): only Cancelled (reverse) and Returned (contra-revenue) act here.
    const status = data.status;
    if (status !== 'Cancelled' && status !== 'Returned') return;

    // Boundary gate (identical to seam C): confirm this tableId is THIS tenant's `sales`
    // table, without touching the DynamicTable engine — one indexed lookup by internalName,
    // then id + category match.
    const repo = getFactory().getDynamicTableRepository();
    const salesTable = await repo.findTableByInternalName(actor.userId, 'sales');
    if (!salesTable || salesTable.id !== tableId || salesTable.category !== 'finance') return;

    // Never default/infer the unit — only post within the sale's own unit (§2 tenancy).
    const unitId = typeof data.unitId === 'string' ? data.unitId : '';
    if (!unitId) {
      logger.warn('Sale reversal without unitId — accounting sync skipped', {
        saleId: row.id,
      });
      return;
    }

    const scope = resolveAccountingScope(actor, unitId);
    const reason = typeof data.reason === 'string' ? data.reason : undefined;

    if (status === 'Cancelled') {
      const posting = getFactory().getPostingService();

      // Reverse the revenue recognition entry, if one was ever booked. findEntryBySource only
      // LOCATES the entry to reverse (reverseEntry needs the id); it is NOT an idempotency
      // pre-check — reverseEntry itself owns idempotency.
      const revenue = await posting.findEntryBySource(scope, 'sale.finalized', row.id);
      if (revenue) {
        const estorno = await posting.reverseEntry(scope, {
          unitId,
          lancamentoId: revenue.id,
          reversalPostingDate: scopeToday(scope),
          reason,
        });
        // X14 PR-3: subrazão fiscal de receita — linhas negativas no dia do ESTORNO (commit 2, não fatal).
        await maybeRecordEstornoFiscal(scope, row.id, 'CANCELAMENTO', () => estorno.reversal.date.toISOString().slice(0, 10));
      }

      // Adaptive (D2-Q4): if a settlement entry exists, reverse it too. This branch sleeps
      // until D-settlement books 'sale.settled' entries — coded now so a cancellation
      // is whole the day settlement lands.
      const settled = await posting.findEntryBySource(scope, 'sale.settled', row.id);
      if (settled) {
        await posting.reverseEntry(scope, {
          unitId,
          lancamentoId: settled.id,
          reversalPostingDate: scopeToday(scope),
          reason,
        });
      }
      return;
    }

    // status === 'Returned' — book a SEPARATE contra-revenue entry (NOT a reversal). The
    // amount must be a finite positive number; the mapper re-validates and converts to cents.
    const totalAmount = data.totalAmount;
    if (typeof totalAmount !== 'number' || !Number.isFinite(totalAmount) || totalAmount <= 0) {
      logger.warn('Sale Returned with invalid totalAmount — accounting sync skipped', {
        saleId: row.id,
      });
      return;
    }

    const returnDay =
      typeof data.returnedAt === 'string'
        ? scopeDay(scope, data.returnedAt)
        : saleDayAsWritten(scope, typeof data.date === 'string' ? data.date : undefined);
    const event = buildSaleReturnedEvent({
      saleId: row.id,
      unitId,
      amount: totalAmount,
      currency: typeof data.currency === 'string' ? data.currency : 'BRL',
      // `returnedAt` é 'datetime' no preset (SalesModule) — um INSTANTE. Resolvê-lo em dia-calendário
      // tem de ser no fuso do escopo: às 21h BRT o dia UTC já virou e a devolução postaria em D+1.
      // O fallback `data.date` é um DIA (ISO à meia-noite UTC do motor): lê-se como escrito (`saleDayAsWritten`).
      occurredAt: returnDay,
      label: `Devolução ${row.id}`,
    });
    await getFactory().getAccountingSyncService().sync(scope, event);
    // X14 PR-3: subrazão fiscal de receita — linhas negativas no dia da devolução (D 3.2), commit 2, não fatal.
    await maybeRecordEstornoFiscal(scope, row.id, 'DEVOLUCAO', () => returnDay);
  } catch (reversalError) {
    // Skip ONLY on the shared specific-code list (period-closed / MAX_CENTS poison) — never on a
    // base error class. syncSkipErrorCode reads AppError.errorCode; the old inline check read a
    // non-existent `.code`, so the skip branch was dead and every skip-listed error logged as error.
    const skipCode = syncSkipErrorCode(reversalError);
    if (skipCode) {
      logger.warn('AccountingSync skipped — erro determinístico não-retriável', {
        saleId: row.id,
        code: skipCode,
        error: reversalError instanceof Error ? reversalError.message : String(reversalError),
      });
      return;
    }
    logger.error('AccountingSync (sale reversal) failed — left for reconciliation', {
      saleId: row.id,
      status: (row.data as Record<string, unknown> | undefined)?.status,
      error: reversalError instanceof Error ? reversalError.message : String(reversalError),
    });
  }
}

/**
 * X14 PR-3 (lacuna 1 do PR-2) — espelha no subrazão fiscal de receita o cancelamento/devolução que acabou de ir ao
 * razão (`ReceitaFiscalService.registrarEstorno`). Commit 2, não fatal: falha fica para a passada de reconcile.
 */
async function maybeRecordEstornoFiscal(scope: AccountingScope, saleId: string, tipo: 'CANCELAMENTO' | 'DEVOLUCAO', dia: () => string): Promise<void> {
  try {
    await getFactory().getReceitaFiscalService().registrarEstorno(scope, saleId, tipo, dia());
  } catch (error) {
    logger.error('Subrazão fiscal de receita (estorno) failed — left for reconciliation', {
      saleId,
      tipo,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

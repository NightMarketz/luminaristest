/**
 * outstandingLines — leitura + normalização compartilhada das linhas EM ABERTO de AP/AR
 * (FE-INCR-CASH-FORECAST, item 2 do checklist: "reuse antes de recriar", Etapa 1 do critério de
 * reuso — mesmo objeto de domínio: mesmo shape `{ dueDate, amountCents, counterpartyId, ... }`,
 * mesma derivação `findOutstanding(scope)`).
 *
 * Extraído de `AgingReportService.loadOutstanding` (que era privado) para ser consumido por DOIS
 * services: `AgingReportService` (posição por contraparte × faixa de vencimento) e
 * `CashForecastReportService` (projeção diária). Nenhuma lógica nova aqui — apenas o `map` de
 * `Payable`/`Receivable` para a forma comum, incluindo a conversão `BigInt → number` via
 * `centsFromDb` (convenção INTEGER CENTS, BE-INCR-MONEY-BIGINT).
 *
 * MODULE-BOUNDARIES PR-1a (`L6`, ADR-MODULE-BOUNDARIES P1): o model recebe as LINHAS, não o repositório.
 * Quem lê (`findOutstanding(scope)`) é o service; aqui fica só o mapeamento puro.
 *
 * `findOutstanding(scope)` já filtra por `PAYABLE_OUTSTANDING_STATUSES`/
 * `RECEIVABLE_OUTSTANDING_STATUSES` (`OPEN | PARTIALLY_* | PAYING/RECEIVING`) — títulos em
 * trânsito (CAS 2-tx) já vêm incluídos, sem filtro adicional aqui (F-AG3→a / F-CF4→a).
 *
 * BE-INCR-PARTIAL-SETTLEMENT (F-PS4→a, BRIEF item 11): `amountCents` da linha é o SALDO REMANESCENTE
 * (`amountCents − paidCents` / `− receivedCents`), nunca o total cru — um título `PARTIALLY_*` pesa no
 * aging e no caixa projetado só pelo que ainda falta.
 */
import type { Payable, Receivable } from 'generated/prisma';
import { centsFromDb } from './money';

/** Linha normalizada (AP e AR compartilham a mesma forma para agregação read-time). */
export interface OutstandingLine {
  id: string;
  documentNumber: string | null;
  dueDate: Date;
  /** SALDO REMANESCENTE em centavos (`amountCents − paidCents|receivedCents`), não o total do título. */
  amountCents: number;
  counterpartyId: string | null;
  /** supplierName (AP) / customerName (AR) — snapshot por linha. */
  counterpartyName: string;
}

/** Colunas de `Payable` que o mapeamento lê (as linhas vêm de `IPayableRepository.findOutstanding`). */
export type OutstandingPayableRow = Pick<
  Payable,
  'id' | 'documentNumber' | 'dueDate' | 'amountCents' | 'paidCents' | 'counterpartyId' | 'supplierName'
>;

/** Colunas de `Receivable` que o mapeamento lê (as linhas vêm de `IReceivableRepository.findOutstanding`). */
export type OutstandingReceivableRow = Pick<
  Receivable,
  'id' | 'documentNumber' | 'dueDate' | 'amountCents' | 'receivedCents' | 'counterpartyId' | 'customerName'
>;

/** Normaliza as Payable em aberto do escopo (já lidas pelo service) para a forma comum. */
export function outstandingLinesFromPayables(rows: readonly OutstandingPayableRow[]): OutstandingLine[] {
  return rows.map((r) => ({
    id: r.id,
    documentNumber: r.documentNumber,
    dueDate: r.dueDate,
    amountCents: centsFromDb(r.amountCents) - centsFromDb(r.paidCents),
    counterpartyId: r.counterpartyId,
    counterpartyName: r.supplierName,
  }));
}

/** Normaliza as Receivable em aberto do escopo (já lidas pelo service) para a forma comum. */
export function outstandingLinesFromReceivables(rows: readonly OutstandingReceivableRow[]): OutstandingLine[] {
  return rows.map((r) => ({
    id: r.id,
    documentNumber: r.documentNumber,
    dueDate: r.dueDate,
    amountCents: centsFromDb(r.amountCents) - centsFromDb(r.receivedCents),
    counterpartyId: r.counterpartyId,
    counterpartyName: r.customerName,
  }));
}

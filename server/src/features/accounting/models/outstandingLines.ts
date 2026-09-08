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
 * `findOutstanding(scope)` já filtra por `PAYABLE_OUTSTANDING_STATUSES`/
 * `RECEIVABLE_OUTSTANDING_STATUSES` (`['OPEN','PAYING']` / `['OPEN','RECEIVING']`) — títulos em
 * trânsito (CAS 2-tx) já vêm incluídos, sem filtro adicional aqui (F-AG3→a / F-CF4→a).
 */
import type { Prisma } from 'generated/prisma';
import type { IPayableRepository } from '../repositories/IPayableRepository';
import type { IReceivableRepository } from '../repositories/IReceivableRepository';
import type { AccountingScope } from '../scope/AccountingScope';
import { centsFromDb } from './money';

/** Linha normalizada (AP e AR compartilham a mesma forma para agregação read-time). */
export interface OutstandingLine {
  id: string;
  documentNumber: string | null;
  dueDate: Date;
  amountCents: number;
  counterpartyId: string | null;
  /** supplierName (AP) / customerName (AR) — snapshot por linha. */
  counterpartyName: string;
}

/**
 * Carrega e normaliza as Payable em aberto do escopo para a forma comum.
 * `tx` é repassado ao repositório tal qual o próprio `findOutstanding(scope, tx?)` aceita (mesma
 * assinatura do repositório, MIRROR — nunca reimplementada aqui) — necessário para os testes de
 * integração injetarem um client Prisma dedicado (ex.: `outstandingLines.integration.test.ts`,
 * `AgingOutstanding.integration.test.ts`); em produção nenhum chamador passa `tx` hoje (nem
 * `AgingReportService` nem `CashForecastReportService` correm dentro de transação).
 *
 * A chamada só inclui o segundo argumento quando `tx` é REALMENTE fornecido — nunca
 * `findOutstanding(scope, undefined)` — para não mudar a aridade da chamada que os testes
 * mockados existentes (`AgingReportService.test.ts`/`CashForecastReportService.test.ts`) já
 * afirmam com `toHaveBeenCalledWith(scope)` (1 argumento).
 */
export async function loadOutstandingPayables(
  scope: AccountingScope,
  payableRepo: IPayableRepository,
  tx?: Prisma.TransactionClient,
): Promise<OutstandingLine[]> {
  const rows = await (tx ? payableRepo.findOutstanding(scope, tx) : payableRepo.findOutstanding(scope));
  return rows.map((r) => ({
    id: r.id,
    documentNumber: r.documentNumber,
    dueDate: r.dueDate,
    amountCents: centsFromDb(r.amountCents),
    counterpartyId: r.counterpartyId,
    counterpartyName: r.supplierName,
  }));
}

/** Carrega e normaliza as Receivable em aberto do escopo para a forma comum. `tx` — ver `loadOutstandingPayables`. */
export async function loadOutstandingReceivables(
  scope: AccountingScope,
  receivableRepo: IReceivableRepository,
  tx?: Prisma.TransactionClient,
): Promise<OutstandingLine[]> {
  const rows = await (tx ? receivableRepo.findOutstanding(scope, tx) : receivableRepo.findOutstanding(scope));
  return rows.map((r) => ({
    id: r.id,
    documentNumber: r.documentNumber,
    dueDate: r.dueDate,
    amountCents: centsFromDb(r.amountCents),
    counterpartyId: r.counterpartyId,
    counterpartyName: r.customerName,
  }));
}

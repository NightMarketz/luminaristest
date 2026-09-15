import type { AccountingScopeSettings, BankSettlementItem, BankStatementLine, Prisma } from 'generated/prisma';
import type { AccountingScope } from '../scope/AccountingScope';
import type { BankSettlementStatus, BankSettlementStep, BankSettlementTitleType, CandidateTitle } from '../models/BankSettlement.model';

export interface CreateBankSettlementItemData {
  origin: 'STATEMENT_LINE' | 'CNAB_RETURN';
  statementLineId: string;
  titleType: BankSettlementTitleType;
  titleId: string;
  proposedCents: number;
  chargeCents: number;
}

export interface BankSettlementItemPatch {
  status?: BankSettlementStatus;
  proposedCents?: number;
  chargeCents?: number;
  reason?: string | null;
  failedStep?: BankSettlementStep | null;
  settlementId?: string | null;
  chargeEntryId?: string | null;
  confirmedById?: string | null;
  confirmedAt?: Date | null;
}

export type BankSettlementItemWithLine = BankSettlementItem & { statementLine: BankStatementLine };

/**
 * BE-INCR-BANK-SETTLEMENT (nó F7) — único lugar com `prisma.bankSettlementItem.*` e
 * `prisma.accountingScopeSettings.*`. As leituras de `payables`/`receivables` aqui são READ-ONLY e
 * projetadas (`CandidateTitle`) — o AP/AR continua dono da escrita (BRIEF §0: "AP/AR intocados").
 * Toda escrita aceita `tx` (ACC-012).
 */
export interface IBankSettlementRepository {
  create(scope: AccountingScope, data: CreateBankSettlementItemData, tx?: Prisma.TransactionClient): Promise<BankSettlementItem>;
  findById(scope: AccountingScope, id: string, tx?: Prisma.TransactionClient): Promise<BankSettlementItemWithLine | null>;
  findByLine(scope: AccountingScope, statementLineId: string, tx?: Prisma.TransactionClient): Promise<BankSettlementItem[]>;
  findMany(
    scope: AccountingScope,
    params: { statementId?: string; status?: BankSettlementStatus; page: number; limit: number },
  ): Promise<{ items: BankSettlementItemWithLine[]; total: number }>;
  /** Itens PENDING das linhas de um extrato — o scan os re-avalia (stale, item 10). */
  findPendingByStatement(scope: AccountingScope, statementId: string, tx?: Prisma.TransactionClient): Promise<BankSettlementItem[]>;
  update(scope: AccountingScope, id: string, patch: BankSettlementItemPatch, tx?: Prisma.TransactionClient): Promise<BankSettlementItem>;
  /**
   * CAS de estado (item 15, concorrência): `status = from → to` numa única `updateMany` scoped.
   * Devolve 1 = venceu; 0 = outro chamador venceu ou o item não está em `from`.
   */
  compareAndSetStatus(
    scope: AccountingScope,
    id: string,
    from: BankSettlementStatus,
    to: BankSettlementStatus,
    tx?: Prisma.TransactionClient,
  ): Promise<number>;
  /** Review #326 F5: item preso em CONFIRMING (crash entre CAS e efeito) — só retomável se `updatedAt` for mais velho que `olderThan`. */
  claimStaleConfirming(scope: AccountingScope, id: string, olderThan: Date, tx?: Prisma.TransactionClient): Promise<number>;

  /** Review-delta #326: ids de pagamento/recebimento já ligados a item VIVO (não STALE/REJECTED) — nunca são 'órfãos'. */
  findLinkedSettlementIds(scope: AccountingScope, tx?: Prisma.TransactionClient): Promise<Set<string>>;

  /** Títulos liquidáveis (OPEN | PARTIALLY_*) do escopo, projetados em centavos inteiros (leitura). */
  findSettleableTitles(scope: AccountingScope, titleType: BankSettlementTitleType, tx?: Prisma.TransactionClient): Promise<CandidateTitle[]>;
  /** Um título por id/tipo, projetado; `null` se inexistente, apagado ou de outro escopo (404, nunca 403). */
  findTitle(scope: AccountingScope, titleType: BankSettlementTitleType, id: string, tx?: Prisma.TransactionClient): Promise<(CandidateTitle & { status: string; counterpartyName: string }) | null>;

  getSettings(scope: AccountingScope, tx?: Prisma.TransactionClient): Promise<AccountingScopeSettings | null>;
  upsertSettings(
    scope: AccountingScope,
    data: { bankChargeExpenseAccountId?: string | null; bankChargeIncomeAccountId?: string | null },
    tx?: Prisma.TransactionClient,
  ): Promise<AccountingScopeSettings>;

  runTransaction<T>(fn: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T>;
}

import type { FiscalNumberVoid, Prisma } from 'generated/prisma';
import type { AccountingScope } from '../scope/AccountingScope';

/** BE-INCR-NFCE (nó X10a, item 24) — estados do pedido de inutilização (contrato §4 do BRIEF). */
export const FISCAL_NUMBER_VOID_STATUSES = ['REQUESTED', 'HOMOLOGATED', 'REJECTED'] as const;
export type FiscalNumberVoidStatus = (typeof FISCAL_NUMBER_VOID_STATUSES)[number];

/** Pedido que ocupa a faixa: o já homologado (rej. 256) e o ainda sem resposta (rej. 563). O rejeitado não ocupa. */
export const OCCUPYING_VOID_STATUSES: readonly FiscalNumberVoidStatus[] = ['REQUESTED', 'HOMOLOGATED'];

export interface CreateFiscalNumberVoidData {
  kind: 'NFE' | 'NFCE';
  ambiente: 'producao' | 'homologacao';
  serie: number;
  nIni: bigint;
  nFin: bigint;
  ano: number;
  xJust: string;
  partner: string;
}

export interface FiscalNumberVoidResultPatch {
  status: FiscalNumberVoidStatus;
  nProt?: string | null;
  errorsJson?: string | null;
}

/**
 * BE-INCR-NFCE (nó X10a, item 24) — único lugar com `prisma.fiscalNumberVoid.*`. `tx?` em todos. A linha nasce
 * `REQUESTED` e só muda pelo resultado da porta (`applyResult`).
 */
export interface IFiscalNumberVoidRepository {
  create(scope: AccountingScope, data: CreateFiscalNumberVoidData, tx?: Prisma.TransactionClient): Promise<FiscalNumberVoid>;
  applyResult(scope: AccountingScope, id: string, patch: FiscalNumberVoidResultPatch, tx?: Prisma.TransactionClient): Promise<FiscalNumberVoid>;
  /** Pedidos do (kind, ambiente, serie) nos `statuses`, cuja faixa cruza `[nIni, nFin]`. */
  findOverlapping(
    scope: AccountingScope,
    faixa: { kind: 'NFE' | 'NFCE'; ambiente: string; serie: number; nIni: bigint; nFin: bigint },
    statuses: readonly FiscalNumberVoidStatus[],
    tx?: Prisma.TransactionClient,
  ): Promise<FiscalNumberVoid[]>;
  /** Pedidos do tipo no escopo, nos `statuses` (todas as séries e ambientes). */
  listByKind(scope: AccountingScope, kind: 'NFE' | 'NFCE', statuses: readonly FiscalNumberVoidStatus[], tx?: Prisma.TransactionClient): Promise<FiscalNumberVoid[]>;
  runTransaction<T>(fn: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T>;
}

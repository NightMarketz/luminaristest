import type { Prisma, SimplesApuracao } from 'generated/prisma';
import type { AccountingScope } from '../scope/AccountingScope';

/** BE-INCR-SIMPLES-NACIONAL PR-3 (nó X14, item 19) — campos gravados no registro do DAS oficial. */
export interface CreateSimplesApuracaoData {
  competencia: string;
  regime: 'SIMPLES' | 'MEI';
  valorOficialCents: bigint;
  numeroDocumento: string;
  vencimento: string;
  sourceDocumentId: string | null;
  totalCalculadoCents: bigint;
  divergenciaCents: bigint;
  memoria: Prisma.InputJsonValue;
  tabelaVersao: Prisma.InputJsonValue;
  supersedesId: string | null;
}

/**
 * Contrato do repositório de `simples_apuracoes` (X14 PR-3). Único lugar com `prisma.simplesApuracao`. Chave = escopo
 * (PJ + unidade) × competência. Zero regra de negócio.
 */
export interface ISimplesApuracaoRepository {
  /** A apuração CONFIRMED (não removida) da competência, ou null. */
  findConfirmada(scope: AccountingScope, competencia: string, tx?: Prisma.TransactionClient): Promise<SimplesApuracao | null>;
  findById(scope: AccountingScope, id: string, tx?: Prisma.TransactionClient): Promise<SimplesApuracao | null>;
  /** CAS CONFIRMED → SUPERSEDED; devolve quantas mudaram (0 = outra tx chegou antes). */
  supersede(scope: AccountingScope, id: string, tx: Prisma.TransactionClient): Promise<number>;
  create(scope: AccountingScope, data: CreateSimplesApuracaoData, tx: Prisma.TransactionClient): Promise<SimplesApuracao>;
  /** CAS do vínculo da provisão (`where provisaoEntryId = null`); devolve quantas mudaram. */
  setProvisaoEntryId(scope: AccountingScope, id: string, entryId: string): Promise<number>;
  runTransaction<T>(fn: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T>;
}

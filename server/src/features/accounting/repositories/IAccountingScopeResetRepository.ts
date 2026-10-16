import type { Prisma } from 'generated/prisma';
import type { BlockingTable, SetupTable } from '../models/accountingResetClassification';

export type SetupCounts = Partial<Record<SetupTable, number>>;

/**
 * BE-INCR-RESET-CONSISTENTE item 11 — acesso a dados do reset contábil. Único lugar com `prisma.*` para ele. Toda leitura
 * e escrita recebe o `tx` do `runTransaction` (gate autoritativo dentro da tx). A trilha (`AuditEvent`/`AuditChainHead`)
 * nunca é apagada aqui; só se LÊ quais unidades já têm cadeia (`listChainedUnits`).
 */
export interface IAccountingScopeResetRepository {
  runTransaction<T>(fn: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T>;
  /** Tabelas BLOCKING com linha do usuário (qualquer unidade, soft-deletadas inclusive), só as com contagem > 0. */
  countBlocking(userId: string, tx: Prisma.TransactionClient): Promise<Array<{ table: BlockingTable; count: number }>>;
  /**
   * Linhas de SETUP do usuário: `byUnit` por `unitId` (só unidades com alguma linha) e `userLevel` para as tabelas da
   * empresa, sem `unitId` (`ACCOUNTING_RESET_SETUP_USER_LEVEL`; só as com contagem > 0).
   */
  countSetup(userId: string, tx: Prisma.TransactionClient): Promise<{ byUnit: Map<string, SetupCounts>; userLevel: SetupCounts }>;
  /** Unidades do usuário que já têm cadeia na trilha (`AuditChainHead`) — destino do evento quando só há `companyLevel`. */
  listChainedUnits(userId: string, tx: Prisma.TransactionClient): Promise<string[]>;
  /** Apaga (hard) todo o SETUP do usuário na ordem de `ACCOUNTING_RESET_SETUP` (filhos antes dos pais). */
  deleteSetup(userId: string, tx: Prisma.TransactionClient): Promise<void>;
}

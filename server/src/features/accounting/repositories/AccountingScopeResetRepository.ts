import prisma from '../../../lib/prisma';
import type { Prisma } from 'generated/prisma';
import {
  ACCOUNTING_RESET_BLOCKING,
  ACCOUNTING_RESET_SETUP,
  ACCOUNTING_RESET_SETUP_USER_LEVEL,
} from '../models/accountingResetClassification';
import type { BlockingTable, SetupTable, SplitTable } from '../models/accountingResetClassification';
import type { IAccountingScopeResetRepository, SetupCounts } from './IAccountingScopeResetRepository';

type ResetWhere = { userId: string } & Record<string, unknown>;

/** O pedaço comum dos delegates do Prisma que o reset usa — toda tabela classificada tem `userId`. */
interface UserScopedDelegate {
  count(args: { where: ResetWhere }): Promise<number>;
  findMany(args: { where: ResetWhere; select: { unitId: true } }): Promise<Array<{ unitId: string }>>;
  deleteMany(args: { where: ResetWhere }): Promise<{ count: number }>;
}

/**
 * Critério por linha das tabelas divididas (`ACCOUNTING_RESET_SPLIT`): o que casa aqui BLOQUEIA; o complemento é SETUP.
 * `AccountingPolicyVersion`: contador envolvido = proposta (`proposedById`, o `propose` exige contador ativo) ou decisão
 * (`assignmentId`). O PUT direto sem contador grava os dois nulos (`applyDirectInTx`).
 */
const SPLIT_BLOCKING_WHERE: Record<SplitTable, Record<string, unknown>> = {
  AccountingPolicyVersion: { OR: [{ proposedById: { not: null } }, { assignmentId: { not: null } }] },
};

/** `JournalEntry` → `tx.journalEntry` (o teste-guarda confere que todo nome classificado tem delegate). */
export function resetDelegate(tx: Prisma.TransactionClient, model: string): UserScopedDelegate {
  return (tx as unknown as Record<string, UserScopedDelegate>)[model.charAt(0).toLowerCase() + model.slice(1)];
}

const USER_LEVEL: ReadonlySet<SetupTable> = new Set<SetupTable>(ACCOUNTING_RESET_SETUP_USER_LEVEL);

/** BE-INCR-RESET-CONSISTENTE item 11 — único lugar com `prisma.*` do reset contábil. */
export class AccountingScopeResetRepository implements IAccountingScopeResetRepository {
  public async runTransaction<T>(fn: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
    // Plano de contas inteiro + período + binding: folga igual à do install do preset.
    return prisma.$transaction(fn, { timeout: 30000 });
  }

  public async countBlocking(userId: string, tx: Prisma.TransactionClient): Promise<Array<{ table: BlockingTable; count: number }>> {
    const out: Array<{ table: BlockingTable; count: number }> = [];
    for (const table of ACCOUNTING_RESET_BLOCKING) {
      const count = await resetDelegate(tx, table).count({ where: { userId } });
      if (count > 0) out.push({ table, count });
    }
    for (const table of Object.keys(SPLIT_BLOCKING_WHERE) as SplitTable[]) {
      const count = await resetDelegate(tx, table).count({ where: { userId, ...SPLIT_BLOCKING_WHERE[table] } });
      if (count > 0) out.push({ table, count });
    }
    return out;
  }

  public async countSetup(userId: string, tx: Prisma.TransactionClient): Promise<{ byUnit: Map<string, SetupCounts>; userLevel: SetupCounts }> {
    const byUnit = new Map<string, SetupCounts>();
    const userLevel: SetupCounts = {};
    for (const table of ACCOUNTING_RESET_SETUP) {
      if (USER_LEVEL.has(table)) {
        const count = await resetDelegate(tx, table).count({ where: { userId } });
        if (count > 0) userLevel[table] = count;
        continue;
      }
      const rows = await resetDelegate(tx, table).findMany({ where: { userId }, select: { unitId: true } });
      for (const { unitId } of rows) {
        const counts = byUnit.get(unitId) ?? {};
        counts[table] = (counts[table] ?? 0) + 1;
        byUnit.set(unitId, counts);
      }
    }
    return { byUnit, userLevel };
  }

  public async listChainedUnits(userId: string, tx: Prisma.TransactionClient): Promise<string[]> {
    const heads = await tx.auditChainHead.findMany({ where: { scopeUserId: userId }, select: { unitId: true } });
    return heads.map((h) => h.unitId);
  }

  /**
   * Nas divididas, só chega aqui depois do gate (nenhuma linha "com contador"), então o `userId` sozinho já alcança só a
   * parte SETUP. FK Restrict para `User`/`AccountantAssignment` não pesa: apagamos as versões, não o pai.
   */
  public async deleteSetup(userId: string, tx: Prisma.TransactionClient): Promise<void> {
    for (const table of ACCOUNTING_RESET_SETUP) {
      await resetDelegate(tx, table).deleteMany({ where: { userId } });
    }
  }
}

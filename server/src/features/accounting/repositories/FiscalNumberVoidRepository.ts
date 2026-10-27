import prisma from '../../../lib/prisma';
import type { FiscalNumberVoid, Prisma } from 'generated/prisma';
import type { AccountingScope } from '../scope/AccountingScope';
import { accountingScopeWhere } from '../scope/AccountingScope';
import type {
  CreateFiscalNumberVoidData,
  FiscalNumberVoidResultPatch,
  FiscalNumberVoidStatus,
  IFiscalNumberVoidRepository,
} from './IFiscalNumberVoidRepository';

/** Prisma-backed `fiscal_number_voids` (BE-INCR-NFCE item 24). */
export class FiscalNumberVoidRepository implements IFiscalNumberVoidRepository {
  private db(tx?: Prisma.TransactionClient) {
    return tx ?? prisma;
  }

  public async create(scope: AccountingScope, data: CreateFiscalNumberVoidData, tx?: Prisma.TransactionClient): Promise<FiscalNumberVoid> {
    const { userId, unitId } = accountingScopeWhere(scope);
    return this.db(tx).fiscalNumberVoid.create({
      data: { userId, unitId, ...data, status: 'REQUESTED', createdById: scope.actorUserId },
    });
  }

  public async applyResult(
    scope: AccountingScope,
    id: string,
    patch: FiscalNumberVoidResultPatch,
    tx?: Prisma.TransactionClient,
  ): Promise<FiscalNumberVoid> {
    const updated = await this.db(tx).fiscalNumberVoid.updateMany({ where: { id, ...accountingScopeWhere(scope) }, data: patch });
    if (updated.count !== 1) throw new Error(`fiscal_number_void_not_found: ${id}`);
    return (await this.db(tx).fiscalNumberVoid.findFirst({ where: { id } })) as FiscalNumberVoid;
  }

  public async findOverlapping(
    scope: AccountingScope,
    faixa: { kind: 'NFE' | 'NFCE'; ambiente: string; serie: number; nIni: bigint; nFin: bigint },
    statuses: readonly FiscalNumberVoidStatus[],
    tx?: Prisma.TransactionClient,
  ): Promise<FiscalNumberVoid[]> {
    return this.db(tx).fiscalNumberVoid.findMany({
      where: {
        ...accountingScopeWhere(scope),
        kind: faixa.kind,
        ambiente: faixa.ambiente,
        serie: faixa.serie,
        status: { in: [...statuses] },
        nIni: { lte: faixa.nFin },
        nFin: { gte: faixa.nIni },
      },
      orderBy: { nIni: 'asc' },
    });
  }

  public async listByKind(
    scope: AccountingScope,
    kind: 'NFE' | 'NFCE',
    statuses: readonly FiscalNumberVoidStatus[],
    tx?: Prisma.TransactionClient,
  ): Promise<FiscalNumberVoid[]> {
    return this.db(tx).fiscalNumberVoid.findMany({
      where: { ...accountingScopeWhere(scope), kind, status: { in: [...statuses] } },
      orderBy: [{ ambiente: 'asc' }, { serie: 'asc' }, { nIni: 'asc' }],
    });
  }

  public async runTransaction<T>(fn: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
    return prisma.$transaction(fn);
  }
}

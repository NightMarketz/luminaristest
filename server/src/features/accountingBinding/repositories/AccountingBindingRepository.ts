import prisma from '../../../lib/prisma';
import type { AccountingBinding, Prisma } from 'generated/prisma';
import type { AccountingBindingStatus } from '../models/accountingBindingStatus';
import { bindingScopeWhere } from './IAccountingBindingRepository';
import type {
  BindingScope,
  CreateAccountingBindingInput,
  IAccountingBindingRepository,
} from './IAccountingBindingRepository';

/**
 * Prisma-backed repository for compiled bindings (`accounting_bindings`). Único lugar com
 * `prisma.accountingBinding.*` (Corpo C, item 9 do BRIEF). Mesmo esqueleto de
 * `ReferentialMappingRepository` (tenancy via where explícito, `tx ?? prisma`, `runTransaction`
 * fino sobre `prisma.$transaction`).
 */
export class AccountingBindingRepository implements IAccountingBindingRepository {
  public async findMaxVersion(
    scope: BindingScope,
    sectorKey: string,
    tx?: Prisma.TransactionClient,
  ): Promise<number> {
    // INCLUI soft-deleted de propósito (ver header da interface) — o @@unique não exclui
    // deletedAt, então reemitir uma versão apagada colidiria em P2002.
    const row = await (tx ?? prisma).accountingBinding.findFirst({
      where: { ...bindingScopeWhere(scope), sectorKey },
      orderBy: { bindingVersion: 'desc' },
      select: { bindingVersion: true },
    });
    return row?.bindingVersion ?? 0;
  }

  public async findActive(
    scope: BindingScope,
    sectorKey: string,
    tx?: Prisma.TransactionClient,
  ): Promise<AccountingBinding | null> {
    return (tx ?? prisma).accountingBinding.findFirst({
      where: { ...bindingScopeWhere(scope), sectorKey, status: 'Active', deletedAt: null },
    });
  }

  public async create(
    scope: BindingScope,
    data: CreateAccountingBindingInput,
    tx?: Prisma.TransactionClient,
  ): Promise<AccountingBinding> {
    const { userId, unitId } = bindingScopeWhere(scope);
    return (tx ?? prisma).accountingBinding.create({
      data: {
        userId,
        unitId,
        sectorKey: data.sectorKey,
        bindingVersion: data.bindingVersion,
        compiledAt: data.compiledAt,
        compiledFromHash: data.compiledFromHash,
        payload: data.payload,
        status: data.status,
        createdById: data.createdById,
      },
    });
  }

  public async supersedeIfActive(
    scope: BindingScope,
    id: string,
    tx?: Prisma.TransactionClient,
  ): Promise<number> {
    const result = await (tx ?? prisma).accountingBinding.updateMany({
      where: { ...bindingScopeWhere(scope), id, status: 'Active' },
      data: { status: 'Superseded' satisfies AccountingBindingStatus },
    });
    return result.count;
  }

  public async findById(
    scope: BindingScope,
    id: string,
    tx?: Prisma.TransactionClient,
  ): Promise<AccountingBinding | null> {
    return (tx ?? prisma).accountingBinding.findFirst({
      where: { ...bindingScopeWhere(scope), id, deletedAt: null },
    });
  }

  public async findMany(
    scope: BindingScope,
    filters: { sectorKey?: string; status?: AccountingBindingStatus },
    tx?: Prisma.TransactionClient,
  ): Promise<AccountingBinding[]> {
    return (tx ?? prisma).accountingBinding.findMany({
      where: {
        ...bindingScopeWhere(scope),
        deletedAt: null,
        ...(filters.sectorKey ? { sectorKey: filters.sectorKey } : {}),
        ...(filters.status ? { status: filters.status } : {}),
      },
      orderBy: [{ sectorKey: 'asc' }, { bindingVersion: 'desc' }],
    });
  }

  public async runTransaction<T>(fn: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
    return prisma.$transaction(fn);
  }

  public async findAllActive(tx?: Prisma.TransactionClient): Promise<AccountingBinding[]> {
    // Leitura GLOBAL de propósito (F-FEEDER-3 → (c)) — nenhum `bindingScopeWhere`, ao contrário de
    // todo outro método deste repositório. Único método sem escopo por desenho.
    return (tx ?? prisma).accountingBinding.findMany({
      where: { status: 'Active', deletedAt: null },
    });
  }
}

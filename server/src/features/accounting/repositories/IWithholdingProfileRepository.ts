import type { Prisma, WithholdingProfile } from 'generated/prisma';
import type { AccountingScope } from '../scope/AccountingScope';
import type { PerfilRetencaoDados } from '../models/withholdingProfile';

/**
 * BE-INCR-RETENCOES-FONTE PR-1 (item 6) — único lugar com `prisma.withholdingProfile.*`. Tenancy em dois níveis
 * (`ownerUserId` + `unitId`): id de outro escopo devolve `null` (→ 404). Soft-delete; linha viva = `deletedAt: null`. O seam de
 * tx é do repositório (`runInTransaction`), com o `tx` propagado a cada leitura do gate (memória authoritative-gate-inside-tx).
 */
export interface IWithholdingProfileRepository {
  list(scope: AccountingScope, counterpartyId?: string, tx?: Prisma.TransactionClient): Promise<WithholdingProfile[]>;
  findById(scope: AccountingScope, id: string, tx?: Prisma.TransactionClient): Promise<WithholdingProfile | null>;
  /** Vigências vivas do mesmo par (contraparte, natureza) — o gate de sobreposição roda sobre elas, dentro da tx. */
  listByCounterpartyAndNatureza(scope: AccountingScope, counterpartyId: string, naturezaServico: string, tx?: Prisma.TransactionClient): Promise<WithholdingProfile[]>;
  create(scope: AccountingScope, counterpartyId: string, data: PerfilRetencaoDados, tx?: Prisma.TransactionClient): Promise<WithholdingProfile>;
  update(scope: AccountingScope, id: string, data: PerfilRetencaoDados, tx?: Prisma.TransactionClient): Promise<WithholdingProfile>;
  softDelete(scope: AccountingScope, id: string, tx?: Prisma.TransactionClient): Promise<WithholdingProfile>;
  runInTransaction<T>(fn: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T>;
}

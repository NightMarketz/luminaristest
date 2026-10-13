import type { Prisma, RoleAccountOverride } from 'generated/prisma';
import type { BindingScope } from '../../accountingBinding/repositories/IAccountingBindingRepository';

/** A linha + o código da conta (lido mesmo se a conta foi apagada depois — o validador do compile reprova). */
export type RoleAccountOverrideWithCode = RoleAccountOverride & { account: { code: string } };

/**
 * Acesso a `role_account_overrides` (BE-INCR-KIT-SETOR, PR-3, item 18). Único lugar com
 * `prisma.roleAccountOverride.*`. Toda leitura filtra `deletedAt: null`; a unicidade viva por papel é do serviço,
 * in-tx (sem @@unique, ver o comentário do model).
 */
export interface IRoleAccountOverrideRepository {
  findLive(scope: BindingScope, tx?: Prisma.TransactionClient): Promise<RoleAccountOverrideWithCode[]>;
  findLiveByRole(scope: BindingScope, role: string, tx: Prisma.TransactionClient): Promise<RoleAccountOverride | null>;
  create(
    scope: BindingScope,
    data: { role: string; accountId: string; motivo: string },
    tx: Prisma.TransactionClient,
  ): Promise<RoleAccountOverride>;
  softDelete(scope: BindingScope, id: string, tx: Prisma.TransactionClient): Promise<void>;
  /** Compensação (emenda E-11.1): devolve à vida a linha que o passo desfeito tinha apagado. */
  revive(scope: BindingScope, id: string, tx: Prisma.TransactionClient): Promise<void>;
  runTransaction<T>(fn: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T>;
}

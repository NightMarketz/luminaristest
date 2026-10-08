import type { KitInstallation, Prisma } from 'generated/prisma';
import type { BindingScope } from '../../accountingBinding/repositories/IAccountingBindingRepository';
import type { KitInstallSteps } from '../dtos/KitInstallationDto';
import type { KitInstallStatus } from '../models/kitInstallTypes';

/**
 * Acesso a `kit_installations` (BE-INCR-KIT-SETOR, PR-2, item 9). Único lugar com `prisma.kitInstallation.*`.
 * Escopo = o mesmo `BindingScope` do `accountingBinding` (o kit instala o binding daquele escopo). Toda leitura
 * filtra `deletedAt: null`; uma linha por `(userId, unitId)`.
 */
export interface IKitInstallationRepository {
  findByScope(scope: BindingScope, tx?: Prisma.TransactionClient): Promise<KitInstallation | null>;

  /**
   * Abre (ou reabre) a instalação em `INSTALLING`. Sem linha ⇒ cria com `steps = {0, []}`; com linha `FAILED`
   * ou `INSTALLING` ⇒ só volta o status para `INSTALLING`, preservando `steps` (a retomada do item 10).
   */
  begin(
    scope: BindingScope,
    kit: { kitKey: string; kitVersion: number },
    tx?: Prisma.TransactionClient,
  ): Promise<KitInstallation>;

  /** Grava o passo concluído (commit próprio de cada passo). */
  saveSteps(scope: BindingScope, id: string, steps: KitInstallSteps, tx?: Prisma.TransactionClient): Promise<KitInstallation>;

  /** Fecha a instalação em `INSTALLED` (carimba `installedAt`) ou `FAILED`. */
  finish(
    scope: BindingScope,
    id: string,
    status: Exclude<KitInstallStatus, 'INSTALLING'>,
    steps: KitInstallSteps,
    tx?: Prisma.TransactionClient,
  ): Promise<KitInstallation>;

  runTransaction<T>(fn: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T>;
}

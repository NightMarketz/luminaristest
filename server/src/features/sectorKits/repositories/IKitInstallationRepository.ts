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

  /**
   * PR-4 (item 35): avança a versão instalada, CAS sobre `kitVersion = from` (outra execução que já avançou ⇒ 0).
   * Só roda quando (a)+(b) foram aplicados, mesmo com pendências abertas.
   */
  advanceVersion(scope: BindingScope, id: string, from: number, to: number, tx: Prisma.TransactionClient): Promise<number>;

  /** PR-4 (item 34): todas as instalações `INSTALLED` vivas, de todos os donos — o CLI do deploy filtra as atrasadas. */
  findAllInstalled(): Promise<KitInstallation[]>;

  runTransaction<T>(fn: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T>;
}

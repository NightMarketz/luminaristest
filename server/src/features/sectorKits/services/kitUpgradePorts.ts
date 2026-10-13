import type { TenantKitState } from './classifyKitDiff';

/**
 * Portas da atualização do kit (BE-INCR-KIT-SETOR, PR-4). Mesmo desenho das do PR-2 (`kitInstallPorts.ts`): o
 * `sectorKits` não importa `features/accounting`, então cada dado contábil chega por porta, com o adaptador real em
 * `lib/factory.ts` fechado sobre o escopo.
 */

/** O estado contábil do tenant que o diff lê (item 26). O binding Active e os ajustes vêm dos repos do próprio módulo. */
export interface KitTenantStatePort {
  /** `years` = as versões de referencial que o kit alvo traz (ano congelado e regime são lidos para elas). */
  load(years: string[]): Promise<Omit<TenantKitState, 'activeEventBindings' | 'overrides'>>;
}

/** Escritas que a atualização e o aceitar fazem fora do que a instalação já tinha (emendas E-12.2 e E-12.3). */
export interface KitUpgradeWritePort {
  /**
   * Forward `changed_account` (E-12.2): grava nome/natureza da conta viva, relendo "sem partida" DENTRO da tx.
   * `'in_use'` = ganhou partida desde o diff (nada gravado); `'missing'` = não está viva.
   */
  updateAccountIfUnused(code: string, data: { name: string; nature: string }): Promise<'updated' | 'in_use' | 'missing'>;
  /** Aceitar `account_deleted_by_user`: devolve à vida a conta apagada pelo tenant. `false` se não havia o que restaurar. */
  restoreAccount(code: string): Promise<boolean>;
  /** Desfaz o `restoreAccount` quando a recompilação reprova. */
  deleteAccount(code: string): Promise<void>;
  /** Aceitar `account_changed_in_use`: só o NOME (natureza com partida nunca muda). `false` se a conta não está viva. */
  renameAccount(code: string, name: string): Promise<boolean>;
  /** Aceitar `field_set_by_user`: grava por cima, pelo serviço dono (policy + gate do contador). */
  setScopeSettings(accountIds: Record<string, string>): Promise<string[]>;
  setFiscalProfile(accountIds: Record<string, string>): Promise<string[]>;
  /** Aceitar `referential_mapped_differently`: troca o mapeamento pelo `ReferentialMappingService.setMapping`. */
  setReferentialMapping(mappingVersion: string, item: { accountId: string; referentialCode: string; label: string }): Promise<void>;
}

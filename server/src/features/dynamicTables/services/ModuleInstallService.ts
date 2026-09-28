import type { UserContext } from '../../../lib/authUtils';
import { ValidationError } from '../../../lib/errors';
import logger from '../../../lib/logger';
import type { IDynamicTableRepository } from '../repositories/IDynamicTableRepository';
import type { PresetSyncService } from './PresetSyncService';
import { MODULE_REGISTRY, type ModuleKey } from '../presets/modules/registry';
import type { InstallModuleResult } from '../dtos/InstallModule.dto';

const PRESET_TABLE_KEY_PREFIX = '@@PRESET_TABLE_KEY::';

/**
 * ModuleInstallService — BE-INCR-CRM-MODULE-COMPOSITION (I8), comportamento 8: "ligar módulo depois".
 *
 * Orquestra as duas primitivas de runtime que já existem (`PresetSyncService.installTableFromPreset` e
 * `syncInstalledTableFromPreset`); não escreve em tabela nenhuma por conta própria.
 *  1. Dependência não instalada → 400 com o módulo faltante nomeado (mesma regra do comportamento 2).
 *  2. Todas as tabelas do módulo já existem → `already-installed` (idempotente, nada muda).
 *  3. Instala as tabelas do módulo na ordem do registro (cada instalação é idempotente).
 *  4. Roda o sync ADITIVO nas tabelas instaladas cujo preset tem relação para o módulo
 *     (ex.: `leads.accountId` → `crmAccounts`), restaurando o campo descartado na criação.
 */
export class ModuleInstallService {
  constructor(
    private readonly presetSyncService: PresetSyncService,
    private readonly repository: IDynamicTableRepository,
  ) {}

  private async isInstalled(user: UserContext, internalName: string): Promise<boolean> {
    return Boolean(await this.repository.findTableByInternalName(user.userId, internalName));
  }

  async installModule(user: UserContext, moduleKey: ModuleKey): Promise<InstallModuleResult> {
    const def = MODULE_REGISTRY[moduleKey];

    for (const dep of def.dependsOn) {
      for (const t of MODULE_REGISTRY[dep].tables) {
        if (!(await this.isInstalled(user, t))) {
          throw new ValidationError(`O módulo '${moduleKey}' exige o módulo '${dep}', que não está instalado.`, {
            module: moduleKey,
            missingModule: dep,
          });
        }
      }
    }

    const missing: string[] = [];
    for (const t of def.tables) if (!(await this.isInstalled(user, t))) missing.push(t);
    if (missing.length === 0) {
      return { status: 'already-installed', tables: [...def.tables], synced: [] };
    }

    for (const t of def.tables) await this.presetSyncService.installTableFromPreset(user, t);

    const moduleTables = new Set(def.tables);
    const synced: string[] = [];
    const installed = await this.repository.findTablesByUserId(user.userId);
    for (const table of installed) {
      const internalName = table.internalName;
      if (!internalName || moduleTables.has(internalName)) continue;
      const preset = this.presetSyncService.getPresetDefinitionForInternalName(internalName);
      const pointsAtModule = (preset?.schema.fields ?? []).some((f) => {
        const target = f.type === 'relation' ? f.relation?.targetTable : undefined;
        return typeof target === 'string' && target.startsWith(PRESET_TABLE_KEY_PREFIX) &&
          moduleTables.has(target.slice(PRESET_TABLE_KEY_PREFIX.length));
      });
      if (!pointsAtModule) continue;
      await this.presetSyncService.syncInstalledTableFromPreset(user, internalName);
      synced.push(internalName);
    }

    logger.info('ModuleInstall: module installed', { userId: user.userId, moduleKey, installed: missing, synced });
    return { status: 'installed', tables: [...def.tables], synced };
  }
}

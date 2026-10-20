import type { UserContext } from '../../../lib/authUtils';
import { IDynamicTable } from '../models/DynamicTable.model';

export interface IDynamicTablePolicy {
  canCreate(user: UserContext): boolean;
  canView(user: UserContext, table: IDynamicTable): boolean;
  canUpdate(user: UserContext, table: IDynamicTable): boolean;
  canDelete(user: UserContext, table: IDynamicTable): boolean;
  canManageData(user: UserContext, table: IDynamicTable): boolean;
  /**
   * Administração de presets num tenant já instalado — `sync-preset`, `install-table` e
   * `dashboard/modules/install` (estrutura de tabela, não dado). É a decisão que os services
   * `PresetSyncService`/`ModuleInstallService` consultam ANTES de qualquer leitura (policy-first).
   */
  canAdministerPresets(user: UserContext): boolean;
}

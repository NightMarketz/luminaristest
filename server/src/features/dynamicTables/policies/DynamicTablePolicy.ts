import type { UserContext } from '../../../lib/authUtils';
import { IDynamicTable, ITableSchema } from '../models/DynamicTable.model';
import { IDynamicTablePolicy } from './IDynamicTablePolicy';
import { Role } from '../../users/models/User.model';

export class DynamicTablePolicy implements IDynamicTablePolicy {
  // Ninguém pode criar tabelas via API. A criação é gerenciada pelo sistema.
  canCreate(user: UserContext): boolean {
    return false;
  }

  // Apenas o usuário associado ou um admin pode visualizar a tabela.
  canView(user: UserContext, table: IDynamicTable): boolean {
    return user.role === Role.ADMIN || user.userId === table.userId;
  }

  // Ninguém pode editar a estrutura de uma tabela via API.
  canUpdate(user: UserContext, table: IDynamicTable): boolean {
    return false;
  }

  // Ninguém pode deletar uma tabela via API.
  canDelete(user: UserContext, table: IDynamicTable): boolean {
    return false;
  }

  // A user can manage data (create, update, delete entries) in a table if they are the owner.
  //
  // System tables (e.g. analyticsDefinitions) are read-only for EVERYONE — owner and ADMIN
  // included, and internal callers too. There is NO write path around this:
  //   - `options.isSystem` does NOT unlock it. DynamicTableService.createTableData consults
  //     this policy at :514 and only derives `isSystem` at :529, fifteen lines after the
  //     throw; the flag serves enforceNoOverlap/runRules, never authorisation.
  //   - the `*AsSystem` family operates on tables/schemas/presets only — there is no
  //     `createTableDataAsSystem`, so no system process writes ROWS here either.
  // Consequence: POST/PUT/DELETE /api/analytics/definitions answer 403 to everyone, by
  // design, since baseline 0db3961. Ratified in docs/adr/ADR-ANALYTICS-DEFS-write-unblock.md
  // (fork F-AD0 → (c) keep frozen). Locked by DynamicTableService.systemTableWriteLock.test.ts —
  // treat any change here as a design reversal (policy + preset + 4 docs), never a patch.
  canManageData(user: UserContext, table: IDynamicTable): boolean {
    const presentation = (table.schema as ITableSchema)?.ui?.presentation;
    if (presentation === 'system') return false;
    return user.userId === table.userId;
  }
}

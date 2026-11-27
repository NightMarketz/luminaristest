/**
 * BE-INCR-ESCALA-BASE item 12 — leva a escala a uma instância que já existia antes dela.
 *
 * Usa as primitivas da sincronização de preset (`PresetSyncService`): instala as quatro tabelas novas do Core na ordem
 * das relações (`resources` → `schedules` → `scheduleShifts` → `scheduleExceptions`) e roda o sync ADITIVO nas tabelas
 * que ganharam campo (`units.timeZone`; `appointments.resourceId`/`availabilityOverride*`, itens 25 e 26). Cada passo é
 * idempotente; nenhuma linha existente muda.
 *
 * Itens 23 e 27 (emenda F-ESC-17/18 + rollout de esquema, commit 1db262968 do #1424): o sync de preset só leva campo
 * novo, opção e `immutableAfter`. O `readOnly` do `employees.workSchedule` e o `noOverlap` novo de `appointments` vão por
 * `applySchemaChanges` (`updateTableSchemaAsSystem`). F-ESC-18: `fillUnitTimeZones` grava o fuso padrão da borda (injetado)
 * nas unidades sem fuso.
 */
import type { UserContext } from '../../../lib/authUtils';
import logger from '../../../lib/logger';
import type { INoOverlapRule, ITableSchema } from '../../dynamicTables/models/DynamicTable.model';
import { appointmentsModule } from '../../dynamicTables/presets/modules/planning/AppointmentsModule';

/** O que este serviço usa do `PresetSyncService` (interface estreita, injetada pela factory). */
export interface PresetRolloutPort {
  installTableFromPreset(user: UserContext, internalName: string): Promise<{ tableId: string; created: boolean }>;
  syncInstalledTableFromPreset(user: UserContext, internalName: string): Promise<{ added: string[] }>;
}

/** Existe a tabela `internalName` para o dono? */
export interface InstalledTableLookup {
  findTableByInternalName(userId: string, internalName: string): Promise<{ id: string; schema?: unknown } | null>;
}

/** Itens 23 e 27: o patch de esquema e o fuso das unidades (a factory/o script ligam `DynamicTableService`/repositório). */
export interface SchemaRolloutPort {
  updateTableSchemaAsSystem(tableId: string, data: { schema: ITableSchema }, revalidateMode: 'full' | 'partial' | 'none'): Promise<unknown>;
}
export interface UnitRowsPort {
  findAllDataByTableId(tableId: string): Promise<Array<{ id: string; data: unknown }>>;
  updateTableData(user: UserContext, dataId: string, dto: { data: Record<string, unknown> }, options: { isSystem: boolean }): Promise<unknown>;
}

export const SCHEDULING_NEW_TABLES = ['resources', 'schedules', 'scheduleShifts', 'scheduleExceptions'] as const;
/** Tabelas que ganharam campo com a escala e que o sync aditivo leva (só se a instância as tem). */
export const SCHEDULING_SYNCED_TABLES = ['units', 'appointments'] as const;

/**
 * Itens 23 e 27 — o esquema instalado com as duas mudanças que o sync aditivo não leva; `null` quando já está igual.
 * `appointments` recebe só as regras de `noOverlap` do preset cujos campos já existem na tabela (o sync aditivo vem antes).
 */
export function patchSchemaForScheduling(internalName: string, schema: ITableSchema): ITableSchema | null {
  if (internalName === 'employees') {
    const ws = schema.fields.find((f) => f.name === 'workSchedule');
    if (!ws || ws.readOnly) return null;
    return { ...schema, fields: schema.fields.map((f) => (f.name === 'workSchedule' ? { ...f, readOnly: true } : f)) };
  }
  if (internalName === 'appointments') {
    const names = new Set(schema.fields.map((f) => f.name));
    const wanted: INoOverlapRule[] = (appointmentsModule.schema.noOverlap ?? []).filter((r) =>
      [r.startField, r.endField, ...(r.scopeFields ?? [])].every((f) => names.has(f)),
    );
    if (JSON.stringify(schema.noOverlap ?? []) === JSON.stringify(wanted)) return null;
    return { ...schema, noOverlap: wanted };
  }
  return null;
}
export const SCHEDULING_PATCHED_TABLES = ['employees', 'appointments'] as const;

export interface RolloutResult {
  installed: string[];
  synced: Array<{ table: string; added: string[] }>;
}

export class SchedulingRolloutService {
  constructor(
    private readonly presets: PresetRolloutPort,
    private readonly tables: InstalledTableLookup,
    private readonly schemas?: SchemaRolloutPort,
    private readonly unitRows?: UnitRowsPort,
  ) {}

  /** Itens 23 e 27. Mudança que nenhuma linha invalida (`readOnly`, `noOverlap`): revalidação `none`, como o sync aditivo. */
  async applySchemaChanges(user: UserContext): Promise<string[]> {
    if (!this.schemas) throw new Error('SchedulingRolloutService: SchemaRolloutPort ausente.');
    const patched: string[] = [];
    for (const t of SCHEDULING_PATCHED_TABLES) {
      const table = await this.tables.findTableByInternalName(user.userId, t);
      if (!table?.schema) continue;
      const next = patchSchemaForScheduling(t, table.schema as ITableSchema);
      if (!next) continue;
      await this.schemas.updateTableSchemaAsSystem(table.id, { schema: next }, 'none');
      patched.push(t);
    }
    logger.info('SchedulingRollout: esquema da escala aplicado', { userId: user.userId, patched });
    return patched;
  }

  /** F-ESC-18 — as unidades sem fuso (ou com fuso inválido) recebem o padrão da borda. Devolve quantas mudaram. */
  async fillUnitTimeZones(user: UserContext, defaultTimeZone: string, isValid: (tz: string) => boolean): Promise<number> {
    if (!this.unitRows) throw new Error('SchedulingRolloutService: UnitRowsPort ausente.');
    const units = await this.tables.findTableByInternalName(user.userId, 'units');
    if (!units) return 0;
    let filled = 0;
    for (const row of await this.unitRows.findAllDataByTableId(units.id)) {
      const tz = (row.data as Record<string, unknown> | null)?.timeZone;
      if (typeof tz === 'string' && isValid(tz)) continue;
      await this.unitRows.updateTableData(user, row.id, { data: { timeZone: defaultTimeZone } }, { isSystem: true });
      filled += 1;
    }
    logger.info('SchedulingRollout: fuso padrão nas unidades sem fuso', { userId: user.userId, filled });
    return filled;
  }

  async ensureInstalled(user: UserContext): Promise<RolloutResult> {
    const installed: string[] = [];
    for (const t of SCHEDULING_NEW_TABLES) {
      const r = await this.presets.installTableFromPreset(user, t);
      if (r.created) installed.push(t);
    }
    const synced: RolloutResult['synced'] = [];
    for (const t of SCHEDULING_SYNCED_TABLES) {
      if (!(await this.tables.findTableByInternalName(user.userId, t))) continue;
      const r = await this.presets.syncInstalledTableFromPreset(user, t);
      if (r.added.length > 0) synced.push({ table: t, added: r.added });
    }
    logger.info('SchedulingRollout: escala garantida na instância', { userId: user.userId, installed, synced });
    return { installed, synced };
  }
}

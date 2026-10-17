/**
 * Ledger de versões das DynamicTables — leitura, diff e restauração (BE-INCR-DT-VERSION-LEDGER, D-2026-10-17).
 *
 * Acesso: `canView` para ler (tabela inexistente OU invisível → 404, item 10), `canManageData` para restaurar.
 * A restauração NÃO escreve nada por conta própria: chama `DynamicTableService.updateTableData` (item 14), que
 * valida contra o schema atual, roda as regras e os plugins e grava a versão `RESTORE` na mesma tx.
 */
import type { UserContext } from '../../../lib/authUtils';
import { ConflictError, ForbiddenError, NotFoundError } from '../../../lib/errors';
import type { IDynamicTablePolicy } from '../policies/IDynamicTablePolicy';
import type { IDynamicTableRepository } from '../repositories/IDynamicTableRepository';
import type {
  IDynamicTableVersionRepository, RowVersionRecord, RowWithDeleted, SchemaVersionRecord,
} from '../repositories/DynamicTableVersionRepository';
import type { DynamicTableService } from './DynamicTableService';
import type { IDynamicTable, IDynamicTableData, ITableSchema } from '../models/DynamicTable.model';
import type {
  ListVersionsQuery, RowVersionDetail, RowVersionDiff, RowVersionList, RowVersionMeta, SchemaVersionDetail,
  SchemaVersionDiff, SchemaVersionList, SchemaVersionMeta,
} from '../dtos/DynamicTableVersion.dto';
import { diffRowData, diffSchemas } from '../utils/versionDiff';

type Against = number | 'current' | undefined;

export class DynamicTableVersionService {
  constructor(
    private readonly versions: IDynamicTableVersionRepository,
    private readonly tables: IDynamicTableRepository,
    private readonly policy: IDynamicTablePolicy,
    private readonly dynamicTables: DynamicTableService,
  ) {}

  // ── Resolução + acesso ──────────────────────────────────────────────────────

  private async visibleTable(user: UserContext, tableId: string): Promise<IDynamicTable> {
    const table = await this.tables.findTableById(tableId);
    if (!table || !this.policy.canView(user, table)) throw new NotFoundError('Table not found.');
    return table;
  }

  private async visibleRow(user: UserContext, tableId: string, dataId: string): Promise<{ table: IDynamicTable; row: RowWithDeleted }> {
    const table = await this.visibleTable(user, tableId);
    const row = await this.versions.findRowIncludingDeleted(dataId);
    if (!row || row.dynamicTableId !== table.id) throw new NotFoundError('Data entry not found.');
    return { table, row };
  }

  private async rowVersionOr404(dataId: string, version: number): Promise<RowVersionRecord> {
    const v = await this.versions.findRowVersion(dataId, version);
    if (!v) throw new NotFoundError(`Version ${version} not found.`);
    return v;
  }

  /**
   * Schema da versão `n`. Tabela anterior ao ledger que nunca mudou de schema não tem linha de versão: aí a
   * versão atual é a única que existiu (se tivesse mudado, o BASELINE teria sido gravado — item 7).
   */
  private async schemaAt(table: IDynamicTable, version: number): Promise<ITableSchema | null> {
    const v = await this.versions.findSchemaVersion(table.id, version);
    if (v) return v.schema as ITableSchema;
    return version === table.schemaVersion ? table.schema : null;
  }

  // ── Linhas ──────────────────────────────────────────────────────────────────

  async listRowVersions(user: UserContext, tableId: string, dataId: string, q: ListVersionsQuery): Promise<RowVersionList> {
    await this.visibleRow(user, tableId, dataId);
    const { rows, total } = await this.versions.listRowVersions(dataId, (q.page - 1) * q.limit, q.limit);
    return { data: rows.map(toRowMeta), total, page: q.page, limit: q.limit };
  }

  async getRowVersion(user: UserContext, tableId: string, dataId: string, version: number): Promise<RowVersionDetail> {
    const { table } = await this.visibleRow(user, tableId, dataId);
    const v = await this.rowVersionOr404(dataId, version);
    const schema = await this.schemaAt(table, v.schemaVersion);
    return { ...toRowMeta(v), data: asRecord(v.data), schema: (schema ?? {}) as Record<string, unknown> };
  }

  async diffRowVersion(user: UserContext, tableId: string, dataId: string, version: number, against: Against): Promise<RowVersionDiff> {
    const { table, row } = await this.visibleRow(user, tableId, dataId);
    const v = await this.rowVersionOr404(dataId, version);
    const vSchema = await this.schemaAt(table, v.schemaVersion);
    if (against === 'current') {
      const changes = diffRowData(asRecord(v.data), asRecord(row.data), { from: vSchema, to: table.schema });
      return { from: version, to: 'current', changes };
    }
    const fromVersion = against ?? (version > 1 ? version - 1 : null);
    if (fromVersion === null) {
      return { from: null, to: version, changes: diffRowData(null, asRecord(v.data), { from: null, to: vSchema }) };
    }
    const base = await this.rowVersionOr404(dataId, fromVersion);
    const baseSchema = await this.schemaAt(table, base.schemaVersion);
    return { from: fromVersion, to: version, changes: diffRowData(asRecord(base.data), asRecord(v.data), { from: baseSchema, to: vSchema }) };
  }

  /**
   * Item 14–17. 404 (tabela/linha/versão) · 409 `ROW_DELETED` (F-DTV-5 a) · 403 sem `canManageData` · 400 do
   * update (schema atual, regras, imutabilidade, transições) — nada gravado nesse caso.
   * L1 (dono, 2026-10-17): merge — campo que a versão não tinha fica com o valor atual.
   * L2 (dono, 2026-10-17): campos `readOnly` do schema ATUAL saem do snapshot (os plugins recalculam).
   */
  async restoreRowVersion(user: UserContext, tableId: string, dataId: string, version: number): Promise<IDynamicTableData> {
    const { table, row } = await this.visibleRow(user, tableId, dataId);
    if (!this.policy.canManageData(user, table)) {
      throw new ForbiddenError('You do not have permission to update data in this table.');
    }
    if (row.deletedAt) throw new ConflictError('Cannot restore a version of a deleted row.', 'ROW_DELETED');
    const v = await this.rowVersionOr404(dataId, version);
    const readOnly = new Set((table.schema?.fields ?? []).filter(f => f.readOnly).map(f => f.name));
    const snapshot = Object.fromEntries(Object.entries(asRecord(v.data)).filter(([k]) => !readOnly.has(k)));
    return this.dynamicTables.updateTableData(user, dataId, { data: snapshot }, { restoredFromVersion: version });
  }

  // ── Schema ──────────────────────────────────────────────────────────────────

  async listSchemaVersions(user: UserContext, tableId: string, q: ListVersionsQuery): Promise<SchemaVersionList> {
    await this.visibleTable(user, tableId);
    const { rows, total } = await this.versions.listSchemaVersions(tableId, (q.page - 1) * q.limit, q.limit);
    return { data: rows.map(toSchemaMeta), total, page: q.page, limit: q.limit };
  }

  async getSchemaVersion(user: UserContext, tableId: string, version: number): Promise<SchemaVersionDetail> {
    await this.visibleTable(user, tableId);
    const v = await this.versions.findSchemaVersion(tableId, version);
    if (!v) throw new NotFoundError(`Schema version ${version} not found.`);
    return { ...toSchemaMeta(v), schema: asRecord(v.schema) };
  }

  async diffSchemaVersion(user: UserContext, tableId: string, version: number, against: Against): Promise<SchemaVersionDiff> {
    const table = await this.visibleTable(user, tableId);
    const v = await this.versions.findSchemaVersion(tableId, version);
    if (!v) throw new NotFoundError(`Schema version ${version} not found.`);
    if (against === 'current') {
      return { from: version, to: 'current', changes: diffSchemas(v.schema as ITableSchema, table.schema) };
    }
    const fromVersion = against ?? (version > 1 ? version - 1 : null);
    if (fromVersion === null) return { from: null, to: version, changes: diffSchemas(null, v.schema as ITableSchema) };
    const base = await this.versions.findSchemaVersion(tableId, fromVersion);
    if (!base) throw new NotFoundError(`Schema version ${fromVersion} not found.`);
    return { from: fromVersion, to: version, changes: diffSchemas(base.schema as ITableSchema, v.schema as ITableSchema) };
  }
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function toRowMeta(v: RowVersionRecord): RowVersionMeta {
  return {
    version: v.version,
    op: v.op as RowVersionMeta['op'],
    schemaVersion: v.schemaVersion,
    actorUserId: v.actorUserId,
    origin: v.origin as RowVersionMeta['origin'],
    restoredFromVersion: v.restoredFromVersion,
    createdAt: v.createdAt.toISOString(),
  };
}

function toSchemaMeta(v: SchemaVersionRecord): SchemaVersionMeta {
  return {
    version: v.version,
    op: v.op as SchemaVersionMeta['op'],
    actorUserId: v.actorUserId,
    origin: v.origin as SchemaVersionMeta['origin'],
    createdAt: v.createdAt.toISOString(),
  };
}

import type { Prisma } from 'generated/prisma';
import { IDynamicTable, IDynamicTableData, FieldEquals } from '../models/DynamicTable.model';
import { CreateDynamicTableDtoType, UpdateDynamicTableDtoType, UpdateDynamicTableSchemaDtoType } from '../dtos/DynamicTable.dto';
import type { VersionWriteContext } from './versionContext';

export interface IDynamicTableRepository {
  /**
   * BE-INCR-DT-VERSION-LEDGER (F-DTV-1 a): o mesmo repo (mesmo client/tx), assinando as versões com `ctx`.
   * Opcional só para os dublês de teste; o repositório real implementa. Use `withVersionContext()`
   * de `versionLedger.ts`, que tolera a ausência.
   */
  withVersionContext?(ctx: VersionWriteContext): IDynamicTableRepository;

  // ── Transação (seam único do motor — Contrato §2, R4/R9) ─────────────────────
  /**
   * O mesmo repositório ligado ao client de transação interativa `tx` (mesmo contexto de versão).
   * É assim que o service compõe escritas atômicas com uma tx que veio de fora (`options.tx`) sem
   * instanciar repositório: quem conhece o Prisma é só esta camada.
   */
  withTransaction(tx: Prisma.TransactionClient): IDynamicTableRepository;
  /**
   * Abre uma transação interativa e entrega a `fn` um repositório ligado a ela mais o próprio `tx`
   * (para a única escrita fora do motor permitida dentro dela — o marco T0 do `installPresetAsSystem`).
   * Reentrante: chamado num repositório já ligado a uma tx, reusa essa tx (Prisma/SQLite não aninham).
   */
  runInTransaction<T>(
    fn: (repo: IDynamicTableRepository, tx: Prisma.TransactionClient) => Promise<T>,
    options?: { timeout?: number; maxWait?: number },
  ): Promise<T>;

  // Table operations
  createTable(userId: string, data: CreateDynamicTableDtoType): Promise<IDynamicTable>;
  findTableById(tableId: string): Promise<IDynamicTable | null>;
  findTableByName(userId: string, name: string): Promise<IDynamicTable | null>;
  findTableByInternalName(userId: string, internalName: string): Promise<IDynamicTable | null>;
  findTablesByUserId(userId: string): Promise<IDynamicTable[]>;
  updateTable(tableId: string, data: UpdateDynamicTableDtoType): Promise<IDynamicTable>;
  updateTableSchema(tableId: string, data: UpdateDynamicTableSchemaDtoType): Promise<IDynamicTable>;
  /**
   * Hard delete POR DESENHO (não é dívida de soft-delete): `DynamicTable` não tem `deletedAt`; apagar a
   * definição é purga, e leva linhas e versões por cascade de FK (F-DTV-4 a — LGPD art. 16 caput / art. 18 VI).
   * Só os caminhos de sistema chamam (`deleteTableAsSystem`, reset da conta); a policy nega ao usuário.
   */
  deleteTable(tableId: string): Promise<void>;
  /** Purga de conta/reset (hard delete por desenho — ver `deleteTable`). */
  deleteTablesByUserId(userId: string): Promise<void>;

  // Data operations
  createData(tableId: string, data: Record<string, unknown>): Promise<IDynamicTableData>;
  findDataById(dataId: string): Promise<IDynamicTableData | null>;
  findDataByIds(dataIds: string[]): Promise<IDynamicTableData[]>;
  findDataByTableId(tableId: string, page?: number, limit?: number): Promise<{ data: IDynamicTableData[]; total: number }>;
  /** Internal use only — returns ALL rows without pagination for validation/analytics. */
  findAllDataByTableId(tableId: string): Promise<IDynamicTableData[]>;
  findDataBatchStreamByTableId(tableId: string, batchSize?: number): AsyncGenerator<IDynamicTableData[]>;
  updateData(dataId: string, data: Record<string, unknown>): Promise<IDynamicTableData>;
  /** Soft delete (`deletedAt`) + versão `DELETE` no ledger. */
  deleteData(dataId: string): Promise<void>;
  /**
   * Purga de conta/reset: apaga de fato (hard) todas as linhas das tabelas do usuário — inclusive as já
   * soft-deletadas. Hard delete por desenho (ver `deleteTable`); nunca é caminho de usuário.
   */
  deleteAllDataByUserId(userId: string): Promise<void>;

  // Métodos para validação avançada
  countByFieldValue(tableId: string, fieldName: string, value: unknown, excludeId?: string): Promise<number>;
  /** Composite uniqueness probe (GovernanceEngine): counts live rows matching ALL given field/value pairs. */
  countByCompositeFieldValues(tableId: string, fields: Array<{ name: string; value: unknown }>, excludeId?: string): Promise<number>;
  countOverlaps(
    tableId: string,
    startField: string,
    endField: string,
    startValue: string,
    endValue: string,
    scope: Array<{ field: string; value: string }>,
    excludeId?: string,
  ): Promise<number>;
  findRowsByFieldValue(tableId: string, fieldName: string, value: string): Promise<IDynamicTableData[]>;
  /**
   * Same as `findRowsByFieldValue`, plus a mandatory `updatedAtFrom` floor (`updatedAt >=
   * updatedAtFrom`) — a SIBLING method, not an optional param on the existing one, so the
   * 15+ existing call sites of `findRowsByFieldValue` are untouched (BRIEF-W2-F). Used by the
   * accountingSyncReconcile job's trailing watermark — pass a `Date` object (not an ISO
   * string): SQLite stores `updatedAt` with NUMERIC affinity (Prisma writes DateTime as a
   * ms-epoch integer), so a `Date` parameter round-trips correctly through Prisma's raw-query
   * type mapping while a literal ISO string compares as text and silently matches nothing.
   */
  findRowsByFieldValueSince(
    tableId: string,
    fieldName: string,
    value: string,
    updatedAtFrom: Date,
  ): Promise<IDynamicTableData[]>;
  /**
   * Linhas não apagadas cujo JSON casa TODAS as igualdades tipadas de `filters` (sem filtro = todas),
   * mais recentes primeiro, até `limit`; `total` conta todas as que casam (mesmo WHERE, sem LIMIT).
   * `filters[].name` tem de vir validado contra o schema (BRIEF BE-INCR-CHAT-AGENT §2.2).
   */
  findDataByFieldEquals(tableId: string, filters: FieldEquals[], limit: number): Promise<{ rows: IDynamicTableData[]; total: number }>;
  existsByIdInTable(dataId: string, tableId: string): Promise<boolean>;

  /**
   * BE-INCR-SCOPE-UNIT-GUARD (nó I6, BRIEF item 2): estado da linha `unitId` na tabela `internalName === 'units'` do
   * dono. `null` se a linha não existe, é de outra tabela ou de outro dono; `'deleted'` se soft-deleted; `'live'` senão.
   */
  findUnitRowState(ownerUserId: string, unitId: string): Promise<'live' | 'deleted' | null>;

  /**
   * Finds the parent table of a given data entry ID.
   * Useful for permission checks where you only have the dataId.
   */
  findTableByDataId(dataId: string): Promise<IDynamicTable | null>;

  /**
   * Counts the number of tables a user has, grouped by category.
   * @param userId The ID of the user.
   * @returns A promise that resolves to an array of objects, each containing a category and the count of tables in it.
   */
  countTablesByCategory(userId: string): Promise<{ category: string; count: number }[]>;

  /**
   * Lists tables of `userId` whose schema contains a relation to the provided tableId.
   * Used to prevent deleting tables that are referenced by others. Always tenant-scoped.
   */
  findTablesReferencingTableId(targetTableId: string, userId: string): Promise<IDynamicTable[]>;

  /**
   * Returns ALL rows in `tableId` where the JSON field `fieldName` references `targetId`
   * (exact scalar match OR element inside a JSON array). Unbounded (no LIMIT): it drives the
   * delete-constraint scan, where truncation would under-count RESTRICT_IF_AGGREGATE or orphan
   * CASCADE children.
   */
  findRowsReferencingId(tableId: string, fieldName: string, targetId: string): Promise<IDynamicTableData[]>;

}

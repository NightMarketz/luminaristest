import prisma from '../../../lib/prisma';
import type { DynamicTable, DynamicTableData, PrismaClient } from 'generated/prisma';
import { Prisma } from 'generated/prisma';
import { IDynamicTable, IDynamicTableData, ITableSchema, ISchemaField, FieldEquals } from '../models/DynamicTable.model';
import { fieldEqualsWhere } from './fieldEqualsSql';
import { CreateDynamicTableDtoType, UpdateDynamicTableDtoType, UpdateDynamicTableSchemaDtoType } from '../dtos/DynamicTable.dto';
import { IDynamicTableRepository } from './IDynamicTableRepository';
import {
  SYSTEM_VERSION_CONTEXT, createTableVersioned, updateSchemaVersioned, createDataVersioned, updateDataVersioned,
  softDeleteDataVersioned, type VersionWriteContext,
} from './versionLedger';

/** O client raiz (abre transações) ou um client de transação interativa (já dentro de uma). */
type DbClient = PrismaClient | Prisma.TransactionClient;

/**
 * Único repositório do motor DynamicTable. O MESMO código roda fora e dentro de uma transação: o
 * construtor aceita o client raiz (padrão, singleton) ou um client de tx interativa, e `withTransaction`
 * / `runInTransaction` são o seam que o service usa — ele nunca instancia repositório nem vê o Prisma.
 * (A antiga classe `TransactionalDynamicTableRepository` era uma cópia desta com dois desvios reais —
 * `LIMIT 100` no scan de referências e `findTablesReferencingTableId` sem tenant — e foi removida.)
 */
export class DynamicTableRepository implements IDynamicTableRepository {
  constructor(
    private readonly client: DbClient = prisma,
    /** BE-INCR-DT-VERSION-LEDGER (F-DTV-1 a): quem assina as versões gravadas por este repo. */
    private readonly versionCtx: VersionWriteContext = SYSTEM_VERSION_CONTEXT,
  ) {}

  withVersionContext(ctx: VersionWriteContext): DynamicTableRepository {
    return new DynamicTableRepository(this.client, ctx);
  }

  withTransaction(tx: Prisma.TransactionClient): DynamicTableRepository {
    return new DynamicTableRepository(tx, this.versionCtx);
  }

  /** O client raiz, ou `null` quando este repo já está ligado a uma transação. */
  private rootClient(): PrismaClient | null {
    return '$transaction' in this.client ? this.client : null;
  }

  async runInTransaction<T>(
    fn: (repo: IDynamicTableRepository, tx: Prisma.TransactionClient) => Promise<T>,
    options?: { timeout?: number; maxWait?: number },
  ): Promise<T> {
    const root = this.rootClient();
    // Reentrância: já dentro de uma tx — reusa (Prisma/SQLite não aninham transações interativas).
    if (!root) return fn(this, this.client as Prisma.TransactionClient);
    return root.$transaction(tx => fn(this.withTransaction(tx), tx), options);
  }

  /**
   * D3: escrita + versão na mesma tx. Com o client raiz abre uma `$transaction`; com um client de tx
   * (sem `$transaction`) roda nele mesmo.
   */
  private inTx<T>(fn: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
    const root = this.rootClient();
    return root ? root.$transaction(fn) : fn(this.client as Prisma.TransactionClient);
  }

  private toDomainTable(row: DynamicTable): IDynamicTable {
    return {
      ...row,
      schema: (row.schema as unknown) as ITableSchema,
    };
  }

  async createTable(userId: string, data: CreateDynamicTableDtoType): Promise<IDynamicTable> {
    const row = await this.inTx(tx => createTableVersioned(tx, {
      userId,
      name: data.name,
      internalName: data.internalName,
      category: data.category,
      schema: data.schema as unknown as Prisma.InputJsonValue,
    }, this.versionCtx));
    return this.toDomainTable(row);
  }

  async findTableById(tableId: string): Promise<IDynamicTable | null> {
    const row = await this.client.dynamicTable.findUnique({ where: { id: tableId } });
    return row ? this.toDomainTable(row) : null;
  }

  async findTableByName(userId: string, name: string): Promise<IDynamicTable | null> {
    const row = await this.client.dynamicTable.findFirst({
      where: {
        userId,
        name: {
          equals: name,
        },
      },
    });
    return row ? this.toDomainTable(row) : null;
  }

  async findTableByInternalName(userId: string, internalName: string): Promise<IDynamicTable | null> {
    const row = await this.client.dynamicTable.findFirst({
      where: {
        userId,
        internalName: {
          equals: internalName,
        },
      },
    });
    return row ? this.toDomainTable(row) : null;
  }

  async findTablesByUserId(userId: string): Promise<IDynamicTable[]> {
    const rows = await this.client.dynamicTable.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map(r => this.toDomainTable(r));
  }

  async updateTable(tableId: string, data: UpdateDynamicTableDtoType): Promise<IDynamicTable> {
    const row = await this.client.dynamicTable.update({
      where: { id: tableId },
      data: { name: data.name },
    });
    return this.toDomainTable(row);
  }

  /** Hard delete por desenho — ver o contrato em `IDynamicTableRepository.deleteTable`. */
  async deleteTable(tableId: string): Promise<void> {
    await this.client.dynamicTable.delete({ where: { id: tableId } });
  }

  /** Hard delete por desenho (purga de conta/reset) — ver `IDynamicTableRepository.deleteTable`. */
  async deleteTablesByUserId(userId: string): Promise<void> {
    await this.client.dynamicTable.deleteMany({ where: { userId } });
  }

  async createData(tableId: string, data: Record<string, unknown>): Promise<IDynamicTableData> {
    return this.inTx(tx => createDataVersioned(tx, tableId, data, this.versionCtx));
  }

  async findDataById(dataId: string): Promise<IDynamicTableData | null> {
    return this.client.dynamicTableData.findFirst({ where: { id: dataId, deletedAt: null } });
  }

  async findDataByIds(dataIds: string[]): Promise<IDynamicTableData[]> {
    return this.client.dynamicTableData.findMany({
      where: { id: { in: dataIds }, deletedAt: null }
    });
  }

  async findDataByTableId(tableId: string, page: number = 1, limit: number = 50): Promise<{ data: IDynamicTableData[]; total: number }> {
    const safeLimit = Math.min(Math.max(1, limit), 200);
    const safePage = Math.max(1, page);
    const skip = (safePage - 1) * safeLimit;

    const where = { dynamicTableId: tableId, deletedAt: null };

    const [data, total] = await Promise.all([
      this.client.dynamicTableData.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: safeLimit,
      }),
      this.client.dynamicTableData.count({ where }),
    ]);

    return { data, total };
  }

  async findAllDataByTableId(tableId: string): Promise<IDynamicTableData[]> {
    return this.client.dynamicTableData.findMany({
      where: { dynamicTableId: tableId, deletedAt: null },
      orderBy: { createdAt: 'desc' },
    });
  }

  async *findDataBatchStreamByTableId(tableId: string, batchSize: number = 1000): AsyncGenerator<IDynamicTableData[]> {
    let lastCursorId: string | undefined = undefined;

    while (true) {
      const batch: IDynamicTableData[] = await this.client.dynamicTableData.findMany({
        where: { dynamicTableId: tableId, deletedAt: null },
        take: batchSize,
        skip: lastCursorId ? 1 : 0,
        cursor: lastCursorId ? { id: lastCursorId } : undefined,
        orderBy: { id: 'asc' }, // MUST be properly ordered by a unique sequential field for cursor pagination
      });

      if (batch.length === 0) break;

      yield batch;

      lastCursorId = batch[batch.length - 1].id;
    }
  }

  async updateData(dataId: string, data: Record<string, unknown>): Promise<IDynamicTableData> {
    return this.inTx(tx => updateDataVersioned(tx, dataId, data, this.versionCtx));
  }

  async deleteData(dataId: string): Promise<void> {
    await this.inTx(tx => softDeleteDataVersioned(tx, dataId, this.versionCtx));
  }

  /** Hard delete por desenho (purga de conta/reset) — ver `IDynamicTableRepository.deleteAllDataByUserId`. */
  async deleteAllDataByUserId(userId: string): Promise<void> {
    await this.client.dynamicTableData.deleteMany({
      where: {
        dynamicTable: {
          userId: userId,
        },
      },
    });
  }

  public async countTablesByCategory(userId: string): Promise<{ category: string; count: number }[]> {
    const result = await this.client.dynamicTable.groupBy({
      by: ['category'],
      where: {
        userId: userId,
      },
      _count: {
        category: true,
      },
    });

    return result.map((item: { category: string; _count: { category: number } }) => ({
      category: item.category,
      count: item._count.category,
    }));
  }

  async findTableByDataId(dataId: string): Promise<IDynamicTable | null> {
    const dataEntry = await this.client.dynamicTableData.findFirst({
      where: { id: dataId, deletedAt: null },
      include: { dynamicTable: true },
    });
    return dataEntry?.dynamicTable ? this.toDomainTable(dataEntry.dynamicTable) : null;
  }

  async updateTableSchema(tableId: string, data: UpdateDynamicTableSchemaDtoType): Promise<IDynamicTable> {
    const updatedTable = await this.inTx(tx => updateSchemaVersioned(tx, tableId, data.schema, this.versionCtx));
    return this.toDomainTable(updatedTable);
  }

  async countByFieldValue(tableId: string, fieldName: string, value: unknown, excludeId?: string): Promise<number> {
    // O caminho do campo JSON é construído dinamicamente, mas `fieldName` é validado
    // contra nosso schema, então é seguro.
    const jsonFieldPath = `$.${fieldName}`;

    const whereConditions: Prisma.Sql[] = [
      Prisma.sql`"dynamicTableId" = ${tableId}`,
      Prisma.sql`"deletedAt" IS NULL`,
      Prisma.sql`json_extract(data, ${jsonFieldPath}) = ${value}`,
    ];

    if (excludeId) {
      whereConditions.push(Prisma.sql`id != ${excludeId}`);
    }

    const whereClause = Prisma.join(whereConditions, ' AND ');

    const result: [{ count: bigint }] = await this.client.$queryRaw(
      Prisma.sql`SELECT COUNT(*) as count FROM "dynamic_table_data" WHERE ${whereClause}`
    );

    return Number(result[0].count);
  }

  /**
   * Counts rows where ALL provided fields match their values (composite uniqueness).
   * Indexed equivalent of `findDataByTableId(...).filter(...)` filtering in memory.
   * Field names come from the schema (trusted); values are bound parameters.
   * Compares as TEXT to match the prior `String(a) === String(b)` semantics; JSON booleans are
   * stored by SQLite's json_extract as 1/0, so they are compared as integers.
   */
  async countByCompositeFieldValues(tableId: string, fields: Array<{ name: string; value: unknown }>, excludeId?: string): Promise<number> {
    const whereConditions: Prisma.Sql[] = [
      Prisma.sql`"dynamicTableId" = ${tableId}`,
      Prisma.sql`"deletedAt" IS NULL`,
    ];

    for (const f of fields) {
      const path = `$.${f.name}`;
      whereConditions.push(
        typeof f.value === 'boolean'
          ? Prisma.sql`json_extract(data, ${path}) = ${f.value ? 1 : 0}`
          : Prisma.sql`CAST(json_extract(data, ${path}) AS TEXT) = ${String(f.value)}`,
      );
    }

    if (excludeId) {
      whereConditions.push(Prisma.sql`id != ${excludeId}`);
    }

    const whereClause = Prisma.join(whereConditions, ' AND ');

    const result: [{ count: bigint }] = await this.client.$queryRaw(
      Prisma.sql`SELECT COUNT(*) as count FROM "dynamic_table_data" WHERE ${whereClause}`
    );

    return Number(result[0].count);
  }

  /**
   * Counts existing rows whose [startField, endField] interval overlaps the given
   * [startValue, endValue], optionally scoped by equality on additional JSON fields.
   * Half-open overlap: existing.start < newEnd AND existing.end > newStart.
   * Uses datetime() to normalize ISO date/datetime strings before comparison.
   * Field names come from the schema (trusted), values are bound parameters.
   */
  async countOverlaps(
    tableId: string,
    startField: string,
    endField: string,
    startValue: string,
    endValue: string,
    scope: Array<{ field: string; value: string }>,
    excludeId?: string,
  ): Promise<number> {
    const where: Prisma.Sql[] = [
      Prisma.sql`"dynamicTableId" = ${tableId}`,
      Prisma.sql`"deletedAt" IS NULL`,
      Prisma.sql`datetime(json_extract(data, ${`$.${startField}`})) < datetime(${endValue})`,
      Prisma.sql`datetime(json_extract(data, ${`$.${endField}`})) > datetime(${startValue})`,
    ];

    for (const s of scope) {
      where.push(Prisma.sql`json_extract(data, ${`$.${s.field}`}) = ${s.value}`);
    }

    if (excludeId) {
      where.push(Prisma.sql`id != ${excludeId}`);
    }

    const whereClause = Prisma.join(where, ' AND ');

    const result: [{ count: bigint }] = await this.client.$queryRaw(
      Prisma.sql`SELECT COUNT(*) as count FROM "dynamic_table_data" WHERE ${whereClause}`
    );

    return Number(result[0].count);
  }

  /**
   * Returns ALL non-deleted rows of a table whose JSON `fieldName` equals `value`.
   * Indexed equivalent of `findDataByTableId(...).filter(r => r.data[field] === value)`,
   * without loading the whole table. Unlike `findRowsReferencingId`, it has NO LIMIT —
   * safe for business collections (sale items, commissions) where truncation would
   * corrupt aggregates. Scalar match only. Preserves `ORDER BY createdAt DESC` for parity.
   */
  async findRowsByFieldValue(tableId: string, fieldName: string, value: string): Promise<IDynamicTableData[]> {
    const jsonFieldPath = `$.${fieldName}`;
    const rows: IDynamicTableData[] = await this.client.$queryRaw(
      Prisma.sql`
        SELECT * FROM "dynamic_table_data"
        WHERE "dynamicTableId" = ${tableId}
          AND "deletedAt" IS NULL
          AND json_extract(data, ${jsonFieldPath}) = ${value}
        ORDER BY "createdAt" DESC
      `
    );
    return rows;
  }

  /**
   * `findRowsByFieldValue` + a mandatory `updatedAt >= updatedAtFrom` floor (BRIEF-W2-F —
   * accountingSyncReconcile job's trailing watermark). Sibling method, not an optional param
   * on `findRowsByFieldValue`, so its 15+ other call sites are untouched. `updatedAtFrom` MUST
   * be passed as a `Date` — Prisma's raw-query parameter binding serializes it to match the
   * column's actual SQLite storage (NUMERIC affinity, ms-epoch integer); a literal ISO string
   * compares as text against that integer and silently matches zero rows.
   */
  async findRowsByFieldValueSince(
    tableId: string,
    fieldName: string,
    value: string,
    updatedAtFrom: Date,
  ): Promise<IDynamicTableData[]> {
    const jsonFieldPath = `$.${fieldName}`;
    const rows: IDynamicTableData[] = await this.client.$queryRaw(
      Prisma.sql`
        SELECT * FROM "dynamic_table_data"
        WHERE "dynamicTableId" = ${tableId}
          AND "deletedAt" IS NULL
          AND json_extract(data, ${jsonFieldPath}) = ${value}
          AND "updatedAt" >= ${updatedAtFrom}
        ORDER BY "createdAt" DESC
      `
    );
    return rows;
  }

  async findDataByFieldEquals(tableId: string, filters: FieldEquals[], limit: number): Promise<{ rows: IDynamicTableData[]; total: number }> {
    const where = fieldEqualsWhere(tableId, filters);
    const [countRow]: [{ count: bigint }] = await this.client.$queryRaw(
      Prisma.sql`SELECT COUNT(*) as count FROM "dynamic_table_data" WHERE ${where}`
    );
    const ids: Array<{ id: string }> = await this.client.$queryRaw(
      Prisma.sql`SELECT id FROM "dynamic_table_data" WHERE ${where} ORDER BY "createdAt" DESC LIMIT ${limit}`
    );
    // Linhas pelo client tipado (data como JSON, datas como Date), na ordem do SELECT acima.
    const rows = ids.length
      ? await this.client.dynamicTableData.findMany({ where: { id: { in: ids.map(r => r.id) } }, orderBy: { createdAt: 'desc' } })
      : [];
    return { rows, total: Number(countRow.count) };
  }

  async existsByIdInTable(dataId: string, tableId: string): Promise<boolean> {
    const count = await this.client.dynamicTableData.count({
      where: {
        id: dataId,
        dynamicTableId: tableId,
        deletedAt: null,
      },
    });
    return count > 0;
  }

  async findUnitRowState(ownerUserId: string, unitId: string): Promise<'live' | 'deleted' | null> {
    // Uma consulta por PK com a tabela-mãe (padrão de rekeyLegacyUnitCli.classify): o dono e o internalName vêm dela.
    const row = await this.client.dynamicTableData.findUnique({ where: { id: unitId }, include: { dynamicTable: true } });
    if (!row || row.dynamicTable.userId !== ownerUserId || row.dynamicTable.internalName !== 'units') return null;
    return row.deletedAt ? 'deleted' : 'live';
  }

  async findTablesReferencingTableId(targetTableId: string, userId: string): Promise<IDynamicTable[]> {
    // Busca as tabelas do usuário e filtra por schemas que contenham relação apontando para targetTableId
    const rows = await this.client.dynamicTable.findMany({ where: { userId } });
    const result: IDynamicTable[] = [];
    for (const row of rows) {
      const table = this.toDomainTable(row);
      const fields = (table.schema?.fields || []) as ISchemaField[];
      const hasReference = fields.some((f: ISchemaField) => f?.type === 'relation' && f?.relation?.targetTable === targetTableId);
      if (hasReference) {
        result.push(table);
      }
    }
    return result;
  }

  async findRowsReferencingId(
    tableId: string,
    fieldName: string,
    targetId: string
  ): Promise<IDynamicTableData[]> {
    // Uses json_extract (SQLite) to find rows where the JSON field equals targetId
    // OR where the field is a JSON array containing targetId.
    // NO LIMIT: this drives the delete-constraint scan in DynamicTableService.checkDeleteRules.
    // Truncating would corrupt RESTRICT_IF_AGGREGATE sums (partial total → wrongly allows the
    // delete) and CASCADE (referencing rows beyond the cap left as orphans). The result set is
    // bounded by real referencing data and the scan already runs inside the delete transaction.
    const jsonScalarPath = `$.${fieldName}`;
    const likePattern = `%"${targetId}"%`;

    const rows: IDynamicTableData[] = await this.client.$queryRaw(
      Prisma.sql`
        SELECT *
        FROM "dynamic_table_data"
        WHERE "dynamicTableId" = ${tableId}
          AND "deletedAt" IS NULL
          AND (
            json_extract(data, ${jsonScalarPath}) = ${targetId}
            OR (json_type(data, ${jsonScalarPath}) = 'array' AND data LIKE ${likePattern})
          )
      `
    );
    return rows;
  }
}

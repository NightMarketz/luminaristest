/**
 * Leitura do ledger de versões (BE-INCR-DT-VERSION-LEDGER item 18). SÓ leitura: a escrita das versões vive
 * dentro dos repositórios de DT (`versionLedger.ts`), na mesma tx da linha — este repo não tem write.
 */
import prisma from '../../../lib/prisma';
import type { Prisma } from 'generated/prisma';

export interface RowVersionRecord {
  version: number;
  op: string;
  data: unknown;
  schemaVersion: number;
  actorUserId: string | null;
  origin: string;
  restoredFromVersion: number | null;
  createdAt: Date;
}

export interface SchemaVersionRecord {
  version: number;
  op: string;
  schema: unknown;
  actorUserId: string | null;
  origin: string;
  createdAt: Date;
}

export interface RowWithDeleted {
  id: string;
  dynamicTableId: string;
  data: unknown;
  deletedAt: Date | null;
}

export interface IDynamicTableVersionRepository {
  /** Inclui linha soft-deletada (item 10: o histórico de linha apagada continua legível). */
  findRowIncludingDeleted(dataId: string): Promise<RowWithDeleted | null>;
  listRowVersions(dataId: string, skip: number, take: number): Promise<{ rows: RowVersionRecord[]; total: number }>;
  findRowVersion(dataId: string, version: number): Promise<RowVersionRecord | null>;
  listSchemaVersions(tableId: string, skip: number, take: number): Promise<{ rows: SchemaVersionRecord[]; total: number }>;
  findSchemaVersion(tableId: string, version: number): Promise<SchemaVersionRecord | null>;
}

const ROW_SELECT = {
  version: true, op: true, data: true, schemaVersion: true, actorUserId: true, origin: true,
  restoredFromVersion: true, createdAt: true,
} as const;
const SCHEMA_SELECT = { version: true, op: true, schema: true, actorUserId: true, origin: true, createdAt: true } as const;

export class DynamicTableVersionRepository implements IDynamicTableVersionRepository {
  constructor(private readonly client: Prisma.TransactionClient = prisma) {}

  async findRowIncludingDeleted(dataId: string): Promise<RowWithDeleted | null> {
    return this.client.dynamicTableData.findUnique({
      where: { id: dataId },
      select: { id: true, dynamicTableId: true, data: true, deletedAt: true },
    });
  }

  async listRowVersions(dataId: string, skip: number, take: number): Promise<{ rows: RowVersionRecord[]; total: number }> {
    const [rows, total] = await Promise.all([
      this.client.dynamicTableRowVersion.findMany({ where: { dataId }, orderBy: { version: 'desc' }, skip, take, select: ROW_SELECT }),
      this.client.dynamicTableRowVersion.count({ where: { dataId } }),
    ]);
    return { rows, total };
  }

  async findRowVersion(dataId: string, version: number): Promise<RowVersionRecord | null> {
    return this.client.dynamicTableRowVersion.findUnique({ where: { dataId_version: { dataId, version } }, select: ROW_SELECT });
  }

  async listSchemaVersions(tableId: string, skip: number, take: number): Promise<{ rows: SchemaVersionRecord[]; total: number }> {
    const [rows, total] = await Promise.all([
      this.client.dynamicTableSchemaVersion.findMany({ where: { dynamicTableId: tableId }, orderBy: { version: 'desc' }, skip, take, select: SCHEMA_SELECT }),
      this.client.dynamicTableSchemaVersion.count({ where: { dynamicTableId: tableId } }),
    ]);
    return { rows, total };
  }

  async findSchemaVersion(tableId: string, version: number): Promise<SchemaVersionRecord | null> {
    return this.client.dynamicTableSchemaVersion.findUnique({
      where: { dynamicTableId_version: { dynamicTableId: tableId, version } },
      select: SCHEMA_SELECT,
    });
  }
}

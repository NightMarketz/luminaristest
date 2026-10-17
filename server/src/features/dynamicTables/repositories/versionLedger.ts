/**
 * Ledger de versões das DynamicTables — escrita (BE-INCR-DT-VERSION-LEDGER, D-2026-10-17).
 *
 * Só os dois repositórios de DT chamam estas funções, sempre com o MESMO client da escrita da linha/schema
 * (D3: append-only, na mesma tx). Não há update nem delete de versão em lugar nenhum; as versões somem só por
 * cascade de FK junto com a linha/tabela (F-DTV-4 a — LGPD art. 16 caput / art. 18 VI).
 *
 * Numeração (item 4): `max + 1` lido dentro da tx; `@@unique([dataId, version])` /
 * `@@unique([dynamicTableId, version])` é a última palavra — colisão vira P2002 e derruba a tx inteira,
 * inclusive a escrita da linha.
 */
import { Prisma } from 'generated/prisma';
import type { IDynamicTableRepository } from './IDynamicTableRepository';
import {
  SYSTEM_VERSION_CONTEXT, type RowVersionOp, type SchemaVersionOp, type VersionWriteContext,
} from './versionContext';

export { SYSTEM_VERSION_CONTEXT };
export type { VersionOrigin, RowVersionOp, SchemaVersionOp, VersionWriteContext } from './versionContext';

/** Repo com outro contexto de versão (mesmo client). Repo sem suporte (dublê de teste) volta como está. */
export function withVersionContext(repo: IDynamicTableRepository, ctx: VersionWriteContext): IDynamicTableRepository {
  return repo.withVersionContext ? repo.withVersionContext(ctx) : repo;
}

/** Contexto que os plugins recebem: mesmo ator, origem RULE, nunca RESTORE. */
export function ruleContextOf(ctx: VersionWriteContext): VersionWriteContext {
  return { actorUserId: ctx.actorUserId, origin: 'RULE' };
}

type Db = Prisma.TransactionClient;

function asJson(value: unknown): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue;
}

async function nextRowVersion(db: Db, dataId: string): Promise<number> {
  const last = await db.dynamicTableRowVersion.findFirst({
    where: { dataId },
    orderBy: { version: 'desc' },
    select: { version: true },
  });
  return (last?.version ?? 0) + 1;
}

async function currentSchemaVersion(db: Db, dynamicTableId: string): Promise<number> {
  const table = await db.dynamicTable.findUnique({ where: { id: dynamicTableId }, select: { schemaVersion: true } });
  return table?.schemaVersion ?? 1;
}

export async function appendRowVersion(
  db: Db,
  args: { dynamicTableId: string; dataId: string; op: RowVersionOp; data: unknown; ctx: VersionWriteContext },
): Promise<void> {
  const version = await nextRowVersion(db, args.dataId);
  const schemaVersion = await currentSchemaVersion(db, args.dynamicTableId);
  await db.dynamicTableRowVersion.create({
    data: {
      dynamicTableId: args.dynamicTableId,
      dataId: args.dataId,
      version,
      op: args.op,
      data: asJson(args.data),
      schemaVersion,
      actorUserId: args.ctx.actorUserId,
      origin: args.ctx.origin,
      restoredFromVersion: args.op === 'RESTORE' ? (args.ctx.restoredFromVersion ?? null) : null,
    },
  });
}

/**
 * Item 7 (F-DTV-3 a): linha gravada antes do ledger existir não tem versão. Antes da primeira escrita sobre
 * ela, grava o estado atual como `BASELINE` (origem SYSTEM, sem ator — ninguém sabe quem escreveu aquilo).
 */
export async function ensureRowBaseline(db: Db, row: { id: string; dynamicTableId: string; data: unknown }): Promise<void> {
  const existing = await db.dynamicTableRowVersion.findFirst({ where: { dataId: row.id }, select: { id: true } });
  if (existing) return;
  await appendRowVersion(db, {
    dynamicTableId: row.dynamicTableId,
    dataId: row.id,
    op: 'BASELINE',
    data: row.data,
    ctx: SYSTEM_VERSION_CONTEXT,
  });
}

/** Item 3: grava a versão `version` do schema (igual a `DynamicTable.schemaVersion` depois da escrita). */
export async function appendSchemaVersion(
  db: Db,
  args: { dynamicTableId: string; version: number; op: SchemaVersionOp; schema: unknown; ctx: VersionWriteContext },
): Promise<void> {
  await db.dynamicTableSchemaVersion.create({
    data: {
      dynamicTableId: args.dynamicTableId,
      version: args.version,
      op: args.op,
      schema: asJson(args.schema),
      actorUserId: args.ctx.actorUserId,
      origin: args.ctx.origin,
    },
  });
}

/** Item 7 para schema: tabela anterior ao ledger ganha `BASELINE` com o schema atual na versão atual. */
export async function ensureSchemaBaseline(db: Db, table: { id: string; schema: unknown; schemaVersion: number }): Promise<void> {
  const existing = await db.dynamicTableSchemaVersion.findFirst({ where: { dynamicTableId: table.id }, select: { id: true } });
  if (existing) return;
  await appendSchemaVersion(db, {
    dynamicTableId: table.id,
    version: table.schemaVersion,
    op: 'BASELINE',
    schema: table.schema,
    ctx: SYSTEM_VERSION_CONTEXT,
  });
}

/**
 * Escrita de schema versionada (itens 3 e 7), comum aos dois repositórios: BASELINE se preciso, incrementa
 * `schemaVersion` e grava a versão nova.
 */
export async function updateSchemaVersioned(
  db: Db,
  tableId: string,
  schema: unknown,
  ctx: VersionWriteContext,
): Promise<Prisma.DynamicTableGetPayload<object>> {
  const before = await db.dynamicTable.findUnique({ where: { id: tableId }, select: { id: true, schema: true, schemaVersion: true } });
  if (before) await ensureSchemaBaseline(db, before);
  const row = await db.dynamicTable.update({
    where: { id: tableId },
    data: { schema: asJson(schema), schemaVersion: { increment: 1 } },
  });
  await appendSchemaVersion(db, { dynamicTableId: row.id, version: row.schemaVersion, op: 'UPDATE', schema, ctx });
  return row;
}

/** Item 3: tabela nova nasce na versão 1 do schema. */
export async function createTableVersioned(
  db: Db,
  data: Prisma.DynamicTableUncheckedCreateInput,
  ctx: VersionWriteContext,
): Promise<Prisma.DynamicTableGetPayload<object>> {
  const row = await db.dynamicTable.create({ data });
  await appendSchemaVersion(db, { dynamicTableId: row.id, version: row.schemaVersion, op: 'CREATE', schema: row.schema, ctx });
  return row;
}

/** Item 2: `CREATE` (v1). */
export async function createDataVersioned(db: Db, tableId: string, data: Record<string, unknown>, ctx: VersionWriteContext) {
  const row = await db.dynamicTableData.create({ data: { dynamicTableId: tableId, data: asJson(data) } });
  await appendRowVersion(db, { dynamicTableId: tableId, dataId: row.id, op: 'CREATE', data: row.data, ctx });
  return row;
}

/** Item 2: `UPDATE` (ou `RESTORE`, item 14), com BASELINE antes se a linha é anterior ao ledger. */
export async function updateDataVersioned(db: Db, dataId: string, data: Record<string, unknown>, ctx: VersionWriteContext) {
  const before = await db.dynamicTableData.findUnique({ where: { id: dataId }, select: { id: true, dynamicTableId: true, data: true } });
  if (before) await ensureRowBaseline(db, before);
  const row = await db.dynamicTableData.update({ where: { id: dataId }, data: { data: asJson(data) } });
  const op: RowVersionOp = ctx.restoredFromVersion !== undefined ? 'RESTORE' : 'UPDATE';
  await appendRowVersion(db, { dynamicTableId: row.dynamicTableId, dataId: row.id, op, data: row.data, ctx });
  return row;
}

/** Item 2: soft-delete grava `DELETE` com o snapshot do momento; as versões ficam (só a purga as leva). */
export async function softDeleteDataVersioned(db: Db, dataId: string, ctx: VersionWriteContext): Promise<void> {
  const before = await db.dynamicTableData.findUnique({ where: { id: dataId }, select: { id: true, dynamicTableId: true, data: true } });
  if (before) await ensureRowBaseline(db, before);
  const row = await db.dynamicTableData.update({ where: { id: dataId }, data: { deletedAt: new Date() } });
  await appendRowVersion(db, { dynamicTableId: row.dynamicTableId, dataId: row.id, op: 'DELETE', data: row.data, ctx });
}

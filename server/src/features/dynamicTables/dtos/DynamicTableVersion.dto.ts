/**
 * BE-INCR-DT-VERSION-LEDGER §3 — contratos do ledger de versões das DynamicTables (D-2026-10-17).
 * Entrada (params/query) e saída (respostas) materializadas; o teste de contrato faz o serviço passar por elas.
 */
import { z } from 'zod';

const cuid = z.string().cuid();
const versionNumber = z.coerce.number().int().min(1);

export const RowVersionOpSchema = z.enum(['BASELINE', 'CREATE', 'UPDATE', 'DELETE', 'RESTORE']);
export const SchemaVersionOpSchema = z.enum(['BASELINE', 'CREATE', 'UPDATE']);
export const VersionOriginSchema = z.enum(['DIRECT', 'RULE', 'SYSTEM']);

// ── Entrada ────────────────────────────────────────────────────────────────────

export const RowVersionParamsDto = z.object({ tableId: cuid, dataId: cuid }).strict();
export const RowVersionNumberParamsDto = z.object({ tableId: cuid, dataId: cuid, version: versionNumber }).strict();
export const SchemaVersionParamsDto = z.object({ tableId: cuid }).strict();
export const SchemaVersionNumberParamsDto = z.object({ tableId: cuid, version: versionNumber }).strict();

/** Item 10: paginação padrão, `limit` ≤ 200. */
export const ListVersionsQueryDto = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(200).default(50),
}).strict();

/** Itens 12–13: `against` = número de versão ou `current`; sem ele, a versão anterior. */
export const VersionDiffQueryDto = z.object({
  against: z.union([z.literal('current'), versionNumber]).optional(),
}).strict();

export type ListVersionsQuery = z.infer<typeof ListVersionsQueryDto>;
export type VersionDiffQuery = z.infer<typeof VersionDiffQueryDto>;

// ── Saída ──────────────────────────────────────────────────────────────────────

export const RowVersionMetaDto = z.object({
  version: z.number().int().min(1),
  op: RowVersionOpSchema,
  schemaVersion: z.number().int().min(1),
  actorUserId: z.string().nullable(),
  origin: VersionOriginSchema,
  restoredFromVersion: z.number().int().min(1).nullable(),
  createdAt: z.string(),
}).strict();

export const RowVersionDetailDto = RowVersionMetaDto.extend({
  data: z.record(z.string(), z.unknown()),
  schema: z.record(z.string(), z.unknown()),
}).strict();

export const RowVersionListDto = z.object({
  data: z.array(RowVersionMetaDto),
  total: z.number().int().min(0),
  page: z.number().int().min(1),
  limit: z.number().int().min(1),
}).strict();

export const FieldDiffDto = z.object({
  field: z.string(),
  label: z.string(),
  kind: z.enum(['added', 'removed', 'changed']),
  before: z.unknown(),
  after: z.unknown(),
}).strict();

export const RowVersionDiffDto = z.object({
  from: z.number().int().min(1).nullable(),
  to: z.union([z.number().int().min(1), z.literal('current')]),
  changes: z.array(FieldDiffDto),
}).strict();

export const SchemaVersionMetaDto = z.object({
  version: z.number().int().min(1),
  op: SchemaVersionOpSchema,
  actorUserId: z.string().nullable(),
  origin: VersionOriginSchema,
  createdAt: z.string(),
}).strict();

export const SchemaVersionDetailDto = SchemaVersionMetaDto.extend({
  schema: z.record(z.string(), z.unknown()),
}).strict();

export const SchemaVersionListDto = z.object({
  data: z.array(SchemaVersionMetaDto),
  total: z.number().int().min(0),
  page: z.number().int().min(1),
  limit: z.number().int().min(1),
}).strict();

/** L3 (dono, 2026-10-17): diff de schema por campo (`name`), exposto em `…/schema-versions/:v/diff`. */
export const SchemaVersionDiffDto = z.object({
  from: z.number().int().min(1).nullable(),
  to: z.union([z.number().int().min(1), z.literal('current')]),
  changes: z.array(FieldDiffDto),
}).strict();

export type RowVersionMeta = z.infer<typeof RowVersionMetaDto>;
export type RowVersionDetail = z.infer<typeof RowVersionDetailDto>;
export type RowVersionList = z.infer<typeof RowVersionListDto>;
export type FieldDiff = z.infer<typeof FieldDiffDto>;
export type RowVersionDiff = z.infer<typeof RowVersionDiffDto>;
export type SchemaVersionMeta = z.infer<typeof SchemaVersionMetaDto>;
export type SchemaVersionDetail = z.infer<typeof SchemaVersionDetailDto>;
export type SchemaVersionList = z.infer<typeof SchemaVersionListDto>;
export type SchemaVersionDiff = z.infer<typeof SchemaVersionDiffDto>;

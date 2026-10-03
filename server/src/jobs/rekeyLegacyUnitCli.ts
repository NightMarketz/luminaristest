/**
 * rekeyLegacyUnitCli — nó I1b, `docs/adr/ADR-INCR-UNIT-REKEY-migration.md` (§4 comportamentos 1–19, §5 contratos,
 * forks F-RK-1..12 de §6 fechados em 2026-10-02). MIGRAÇÃO DE DADO, não de schema: dá a um `unitId` legado (string
 * solta, sem linha em `units`) uma linha REAL em `units` e re-chaveia as tabelas contábeis do dono para o id novo.
 *
 * Modos (um por invocação):
 *   --plan                      (padrão) só leitura — descobre os pares (dono, unitId) e classifica (item 4)
 *   --apply --owner-user-id <id> --from <legado> --name <nome> [--type Own|Franchise|Department] --backup-path <db>
 *                               uma unidade por invocação (F-RK-1 a), uma tx por unidade (F-RK-4 a)
 *   --verify --against <backup> compara o banco atual (pós) com o backup (pré) — substitui o S6 (item 17, F-RK-11 a)
 *
 * Exit codes (§5): 0 ok / NOTHING_TO_DO / SKIP_REAL_UNIT · 1 pré-condição ou divergência (rollback) · 2 args inválidos.
 *
 * Este CLI NÃO é referenciado por Dockerfile, docker-compose, `server.ts`, `postinstall` nem script de start
 * (ADR-M2 decisão 4; item 1 — guardado por `__tests__/rekeyLegacyUnitCli.boot.test.ts`). Invocado só por humano,
 * via `scripts/rekey-legacy-unit.mjs`, com o servidor PARADO (F-RK-10 a) — execução no dev.db real é gate humano
 * (`docs/accounting/RUNBOOK-I1B-UNIT-REKEY.md`, item 16).
 *
 * Alvo: o `DATABASE_URL` que o processo enxerga DEPOIS do `config/env` (o `.env` do server sobrescreve o ambiente
 * fora de teste — classe `env-override-defeats-db-flag`). Por isso todo modo imprime primeiro o caminho absoluto
 * que o próprio SQLite reporta (`PRAGMA database_list`), antes de qualquer escrita.
 */
import fs from 'fs';
import path from 'path';
import { createHash } from 'crypto';
import { z } from 'zod';
import { Prisma, PrismaClient } from '../../generated/prisma';
import prisma from '../lib/prisma';
import { logger } from '../lib/logger';
import { ApplicationFactory } from '../lib/factory';
import { UNIT_TYPE_OPTIONS } from '../features/dynamicTables/presets/modules/core/UnitsModule';
import { resolveAccountingScope } from '../features/accounting/scope/AccountingScope';
import type { UserContext } from '../types/UserContext';
import type { Role } from '../features/users/models/User.model';

// ─────────────────────────────────────────────────────────────── inventário (item 2)

/** F-RK-5 (a): a trilha legada fica selada sob o `unitId` antigo — o `unitId` está na tupla do hash. */
export const KEEP_MODELS = ['AuditEvent', 'AuditChainHead'] as const;

/**
 * Classificação FECHADA dos models com campo `unitId` que mudam de unidade. A lista não é a verdade do inventário —
 * o inventário vem do DMMF (`buildInventory`); esta lista só classifica. Model novo com `unitId` fora das duas listas
 * derruba o CLI (exit 1) e o teste de caracterização (§2.1, regra T4: é o que teria pegado o "31" do BRIEF).
 */
export const REKEY_MODELS = [
  'AccountingPeriod', 'AccountingPeriodTransition', 'Account', 'ReferentialMapping', 'JournalEntry',
  'JournalEntrySequence', 'DocumentAttachment', 'AccountingDataExchangeJob', 'AccountingDataExchangeRow', 'Posting',
  'BankStatement', 'BankStatementLine', 'ReconciliationMatch', 'SourceDocument', 'JournalEntrySource',
  'CustomerPackageBalance', 'PackageBalanceMovement', 'Payable', 'PayablePayment', 'Receivable', 'ReceivableReceipt',
  'DimensionDefinition', 'DimensionValue', 'PostingDimension', 'Counterparty', 'InventoryItem', 'AccountingBinding',
  'FiscalProfile', 'ServiceFiscalProfile', 'FiscalDocument', 'FiscalDocumentSequence', 'BankSettlementItem',
  'AccountingScopeSettings', 'FixedAssetClass', 'DepreciationRate', 'FixedAsset', 'ReconcilePendingItem',
  'AccountingContact', 'AccountingDeliveryLog', 'AccountingReview', 'AccountingReviewFinding', 'LalurEntry',
  'LalurParteBAccount', 'LalurParteBMovement', 'LalurParteBClosing',
] as const;

/**
 * F-RK-2 → (a), decidido por delegação do dono em 2026-10-02 (ADR §6): os tenants do SEED-MY ficam FORA do re-key
 * por lista explícita — o critério sobrevive ao SEED-UNITS, que dá tabela `units` a esses donos.
 */
export const EXCLUDED_UNIT_IDS = ['seed-unit-presumido', 'seed-unit-real'] as const;

/** F-RK-6 (b): evento âncora genesis na cadeia da unidade nova. */
export const UNIT_REKEYED_EVENT = 'unit.rekeyed';

export interface InventoryEntry {
  model: string;
  table: string;
  /** `userId` em todas, exceto nas duas de auditoria (`scopeUserId`). */
  ownerColumn: string;
  cls: 'REKEY' | 'KEEP';
}

export function buildInventory(): InventoryEntry[] {
  const out: InventoryEntry[] = [];
  for (const m of Prisma.dmmf.datamodel.models) {
    const fields = new Set(m.fields.map((f) => f.name));
    if (!fields.has('unitId')) continue;
    const cls = (KEEP_MODELS as readonly string[]).includes(m.name)
      ? 'KEEP'
      : (REKEY_MODELS as readonly string[]).includes(m.name) ? 'REKEY' : null;
    if (!cls) {
      throw new CliError(1, 'UNCLASSIFIED_MODEL', `model '${m.name}' tem unitId e não está em REKEY_MODELS nem em KEEP_MODELS — classifique antes de rodar.`);
    }
    const ownerColumn = fields.has('userId') ? 'userId' : fields.has('scopeUserId') ? 'scopeUserId' : null;
    if (!ownerColumn) throw new CliError(1, 'NO_OWNER_COLUMN', `model '${m.name}' tem unitId sem coluna de dono.`);
    out.push({ model: m.name, table: m.dbName ?? m.name, ownerColumn, cls });
  }
  return out;
}

// ─────────────────────────────────────────────────────────────── contratos (§5)

const ApplyArgs = z.object({
  mode: z.literal('apply'),
  ownerUserId: z.string().min(1),
  from: z.string().min(1),
  name: z.string().min(1).max(120), // F-RK-9 (a): obrigatório, sem default
  type: z.enum(UNIT_TYPE_OPTIONS).optional(),
  backupPath: z.string().min(1), // item 15
}).strict();

export const Args = z.discriminatedUnion('mode', [
  z.object({ mode: z.literal('plan') }).strict(),
  ApplyArgs,
  z.object({ mode: z.literal('verify'), against: z.string().min(1) }).strict(),
]);
export type CliArgs = z.infer<typeof Args>;

export type PlanStatus = 'SKIP_REAL_UNIT' | 'LEGACY' | 'EXCLUDED_TENANT';
export type PlanRow = { ownerUserId: string; unitId: string; status: PlanStatus; tables: Record<string, number> };
export type ApplyResult = {
  event: 'unit_rekeyed';
  ownerUserId: string;
  from: string;
  to: string;
  tables: Record<string, { before: number; affected: number; after: number }>;
  auditAnchor: { seq: 1; fromHeadHash: string; fromNextSeq: string } | null;
};

export class CliError extends Error {
  constructor(public readonly exitCode: 1 | 2, public readonly code: string, message: string) {
    super(message);
  }
}

/** `--owner-user-id x` → `{ ownerUserId: 'x' }`; `--plan|--apply|--verify` → `mode`. Flag desconhecida → `.strict()` recusa. */
export function parseArgs(argv: string[]): CliArgs {
  const MODES = ['plan', 'apply', 'verify'];
  const raw: Record<string, string> = {};
  const modes: string[] = [];
  for (let i = 0; i < argv.length; i++) {
    const tok = argv[i];
    if (!tok.startsWith('--')) throw new CliError(2, 'INVALID_ARGS', `argumento solto: '${tok}'`);
    const key = tok.slice(2).replace(/-([a-z])/g, (_, c: string) => c.toUpperCase());
    if (MODES.includes(key)) { modes.push(key); continue; }
    const val = argv[i + 1];
    if (val === undefined || val.startsWith('--')) throw new CliError(2, 'INVALID_ARGS', `${tok} exige valor`);
    raw[key] = val;
    i++;
  }
  if (modes.length > 1) throw new CliError(2, 'INVALID_ARGS', `um modo por invocação (recebi ${modes.join(', ')})`);
  const parsed = Args.safeParse({ mode: modes[0] ?? 'plan', ...raw });
  if (!parsed.success) throw new CliError(2, 'INVALID_ARGS', parsed.error.issues.map((i) => `${i.path.join('.') || '(raiz)'}: ${i.message}`).join('; '));
  return parsed.data;
}

// ─────────────────────────────────────────────────────────────── helpers SQL

type Db = PrismaClient | Prisma.TransactionClient;
const q = (name: string) => `"${name.replace(/"/g, '""')}"`;
const num = (v: unknown) => Number(v);

async function count(db: Db, t: InventoryEntry, owner: string, unitId: string): Promise<number> {
  const rows = await db.$queryRawUnsafe<{ n: unknown }[]>(
    `SELECT COUNT(*) AS n FROM ${q(t.table)} WHERE ${q(t.ownerColumn)} = ? AND "unitId" = ?`, owner, unitId);
  return num(rows[0].n);
}

export async function databasePath(db: PrismaClient): Promise<string> {
  const rows = await db.$queryRawUnsafe<{ name: string; file: string }[]>('PRAGMA database_list');
  return rows.find((r) => r.name === 'main')?.file ?? '(desconhecido)';
}

async function userTables(db: PrismaClient): Promise<string[]> {
  const rows = await db.$queryRawUnsafe<{ name: string }[]>(
    "SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name");
  return rows.map((r) => r.name);
}

const stable = (v: unknown) => JSON.stringify(v, (_k, x) => {
  if (typeof x === 'bigint') return `${x}n`;
  if (x && typeof x === 'object' && x.type === 'Buffer' && Array.isArray(x.data)) return Buffer.from(x.data).toString('hex');
  if (x instanceof Uint8Array) return Buffer.from(x).toString('hex');
  return x;
});

async function tableRows(db: PrismaClient, table: string): Promise<Record<string, unknown>[]> {
  return db.$queryRawUnsafe<Record<string, unknown>[]>(`SELECT * FROM ${q(table)} ORDER BY rowid`);
}

/** sha256 de todas as linhas (ordem de rowid), sem as colunas omitidas. Base do md5-do-banco dos testes e do --verify. */
export async function tableDigest(db: PrismaClient, table: string, omit: string[] = []): Promise<{ count: number; sha256: string }> {
  const rows = await tableRows(db, table);
  const h = createHash('sha256');
  for (const r of rows) {
    const copy = { ...r };
    for (const c of omit) delete copy[c];
    h.update(stable(copy)).update('\n');
  }
  return { count: rows.length, sha256: h.digest('hex') };
}

// ─────────────────────────────────────────────────────────────── pré-condições (itens 3, 15)

const DEFAULT_MIGRATIONS_DIR = path.resolve(__dirname, '../../prisma/migrations');

/** Item 3 — análogo do `IF EXISTS`: tabelas do inventário existem e não há migração pendente. Nada escrito antes. */
export async function precheckSchema(db: PrismaClient, inv: InventoryEntry[], migrationsDir = DEFAULT_MIGRATIONS_DIR): Promise<void> {
  const present = new Set(await userTables(db));
  const missing = inv.filter((t) => !present.has(t.table)).map((t) => t.table);
  if (missing.length) throw new CliError(1, 'SCHEMA_MISSING_TABLES', `tabelas do inventário ausentes: ${missing.join(', ')}`);
  if (!present.has('_prisma_migrations')) throw new CliError(1, 'SCHEMA_NO_MIGRATIONS_TABLE', 'banco sem _prisma_migrations — aplique o schema com `prisma migrate deploy`.');
  const dirs = fs.readdirSync(migrationsDir, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name);
  const applied = await db.$queryRawUnsafe<{ migration_name: string }[]>(
    'SELECT migration_name FROM _prisma_migrations WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL');
  const done = new Set(applied.map((r) => r.migration_name));
  const pending = dirs.filter((d) => !done.has(d));
  if (pending.length || done.size !== dirs.length) {
    throw new CliError(1, 'SCHEMA_PENDING_MIGRATIONS', `migrações aplicadas (${done.size}) ≠ diretórios em prisma/migrations (${dirs.length}); pendentes: ${pending.join(', ') || '(nenhuma — há aplicada sem diretório)'}`);
  }
}

/** Maior `updatedAt` do banco (toda tabela que tem a coluna). Prisma grava DateTime do SQLite como inteiro ms; texto é tolerado. */
async function lastUpdatedAt(db: PrismaClient): Promise<number> {
  let max = 0;
  for (const t of await userTables(db)) {
    const cols = await db.$queryRawUnsafe<{ name: string }[]>(`PRAGMA table_info(${q(t)})`);
    if (!cols.some((c) => c.name === 'updatedAt')) continue;
    const rows = await db.$queryRawUnsafe<{ v: unknown }[]>(`SELECT "updatedAt" AS v FROM ${q(t)} WHERE "updatedAt" IS NOT NULL`);
    for (const { v } of rows) {
      const ms = v instanceof Date ? v.getTime() : typeof v === 'string' && Number.isNaN(Number(v)) ? Date.parse(v) : Number(v);
      if (Number.isFinite(ms) && ms > max) max = ms;
    }
  }
  return max;
}

const openClient = (file: string) => new PrismaClient({ datasources: { db: { url: `file:${path.resolve(file).replace(/\\/g, '/')}` } } });

/** Item 15 — backup fresco: existe, `integrity_check = ok`, mtime posterior ao último `updatedAt` do alvo. */
export async function checkBackup(db: PrismaClient, backupPath: string): Promise<void> {
  if (!fs.existsSync(backupPath)) throw new CliError(1, 'BACKUP_MISSING', `--backup-path não existe: ${backupPath}`);
  const backup = openClient(backupPath);
  try {
    let integrity: string;
    try {
      const rows = await backup.$queryRawUnsafe<{ integrity_check: string }[]>('PRAGMA integrity_check');
      integrity = rows.map((r) => r.integrity_check).join('; ');
    } catch (e) {
      throw new CliError(1, 'BACKUP_INVALID', `backup ilegível como SQLite: ${e instanceof Error ? e.message : String(e)}`);
    }
    if (integrity !== 'ok') throw new CliError(1, 'BACKUP_INVALID', `integrity_check do backup: ${integrity}`);
  } finally {
    await backup.$disconnect();
  }
  const mtime = fs.statSync(backupPath).mtimeMs;
  const last = await lastUpdatedAt(db);
  if (!(mtime > last)) {
    throw new CliError(1, 'BACKUP_STALE', `backup (mtime ${new Date(mtime).toISOString()}) não é posterior ao último updatedAt do alvo (${new Date(last).toISOString()}).`);
  }
}

// ─────────────────────────────────────────────────────────────── descoberta e classificação (itens 4–6)

async function unitsTableOf(db: Db, owner: string) {
  return db.dynamicTable.findFirst({ where: { userId: owner, internalName: 'units' } });
}

/** Item 5 / item 6. `UNIT_OWNER_MISMATCH` é exit 1 em qualquer modo (nada escrito). */
export async function classify(db: Db, owner: string, unitId: string): Promise<PlanStatus> {
  const row = await db.dynamicTableData.findFirst({ where: { id: unitId, deletedAt: null }, include: { dynamicTable: true } });
  if (row && row.dynamicTable.internalName === 'units') {
    if (row.dynamicTable.userId === owner) return 'SKIP_REAL_UNIT';
    throw new CliError(1, 'UNIT_OWNER_MISMATCH', `unitId '${unitId}' é linha de units de OUTRO dono (${row.dynamicTable.userId}), não de '${owner}'.`);
  }
  if ((EXCLUDED_UNIT_IDS as readonly string[]).includes(unitId)) return 'EXCLUDED_TENANT';
  if (!(await unitsTableOf(db, owner))) return 'EXCLUDED_TENANT';
  return 'LEGACY';
}

async function rekeyCounts(db: Db, inv: InventoryEntry[], owner: string, unitId: string): Promise<Record<string, number>> {
  const out: Record<string, number> = {};
  for (const t of inv.filter((x) => x.cls === 'REKEY')) {
    const n = await count(db, t, owner, unitId);
    if (n > 0) out[t.table] = n;
  }
  return out;
}

/** Item 4 — só leitura. Descobre os pares pela união das 47 tabelas; `tables` = contagem por tabela REKEY (só as > 0). */
export async function plan(db: PrismaClient, inv: InventoryEntry[]): Promise<PlanRow[]> {
  const pairs = new Map<string, { owner: string; unitId: string }>();
  for (const t of inv) {
    const rows = await db.$queryRawUnsafe<{ o: string; u: string }[]>(
      `SELECT DISTINCT ${q(t.ownerColumn)} AS o, "unitId" AS u FROM ${q(t.table)}`);
    for (const r of rows) pairs.set(`${r.o}\u0000${r.u}`, { owner: r.o, unitId: r.u });
  }
  const out: PlanRow[] = [];
  for (const { owner, unitId } of [...pairs.values()].sort((a, b) => (a.owner + a.unitId).localeCompare(b.owner + b.unitId))) {
    out.push({ ownerUserId: owner, unitId, status: await classify(db, owner, unitId), tables: await rekeyCounts(db, inv, owner, unitId) });
  }
  return out;
}

// ─────────────────────────────────────────────────────────────── --apply (itens 7–14)

export interface ApplyOptions {
  /** Costura de teste do item 10 (falha injetada na N-ésima tabela). Nunca usada pelo `main`. */
  onTableRekeyed?: (table: string, index: number) => void | Promise<void>;
}

export type ApplyOutcome = { status: 'NOTHING_TO_DO' | 'SKIP_REAL_UNIT' } | { status: 'APPLIED'; result: ApplyResult };

const TX_TIMEOUT_MS = 120_000; // item 9: timeout explícito ≥ 60 s

function userContextOf(u: { id: string; name: string | null; username: string; email: string; role: string; createdAt: Date; updatedAt: Date }): UserContext {
  return {
    userId: u.id, id: u.id, name: u.name ?? u.username, username: u.username, email: u.email, role: u.role as Role,
    createdAt: u.createdAt, updatedAt: u.updatedAt, userRole: u.role, userEmail: u.email, userName: u.name ?? u.username,
  };
}

export async function apply(
  db: PrismaClient,
  inv: InventoryEntry[],
  args: z.infer<typeof ApplyArgs>,
  opts: ApplyOptions = {},
): Promise<ApplyOutcome> {
  const { ownerUserId: owner, from } = args;
  const status = await classify(db, owner, from);
  if (status === 'SKIP_REAL_UNIT') return { status };
  if (status === 'EXCLUDED_TENANT') {
    throw new CliError(1, 'NO_UNITS_TABLE', `'${from}' é EXCLUDED_TENANT (dono sem tabela units, ou seed-unit-* excluído pelo F-RK-2 a) — o CLI nunca cria tabela dinâmica.`);
  }
  // Item 13: o legado só "existe" enquanto houver linha REKEY com ele — a trilha (KEEP) fica sob ele para sempre.
  if (Object.keys(await rekeyCounts(db, inv, owner, from)).length === 0) return { status: 'NOTHING_TO_DO' };

  const user = await db.user.findUnique({ where: { id: owner } });
  const unitsTable = await unitsTableOf(db, owner);
  if (!user || !unitsTable) throw new CliError(1, 'NO_UNITS_TABLE', `dono '${owner}' sem usuário ou sem tabela units.`);
  const ctx = userContextOf(user);
  const factory = ApplicationFactory.getInstance();
  const dynamicTables = factory.getDynamicTableService();
  const audit = factory.getAuditService();
  const rekey = inv.filter((t) => t.cls === 'REKEY');

  const result = await db.$transaction(async (tx) => {
    // Item 8 (F-RK-8 b): caminho normal — plugins de afterCreate (pipeline, estoque) rodam NESTA tx.
    const data: Record<string, unknown> = { name: args.name, isActive: true };
    if (args.type) data.type = args.type;
    const row = await dynamicTables.createTableData(ctx, unitsTable.id, { data }, { tx });
    const to = row.id;

    // Itens 9–10: UPDATE por tabela da lista fechada, valores parametrizados; contagem antes/depois dentro da tx.
    const tables: ApplyResult['tables'] = {};
    for (const [i, t] of rekey.entries()) {
      const before = await count(tx, t, owner, from);
      const affected = await tx.$executeRawUnsafe(
        `UPDATE ${q(t.table)} SET "unitId" = ? WHERE ${q(t.ownerColumn)} = ? AND "unitId" = ?`, to, owner, from);
      const after = await count(tx, t, owner, to);
      if (affected !== before || after !== before) {
        throw new CliError(1, 'COUNT_MISMATCH', `${t.table}: before=${before} affected=${affected} after=${after} — rollback total.`);
      }
      if (before > 0) tables[t.table] = { before, affected, after };
      await opts.onTableRekeyed?.(t.table, i);
    }
    for (const t of rekey) {
      const left = await count(tx, t, owner, from);
      if (left !== 0) throw new CliError(1, 'COUNT_MISMATCH', `${t.table}: ${left} linha(s) ainda sob '${from}' — rollback total.`);
    }

    // Itens 11–12 (F-RK-5 a, F-RK-6 b): a cadeia legada não muda; a nova nasce com o evento âncora em seq=1.
    // Sem cabeça legada não há cadeia a ancorar → `auditAnchor: null` (contrato §5).
    const head = await tx.auditChainHead.findUnique({ where: { scopeUserId_unitId: { scopeUserId: owner, unitId: from } } });
    let auditAnchor: ApplyResult['auditAnchor'] = null;
    if (head) {
      auditAnchor = { seq: 1, fromHeadHash: head.headHash, fromNextSeq: head.nextSeq.toString() };
      await audit.append(tx, resolveAccountingScope({ userId: owner }, to), {
        actorUserId: owner,
        eventType: UNIT_REKEYED_EVENT,
        targetType: 'unit',
        targetId: to,
        // `canonicalizeAuditPayload` grava String(valor): o mapa de contagens entra como JSON estável, não "[object Object]".
        payload: { fromUnitId: from, fromHeadHash: head.headHash, fromNextSeq: auditAnchor.fromNextSeq, tables: stable(sortKeys(tables)) },
      });
    }
    const out: ApplyResult = { event: 'unit_rekeyed', ownerUserId: owner, from, to, tables, auditAnchor };
    return out;
  }, { timeout: TX_TIMEOUT_MS, maxWait: 10_000 });

  // Item 14: rastreio só após o COMMIT.
  logger.info('unit_rekeyed', { ...result });
  return { status: 'APPLIED', result };
}

function sortKeys<T>(o: Record<string, T>): Record<string, T> {
  return Object.fromEntries(Object.keys(o).sort().map((k) => [k, o[k]]));
}

// ─────────────────────────────────────────────────────────────── --verify (item 17)

export interface VerifyReport {
  ok: boolean;
  failures: string[];
  rekeyed: { ownerUserId: string; from: string; to: string }[];
  dynamicTableDataAdded: Record<string, number>;
  checks: Record<string, string>;
}

/** Pré (backup) × pós (banco atual). Toda divergência fora do esperado vira `failures`. */
export async function verify(db: PrismaClient, inv: InventoryEntry[], against: string): Promise<VerifyReport> {
  if (!fs.existsSync(against)) throw new CliError(1, 'BACKUP_MISSING', `--against não existe: ${against}`);
  const pre = openClient(against);
  const failures: string[] = [];
  const checks: Record<string, string> = {};
  try {
    const rekeyTables = new Set(inv.filter((t) => t.cls === 'REKEY').map((t) => t.table));
    const SPECIAL = new Set(['dynamic_table_data', 'audit_events', 'audit_chain_heads']);
    const [preTables, postTables] = [await userTables(pre), await userTables(db)];
    if (stable(preTables) !== stable(postTables)) failures.push('conjunto de tabelas difere entre pré e pós');

    // Quem foi re-chaveado: os `unit.rekeyed` que só existem no pós.
    const preEvents = new Map((await tableRows(pre, 'audit_events')).map((r) => [String(r.id), stable(r)]));
    const postEvents = await tableRows(db, 'audit_events');
    const newEvents = postEvents.filter((r) => !preEvents.has(String(r.id)));
    const rekeyed = newEvents.filter((r) => r.eventType === UNIT_REKEYED_EVENT).map((r) => ({
      ownerUserId: String(r.scopeUserId), from: String(JSON.parse(String(r.payload)).fromUnitId), to: String(r.unitId),
    }));

    // (a) fora do inventário REKEY: byte-idêntica, salvo as 3 especiais.
    for (const t of postTables) {
      if (rekeyTables.has(t) || SPECIAL.has(t) || !preTables.includes(t)) continue;
      const [a, b] = [await tableDigest(pre, t), await tableDigest(db, t)];
      if (a.sha256 !== b.sha256) failures.push(`(a) ${t}: conteúdo mudou (pré ${a.count} linhas, pós ${b.count})`);
    }
    // dynamic_table_data: linhas do pré intactas; acréscimos contados por tabela dinâmica; +1 em units por unidade.
    const preDtd = new Map((await tableRows(pre, 'dynamic_table_data')).map((r) => [String(r.id), stable(r)]));
    const added: Record<string, number> = {};
    let seenDtd = 0;
    for (const r of await tableRows(db, 'dynamic_table_data')) {
      const prev = preDtd.get(String(r.id));
      if (prev === undefined) { added[String(r.dynamicTableId)] = (added[String(r.dynamicTableId)] ?? 0) + 1; continue; }
      seenDtd++;
      if (prev !== stable(r)) failures.push(`(a) dynamic_table_data ${String(r.id)}: linha do pré alterada`);
    }
    if (seenDtd !== preDtd.size) failures.push(`(a) dynamic_table_data: ${preDtd.size - seenDtd} linha(s) do pré sumiram`);
    for (const k of rekeyed) {
      const unitRow = await db.dynamicTableData.findFirst({ where: { id: k.to }, include: { dynamicTable: true } });
      if (!unitRow || unitRow.dynamicTable.internalName !== 'units' || unitRow.dynamicTable.userId !== k.ownerUserId) {
        failures.push(`(a) unidade nova ${k.to} não é linha de units do dono ${k.ownerUserId}`);
      }
    }
    // audit_events / audit_chain_heads: pré intacto; acréscimo = 1 evento âncora e 1 cabeça por unidade nova.
    for (const r of postEvents) {
      const prev = preEvents.get(String(r.id));
      if (prev !== undefined && prev !== stable(r)) failures.push(`(a) audit_events ${String(r.id)}: evento do pré alterado`);
    }
    if (postEvents.length - newEvents.length !== preEvents.size) failures.push('(a) audit_events: evento do pré sumiu');
    if (newEvents.length !== rekeyed.length) failures.push(`(a) audit_events: ${newEvents.length - rekeyed.length} evento(s) novo(s) além dos unit.rekeyed`);
    if (newEvents.some((r) => num(r.seq) !== 1)) failures.push('(a) audit_events: unit.rekeyed fora de seq=1');
    const headKey = (r: Record<string, unknown>) => `${String(r.scopeUserId)}\u0000${String(r.unitId)}`;
    const preHeads = new Map((await tableRows(pre, 'audit_chain_heads')).map((r) => [headKey(r), r]));
    const postHeads = await tableRows(db, 'audit_chain_heads');
    for (const r of postHeads) {
      const prev = preHeads.get(headKey(r));
      if (prev && stable(prev) !== stable(r)) failures.push(`(a) audit_chain_heads ${headKey(r).replace('\u0000', '/')}: cabeça do pré alterada`);
    }
    if (postHeads.length !== preHeads.size + rekeyed.length) failures.push(`(a) audit_chain_heads: esperado +${rekeyed.length}, achei +${postHeads.length - preHeads.size}`);

    // (b) REKEY: contagem igual e hash de todas as colunas exceto unitId idêntico.
    for (const t of rekeyTables) {
      const [a, b] = [await tableDigest(pre, t, ['unitId']), await tableDigest(db, t, ['unitId'])];
      if (a.count !== b.count || a.sha256 !== b.sha256) failures.push(`(b) ${t}: pré ${a.count}/${a.sha256.slice(0, 12)} ≠ pós ${b.count}/${b.sha256.slice(0, 12)}`);
    }
    // (c) integridade.
    const integrity = (await db.$queryRawUnsafe<{ integrity_check: string }[]>('PRAGMA integrity_check')).map((r) => r.integrity_check).join('; ');
    checks.integrity_check = integrity;
    if (integrity !== 'ok') failures.push(`(c) integrity_check: ${integrity}`);
    const fk = await db.$queryRawUnsafe<unknown[]>('PRAGMA foreign_key_check');
    checks.foreign_key_check = String(fk.length);
    if (fk.length) failures.push(`(c) foreign_key_check: ${fk.length} violação(ões)`);
    // (d) S8: Σdébito = Σcrédito por lançamento.
    const unbalanced = await db.$queryRawUnsafe<unknown[]>(
      'SELECT "entryId" FROM postings GROUP BY "entryId" HAVING SUM("debitCents") <> SUM("creditCents")');
    checks.s8_unbalanced_entries = String(unbalanced.length);
    if (unbalanced.length) failures.push(`(d) S8: ${unbalanced.length} lançamento(s) desbalanceado(s)`);
    // (e) item 11: cadeia legada selada com a mesma cabeça; cadeia nova íntegra.
    const audit = ApplicationFactory.getInstance().getAuditService();
    for (const k of rekeyed) {
      const preHead = preHeads.get(`${k.ownerUserId}\u0000${k.from}`);
      const legacy = await audit.verifyAuditChain(resolveAccountingScope({ userId: k.ownerUserId }, k.from));
      const expectedLast = preHead ? BigInt(String(preHead.nextSeq).replace(/n$/, '')) - 1n : null;
      if (!legacy.ok || legacy.lastSeq !== expectedLast || legacy.headHash !== (preHead ? String(preHead.headHash) : null)) {
        failures.push(`(e) cadeia legada ${k.from}: ok=${legacy.ok} lastSeq=${String(legacy.lastSeq)} headHash=${legacy.headHash}`);
      }
      const fresh = await audit.verifyAuditChain(resolveAccountingScope({ userId: k.ownerUserId }, k.to));
      if (!fresh.ok) failures.push(`(e) cadeia nova ${k.to}: ${fresh.failure?.reason}`);
    }
    return { ok: failures.length === 0, failures, rekeyed, dynamicTableDataAdded: added, checks };
  } finally {
    await pre.$disconnect();
  }
}

// ─────────────────────────────────────────────────────────────── entrada

export interface RunOptions extends ApplyOptions {
  migrationsDir?: string;
}

/** Fluxo completo. Nunca chama `process.exit` (testável) — devolve o exit code pretendido. */
export async function runCli(argv: string[] = process.argv.slice(2), opts: RunOptions = {}): Promise<number> {
  try {
    const args = parseArgs(argv);
    console.log(`alvo: ${await databasePath(prisma)}`);
    const inv = buildInventory();
    if (args.mode === 'plan') {
      console.log(JSON.stringify({ mode: 'plan', rows: await plan(prisma, inv) }, null, 2));
      return 0;
    }
    if (args.mode === 'verify') {
      const report = await verify(prisma, inv, args.against);
      console.log(JSON.stringify({ mode: 'verify', ...report }, null, 2));
      return report.ok ? 0 : 1;
    }
    await precheckSchema(prisma, inv, opts.migrationsDir);
    await checkBackup(prisma, args.backupPath);
    console.log('AVISO: o servidor tem de estar PARADO durante o --apply (F-RK-10 a; passo do runbook RUNBOOK-I1B-UNIT-REKEY).');
    const outcome = await apply(prisma, inv, args, opts);
    if (outcome.status !== 'APPLIED') {
      console.log(JSON.stringify({ status: outcome.status, ownerUserId: args.ownerUserId, from: args.from }));
      return 0;
    }
    console.log(JSON.stringify(outcome.result)); // item 14: o executor humano cola esta linha no runbook
    return 0;
  } catch (e) {
    if (e instanceof CliError) {
      console.error(`erro [${e.code}]: ${e.message}`);
      return e.exitCode;
    }
    console.error(`erro: ${e instanceof Error ? e.stack ?? e.message : String(e)}`);
    return 1;
  }
}

if (require.main === module) {
  runCli()
    .then(async (code) => { await prisma.$disconnect(); process.exit(code); })
    .catch(async (e) => { console.error(e); await prisma.$disconnect(); process.exit(1); });
}

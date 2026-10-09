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
  'ProductDestinationDefault', // #481 (ITEM-DESTINATION PR-2): parâmetro por unidade, sem hash → REKEY pelo critério do F-RK-5
  'PaymentAccount', // #484 (F5 PR-1): conta do provedor por unidade; AAD da cifra = id, não unitId → REKEY (dono, 03/10)
  'AccountantAssignment', // #482 (GOV-CONTADOR): contador responsável do escopo, sem hash → REKEY pelo critério do F-RK-5 (KEEP só para a trilha);
  //   deixá-la no unitId antigo tiraria o contador ativo da unidade re-chaveada e destravaria a reabertura em silêncio
  'TaxAssessment', // X7 Fase A PR-2: apuração IRPJ/CSLL; `unitId` = unidade lida (proveniência), sem hash → REKEY pelo critério do F-RK-5
  'AccountingPolicyVersion', // GOV-CONTADOR (BE-INCR-ACCOUNTING-POLICY-VERSION item 2): parâmetro do escopo, sem hash; o payload não
  //   carrega `unitId` (item 7) → REKEY pelo F-RK-5. Deixá-la no unitId antigo tiraria do escopo re-chaveado o histórico de quem aprovou
  'PackageValidityAcceptance', // FE-INCR-PACOTE-VALIDADE (F-JUR-4): prova do aceite por venda; o `textSha256` cobre só o texto (sem unitId) → REKEY pelo F-RK-5.
  //   Deixá-la no unitId antigo separaria a prova da venda re-chaveada (o `saleId` segue a unidade nova)
  'KitInstallation', // BE-INCR-KIT-SETOR PR-2: o kit instalado na unidade, sem hash → REKEY pelo F-RK-5, como o `AccountingBinding`
  //   que ele instala. Deixá-la no unitId antigo faria a unidade re-chaveada parecer sem kit (e o PR-4 não a atualizaria)
  // BE-INCR-SIMPLES-NACIONAL PR-2 (nó X14): entradas da apuração e subrazão de receita, sem hash → REKEY pelo F-RK-5.
  //   Deixá-las no unitId antigo tiraria da unidade re-chaveada o RBT12, a segregação, os contratos e o tie-out.
  'SimplesHistoricoMensal', 'SimplesSegregacaoManual', 'SalaoParceriaContrato', 'ReceitaFiscalLinha',
  'SimplesApuracao', // X14 PR-3: a apuração e a provisão seguem a unidade (sem hash) → REKEY pelo F-RK-5
  'SimplesDeclaracaoAnual', // X14 PR-4: os digitados da DEFIS/DASN-SIMEI seguem a unidade (sem hash) → REKEY pelo F-RK-5
  'FiscalDocumentPendingAttachment', // BE-INCR-DFE-ANEXO-PENDENTE: a pendência segue o `FiscalDocument` dela (sem hash) → REKEY pelo F-RK-5.
  //   Deixá-la no unitId antigo faria a varredura anexar no escopo errado (o documento não seria achado e a pendência iria a FAILED)
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

export type PlanStatus = 'SKIP_REAL_UNIT' | 'DELETED_REAL_UNIT' | 'LEGACY' | 'EXCLUDED_TENANT'; // DELETED_REAL_UNIT: L-RK-5 (b)
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
  return db.$queryRawUnsafe<Record<string, unknown>[]>(`SELECT * FROM ${q(table)}`);
}

/** Linhas como JSON estável, ordenadas: multiconjunto independente de rowid (L-RK-2 item 8 — a cópia pode renumerar). */
const multiset = (rows: Record<string, unknown>[]) => rows.map(stable).sort();

/** sha256 do multiconjunto de linhas, sem as colunas omitidas. Base do md5-do-banco dos testes e do --verify. */
export async function tableDigest(db: PrismaClient, table: string, omit: string[] = []): Promise<{ count: number; sha256: string }> {
  const rows = (await tableRows(db, table)).map((r) => {
    const copy = { ...r };
    for (const c of omit) delete copy[c];
    return copy;
  });
  const h = createHash('sha256');
  for (const line of multiset(rows)) h.update(line).update('\n');
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

/**
 * Item 5 / item 6 + L-RK-5 (b). Precedência: units viva do dono → SKIP_REAL_UNIT; units de OUTRO dono, viva ou
 * apagada (F-RKL-1 a) → `UNIT_OWNER_MISMATCH`, exit 1 em qualquer modo (nada escrito); units apagada do dono →
 * DELETED_REAL_UNIT; depois EXCLUDED_TENANT / LEGACY.
 */
export async function classify(db: Db, owner: string, unitId: string): Promise<PlanStatus> {
  const row = await db.dynamicTableData.findUnique({ where: { id: unitId }, include: { dynamicTable: true } });
  if (row && row.dynamicTable.internalName === 'units') {
    if (row.dynamicTable.userId !== owner) {
      throw new CliError(1, 'UNIT_OWNER_MISMATCH', `unitId '${unitId}' é linha de units${row.deletedAt ? ' (apagada)' : ''} de OUTRO dono (${row.dynamicTable.userId}), não de '${owner}'.`);
    }
    return row.deletedAt ? 'DELETED_REAL_UNIT' : 'SKIP_REAL_UNIT';
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
  /** Costura de teste da L-RK-4 (item 2): roda entre o preflight e a tx. Nunca usada pelo `main`. */
  onBeforeTx?: () => void | Promise<void>;
}

/** Rollback do gate in-tx da L-RK-4: lançado dentro da tx, vira `NOTHING_TO_DO` fora dela. */
class NothingMoved extends Error {}

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
  if (status === 'DELETED_REAL_UNIT') {
    throw new CliError(1, 'DELETED_REAL_UNIT', `'${from}' é linha APAGADA de units do próprio dono — o --apply recusa (L-RK-5 b); restaure ou trate a unidade antes.`);
  }
  if (status === 'EXCLUDED_TENANT') {
    throw new CliError(1, 'NO_UNITS_TABLE', `'${from}' é EXCLUDED_TENANT (dono sem tabela units, ou seed-unit-* excluído pelo F-RK-2 a) — o CLI nunca cria tabela dinâmica.`);
  }
  // Item 13: o legado só "existe" enquanto houver linha REKEY com ele — a trilha (KEEP) fica sob ele para sempre.
  // Preflight: a decisão autoritativa é o gate dentro da tx (L-RK-4 a), abaixo.
  if (Object.keys(await rekeyCounts(db, inv, owner, from)).length === 0) return { status: 'NOTHING_TO_DO' };

  const user = await db.user.findUnique({ where: { id: owner } });
  const unitsTable = await unitsTableOf(db, owner);
  if (!user || !unitsTable) throw new CliError(1, 'NO_UNITS_TABLE', `dono '${owner}' sem usuário ou sem tabela units.`);
  const ctx = userContextOf(user);
  const factory = ApplicationFactory.getInstance();
  const dynamicTables = factory.getDynamicTableService();
  const audit = factory.getAuditService();
  const rekey = inv.filter((t) => t.cls === 'REKEY');
  await opts.onBeforeTx?.();

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
    // L-RK-4 (a): Σ before = 0 dentro da tx → rollback (a linha de units e os plugins somem) e NOTHING_TO_DO.
    if (Object.values(tables).reduce((s, t) => s + t.before, 0) === 0) throw new NothingMoved();

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
  }, { timeout: TX_TIMEOUT_MS, maxWait: 10_000 }).catch((e: unknown) => {
    if (e instanceof NothingMoved) return null;
    throw e;
  });
  if (!result) return { status: 'NOTHING_TO_DO' };

  // Item 14: rastreio só após o COMMIT.
  logger.info('unit_rekeyed', { ...result });
  return { status: 'APPLIED', result };
}

function sortKeys<T>(o: Record<string, T>): Record<string, T> {
  return Object.fromEntries(Object.keys(o).sort().map((k) => [k, o[k]]));
}

// ─────────────────────────────────────────────────────────────── --verify (item 17 + L-RK-2 a / L-RK-3 b)

export interface VerifyReport {
  ok: boolean;
  failures: string[];
  /** Pares inferidos pelo diff pré × pós (L-RK-3 b) — não dependem de `unit.rekeyed`. `rows` = linhas movidas. */
  rekeyed: { ownerUserId: string; from: string; to: string; rows: number; anchored: boolean }[];
  dynamicTableDataAdded: Record<string, number>;
  checks: Record<string, string>;
}

type Row = Record<string, unknown>;
const ownerUnit = (owner: string, unitId: string) => `${owner}\u0000${unitId}`;

/** Pré (backup) × pós (banco atual). Toda divergência fora do esperado vira `failures`. */
export async function verify(db: PrismaClient, inv: InventoryEntry[], against: string): Promise<VerifyReport> {
  if (!fs.existsSync(against)) throw new CliError(1, 'BACKUP_MISSING', `--against não existe: ${against}`);
  const pre = openClient(against);
  const failures: string[] = [];
  const checks: Record<string, string> = {};
  try {
    const rekeyInv = inv.filter((t) => t.cls === 'REKEY');
    const rekeyTables = new Set(rekeyInv.map((t) => t.table));
    const SPECIAL = new Set(['dynamic_table_data', 'audit_events', 'audit_chain_heads']);
    const [preTables, postTables] = [await userTables(pre), await userTables(db)];
    if (stable(preTables) !== stable(postTables)) failures.push('conjunto de tabelas difere entre pré e pós');
    const snap = new Map<string, { a: Row[]; b: Row[] }>();
    for (const t of rekeyInv) snap.set(t.table, { a: await tableRows(pre, t.table), b: await tableRows(db, t.table) });

    // Item 5 — pares inferidos: nas tabelas REKEY com `id`, casar pré × pós por id; todo `unitId` mudado gera um par.
    // As duas tabelas sem `id` (PK contém o unitId) ficam só com o multiconjunto do item 7.
    const moves = new Map<string, { ownerUserId: string; from: string; to: string; rows: number }>();
    for (const t of rekeyInv) {
      const { a, b } = snap.get(t.table)!;
      const sample = a[0] ?? b[0];
      if (!sample || !('id' in sample)) continue;
      const postById = new Map(b.map((r) => [String(r.id), r]));
      const preIds = new Set(a.map((r) => String(r.id)));
      for (const r of a) {
        const p = postById.get(String(r.id));
        if (!p) { failures.push(`(b) ${t.table} ${String(r.id)}: linha do pré removida`); continue; }
        if (p.unitId === r.unitId) continue;
        const [o1, o2] = [String(r[t.ownerColumn]), String(p[t.ownerColumn])];
        if (o1 !== o2) { failures.push(`(b) ${t.table} ${String(r.id)}: regra (i) — o dono mudou (${o1} → ${o2})`); continue; }
        const key = `${ownerUnit(o1, String(r.unitId))}\u0000${String(p.unitId)}`;
        const m = moves.get(key) ?? { ownerUserId: o1, from: String(r.unitId), to: String(p.unitId), rows: 0 };
        m.rows++;
        moves.set(key, m);
      }
      for (const r of b) if (!preIds.has(String(r.id))) failures.push(`(b) ${t.table} ${String(r.id)}: linha criada no pós`);
    }
    const pairs = [...moves.values()].sort((x, y) => (x.ownerUserId + x.from + x.to).localeCompare(y.ownerUserId + y.from + y.to));
    const toOf = new Map<string, string>();
    for (const p of pairs) {
      const k = ownerUnit(p.ownerUserId, p.from);
      if (toOf.has(k)) failures.push(`(b) par ambíguo: (${p.ownerUserId}, ${p.from}) foi para ${toOf.get(k)} e para ${p.to}`);
      else toOf.set(k, p.to);
    }
    // L-RK-6 — regra (v): cada `(dono, to)` vem de exatamente um `from` (o CLI cria uma unidade por invocação).
    const fromsOf = new Map<string, string[]>();
    for (const p of pairs) {
      const k = ownerUnit(p.ownerUserId, p.to);
      fromsOf.set(k, [...(fromsOf.get(k) ?? []), p.from]);
    }
    for (const [k, froms] of fromsOf) {
      if (froms.length > 1) failures.push(`(b) ${k.replace('\u0000', '/')}: regra (v) — destino recebeu mais de uma origem (${froms.join(', ')})`);
    }

    // (a) fora do inventário REKEY: multiconjunto idêntico, salvo as 3 especiais.
    for (const t of postTables) {
      if (rekeyTables.has(t) || SPECIAL.has(t) || !preTables.includes(t)) continue;
      const [a, b] = [await tableDigest(pre, t), await tableDigest(db, t)];
      if (a.sha256 !== b.sha256) failures.push(`(a) ${t}: conteúdo mudou (pré ${a.count} linhas, pós ${b.count})`);
    }
    // dynamic_table_data: linhas do pré intactas; acréscimos contados por tabela dinâmica.
    const preDtd = new Map((await tableRows(pre, 'dynamic_table_data')).map((r) => [String(r.id), stable(r)]));
    const added: Record<string, number> = {};
    const addedIds = new Set<string>();
    let seenDtd = 0;
    for (const r of await tableRows(db, 'dynamic_table_data')) {
      const prev = preDtd.get(String(r.id));
      if (prev === undefined) { added[String(r.dynamicTableId)] = (added[String(r.dynamicTableId)] ?? 0) + 1; addedIds.add(String(r.id)); continue; }
      seenDtd++;
      if (prev !== stable(r)) failures.push(`(a) dynamic_table_data ${String(r.id)}: linha do pré alterada`);
    }
    if (seenDtd !== preDtd.size) failures.push(`(a) dynamic_table_data: ${preDtd.size - seenDtd} linha(s) do pré sumiram`);

    // Item 6 — validade de cada par (+ item 10: todo `to` está entre os acréscimos de dynamic_table_data).
    for (const p of pairs) {
      const label = `par (${p.ownerUserId}, ${p.from} → ${p.to})`;
      const unitRow = await db.dynamicTableData.findUnique({ where: { id: p.to }, include: { dynamicTable: true } });
      if (!unitRow || unitRow.deletedAt || unitRow.dynamicTable.internalName !== 'units' || unitRow.dynamicTable.userId !== p.ownerUserId
        || preDtd.has(p.to) || !addedIds.has(p.to)) {
        failures.push(`(b) ${label}: regra (ii) — destino não é units viva do dono criada depois do pré`);
      }
      const fromRow = await pre.dynamicTableData.findUnique({ where: { id: p.from }, include: { dynamicTable: true } });
      if (fromRow && !fromRow.deletedAt && fromRow.dynamicTable.internalName === 'units') {
        failures.push(`(b) ${label}: regra (iii) — origem era units viva no pré`);
      }
      const left = rekeyInv.reduce((s, t) => s + snap.get(t.table)!.b.filter((r) => String(r[t.ownerColumn]) === p.ownerUserId && String(r.unitId) === p.from).length, 0);
      if (left) failures.push(`(b) ${label}: regra (iv) — ${left} linha(s) REKEY ainda sob a origem no pós`);
    }

    // Item 7 — multiconjunto exato em toda tabela REKEY (inclusive as sem `id`): pré com os pares aplicados = pós.
    for (const t of rekeyInv) {
      const { a, b } = snap.get(t.table)!;
      const expected = a.map((r) => {
        const to = toOf.get(ownerUnit(String(r[t.ownerColumn]), String(r.unitId)));
        return to === undefined ? r : { ...r, unitId: to };
      });
      if (stable(multiset(expected)) !== stable(multiset(b))) {
        failures.push(`(b) ${t.table}: multiconjunto do pós ≠ pré com os pares aplicados (pré ${a.length}, pós ${b.length})`);
      }
    }

    // Item 9 — âncora coerente com os pares. Pré intacto; evento novo só o unit.rekeyed de par com cabeça no pré.
    const preEvents = new Map((await tableRows(pre, 'audit_events')).map((r) => [String(r.id), stable(r)]));
    const postEvents = await tableRows(db, 'audit_events');
    const newEvents = postEvents.filter((r) => !preEvents.has(String(r.id)));
    for (const r of postEvents) {
      const prev = preEvents.get(String(r.id));
      if (prev !== undefined && prev !== stable(r)) failures.push(`(a) audit_events ${String(r.id)}: evento do pré alterado`);
    }
    if (postEvents.length - newEvents.length !== preEvents.size) failures.push('(a) audit_events: evento do pré sumiu');
    const headKey = (r: Row) => ownerUnit(String(r.scopeUserId), String(r.unitId));
    const preHeads = new Map((await tableRows(pre, 'audit_chain_heads')).map((r) => [headKey(r), r]));
    const consumed = new Set<string>();
    const rekeyed: VerifyReport['rekeyed'] = [];
    for (const p of pairs) {
      const preHead = preHeads.get(ownerUnit(p.ownerUserId, p.from));
      const mine = newEvents.filter((r) => String(r.scopeUserId) === p.ownerUserId && String(r.unitId) === p.to);
      for (const r of mine) consumed.add(String(r.id));
      if (preHead) {
        const ev = mine[0];
        const payload = ev ? JSON.parse(String(ev.payload)) as Record<string, unknown> : {};
        const anchorOk = mine.length === 1 && ev.eventType === UNIT_REKEYED_EVENT && num(ev.seq) === 1 && payload.fromUnitId === p.from
          && payload.fromHeadHash === String(preHead.headHash) && payload.fromNextSeq === String(preHead.nextSeq).replace(/n$/, '');
        if (!anchorOk) failures.push(`(a) audit_events: par ${p.from} → ${p.to} exige 1 unit.rekeyed seq=1 com a cabeça do pré (achei ${mine.length} evento(s))`);
      } else if (mine.length) {
        failures.push(`(a) audit_events: par ${p.from} → ${p.to} sem cabeça no pré, mas com ${mine.length} evento(s) novo(s)`);
      }
      rekeyed.push({ ...p, anchored: preHead !== undefined });
    }
    const orphan = newEvents.filter((r) => !consumed.has(String(r.id)));
    if (orphan.length) failures.push(`(a) audit_events: ${orphan.length} evento(s) novo(s) sem par inferido`);
    const anchoredCount = rekeyed.filter((k) => k.anchored).length;
    // L-RK-7 — pré intacto por chave (item 17 a); cabeça nova só a `(dono, to)` de par ancorado.
    const postHeads = new Map((await tableRows(db, 'audit_chain_heads')).map((r) => [headKey(r), r]));
    const anchoredTo = new Set(rekeyed.filter((k) => k.anchored).map((k) => ownerUnit(k.ownerUserId, k.to)));
    for (const [k, prev] of preHeads) {
      const r = postHeads.get(k);
      if (!r) failures.push(`(a) audit_chain_heads ${k.replace('\u0000', '/')}: cabeça do pré sumiu`);
      else if (stable(prev) !== stable(r)) failures.push(`(a) audit_chain_heads ${k.replace('\u0000', '/')}: cabeça do pré alterada`);
    }
    for (const k of postHeads.keys()) {
      if (!preHeads.has(k) && !anchoredTo.has(k)) failures.push(`(a) audit_chain_heads ${k.replace('\u0000', '/')}: cabeça nova sem par ancorado`);
    }
    if (postHeads.size !== preHeads.size + anchoredCount) failures.push(`(a) audit_chain_heads: esperado +${anchoredCount}, achei +${postHeads.size - preHeads.size}`);

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
    // (e) item 11, para TODO par: cadeia legada selada com a mesma cabeça; cadeia nova íntegra.
    const audit = ApplicationFactory.getInstance().getAuditService();
    for (const k of rekeyed) {
      const preHead = preHeads.get(ownerUnit(k.ownerUserId, k.from));
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

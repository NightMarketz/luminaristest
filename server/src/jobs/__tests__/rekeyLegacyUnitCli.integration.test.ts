/**
 * I1b — ADR-INCR-UNIT-REKEY §4 comportamentos 2–15 e 17 contra o SQLite de integração.
 *
 * O banco de teste nasce por `prisma db push` (sem `_prisma_migrations`): o fixture escreve uma linha finalizada por
 * diretório de `prisma/migrations`, o que torna o pré-check do item 3 exercitável (e o caso "uma a menos" também).
 * O dono nasce pelo onboarding real (`POST /api/dashboard/create`), então `units`, a `Matriz` e as tabelas que os
 * plugins de `units` usam são as do preset — não um esquema feito à mão.
 */
import fs from 'fs';
import os from 'os';
import path from 'path';
import request from 'supertest';
import prisma from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { ApplicationFactory } from '@/lib/factory';
import { resolveAccountingScope } from '@/features/accounting/scope/AccountingScope';
import { makeApp, pushTestSchema, authHeader } from '@test/helpers';
import {
  runCli, buildInventory, tableDigest, REKEY_MODELS, KEEP_MODELS, EXCLUDED_UNIT_IDS, UNIT_REKEYED_EVENT,
} from '../rekeyLegacyUnitCli';

const app = makeApp();
const MIGRATIONS_DIR = path.resolve(__dirname, '../../../prisma/migrations');
const work = fs.mkdtempSync(path.join(os.tmpdir(), 'rekey-i1b-'));
let n = 0;

async function markMigrationsApplied(): Promise<void> {
  await prisma.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS "_prisma_migrations" (
    "id" TEXT PRIMARY KEY NOT NULL, "checksum" TEXT NOT NULL, "finished_at" DATETIME, "migration_name" TEXT NOT NULL,
    "logs" TEXT, "rolled_back_at" DATETIME, "started_at" DATETIME NOT NULL DEFAULT current_timestamp,
    "applied_steps_count" INTEGER UNSIGNED NOT NULL DEFAULT 0)`);
  await prisma.$executeRawUnsafe('DELETE FROM "_prisma_migrations"');
  const dirs = fs.readdirSync(MIGRATIONS_DIR, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name);
  for (const d of dirs) {
    await prisma.$executeRawUnsafe(
      'INSERT INTO "_prisma_migrations" (id, checksum, finished_at, migration_name, applied_steps_count) VALUES (?, ?, current_timestamp, ?, 1)',
      `m-${d}`, 'x', d);
  }
}

/** md5-do-banco: digest de TODAS as tabelas. */
async function dbDigest(): Promise<Record<string, string>> {
  const tables = await prisma.$queryRawUnsafe<{ name: string }[]>(
    "SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name");
  const out: Record<string, string> = {};
  for (const { name } of tables) out[name] = (await tableDigest(prisma, name)).sha256;
  return out;
}

async function backup(): Promise<string> {
  n += 1;
  const file = path.join(work, `backup-${n}.db`).replace(/\\/g, '/');
  await prisma.$executeRawUnsafe(`VACUUM INTO '${file}'`);
  return file;
}

async function onboardedOwner(): Promise<{ id: string; matrizId: string; unitsTableId: string }> {
  n += 1;
  const u = await prisma.user.create({ data: { name: `rk-${n}`, username: `rk-user-${n}`, email: `rk-${n}@test.local`, password: 'x', role: 'USER' } });
  const r = await request(app).post('/api/dashboard/create').set(authHeader({ id: u.id, username: u.username }))
    .send({ suiteKey: 'beautySalon', unit: { name: 'Matriz', type: 'Own' } });
  expect(r.status).toBe(201);
  const unitsTable = await prisma.dynamicTable.findFirstOrThrow({ where: { userId: u.id, internalName: 'units' } });
  return { id: u.id, matrizId: r.body.data.unitId, unitsTableId: unitsTable.id };
}

/** Uma linha do legado em cada grupo (ledger, AP, fiscal, dimensões, lalur, data exchange) + 2 eventos na trilha legada. */
async function seedLegacy(owner: string, unitId: string): Promise<void> {
  const acc = await prisma.account.create({ data: { userId: owner, unitId, code: '1.1.1', name: 'Caixa', nature: 'Asset', acceptsEntries: true } });
  const rev = await prisma.account.create({ data: { userId: owner, unitId, code: '3.1', name: 'Receita', nature: 'Revenue', acceptsEntries: true } });
  await prisma.accountingPeriod.create({ data: { userId: owner, unitId, year: 2026, month: 1, status: 'OPEN', openedAt: new Date() } });
  await prisma.journalEntry.create({
    data: {
      userId: owner, unitId, date: new Date('2026-01-10T00:00:00Z'), description: 'venda', sourceType: 'MANUAL', sourceId: `s-${unitId}`,
      postings: { create: [
        { userId: owner, unitId, accountId: acc.id, debitCents: 1000n },
        { userId: owner, unitId, accountId: rev.id, creditCents: 1000n },
      ] },
    },
  });
  const cp = await prisma.counterparty.create({ data: { userId: owner, unitId, type: 'SUPPLIER', name: 'Fornecedor', nameNormalized: 'fornecedor' } });
  await prisma.payable.create({
    data: {
      userId: owner, unitId, supplierName: 'Fornecedor', description: 'compra', issueDate: new Date('2026-01-05T00:00:00Z'),
      dueDate: new Date('2026-02-05T00:00:00Z'), amountCents: 500n, counterpartyId: cp.id, status: 'OPEN', documentNumber: `d-${unitId}`,
    },
  });
  await prisma.fiscalProfile.create({ data: { userId: owner, unitId, regimeTributario: 'PRESUMIDO', pisCofinsRegime: 'CUMULATIVO' } });
  await prisma.dimensionDefinition.create({ data: { userId: owner, unitId, code: 'COST_CENTER', name: 'Centro de Custo' } });
  await prisma.lalurEntry.create({ data: { userId: owner, unitId, year: 2026, quarter: 'T01', livro: 'lalur', codigo: '1', valorCents: 0n } });
  await prisma.accountingDataExchangeJob.create({
    data: { userId: owner, unitId, direction: 'EXPORT', kind: 'EXPORT_CHART_OF_ACCOUNTS', status: 'EXPORTED', requestedById: owner, storageKey: `exports/${owner}/${unitId}/job.csv` },
  });
  const audit = ApplicationFactory.getInstance().getAuditService();
  const scope = resolveAccountingScope({ userId: owner }, unitId);
  for (const code of ['1.1.1', '3.1']) {
    await prisma.$transaction((tx) => audit.append(tx, scope, { actorUserId: owner, eventType: 'account.created', targetType: 'Account', targetId: code, payload: { code } }));
  }
}

const rekeyInv = () => buildInventory().filter((t) => t.cls === 'REKEY');
/** As duas tabelas REKEY sem `id` (a PK inclui o unitId) — BRIEF de lacunas §0. */
const NO_ID_TABLES = ['journal_entry_sequences', 'fiscal_document_sequences'];
async function rowsUnder(owner: string, unitId: string): Promise<Record<string, number>> {
  const out: Record<string, number> = {};
  for (const t of rekeyInv()) {
    const [{ c }] = await prisma.$queryRawUnsafe<{ c: unknown }[]>(`SELECT COUNT(*) AS c FROM "${t.table}" WHERE "${t.ownerColumn}" = ? AND "unitId" = ?`, owner, unitId);
    if (Number(c) > 0) out[t.table] = Number(c);
  }
  return out;
}
const pipelinesFor = async (owner: string, unitId: string) => {
  const t = await prisma.dynamicTable.findFirst({ where: { userId: owner, internalName: 'leadPipelines' } });
  return t ? (await prisma.dynamicTableData.findMany({ where: { dynamicTableId: t.id } })).filter((r) => (r.data as { unitId?: string }).unitId === unitId) : [];
};
const unitRows = (unitsTableId: string) => prisma.dynamicTableData.findMany({ where: { dynamicTableId: unitsTableId }, orderBy: { createdAt: 'asc' } });

function captureStdout(): { lines: string[]; restore: () => void } {
  const lines: string[] = [];
  const log = jest.spyOn(console, 'log').mockImplementation((...a: unknown[]) => { lines.push(a.map(String).join(' ')); });
  const err = jest.spyOn(console, 'error').mockImplementation((...a: unknown[]) => { lines.push(a.map(String).join(' ')); });
  return { lines, restore: () => { log.mockRestore(); err.mockRestore(); } };
}
async function cli(argv: string[], opts?: Parameters<typeof runCli>[1]): Promise<{ code: number; out: string }> {
  const cap = captureStdout();
  try {
    const code = await runCli(argv, { migrationsDir: MIGRATIONS_DIR, ...opts });
    return { code, out: cap.lines.join('\n') };
  } finally {
    cap.restore();
  }
}
const applyArgs = (owner: string, from: string, backupPath: string, extra: string[] = []) =>
  ['--apply', '--owner-user-id', owner, '--from', from, '--name', 'Filial Legada', '--type', 'Franchise', '--backup-path', backupPath, ...extra];

describe('I1b — rekeyLegacyUnitCli', () => {
  beforeAll(async () => {
    pushTestSchema();
    await markMigrationsApplied();
  }, 180000);

  afterEach(() => jest.restoreAllMocks());

  afterAll(async () => {
    await prisma.$disconnect();
    fs.rmSync(work, { recursive: true, force: true });
  });

  it('item 2: inventário do DMMF = 50 models com unitId, classificação fechada 48 REKEY + 2 KEEP, toda REKEY com userId', () => {
    // 47 na medição do ADR (26/09) + ProductDestinationDefault (#481) + PaymentAccount (#484) + AccountantAssignment (#482). Model novo com unitId derruba este teste até ser classificado.
    const inv = buildInventory();
    expect(inv).toHaveLength(50);
    expect(inv.filter((t) => t.cls === 'REKEY').map((t) => t.model).sort()).toEqual([...REKEY_MODELS].sort());
    expect(inv.filter((t) => t.cls === 'KEEP').map((t) => t.model).sort()).toEqual([...KEEP_MODELS].sort());
    expect(inv.filter((t) => t.cls === 'REKEY').every((t) => t.ownerColumn === 'userId')).toBe(true);
    expect(inv.filter((t) => t.cls === 'KEEP').every((t) => t.ownerColumn === 'scopeUserId')).toBe(true);
  });

  it('item 7: args inválidos → exit 2 (sem --name, flag desconhecida, --type fora do enum, dois modos)', async () => {
    expect((await cli(['--apply', '--owner-user-id', 'u', '--from', 'x', '--backup-path', 'b'])).code).toBe(2);
    expect((await cli(['--plan', '--db', 'x.db'])).code).toBe(2);
    expect((await cli(['--apply', '--owner-user-id', 'u', '--from', 'x', '--name', 'N', '--type', 'Filial', '--backup-path', 'b'])).code).toBe(2);
    expect((await cli(['--plan', '--verify', '--against', 'x'])).code).toBe(2);
  });

  it('itens 4–6: --plan só lê e classifica SKIP_REAL_UNIT / LEGACY / EXCLUDED_TENANT (sem units ou seed-unit-*)', async () => {
    const o = await onboardedOwner();
    await seedLegacy(o.id, 'legacy-plan');
    await seedLegacy(o.id, EXCLUDED_UNIT_IDS[1]);
    await prisma.account.create({ data: { userId: o.id, unitId: o.matrizId, code: '9', name: 'x', nature: 'Asset', acceptsEntries: true } });
    const semUnits = await prisma.user.create({ data: { name: 'sem-units', username: 'rk-sem-units', email: 'rk-sem-units@test.local', password: 'x', role: 'USER' } });
    await prisma.account.create({ data: { userId: semUnits.id, unitId: 'legacy-sem-units', code: '1', name: 'x', nature: 'Asset', acceptsEntries: true } });

    const before = await dbDigest();
    const r = await cli(['--plan']);
    expect(r.code).toBe(0);
    expect(await dbDigest()).toEqual(before);
    expect(r.out).toMatch(/^alvo: .*test-integration\.db/m);
    const rows: { ownerUserId: string; unitId: string; status: string; tables: Record<string, number> }[] = JSON.parse(r.out.slice(r.out.indexOf('{'))).rows;
    const st = (owner: string, unitId: string) => rows.find((x) => x.ownerUserId === owner && x.unitId === unitId);
    expect(st(o.id, o.matrizId)?.status).toBe('SKIP_REAL_UNIT');
    expect(st(o.id, 'legacy-plan')).toMatchObject({ status: 'LEGACY', tables: expect.objectContaining({ accounts: 2, postings: 2, payables: 1, lalur_entries: 1 }) });
    expect(st(o.id, EXCLUDED_UNIT_IDS[1])?.status).toBe('EXCLUDED_TENANT');
    expect(st(semUnits.id, 'legacy-sem-units')?.status).toBe('EXCLUDED_TENANT');

    // item 6 no --apply: recusa NO_UNITS_TABLE, nada escrito — nos dois critérios.
    const b = await backup();
    const before2 = await dbDigest();
    const ex1 = await cli(applyArgs(o.id, EXCLUDED_UNIT_IDS[1], b));
    const ex2 = await cli(applyArgs(semUnits.id, 'legacy-sem-units', b));
    expect([ex1.code, ex2.code]).toEqual([1, 1]);
    expect(ex1.out).toContain('NO_UNITS_TABLE');
    expect(ex2.out).toContain('NO_UNITS_TABLE');
    expect(await dbDigest()).toEqual(before2);
  }, 120000);

  it('item 5: unitId que é units de OUTRO dono → exit 1 UNIT_OWNER_MISMATCH (plan e apply), nada escrito; real do próprio dono → SKIP no apply', async () => {
    const a = await onboardedOwner();
    const b = await onboardedOwner();
    const intruso = await prisma.account.create({ data: { userId: b.id, unitId: a.matrizId, code: '1', name: 'x', nature: 'Asset', acceptsEntries: true } });
    try {
      const bk = await backup();
      const before = await dbDigest();
      const p = await cli(['--plan']);
      const ap = await cli(applyArgs(b.id, a.matrizId, bk));
      expect([p.code, ap.code]).toEqual([1, 1]);
      expect(p.out).toContain('UNIT_OWNER_MISMATCH');
      expect(ap.out).toContain('UNIT_OWNER_MISMATCH');
      expect(await dbDigest()).toEqual(before);
    } finally {
      await prisma.account.delete({ where: { id: intruso.id } });
    }
    const bk2 = await backup();
    const before2 = await dbDigest();
    const skip = await cli(applyArgs(a.id, a.matrizId, bk2));
    expect(skip.code).toBe(0);
    expect(skip.out).toContain('SKIP_REAL_UNIT');
    expect(await dbDigest()).toEqual(before2);
  }, 120000);

  it('item 3: uma migração a menos em _prisma_migrations → exit 1 antes de qualquer escrita', async () => {
    const o = await onboardedOwner();
    await seedLegacy(o.id, 'legacy-schema');
    const [last] = await prisma.$queryRawUnsafe<{ id: string }[]>('SELECT id FROM "_prisma_migrations" ORDER BY migration_name DESC LIMIT 1');
    await prisma.$executeRawUnsafe('UPDATE "_prisma_migrations" SET finished_at = NULL WHERE id = ?', last.id);
    try {
      const bk = await backup();
      const before = await dbDigest();
      const r = await cli(applyArgs(o.id, 'legacy-schema', bk));
      expect(r.code).toBe(1);
      expect(r.out).toContain('SCHEMA_PENDING_MIGRATIONS');
      expect(await dbDigest()).toEqual(before);
    } finally {
      await prisma.$executeRawUnsafe('UPDATE "_prisma_migrations" SET finished_at = current_timestamp WHERE id = ?', last.id);
    }
  }, 120000);

  it('item 15: backup ausente / inválido / anterior ao último updatedAt → recusa, nada escrito', async () => {
    const o = await onboardedOwner();
    await seedLegacy(o.id, 'legacy-backup');
    const lixo = path.join(work, 'lixo.db');
    fs.writeFileSync(lixo, 'isto não é um banco SQLite '.repeat(200));
    const velho = await backup();
    fs.utimesSync(velho, new Date('2000-01-01'), new Date('2000-01-01'));
    const before = await dbDigest();
    // Sem o flag: args inválidos, exit 2 (L-RK-1 → a; o item 15 do ADR foi emendado).
    const sem = await cli(['--apply', '--owner-user-id', o.id, '--from', 'legacy-backup', '--name', 'X']);
    expect(sem.code).toBe(2);
    const inexistente = await cli(applyArgs(o.id, 'legacy-backup', path.join(work, 'nao-existe.db')));
    const invalido = await cli(applyArgs(o.id, 'legacy-backup', lixo));
    const antigo = await cli(applyArgs(o.id, 'legacy-backup', velho));
    expect([inexistente.code, invalido.code, antigo.code]).toEqual([1, 1, 1]);
    expect(inexistente.out).toContain('BACKUP_MISSING');
    expect(invalido.out).toContain('BACKUP_INVALID');
    expect(antigo.out).toContain('BACKUP_STALE');
    expect(await dbDigest()).toEqual(before);
  }, 120000);

  it('item 10: falha na 20ª tabela → rollback total (banco idêntico, sem linha em units, sem pipeline semeado)', async () => {
    const o = await onboardedOwner();
    await seedLegacy(o.id, 'legacy-fail');
    const bk = await backup();
    const before = await dbDigest();
    const r = await cli(applyArgs(o.id, 'legacy-fail', bk), {
      onTableRekeyed: (_t, i) => { if (i === 19) throw new Error('falha injetada na 20ª tabela'); },
    });
    expect(r.code).toBe(1);
    expect(await dbDigest()).toEqual(before);
    expect(await unitRows(o.unitsTableId)).toHaveLength(1);
  }, 120000);

  it('itens 8, 9, 11–14 e 17: --apply re-chaveia tudo numa tx, ancora a trilha, é idempotente, e --verify confere pré × pós', async () => {
    const o = await onboardedOwner();
    await seedLegacy(o.id, 'legacy-ok');
    const legacyBefore = await rowsUnder(o.id, 'legacy-ok');
    const legacyHead = await prisma.auditChainHead.findUniqueOrThrow({ where: { scopeUserId_unitId: { scopeUserId: o.id, unitId: 'legacy-ok' } } });
    const storageKeyBefore = (await prisma.accountingDataExchangeJob.findFirstOrThrow({ where: { userId: o.id, unitId: 'legacy-ok' } })).storageKey;
    // Item 11 do BRIEF de lacunas: 1 produto antes do --apply → o UnitAutoStockPlugin semeia estoque para a unidade nova.
    const productsTable = await prisma.dynamicTable.findFirstOrThrow({ where: { userId: o.id, internalName: 'products' } });
    const product = await prisma.dynamicTableData.create({ data: { dynamicTableId: productsTable.id, data: { name: 'Escova' } } });
    const pre = await backup();
    const info = jest.spyOn(logger, 'info');

    const r = await cli(applyArgs(o.id, 'legacy-ok', pre));
    expect(r.code).toBe(0);
    expect(r.out).toMatch(/servidor tem de estar PARADO/); // item 18: o CLI avisa
    const result = JSON.parse(r.out.split('\n').filter((l) => l.startsWith('{"event":"unit_rekeyed"')).pop() as string);
    const to: string = result.to;

    // item 8: linha nova pelo caminho normal — shape da Matriz + plugins rodaram para a unidade nova.
    const units = await unitRows(o.unitsTableId);
    expect(units).toHaveLength(2);
    expect(units[1]).toMatchObject({ id: to, data: { name: 'Filial Legada', type: 'Franchise', isActive: true } });
    expect(Object.keys(units[1].data as object).sort()).toEqual(expect.arrayContaining(['name', 'isActive']));
    expect((await pipelinesFor(o.id, to)).map((p) => (p.data as { name: string }).name)).toEqual(['Pipeline Padrão']);
    const productUnitsTable = await prisma.dynamicTable.findFirstOrThrow({ where: { userId: o.id, internalName: 'productUnits' } });
    const stock = (await prisma.dynamicTableData.findMany({ where: { dynamicTableId: productUnitsTable.id } }))
      .map((r) => r.data as { productId: string; unitId: string; stock: number })
      .filter((d) => d.unitId === to);
    expect(stock).toEqual([expect.objectContaining({ productId: product.id, unitId: to, stock: 0 })]);

    // item 9/10: tudo do legado foi para o id novo, contagens batem, storageKey intacto.
    expect(await rowsUnder(o.id, 'legacy-ok')).toEqual({});
    expect(await rowsUnder(o.id, to)).toEqual(legacyBefore);
    for (const [t, c] of Object.entries(legacyBefore)) expect(result.tables[t]).toEqual({ before: c, affected: c, after: c });
    expect((await prisma.accountingDataExchangeJob.findFirstOrThrow({ where: { userId: o.id, unitId: to } })).storageKey).toBe(storageKeyBefore);

    // itens 11–12: cadeia legada selada com a mesma cabeça; a nova abre com unit.rekeyed em seq=1 apontando para ela.
    const audit = ApplicationFactory.getInstance().getAuditService();
    const legacy = await audit.verifyAuditChain(resolveAccountingScope({ userId: o.id }, 'legacy-ok'));
    expect(legacy).toMatchObject({ ok: true, lastSeq: legacyHead.nextSeq - 1n, headHash: legacyHead.headHash });
    expect((await audit.verifyAuditChain(resolveAccountingScope({ userId: o.id }, to))).ok).toBe(true);
    const anchor = await prisma.auditEvent.findFirstOrThrow({ where: { scopeUserId: o.id, unitId: to } });
    expect(anchor).toMatchObject({ seq: 1n, eventType: UNIT_REKEYED_EVENT, targetType: 'unit', targetId: to });
    expect(JSON.parse(anchor.payload as string)).toMatchObject({ fromUnitId: 'legacy-ok', fromHeadHash: legacyHead.headHash, fromNextSeq: legacyHead.nextSeq.toString() });
    expect(result.auditAnchor).toEqual({ seq: 1, fromHeadHash: legacyHead.headHash, fromNextSeq: legacyHead.nextSeq.toString() });

    // item 14: rastreio após o commit.
    expect(info).toHaveBeenCalledWith('unit_rekeyed', expect.objectContaining({ event: 'unit_rekeyed', ownerUserId: o.id, from: 'legacy-ok', to }));

    // item 17: verificação dirigida pré × pós.
    const v = await cli(['--verify', '--against', pre]);
    expect(v.code).toBe(0);
    const report = JSON.parse(v.out.slice(v.out.indexOf('{')));
    // Pares inferidos pelo diff (L-RK-3 b). `rows` só conta as tabelas com `id` (as 2 sem `id` ficam no multiconjunto).
    const moved = Object.entries(legacyBefore).filter(([t]) => !NO_ID_TABLES.includes(t)).reduce((s, [, c]) => s + c, 0);
    expect(report).toMatchObject({ ok: true, failures: [], rekeyed: [{ ownerUserId: o.id, from: 'legacy-ok', to, rows: moved, anchored: true }] });
    expect(report.dynamicTableDataAdded[o.unitsTableId]).toBe(1);

    // item 13: 2ª execução → NOTHING_TO_DO, nada novo (1 unidade, 1 evento, 1 pipeline).
    const again = await cli(applyArgs(o.id, 'legacy-ok', await backup()));
    expect(again.code).toBe(0);
    expect(again.out).toContain('NOTHING_TO_DO');
    expect(await unitRows(o.unitsTableId)).toHaveLength(2);
    expect(await prisma.auditEvent.count({ where: { eventType: UNIT_REKEYED_EVENT, scopeUserId: o.id } })).toBe(1);
    expect(await pipelinesFor(o.id, to)).toHaveLength(1);

    // item 17, lado vermelho: mexer numa tabela fora do inventário reprova o --verify.
    await prisma.user.update({ where: { id: o.id }, data: { name: 'adulterado' } });
    const bad = await cli(['--verify', '--against', pre]);
    expect(bad.code).toBe(1);
    expect(bad.out).toMatch(/\(a\) User: conteúdo mudou/);
  }, 180000);

  it('L-RK-2, P1a/P1b do revisor do #480 (itens 12–13): conta devolvida ao legado → regra (iv); linha de outro dono → HIJACKED → regra (ii)', async () => {
    const o = await onboardedOwner();
    await seedLegacy(o.id, 'legacy-p1');
    const outro = await prisma.user.create({ data: { name: 'rk-outro', username: 'rk-outro', email: 'rk-outro@test.local', password: 'x', role: 'USER' } });
    const contaOutro = await prisma.account.create({ data: { userId: outro.id, unitId: 'legacy-outro', code: '1', name: 'x', nature: 'Asset', acceptsEntries: true } });
    const pre = await backup();
    const r = await cli(applyArgs(o.id, 'legacy-p1', pre));
    expect(r.code).toBe(0);
    const to: string = JSON.parse(r.out.split('\n').filter((l) => l.startsWith('{"event":"unit_rekeyed"')).pop() as string).to;

    const conta = await prisma.account.findFirstOrThrow({ where: { userId: o.id, unitId: to, code: '1.1.1' } });
    await prisma.$executeRawUnsafe('UPDATE accounts SET "unitId" = ? WHERE id = ?', 'legacy-p1', conta.id);
    const p1a = await cli(['--verify', '--against', pre]);
    await prisma.$executeRawUnsafe('UPDATE accounts SET "unitId" = ? WHERE id = ?', to, conta.id);
    expect(p1a.code).toBe(1);
    expect(p1a.out).toMatch(/regra \(iv\)/);

    await prisma.$executeRawUnsafe('UPDATE accounts SET "unitId" = ? WHERE id = ?', 'HIJACKED', contaOutro.id);
    const p1b = await cli(['--verify', '--against', pre]);
    await prisma.$executeRawUnsafe('UPDATE accounts SET "unitId" = ? WHERE id = ?', 'legacy-outro', contaOutro.id);
    expect(p1b.code).toBe(1);
    expect(p1b.out).toMatch(/legacy-outro → HIJACKED\): regra \(ii\)/);
    expect((await cli(['--verify', '--against', pre])).code).toBe(0); // as duas adulterações desfeitas → verde
  }, 120000);

  it('L-RK-4 (item 2): legado esvaziado entre o preflight e a tx → gate in-tx faz rollback e NOTHING_TO_DO', async () => {
    const o = await onboardedOwner();
    await seedLegacy(o.id, 'legacy-race');
    const bk = await backup();
    const unitsBefore = (await unitRows(o.unitsTableId)).length;
    const eventsBefore = await prisma.auditEvent.count({ where: { eventType: UNIT_REKEYED_EVENT, scopeUserId: o.id } });
    const pipesTable = await prisma.dynamicTable.findFirstOrThrow({ where: { userId: o.id, internalName: 'leadPipelines' } });
    const pipesBefore = await prisma.dynamicTableData.count({ where: { dynamicTableId: pipesTable.id } });

    const r = await cli(applyArgs(o.id, 'legacy-race', bk), {
      onBeforeTx: async () => {
        for (const t of rekeyInv()) {
          await prisma.$executeRawUnsafe(`UPDATE "${t.table}" SET "unitId" = ? WHERE "${t.ownerColumn}" = ? AND "unitId" = ?`, 'legacy-race-movido', o.id, 'legacy-race');
        }
      },
    });
    expect(r.code).toBe(0);
    expect(r.out).toContain('NOTHING_TO_DO');
    expect(await unitRows(o.unitsTableId)).toHaveLength(unitsBefore);
    expect(await prisma.auditEvent.count({ where: { eventType: UNIT_REKEYED_EVENT, scopeUserId: o.id } })).toBe(eventsBefore);
    expect(await prisma.dynamicTableData.count({ where: { dynamicTableId: pipesTable.id } })).toBe(pipesBefore);
  }, 120000);

  it('L-RK-5 (itens 3–4): units APAGADA do dono → DELETED_REAL_UNIT no --plan, exit 1 no --apply; de OUTRO dono → UNIT_OWNER_MISMATCH (F-RKL-1 a)', async () => {
    const a = await onboardedOwner();
    const apagada = await prisma.dynamicTableData.create({ data: { dynamicTableId: a.unitsTableId, data: { name: 'Fechada', isActive: false }, deletedAt: new Date() } });
    await seedLegacy(a.id, apagada.id);

    const bk = await backup();
    const before = await dbDigest();
    const p = await cli(['--plan']);
    expect(p.code).toBe(0);
    const rows: { ownerUserId: string; unitId: string; status: string }[] = JSON.parse(p.out.slice(p.out.indexOf('{'))).rows;
    expect(rows.find((x) => x.ownerUserId === a.id && x.unitId === apagada.id)?.status).toBe('DELETED_REAL_UNIT');
    const ap = await cli(applyArgs(a.id, apagada.id, bk));
    expect(ap.code).toBe(1);
    expect(ap.out).toContain('DELETED_REAL_UNIT');
    expect(await dbDigest()).toEqual(before);

    const b = await onboardedOwner();
    const intruso = await prisma.account.create({ data: { userId: b.id, unitId: apagada.id, code: '1', name: 'x', nature: 'Asset', acceptsEntries: true } });
    try {
      const bk2 = await backup();
      const before2 = await dbDigest();
      const p2 = await cli(['--plan']);
      const ap2 = await cli(applyArgs(b.id, apagada.id, bk2));
      expect([p2.code, ap2.code]).toEqual([1, 1]);
      expect(p2.out).toContain('UNIT_OWNER_MISMATCH');
      expect(ap2.out).toContain('UNIT_OWNER_MISMATCH');
      expect(await dbDigest()).toEqual(before2);
    } finally {
      await prisma.account.delete({ where: { id: intruso.id } });
    }
  }, 120000);

  it('L-RK-3, P2 do revisor do #480 (item 14): legado SEM trilha → --verify exit 0 com o par inferido, sem âncora', async () => {
    const o = await onboardedOwner();
    await prisma.account.create({ data: { userId: o.id, unitId: 'legacy-sem-trilha', code: '1', name: 'Caixa', nature: 'Asset', acceptsEntries: true } });
    await prisma.account.create({ data: { userId: o.id, unitId: 'legacy-sem-trilha', code: '2', name: 'Banco', nature: 'Asset', acceptsEntries: true } });
    const pre = await backup();
    const r = await cli(applyArgs(o.id, 'legacy-sem-trilha', pre));
    expect(r.code).toBe(0);
    const result = JSON.parse(r.out.split('\n').filter((l) => l.startsWith('{"event":"unit_rekeyed"')).pop() as string);
    expect(result.auditAnchor).toBeNull();

    const v = await cli(['--verify', '--against', pre]);
    expect(v.code).toBe(0);
    const report = JSON.parse(v.out.slice(v.out.indexOf('{')));
    expect(report.rekeyed).toEqual([{ ownerUserId: o.id, from: 'legacy-sem-trilha', to: result.to, rows: 2, anchored: false }]);
  }, 120000);

  it('L-RK-6 (BRIEF VERIFY-V itens 1–2): dois legados sem trilha fundidos no mesmo `to` → --verify exit 1 pela regra (v)', async () => {
    const o = await onboardedOwner();
    await prisma.account.create({ data: { userId: o.id, unitId: 'legacy-v-a', code: '1', name: 'Caixa', nature: 'Asset', acceptsEntries: true } });
    await prisma.account.create({ data: { userId: o.id, unitId: 'legacy-v-b', code: '2', name: 'Banco', nature: 'Asset', acceptsEntries: true } });
    const pre = await backup();
    const r = await cli(applyArgs(o.id, 'legacy-v-a', pre));
    expect(r.code).toBe(0);
    const to: string = JSON.parse(r.out.split('\n').filter((l) => l.startsWith('{"event":"unit_rekeyed"')).pop() as string).to;
    expect((await cli(['--verify', '--against', pre])).code).toBe(0);

    // Adulteração manual: as linhas de B vão para o `to` de A.
    await prisma.$executeRawUnsafe('UPDATE accounts SET "unitId" = ? WHERE "userId" = ? AND "unitId" = ?', to, o.id, 'legacy-v-b');
    const v = await cli(['--verify', '--against', pre]);
    expect(v.code).toBe(1);
    expect(v.out).toMatch(/regra \(v\).*legacy-v-a.*legacy-v-b/);
  }, 120000);

  it('L-RK-7 (BRIEF VERIFY-V itens 3–5): cabeça do pré trocada por uma falsa (contagem igual) → --verify exit 1 citando a que sumiu', async () => {
    const o = await onboardedOwner();
    await seedLegacy(o.id, 'legacy-head');
    const pre = await backup();
    expect((await cli(['--verify', '--against', pre])).code).toBe(0); // sem --apply, sem adulteração → verde

    await prisma.$executeRawUnsafe('UPDATE audit_chain_heads SET "unitId" = ? WHERE "scopeUserId" = ? AND "unitId" = ?', 'cabeca-falsa', o.id, 'legacy-head');
    try {
      const v = await cli(['--verify', '--against', pre]);
      expect(v.code).toBe(1);
      expect(v.out).toContain(`(a) audit_chain_heads ${o.id}/legacy-head: cabeça do pré sumiu`);
      expect(v.out).toContain(`(a) audit_chain_heads ${o.id}/cabeca-falsa: cabeça nova sem par ancorado`);
    } finally {
      await prisma.$executeRawUnsafe('UPDATE audit_chain_heads SET "unitId" = ? WHERE "scopeUserId" = ? AND "unitId" = ?', 'legacy-head', o.id, 'cabeca-falsa');
    }
  }, 120000);
});

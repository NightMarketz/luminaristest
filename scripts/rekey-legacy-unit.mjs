#!/usr/bin/env node
// rekey-legacy-unit.mjs — nó I1b, docs/adr/ADR-INCR-UNIT-REKEY-migration.md (§4, §5). Wrapper ts-node do CLI
// server/src/jobs/rekeyLegacyUnitCli.ts (molde: scripts/activate-salon-binding.mjs). MIGRAÇÃO DE DADO: dá a um unitId
// legado uma linha real em `units` e re-chaveia as tabelas contábeis do dono — toda a lógica vive no CLI TypeScript
// (DynamicTableService.createTableData + AuditService.append reais), este arquivo só repassa os argumentos.
//
// NÃO é chamado por Dockerfile, docker-compose, server.ts, postinstall nem script de start (ADR-M2 decisão 4; item 1).
// Execução no dev.db real é GATE HUMANO: docs/accounting/RUNBOOK-I1B-UNIT-REKEY.md (item 16), servidor PARADO.
//
// Uso:
//   node scripts/rekey-legacy-unit.mjs --plan
//   node scripts/rekey-legacy-unit.mjs --apply --owner-user-id <id> --from <legado> --name "<nome>" \
//        [--type Own|Franchise|Department] --backup-path <arquivo.db>
//   node scripts/rekey-legacy-unit.mjs --verify --against <backup.db>
//   node scripts/rekey-legacy-unit.mjs --self-check
//
// ALVO: não há --db. O CLI filho carrega server/.env com override (classe env-override-defeats-db-flag) — o banco é o
// DATABASE_URL do .env. Para ensaiar sobre cópia, troque o .env (runbook). O CLI imprime "alvo: <caminho absoluto>"
// (PRAGMA database_list) antes de qualquer escrita.
//
// --self-check: não toca em banco do projeto. SQLite temporário (prisma migrate deploy) + 1 dono com tabela `units` +
// linhas sob um unitId legado; roda --plan → --apply → --apply (idempotência) → --verify. O filho roda com
// NODE_ENV=test para o .env NÃO sobrescrever o DATABASE_URL temporário, e o --plan inicial confere que o "alvo:" é o
// temporário antes de qualquer --apply (aborta se não for).

import { existsSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { randomUUID } from 'node:crypto';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SERVER = join(ROOT, 'server');
const require = createRequire(import.meta.url);
const args = process.argv.slice(2);

function runTs(cliArgs, env = {}) {
  try {
    const out = execFileSync('npx', ['ts-node', '-r', 'tsconfig-paths/register', 'src/jobs/rekeyLegacyUnitCli.ts', ...cliArgs], {
      cwd: SERVER,
      // OPENAI_API_KEY: o ApplicationFactory constrói o cliente OpenAI incondicionalmente; este CLI nunca o chama.
      env: { ...process.env, OPENAI_API_KEY: process.env.OPENAI_API_KEY || 'ci-dummy-openai-key', ...env },
      encoding: 'utf8',
      shell: process.platform === 'win32',
      stdio: 'pipe',
    });
    return { code: 0, out };
  } catch (e) {
    return { code: e.status ?? 1, out: String(e.stdout || '') + String(e.stderr || '') };
  }
}

// ==================================================================== self-check
async function selfCheck() {
  const { PrismaClient } = require(join(SERVER, 'generated', 'prisma'));
  const work = mkdtempSync(join(tmpdir(), 'rekey-legacy-unit-selfcheck-'));
  const dbPath = join(work, 'selfcheck.db');
  const url = `file:${dbPath.replace(/\\/g, '/')}`;
  const env = { DATABASE_URL: url, NODE_ENV: 'test' };
  let failures = 0;
  const ok = (cond, msg) => {
    if (cond) console.log(`  ok: ${msg}`);
    else { failures++; console.error(`  FALHA: ${msg}`); }
  };
  const db = new PrismaClient({ datasources: { db: { url } } });
  const step = (title, r) => { console.log(`\n[self-check] ${title} → exit ${r.code}\n${r.out}`); return r; };
  try {
    console.log('[self-check] schema — prisma migrate deploy sobre banco temporário');
    execFileSync('npx', ['prisma', 'migrate', 'deploy'], { cwd: SERVER, env: { ...process.env, DATABASE_URL: url }, encoding: 'utf8', shell: process.platform === 'win32', stdio: 'pipe' });

    const owner = `selfcheck-${randomUUID()}`;
    const legacy = `legacy-${randomUUID()}`;
    await db.user.create({ data: { id: owner, username: owner, email: `${owner}@example.invalid`, password: 'x' } });
    const units = await db.dynamicTable.create({
      data: {
        userId: owner, name: 'Units', internalName: 'units', category: 'business',
        schema: { defaultDisplayField: 'name', fields: [
          { name: 'name', label: 'Unit Name', type: 'string', required: true },
          { name: 'type', label: 'Type', type: 'select', options: ['Own', 'Franchise', 'Department'], required: false },
          { name: 'isActive', label: 'Is Active', type: 'boolean', required: false },
        ] },
      },
    });
    const caixa = await db.account.create({ data: { userId: owner, unitId: legacy, code: '1.1.1', name: 'Caixa', nature: 'Asset', acceptsEntries: true } });
    const receita = await db.account.create({ data: { userId: owner, unitId: legacy, code: '3.1', name: 'Receita', nature: 'Revenue', acceptsEntries: true } });
    await db.journalEntry.create({ data: {
      userId: owner, unitId: legacy, date: new Date('2026-01-10T00:00:00Z'), description: 'venda', sourceType: 'MANUAL', sourceId: 's-1',
      postings: { create: [
        { userId: owner, unitId: legacy, accountId: caixa.id, debitCents: 1000n },
        { userId: owner, unitId: legacy, accountId: receita.id, creditCents: 1000n },
      ] },
    } });

    const plan = step('--plan', runTs(['--plan'], env));
    const alvo = (plan.out.match(/^alvo: (.*)$/m) || [])[1]?.trim();
    if (!alvo || resolve(alvo).toLowerCase() !== resolve(dbPath).toLowerCase()) {
      throw new Error(`o CLI filho não está no banco temporário (alvo: ${alvo}) — abortado ANTES de qualquer --apply.`);
    }
    ok(plan.code === 0 && /"status": "LEGACY"/.test(plan.out), '--plan classifica o legado como LEGACY');

    const backup = join(work, 'pre.db').replace(/\\/g, '/');
    await db.$executeRawUnsafe(`VACUUM INTO '${backup}'`);
    const apply = ['--apply', '--owner-user-id', owner, '--from', legacy, '--name', 'Filial', '--type', 'Own', '--backup-path', backup];
    const a1 = step('--apply (1ª)', runTs(apply, env));
    ok(a1.code === 0 && /"event":"unit_rekeyed"/.test(a1.out), '1ª --apply re-chaveou (unit_rekeyed)');
    // Backup fresco a cada --apply (item 15): o 1º re-key mexeu no banco, o pre.db já é anterior ao último updatedAt.
    const backup2 = join(work, 'pre2.db').replace(/\\/g, '/');
    await db.$executeRawUnsafe(`VACUUM INTO '${backup2}'`);
    const stale = step('--apply com o backup do 1º (velho)', runTs(apply, env));
    ok(stale.code === 1 && /BACKUP_STALE/.test(stale.out), 'backup anterior ao último updatedAt é recusado (BACKUP_STALE)');
    const a2 = step('--apply (2ª — idempotência)', runTs(apply.map((x) => (x === backup ? backup2 : x)), env));
    ok(a2.code === 0 && /NOTHING_TO_DO/.test(a2.out), '2ª --apply é NOTHING_TO_DO');
    const rows = await db.dynamicTableData.findMany({ where: { dynamicTableId: units.id } });
    ok(rows.length === 1, `exatamente 1 linha em units (achei ${rows.length})`);
    ok((await db.account.count({ where: { userId: owner, unitId: legacy } })) === 0, 'nenhuma conta sobrou sob o legado');
    ok((await db.posting.count({ where: { userId: owner, unitId: rows[0]?.id } })) === 2, 'as 2 partidas estão sob a unidade nova');
    const v = step('--verify', runTs(['--verify', '--against', backup], env));
    ok(v.code === 0 && /"ok": true/.test(v.out), '--verify pré × pós ok');
  } finally {
    await db.$disconnect();
    rmSync(work, { recursive: true, force: true });
  }
  if (failures) {
    console.error(`\n[self-check] FALHOU: ${failures} asserção(ões).`);
    process.exit(1);
  }
  console.log('\n[self-check] OK: todas as asserções passaram.');
}

// ==================================================================== entrypoint
if (args.includes('--self-check')) {
  try {
    await selfCheck();
  } catch (e) {
    console.error(`\n[self-check] erro: ${e.message}`);
    process.exit(1);
  }
} else {
  if (!existsSync(join(SERVER, 'src', 'jobs', 'rekeyLegacyUnitCli.ts'))) throw new Error('CLI não encontrado.');
  const { code, out } = runTs(args);
  console.log(out);
  process.exit(code);
}

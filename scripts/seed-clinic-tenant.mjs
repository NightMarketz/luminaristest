#!/usr/bin/env node
// seed-clinic-tenant.mjs — BE-INCR-P2-VERTICAL-CLINICA, Bloco III, comportamento 7: "existe um
// tenant-fixture sintético da clínica, semeado pela ordem real de bootstrap". Espelho de
// `scripts/activate-salon-binding.mjs` (mesma técnica, mesmo shell-out a `ts-node` para
// `activateAccountingBindingCli.ts` — o CLI TypeScript real, nunca reimplementado aqui em JS puro,
// pela mesma razão do irmão: `BindingCompileService.compile()` roda validador+DI reais).
//
// A ordem é DURA e foi descoberta na marra no FEEDER (BRIEF §3, comportamento 7): chart de contas
// → AccountingPeriod OPEN no mês corrente → binding compilado → boot. Sem o período aberto, a
// compilação sai `Draft` (a checagem #DRY_RUN_FAILED do validador — ver
// `BindingValidationService.ts`), a linha `Active` não nasce, e um boot posterior falharia
// apontando para o binding ausente, não para a causa real (período fechado).
//
// Risco de domínio mitigado (memória do projeto, `sintetico-nao-cobre-formato-de-dado-real`): este
// script popula pelo CAMINHO REAL de escrita — `BindingCompileService.compile()` via Prisma Client
// (mesmo `activateAccountingBindingCli.ts` que `POST /accounting-binding/compile` usa), NUNCA SQL
// direto. O chart de contas e o período aqui semeados também usam o Prisma Client do próprio CLI/
// script, nunca um INSERT manual.
//
// Diferença deste script em relação ao irmão do salão: `--sector-key` default é `aestheticClinic`
// (F-P2-1) — o registry do CLI (F-P2-7a, `activateAccountingBindingCli.ts`) resolve o payload
// correto (`CLINIC_BINDING_V1`/`CLINIC_OPERATIONAL_SCHEMA_SNAPSHOT`) a partir dele.
//
// Uso:
//   node scripts/seed-clinic-tenant.mjs --owner-user-id <id> --unit-id <id> \
//     [--actor-user-id <id>] [--sector-key aestheticClinic] [--db <caminho .db>]
//   node scripts/seed-clinic-tenant.mjs --self-check
//     não toca em nenhum banco do projeto — monta SQLite temporário, semeia um User + o chart de
//     contas da clínica + período aberto do mês corrente, ativa o binding da clínica via CLI real,
//     e assere idempotência — mesmo formato do self-check do irmão do salão.

import { existsSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { isAbsolute, join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { randomUUID } from 'node:crypto';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SERVER = join(ROOT, 'server');
const require = createRequire(import.meta.url);
const { PrismaClient } = require(join(SERVER, 'generated', 'prisma'));

const args = process.argv.slice(2);
const flag = (name) => (args.includes(name) ? args[args.indexOf(name) + 1] : undefined);

const DEFAULT_SECTOR_KEY = 'aestheticClinic';

/** Mesma regra de resolução do Prisma/migrate-deploy.mjs: `file:` relativo é relativo a server/prisma/. */
function resolveDbPath(dbFlag, databaseUrl) {
  if (dbFlag) return resolve(dbFlag);
  if (!databaseUrl) throw new Error('nem --db nem DATABASE_URL foram passados — não há alvo.');
  const raw = databaseUrl.replace(/^file:/, '');
  return isAbsolute(raw) ? resolve(raw) : resolve(SERVER, 'prisma', raw);
}

const client = (dbPath) => new PrismaClient({ datasources: { db: { url: `file:${dbPath.replace(/\\/g, '/')}` } } });

/** Invoca o CLI TypeScript real via ts-node — mesma técnica de `activate-salon-binding.mjs`. */
function activate({ dbPath, ownerUserId, unitId, actorUserId, sectorKey }) {
  const url = `file:${dbPath.replace(/\\/g, '/')}`;
  const cliArgs = [
    'ts-node', '-r', 'tsconfig-paths/register', 'src/jobs/activateAccountingBindingCli.ts',
    '--owner-user-id', ownerUserId,
    '--unit-id', unitId,
  ];
  if (actorUserId) cliArgs.push('--actor-user-id', actorUserId);
  cliArgs.push('--sector-key', sectorKey || DEFAULT_SECTOR_KEY);

  try {
    return {
      code: 0,
      out: execFileSync('npx', cliArgs, {
        cwd: SERVER,
        env: { ...process.env, DATABASE_URL: url, OPENAI_API_KEY: process.env.OPENAI_API_KEY || 'ci-dummy-openai-key' },
        encoding: 'utf8',
        shell: process.platform === 'win32',
        stdio: 'pipe',
      }),
    };
  } catch (e) {
    return { code: e.status ?? 1, out: String(e.stdout || '') + String(e.stderr || '') };
  }
}

async function run({ dbFlag, ownerUserId, unitId, actorUserId, sectorKey }) {
  if (!ownerUserId) throw new Error('--owner-user-id é obrigatório (id de um User já existente no banco alvo).');
  if (!unitId) throw new Error('--unit-id é obrigatório (a unidade de negócio a ativar o binding).');

  const dbPath = resolveDbPath(dbFlag, process.env.DATABASE_URL);
  console.log(`alvo: ${dbPath}`);
  if (!existsSync(dbPath)) {
    throw new Error(
      `banco não existe em ${dbPath} — rode a migração de SCHEMA (scripts/migrate-deploy.mjs) antes ` +
        'deste script (ordem chart→período→binding→boot, comportamento 7 do BRIEF).',
    );
  }

  const { code, out } = activate({ dbPath, ownerUserId, unitId, actorUserId, sectorKey: sectorKey || DEFAULT_SECTOR_KEY });
  console.log(out);
  if (code !== 0) {
    throw new Error(`ativação do binding da clínica falhou (exit ${code}) — ver saída acima.`);
  }
}

// ==================================================================== self-check
async function selfCheck() {
  const work = mkdtempSync(join(tmpdir(), 'seed-clinic-tenant-selfcheck-'));
  let failures = 0;
  const assertTrue = (cond, msg) => {
    if (cond) console.log(`  ok: ${msg}`);
    else {
      failures++;
      console.error(`  FALHA: ${msg}`);
    }
  };

  const dbPath = join(work, 'selfcheck.db');
  const url = `file:${dbPath.replace(/\\/g, '/')}`;

  console.log('\n[self-check] schema — prisma migrate deploy sobre banco temporário');
  execFileSync('npx', ['prisma', 'migrate', 'deploy'], {
    cwd: SERVER,
    env: { ...process.env, DATABASE_URL: url },
    encoding: 'utf8',
    shell: process.platform === 'win32',
    stdio: 'pipe',
  });
  assertTrue(existsSync(dbPath), 'banco temporário criado pela migração de schema');

  console.log('\n[self-check] seed mínimo — 1 User (sem contas ainda)');
  const ownerUserId = `selfcheck-clinic-user-${randomUUID()}`;
  const unitId = `selfcheck-clinic-unit-${randomUUID()}`;
  const db = client(dbPath);
  try {
    await db.user.create({
      data: {
        id: ownerUserId,
        username: ownerUserId,
        email: `${ownerUserId}@example.invalid`,
        password: 'selfcheck-not-a-real-hash',
      },
    });
  } finally {
    await db.$disconnect();
  }

  console.log('\n[self-check] caminho de falha — sem chart de contas, tem de falhar claro');
  const { code: codeNoChart, out: outNoChart } = activate({ dbPath, ownerUserId, unitId });
  console.log(outNoChart);
  assertTrue(codeNoChart !== 0, 'exit code é non-zero sem chart de contas');
  assertTrue(/nenhuma conta encontrada/i.test(outNoChart), 'mensagem identifica chart ausente');

  console.log('\n[self-check] seed do chart de contas da clínica (F-P2-8a: os mesmos 10 códigos do vertical 1 — nenhuma conta nova por papel)');
  const CLINIC_CHART = [
    { code: '1.1.1', nature: 'Asset' },
    { code: '1.1.2', nature: 'Asset' },
    { code: '1.1.3', nature: 'Asset' },
    { code: '1.1.4', nature: 'Asset' },
    { code: '1.1.6', nature: 'Asset' },
    { code: '2.1.1', nature: 'Liability' },
    { code: '3.1', nature: 'Revenue' },
    { code: '3.2', nature: 'Revenue' },
    { code: '3.3', nature: 'Revenue' },
    { code: '4.2', nature: 'Expense' },
  ];
  const db2 = client(dbPath);
  try {
    for (const { code, nature } of CLINIC_CHART) {
      await db2.account.create({
        data: { userId: ownerUserId, unitId, code, name: code, nature, acceptsEntries: true },
      });
    }
    // Ordem dura (comportamento 7): AccountingPeriod OPEN do mês corrente ANTES do binding — o
    // validador roda dry-run (F-P1-6b1) para cada eventBinding classe-1, que exige período aberto.
    const now = new Date();
    await db2.accountingPeriod.create({
      data: {
        userId: ownerUserId,
        unitId,
        year: now.getUTCFullYear(),
        month: now.getUTCMonth() + 1,
        status: 'OPEN',
        openedAt: now,
      },
    });
  } finally {
    await db2.$disconnect();
  }

  console.log('\n[self-check] caminho feliz — 1ª chamada compila e ativa CLINIC_BINDING_V1 via BindingCompileService REAL');
  const { code: code1, out: out1 } = activate({ dbPath, ownerUserId, unitId, sectorKey: DEFAULT_SECTOR_KEY });
  console.log(out1);
  assertTrue(code1 === 0, '1ª chamada saiu com exit 0');
  assertTrue(/^OK: binding/m.test(out1), '1ª chamada ativou o binding da clínica (mensagem OK)');

  console.log('\n[self-check] idempotência — 2ª chamada é NO-OP, não cria 2ª versão');
  const { code: code2, out: out2 } = activate({ dbPath, ownerUserId, unitId, sectorKey: DEFAULT_SECTOR_KEY });
  console.log(out2);
  assertTrue(code2 === 0, '2ª chamada saiu com exit 0');
  assertTrue(/^JÁ ATIVO:/m.test(out2), '2ª chamada reconheceu idempotência (JÁ ATIVO)');

  const db3 = client(dbPath);
  try {
    const rows = await db3.accountingBinding.findMany({ where: { userId: ownerUserId, unitId, sectorKey: DEFAULT_SECTOR_KEY } });
    assertTrue(rows.length === 1, `exatamente 1 linha AccountingBinding existe para '${DEFAULT_SECTOR_KEY}' (achei ${rows.length})`);
    assertTrue(rows[0]?.status === 'Active', 'a linha única está Active');
    if (rows[0]) {
      const payload = JSON.parse(rows[0].payload);
      assertTrue(payload.sectorKey === 'aestheticClinic', 'o payload persistido é o da CLÍNICA (sectorKey aestheticClinic)');
      assertTrue(
        payload.eventBindings.every((eb) => String(eb.descriptionTemplate || '').includes('clínica')),
        'todo descriptionTemplate é setorial da clínica — não é o binding do salão sob outro rótulo',
      );
    }
  } finally {
    await db3.$disconnect();
  }

  rmSync(work, { recursive: true, force: true });

  if (failures) {
    console.error(`\n[self-check] FALHOU: ${failures} asserção(ões).`);
    process.exit(1);
  }
  console.log('\n[self-check] OK: todas as asserções passaram.');
}

// ==================================================================== entrypoint
if (args.includes('--self-check')) {
  await selfCheck();
} else {
  try {
    await run({
      dbFlag: flag('--db'),
      ownerUserId: flag('--owner-user-id'),
      unitId: flag('--unit-id'),
      actorUserId: flag('--actor-user-id'),
      sectorKey: flag('--sector-key'),
    });
  } catch (e) {
    console.error(`\nerro: ${e.message}`);
    process.exit(1);
  }
}

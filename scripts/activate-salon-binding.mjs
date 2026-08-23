#!/usr/bin/env node
// activate-salon-binding.mjs — BE-INCR-BINDING-FEEDER, F-FEEDER-6 → migração de dado do ADR
// (docs/adr/ADR-INCR-BINDING-FEEDER.md §7): como `SALON_BINDING_V1` vira uma linha `Active` de
// `accounting_bindings` no banco, DEPOIS que o boot passa a ser alimentado exclusivamente pelo
// banco (F-FEEDER-4/F-FEEDER-5 — ver server/src/server.ts).
//
// EXPLICITAMENTE REJEITADOS pelo ADR (§7) e NÃO feitos por este script:
//   - seed direto (`prisma.accountingBinding.create` com o payload da fixture serializado) — nasce
//     sem passar pelo validador; a linha "ativa" pode não corresponder ao chart real do tenant.
//   - auto-compilação no boot — reintroduz async no boot além do que F-FEEDER-5 já introduz, e
//     mistura "ler o que está no banco" com "decidir o que devia estar no banco".
//
// O QUE ESTE SCRIPT FAZ: invoca a lógica REAL de compilação
// (server/src/jobs/activateAccountingBindingCli.ts → BindingCompileService.compile(), o MESMO
// caminho de POST /accounting-binding/compile) contra o CHART DE CONTAS REAL do tenant, lido do
// banco alvo — nunca o snapshot embutido na fixture. `BindingCompileService.compile()` roda em TS
// (validador real, DI real via ApplicationFactory) — não é reimplementável em JS puro sem violar
// a proibição de "seed direto" acima, então este wrapper invoca `ts-node` (mesma técnica que
// `scripts/migrate-deploy.mjs` usa para `npx prisma migrate deploy`) contra o alvo.
//
// IDEMPOTÊNCIA: `BindingCompileService.compile()` NÃO é idempotente por si (cada chamada nasce uma
// linha NOVA com `bindingVersion` incrementado — invariante 4 do ADR-P1). O pré-check de
// idempotência vive no PRÓPRIO CLI TypeScript (`activateAccountingBindingCli.ts`): se já existe
// uma linha `Active` para (userId,unitId,sectorKey), a chamada é um NO-OP — nunca uma 2ª versão.
// Rodar este wrapper duas vezes seguidas é seguro (2ª chamada só confirma "já ativo").
//
// PRÉ-CONDIÇÃO DURA (ADR §8): chart de contas do tenant → binding compilado → boot do processo.
// Este script falha claro (exit 1) se o chart ainda não existir — nunca semeia contas sozinho.
//
// Este script NÃO pode ser chamado por Dockerfile CMD/ENTRYPOINT nem por `postinstall` — mesma
// regra de `scripts/migrate-deploy.mjs` (ADR-M2 decisão 4): etapa SEPARADA do pipeline de deploy,
// depois que o chart de contas do tenant já existe no alvo, antes do processo subir (o boot em si
// falha sem uma linha `Active` — F-FEEDER-4).
//
// Uso:
//   node scripts/activate-salon-binding.mjs --owner-user-id <id> --unit-id <id> \
//     [--actor-user-id <id>] [--sector-key beautySalon] [--db <caminho .db>]
//     --db  default: resolvido de DATABASE_URL (mesma regra do Prisma/migrate-deploy.mjs)
//   node scripts/activate-salon-binding.mjs --self-check
//     não toca em nenhum banco do projeto — monta SQLite temporário, semeia um User + um chart de
//     contas mínimo, roda o fluxo completo (falha por chart ausente, caminho feliz 2x — idempotência)
//     e assere as mensagens/exit codes.

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

/** Mesma regra de resolução do Prisma/migrate-deploy.mjs: `file:` relativo é relativo a server/prisma/. */
function resolveDbPath(dbFlag, databaseUrl) {
  if (dbFlag) return resolve(dbFlag);
  if (!databaseUrl) throw new Error('nem --db nem DATABASE_URL foram passados — não há alvo.');
  const raw = databaseUrl.replace(/^file:/, '');
  return isAbsolute(raw) ? resolve(raw) : resolve(SERVER, 'prisma', raw);
}

const client = (dbPath) => new PrismaClient({ datasources: { db: { url: `file:${dbPath.replace(/\\/g, '/')}` } } });

/**
 * Invoca o CLI TypeScript real via ts-node (mesma técnica de shell-out de migrate-deploy.mjs para
 * `npx prisma migrate deploy`) — `BindingCompileService.compile()` não é reimplementável aqui sem
 * violar a proibição de "seed direto".
 */
function activate({ dbPath, ownerUserId, unitId, actorUserId, sectorKey }) {
  const url = `file:${dbPath.replace(/\\/g, '/')}`;
  const cliArgs = ['ts-node', '-r', 'tsconfig-paths/register', 'src/jobs/activateAccountingBindingCli.ts',
    '--owner-user-id', ownerUserId,
    '--unit-id', unitId,
  ];
  if (actorUserId) cliArgs.push('--actor-user-id', actorUserId);
  if (sectorKey) cliArgs.push('--sector-key', sectorKey);

  try {
    return {
      code: 0,
      out: execFileSync('npx', cliArgs, {
        cwd: SERVER,
        // OPENAI_API_KEY: ApplicationFactory's constructor builds an OpenAI SDK client
        // unconditionally (unrelated services) — the SDK throws at construction with no key.
        // A dummy value is the house convention (same as `OPENAI_API_KEY=ci-dummy-openai-key` in
        // jest runs) — this script never calls the OpenAI API.
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
        'deste script (ordem chart→binding→boot, ADR-INCR-BINDING-FEEDER.md §8).',
    );
  }

  const { code, out } = activate({ dbPath, ownerUserId, unitId, actorUserId, sectorKey });
  console.log(out);
  if (code !== 0) {
    throw new Error(`ativação do binding falhou (exit ${code}) — ver saída acima.`);
  }
}

// ==================================================================== self-check
async function selfCheck() {
  const work = mkdtempSync(join(tmpdir(), 'activate-salon-binding-selfcheck-'));
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
  const ownerUserId = `selfcheck-user-${randomUUID()}`;
  const unitId = `selfcheck-unit-${randomUUID()}`;
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

  console.log('\n[self-check] seed do chart de contas COMPLETO do salão (os 10 códigos que o binding referencia)');
  // Mesmos códigos/naturezas de SALON_CHART_SNAPSHOT (server/src/features/accountingBinding/fixtures/
  // salonBinding.ts) — o self-check precisa do chart INTEIRO, não de 1 conta: o validador real
  // (BindingCompileService.compile() → BindingValidationService) rejeita QUALQUER roleSlot cujo
  // accountCode não exista no plano de contas do escopo, e o binding do salão referencia os 10.
  const SALON_CHART = [
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
    for (const { code, nature } of SALON_CHART) {
      await db2.account.create({
        data: { userId: ownerUserId, unitId, code, name: code, nature, acceptsEntries: true },
      });
    }
    // O validador roda uma simulação dry-run (F-P1-6b1, PostingValidatePort.validateOnly) para cada
    // eventBinding classe-1 — isso exige um AccountingPeriod OPEN para o mês corrente, senão todo
    // eventBinding falha com DRY_RUN_FAILED/ACCOUNTING_PERIOD_NOT_OPEN (achado deste self-check).
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

  console.log('\n[self-check] caminho feliz — 1ª chamada compila e ativa via BindingCompileService REAL');
  const { code: code1, out: out1 } = activate({ dbPath, ownerUserId, unitId });
  console.log(out1);
  assertTrue(code1 === 0, '1ª chamada saiu com exit 0');
  assertTrue(/^OK: binding/m.test(out1), '1ª chamada ativou o binding (mensagem OK)');

  console.log('\n[self-check] idempotência — 2ª chamada é NO-OP, não cria 2ª versão');
  const { code: code2, out: out2 } = activate({ dbPath, ownerUserId, unitId });
  console.log(out2);
  assertTrue(code2 === 0, '2ª chamada saiu com exit 0');
  assertTrue(/^JÁ ATIVO:/m.test(out2), '2ª chamada reconheceu idempotência (JÁ ATIVO)');

  const db3 = client(dbPath);
  try {
    const rows = await db3.accountingBinding.findMany({ where: { userId: ownerUserId, unitId } });
    assertTrue(rows.length === 1, `exatamente 1 linha AccountingBinding existe (achei ${rows.length}) — 2ª chamada não duplicou`);
    assertTrue(rows[0]?.status === 'Active', 'a linha única está Active');
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

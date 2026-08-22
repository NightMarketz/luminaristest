#!/usr/bin/env node
// migrate-deploy.mjs — a etapa de MIGRAÇÃO como passo separado do pipeline de deploy.
//
// ADR-M2-deploy-topology.md §2 decisão 4 (ratificada pelo dono 2026-08-22): migração é etapa
// SEPARADA do pipeline (job próprio, ANTES do swap de container) — nunca passo manual, nunca
// entrypoint/CMD que migra no boot. ESTE SCRIPT NÃO PODE SER CHAMADO por Dockerfile CMD/ENTRYPOINT,
// docker-compose `command`, nem por `postinstall` — é invocado explicitamente por humano ou pela
// etapa dedicada do pipeline. Rodar no boot está PROIBIDO por decisão do dono, não é detalhe de
// implementação.
//
// O QUE FAZ, EM ORDEM, contra o DATABASE_URL do alvo:
//   1. BACKUP do arquivo SQLite + sidecars -wal/-shm (timestamp no nome, diretório configurável
//      via --backup-dir). Falha no backup ABORTA sem migrar — sem backup não há rollback
//      (RUNBOOK-M2-DEPLOY-SMOKE.md A5: 0 migração `down` no repo; a que tem `RAISE(ABORT)` não
//      reverte no SQLite — "o backup É o rollback").
//   2. `prisma migrate deploy` contra o alvo real.
//   3. Verificação PÓS-migração no banco REAL: `PRAGMA integrity_check` == ok,
//      `PRAGMA foreign_key_check` sem violação, contagem de linha por tabela antes×depois (queda
//      de linha = falha). Reusa a LÓGICA dos invariantes S3/S4/S5 de scripts/smoke-migration-gate.mjs
//      — não importa o arquivo: aquele roda ANTES do deploy sobre uma CÓPIA descartável (prova
//      "a migração aplicaria limpo"); este roda DEPOIS do deploy sobre o banco REAL (prova "o
//      deploy que aconteceu não perdeu dado") — não faz sentido tirar 2ª cópia aqui.
//   4. exit 0 só se tudo passou. Exit 1 em qualquer falha, com mensagem dizendo O QUE FAZER —
//      não existe `down`, então a resposta é sempre "restaurar do backup X".
//
// SOBRE O WAL (o ponto mais fácil de errar em silêncio):
//   Copiar o .db sem o -wal de um banco com escritas pendentes produz backup INCONSISTENTE —
//   páginas só commitadas no -wal ficam de fora da cópia. Este script roda
//   `PRAGMA wal_checkpoint(TRUNCATE)` pela PrismaClient IMEDIATAMENTE ANTES de copiar: isso grava
//   todo o conteúdo do -wal de volta no .db principal e trunca o -wal a zero — copiar os três
//   arquivos depois disso é seguro mesmo com o app de pé (TRUNCATE é uma operação atômica do
//   próprio SQLite sob o lock normal de escrita; não exige parar o processo).
//   ponytail: não há retry/backoff em torno do checkpoint — se outro processo segura um write
//   lock no instante exato, o checkpoint pode devolver `busy` e falhar; teto conhecido: o script
//   ABORTA (não migra, não é um backup ruim que passa batido) e a mensagem pede rodar de novo.
//   Upgrade path se isso morder na prática: loop com backoff curto (poucas tentativas, poucos
//   segundos) em torno do checkpoint antes de desistir.
//
// Uso:
//   node scripts/migrate-deploy.mjs --backup-dir <dir> [--db <caminho .db>]
//     --db          default: resolvido de DATABASE_URL (mesma regra do Prisma: caminho relativo
//                   é relativo a server/prisma/, onde mora schema.prisma)
//     --backup-dir  default: <repo>/backups/migrate-deploy
//   node scripts/migrate-deploy.mjs --self-check
//     não toca em nenhum banco do projeto — monta SQLite temporário, roda o fluxo completo
//     (caminho feliz 2x + 1 caminho de falha forjada) e assere backup/checagens/exit code.

import { createHash } from 'node:crypto';
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { isAbsolute, join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SERVER = join(ROOT, 'server');
const SELF = fileURLToPath(import.meta.url);
const require = createRequire(import.meta.url);
const { PrismaClient } = require(join(SERVER, 'generated', 'prisma'));

const args = process.argv.slice(2);
const flag = (name) => (args.includes(name) ? args[args.indexOf(name) + 1] : undefined);

/** Mesma regra de resolução do Prisma: `file:` relativo é relativo a server/prisma/ (onde mora schema.prisma). */
function resolveDbPath(dbFlag, databaseUrl) {
  if (dbFlag) return resolve(dbFlag);
  if (!databaseUrl) throw new Error('nem --db nem DATABASE_URL foram passados — não há alvo para migrar.');
  const raw = databaseUrl.replace(/^file:/, '');
  return isAbsolute(raw) ? resolve(raw) : resolve(SERVER, 'prisma', raw);
}

const client = (dbPath) => new PrismaClient({ datasources: { db: { url: `file:${dbPath.replace(/\\/g, '/')}` } } });

/** Contagem de linha por tabela de usuário (exclui _prisma_migrations — muda por desenho). */
async function rowCounts(db) {
  const tables = (
    await db.$queryRawUnsafe(
      `SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name != '_prisma_migrations' ORDER BY name`,
    )
  ).map((r) => r.name);
  const counts = {};
  for (const t of tables) {
    const [{ n }] = await db.$queryRawUnsafe(`SELECT COUNT(*) AS n FROM "${t}"`);
    counts[t] = Number(n);
  }
  return counts;
}

/**
 * Passo 1 — backup. `PRAGMA wal_checkpoint(TRUNCATE)` antes de copiar (ver cabeçalho, seção WAL).
 * Devolve { path, preCounts } se um backup foi feito, ou { path: null, preCounts: {} } se o banco
 * ainda não existe (primeiro deploy — nada a proteger, nada a comparar).
 */
async function backup(dbPath, backupDir) {
  if (!existsSync(dbPath)) {
    console.log(`sem banco em ${dbPath} — tratando como primeiro deploy: sem backup, sem contagem prévia.`);
    return { path: null, preCounts: {} };
  }

  // Duas famílias de falha aqui pedem diagnósticos DIFERENTES — misturar as duas num catch só
  // manda o operador mexer no lugar errado (ex.: checar permissão de diretório quando o
  // problema real é o próprio banco de ORIGEM ilegível).
  let preCounts;
  try {
    const db = client(dbPath);
    try {
      // A pragma NAO lanca quando o checkpoint nao acontece: ela devolve uma linha
      // { busy, log, checkpointed } e busy=1 significa que outro processo segurava o lock.
      // Sem checar isso, um -wal nao truncado passaria batido e o backup seria copiado
      // num estado que o cabecalho promete que nao acontece.
      const [ckpt] = await db.$queryRawUnsafe('PRAGMA wal_checkpoint(TRUNCATE)');
      if (ckpt && Number(ckpt.busy) !== 0) {
        throw new Error(
          'wal_checkpoint(TRUNCATE) devolveu busy=1 — outro processo segura o lock de escrita. ' +
            'Backup NAO foi feito e migracao NAO foi executada. Pare o app (ou espere a escrita ' +
            'terminar) e rode de novo.',
        );
      }
    } finally {
      await db.$disconnect();
    }
    // preCounts depois do checkpoint, com o banco já num estado limpo pra ler.
    const preDb = client(dbPath);
    try {
      preCounts = await rowCounts(preDb);
    } finally {
      await preDb.$disconnect();
    }
  } catch (e) {
    throw new Error(
      `banco de ORIGEM (${dbPath}) não respondeu a PRAGMA/leitura básica — provável arquivo ` +
        `corrompido ou não-SQLite. NÃO é problema do diretório de backup. Causa: ${e.message}`,
    );
  }

  let dest;
  try {
    mkdirSync(backupDir, { recursive: true }); // lança se o caminho não for gravável.
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    dest = join(backupDir, `dev.db.${stamp}.bak`);
    copyFileSync(dbPath, dest);
    for (const suf of ['-wal', '-shm']) {
      if (existsSync(dbPath + suf)) copyFileSync(dbPath + suf, dest + suf);
    }
    if (!existsSync(dest)) throw new Error(`backup não apareceu em ${dest} após a cópia.`);
  } catch (e) {
    throw new Error(`não foi possível escrever o backup em ${backupDir}: ${e.message}`);
  }

  console.log(`backup ok: ${dest}`);
  return { path: dest, preCounts };
}

/** Passo 2 — `prisma migrate deploy` contra o alvo real. */
function migrateDeploy(dbPath) {
  const url = `file:${dbPath.replace(/\\/g, '/')}`;
  return execFileSync('npx', ['prisma', 'migrate', 'deploy'], {
    cwd: SERVER,
    env: { ...process.env, DATABASE_URL: url },
    encoding: 'utf8',
    shell: process.platform === 'win32',
    stdio: 'pipe',
  });
}

/** Passo 3 — verificação pós-migração (lógica de S3/S4/S5 do smoke-migration-gate, sobre o banco real). */
async function verifyPost(dbPath, preCounts) {
  const problems = [];
  const db = client(dbPath);
  try {
    const integ = await db.$queryRawUnsafe('PRAGMA integrity_check');
    if (!(integ.length === 1 && integ[0].integrity_check === 'ok')) {
      problems.push(`integrity_check devolveu ${JSON.stringify(integ).slice(0, 200)}`);
    }

    const fkViol = await db.$queryRawUnsafe('PRAGMA foreign_key_check');
    if (fkViol.length > 0) {
      problems.push(`foreign_key_check com ${fkViol.length} violação(ões): ${JSON.stringify(fkViol.slice(0, 3))}`);
    }

    const postCounts = await rowCounts(db);
    for (const [t, before] of Object.entries(preCounts)) {
      const after = postCounts[t];
      if (after === undefined) {
        if (before > 0) problems.push(`tabela "${t}" (${before} linhas) SUMIU depois da migração`);
        continue;
      }
      if (after < before) problems.push(`"${t}" perdeu linhas: ${before} → ${after}`);
    }
  } finally {
    await db.$disconnect();
  }
  return problems;
}

/** Fluxo completo. Lança em qualquer falha; a mensagem já vem com a instrução de restauração. */
async function run({ dbFlag, backupDir }) {
  const dbPath = resolveDbPath(dbFlag, process.env.DATABASE_URL);
  console.log(`alvo: ${dbPath}`);

  let backupResult;
  try {
    backupResult = await backup(dbPath, backupDir);
  } catch (e) {
    throw new Error(
      `BACKUP FALHOU — migração NÃO foi executada (o backup é o rollback; sem ele não há migração).\n` +
        `  causa: ${e.message}\n` +
        `  O QUE FAZER: se a causa é o banco de ORIGEM, troque de alvo/investigue o arquivo antes de\n` +
        `  qualquer migração; se é o diretório de backup, corrija permissão/espaço e rode de novo.`,
    );
  }

  try {
    const out = migrateDeploy(dbPath);
    console.log(out);
  } catch (e) {
    const restore = backupResult.path
      ? `restaure o arquivo de ${backupResult.path} (e os sidecars .bak-wal/.bak-shm, se existirem) sobre ${dbPath} — não existe \`prisma migrate down\`.`
      : `não havia backup (primeiro deploy, banco não existia antes) — apague ${dbPath} e comece de novo.`;
    throw new Error(
      `MIGRATE DEPLOY FALHOU.\n` +
        `  causa: ${String(e.stderr || e.stdout || e.message).slice(0, 800)}\n` +
        `  O QUE FAZER: ${restore}`,
    );
  }

  let problems;
  try {
    problems = await verifyPost(dbPath, backupResult.preCounts);
  } catch (e) {
    // banco ilegível/corrompido o bastante pra derrubar a própria query — mesma família de
    // falha que integrity_check pegaria, só que mais cedo (a conexão nem consegue ler PRAGMA).
    problems = [`verificação pós-migração não conseguiu nem rodar: ${e.message}`];
  }
  if (problems.length) {
    const restore = backupResult.path
      ? `restaure o arquivo de ${backupResult.path} sobre ${dbPath} — a migração RODOU mas o banco pós-migração não passou na verificação; não existe \`down\`, o backup é a única volta.`
      : `banco não tinha backup (primeiro deploy) — investigue manualmente antes de liberar o alvo.`;
    throw new Error(
      `VERIFICAÇÃO PÓS-MIGRAÇÃO FALHOU (${problems.length} problema(s)):\n` +
        problems.map((p) => `  - ${p}`).join('\n') +
        `\n  O QUE FAZER: ${restore}`,
    );
  }

  console.log(`OK: migração aplicada e verificada em ${dbPath}.`);
}

// ==================================================================== self-check
async function selfCheck() {
  const work = mkdtempSync(join(tmpdir(), 'migrate-deploy-selfcheck-'));
  let failures = 0;
  const assertTrue = (cond, msg) => {
    if (cond) console.log(`  ok: ${msg}`);
    else {
      failures++;
      console.error(`  FALHA: ${msg}`);
    }
  };

  // ---- caminho feliz: 1ª chamada migra do zero (sem backup — banco não existe); 2ª chamada
  // roda de novo sobre o banco já migrado (agora existe → exercita backup + 0 pendente).
  console.log('\n[self-check] caminho feliz — 1ª chamada (banco novo, sem backup)');
  const happyDb = join(work, 'happy.db');
  const happyBackupDir = join(work, 'happy-backups');
  const call = (dbPath, backupDir) =>
    execFileSync('node', [SELF, '--db', dbPath, '--backup-dir', backupDir], {
      cwd: ROOT,
      encoding: 'utf8',
      shell: process.platform === 'win32',
    });

  let out1;
  try {
    out1 = call(happyDb, happyBackupDir);
    console.log(out1);
  } catch (e) {
    out1 = String(e.stdout || '') + String(e.stderr || '');
    console.log(out1);
  }
  assertTrue(existsSync(happyDb), '1ª chamada criou o banco');
  assertTrue(/primeiro deploy/.test(out1), '1ª chamada reconheceu "primeiro deploy" (sem backup)');
  assertTrue(/OK: migração aplicada e verificada/.test(out1), '1ª chamada terminou OK');

  console.log('\n[self-check] caminho feliz — 2ª chamada (banco existente, deve fazer backup)');
  let out2, code2 = 0;
  try {
    out2 = call(happyDb, happyBackupDir);
  } catch (e) {
    code2 = e.status ?? 1;
    out2 = String(e.stdout || '') + String(e.stderr || '');
  }
  console.log(out2);
  assertTrue(code2 === 0, '2ª chamada saiu com exit 0');
  assertTrue(/backup ok:/.test(out2), '2ª chamada fez backup (banco já existia)');
  assertTrue(existsSync(happyBackupDir) && statSync(happyBackupDir).isDirectory(), 'diretório de backup foi criado');
  const backupFiles = (await import('node:fs')).readdirSync(happyBackupDir);
  assertTrue(backupFiles.some((f) => f.startsWith('dev.db.') && f.endsWith('.bak')), 'arquivo de backup com timestamp existe');
  assertTrue(/OK: migração aplicada e verificada/.test(out2), '2ª chamada terminou OK');

  // ---- caminho de falha forjada: backup-dir cujo pai é um ARQUIVO (mkdir recursive tem de lançar).
  console.log('\n[self-check] caminho de falha — backup-dir sob um arquivo (mkdir tem de falhar)');
  const failDb = join(work, 'fail.db');
  // primeiro cria o banco (sem backup, primeiro deploy) pra ter algo a "não migrar de novo".
  try {
    call(failDb, join(work, 'unused-backups'));
  } catch { /* não deveria falhar; se falhar, o assert de baixo já pega. */ }
  const md5Before = existsSync(failDb) ? createHash('md5').update(readFileSync(failDb)).digest('hex') : null;

  const blocker = join(work, 'blocker-file');
  writeFileSync(blocker, 'sou um arquivo, não um diretório');
  const badBackupDir = join(blocker, 'backups'); // pai é arquivo → mkdirSync(recursive) lança

  let code3 = 0, out3 = '';
  try {
    out3 = call(failDb, badBackupDir);
  } catch (e) {
    code3 = e.status ?? 1;
    out3 = String(e.stdout || '') + String(e.stderr || '');
  }
  console.log(out3);
  assertTrue(code3 !== 0, 'exit code é non-zero no caminho de falha');
  assertTrue(/BACKUP FALHOU/.test(out3), 'mensagem identifica que o BACKUP falhou');
  assertTrue(/O QUE FAZER/.test(out3), 'mensagem diz o que fazer');
  const md5After = existsSync(failDb) ? createHash('md5').update(readFileSync(failDb)).digest('hex') : null;
  assertTrue(md5Before === md5After, 'banco original NÃO foi tocado (abortou antes de migrar)');

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
    await run({ dbFlag: flag('--db'), backupDir: flag('--backup-dir') || join(ROOT, 'backups', 'migrate-deploy') });
  } catch (e) {
    console.error(`\nerro: ${e.message}`);
    process.exit(1);
  }
}

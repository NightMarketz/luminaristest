// Semáforo de trabalho pesado por máquina (dono, chat, 2026-11-04: "Me da um prompt para implementar todas as 7
// sugestões"). Medido em 03–04/11: ~7 sessões em paralelo somaram 46 processos node (7,1 GB), o git falhou com "Out
// of memory" e o app caiu 3 vezes. Jest de integração, `next build` e o runner Puppeteer dos runbooks pegam uma vaga
// antes de rodar; sem vaga, esperam e mostram quem está ocupando. Regra R3 de D-2026-11-04-RECURSOS-LOCAIS.
//
// Vagas: $LUMINARIS_HEAVY_SLOTS (padrão 2). Travas: um arquivo por vaga em os.tmpdir()/luminaris-heavy-slots (ou
// $LUMINARIS_HEAVY_SLOTS_DIR), criado com `wx` (atômico) e com o PID do dono. Trava de processo morto, ou mais velha
// que 6 h (PID reaproveitado pelo Windows), é órfã e é tomada. No CI (`CI` setado) não faz nada.
//
// Uso:  node scripts/heavy-slot.cjs run [--label <nome>] -- <comando> [args...]   pega vaga, roda, libera
//       node scripts/heavy-slot.cjs status                                     lista quem ocupa
//       require('./heavy-slot.cjs').acquire({ label })                         → Promise<release()>
const { spawn } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const MAX_AGE_MS = 6 * 60 * 60_000;
// Quem já está dentro de uma vaga (ex.: `run -- npm run build`, cujo build pede vaga de novo) não pede outra.
const HELD_ENV = 'LUMINARIS_HEAVY_SLOT_HELD';

function config(env = process.env) {
  const n = Number.parseInt(env.LUMINARIS_HEAVY_SLOTS ?? '', 10);
  return {
    slots: Number.isInteger(n) && n > 0 ? n : 2,
    dir: env.LUMINARIS_HEAVY_SLOTS_DIR || path.join(os.tmpdir(), 'luminaris-heavy-slots'),
  };
}

function isAlive(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch (e) {
    return e.code === 'EPERM'; // existe, mas é de outro usuário
  }
}

function readLock(file) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return null; // sumiu ou está sendo escrita
  }
}

const isOrphan = (info, now = Date.now()) => !info || !isAlive(info.pid) || now - info.since > MAX_AGE_MS;

/** Uma tentativa em todas as vagas: devolve o arquivo pego ou null. */
function tryTake({ slots, dir }, info) {
  fs.mkdirSync(dir, { recursive: true });
  for (let i = 0; i < slots; i++) {
    const file = path.join(dir, `slot-${i}.lock`);
    try {
      fs.writeFileSync(file, JSON.stringify(info), { flag: 'wx' });
      return file;
    } catch (e) {
      if (e.code !== 'EEXIST') throw e;
    }
    const atual = readLock(file);
    // Arquivo recém-criado e ainda vazio lê como null: só é órfão se continuar null depois de 2 s.
    if (atual === null && Date.now() - fs.statSync(file, { throwIfNoEntry: false })?.mtimeMs < 2000) continue;
    if (!isOrphan(atual)) continue;
    // Relê antes de apagar: se outro processo tomou a vaga órfã nesse meio-tempo, a trava dele fica.
    if (JSON.stringify(readLock(file)) !== JSON.stringify(atual)) continue;
    fs.rmSync(file, { force: true });
    try {
      fs.writeFileSync(file, JSON.stringify(info), { flag: 'wx' });
      return file;
    } catch (e) {
      if (e.code !== 'EEXIST') throw e;
    }
  }
  return null;
}

function holders(cfg = config()) {
  const out = [];
  for (let i = 0; i < cfg.slots; i++) {
    const info = readLock(path.join(cfg.dir, `slot-${i}.lock`));
    if (info && !isOrphan(info)) out.push({ slot: i, ...info });
  }
  return out;
}

const describe = (h) =>
  `  vaga ${h.slot}: PID ${h.pid} · ${h.label} · ${h.cwd} · há ${Math.round((Date.now() - h.since) / 60_000)} min`;

/**
 * Pega uma vaga; resolve com release(). Espera sem prazo, avisando quem ocupa a cada `noticeMs`.
 * No CI, ou dentro de outra vaga, resolve na hora com release() vazio.
 */
async function acquire({
  label = 'trabalho pesado', env = process.env, pollMs = 2000, noticeMs = 60_000, timeoutMs = Infinity, log = console.error,
} = {}) {
  if (env.CI || env[HELD_ENV]) return () => {};
  const cfg = config(env);
  const info = { pid: process.pid, label, cwd: process.cwd(), since: Date.now() };
  const deadline = Date.now() + timeoutMs;
  let file = tryTake(cfg, info);
  let lastNotice = 0;
  while (!file) {
    if (Date.now() > deadline) throw new Error(`[heavy-slot] ${label}: sem vaga em ${timeoutMs} ms`);
    if (Date.now() - lastNotice >= noticeMs) {
      lastNotice = Date.now();
      log(`[heavy-slot] ${label}: as ${cfg.slots} vagas de trabalho pesado estão ocupadas; esperando.`);
      for (const h of holders(cfg)) log(describe(h));
    }
    await new Promise((r) => setTimeout(r, pollMs));
    file = tryTake(cfg, info);
  }
  env[HELD_ENV] = String(process.pid);
  let solto = false;
  const release = () => {
    if (solto) return;
    solto = true;
    delete env[HELD_ENV];
    // Só apaga se a trava ainda é nossa (pode ter sido tomada como órfã depois de 6 h).
    if (readLock(file)?.pid === process.pid) fs.rmSync(file, { force: true });
  };
  process.once('exit', release);
  return release;
}

// No Windows, `npx`/`next` são .cmd e só rodam pelo cmd.exe; cada argumento vai citado e com `^` nos metacaracteres,
// como o cross-spawn faz. Sem isso o `>` de um `node -e "…=>…"` vira redirecionamento. Limite: um .cmd que repassa
// `%*` (shim do npm) reinterpreta metacaracteres; para argumento com `> | &`, chame o `node` direto. No POSIX, sem shell.
const META = /([()\][%!^"`<>&|;, *?])/g;
const quoteWin = (a) => `"${a.replace(/(\\*)"/g, '$1$1\\"').replace(/(\\*)$/, '$1$1')}"`.replace(META, '^$1');
function spawnCmd(cmd) {
  if (process.platform !== 'win32') return spawn(cmd[0], cmd.slice(1), { stdio: 'inherit', env: process.env });
  // Executável com espaço (C:\Program Files\nodejs\node.exe) vai entre aspas: o cmd.exe não aceita `^ ` no nome.
  const exe = /\s/.test(cmd[0]) ? `"${cmd[0]}"` : cmd[0].replace(META, '^$1');
  const line = [exe, ...cmd.slice(1).map(quoteWin)].join(' ');
  return spawn(process.env.comspec || 'cmd.exe', ['/d', '/s', '/c', `"${line}"`], {
    stdio: 'inherit', env: process.env, windowsVerbatimArguments: true,
  });
}

/** `run -- <comando>`: pega vaga, roda o comando, libera e devolve o exit code. */
async function run(argv) {
  const sep = argv.indexOf('--');
  const opts = sep === -1 ? [] : argv.slice(0, sep);
  const cmd = sep === -1 ? argv : argv.slice(sep + 1);
  if (!cmd.length) throw new Error('uso: node scripts/heavy-slot.cjs run [--label <nome>] -- <comando> [args...]');
  const li = opts.indexOf('--label');
  const release = await acquire({ label: li !== -1 ? opts[li + 1] : cmd.join(' ') });
  const child = spawnCmd(cmd);
  for (const sig of ['SIGINT', 'SIGTERM']) process.on(sig, () => child.kill(sig));
  const code = await new Promise((r) => child.on('exit', (c, s) => r(c ?? (s ? 1 : 0))));
  release();
  return code;
}

module.exports = { acquire, holders, config, run, HELD_ENV };

if (require.main === module) {
  const [sub, ...rest] = process.argv.slice(2);
  if (sub === 'run') {
    run(rest).then((code) => process.exit(code), (e) => { console.error(e.message); process.exit(2); });
  } else if (sub === 'status') {
    const cfg = config();
    const hs = holders(cfg);
    console.log(`${hs.length}/${cfg.slots} vagas ocupadas (${cfg.dir})`);
    for (const h of hs) console.log(describe(h));
  } else {
    console.error('uso: node scripts/heavy-slot.cjs run [--label <nome>] -- <comando>  |  status');
    process.exit(2);
  }
}

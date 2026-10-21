#!/usr/bin/env node
// Mutation testing em FATIAS — a rodada inteira (~35 mil mutantes, ~40 h na máquina do dono, medido
// 15/10) não cabe numa sessão. Divide os arquivos do `mutate` do stryker.config.mjs em N fatias
// estáveis e roda uma fatia por vez, cada uma com seu incremental/relatório; `report` junta tudo.
//
//   npm run test:mutation:slices -- status            # plano, fatias feitas/pendentes, última duração
//   npm run test:mutation:slices -- run --hours 8     # roda pendentes em sequência até estourar 8 h
//   npm run test:mutation:slices -- run --slice 3     # roda só a fatia 3 (refaz mesmo se feita)
//   npm run test:mutation:slices -- report            # junta as fatias em reports/mutation/mutation.{json,html}
//   npm run test:mutation:slices -- new-round         # marca todas como pendentes (incremental reaproveita o que não mudou)
//   npm run test:mutation:slices -- plan --slices 14  # refaz a divisão (zera o reaproveitamento!)
//
// --hours é orçamento para COMEÇAR fatias: fatia já iniciada termina (não matamos o Stryker — inPlace
// deixaria o src instrumentado). Uma fatia só começa se a última duração dela (ou a média) cabe no
// que sobra. Ctrl+C interrompe a fatia corrente: o Stryker restaura os arquivos e ela fica pendente.
import fs from 'node:fs';
import path from 'node:path';
import {
  OUT,
  RECOVERY_HINT,
  SERVER,
  expandMutate,
  headCommit,
  loadBaseConfig,
  runStryker,
  srcIsClean,
  writeDerivedConfig,
} from './mutation-common.mjs';
const SLICES_DIR = path.join(OUT, 'slices');
const STATE = path.join(SLICES_DIR, 'state.json');
const DEFAULT_SLICES = 14;

const HOUR = 3_600_000;

function parseArgs(argv) {
  const [cmd = 'status', ...rest] = argv;
  const opts = {};
  for (let i = 0; i < rest.length; i++) {
    const flag = rest[i];
    if (!flag.startsWith('--')) throw new Error(`argumento inesperado: ${flag}`);
    const key = flag.slice(2);
    const value = rest[i + 1];
    if (value === undefined || value.startsWith('--')) throw new Error(`${flag} exige valor`);
    opts[key] = value;
    i++;
  }
  return { cmd, opts };
}

function positiveNumber(raw, name) {
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) throw new Error(`--${name} precisa ser número > 0 (recebi "${raw}")`);
  return n;
}

/** Bin-packing guloso por tamanho (proxy de nº de mutantes): maior arquivo → fatia mais leve. */
function partition(files, count) {
  const sized = files.map((f) => ({ f, size: fs.statSync(path.join(SERVER, f)).size }));
  sized.sort((a, b) => b.size - a.size || a.f.localeCompare(b.f));
  const slices = Array.from({ length: count }, () => ({ files: [], bytes: 0 }));
  for (const { f, size } of sized) {
    const lightest = slices.reduce((min, s) => (s.bytes < min.bytes ? s : min));
    lightest.files.push(f);
    lightest.bytes += size;
  }
  for (const s of slices) s.files.sort();
  return slices;
}

function readState() {
  if (!fs.existsSync(STATE)) return null;
  return JSON.parse(fs.readFileSync(STATE, 'utf8'));
}

function writeState(state) {
  fs.mkdirSync(SLICES_DIR, { recursive: true });
  fs.writeFileSync(STATE, JSON.stringify(state, null, 2) + '\n');
}

function newState(files, count) {
  return {
    createdAt: new Date().toISOString(),
    round: 1,
    slices: partition(files, count).map((s, i) => ({
      id: i + 1,
      bytes: s.bytes,
      files: s.files,
      doneInRound: null,
      lastRun: null,
    })),
  };
}

/** Arquivo novo no `mutate` entra na fatia mais leve; arquivo que sumiu sai. O resto não se mexe. */
function reconcile(state, files) {
  const wanted = new Set(files);
  const placed = new Set();
  let changed = false;
  for (const s of state.slices) {
    const kept = s.files.filter((f) => wanted.has(f));
    if (kept.length !== s.files.length) changed = true;
    s.files = kept;
    kept.forEach((f) => placed.add(f));
  }
  for (const f of files) {
    if (placed.has(f)) continue;
    const lightest = state.slices.reduce((min, s) => (s.bytes < min.bytes ? s : min));
    lightest.files.push(f);
    lightest.files.sort();
    lightest.bytes += fs.statSync(path.join(SERVER, f)).size;
    lightest.doneInRound = null;
    changed = true;
  }
  return changed;
}

async function ensureState() {
  const base = await loadBaseConfig();
  const files = expandMutate(base.mutate);
  let state = readState();
  if (!state) {
    state = newState(files, DEFAULT_SLICES);
    writeState(state);
    console.log(`Plano criado: ${files.length} arquivos em ${DEFAULT_SLICES} fatias.`);
  } else if (reconcile(state, files)) {
    writeState(state);
    console.log('Plano ajustado: arquivos novos/removidos no `mutate`.');
  }
  return state;
}

function sliceDir(id) {
  return path.join(SLICES_DIR, String(id).padStart(2, '0'));
}

function fmtDuration(ms) {
  if (ms == null) return '—';
  const h = Math.floor(ms / HOUR);
  const m = Math.round((ms % HOUR) / 60_000);
  return `${h}h${String(m).padStart(2, '0')}`;
}

async function cmdRun(opts) {
  if (!srcIsClean()) {
    throw new Error(
      'server/src tem alteração não commitada — o Stryker roda inPlace; commite ou descarte antes.',
    );
  }
  const state = await ensureState();
  const budgetMs = opts.hours ? positiveNumber(opts.hours, 'hours') * HOUR : Infinity;
  const started = Date.now();

  let queue;
  if (opts.slice) {
    const id = positiveNumber(opts.slice, 'slice');
    const slice = state.slices.find((s) => s.id === id);
    if (!slice) throw new Error(`fatia ${id} não existe (1..${state.slices.length})`);
    queue = [slice];
  } else {
    queue = state.slices.filter((s) => s.doneInRound !== state.round);
  }
  if (queue.length === 0) {
    console.log(`Rodada ${state.round} completa. \`report\` junta o resultado; \`new-round\` recomeça.`);
    return;
  }

  const known = state.slices.map((s) => s.lastRun?.durationMs).filter((d) => d != null);
  const avg = known.length ? known.reduce((a, b) => a + b, 0) / known.length : null;

  for (const slice of queue) {
    const elapsed = Date.now() - started;
    const estimate = slice.lastRun?.durationMs ?? avg ?? 0;
    if (elapsed + estimate > budgetMs) {
      console.log(
        `\nOrçamento: ${fmtDuration(budgetMs - elapsed)} restantes, fatia ${slice.id} estima ${fmtDuration(estimate)} — parando aqui.`,
      );
      break;
    }
    console.log(
      `\n=== Fatia ${slice.id}/${state.slices.length} — ${slice.files.length} arquivos (estimativa ${fmtDuration(estimate || null)}) ===`,
    );
    const configPath = writeDerivedConfig(sliceDir(slice.id), 'stryker.slice.config.mjs', slice.files);
    const t0 = Date.now();
    const code = await runStryker(configPath, path.join(sliceDir(slice.id), 'stryker.log'));
    const durationMs = Date.now() - t0;
    const ok = code === 0 && fs.existsSync(path.join(sliceDir(slice.id), 'mutation.json'));
    slice.lastRun = { at: new Date(t0).toISOString(), durationMs, exitCode: code, commit: headCommit(), ok };
    if (ok) slice.doneInRound = state.round;
    writeState(state);
    if (!srcIsClean()) {
      throw new Error(RECOVERY_HINT);
    }
    if (!ok)
      throw new Error(
        `fatia ${slice.id} falhou (exit ${code}) — log em ${path.relative(SERVER, sliceDir(slice.id))}/stryker.log`,
      );
    console.log(`Fatia ${slice.id} ok em ${fmtDuration(durationMs)}.`);
  }
  printStatus(state);
}

function printStatus(state) {
  const done = state.slices.filter((s) => s.doneInRound === state.round).length;
  console.log(`\nRodada ${state.round}: ${done}/${state.slices.length} fatias feitas.`);
  for (const s of state.slices) {
    const mark = s.doneInRound === state.round ? 'feita   ' : 'pendente';
    const last = s.lastRun
      ? `${fmtDuration(s.lastRun.durationMs)} em ${s.lastRun.at.slice(0, 16)} (${s.lastRun.commit})`
      : 'nunca rodou';
    console.log(
      `  ${String(s.id).padStart(2)}  ${mark}  ${String(s.files.length).padStart(3)} arq  ${(s.bytes / 1024).toFixed(0).padStart(5)} KB  ${last}`,
    );
  }
}

/** Funde os mutation.json das fatias (schema mutation-testing-report: `files` é um mapa por caminho). */
function cmdReport(state) {
  let merged = null;
  const missing = [];
  for (const s of state.slices) {
    const file = path.join(sliceDir(s.id), 'mutation.json');
    if (!fs.existsSync(file)) {
      missing.push(s.id);
      continue;
    }
    const report = JSON.parse(fs.readFileSync(file, 'utf8'));
    if (!merged) merged = { ...report, files: {}, testFiles: {} };
    Object.assign(merged.files, report.files);
    Object.assign(merged.testFiles, report.testFiles ?? {});
  }
  if (!merged) throw new Error('nenhuma fatia tem relatório ainda — rode `run` primeiro.');

  const counts = {};
  for (const file of Object.values(merged.files)) {
    for (const m of file.mutants) counts[m.status] = (counts[m.status] ?? 0) + 1;
  }
  const n = (k) => counts[k] ?? 0;
  const detected = n('Killed') + n('Timeout');
  const valid = detected + n('Survived') + n('NoCoverage');
  const score = valid ? (100 * detected) / valid : 0;

  fs.writeFileSync(path.join(OUT, 'mutation.json'), JSON.stringify(merged));
  const elements = path.join(
    SERVER,
    'node_modules',
    'mutation-testing-elements',
    'dist',
    'mutation-test-elements.js',
  );
  if (fs.existsSync(elements)) {
    // Mesmo formato do html reporter do Stryker: o componente lê `report` do elemento.
    const json = JSON.stringify(merged).replace(/</g, '\\u003c');
    const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Mutation report (fatias)</title>
<script>${fs.readFileSync(elements, 'utf8')}</script></head>
<body><mutation-test-report-app titlePostfix="Stryker (fatias)"></mutation-test-report-app>
<script>document.querySelector('mutation-test-report-app').report = ${json};</script></body></html>
`;
    fs.writeFileSync(path.join(OUT, 'mutation.html'), html);
  }

  console.log(
    `Fatias no relatório: ${state.slices.length - missing.length}/${state.slices.length}${missing.length ? ` (faltam ${missing.join(', ')})` : ''}`,
  );
  console.log(
    `Mutantes: ${Object.entries(counts)
      .map(([k, v]) => `${k} ${v}`)
      .join(' · ')}`,
  );
  console.log(`Mutation score (Killed+Timeout / +Survived+NoCoverage): ${score.toFixed(2)}%`);
  console.log(`Saída: ${path.relative(SERVER, OUT).split(path.sep).join('/')}/mutation.{json,html}`);
}

async function main() {
  const { cmd, opts } = parseArgs(process.argv.slice(2));
  switch (cmd) {
    case 'status':
      printStatus(await ensureState());
      break;
    case 'run':
      await cmdRun(opts);
      break;
    case 'report':
      cmdReport(await ensureState());
      break;
    case 'new-round': {
      const state = await ensureState();
      state.round += 1;
      writeState(state);
      console.log(`Rodada ${state.round} aberta: todas as fatias pendentes.`);
      break;
    }
    case 'plan': {
      const count = opts.slices ? positiveNumber(opts.slices, 'slices') : DEFAULT_SLICES;
      const base = await loadBaseConfig();
      const files = expandMutate(base.mutate);
      fs.rmSync(SLICES_DIR, { recursive: true, force: true });
      const state = newState(files, Math.floor(count));
      writeState(state);
      console.log(
        `Plano refeito: ${files.length} arquivos em ${state.slices.length} fatias (resultados anteriores apagados).`,
      );
      printStatus(state);
      break;
    }
    default:
      throw new Error(`comando desconhecido: ${cmd} (status | run | report | new-round | plan)`);
  }
}

main().catch((err) => {
  console.error(`\n✖ ${err.message}`);
  process.exit(1);
});

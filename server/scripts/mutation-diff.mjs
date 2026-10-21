#!/usr/bin/env node
// Mutation testing SÓ NO QUE MUDOU — modo principal (`npm run test:mutation`).
// Compara HEAD com o merge-base da base (default origin/main), cruza com o `mutate` do
// stryker.config.mjs e passa ao Stryker só as LINHAS alteradas (`arquivo.ts:10-20`). Teste alterado
// sem fonte alterada puxa o arquivo-fonte homônimo inteiro (nfeCost.pisCofinsSplit.test.ts → nfeCost.ts).
//
//   npm run test:mutation                      # diff contra origin/main
//   npm run test:mutation -- --base HEAD~3     # outra base
//   npm run test:mutation -- --dry-run         # só mostra o que seria mutado
//
// Rodada inteira (~40 h): `npm run test:mutation:full` ou, em parcelas, `npm run test:mutation:slices`.
// Saída em reports/mutation/diff/ (incremental próprio — não sobrescreve o da rodada inteira).
import fs from 'node:fs';
import path from 'node:path';
import {
  OUT,
  RECOVERY_HINT,
  expandMutate,
  git,
  loadBaseConfig,
  runStryker,
  srcIsClean,
  writeDerivedConfig,
} from './mutation-common.mjs';

const DIFF_DIR = path.join(OUT, 'diff');

function parseArgs(argv) {
  const opts = { base: 'origin/main', dryRun: false };
  for (let i = 0; i < argv.length; i++) {
    const flag = argv[i];
    if (flag === '--dry-run') opts.dryRun = true;
    else if (flag === '--base') {
      const value = argv[++i];
      if (!value || value.startsWith('--')) throw new Error('--base exige valor');
      opts.base = value;
    } else throw new Error(`argumento inesperado: ${flag} (use --base <ref> e/ou --dry-run)`);
  }
  return opts;
}

/** Faixas de linhas ADICIONADAS/ALTERADAS por arquivo (lado novo do diff), caminhos relativos a server/. */
function changedRanges(mergeBase) {
  const out = git(['diff', '-U0', '--no-color', '--relative', `${mergeBase}..HEAD`, '--', '.']);
  const ranges = new Map();
  let file = null;
  for (const line of out.split('\n')) {
    if (line.startsWith('+++ ')) {
      file = line === '+++ /dev/null' ? null : line.slice(6);
      if (file && !ranges.has(file)) ranges.set(file, []);
      continue;
    }
    const hunk = /^@@ -\d+(?:,\d+)? \+(\d+)(?:,(\d+))? @@/.exec(line);
    if (hunk && file) {
      const start = Number(hunk[1]);
      const count = hunk[2] === undefined ? 1 : Number(hunk[2]);
      if (count > 0) ranges.get(file).push([start, start + count - 1]);
    }
  }
  return ranges;
}

// Só teste unitário conta: o Stryker roda o projeto Jest `unit` (stryker.jest.config.js), então
// alterar um *.integration.test.ts não mexe em nenhum mutante.
const UNIT_TEST_RE = /\.(test|spec)\.ts$/;
const INTEGRATION_TEST_RE = /\.integration\.test\.ts$/;

/**
 * Fonte que um teste alterado exercita, por nome: primeiro segmento do arquivo de teste
 * (nfeCost.pisCofinsSplit.test.ts → nfeCost) procurado no `mutate`, dentro da pasta que contém o
 * `__tests__` (ou da pasta do próprio teste). Heurística — o que não casar é avisado.
 */
function testRoot(testFile) {
  const idx = testFile.indexOf('/__tests__/');
  return idx >= 0 ? testFile.slice(0, idx + 1) : path.posix.dirname(testFile) + '/';
}

function sourcesForTest(testFile, mutateFiles) {
  const stem = path.posix.basename(testFile).split('.')[0];
  const root = testRoot(testFile);
  return mutateFiles.filter((f) => f.startsWith(root) && path.posix.basename(f, '.ts') === stem);
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  let mergeBase;
  try {
    mergeBase = git(['merge-base', opts.base, 'HEAD']).trim();
  } catch {
    throw new Error(
      `não achei merge-base com "${opts.base}" — rode \`git fetch origin main\` ou passe --base.`,
    );
  }

  const base = await loadBaseConfig();
  const mutateFiles = expandMutate(base.mutate);
  const mutateSet = new Set(mutateFiles);
  const ranges = changedRanges(mergeBase);

  const mutate = [];
  const wholeFiles = new Set();
  const unmatchedTests = [];
  for (const [file, fileRanges] of ranges) {
    if (mutateSet.has(file)) {
      for (const [a, b] of fileRanges) mutate.push(`${file}:${a}-${b}`);
    } else if (UNIT_TEST_RE.test(file) && !INTEGRATION_TEST_RE.test(file)) {
      const sources = sourcesForTest(file, mutateFiles);
      // Avisa só se o teste mora numa área com arquivos mutáveis (teste do CRM não é lacuna aqui).
      const root = testRoot(file);
      if (sources.length === 0 && mutateFiles.some((f) => f.startsWith(root))) unmatchedTests.push(file);
      for (const s of sources) if (!ranges.has(s)) wholeFiles.add(s);
    }
  }
  mutate.push(...[...wholeFiles].sort());

  console.log(`Base: ${opts.base} (merge-base ${mergeBase.slice(0, 8)}) → HEAD`);
  if (unmatchedTests.length) {
    console.log(`Testes alterados sem fonte homônima no \`mutate\` (não puxam nada):`);
    for (const t of unmatchedTests) console.log(`  ${t}`);
  }
  if (mutate.length === 0) {
    console.log('Nada a mutar: nenhuma linha alterada cai no `mutate` do stryker.config.mjs.');
    return;
  }
  console.log(`A mutar (${mutate.length} faixas/arquivos):`);
  for (const m of mutate) console.log(`  ${m}`);
  if (opts.dryRun) return;

  if (!srcIsClean()) {
    throw new Error(
      'server/src tem alteração não commitada — o Stryker roda inPlace; commite ou descarte antes.',
    );
  }
  const configPath = writeDerivedConfig(DIFF_DIR, 'stryker.diff.config.mjs', mutate);
  const code = await runStryker(configPath, path.join(DIFF_DIR, 'stryker.log'));
  if (!srcIsClean()) throw new Error(RECOVERY_HINT);
  if (code !== 0) throw new Error(`Stryker saiu com ${code} — log em reports/mutation/diff/stryker.log`);
  if (fs.existsSync(path.join(DIFF_DIR, 'mutation.html'))) {
    console.log('Relatório: reports/mutation/diff/mutation.{html,json}');
  }
}

main().catch((err) => {
  console.error(`\n✖ ${err.message}`);
  process.exit(1);
});

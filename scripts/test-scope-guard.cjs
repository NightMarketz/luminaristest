// Trava de escopo dos testes (dono, chat, 2026-11-03: "O projeto precisa parar de quando disparar alguns testes todos
// do sistema todo serem disparados, isso pesa o pc demais"). Com várias sessões de agente na mesma máquina, cada
// suíte inteira (448 suítes unit + 227 de integração em 4 shards de 8 GB) trava o PC. Localmente só roda teste com
// escopo (caminho, --findRelatedTests, --changedSince...); a suíte inteira é do CI (`CI` setado) ou de quem pede
// `FULL_SUITE=1`. Usado por `server/jest.config.js`, `my-app/vitest.config.ts` e `server/scripts/test-integration-sharded.mjs`.

// Flags que já restringem os arquivos (ou não rodam teste nenhum).
const JEST_SCOPE_FLAGS = [
  '--listTests', '--showConfig', '--watch', '--findRelatedTests', '--changedSince', '--onlyChanged', '-o',
  '--lastCommit', '--testPathPatterns', '--testPathPattern', '--clearCache',
];
const VITEST_SCOPE_FLAGS = ['--changed', '--related', '--help', '-h', '--version', '-v'];

// Flags cujo valor vem no token seguinte (quando escritas sem `=`): o valor não é caminho de teste.
const VALUE_FLAGS = new Set([
  '--selectProjects', '--maxWorkers', '-w', '--shard', '-t', '--testNamePattern', '-c', '--config', '--reporters',
  '--reporter', '--testTimeout', '--outputFile', '--cacheDirectory', '--coverageReporters', '--coverageThreshold',
  '--testPathIgnorePatterns', '--seed', '--rootDir', '--root', '--dir', '--project', '--environment', '--pool',
  '--maxConcurrency', '--bail',
]);
// Valores de --selectProjects (aceita vários) e subcomandos do vitest não são caminho.
const NON_PATH_WORDS = new Set(['unit', 'integration', 'run', 'watch', 'dev', 'related', 'list']);

function isScoped(args, scopeFlags) {
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (scopeFlags.some((f) => a === f || a.startsWith(`${f}=`))) return true;
    if (a.startsWith('-')) continue;
    const prev = args[i - 1];
    if (prev && VALUE_FLAGS.has(prev)) continue;
    if (NON_PATH_WORDS.has(a)) continue;
    return true; // posicional = filtro de caminho
  }
  return false;
}

// Armadilha do jest 30: `--selectProjects` é lista, então `--selectProjects unit <caminho>` (com ou sem `=`) vira
// projeto "unit" + projeto "<caminho>", que não existe — e roda as 448 suítes do unit. Medido em 03/11 com
// `--listTests`: 448 nas duas formas; com o caminho ANTES do `--selectProjects`, 1.
function swallowedBySelectProjects(args) {
  for (let i = 0; i < args.length; i++) {
    if (args[i] !== '--selectProjects' && !args[i].startsWith('--selectProjects=')) continue;
    for (let j = i + 1; j < args.length && !args[j].startsWith('-'); j++) {
      if (args[i] === '--selectProjects' && j === i + 1) continue; // o 1º valor da forma sem `=`
      if (!NON_PATH_WORDS.has(args[j])) return args[j];
    }
  }
  return null;
}

/** `null` = pode rodar; string = motivo da recusa. Puro, para o teste. */
function decide({ runner, args, env }) {
  if (runner === 'jest') {
    const engolido = swallowedBySelectProjects(args);
    if (engolido) {
      return [
        `"${engolido}" virou nome de projeto do --selectProjects, e o jest rodaria a suíte inteira.`,
        `Ponha o caminho antes: npx jest ${engolido} --selectProjects ${args.includes('integration') ? 'integration --runInBand' : 'unit'}`,
      ].join('\n');
    }
  }
  if (env.CI || env.FULL_SUITE === '1') return null;
  if (runner === 'vitest' && args[0] === 'related') return null;
  if (isScoped(args, runner === 'jest' ? JEST_SCOPE_FLAGS : VITEST_SCOPE_FLAGS)) return null;
  const exemplo = runner === 'jest'
    ? 'npx jest <caminho/do/arquivo.test.ts> --selectProjects unit  ·  integração: npx jest <arquivo> --selectProjects integration --runInBand'
    : 'npx vitest run <caminho/do/arquivo.test.tsx>';
  return [
    `Suíte inteira de ${runner} bloqueada fora do CI (pesa o PC; dono, 2026-11-03).`,
    `Rode só os testes do que você tocou: ${exemplo}`,
    'A suíte completa roda no CI do PR. Para rodar tudo aqui mesmo assim: FULL_SUITE=1.',
  ].join('\n');
}

/** Lança se o processo é o CLI do runner chamado sem escopo. Chamadas programáticas (Stryker) e workers passam. */
function guardFullSuite(runner, argv = process.argv, env = process.env) {
  if (env.JEST_WORKER_ID || env.VITEST_POOL_ID || env.VITEST_WORKER_ID) return;
  const cli = runner === 'jest' ? /[\\/]jest(?:-cli)?[\\/]bin[\\/]jest\.js$|[\\/]\.bin[\\/]jest$/ : /[\\/]vitest(?:\.mjs)?$/;
  if (!cli.test(argv[1] ?? '')) return;
  const motivo = decide({ runner, args: argv.slice(2), env });
  if (motivo) throw new Error(motivo);
}

module.exports = { decide, guardFullSuite };

// @ts-check
// Mutation testing — SÓ os módulos fiscais/contábeis. Fora do CI por decisão (rodada manual).
// Roda contra o projeto Jest `unit` (stryker.jest.config.js). Modos:
// - `npm run test:mutation` (principal): só as linhas alteradas desde o merge-base com origin/main,
//   cruzadas com o `mutate` abaixo (scripts/mutation-diff.mjs; `--base <ref>`, `--dry-run`).
// - `npm run test:mutation:full`: tudo de uma vez — passa de 40 h (medido 15/10).
// - `npm run test:mutation:slices`: tudo em parcelas com orçamento de horas (scripts/mutation-slices.mjs).
import os from 'node:os';

// Cada worker é um Jest + ts-jest inteiro e incha a cada rodada (medido 14/10: 1–3,3 GB cada).
// Com concurrency 12 numa máquina de 16 threads / 31 GB, a RAM zerou e o Windows passou a paginar
// — mais lento que rodar com menos workers. Limita por RAM (~5 GB/worker) e deixa 2 threads livres.
const GB = 1024 ** 3;
const concurrency = Math.max(1, Math.min(os.availableParallelism() - 2, Math.floor(os.totalmem() / (5 * GB))));

/** @type {import('@stryker-mutator/api/core').PartialStrykerOptions} */
export default {
  testRunner: 'jest',
  jest: { projectType: 'custom', configFile: 'stryker.jest.config.js', enableFindRelatedTests: true },
  coverageAnalysis: 'perTest',
  mutate: [
    'src/features/accounting/**/*.ts',
    'src/features/accountingBinding/**/*.ts',
    'src/features/legalParameters/**/*.ts',
    'src/lib/{sped,ecf,ecfReal,nfe,nfeCost,nfse,nfseEvento,nfseReadback,mit,cnab,ofx,cnpj,cpf,referentialCatalog}.ts',
    '!src/**/__tests__/**',
    '!src/**/*.test.ts',
    '!src/**/fixtures/**',
    '!src/**/*.d.ts',
  ],
  // inPlace: testes fiscais leem fixtures por caminho relativo à raiz do repo (../../server/prisma/data),
  // que não existe dentro de um sandbox .stryker-tmp/. O Stryker restaura os arquivos ao terminar
  // NORMALMENTE; morto à força (kill/fechar terminal), os arquivos ficam instrumentados. Recuperação
  // (só com a árvore commitada!): `git checkout -- . && rm -rf .stryker-tmp` em server/.
  inPlace: true,
  // Sem `// @ts-nocheck` em massa: o default escrevia em ~1.360 arquivos (scripts/configs inclusive)
  // no modo inPlace. @swc/jest só transpila (jest.config.js), então não há type-check a desligar.
  disableTypeChecks: false,
  // Mutante estático (constante de módulo — ex.: tabelas legais em models/) roda a suíte inteira:
  // 5.022 deles (14%) custavam 97% do tempo (~85 h estimadas). Ficam como "Ignored" no relatório.
  ignoreStatic: true,
  ignorePatterns: ['/dist', '/coverage', '/reports', '/.stryker-tmp'],
  reporters: ['clear-text', 'progress', 'html', 'json'],
  htmlReporter: { fileName: 'reports/mutation/mutation.html' },
  jsonReporter: { fileName: 'reports/mutation/mutation.json' },
  thresholds: { high: 80, low: 60, break: null },
  timeoutMS: 20000,
  concurrency,
  // Recicla o worker a cada N mutantes: o registry de módulos do Jest acumula entre execuções e é
  // isso que leva um worker a 3 GB. Reiniciar custa um boot do Jest (~segundos) a cada 25 mutantes.
  maxTestRunnerReuse: 25,
  // Reaproveita o resultado da rodada anterior: só mutantes em código/testes alterados rodam de novo.
  // Arquivo fica em reports/mutation/ (já no .gitignore). `--force` refaz tudo.
  incremental: true,
  incrementalFile: 'reports/mutation/stryker-incremental.json',
  tempDirName: '.stryker-tmp',
  cleanTempDir: 'always',
};

// @ts-check
// Mutation testing — SÓ os módulos fiscais/contábeis. Fora do CI por decisão (rodada manual:
// `npm run test:mutation`). Roda contra o projeto Jest `unit` (stryker.jest.config.js).
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
  // que não existe dentro de um sandbox .stryker-tmp/. O Stryker restaura os arquivos ao terminar —
  // confira `git status` limpo depois de uma rodada interrompida.
  inPlace: true,
  ignorePatterns: ['/dist', '/coverage', '/reports', '/.stryker-tmp'],
  reporters: ['clear-text', 'progress', 'html', 'json'],
  htmlReporter: { fileName: 'reports/mutation/mutation.html' },
  jsonReporter: { fileName: 'reports/mutation/mutation.json' },
  thresholds: { high: 80, low: 60, break: null },
  timeoutMS: 20000,
  concurrency: 12,
  tempDirName: '.stryker-tmp',
  cleanTempDir: 'always',
};

// @ts-check
// Luminaris my-app — fronteiras de camada (dependency-cruiser). Decisão: docs/adr/ADR-ARCH-BOUNDARIES.md.
// Gate = `npm run check:arch` (barra só violação NOVA: as existentes estão em
// .dependency-cruiser-known-violations.json, regenerado por `npm run check:arch:baseline`).
// Ponto cego: `fetch()` cru é global, não import — este gate NÃO o vê (contrato §3 fica com o ESLint).

const TEST = '(__tests__|\\.test\\.tsx?$|vitest\\.setup)';

/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
  forbidden: [
    {
      name: 'U1-no-direct-api-client',
      severity: 'error',
      comment: 'Contrato §3: página/feature/componente chama lib/services/*.service.ts, nunca o apiClient.',
      from: { path: '^(features|components|pages)/', pathNot: TEST },
      to: { path: '^lib/api/api-client\\.ts$' },
    },
    {
      name: 'U2-lib-not-ui',
      severity: 'error',
      comment: 'lib/ (services, hooks, utils, context) não depende de features/components/pages.',
      from: { path: '^lib/', pathNot: TEST },
      to: { path: '^(features|components|pages)/' },
    },
    {
      name: 'U3-components-not-features',
      severity: 'error',
      comment: 'components/ é compartilhado: não conhece feature nem página.',
      from: { path: '^components/', pathNot: TEST },
      to: { path: '^(features|pages)/' },
    },
    {
      name: 'U4-features-not-pages',
      severity: 'error',
      from: { path: '^features/', pathNot: TEST },
      to: { path: '^pages/' },
    },
    {
      name: 'U5-no-backend-import',
      severity: 'error',
      comment: 'Payload vem dos tipos do dtoShapeSnapshot (types/contracts); import do backend REJEITADO.',
      from: {},
      to: { path: '(^|/)server/' },
    },
    {
      name: 'U6-prod-not-test',
      severity: 'error',
      from: { pathNot: TEST },
      to: { path: TEST },
    },
    {
      name: 'U7-no-circular',
      severity: 'error',
      from: {},
      to: { circular: true },
    },
  ],
  options: {
    doNotFollow: { path: ['node_modules'] },
    exclude: { path: ['^\\.next/', '^node_modules/', '^public/'] },
    tsPreCompilationDeps: true,
    tsConfig: { fileName: 'tsconfig.json' },
    enhancedResolveOptions: { extensions: ['.ts', '.tsx', '.js', '.jsx', '.json'] },
  },
};

// @ts-check
// Luminaris server — fronteiras de camada (dependency-cruiser). Decisão: docs/adr/ADR-ARCH-BOUNDARIES.md.
// Gate = `npm run check:arch` (barra só violação NOVA: as existentes estão em
// .dependency-cruiser-known-violations.json, regenerado por `npm run check:arch:baseline`).
// Complementa — não substitui — o layer-gate do ESLint (eslint.config.mjs R1/R1b), que fica com a
// trilha de supressão do debt-ledger. Imports `type`-only CONTAM: interface de repository dentro de
// policy é o sinal de policy que não é pura.

const TEST = '(__tests__|\\.test\\.ts$)';
const PRISMA = '^src/lib/prisma\\.ts$';
const FEATURE_LOGIC = '^src/features/[^/]+/(?!models/).+';
const FISCAL_LIB =
  '^src/lib/(sped|ecf|ecfReal|nfe|nfeCost|nfeSignature|nfse|nfseEvento|nfseReadback|nfseSignature|mit|cnab|ofx|cnpj|cpf|referentialCatalog)\\.ts$';

/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
  forbidden: [
    // ---- cadeia Route → Controller → Service → Repository → Prisma (+ Policy) — contrato §2 ----
    {
      name: 'L1-route-only-mounts-controllers',
      severity: 'error',
      comment: 'Route só declara router.<verbo> + handler: não chama service/repository/prisma.',
      from: { path: '^src/routes/', pathNot: TEST },
      to: { path: `(/repositories/|/services/|${PRISMA})` },
    },
    {
      name: 'L2-controller-not-repository',
      severity: 'error',
      comment: 'Controller chama Service (via lib/factory). Nunca Repository nem o singleton Prisma.',
      from: { path: '(^src/controllers/|/controllers/)', pathNot: TEST },
      to: { path: `(/repositories/|${PRISMA})` },
    },
    {
      name: 'L3-service-not-http-or-prisma',
      severity: 'error',
      comment: 'Service não conhece controller/route/Express nem o singleton Prisma (só via Repository).',
      from: { path: '/services/', pathNot: TEST },
      to: { path: `(^src/routes/|/controllers/|${PRISMA}|node_modules/express/)` },
    },
    {
      name: 'L4-repository-is-the-floor',
      severity: 'error',
      comment: 'Repository não importa service/controller/route/policy.',
      from: { path: '/repositories/', pathNot: TEST },
      to: { path: '(/services/|/controllers/|^src/routes/|/policies/)' },
    },
    {
      name: 'L5-policy-is-pure',
      severity: 'error',
      comment: 'Policy = decisão boolean: zero acesso a dados (nem interface de repository), zero service.',
      from: { path: '/policies/', pathNot: TEST },
      to: { path: `(/repositories/|/services/|/controllers/|${PRISMA})` },
    },
    {
      name: 'L6-model-dto-are-leaves',
      severity: 'error',
      comment: 'models/ e dtos/ são folhas de tipo/contrato: não importam camada executável.',
      from: { path: '/(models|dtos)/', pathNot: TEST },
      to: { path: `(/repositories/|/services/|/controllers/|^src/routes/|${PRISMA})` },
    },
    // ---- §2.1 DynamicTable × Prisma first-class ----
    {
      name: 'B1-dynamictable-engine-not-first-class',
      severity: 'error',
      comment:
        'AC-2.1-B1: o motor DynamicTable não importa módulo Prisma first-class. Integração sobe ao ' +
        'nível de aplicação (controller/route/serviço de integração).',
      from: { path: '^src/features/dynamicTables/', pathNot: TEST },
      to: { path: '^src/features/(accounting|accountingBinding|legalParameters|fx|sectorKits)/' },
    },
    // ---- BE-INCR-SCOPE-UNIT-GUARD (nó I6, F-I6-7) ----
    {
      name: 'I6-controller-not-internal-scope',
      severity: 'error',
      comment:
        'Controller HTTP resolve o escopo contábil pelo AccountingScopeResolver (valida o unitId contra a tabela ' +
        '`units` do dono). A função síncrona é só dos chamadores internos (F-I6-1 d; dono, 2026-10-15). Exceção ' +
        'nomeada: crmController.ts, cujo único uso é o hook Won interno (unitId da oportunidade gravada; L-I6-3, dono, ' +
        '2026-10-16, "Exceção nomeada").',
      from: { path: '^src/controllers/', pathNot: `(${TEST}|^src/controllers/crmController\.ts$)` },
      to: { path: '^src/features/accounting/scope/resolveAccountingScopeInternal\.ts$' },
    },
    // ---- fiscal/contábil puro ----
    {
      name: 'F1-fiscal-lib-is-pure',
      severity: 'error',
      comment:
        'Geradores/parsers fiscais (sped/ecf/nfe/nfse/mit/cnab/ofx…) não tocam service/repository/' +
        'Prisma/HTTP. Podem ler features/*/models/ (dado puro).',
      from: { path: FISCAL_LIB },
      to: { path: `(${FEATURE_LOGIC}|${PRISMA}|^src/controllers/|^src/routes/)` },
    },
    // ---- lib/ é infraestrutura ----
    {
      name: 'X1-lib-not-feature-logic',
      severity: 'error',
      comment: 'lib/ não depende de lógica de feature; só lib/factory.ts (composition root) conhece features.',
      from: { path: '^src/lib/', pathNot: `(^src/lib/factory\\.ts$|${TEST})` },
      to: { path: `(${FEATURE_LOGIC}|^src/controllers/|^src/routes/)` },
    },
    {
      name: 'X2-prod-not-test',
      severity: 'error',
      from: { path: '^src/', pathNot: `(${TEST}|/fixtures/)` },
      to: { path: `(${TEST}|^test/)` },
    },
    {
      name: 'X3-no-circular',
      severity: 'error',
      comment: 'Sem ciclo de import. lib/factory.ts (composition root) é a exceção.',
      from: { path: '^src/' },
      to: { circular: true, viaNot: '^src/lib/factory\\.ts$' },
    },
  ],
  options: {
    doNotFollow: { path: ['node_modules', '^generated/'] },
    exclude: { path: ['^dist/', '^coverage/'] },
    tsPreCompilationDeps: true,
    tsConfig: { fileName: 'tsconfig.json' },
    enhancedResolveOptions: {
      exportsFields: ['exports'],
      conditionNames: ['import', 'require', 'node', 'default'],
      extensions: ['.ts', '.js', '.json', '.d.ts'],
    },
    reporterOptions: { text: { highlightFocused: true } },
  },
};

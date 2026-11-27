// @ts-check
// Luminaris server — fronteiras de camada (dependency-cruiser). Decisão: docs/adr/ADR-ARCH-BOUNDARIES.md.
// Gate = `npm run check:arch` (barra só violação NOVA: as existentes estão em
// .dependency-cruiser-known-violations.json, regenerado por `npm run check:arch:baseline`).
// Complementa — não substitui — o layer-gate do ESLint (eslint.config.mjs R1/R1b), que fica com a
// trilha de supressão do debt-ledger. Imports `type`-only CONTAM: interface de repository dentro de
// policy é o sinal de policy que não é pura.

const TEST = '(__tests__|\\.test\\.ts$)';
const PRISMA = '^src/lib/prisma\\.ts$';
// ADR-MODULE-BOUNDARIES §10, F-MBE-3 (a): arquivo de `public/` que NÃO é `*.types.ts` é porta executável. Policy e
// models/dtos não a importam (L5/L6); o `*.types.ts` passa: carrega tipo, enum e constante de `models/` e `dtos/` da
// própria feature e não importa mais nada (regra M4).
const PUBLIC_EXEC = '^src/features/[^/]+/public/(?!.*\\.types\\.ts$)';
// ADR-MODULE-BOUNDARIES §10, F-MB-1 (b) e F-MB-3 (c): pasta de camada de uma feature. A M2 entra por feature
// (F-MBE-2 c): M2_FEATURES cresce a cada PR de renome e termina como `[^/]+`.
const LAYER_DIR = '/(services|repositories|policies|models|dtos|controllers|domain|ports|adapters|public)/';
const M2_FEATURES = '(dynamicTables|analytics|sectorKits|interview|crm|fx|accountingBinding)';
// O alvo das três regras M2: arquivo `.ts` de produção de uma feature de M2_FEATURES fora de pasta de camada.
const M2_OUTSIDE_LAYER = {
  path: `^src/features/${M2_FEATURES}/.+\\.ts$`,
  pathNot: [LAYER_DIR, '^src/features/dynamicTables/rules/', TEST],
};
const FEATURE_LOGIC = '^src/features/[^/]+/(?!models/).+';
const FISCAL_LIB =
  '^src/lib/(sped|ecf|ecfReal|nfe|nfeCost|nfeSignature|nfse|nfseEvento|nfseReadback|nfseSignature|mit|cnab|ofx|cnpj|cpf|referentialCatalog)\\.ts$';

// Onda 1.2 (ADR-ARCH-BOUNDARIES §1.2) — NÚCLEO DO RAZÃO: os serviços que escrevem/guardam o razão e os repositórios dele.
const LEDGER_CORE =
  '^src/features/accounting/(' +
  'services/(PostingService|PeriodService|AuditService|ExerciseClosingService|ReconciliationService)' +
  '|repositories/I?(JournalEntry|Posting|Account|AccountingPeriod|Audit|Reconciliation|SourceProvenance)Repository' +
  ')\\.ts$';
// O que o núcleo do razão PODE importar (lista fechada). Fiscal/localização (`paises/`, Tax*/Lalur*/Simples*/Sped*/Nfe*…, `lib/ofx|cnab|sped|ecf…`)
// nunca está aqui: entra por porta (`ports/LedgerPorts.ts`) com adaptador em `paises/br/` montado só em `lib/factory.ts`.
const LEDGER_CORE_ALLOWED =
  '^src/features/accounting/(' +
  'audit/' +
  '|dtos/(PostingDto|ReconciliationDto)\\.ts' +
  // Resíduo declarado: o plano de contas padrão (CANONICAL_ACCOUNTS) ainda é dado do Brasil dentro do núcleo — vai para
  // `paises/br/` em fatia própria (lacuna na caixa; ADR-ARCH-BOUNDARIES §1.2). As regras da ECD já saíram.
  '|fixtures/ChartOfAccountsFixture\\.ts' +
  // `AccountantAssignment.model`: contador responsável por escopo (GOV-CONTADOR) é núcleo, não fiscal; `ActiveAccountant` mora aqui desde
  // o PR-1a do MODULE-BOUNDARIES (#1375), de onde o `PeriodService` o importa (antes vinha de `policies/IAccountingPolicy`).
  // `AccountingScope` (tipo e where-builder do escopo) veio de `scope/` no renome da accounting (26/11/2026): a entrada
  // `scope/` desta lista virou este arquivo, o único da pasta que o núcleo importa.
  '|models/(AccountantAssignment\\.model|AccountingScope|Reconciliation\\.model|closing|dates|ledgerStatus|money)\\.ts' +
  '|policies/IAccountingPolicy\\.ts' +
  '|ports/LedgerPorts\\.ts' +
  '|repositories/I?(Account|AccountantAssignment|AccountingPeriod|Audit|Counterparty|Dimension|JournalEntry|Posting|Reconciliation|SourceProvenance)Repository\\.ts' +
  '|services/(AuditService|PostingService|dimensionTagging)\\.ts' +
  ')' +
  '|^src/lib/(errors|logger|prisma|spreadsheet)\\.ts$';

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
      to: { path: `(/repositories/|/services/|/controllers/|${PRISMA}|${PUBLIC_EXEC})` },
    },
    {
      name: 'L6-model-dto-are-leaves',
      severity: 'error',
      comment: 'models/ e dtos/ são folhas de tipo/contrato: não importam camada executável.',
      from: { path: '/(models|dtos)/', pathNot: TEST },
      to: { path: `(/repositories/|/services/|/controllers/|^src/routes/|${PRISMA}|${PUBLIC_EXEC})` },
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
    {
      name: 'B7-dynamictable-no-consumer-services',
      severity: 'error',
      comment:
        'Contrato §2.1: o motor nunca chama o consumidor (BE-INCR-DT-NO-CONSUMER-CALLS). Cache de KPI e ' +
        'KnowledgeGraph são efeitos pós-commit de quem orquestra a escrita (features/integration).',
      from: { path: '^src/features/dynamicTables/', pathNot: TEST },
      to: { path: '^src/features/(chat|analytics|integration)/services/' },
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
      // Renome da accounting (26/11/2026): a função foi de `scope/` para `models/` e sai para outras features pela porta
      // `public/resolveAccountingScopeInternal.ts`. A regra cita os dois caminhos: controller não a alcança nem pela porta.
      to: { path: '^src/features/accounting/(models|public)/resolveAccountingScopeInternal\.ts$' },
    },
    // ---- PES-4, Departamento Pessoal (BE-INCR-DP-F0-F1 item 6) ----
    {
      name: 'D1-dp-core-not-optional',
      severity: 'error',
      comment:
        'F-DP-10 (dono, 2026-11-02, "Cria a trava"): o núcleo do DP (features/dp/) não importa submódulo opcional ' +
        '(features/dp<Nome>/). Opcional entra por porta com adaptador nulo, montada só no lib/factory.ts. Ponto cego: ' +
        'controllers/dp*.ts e routes/dp.ts ficam fora da regra e falam só com o getFactory().',
      from: { path: '^src/features/dp/', pathNot: TEST },
      to: { path: '^src/features/dp[A-Z][A-Za-z0-9]*/' },
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
    // ---- Onda 1.2: núcleo do razão fechado para fiscal/localização ----
    {
      name: 'C1-ledger-core-not-fiscal',
      severity: 'error',
      comment:
        'Onda 1.2 (dono, 24/11/2026; F-PB-1 a, ADR-PAIS-NA-BORDA): o núcleo do razão (PostingService, PeriodService, AuditService, ' +
        'ExerciseClosingService, ReconciliationService e os repositórios do razão) só importa a lista fechada LEDGER_CORE_ALLOWED. ' +
        'Fiscal e localização (paises/**, TaxAssessment*, ILalurRepository, lib/ofx|cnab|sped|ecf…, regras do Manual da ECD) entram por ' +
        'porta de ports/LedgerPorts.ts, com adaptador em paises/br/ montado só no lib/factory.ts. Import type conta. Nasce em 0: nunca ' +
        'entra no known-violations; precisar de algo novo = emenda datada no ADR com a porta, não item na lista.',
      from: { path: LEDGER_CORE },
      to: { path: '^src/', pathNot: LEDGER_CORE_ALLOWED },
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
    // ---- fronteira entre features — ADR-MODULE-BOUNDARIES §10 (ligadas em 24/11/2026, PR-2 do BRIEF) ----
    // A M2 (peça de feature em pasta de camada) entra por feature, a cada PR de renome (F-MBE-2 c).
    {
      name: 'M1a-no-foreign-repository',
      severity: 'error',
      comment:
        'Nenhuma feature importa `repositories/` de outra (nem a interface, nem por `import type`). Quem precisa do ' +
        'dado de outra feature pede a porta que a dona expõe em `public/`.',
      from: { path: '^src/features/([^/]+)/', pathNot: TEST },
      to: { path: '^src/features/[^/]+/repositories/', pathNot: '^src/features/$1/' },
    },
    {
      name: 'M1-cross-feature-via-public',
      severity: 'error',
      comment:
        'Import de outra feature só por `features/<x>/public/`. Controller, route, job e lib/factory.ts ficam fora ' +
        'do `from` (são a camada de aplicação).',
      from: { path: '^src/features/([^/]+)/', pathNot: TEST },
      to: { path: '^src/features/[^/]+/', pathNot: ['^src/features/$1/', '^src/features/[^/]+/public/'] },
    },
    {
      name: 'M2-feature-code-in-layer-folder',
      severity: 'error',
      comment:
        'Peça de feature mora em pasta de camada (services, repositories, policies, models, dtos, controllers, ' +
        'domain, ports, adapters, public). Sem exceção para `index.ts` (F-MB-1 b); `dynamicTables/rules/` é a pasta ' +
        'do motor, isenta por nome (F-MB-3 c). Vale para as features de M2_FEATURES e nasce em 0 para cada uma: ' +
        'nunca entra no known-violations. Esta regra casa pelo `to` (arquivo importado por alguém, teste inclusive); ' +
        'a M2b e a M2c cobrem o arquivo que ninguém importa (dono, questionário, 25/11/2026: "Fechar no check:arch").',
      from: { path: '^src/' },
      to: M2_OUTSIDE_LAYER,
    },
    {
      name: 'M2b-feature-code-in-layer-folder-importing',
      severity: 'error',
      comment:
        'A M2 pelo lado do `from`: arquivo fora de pasta de camada que importa qualquer coisa, tenha ou não ' +
        'importador. Nasce em 0: nunca entra no known-violations.',
      from: M2_OUTSIDE_LAYER,
      to: {},
    },
    {
      name: 'M2c-feature-code-in-layer-folder-orphan',
      severity: 'error',
      comment:
        'A M2 para o arquivo órfão: fora de pasta de camada, não importa nada e ninguém o importa. Com a M2 e a ' +
        'M2b, todo `.ts` de produção fora de pasta de camada reprova. Nasce em 0: nunca entra no known-violations.',
      from: { orphan: true, ...M2_OUTSIDE_LAYER },
      to: {},
    },
    {
      name: 'M3-public-no-repository',
      severity: 'error',
      comment:
        'F-MBE-3 (a): `public/` não importa nem reexporta `repositories/` (senão a M1a se paga trocando o caminho ' +
        'do import, não a dependência). Nasce em 0: nunca entra no known-violations.',
      from: { path: '^src/features/[^/]+/public/', pathNot: TEST },
      to: { path: '/repositories/' },
    },
    {
      name: 'M4-public-types-only-models-dtos',
      severity: 'error',
      comment:
        'Dono, questionário, 24/11 ("Tudo em user.types.ts"): `public/<nome>.types.ts` reexporta tipo, enum e ' +
        'constante de `models/` e `dtos/` da própria feature e não importa mais nada. É o arquivo que a L5/L6 deixam ' +
        'policy, model e dto importarem pelo nome; sem esta regra ele vira porta para código executável. Nasce em 0: ' +
        'nunca entra no known-violations.',
      from: { path: '^src/features/([^/]+)/public/.*\\.types\\.ts$', pathNot: TEST },
      to: { pathNot: '^src/features/$1/(models|dtos)/' },
    },
    {
      name: 'D2-domain-is-pure',
      severity: 'error',
      comment:
        'F-MB-4 / F-MBE-4 (a): `domain/` é função pura, não engine — sem repository, service, controller, route, ' +
        'Prisma nem Express. Nem `lib/factory.ts`: quem chama `getFactory()` alcança repository e service por ele ' +
        '(dono, questionário, 25/11/2026: "Apagar e travar a D2"). Nasce em 0: nunca entra no known-violations.',
      from: { path: '/domain/', pathNot: TEST },
      to: {
        path: `(/repositories/|/services/|/controllers/|^src/routes/|${PRISMA}|^src/lib/factory\\.ts$|node_modules/express/)`,
      },
    },
    {
      name: 'J1-job-is-entrypoint',
      severity: 'error',
      comment:
        'Job é ponto de entrada: fala com o lib/factory.ts, não com repository nem com o singleton Prisma. Fora da ' +
        'regra: `jobs/repositories/` e as 3 CLIs de migração/seed nomeadas (ADR-MODULE-BOUNDARIES §10).',
      from: {
        path: '^src/jobs/',
        pathNot: [
          TEST,
          '^src/jobs/repositories/',
          '^src/jobs/(migratePlano4NiveisCli|rekeyLegacyUnitCli|seedAccountingFixtureCli)\\.ts$',
        ],
      },
      to: { path: `(/repositories/|${PRISMA})` },
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

import { existsSync, readdirSync, readFileSync, statSync } from 'fs';
import { dirname, join, resolve } from 'path';

/**
 * Fronteira de portabilidade do núcleo (BE-INCR-KIT-SETOR PR-5, itens 41–42; F-KS-6 → a).
 *
 * O núcleo (item 41) é o que vai para os outros projetos do dono: ele não pode importar nenhum módulo de
 * ORIGEM deste app (item 42). O que o núcleo precisa da origem entra por porta declarada nele e
 * implementada em `lib/factory.ts` (`docs/accounting/NUCLEO-PORTAVEL.md`).
 *
 * Checagem por SEGMENTO do caminho resolvido (lição do `accountingBinding/__tests__/importBoundary.test.ts`),
 * com `\` → `/` normalizado (memória rg-win32-backslash): `features/packages/...` casa, `packagesFoo` não.
 */

const SRC = resolve(__dirname, '..', '..', '..');
const norm = (p: string) => p.replace(/\\/g, '/');

/** Item 41 — diretórios do núcleo (relativos a `src/`). */
const CORE_DIRS = [
  'features/accounting',
  'features/accountingBinding/archetypes',
  'features/accountingBinding/interpreter',
  'features/accountingBinding/models',
  'features/accountingBinding/dtos',
  'features/legalParameters',
  'features/sectorKits/dtos',
  'features/sectorKits/models',
];
/** Item 41 — arquivos do núcleo em `lib/`. */
const CORE_LIB = [
  'sped', 'ecf', 'ecfReal', 'nfe', 'nfeSignature', 'nfse', 'nfseSignature', 'nfseEvento', 'nfseReadback',
  'cnab', 'ofx', 'mit', 'cnpj', 'cpf', 'errors', 'logger',
];

/** Item 42 — módulos de origem proibidos (`chat*` = qualquer segmento que comece com `chat`). */
const BANNED = /\/features\/(dynamicTables|interview|onboarding|sales|crm|packages|chat[^/]*|documents|dashboardLayout|savedViews|structuredData|analytics|reports)(\/|$)/;

function tsFiles(dir: string): string[] {
  if (!existsSync(dir)) return [];
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...tsFiles(full));
    else if (entry.endsWith('.ts')) out.push(full);
  }
  return out;
}

function coreFiles(): string[] {
  const files = CORE_DIRS.flatMap((d) => tsFiles(join(SRC, d)));
  for (const name of CORE_LIB) {
    const f = join(SRC, 'lib', `${name}.ts`);
    if (existsSync(f)) files.push(f);
    files.push(...tsFiles(join(SRC, 'lib', name)));
  }
  // Teste não é núcleo portável (fixture pode montar a origem); o próprio guarda fica fora.
  return files.filter((f) => !/[\\/]__tests__[\\/]/.test(f));
}

/** Especificadores de `import ... from`, `export ... from`, `import('…')` e `require('…')`. */
function specifiers(content: string): string[] {
  const re = /(?:\bfrom\s*|\bimport\s*\(\s*|\brequire\s*\(\s*|^\s*import\s+)['"]([^'"]+)['"]/gm;
  const out: string[] = [];
  for (let m = re.exec(content); m; m = re.exec(content)) out.push(m[1]);
  return out;
}

function leaks(): string[] {
  const found: string[] = [];
  for (const file of coreFiles()) {
    for (const spec of specifiers(readFileSync(file, 'utf8'))) {
      const target = spec.startsWith('.') ? norm(resolve(dirname(file), spec)) : `/${norm(spec)}`;
      if (BANNED.test(target)) found.push(`${norm(file).slice(norm(SRC).length + 1)} -> ${spec}`);
    }
  }
  return found.sort();
}

describe('core-boundary — o núcleo portável não importa módulo de origem (KIT-SETOR item 42)', () => {
  it('enumera arquivos do núcleo (o guarda não passa por vácuo)', () => {
    const files = coreFiles().map(norm);
    expect(files.length).toBeGreaterThan(100);
    expect(files.some((f) => f.endsWith('/lib/sped.ts'))).toBe(true);
    expect(files.some((f) => f.includes('/features/legalParameters/'))).toBe(true);
  });

  it('o detector casa por segmento, não por substring', () => {
    expect(BANNED.test('/x/src/features/packages/models/validity')).toBe(true);
    expect(BANNED.test('/x/src/features/chatMessages/a')).toBe(true);
    expect(BANNED.test('/x/src/features/packagesFoo/a')).toBe(false);
    expect(BANNED.test('/x/src/features/accounting/sales/a')).toBe(false);
  });

  it('zero imports de dynamicTables/interview/onboarding/sales/crm/packages/chat*/documents/… no núcleo', () => {
    expect(leaks()).toEqual([]);
  });
});

/**
 * Onda 1.2 — DIREÇÃO: dentro do núcleo portável há um anel interno, o NÚCLEO DO RAZÃO, que não importa fiscal nem
 * localização (regra `C1-ledger-core-not-fiscal` do dependency-cruiser; `ADR-ARCH-BOUNDARIES` §1.2). O fiscal e o país entram
 * por porta (`ports/LedgerPorts.ts`) com adaptador em `paises/br/`, montado só em `lib/factory.ts`.
 *
 * Duas travas independentes: o depcruise barra por LISTA FECHADA do que o razão pode importar; este teste barra por LISTA DE
 * FAMÍLIAS proibidas (e confere que a regra existe e enxerga os arquivos). Mesma checagem por segmento e `import type` conta.
 */
const FEATURE = 'features/accounting';
const LEDGER_CORE_FILES = [
  'PostingService', 'PeriodService', 'AuditService', 'ExerciseClosingService', 'ReconciliationService',
].map((n) => `${FEATURE}/services/${n}.ts`).concat(
  ['JournalEntry', 'Posting', 'Account', 'AccountingPeriod', 'Audit', 'Reconciliation', 'SourceProvenance'].flatMap((n) => [
    `${FEATURE}/repositories/${n}Repository.ts`,
    `${FEATURE}/repositories/I${n}Repository.ts`,
  ]),
);

/** Fiscal e localização: `paises/`, serviços/repositórios/modelos fiscais da feature e as libs fiscais/de formato do país. */
const FISCAL_OR_LOCALE = new RegExp(
  [
    '/features/accounting/paises/',
    '/features/accounting/services/(Tax|Lalur|Simples|Sped|Nfe|Nfse|Fiscal|PisCofins|IbsCbs|Iss|Mit|Reinf|Withholding|Presumido|Servico|Receita|Interest|ProfitDist|Depreciation|FixedAsset|Referential|Psc|Dfe|Danfe)',
    '/features/accounting/repositories/I?(Lalur|Tax|Simples|Fiscal|Referential|Mit|Reinf|Withholding|Receita|Nfe|Nfce|IbsCbs|Iss|CompanyFiscal|ConsumptionTax)',
    '/features/accounting/models/(taxAssessment|Lalur|lalur|simples|pisCofins|ibs|nfe|nfse|iss|reinf|withholding|presumido|servico|sped|mit)',
    '/lib/(sped|ecf|ecfReal|nfe|nfeCost|nfeSignature|nfse|nfseEvento|nfseReadback|nfseSignature|mit|cnab|ofx|cnpj|cpf|referentialCatalog)$',
  ].join('|'),
);

function ledgerCoreLeaks(files: string[] = LEDGER_CORE_FILES): string[] {
  const found: string[] = [];
  for (const rel of files) {
    const file = join(SRC, rel);
    for (const spec of specifiers(readFileSync(file, 'utf8'))) {
      const target = spec.startsWith('.') ? norm(resolve(dirname(file), spec)).replace(/\.ts$/, '') : `/${norm(spec)}`;
      if (FISCAL_OR_LOCALE.test(target)) found.push(`${rel} -> ${spec}`);
    }
  }
  return found.sort();
}

/** Regex da lista fechada `LEDGER_CORE_ALLOWED` (o `to.pathNot` da C1), lida do `.dependency-cruiser.cjs`. */
function c1Permitido(): RegExp {
  // eslint-disable-next-line @typescript-eslint/no-require-imports -- config CJS do depcruise, lida só para conferir a regra
  const cfg = require(resolve(SRC, '..', '.dependency-cruiser.cjs')) as { forbidden: Array<{ name: string; to: { pathNot: string } }> };
  return new RegExp(cfg.forbidden.find((r) => r.name === 'C1-ledger-core-not-fiscal')!.to.pathNot);
}

/** Imports de `content` (arquivo `rel`, relativo a `src/`) que resolvem para arquivo existente de `src/` FORA da lista fechada. */
function importsForaDaLista(rel: string, content: string, permitido: RegExp): string[] {
  const file = join(SRC, rel);
  const fora: string[] = [];
  for (const spec of specifiers(content)) {
    // relativo, ou alias `@/` (tsconfig `paths`: `@/*` → `src/*`); pacote npm e `generated/…` ficam de fora. `./X.js` → `X`.
    if (!spec.startsWith('.') && !spec.startsWith('@/')) continue;
    const alvoBase = (spec.startsWith('@/') ? join(SRC, spec.slice(2)) : resolve(dirname(file), spec)).replace(/\.js$/, '');
    const alvo = [`${alvoBase}.ts`, join(alvoBase, 'index.ts')].find((c) => existsSync(c));
    if (!alvo) continue;
    const caminho = `src/${norm(alvo).slice(norm(SRC).length + 1)}`;
    if (!permitido.test(caminho)) fora.push(`${rel} -> ${caminho}`);
  }
  return fora;
}

describe('núcleo do razão — não importa fiscal nem localização (Onda 1.2, regra C1)', () => {
  it('cada arquivo do núcleo do razão existe (renomear fica vermelho, não vácuo)', () => {
    const faltando = LEDGER_CORE_FILES.filter((f) => !existsSync(join(SRC, f)));
    expect(faltando).toEqual([]);
  });

  it('o detector casa fiscal/localização e deixa passar o razão', () => {
    expect(FISCAL_OR_LOCALE.test('/x/src/lib/ofx')).toBe(true);
    expect(FISCAL_OR_LOCALE.test('/x/src/lib/cnab')).toBe(true);
    expect(FISCAL_OR_LOCALE.test('/x/src/features/accounting/services/TaxAssessmentService')).toBe(true);
    expect(FISCAL_OR_LOCALE.test('/x/src/features/accounting/repositories/ILalurRepository')).toBe(true);
    expect(FISCAL_OR_LOCALE.test('/x/src/features/accounting/repositories/ITaxAssessmentRepository')).toBe(true);
    expect(FISCAL_OR_LOCALE.test('/x/src/features/accounting/models/taxAssessmentProvisao')).toBe(true);
    expect(FISCAL_OR_LOCALE.test('/x/src/features/accounting/paises/br/EcdChartStructureRule')).toBe(true);
    expect(FISCAL_OR_LOCALE.test('/x/src/lib/spreadsheet')).toBe(false);
    expect(FISCAL_OR_LOCALE.test('/x/src/features/accounting/services/PostingService')).toBe(false);
    expect(FISCAL_OR_LOCALE.test('/x/src/features/accounting/ports/LedgerPorts')).toBe(false);
    expect(FISCAL_OR_LOCALE.test('/x/src/features/accounting/models/money')).toBe(false);
  });

  it('o detector enxerga import `type` e relativo (arquivo plantado em memória)', () => {
    const planted = [
      "import type { ILalurRepository } from '../repositories/ILalurRepository';",
      "import { parseOfx } from '../../../lib/ofx';",
    ].join('\n');
    const alvos = specifiers(planted).map((spec) => norm(resolve(join(SRC, FEATURE, 'services'), spec)).replace(/\.ts$/, ''));
    expect(alvos.filter((t) => FISCAL_OR_LOCALE.test(t))).toHaveLength(2);
  });

  it('a regra C1 existe no dependency-cruiser, é erro, e seu "from" casa todo arquivo do núcleo do razão', () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports -- config CJS do depcruise, lida só para conferir a regra
    const cfg = require(resolve(SRC, '..', '.dependency-cruiser.cjs')) as { forbidden: Array<{ name: string; severity: string; from: { path: string }; to: { path: string } }> };
    const c1 = cfg.forbidden.find((r) => r.name === 'C1-ledger-core-not-fiscal');
    expect(c1?.severity).toBe('error');
    const from = new RegExp(c1!.from.path);
    const naoCasados = LEDGER_CORE_FILES.filter((f) => !from.test(`src/${f}`));
    expect(naoCasados).toEqual([]);
    // fiscal/país nunca está na lista do que o razão pode importar
    const to = c1!.to as { path: string; pathNot: string };
    const permitido = new RegExp(to.pathNot);
    for (const proibido of [
      'src/lib/ofx.ts', 'src/lib/cnab.ts', 'src/lib/sped.ts',
      'src/features/accounting/services/TaxAssessmentService.ts',
      'src/features/accounting/repositories/ILalurRepository.ts',
      'src/features/accounting/paises/br/EcdChartStructureRule.ts',
    ]) expect(permitido.test(proibido)).toBe(false);
  });

  it('zero imports de fiscal/localização no núcleo do razão', () => {
    expect(ledgerCoreLeaks()).toEqual([]);
  });

  it('todo import relativo de arquivo do núcleo do razão cai na lista fechada da C1 (a lista não envelhece sozinha)', () => {
    // A C1 é allowlist: o que o razão importa e NÃO está em `pathNot` vira erro no `check:arch`. Quando outra fatia move um tipo
    // do núcleo para um caminho novo (24/11: `ActiveAccountant` saiu de `policies/IAccountingPolicy` para
    // `models/AccountantAssignment.model`, #1375), a lista precisa acompanhar — este teste acusa a deriva no jest, sem o depcruise.
    const permitido = c1Permitido();
    const fora: string[] = [];
    for (const rel of LEDGER_CORE_FILES) fora.push(...importsForaDaLista(rel, readFileSync(join(SRC, rel), 'utf8'), permitido));
    expect(fora.sort()).toEqual([]);
  });

  it('o detector da lista fechada enxerga alias `@/` e extensão `.js` (arquivo plantado em memória; lacuna 165b)', () => {
    // O `check:arch` barra os dois (o depcruise resolve alias e `.js`); o jest também precisa, senão a trava no jest tem ponto cego.
    const permitido = c1Permitido();
    const rel = `${FEATURE}/services/AuditService.ts`;
    const alvo = 'src/features/accounting/services/PeriodService.ts'; // existe e NÃO está na lista da C1
    expect(permitido.test(alvo)).toBe(false);
    const specs = ['./PeriodService', './PeriodService.js', '@/features/accounting/services/PeriodService', '@/features/accounting/services/PeriodService.js'];
    const achado = Object.fromEntries(specs.map((spec) => [spec, importsForaDaLista(rel, `import { PeriodService } from '${spec}';`, permitido)]));
    expect(achado).toEqual(Object.fromEntries(specs.map((spec) => [spec, [`${rel} -> ${alvo}`]])));
    // o que está na lista continua passando pelos mesmos caminhos
    expect(importsForaDaLista(rel, "import { Money } from '@/features/accounting/models/money';", permitido)).toEqual([]);
    expect(importsForaDaLista(rel, "import { Money } from '../models/money.js';", permitido)).toEqual([]);
  });
});

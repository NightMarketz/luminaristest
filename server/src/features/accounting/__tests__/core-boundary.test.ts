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

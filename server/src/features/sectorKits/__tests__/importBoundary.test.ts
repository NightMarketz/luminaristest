import { readdirSync, readFileSync, statSync } from 'fs';
import { join } from 'path';

/**
 * Fronteira do `sectorKits` (BE-INCR-KIT-SETOR, PR-1, item 1) — no molde de
 * `accountingBinding/__tests__/importBoundary.test.ts`.
 *
 * - Nunca importa `features/dynamicTables`.
 * - De `features/accounting`, só o plano canônico (`ChartOfAccountsFixture`: `CANONICAL_ACCOUNTS`,
 *   `CanonicalAccount`, `AccountNature`) — allowlist própria decidida pelo dono em 08/10
 *   (`docs/plano/decisoes/D-2026-10-08-KIT-SETOR-FORKS-KB6-KB9.md`). O resto chega via `accountingBinding`.
 * - Ninguém em `features/accounting` importa `sectorKits`.
 * Checagem por SEGMENTO de path, para não confundir `accounting` com `accountingBinding`.
 */

const KITS_ROOT = join(__dirname, '..');
const ACCOUNTING_ROOT = join(__dirname, '..', '..', 'accounting');
const SELF_TEST_FILE = 'importBoundary.test.ts';

function tsFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...tsFiles(full));
    else if (entry.endsWith('.ts')) out.push(full);
  }
  return out;
}

const ACCOUNTING_SEGMENT = /(^|\/)accounting(\/|$)/;
const DYNAMIC_TABLES_SEGMENT = /(^|\/)dynamicTables(\/|$)/;
const ALLOWED_ACCOUNTING_IMPORTS: ReadonlyArray<{ suffix: RegExp; names: readonly string[] }> = [
  { suffix: /accounting\/fixtures\/ChartOfAccountsFixture$/, names: ['CANONICAL_ACCOUNTS', 'CanonicalAccount', 'AccountNature'] },
];

function namedImportsOf(statement: string): string[] {
  const named = /import\s+(?:type\s+)?\{([^}]*)\}\s+from/.exec(statement);
  if (named) {
    return named[1]
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
      .map((s) => s.split(/\s+as\s+/)[0].replace(/^type\s+/, '').trim());
  }
  const defaultImport = /import\s+(?:type\s+)?(\w+)\s+from/.exec(statement);
  return defaultImport ? [defaultImport[1]] : [];
}

function importStatements(content: string): Array<{ statement: string; spec: string }> {
  const re = /import\s+(?:type\s+)?(?:\{[^}]*\}|\w+|\*\s+as\s+\w+)\s+from\s+['"]([^'"]+)['"]/g;
  const out: Array<{ statement: string; spec: string }> = [];
  let match: RegExpExecArray | null;
  while ((match = re.exec(content)) !== null) out.push({ statement: match[0], spec: match[1] });
  return out;
}

describe('sectorKits boundary', () => {
  it('não importa dynamicTables; de features/accounting só o plano canônico nomeado', () => {
    const offenders: string[] = [];
    for (const file of tsFiles(KITS_ROOT)) {
      if (file.endsWith(SELF_TEST_FILE)) continue;
      for (const { statement, spec } of importStatements(readFileSync(file, 'utf8'))) {
        if (DYNAMIC_TABLES_SEGMENT.test(spec)) {
          offenders.push(`${file}: import de dynamicTables '${spec}'`);
          continue;
        }
        if (!ACCOUNTING_SEGMENT.test(spec)) continue;
        const rule = ALLOWED_ACCOUNTING_IMPORTS.find((r) => r.suffix.test(spec));
        if (!rule) {
          offenders.push(`${file}: módulo de accounting não permitido '${spec}'`);
          continue;
        }
        const bad = namedImportsOf(statement).filter((n) => !rule.names.includes(n));
        if (bad.length > 0) offenders.push(`${file}: nome(s) não permitido(s) de '${spec}': ${bad.join(', ')}`);
      }
    }
    expect(offenders).toEqual([]);
  });

  it('features/accounting nunca importa sectorKits', () => {
    const FORBIDDEN = /from\s+['"][^'"]*sectorKits[^'"]*['"]/;
    expect(tsFiles(ACCOUNTING_ROOT).filter((f) => FORBIDDEN.test(readFileSync(f, 'utf8')))).toEqual([]);
  });
});

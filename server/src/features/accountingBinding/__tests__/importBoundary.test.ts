import { readdirSync, readFileSync, statSync } from 'fs';
import { join } from 'path';

/**
 * §2.1 boundary guard, fronteira do binding (BE-INCR-BINDING-PRESS, Corpo D, item 13 do BRIEF) —
 * espelho do precedente `no-accounting-imports.boundary.test.ts`
 * (localizado por glob: `server/src/features/dynamicTables/__tests__/no-accounting-imports.boundary.test.ts`).
 *
 * Lá o motor NUNCA importa `features/accounting` (ban total). Aqui a regra é mais fina:
 * `features/accountingBinding` PODE importar de `features/accounting`, mas SÓ os contratos públicos
 * NOMEADOS no BRIEF item 13 (`IAccountingEventMapper`, `PostEntryInput`/`PostingDto`, `revenueSplit`,
 * `models/money`) — e a direção reversa continua banida (accounting nunca importa de
 * accountingBinding). Checagem por SEGMENTO de path (`(^|\/)accounting(\/|$)`), nunca substring
 * livre, para não confundir `features/accounting` com o próprio módulo `features/accountingBinding`.
 *
 * `goldenPhase0.test.ts` e `goldenPhase1.test.ts` são exceções NOMEADAS e DELIBERADAS — mesmo
 * espírito da auto-exclusão que o precedente já faz consigo mesmo (`if
 * (file.endsWith('no-accounting-imports.boundary.test.ts')) return false`). O trabalho do golden
 * (item 12 do BRIEF, as duas fases) é comparar a saída dos 5 mappers ATUAIS contra o
 * intérprete+binding (`P1-DOSSIER-golden-test.md` §c), o que exige importar as classes de mapper +
 * `AccountingEvent` diretamente nas DUAS fases — não é o pipeline de geração em runtime, é um
 * andaime de regressão/comparação temporário sobre o código LEGADO (mesmo espírito de
 * `nfe-fixture-provenance.test.ts`, uma trava deliberada, citado no master map). Nenhum outro
 * arquivo desta árvore ganha a mesma isenção.
 */

const BINDING_ROOT = join(__dirname, '..');
const ACCOUNTING_ROOT = join(__dirname, '..', '..', 'accounting');
const SELF_TEST_FILE = 'importBoundary.test.ts';
const EXEMPT_FILES = [SELF_TEST_FILE, 'goldenPhase0.test.ts', 'goldenPhase1.test.ts'];

function tsFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      out.push(...tsFiles(full));
    } else if (entry.endsWith('.ts')) {
      out.push(full);
    }
  }
  return out;
}

/** Import é um path relativo cujo ÚLTIMO segmento resolvido aponta para dentro de `features/accounting`
 *  — checagem por SEGMENTO EXATO (`(^|\/)accounting(\/|$)`), não substring: casa
 *  `../../accounting/dtos/PostingDto`, NÃO casa `../dtos/AccountingBindingDto` (arquivo, não
 *  segmento) nem `accountingBinding/...` (o segmento seguinte é 'B', não '/'). */
const ACCOUNTING_SEGMENT = /(^|\/)accounting(\/|$)/;

/** Módulo público permitido → nomes que podem ser importados dele (BRIEF item 13). */
const ALLOWED_ACCOUNTING_IMPORTS: ReadonlyArray<{ suffix: RegExp; names: readonly string[] }> = [
  { suffix: /accounting\/sync\/mappers\/IAccountingEventMapper$/, names: ['IAccountingEventMapper'] },
  { suffix: /accounting\/dtos\/PostingDto$/, names: ['PostEntryInput'] },
  {
    suffix: /accounting\/sync\/mappers\/revenueSplit$/,
    names: ['splitRevenueCredit', 'SERVICE_REVENUE_ACCOUNT', 'RESALE_REVENUE_ACCOUNT', 'RevenueCreditLine'],
  },
  { suffix: /accounting\/models\/money$/, names: ['MAX_CENTS'] },
];

/** Extrai os nomes de um import — nomeado (`{ a, b as c, type d }`) ou default (`a`) — a partir de
 *  UM statement de import já isolado (pode ter vindo de várias linhas, ver `importStatements`). */
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

/** Cada `import ... from '<spec>'` do arquivo — funciona com import de 1 linha OU de várias (o
 *  bloco `{...}` pode quebrar linha; `[^}]*` casa através de `\n` por ser classe de caractere, não
 *  `.`). Devolve `{ statement, spec }` por ocorrência. */
function importStatements(content: string): Array<{ statement: string; spec: string }> {
  const re = /import\s+(?:type\s+)?(?:\{[^}]*\}|\w+)\s+from\s+['"]([^'"]+)['"]/g;
  const out: Array<{ statement: string; spec: string }> = [];
  let match: RegExpExecArray | null;
  while ((match = re.exec(content)) !== null) {
    out.push({ statement: match[0], spec: match[1] });
  }
  return out;
}

describe('accountingBinding §2.1 boundary — só contratos públicos nomeados de features/accounting', () => {
  it('todo import de features/accounting em accountingBinding/ bate um módulo+nome permitido', () => {
    const offenders: string[] = [];
    for (const file of tsFiles(BINDING_ROOT)) {
      const base = file.split(/[\\/]/).pop()!;
      if (EXEMPT_FILES.includes(base)) continue;
      const content = readFileSync(file, 'utf8');
      for (const { statement, spec } of importStatements(content)) {
        if (!ACCOUNTING_SEGMENT.test(spec)) continue; // não é import de features/accounting
        const rule = ALLOWED_ACCOUNTING_IMPORTS.find((r) => r.suffix.test(spec));
        if (!rule) {
          offenders.push(`${file}: módulo de accounting não permitido '${spec}'`);
          continue;
        }
        const badNames = namedImportsOf(statement).filter((n) => !rule.names.includes(n));
        if (badNames.length > 0) {
          offenders.push(`${file}: nome(s) não permitido(s) de '${spec}': ${badNames.join(', ')}`);
        }
      }
    }
    expect(offenders).toEqual([]);
  });

  it('features/accounting nunca importa de accountingBinding (direção reversa banida)', () => {
    // Checa IMPORTS de verdade (`from '...accountingBinding...'`), não menções em prosa — diferente
    // do precedente (que bane até o NOME do serviço em qualquer lugar do arquivo, porque
    // `dynamicTables` nunca tem razão legítima de citar `PostingService` em texto). Aqui
    // `features/accounting` PODE mencionar `accountingBinding` em comentário/doc (ex.: o "DOC NOTE"
    // de `IAccountingEventMapper.ts`, item 11 do BRIEF, que cita o path do adaptador por nome) — o
    // invariante real é sobre o GRAFO de imports, não sobre o texto do arquivo.
    const FORBIDDEN = /from\s+['"][^'"]*accountingBinding[^'"]*['"]/;
    const offenders = tsFiles(ACCOUNTING_ROOT).filter((file) => FORBIDDEN.test(readFileSync(file, 'utf8')));
    expect(offenders).toEqual([]);
  });
});

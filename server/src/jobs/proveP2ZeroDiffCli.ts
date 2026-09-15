/**
 * proveP2ZeroDiffCli — BE-INCR-P2-VERTICAL-CLINICA, Bloco IV, comportamento 9. "A prova zero-diff
 * roda como comando versionado, não como inspeção manual" (BRIEF §3): este script roda
 * `git diff --name-only <base>...<head>` e sai não-zero se QUALQUER arquivo do diff cair dentro do
 * perímetro zero-diff que `docs/adr/ADR-P2-second-vertical.md` §2 item 2 define — a definição de
 * sucesso do ADR-P2 em si, não um gate cosmético.
 *
 * Perímetro (fonte: ADR-P2 §2 item 2 + PARECER-ARCHITECT-ADR-P2.md §1.5, leitura AMPLA ratificada
 * pela emenda 2026-08-22 + F-P2-10 → (c)):
 *   - motor DynamicTable: services/, repositories/, policies/, rules/, validation/, dtos/, models/,
 *     utils/ (sob `features/dynamicTables/`)
 *   - `presets/PresetManager.ts` + `presets/fields/` (motor de preset)
 *   - `features/accounting/` inteiro (núcleo do ledger + `sync/mappers`/`sync/bridges`)
 *   - o intérprete: `features/accountingBinding/{archetypes,interpreter,models}`
 *   - `server/src/lib/factory.ts` (EMENDA 2026-08-22)
 *   - `server/src/controllers/dynamicTablesController.ts` (EMENDA 2026-08-25, F-P2-10 → (c))
 *
 * EXPLICITAMENTE FORA (não checar, mesmo que um prefixo acima pareça abranger):
 *   - `features/dynamicTables/presets/ai/` (emenda 2026-08-22 — comportamento 3 PRECISA editar
 *     `PresetKnowledgeBase.ts`; exigir zero-diff ali reprovaria a prova por fazer o que o ADR §1
 *     autoriza)
 *   - `features/dynamicTables/presets/systems/` e `presets/modules/` (camada PRESET/DADO — cresce
 *     por vertical, por desenho; só um arquivo EXISTENTE e COMPARTILHADO dali é vetado — ver
 *     `VETOED_SHARED_FILES` abaixo, F-P2-5)
 *   - `features/accountingBinding/{services,dtos,repositories,policies,controllers}` (só
 *     archetypes/interpreter/models são "o intérprete"; o compilador/CLI de ativação estão fora do
 *     perímetro por desenho — F-P2-6/F-P2-7 dependem de poder editá-los)
 *   - `server/src/jobs/` (o CLI de ativação — F-P2-7 → (a) autoriza editar)
 *
 * `VETOED_SHARED_FILES` é uma checagem SEPARADA do perímetro do motor: `CustomerModule.ts` não
 * mora em nenhum diretório protegido acima (presets/modules/ pode crescer), mas F-P2-5 → (a) VETA
 * editar esse arquivo ESPECÍFICO (compartilhado com o salão) — é o comportamento 2 do BRIEF.
 */
import { execFileSync } from 'child_process';
import * as path from 'path';

const REPO_ROOT = path.resolve(__dirname, '..', '..', '..');

export const PERIMETER_PREFIXES = [
  'server/src/features/dynamicTables/services/',
  'server/src/features/dynamicTables/repositories/',
  'server/src/features/dynamicTables/policies/',
  'server/src/features/dynamicTables/rules/',
  'server/src/features/dynamicTables/validation/',
  'server/src/features/dynamicTables/dtos/',
  'server/src/features/dynamicTables/models/',
  'server/src/features/dynamicTables/utils/',
  'server/src/features/dynamicTables/presets/PresetManager.ts',
  'server/src/features/dynamicTables/presets/fields/',
  'server/src/features/accounting/',
  'server/src/features/accountingBinding/archetypes/',
  'server/src/features/accountingBinding/interpreter/',
  'server/src/features/accountingBinding/models/',
  'server/src/lib/factory.ts',
  'server/src/controllers/dynamicTablesController.ts',
] as const;

/** Fora do perímetro mesmo que um prefixo acima pareça abranger (ver header). */
export const EXPLICITLY_EXEMPT_PREFIXES = ['server/src/features/dynamicTables/presets/ai/'] as const;

/** Harness de teste não é ledger nem motor (ADR-P2 §2 "núcleo"; EMENDA 2026-09-15, decisão do dono por
 *  questionário no PR #320): um `__tests__/` que replaya migração quebra a cada coluna nova e teria de
 *  ser consertado "dentro do perímetro" sem ser diff da vertical. Só o SEGMENTO `/__tests__/` isenta —
 *  `tests-helper.ts` ao lado do código continua perímetro (teste-guarda). */
export const EXEMPT_PATH_SEGMENT = '/__tests__/';

/** Arquivos compartilhados vetados por regra própria (F-P2-5), independente da árvore do motor. */
export const VETOED_SHARED_FILES = [
  'server/src/features/dynamicTables/presets/modules/people/CustomerModule.ts',
] as const;

/**
 * Exceção NOMINAL de UM símbolo (ADR-P2 EMENDA 2026-09-14, R7 — cédula `CEDULA-DECISAO-2026-09-14-
 * forks-ratificacoes.md`): o marco de T0 do *time-to-first-ECD* (`User.onboardingCompletedAt`, F-I2-1 → a)
 * é gravado DENTRO da transação de `installPresetAsSystem`, e esse arquivo mora no perímetro. A emenda
 * libera exatamente ESSA escrita — a allowlist é de símbolo, não de caminho, e o teste-guarda em
 * `__tests__/proveP2ZeroDiffCli.test.ts` falha se ela crescer (2º símbolo, 2º arquivo).
 *
 * "Só o marco" (decisão de execução delegada pela emenda, item 2) mede-se assim: o diff do arquivo é
 * ADITIVO (zero linha removida), toda linha adicionada não-comentário contém `marker`, e todas caem
 * entre a assinatura de `symbol` e o `}` que fecha o método no head.
 */
export const SYMBOL_ALLOWLIST = [
  {
    file: 'server/src/features/dynamicTables/services/DynamicTableService.ts',
    symbol: 'installPresetAsSystem',
    marker: 'onboardingCompletedAt',
  },
] as const;

export type SymbolAllowlistEntry = (typeof SYMBOL_ALLOWLIST)[number];

/** Entrada por arquivo allowlisted: `git diff -U0 base...head -- file` + `git show head:file`. */
export interface SymbolDiffInput {
  diff: string;
  headSource: string;
}

function normalize(filePath: string): string {
  return filePath.replace(/\\/g, '/').trim();
}

/** [start, end] (1-based, inclusive) do método `symbol` no head — assinatura até o `  }` de membro. */
function findSymbolRange(headSource: string, symbol: string): [number, number] | null {
  const lines = headSource.split('\n');
  const signature = new RegExp(`^\\s+(?:public\\s+|private\\s+|protected\\s+)?(?:async\\s+)?${symbol}\\s*\\(`);
  const start = lines.findIndex((l) => signature.test(l));
  if (start === -1) return null;
  const indent = /^(\s*)/.exec(lines[start])![1];
  const end = lines.findIndex((l, i) => i > start && l.replace(/\r$/, '') === `${indent}}`);
  return end === -1 ? null : [start + 1, end + 1];
}

/** Função pura — lista as violações do diff de UM arquivo allowlisted (vazia = só o marco). */
export function classifySymbolDiff(diff: string, headSource: string, entry: SymbolAllowlistEntry): string[] {
  const range = findSymbolRange(headSource, entry.symbol);
  if (!range) return [`símbolo ${entry.symbol} não encontrado no head de ${entry.file}`];
  const [start, end] = range;

  // O marco CANÔNICO — a linha inteira, não uma substring (review #320 F2: `includes(marker)` aceitava
  // o marker em comentário à direita ou em string literal). Só `//` de linha inteira e linha vazia são
  // isentos; `/* … */` na mesma linha de código NÃO é (F3).
  const marcoLine = new RegExp(
    `^await tx\\.user\\.update\\(\\{ where: \\{ id: userId \\}, data: \\{ ${entry.marker}: new Date\\(\\) \\} \\}\\);$`,
  );
  const isExempt = (body: string): boolean => body === '' || body.startsWith('//');

  const violations: string[] = [];
  let newLine = 0;
  let seenHunk = false;
  let marcoLines = 0;
  for (const raw of diff.split('\n')) {
    const line = raw.replace(/\r$/, '');
    const hunk = /^@@ -\d+(?:,\d+)? \+(\d+)(?:,\d+)? @@/.exec(line);
    if (hunk) {
      newLine = Number(hunk[1]);
      seenHunk = true;
      continue;
    }
    // Cabeçalho só existe ANTES do primeiro hunk; depois dele, `+++x` é linha adicionada `++x` (F4).
    if (!seenHunk) continue;
    if (line.startsWith('-')) {
      violations.push(`linha removida em ${entry.file} — a exceção do marco é aditiva: ${line.slice(1).trim()}`);
      continue;
    }
    if (line.startsWith('+')) {
      const body = line.slice(1).trim();
      // O `+` de uma linha adicionada; em -U0 não há linha de contexto para contar.
      if (newLine < start || newLine > end) {
        violations.push(`linha ${newLine} fora do corpo de ${entry.symbol}: ${body}`);
      } else if (marcoLine.test(body)) {
        marcoLines += 1;
      } else if (!isExempt(body)) {
        violations.push(`linha ${newLine} dentro de ${entry.symbol} não é o marco (${entry.marker}): ${body}`);
      }
      newLine += 1;
    }
  }
  // Fail-closed (F5): diff que não contém o marco (só mode-change, só comentário) não é "só o marco".
  if (violations.length === 0 && marcoLines === 0) violations.push(`nenhuma linha do marco (${entry.marker}) no diff de ${entry.file}`);
  return violations;
}

export interface ZeroDiffReport {
  changedFiles: string[];
  perimeterViolations: string[];
  vetoedFileViolations: string[];
  /** Arquivos do perímetro aceitos pela exceção nominal (diff = só o marco do símbolo allowlisted). */
  allowlistedSymbolEdits: string[];
  /** Detalhe por arquivo allowlisted cujo diff foi além do marco. */
  symbolViolations: Record<string, string[]>;
  clean: boolean;
}

/** Função pura — classifica uma lista de paths já obtida (testável sem shell-out a `git`). Sem
 *  `symbolDiffs` para um arquivo allowlisted, o nome do arquivo continua violação (fail-closed). */
export function classifyZeroDiffViolations(
  changedFiles: string[],
  opts: { symbolDiffs?: Record<string, SymbolDiffInput> } = {},
): ZeroDiffReport {
  const files = changedFiles.map(normalize).filter(Boolean);

  const allowlistedSymbolEdits: string[] = [];
  const symbolViolations: Record<string, string[]> = {};
  const perimeterViolations = files.filter((f) => {
    const inPerimeter =
      PERIMETER_PREFIXES.some((prefix) => f === prefix || f.startsWith(prefix)) &&
      !EXPLICITLY_EXEMPT_PREFIXES.some((exempt) => f.startsWith(exempt)) &&
      !f.includes(EXEMPT_PATH_SEGMENT);
    if (!inPerimeter) return false;
    const entry = SYMBOL_ALLOWLIST.find((e) => e.file === f);
    const input = entry && opts.symbolDiffs?.[f];
    if (!entry || !input) return true;
    const v = classifySymbolDiff(input.diff, input.headSource, entry);
    if (v.length === 0) {
      allowlistedSymbolEdits.push(f);
      return false;
    }
    symbolViolations[f] = v;
    return true;
  });
  const vetoedFileViolations = files.filter((f) => (VETOED_SHARED_FILES as readonly string[]).includes(f));

  return {
    changedFiles: files,
    perimeterViolations,
    vetoedFileViolations,
    allowlistedSymbolEdits,
    symbolViolations,
    clean: perimeterViolations.length === 0 && vetoedFileViolations.length === 0,
  };
}

export function parseArgs(argv: string[]): { base: string; head: string } {
  const readFlag = (name: string): string | undefined => {
    const i = argv.indexOf(name);
    return i === -1 ? undefined : argv[i + 1];
  };
  return { base: readFlag('--base') || 'origin/main', head: readFlag('--head') || 'HEAD' };
}

/** Shell-out real a `git diff --name-only` — separado de `classifyZeroDiffViolations` para que o
 *  classificador seja testável sem depender do estado real do repositório do executor. */
export function getChangedFiles(base: string, head: string, repoRoot: string = REPO_ROOT): string[] {
  const out = execFileSync('git', ['diff', '--name-only', `${base}...${head}`], {
    cwd: repoRoot,
    encoding: 'utf8',
  });
  return out.split('\n').map((l) => l.trim()).filter(Boolean);
}

/** Shell-out para os arquivos allowlisted que aparecem no diff: `-U0` (sem contexto, só as linhas
 *  tocadas) + o head do arquivo para localizar o corpo do símbolo. */
export function getSymbolDiffs(
  changedFiles: string[],
  base: string,
  head: string,
  repoRoot: string = REPO_ROOT,
): Record<string, SymbolDiffInput> {
  const out: Record<string, SymbolDiffInput> = {};
  for (const entry of SYMBOL_ALLOWLIST) {
    if (!changedFiles.map(normalize).includes(entry.file)) continue;
    const diff = execFileSync('git', ['diff', '-U0', `${base}...${head}`, '--', entry.file], { cwd: repoRoot, encoding: 'utf8' });
    const headSource = execFileSync('git', ['show', `${head}:${entry.file}`], { cwd: repoRoot, encoding: 'utf8' });
    out[entry.file] = { diff, headSource };
  }
  return out;
}

/** Nunca chama `process.exit` (testável) — devolve o código de saída pretendido. */
export function runCli(argv: string[] = process.argv.slice(2)): number {
  const { base, head } = parseArgs(argv);

  let files: string[];
  let symbolDiffs: Record<string, SymbolDiffInput>;
  try {
    files = getChangedFiles(base, head);
    symbolDiffs = getSymbolDiffs(files, base, head);
  } catch (error) {
    console.error(`erro ao rodar git (diff --name-only / diff -U0 / show) em ${base}...${head}: ${error instanceof Error ? error.message : String(error)}`);
    return 1;
  }

  const report = classifyZeroDiffViolations(files, { symbolDiffs });

  if (report.clean) {
    console.log(
      `OK: zero-diff no perímetro — ${report.changedFiles.length} arquivo(s) alterado(s) entre ` +
        `${base}...${head}, nenhum dentro do perímetro protegido (ADR-P2 §2 item 2).`,
    );
    for (const f of report.allowlistedSymbolEdits) {
      const entry = SYMBOL_ALLOWLIST.find((e) => e.file === f)!;
      console.log(`  exceção nominal (ADR-P2 EMENDA 2026-09-14 R7): ${f} — só o marco ${entry.marker} em ${entry.symbol}`);
    }
    return 0;
  }

  console.error(
    `FALHOU: diff detectado dentro do perímetro zero-diff da prova de saída (ADR-P2 §2 item 2, ` +
      `${base}...${head}) — isso é defeito da prensa, não ajuste. Volta para o P1 como lacuna ` +
      '(sessão de instrumentação → correção).',
  );
  for (const f of report.perimeterViolations) {
    console.error(`  perímetro: ${f}`);
    for (const v of report.symbolViolations[f] ?? []) {
      const entry = SYMBOL_ALLOWLIST.find((e) => e.file === f)!;
      console.error(`    símbolo allowlisted (${entry.symbol}): ${v}`);
    }
  }
  for (const f of report.vetoedFileViolations) console.error(`  arquivo compartilhado vetado (F-P2-5): ${f}`);
  return 1;
}

if (require.main === module) {
  process.exit(runCli());
}

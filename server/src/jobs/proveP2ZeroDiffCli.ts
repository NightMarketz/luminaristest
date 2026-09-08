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

/** Arquivos compartilhados vetados por regra própria (F-P2-5), independente da árvore do motor. */
export const VETOED_SHARED_FILES = [
  'server/src/features/dynamicTables/presets/modules/people/CustomerModule.ts',
] as const;

function normalize(filePath: string): string {
  return filePath.replace(/\\/g, '/').trim();
}

export interface ZeroDiffReport {
  changedFiles: string[];
  perimeterViolations: string[];
  vetoedFileViolations: string[];
  clean: boolean;
}

/** Função pura — classifica uma lista de paths já obtida (testável sem shell-out a `git`). */
export function classifyZeroDiffViolations(changedFiles: string[]): ZeroDiffReport {
  const files = changedFiles.map(normalize).filter(Boolean);

  const perimeterViolations = files.filter(
    (f) =>
      PERIMETER_PREFIXES.some((prefix) => f === prefix || f.startsWith(prefix)) &&
      !EXPLICITLY_EXEMPT_PREFIXES.some((exempt) => f.startsWith(exempt)),
  );
  const vetoedFileViolations = files.filter((f) => (VETOED_SHARED_FILES as readonly string[]).includes(f));

  return {
    changedFiles: files,
    perimeterViolations,
    vetoedFileViolations,
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

/** Nunca chama `process.exit` (testável) — devolve o código de saída pretendido. */
export function runCli(argv: string[] = process.argv.slice(2)): number {
  const { base, head } = parseArgs(argv);

  let files: string[];
  try {
    files = getChangedFiles(base, head);
  } catch (error) {
    console.error(`erro ao rodar 'git diff --name-only ${base}...${head}': ${error instanceof Error ? error.message : String(error)}`);
    return 1;
  }

  const report = classifyZeroDiffViolations(files);

  if (report.clean) {
    console.log(
      `OK: zero-diff no perímetro — ${report.changedFiles.length} arquivo(s) alterado(s) entre ` +
        `${base}...${head}, nenhum dentro do perímetro protegido (ADR-P2 §2 item 2).`,
    );
    return 0;
  }

  console.error(
    `FALHOU: diff detectado dentro do perímetro zero-diff da prova de saída (ADR-P2 §2 item 2, ` +
      `${base}...${head}) — isso é defeito da prensa, não ajuste. Volta para o P1 como lacuna ` +
      '(sessão de instrumentação → correção).',
  );
  for (const f of report.perimeterViolations) console.error(`  perímetro: ${f}`);
  for (const f of report.vetoedFileViolations) console.error(`  arquivo compartilhado vetado (F-P2-5): ${f}`);
  return 1;
}

if (require.main === module) {
  process.exit(runCli());
}

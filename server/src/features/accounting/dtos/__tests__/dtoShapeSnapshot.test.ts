/**
 * GATE DE CONTRATO DA FRONTEIRA — snapshot de shape dos DTOs Zod de accounting.
 *
 * Fase 4 do GAP-MAP (nível 3 · evolução assimétrica: B muda o schema, A continua lendo o
 * antigo, passa no teste e quebra no dado real — foi exatamente o BUG-2 do §5.2, o FE
 * descartando `costOfGoodsSold` que a API passou a devolver). Este gate não impede a mudança;
 * ele a torna IMPOSSÍVEL DE SER SILENCIOSA: qualquer alteração de forma num DTO obriga um
 * diff legível em `__dto-shapes__.json` no MESMO PR, onde o revisor (humano ou não) a vê.
 *
 * COMO: importa TODOS os módulos de `../` (o diretório de DTOs), coleta todo export que é
 * schema Zod e serializa com o `z.toJSONSchema()` nativo do Zod 4 — sem dependência nova,
 * sem walker próprio. `io:'input'` (a fronteira valida entrada) e `unrepresentable:'any'`.
 *
 * DESCOBERTA AUTOMÁTICA DE PROPÓSITO: DTO novo ou export novo REPROVA até entrar no snapshot
 * — a fronteira não cresce em silêncio (a mesma lógica do allowlist-coverage: emitido sem par
 * declarado é defeito de omissão).
 *
 * PARA ATUALIZAR (mudança de forma INTENCIONAL):
 *   UPDATE_DTO_SNAPSHOT=1 npx jest --selectProjects unit --testPathPatterns dtoShapeSnapshot
 * e comite o JSON e os `.gen.ts` juntos — o diff do snapshot É o registro da mudança de contrato.
 *
 * CONTRATO FE GERADO (docs/adr/PRE-ADR-FE-CONTRACT-TYPES.md; plano
 * docs/accounting/PLANO-FE-CONTRACT-TYPES-2026-09-28.md §6): o mesmo JSON vira tipos TS em
 * `my-app/types/contracts/accounting/<Dto>.gen.ts` (json-schema-to-typescript, `<X>Schema` →
 * `<X>Input`). Este teste reprova se o `.gen.ts` comitado divergir do snapshot ou sobrar órfão;
 * o FE tipa o body por esses arquivos, então o `tsc` do my-app morde o lado de lá.
 *
 * LIMITES DECLARADOS:
 * - `.refine`/`.superRefine` não aparecem no JSON Schema (o Zod os pula): a LÓGICA de
 *   validação fina é coberta pelos testes por DTO (`InventoryDto.test.ts` etc.); este gate
 *   cobre a FORMA (chaves, tipos, obrigatoriedade, enums, `.strict()`).
 * - Tipos gerados cobrem o body de entrada; query string e resposta ficam fora (D11 do plano).
 */
import * as fs from 'fs';
import * as path from 'path';
import { z } from 'zod';

// D4 — o prettier 3 faz import() no require (index.cjs) e derruba o processo do Jest (G8).
// Stub resolvido a partir do gerador ANTES do require dele; `import` estático seria içado acima.
const JSTT = require.resolve('json-schema-to-typescript');
const PRETTIER = require.resolve('prettier', { paths: [path.dirname(JSTT)] });
jest.doMock(PRETTIER, () => ({
  format: () => {
    throw new Error('prettier desligado: gerador roda com format:false');
  },
}));
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { compile } = require(JSTT) as typeof import('json-schema-to-typescript');

// 6 níveis: __tests__ → dtos → accounting → features → src → server → raiz do repo.
const GEN_DIR = path.resolve(__dirname, '../../../../../../my-app/types/contracts/accounting');
const BANNER =
  '// GERADO por server/src/features/accounting/dtos/__tests__/dtoShapeSnapshot.test.ts — NÃO EDITE.\n' +
  '// Mudou um DTO? UPDATE_DTO_SNAPSHOT=1 npx jest --selectProjects unit --testPathPatterns dtoShapeSnapshot e comite o diff.\n';
const toTypeName = (n: string) => n.replace(/Schema$/, '') + 'Input';
const genFile = (f: string) => path.join(GEN_DIR, f.replace(/\.ts$/, '.gen.ts'));
const eol = (s: string) => s.replace(/\r\n/g, '\n');

async function render(entry: Record<string, unknown>): Promise<string> {
  let out = BANNER;
  for (const [name, js] of Object.entries(entry)) {
    out += await compile(structuredClone(js) as Parameters<typeof compile>[0], toTypeName(name), {
      bannerComment: '',
      additionalProperties: false,
      format: false,
      // Dono, questionário 28/09: ignora maxItems (sem ele, max ≤ 20 vira união de até 21
      // tuplas) e MANTÉM minItems (`.min(1)` vira `[T, ...T[]]`; o FE monta com `nonEmpty()`).
      maxItems: -1,
    });
  }
  return out;
}

const DTO_DIR = path.resolve(__dirname, '..');
const SNAPSHOT_PATH = path.join(__dirname, '__dto-shapes__.json');

type ShapeMap = Record<string, Record<string, unknown>>;

function collectShapes(): ShapeMap {
  const files = fs
    .readdirSync(DTO_DIR)
    .filter((f) => f.endsWith('.ts') && !f.endsWith('.d.ts'))
    .sort();
  const shapes: ShapeMap = {};
  for (const file of files) {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const mod = require(path.join(DTO_DIR, file)) as Record<string, unknown>;
    const entry: Record<string, unknown> = {};
    for (const [name, value] of Object.entries(mod)) {
      if (value instanceof z.ZodType) {
        entry[name] = z.toJSONSchema(value, { io: 'input', unrepresentable: 'any' });
      }
    }
    if (Object.keys(entry).length > 0) shapes[file] = entry;
  }
  return shapes;
}

// Coleta em escopo de módulo: o `it.each` precisa da lista de arquivos no momento da coleta
// dos testes — e é o nome do teste que carrega o NOME DO ARQUIVO divergente (a primeira versão
// embrulhava o shape em `{ [file]: … }` e o diff do Jest ELIDIA a chave igual dos dois lados:
// vermelho sem endereço — medido na mordida, corrigido aqui).
const atual = collectShapes();
const snapshotExiste = fs.existsSync(SNAPSHOT_PATH);
const snapshot: ShapeMap = snapshotExiste ? (JSON.parse(fs.readFileSync(SNAPSHOT_PATH, 'utf8')) as ShapeMap) : {};
const arquivos = [...new Set([...Object.keys(atual), ...Object.keys(snapshot)])].sort();

if (process.env.UPDATE_DTO_SNAPSHOT === '1') {
  fs.writeFileSync(SNAPSHOT_PATH, JSON.stringify(atual, null, 2) + '\n');
  Object.assign(snapshot, atual);
  for (const k of Object.keys(snapshot)) if (!(k in atual)) delete snapshot[k];
}

// Fonte dos `.gen.ts`: no UPDATE, `atual`; fora dele, o snapshot COMITADO (o `.gen.ts` tem de
// bater com o JSON que o revisor leu, não com o DTO do working tree).
const UPDATE = process.env.UPDATE_DTO_SNAPSHOT === '1';
const fonte: ShapeMap = UPDATE ? atual : snapshot;
const gerado = new Map<string, string>();

beforeAll(async () => {
  for (const f of Object.keys(fonte)) gerado.set(f, await render(fonte[f]));
  if (!UPDATE) return;
  fs.mkdirSync(GEN_DIR, { recursive: true });
  for (const [f, txt] of gerado) fs.writeFileSync(genFile(f), txt);
  const esperados = new Set([...gerado.keys()].map((f) => path.basename(genFile(f))));
  for (const g of fs.readdirSync(GEN_DIR)) {
    if (g.endsWith('.gen.ts') && !esperados.has(g)) fs.rmSync(path.join(GEN_DIR, g));
  }
});

describe('contrato da fronteira — shape dos DTOs Zod de accounting', () => {
  it('o snapshot comitado existe', () => {
    expect(snapshotExiste || process.env.UPDATE_DTO_SNAPSHOT === '1').toBe(true);
  });

  it.each(Object.keys(fonte).sort())('%s: o .gen.ts do FE bate com o snapshot', (file) => {
    const p = genFile(file);
    expect(
      fs.existsSync(p)
        ? eol(fs.readFileSync(p, 'utf8'))
        : 'GEN AUSENTE — rode UPDATE_DTO_SNAPSHOT=1 e comite my-app/types/contracts',
    ).toBe(gerado.get(file));
  });

  it('não há .gen.ts órfão em my-app/types/contracts/accounting', () => {
    const esperados = new Set(Object.keys(fonte).map((f) => path.basename(genFile(f))));
    const orfaos = fs.existsSync(GEN_DIR)
      ? fs.readdirSync(GEN_DIR).filter((g) => g.endsWith('.gen.ts') && !esperados.has(g))
      : [];
    expect(orfaos).toEqual([]);
  });

  it.each(arquivos)('%s bate com o snapshot (mudou de propósito? UPDATE_DTO_SNAPSHOT=1 e comite o diff)', (file) => {
    expect(atual[file] ?? 'ARQUIVO SUMIU DO DIRETÓRIO (remova-o do snapshot no mesmo PR)').toEqual(
      snapshot[file] ?? 'ARQUIVO NOVO SEM SNAPSHOT (rode UPDATE_DTO_SNAPSHOT=1 e comite)',
    );
  });

  it('sanidade do coletor: enxerga uma quantidade plausível de schemas (não é glob vazio)', () => {
    const totalSchemas = Object.values(atual).reduce((n, m) => n + Object.keys(m).length, 0);
    // 21 arquivos de DTO hoje; um coletor quebrado devolvendo 0/poucos é a armadilha do
    // resultado plausível — o piso é deliberadamente folgado para não quebrar por remoção
    // legítima, mas mata o zero silencioso.
    expect(Object.keys(atual).length).toBeGreaterThanOrEqual(15);
    expect(totalSchemas).toBeGreaterThanOrEqual(40);
  });
});

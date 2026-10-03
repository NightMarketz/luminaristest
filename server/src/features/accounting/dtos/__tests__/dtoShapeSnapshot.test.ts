/**
 * GATE DE CONTRATO DA FRONTEIRA — snapshot de shape dos DTOs Zod de TODOS os domínios.
 *
 * Fase 4 do GAP-MAP (nível 3 · evolução assimétrica: B muda o schema, A continua lendo o
 * antigo, passa no teste e quebra no dado real — foi exatamente o BUG-2 do §5.2, o FE
 * descartando `costOfGoodsSold` que a API passou a devolver). Este gate não impede a mudança;
 * ele a torna IMPOSSÍVEL DE SER SILENCIOSA: qualquer alteração de forma num DTO obriga um
 * diff legível em `__dto-shapes__.json` no MESMO PR, onde o revisor (humano ou não) a vê.
 *
 * COMO: para cada `src/features/<domínio>/dtos/`, importa TODOS os módulos do diretório,
 * coleta todo export que é schema Zod e serializa com o `z.toJSONSchema()` nativo do Zod 4 —
 * sem dependência nova, sem walker próprio. `io:'input'` (a fronteira valida entrada) e
 * `unrepresentable:'any'`. O JSON de cada domínio mora em
 * `features/<domínio>/dtos/__tests__/__dto-shapes__.json` (o teste fica aqui, no caminho que o
 * GAP-MAP cita; o do contábil é o JSON histórico, inalterado).
 *
 * DESCOBERTA AUTOMÁTICA DE PROPÓSITO: DTO novo, export novo ou DOMÍNIO novo REPROVA até entrar
 * no snapshot — a fronteira não cresce em silêncio (a mesma lógica do allowlist-coverage: emitido
 * sem par declarado é defeito de omissão). Piso: todo domínio com `dtos/` tem ≥ 1 schema.
 *
 * PARA ATUALIZAR (mudança de forma INTENCIONAL):
 *   UPDATE_DTO_SNAPSHOT=1 npx jest --selectProjects unit --testPathPatterns dtoShapeSnapshot
 * e comite os JSON e os `.gen.ts` juntos — o diff do snapshot É o registro da mudança de contrato.
 *
 * CONTRATO FE GERADO (docs/adr/PRE-ADR-FE-CONTRACT-TYPES.md; plano
 * docs/accounting/PLANO-FE-CONTRACT-TYPES-2026-09-28.md §6 e §8): o mesmo JSON vira tipos TS em
 * `my-app/types/contracts/<domínio>/<Dto>.gen.ts` (json-schema-to-typescript, `<X>Schema` →
 * `<X>Input`). Este teste reprova se um `.gen.ts` comitado divergir do snapshot ou sobrar órfão;
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

// __tests__ → dtos → accounting → features.
const FEATURES_DIR = path.resolve(__dirname, '../../..');
// 6 níveis: __tests__ → dtos → accounting → features → src → server → raiz do repo.
const CONTRACTS_DIR = path.resolve(__dirname, '../../../../../../my-app/types/contracts');
const BANNER =
  '// GERADO por server/src/features/accounting/dtos/__tests__/dtoShapeSnapshot.test.ts — NÃO EDITE.\n' +
  '// Mudou um DTO? UPDATE_DTO_SNAPSHOT=1 npx jest --selectProjects unit --testPathPatterns dtoShapeSnapshot e comite o diff.\n';
const toTypeName = (n: string) => n.replace(/Schema$/, '') + 'Input';
const eol = (s: string) => s.replace(/\r\n/g, '\n');
const UPDATE = process.env.UPDATE_DTO_SNAPSHOT === '1';

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

type ShapeMap = Record<string, Record<string, unknown>>;

function collectShapes(dtoDir: string): ShapeMap {
  const files = fs
    .readdirSync(dtoDir)
    .filter((f) => f.endsWith('.ts') && !f.endsWith('.d.ts'))
    .sort();
  const shapes: ShapeMap = {};
  for (const file of files) {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const mod = require(path.join(dtoDir, file)) as Record<string, unknown>;
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

interface Dominio {
  nome: string;
  genDir: string;
  snapshotPath: string;
  atual: ShapeMap;
  snapshot: ShapeMap;
  snapshotExiste: boolean;
  /** Fonte dos `.gen.ts`: no UPDATE, `atual`; fora dele, o snapshot COMITADO (o `.gen.ts` tem de
   * bater com o JSON que o revisor leu, não com o DTO do working tree). */
  fonte: ShapeMap;
  arquivos: string[];
  gerado: Map<string, string>;
}

// Coleta em escopo de módulo: o `it.each` precisa da lista de arquivos no momento da coleta
// dos testes — e é o nome do teste que carrega o NOME DO ARQUIVO divergente (a primeira versão
// embrulhava o shape em `{ [file]: … }` e o diff do Jest ELIDIA a chave igual dos dois lados:
// vermelho sem endereço — medido na mordida, corrigido aqui).
const dominios: Dominio[] = fs
  .readdirSync(FEATURES_DIR, { withFileTypes: true })
  .filter((d) => d.isDirectory() && fs.existsSync(path.join(FEATURES_DIR, d.name, 'dtos')))
  .map((d) => d.name)
  .sort()
  .map((nome) => {
    const dtoDir = path.join(FEATURES_DIR, nome, 'dtos');
    const snapshotPath = path.join(dtoDir, '__tests__', '__dto-shapes__.json');
    const atual = collectShapes(dtoDir);
    const snapshotExiste = fs.existsSync(snapshotPath);
    const snapshot: ShapeMap = snapshotExiste ? (JSON.parse(fs.readFileSync(snapshotPath, 'utf8')) as ShapeMap) : {};
    const arquivos = [...new Set([...Object.keys(atual), ...Object.keys(snapshot)])].sort();
    if (UPDATE) {
      fs.mkdirSync(path.dirname(snapshotPath), { recursive: true });
      fs.writeFileSync(snapshotPath, JSON.stringify(atual, null, 2) + '\n');
    }
    return {
      nome,
      genDir: path.join(CONTRACTS_DIR, nome),
      snapshotPath,
      atual,
      snapshot: UPDATE ? atual : snapshot,
      snapshotExiste,
      fonte: UPDATE ? atual : snapshot,
      arquivos,
      gerado: new Map<string, string>(),
    };
  });

const genFile = (d: Dominio, f: string) => path.join(d.genDir, f.replace(/\.ts$/, '.gen.ts'));
/** Todo `.gen.ts` esperado em `my-app/types/contracts`, como caminho relativo `<domínio>/<arquivo>`. */
const esperadosGlobais = new Set(
  dominios.flatMap((d) => Object.keys(d.fonte).map((f) => `${d.nome}/${path.basename(genFile(d, f))}`)),
);
const genExistentes = (): string[] =>
  fs.existsSync(CONTRACTS_DIR)
    ? fs
        .readdirSync(CONTRACTS_DIR, { withFileTypes: true })
        .filter((e) => e.isDirectory())
        .flatMap((e) =>
          fs
            .readdirSync(path.join(CONTRACTS_DIR, e.name))
            .filter((g) => g.endsWith('.gen.ts'))
            .map((g) => `${e.name}/${g}`),
        )
    : [];

beforeAll(() => {
  if (!UPDATE) return;
  for (const rel of genExistentes()) {
    if (!esperadosGlobais.has(rel)) fs.rmSync(path.join(CONTRACTS_DIR, rel));
  }
});

for (const d of dominios) {
  describe(`contrato da fronteira — shape dos DTOs Zod de ${d.nome}`, () => {
    beforeAll(async () => {
      for (const f of Object.keys(d.fonte)) d.gerado.set(f, await render(d.fonte[f]));
      if (!UPDATE) return;
      fs.mkdirSync(d.genDir, { recursive: true });
      for (const [f, txt] of d.gerado) fs.writeFileSync(genFile(d, f), txt);
    });

    it('o snapshot comitado existe', () => {
      expect(d.snapshotExiste || UPDATE).toBe(true);
    });

    it('o domínio tem ao menos 1 schema Zod (piso: coletor vazio é a armadilha do resultado plausível)', () => {
      expect(Object.values(d.atual).reduce((n, m) => n + Object.keys(m).length, 0)).toBeGreaterThanOrEqual(1);
    });

    it.each(Object.keys(d.fonte).sort())('%s: o .gen.ts do FE bate com o snapshot', (file) => {
      const p = genFile(d, file);
      expect(
        fs.existsSync(p)
          ? eol(fs.readFileSync(p, 'utf8'))
          : 'GEN AUSENTE — rode UPDATE_DTO_SNAPSHOT=1 e comite my-app/types/contracts',
      ).toBe(d.gerado.get(file));
    });

    it(`não há .gen.ts órfão em my-app/types/contracts/${d.nome}`, () => {
      const esperados = new Set(Object.keys(d.fonte).map((f) => path.basename(genFile(d, f))));
      const orfaos = fs.existsSync(d.genDir)
        ? fs.readdirSync(d.genDir).filter((g) => g.endsWith('.gen.ts') && !esperados.has(g))
        : [];
      expect(orfaos).toEqual([]);
    });

    it.each(d.arquivos)('%s bate com o snapshot (mudou de propósito? UPDATE_DTO_SNAPSHOT=1 e comite o diff)', (file) => {
      expect(d.atual[file] ?? 'ARQUIVO SUMIU DO DIRETÓRIO (remova-o do snapshot no mesmo PR)').toEqual(
        d.snapshot[file] ?? 'ARQUIVO NOVO SEM SNAPSHOT (rode UPDATE_DTO_SNAPSHOT=1 e comite)',
      );
    });
  });
}

describe('contrato da fronteira — varredura de todos os domínios', () => {
  it('não há pasta de contrato sem domínio (domínio removido deixa .gen.ts órfão)', () => {
    const orfaos = genExistentes().filter((rel) => !esperadosGlobais.has(rel));
    expect(orfaos).toEqual([]);
  });

  it('sanidade do coletor: enxerga uma quantidade plausível de domínios e schemas (não é glob vazio)', () => {
    const contabil = dominios.find((d) => d.nome === 'accounting');
    const totalSchemas = Object.values(contabil?.atual ?? {}).reduce((n, m) => n + Object.keys(m).length, 0);
    // 21 arquivos de DTO contábeis hoje; um coletor quebrado devolvendo 0/poucos é a armadilha
    // do resultado plausível — o piso é deliberadamente folgado para não quebrar por remoção
    // legítima, mas mata o zero silencioso.
    expect(Object.keys(contabil?.atual ?? {}).length).toBeGreaterThanOrEqual(15);
    expect(totalSchemas).toBeGreaterThanOrEqual(40);
    // 17 domínios com `dtos/` hoje (G7 do plano); piso folgado.
    expect(dominios.length).toBeGreaterThanOrEqual(10);
  });
});

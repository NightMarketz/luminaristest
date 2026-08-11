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
 *   UPDATE_DTO_SNAPSHOT=1 npx jest --selectProjects unit dtoShapeSnapshot
 * e comite o JSON junto — o diff do snapshot É o registro da mudança de contrato.
 *
 * LIMITES DECLARADOS:
 * - `.refine`/`.superRefine` não aparecem no JSON Schema (o Zod os pula): a LÓGICA de
 *   validação fina é coberta pelos testes por DTO (`InventoryDto.test.ts` etc.); este gate
 *   cobre a FORMA (chaves, tipos, obrigatoriedade, enums, `.strict()`).
 * - Só o lado servidor. O espelho FE (`my-app/lib/services/*.ts`) é tipo TS à mão — comparar
 *   os dois exige codegen e está fora (resíduo anotado no GAP-MAP).
 */
import * as fs from 'fs';
import * as path from 'path';
import { z } from 'zod';

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

describe('contrato da fronteira — shape dos DTOs Zod de accounting', () => {
  it('o snapshot comitado existe', () => {
    expect(snapshotExiste || process.env.UPDATE_DTO_SNAPSHOT === '1').toBe(true);
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

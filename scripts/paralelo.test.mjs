// node --test scripts/paralelo.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { globToRegex, parseChokePoints, expandir, planejar } from './paralelo.mjs';

const files = [
  'server/src/lib/factory.ts',
  'server/src/routes/docs.paths.ts',
  'server/prisma/schema.prisma',
  'server/src/features/a/services/A.ts',
  'server/src/features/a/services/A2.ts',
  'server/src/features/b/services/B.ts',
  'server/src/controllers/shared.ts',
];
const chokes = ['server/src/lib/factory.ts', 'server/src/routes/docs.paths.ts', 'server/prisma/schema.prisma'];
const no = (id, write_set, extra = {}) => ({ id, estado: 'ready', write_set, ...extra });

test('glob: ** atravessa pastas, * não', () => {
  assert.ok(globToRegex('server/src/features/a/**').test('server/src/features/a/services/A.ts'));
  assert.ok(globToRegex('server/**/A.ts').test('server/src/features/a/services/A.ts'));
  assert.ok(!globToRegex('server/src/features/*/A.ts').test('server/src/features/a/services/A.ts'));
  assert.deepEqual([...expandir(['server/src/features/a/**', 'server/src/novo.ts'], files)].sort(),
    ['server/src/features/a/services/A.ts', 'server/src/features/a/services/A2.ts', 'server/src/novo.ts']);
});

test('disjuntos rodam na mesma onda; choke point vai para a Fase B e não gera conflito', () => {
  const p = planejar({ files, chokes, nos: [
    no('A', ['server/src/features/a/**', 'server/src/lib/factory.ts']),
    no('B', ['server/src/features/b/**', 'server/src/lib/factory.ts']),
  ] });
  assert.deepEqual(p.ondas, [['A', 'B']]);
  assert.deepEqual(p.conflitos, []);
  assert.deepEqual(p.faseB['server/src/lib/factory.ts'], ['A', 'B']);
});

test('arquivo comum fora dos choke points → conflito com o arquivo citado e ondas separadas', () => {
  const p = planejar({ files, chokes, nos: [
    no('A', ['server/src/features/a/**', 'server/src/controllers/shared.ts']),
    no('B', ['server/src/features/b/**', 'server/src/controllers/shared.ts']),
    no('C', ['server/src/novo-c.ts']),
  ] });
  assert.deepEqual(p.conflitos, [{ a: 'A', b: 'B', arquivos: ['server/src/controllers/shared.ts'] }]);
  assert.equal(p.ondas.length, 2);
  assert.ok(p.ondas[0].includes('C'));
});

test('arquivo NOVO de um lado coberto por glob do outro também é conflito', () => {
  const p = planejar({ files, chokes, nos: [no('A', ['server/src/features/a/**']), no('B', ['server/src/features/a/services/Novo.ts'])] });
  assert.deepEqual(p.conflitos[0].arquivos, ['server/src/features/a/services/Novo.ts']);
});

test('schema vai para a Fase 0; sem write_set fica serial; dependência no lote vem antes', () => {
  const p = planejar({ files, chokes, nos: [
    no('A', ['server/src/features/a/**', 'server/prisma/schema.prisma']),
    no('B', ['server/src/features/b/**'], { depende_de: ['[[A]]'] }),
    no('Z', undefined),
  ] });
  assert.deepEqual(p.fase0, ['A']);
  assert.deepEqual(p.semWriteSet, ['Z']);
  assert.deepEqual(p.ondas, [['A'], ['B']]);
});

test('dependência fora do lote: aberta é avisada, fechada não', () => {
  const todos = new Map([['X', { estado: 'ready' }], ['Y', { estado: 'done' }]]);
  const p = planejar({ files, chokes, todos, nos: [no('A', ['server/src/a.ts'], { depende_de: ['[[X]]', '[[Y]]'] })] });
  assert.deepEqual(p.depAberta, [{ id: 'A', dep: 'X' }]);
});

test('PR aberto que cruza o write-set bloqueia; o PR do próprio nó (prs) não', () => {
  const prs = [{ number: 9, files: ['server/src/controllers/shared.ts', 'server/src/lib/factory.ts'] }, { number: 7, files: ['server/src/features/a/services/A.ts'] }];
  const p = planejar({ files, chokes, prs, nos: [no('A', ['server/src/features/a/**', 'server/src/controllers/shared.ts'], { prs: ['#7'] })] });
  assert.deepEqual(p.bloqueados, [{ id: 'A', pr: 9, arquivos: ['server/src/controllers/shared.ts'] }]);
});

test('PAR-001 real: lista lida do contrato, sem o i18n por domínio, com o openapi que existe', () => {
  const c = parseChokePoints(readFileSync(new URL('../.claude/skills/_PARALLELIZATION-CONTRACT.md', import.meta.url), 'utf8'));
  for (const f of ['server/src/lib/factory.ts', 'server/src/routes/docs.paths.ts', 'server/prisma/schema.prisma', 'server/public/openapi.json']) assert.ok(c.includes(f), `${f} ∉ ${c.join(', ')}`);
  assert.ok(!c.some((x) => x.includes('locales')));
});

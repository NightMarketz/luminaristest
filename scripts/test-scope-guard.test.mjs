// node --test scripts/test-scope-guard.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const { decide, guardFullSuite } = createRequire(import.meta.url)('./test-scope-guard.cjs');
const local = {};

test('jest sem caminho é recusado fora do CI (unit e integração)', () => {
  assert.match(decide({ runner: 'jest', args: ['--selectProjects', 'unit', '--forceExit'], env: local }), /bloqueada/);
  assert.match(
    decide({ runner: 'jest', args: ['--selectProjects', 'integration', '--runInBand', '--shard=1/4'], env: local }),
    /bloqueada/,
  );
  assert.match(decide({ runner: 'jest', args: ['--maxWorkers', '2', '-t', 'estorno'], env: local }), /bloqueada/);
});

test('caminho logo depois do --selectProjects é engolido (roda tudo): recusa até no CI', () => {
  const p = 'src/features/accounting/services/__tests__/PostingService.test.ts';
  for (const env of [local, { CI: 'true' }, { FULL_SUITE: '1' }]) {
    assert.match(decide({ runner: 'jest', args: ['--selectProjects', 'unit', p], env }), /virou nome de projeto/);
    assert.match(decide({ runner: 'jest', args: ['--selectProjects=unit', p], env }), /Ponha o caminho antes/);
  }
  assert.equal(decide({ runner: 'jest', args: ['--selectProjects', 'unit', 'integration'], env: { CI: 'true' } }), null);
});

test('jest com escopo passa', () => {
  for (const args of [
    ['src/features/accounting/services/__tests__/PostingService.test.ts', '--selectProjects', 'unit'],
    ['--selectProjects', 'unit', '--maxWorkers=2', 'src/x.test.ts'],
    ['--selectProjects', 'integration', '--runInBand', 'itg2000HistoricoRetificacao'],
    ['--selectProjects', 'unit', '--testPathPatterns', 'dtoShapeSnapshot'],
    ['--selectProjects', 'unit', '--listTests'],
    ['--findRelatedTests', 'src/x.ts'],
    ['--changedSince=origin/main'],
  ]) assert.equal(decide({ runner: 'jest', args, env: local }), null, args.join(' '));
});

test('CI ou FULL_SUITE=1 liberam a suíte inteira', () => {
  const args = ['--selectProjects', 'unit'];
  assert.equal(decide({ runner: 'jest', args, env: { CI: 'true' } }), null);
  assert.equal(decide({ runner: 'jest', args, env: { FULL_SUITE: '1' } }), null);
  assert.match(decide({ runner: 'jest', args, env: { FULL_SUITE: '0' } }), /bloqueada/);
});

test('vitest: run sem filtro recusa; com filtro, related ou --changed passa', () => {
  assert.match(decide({ runner: 'vitest', args: ['run'], env: local }), /bloqueada/);
  assert.match(decide({ runner: 'vitest', args: ['run', '--maxWorkers=2'], env: local }), /bloqueada/);
  assert.equal(decide({ runner: 'vitest', args: ['run', 'features/accounting'], env: local }), null);
  assert.equal(decide({ runner: 'vitest', args: ['related', 'lib/x.ts'], env: local }), null);
  assert.equal(decide({ runner: 'vitest', args: ['run', '--changed'], env: local }), null);
  assert.equal(decide({ runner: 'vitest', args: ['run'], env: { CI: 'true' } }), null);
});

test('guard só age no CLI: worker e chamada programática passam', () => {
  const jestCli = ['node', 'C:\\repo\\server\\node_modules\\jest\\bin\\jest.js', '--selectProjects', 'unit'];
  assert.throws(() => guardFullSuite('jest', jestCli, {}), /bloqueada/);
  assert.doesNotThrow(() => guardFullSuite('jest', jestCli, { JEST_WORKER_ID: '1' }));
  assert.doesNotThrow(() => guardFullSuite('jest', ['node', '/repo/node_modules/@stryker-mutator/core/bin/stryker.js'], {}));
  assert.throws(() => guardFullSuite('vitest', ['node', '/repo/my-app/node_modules/vitest/vitest.mjs', 'run'], {}), /bloqueada/);
});

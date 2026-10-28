// node --test scripts/classe-risco.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { classificar, bumpMajor } from './classe-risco.mjs';

test('FE não fiscal, doc de nó e teste são verdes', () => {
  const r = classificar({ arquivos: ['my-app/features/crm/Kanban.tsx', 'docs/plano/nos/W3.md', 'server/src/features/crm/__tests__/x.test.ts'] });
  assert.equal(r.classe, 'verde');
  assert.deepEqual(r.motivos, []);
});

test('um arquivo contábil basta para o PR inteiro ser vermelho', () => {
  const r = classificar({ arquivos: ['my-app/features/crm/Kanban.tsx', 'server/src/features/accounting/services/ReinfService.ts'] });
  assert.equal(r.classe, 'vermelho');
  assert.match(r.motivos[0], /contábil/);
});

test('schema, auth, CLAUDE.md aninhado, cédula e gate são vermelhos', () => {
  for (const f of ['server/prisma/schema.prisma', 'server/src/middleware/auth.ts', 'my-app/CLAUDE.md',
    'docs/plano/decisoes/D-x.md', 'docs/plano/gates/H1.md', '.github/workflows/ci.yml']) {
    assert.equal(classificar({ arquivos: [f] }).classe, 'vermelho', f);
  }
});

test('dependência: major é vermelho, minor/patch e grupo são verdes', () => {
  assert.ok(bumpMajor('chore(deps): Bump openai from 4.104.0 to 7.43.0 in /server'));
  assert.ok(!bumpMajor('chore(deps): Bump zod from 4.1.0 to 4.3.2 in /server'));
  assert.ok(!bumpMajor('chore(deps): Bump the server-minor-patch group in /server with 24 updates'));
  assert.equal(classificar({ arquivos: ['server/package.json'], titulo: 'Bump uuid from 11.1.0 to 14.0.3' }).classe, 'vermelho');
});

test('draft, "não mergear" no título e lista vazia são vermelhos', () => {
  assert.equal(classificar({ arquivos: ['my-app/a.tsx'], draft: true }).classe, 'vermelho');
  assert.equal(classificar({ arquivos: ['my-app/a.tsx'], titulo: 'fix(kanban): x — não mergear sem OK' }).classe, 'vermelho');
  assert.equal(classificar({ arquivos: [] }).classe, 'vermelho');
});

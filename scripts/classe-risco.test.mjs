// node --test scripts/classe-risco.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { classificar, bumpMajor, majorsNoDiff } from './classe-risco.mjs';

// Recorte do diff real do #952 (express 4→5 num PR de várias dependências, título sem versão).
const DIFF_952 = [
  'diff --git a/package-lock.json b/package-lock.json',
  '--- a/package-lock.json',
  '+++ b/package-lock.json',
  '-        "express": "^4.18.2",',
  '+        "express": "^5.3.0",',
  'diff --git a/server/package.json b/server/package.json',
  '--- a/server/package.json',
  '+++ b/server/package.json',
  '@@ -40,7 +40,7 @@',
  '-    "express": "^4.18.2",',
  '+    "express": "^5.3.0",',
  '@@ -90,7 +90,7 @@',
  '-    "@types/express": "^4.17.21",',
  '+    "@types/express": "^5.0.6",',
].join('\n');
const TITULO_952 = 'chore(deps): Bump express and @types/express in /server';

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

test('fiscal fora de features/accounting é vermelho: os arquivos do #1017, #908 e #1012', () => {
  for (const f of ['server/src/controllers/spedController.ts',
    'server/src/controllers/__tests__/accountingContactController.integration.test.ts',
    'server/src/lib/mit.ts', 'server/src/lib/__tests__/mit.test.ts', 'server/src/lib/sped.ts',
    'server/src/lib/reinf/xsd/README.md', 'server/src/features/sales/models/fiscalGuard.ts',
    'server/src/jobs/AccountingSyncScheduler.ts', 'my-app/lib/services/accounting.service.ts',
    'scripts/classe-risco.mjs', 'scripts/paralelo.mjs']) {
    assert.equal(classificar({ arquivos: [f] }).classe, 'vermelho', f);
  }
});

test('vizinho não fiscal continua verde: controller, rota, lib e serviço FE de CRM', () => {
  const r = classificar({ arquivos: ['server/src/controllers/crmController.ts', 'server/src/routes/crm.ts',
    'server/src/lib/logger.ts', 'my-app/lib/services/crm.service.ts', 'server/src/routes/docs/accounting.sped.paths.ts'] });
  assert.equal(r.classe, 'verde', r.motivos.join('; '));
});

test('dependência: major é vermelho, minor/patch e grupo são verdes', () => {
  assert.ok(bumpMajor('chore(deps): Bump openai from 4.104.0 to 7.43.0 in /server'));
  assert.ok(!bumpMajor('chore(deps): Bump zod from 4.1.0 to 4.3.2 in /server'));
  assert.ok(!bumpMajor('chore(deps): Bump the server-minor-patch group in /server with 24 updates'));
  assert.equal(classificar({ arquivos: ['server/package.json'], titulo: 'Bump uuid from 11.1.0 to 14.0.3' }).classe, 'vermelho');
});

test('#952: major sem versão no título é vermelho pelo diff do package.json, com revisor', () => {
  assert.ok(!bumpMajor(TITULO_952)); // o título sozinho deixava passar
  assert.deepEqual(majorsNoDiff(DIFF_952), [
    'express ^4.18.2 → ^5.3.0 (server/package.json)',
    '@types/express ^4.17.21 → ^5.0.6 (server/package.json)',
  ]);
  const r = classificar({ arquivos: ['package-lock.json', 'server/package.json'], titulo: TITULO_952, diff: DIFF_952 });
  assert.equal(r.classe, 'vermelho');
  assert.equal(r.revisor, true);
});

test('diff de grupo minor-patch continua verde; lockfile, script e versão do pacote não contam', () => {
  const diff = [
    'diff --git a/my-app/package.json b/my-app/package.json',
    '-    "version": "1.4.0",', '+    "version": "2.0.0",',
    '-    "build": "next build",', '+    "build": "next build --turbo",',
    '-    "zod": "^4.1.0",', '+    "zod": "^4.3.2",',
    '-    "react": "~19.0.1",', '+    "react": "~19.3.1",',
    'diff --git a/package-lock.json b/package-lock.json',
    '-      "version": "4.18.2",', '+      "version": "5.3.0",',
    '-        "express": "^4.18.2",', '+        "express": "^5.3.0",',
  ].join('\n');
  assert.deepEqual(majorsNoDiff(diff), []);
  const r = classificar({ arquivos: ['my-app/package.json', 'package-lock.json'],
    titulo: 'chore(deps): Bump the npm-minor-patch group with 6 updates', diff });
  assert.equal(r.classe, 'verde', r.motivos.join('; '));
});

test('0.x: a minor conta como major; spec que não é versão é ignorado', () => {
  assert.deepEqual(majorsNoDiff('diff --git a/package.json b/package.json\n-  "x": "^0.3.1",\n+  "x": "^0.4.0",'),
    ['x ^0.3.1 → ^0.4.0 (package.json)']);
  assert.deepEqual(majorsNoDiff('diff --git a/package.json b/package.json\n-  "y": "workspace:*",\n+  "y": "^2.0.0",\n'
    + '-  "z": "github:a/b",\n+  "z": "github:a/c",'), []);
  assert.deepEqual(majorsNoDiff('diff --git a/package.json b/package.json\n-  "w": ">=4.8.4 <6.1.0",\n+  "w": ">=7.0.0",'),
    ['w >=4.8.4 <6.1.0 → >=7.0.0 (package.json)']);
});

test('package.json cujo diff não pôde ser lido é vermelho (em dúvida, vermelho); sem package.json não importa', () => {
  const r = classificar({ arquivos: ['server/package.json'], titulo: TITULO_952, diff: null });
  assert.equal(r.classe, 'vermelho');
  assert.equal(r.revisor, true);
  assert.equal(classificar({ arquivos: ['my-app/a.tsx'], diff: null }).classe, 'verde');
});

test('draft, "não mergear" no título e lista vazia são vermelhos', () => {
  assert.equal(classificar({ arquivos: ['my-app/a.tsx'], draft: true }).classe, 'vermelho');
  assert.equal(classificar({ arquivos: ['my-app/a.tsx'], titulo: 'fix(kanban): x — não mergear sem OK' }).classe, 'vermelho');
  assert.equal(classificar({ arquivos: [] }).classe, 'vermelho');
});

// D-2026-11-06-REVISAO-CONVERGENCIA: o revisor-independente é obrigatório só no vermelho de código.
test('vermelho só de texto (.md: cédula, ADR, CLAUDE.md, agente, skill) não exige revisor', () => {
  const r = classificar({ arquivos: ['docs/plano/decisoes/D-x.md', 'docs/adr/ADR-x.md', 'CLAUDE.md',
    '.claude/agents/revisor-independente.md', '.claude/skills/x/SKILL.md', 'docs/plano/nos/W3.md'] });
  assert.equal(r.classe, 'vermelho');
  assert.equal(r.revisor, false);
});

test('um arquivo vermelho de código basta para exigir revisor', () => {
  for (const f of ['server/src/features/accounting/services/ReinfService.ts', 'server/prisma/schema.prisma',
    '.github/workflows/ci.yml', '.claude/settings.json', 'scripts/classe-risco.mjs']) {
    const r = classificar({ arquivos: ['docs/plano/decisoes/D-x.md', f] });
    assert.equal(r.revisor, true, f);
  }
});

test('dependência major e lista vazia exigem revisor; verde e draft de texto não', () => {
  assert.equal(classificar({ arquivos: ['package.json'], titulo: 'Bump x from 4.1.0 to 7.0.0' }).revisor, true);
  assert.equal(classificar({ arquivos: [] }).revisor, true);
  assert.equal(classificar({ arquivos: ['my-app/features/crm/Kanban.tsx'] }).revisor, false);
  assert.equal(classificar({ arquivos: ['docs/plano/decisoes/D-x.md'], draft: true }).revisor, false);
});

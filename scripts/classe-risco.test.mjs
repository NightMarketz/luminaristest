// node --test scripts/classe-risco.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { classificar, bumpMajor, compararPackageJson, arquivoAusente } from './classe-risco.mjs';

const pj = (obj) => JSON.stringify(obj, null, 2);
// O #952: express 4→5 num PR de várias dependências, título sem versão.
const ANTES_952 = pj({ name: 'server', version: '1.0.0', dependencies: { express: '^4.18.2', zod: '^4.1.0' },
  devDependencies: { '@types/express': '^4.17.21' } });
const DEPOIS_952 = pj({ name: 'server', version: '1.0.0', dependencies: { express: '^5.3.0', zod: '^4.1.0' },
  devDependencies: { '@types/express': '^5.0.6' } });
const TITULO_952 = 'chore(deps): Bump express and @types/express in /server';
const um = (antes, depois, arquivo = 'package.json') => compararPackageJson(pj(antes), pj(depois), arquivo);

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

test('#952: major sem versão no título é vermelho pelo package.json da base × PR, com revisor', () => {
  assert.ok(!bumpMajor(TITULO_952)); // o título sozinho deixava passar
  assert.deepEqual(compararPackageJson(ANTES_952, DEPOIS_952, 'server/package.json'), {
    majors: ['express ^4.18.2 → ^5.3.0 (server/package.json)', '@types/express ^4.17.21 → ^5.0.6 (server/package.json)'],
    duvidas: [],
  });
  const r = classificar({ arquivos: ['package-lock.json', 'server/package.json'], titulo: TITULO_952,
    pacotes: [{ arquivo: 'server/package.json', antes: ANTES_952, depois: DEPOIS_952 }] });
  assert.equal(r.classe, 'vermelho');
  assert.equal(r.revisor, true);
});

test('grupo minor-patch continua verde; scripts, "version" e dependência nova ou retirada não contam', () => {
  const r = um(
    { version: '1.4.0', scripts: { build: 'tsc' }, dependencies: { zod: '^4.1.0', react: '~19.0.1', velho: '^1.0.0' } },
    { version: '2.0.0', scripts: { build: 'tsc && tsc-alias' }, dependencies: { zod: '^4.3.2', react: '~19.3.1', novo: '^9.0.0' } },
  );
  assert.deepEqual(r, { majors: [], duvidas: [] });
  const c = classificar({ arquivos: ['my-app/package.json', 'package-lock.json'],
    titulo: 'chore(deps): Bump the npm-minor-patch group with 6 updates',
    pacotes: [{ arquivo: 'my-app/package.json', antes: pj({ dependencies: { zod: '^4.1.0' } }),
      depois: pj({ dependencies: { zod: '^4.3.2' } }) }] });
  assert.equal(c.classe, 'verde', c.motivos.join('; '));
});

test('0.x: a minor conta como major; faixa e "||" usam a maior versão admitida', () => {
  assert.deepEqual(um({ dependencies: { x: '^0.3.1' } }, { dependencies: { x: '^0.4.0' } }).majors, ['x ^0.3.1 → ^0.4.0 (package.json)']);
  assert.equal(um({ dependencies: { w: '>=4.8.4 <6.1.0' } }, { dependencies: { w: '>=4.8.4 <7.1.0' } }).majors.length, 1);
  assert.equal(um({ dependencies: { e: '^8.0.0' } }, { dependencies: { e: '^8.0.0 || ^9.0.0' } }).majors.length, 1);
  assert.equal(um({ dependencies: { e: '^8.0.0' } }, { dependencies: { e: '^8.1.0 || ^8.2.0' } }).majors.length, 0);
  assert.equal(um({ dependencies: { a: 'npm:lodash-es@^4.17.0' } }, { dependencies: { a: 'npm:lodash-es@^5.0.0' } }).majors.length, 1);
});

// Rodando nos PRs reais (#1292, #943): "5.1.7" lido como 5.1 e 7 fazia patch virar major.
test('patch, versão exata e pré-release na mesma major não são major', () => {
  for (const [de, para] of [['^5.1.6', '^5.1.7'], ['5.1.7', '^5.1.6'], ['^6.1.18', '^6.1.22'], ['10.1.1', '10.2.0'],
    ['2.0.0-beta.1', '2.0.0'], ['^1.2.3+build.5', '^1.4.0']]) {
    assert.deepEqual(um({ dependencies: { p: de } }, { dependencies: { p: para } }), { majors: [], duvidas: [] }, `${de} → ${para}`);
  }
  assert.equal(um({ dependencies: { p: '1.9.9-rc.1' } }, { dependencies: { p: '2.0.0-rc.1' } }).majors.length, 1);
});

// Revisão do #1310, rodada 2 (A2): spec aberto para cima admite qualquer major futura.
test('spec sem teto (">=", ">", "|| >=") é dúvida → vermelho; faixa com teto continua lida', () => {
  for (const [de, para] of [['^4.0.0', '>=4.0.0'], ['^4.0.0', '>4.0.0'], ['^4.0.0', '^4.0.0 || >=4.2.0'], ['4.x', '4.x.x || >=4']]) {
    assert.equal(um({ dependencies: { p: de } }, { dependencies: { p: para } }).duvidas.length, 1, `${de} → ${para}`);
  }
  assert.deepEqual(um({ dependencies: { p: '>=4.8.4 <6.1.0' } }, { dependencies: { p: '>=4.9.0 <6.1.0' } }),
    { majors: [], duvidas: [] });
});

// Rodada 2 (A3): "No commit found for the ref" também é HTTP 404, mas não é arquivo ausente.
test('só "Not Found" é arquivo ausente; ref que não resolve é erro', () => {
  assert.ok(arquivoAusente('{"message":"Not Found"}gh: Not Found (HTTP 404)\n'));
  assert.ok(!arquivoAusente('gh: No commit found for the ref deadbeef (HTTP 404)\n'));
  assert.ok(!arquivoAusente('gh: Bad credentials (HTTP 401)'));
  assert.ok(!arquivoAusente(undefined));
});

// Revisão do #1310, rodada 1 (A1): spec trocado que a régua não lê não pode virar verde em silêncio.
test('spec trocado ilegível é dúvida → vermelho: "*", tag, alias, git, workspace', () => {
  for (const [de, para] of [['4.x', '*'], ['^4.0.0', 'latest'], ['^4.17.0', 'npm:lodash-es@^5.0.0'],
    ['github:a/b', 'github:a/c'], ['workspace:*', '^2.0.0']]) {
    const r = um({ dependencies: { p: de } }, { dependencies: { p: para } });
    if (de === '^4.17.0') assert.equal(r.majors.length, 1, `${de} → ${para}`); // alias legível: 4 → 5
    else assert.equal(r.duvidas.length, 1, `${de} → ${para}`);
    const c = classificar({ arquivos: ['package.json'], pacotes: [{ arquivo: 'package.json',
      antes: pj({ dependencies: { p: de } }), depois: pj({ dependencies: { p: para } }) }] });
    assert.equal(c.classe, 'vermelho', `${de} → ${para}`);
    assert.equal(c.revisor, true);
  }
});

test('dependência movida de seção é comparada; overrides contam; JSON ilegível é dúvida', () => {
  assert.equal(um({ devDependencies: { zod: '^3.22.0' } }, { dependencies: { zod: '^4.0.0' } }).majors.length, 1);
  assert.equal(um({ overrides: { semver: '^6.0.0' } }, { overrides: { semver: '^7.0.0' } }).majors.length, 1);
  assert.equal(um({ overrides: { a: { b: '^1.0.0' } } }, { overrides: { a: { b: '^2.0.0' } } }).duvidas.length, 1);
  assert.deepEqual(compararPackageJson('{ quebrado', pj({}), 'x/package.json').duvidas, ['x/package.json: JSON ilegível']);
  assert.deepEqual(compararPackageJson(null, pj({ dependencies: { a: '^9.0.0' } }), 'novo/package.json'),
    { majors: [], duvidas: [] }); // package.json novo: tudo é dependência nova
});

test('package.json do PR que não pôde ser lido é vermelho (em dúvida, vermelho); sem package.json não importa', () => {
  const r = classificar({ arquivos: ['server/package.json'], titulo: TITULO_952, pacotes: null });
  assert.equal(r.classe, 'vermelho');
  assert.equal(r.revisor, true);
  assert.equal(classificar({ arquivos: ['my-app/a.tsx'], pacotes: null }).classe, 'verde');
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

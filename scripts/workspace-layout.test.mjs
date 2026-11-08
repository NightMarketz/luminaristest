// node --test scripts/workspace-layout.test.mjs
// Scripts que olham `node_modules` no layout do workspace npm (PR-3 do MONOREPO-WORKSPACES, #1051): as dependências do
// server ficam içadas na raiz e `server/node_modules` é uma junção vazia. Achados A1, A2 e O1 da verificação de 04/11
// (dono, chat, 2026-11-04: "Corrige todos em sequencia"). Cada teste monta uma árvore temporária e roda o script de
// verdade num subprocesso, sem tocar no repo.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const novoDir = () => fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'workspace-layout-test-')));
const copiar = (rel, raiz) => {
  fs.mkdirSync(path.dirname(path.join(raiz, rel)), { recursive: true });
  fs.copyFileSync(path.join(REPO, rel), path.join(raiz, rel));
  return path.join(raiz, rel);
};
const git = (args, cwd) => execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
const juncao = (alvo, link) => {
  fs.mkdirSync(alvo, { recursive: true });
  fs.symlinkSync(alvo, link, 'junction');
};

test('A1: test-integration-sharded acha o jest içado na raiz quando server/node_modules está vazio', () => {
  const raiz = novoDir();
  const script = copiar('server/scripts/test-integration-sharded.mjs', raiz);
  fs.mkdirSync(path.join(raiz, 'server', 'node_modules')); // a junção vazia do layout novo
  fs.mkdirSync(path.join(raiz, 'node_modules', 'jest', 'bin'), { recursive: true });
  fs.writeFileSync(path.join(raiz, 'node_modules', 'jest', 'bin', 'jest.js'), "console.log('jest-falso', process.argv.slice(2).join(' '));\n");

  const r = spawnSync(process.execPath, [script], {
    cwd: path.join(raiz, 'server'),
    env: { ...process.env, CI: '1', INTEGRATION_SHARDS: '1' },
    encoding: 'utf8',
  });
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.match(r.stdout, /jest-falso --selectProjects integration --runInBand/);
});

// Worktree de mentira para o hook: um repo git com o session-start-deps de verdade e um worktree-deps falso que liga
// as pastas ausentes como junção e só avisa sobre a pasta real, como o de verdade (worktree-deps.mjs:92-95).
function repoComServerReal() {
  const raiz = novoDir();
  git(['init', '-q'], raiz);
  copiar('scripts/session-start-deps.mjs', raiz);
  fs.writeFileSync(
    path.join(raiz, 'scripts', 'worktree-deps.mjs'),
    `import fs from 'node:fs';
import path from 'node:path';
for (const p of ['node_modules', 'my-app/node_modules', 'server/node_modules']) {
  const nm = path.join(process.cwd(), p);
  if (fs.existsSync(nm)) { console.log(p + ': já é uma pasta própria; para usar o depósito, apague-a e rode de novo'); continue; }
  const alvo = path.join(process.cwd(), '.deposito', p);
  fs.mkdirSync(alvo, { recursive: true });
  fs.symlinkSync(alvo, nm, 'junction');
}
`,
  );
  fs.mkdirSync(path.join(raiz, 'my-app'));
  fs.mkdirSync(path.join(raiz, 'server', 'node_modules', 'zod'), { recursive: true }); // npm ci do layout de antes
  return raiz;
}
const hook = (raiz) =>
  spawnSync(process.execPath, [path.join(raiz, 'scripts', 'session-start-deps.mjs')], { cwd: raiz, encoding: 'utf8' });

test('A2: com pasta real em server/node_modules, a linha que entra na sessão avisa (não só o log)', () => {
  const raiz = repoComServerReal();
  const r = hook(raiz);
  assert.equal(r.status, 0, r.stderr);
  const aviso = r.stdout.split(/\r?\n/).find((l) => l.includes('pasta própria'));
  assert.ok(aviso, `sem aviso no stdout: ${JSON.stringify(r.stdout)}`);
  assert.match(aviso, /server\/node_modules/);
  assert.doesNotMatch(aviso.replace(/\S+\/node_modules/g, ''), /node_modules/, 'a raiz virou junção: não entra no aviso');
  assert.ok(fs.existsSync(path.join(raiz, 'server', 'node_modules', 'zod')), 'a pasta real é preservada');
});

test('A2: nas sessões seguintes (nada faltando) o aviso continua, em vez de sair calado', () => {
  const raiz = repoComServerReal();
  juncao(path.join(raiz, '.deposito', 'node_modules'), path.join(raiz, 'node_modules'));
  juncao(path.join(raiz, '.deposito', 'my-app', 'node_modules'), path.join(raiz, 'my-app', 'node_modules'));
  const r = hook(raiz);
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /pasta própria/);
  assert.match(r.stdout, /server\/node_modules/);
});

test('A2: worktree toda em junção continua silenciosa', () => {
  const raiz = repoComServerReal();
  fs.rmSync(path.join(raiz, 'server', 'node_modules'), { recursive: true });
  for (const p of ['node_modules', 'my-app/node_modules', 'server/node_modules']) {
    juncao(path.join(raiz, '.deposito', p), path.join(raiz, p));
  }
  const r = hook(raiz);
  assert.equal(r.status, 0, r.stderr);
  assert.equal(r.stdout, '');
});

test('O1: worktrees-paradas conta node_modules real na raiz do workspace', () => {
  const raiz = novoDir();
  const principal = path.join(raiz, 'principal');
  fs.mkdirSync(principal);
  git(['init', '-q', '-b', 'main'], principal);
  git(['-c', 'user.name=t', '-c', 'user.email=t@t', 'commit', '-q', '--allow-empty', '-m', 'x'], principal);
  git(['update-ref', 'refs/remotes/origin/main', 'HEAD'], principal);
  const wt = path.join(raiz, 'wt');
  git(['worktree', 'add', '-q', '--detach', wt], principal);
  fs.mkdirSync(path.join(wt, 'node_modules', 'zod'), { recursive: true }); // npm ci na raiz, sem junção

  const r = spawnSync(process.execPath, [path.join(REPO, 'scripts', 'worktrees-paradas.mjs'), '--json', '--dias', '0', '--sem-tamanho'], {
    cwd: principal,
    encoding: 'utf8',
  });
  assert.equal(r.status, 0, r.stderr);
  const { paradas } = JSON.parse(r.stdout);
  const p = paradas.find((x) => path.resolve(x.caminho) === path.resolve(wt));
  assert.ok(p, `a worktree deveria estar na lista: ${r.stdout}`);
  assert.equal(p.nodeModules, 'real');
});

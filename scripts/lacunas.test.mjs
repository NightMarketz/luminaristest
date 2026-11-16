// node --test scripts/lacunas.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync, spawnSync } from 'node:child_process';
import { adicionar, instalar, listar, mudar, VERSAO } from './lacunas.mjs';

const base = { local: 'server/src/x.ts:10', classe: 'defeito', oQue: 'soma ignora sinal', evidencia: 'li x.ts:10' };
const nova = () => mkdtempSync(join(tmpdir(), 'lacunas-'));
const script = fileURLToPath(new URL('./lacunas.mjs', import.meta.url));
const ADD = ['add', '--local', 'a.ts:1', '--classe', 'debito', '--o-que', 'x', '--evidencia', 'y'];

test('lacuna sem evidência não entra', () => {
  assert.throws(() => adicionar({ ...base, evidencia: '' }, nova()), /evidencia/);
});

test('classe fora da lista é recusada', () => {
  assert.throws(() => adicionar({ ...base, classe: 'melhoria' }, nova()), /classe inválida/);
});

test('mesma lacuna aberta não duplica; depois de resolvida, entra de novo', () => {
  const dir = nova();
  const a = adicionar(base, dir);
  assert.equal(adicionar(base, dir).id, a.id);
  assert.equal(listar(dir).length, 1);
  mudar(a.id, { estado: 'resolvida', destino: '#1300' }, dir);
  assert.notEqual(adicionar(base, dir).id, a.id);
});

test('--abertas esconde resolvida e descartada, mostra com-dono', () => {
  const dir = nova();
  const a = adicionar(base, dir);
  const b = adicionar({ ...base, local: 'y.ts:1' }, dir);
  const c = adicionar({ ...base, local: 'z.ts:1' }, dir);
  mudar(a.id, { estado: 'resolvida', destino: '#1' }, dir);
  mudar(b.id, { estado: 'descartada', destino: 'não reproduzido' }, dir);
  mudar(c.id, { estado: 'com-dono', destino: 'pergunta do dia' }, dir);
  assert.deepEqual(listar(dir, { abertas: true }).map((l) => l.id), [c.id]);
});

test('mudar exige destino', () => {
  const dir = nova();
  const a = adicionar(base, dir);
  assert.throws(() => mudar(a.id, { estado: 'descartada', destino: '' }, dir), /destino/);
});

test('geração conta a cadeia pelo pai', () => {
  const dir = nova();
  const a = adicionar(base, dir);
  const b = adicionar({ ...base, local: 'b.ts:1', pai: a.id }, dir);
  const c = adicionar({ ...base, local: 'c.ts:1', pai: b.id }, dir);
  assert.equal(c.geracao, 3);
});

test('CLI: add e list pela linha de comando', () => {
  const dir = nova();
  const env = { ...process.env, LUMINARIS_LACUNAS_DIR: dir, LACUNAS_TOOLS_DIR: nova() };
  const out = execFileSync('node', [script, ...ADD], { env, encoding: 'utf8' });
  assert.match(out, /na caixa: L-/);
  assert.match(execFileSync('node', [script, 'list', '--abertas'], { env, encoding: 'utf8' }), /debito · a\.ts:1/);
});

test('cópia global, rodada de uma worktree que não tem o script, grava na caixa do .git principal', () => {
  // espaço e acento no caminho: a cópia não pode sair calada sem rodar
  const tools = mkdtempSync(join(tmpdir(), 'lacunas cópia-'));
  const copia = instalar(tools);
  const repo = nova();
  const git = (...a) => execFileSync('git', a, { cwd: repo, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  git('init', '-q');
  git('-c', 'user.name=t', '-c', 'user.email=t@t', '-c', 'commit.gpgsign=false', 'commit', '-q', '--allow-empty', '-m', 'raiz');
  const wt = join(nova(), 'wt');
  git('worktree', 'add', '-q', wt);
  // sem LUMINARIS_LACUNAS_DIR: a pasta sai do git, como numa sessão de verdade
  const env = { ...process.env, LACUNAS_TOOLS_DIR: tools };
  delete env.LUMINARIS_LACUNAS_DIR;
  const r = spawnSync('node', [copia, ...ADD], { cwd: wt, env, encoding: 'utf8' });
  assert.match(r.stdout, /na caixa: L-/);
  assert.equal(r.stderr, '');
  assert.equal(readdirSync(join(repo, '.git', 'lacunas')).length, 1);
});

test('instalar não rebaixa uma cópia global mais nova', () => {
  const tools = nova();
  writeFileSync(join(tools, 'lacunas.mjs'), `export const VERSAO = ${VERSAO + 1};
`);
  assert.throws(() => instalar(tools), /mais nova/);
});

test('CLI: avisa quando a cópia global é mais velha que o script do repo, sem falhar', () => {
  const tools = nova();
  writeFileSync(join(tools, 'lacunas.mjs'), `export const VERSAO = ${VERSAO - 1};
`);
  const env = { ...process.env, LUMINARIS_LACUNAS_DIR: nova(), LACUNAS_TOOLS_DIR: tools };
  const r = spawnSync('node', [script, 'list'], { env, encoding: 'utf8' });
  assert.equal(r.status, 0);
  assert.match(r.stderr, /lacunas\.mjs instalar/);
});

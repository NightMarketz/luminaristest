// node --test scripts/lacunas.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync, spawnSync } from 'node:child_process';
import { adicionar, instalar, listar, mudar, paradas, triar, validarLocal, VERSAO } from './lacunas.mjs';

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

test('set --pr grava o número do PR e em-pr sem PR é recusado', () => {
  const dir = nova();
  const a = adicionar(base, dir);
  assert.throws(() => mudar(a.id, { estado: 'em-pr', destino: 'sessão x' }, dir), /em-pr exige --pr/);
  assert.throws(() => mudar(a.id, { estado: 'em-pr', destino: 'x', pr: 'abc' }, dir), /--pr inválido/);
  const l = mudar(a.id, { estado: 'em-pr', destino: 'PR aberto', pr: '#1297' }, dir);
  assert.equal(l.pr, '1297');
  assert.equal(listar(dir)[0].pr, '1297');
  assert.equal(mudar(a.id, { estado: 'resolvida', destino: 'merge' }, dir).pr, '1297');
});

test('--local fora do repositório é recusado', () => {
  assert.throws(() => adicionar({ ...base, local: '../outra-worktree/x.md' }, nova()), /fora do repositório/);
  assert.throws(() => validarLocal('C:/outro/repo/x.ts:1', 'C:/meu/repo'), /fora do repositório/);
  assert.doesNotThrow(() => validarLocal('C:/meu/repo/x.ts:1', 'C:/meu/repo'));
  assert.doesNotThrow(() => validarLocal('server/src/x.ts:1', 'C:/meu/repo'));
});

test('paradas lista só aberta com idade >= N dias', () => {
  const dir = nova();
  const velha = adicionar(base, dir, new Date('2026-11-10T12:00:00Z'));
  adicionar({ ...base, local: 'nova.ts:1' }, dir, new Date('2026-11-20T12:00:00Z'));
  const emPr = adicionar({ ...base, local: 'pr.ts:1' }, dir, new Date('2026-11-10T12:00:00Z'));
  mudar(emPr.id, { estado: 'em-pr', destino: 'x', pr: '1' }, dir);
  const ps = paradas(dir, { dias: 3, agora: new Date('2026-11-21T12:00:00Z') });
  assert.deepEqual(ps.map((l) => l.id), [velha.id]);
  assert.equal(ps[0].idadeDias, 11);
});

test('triar manda fork, gate e geração > 3 ao dono; defeito fica; --simular não grava', () => {
  const dir = nova();
  const d = adicionar(base, dir);
  const f = adicionar({ ...base, local: 'f.ts:1', classe: 'fork' }, dir);
  const g = adicionar({ ...base, local: 'g.ts:1', classe: 'gate' }, dir);
  const p1 = adicionar({ ...base, local: 'p1.ts:1' }, dir);
  const p2 = adicionar({ ...base, local: 'p2.ts:1', pai: p1.id }, dir);
  const p3 = adicionar({ ...base, local: 'p3.ts:1', pai: p2.id }, dir);
  const p4 = adicionar({ ...base, local: 'p4.ts:1', pai: p3.id }, dir);
  assert.deepEqual(triar(dir, { simular: true }).map((x) => x.id).sort(), [f.id, g.id, p4.id].sort());
  assert.ok(listar(dir).every((l) => l.estado === 'aberta'));
  triar(dir);
  const est = Object.fromEntries(listar(dir).map((l) => [l.id, l.estado]));
  assert.equal(est[d.id], 'aberta');
  assert.equal(est[f.id], 'com-dono');
  assert.equal(est[g.id], 'com-dono');
  assert.equal(est[p4.id], 'com-dono');
  assert.deepEqual(triar(dir), []);
});

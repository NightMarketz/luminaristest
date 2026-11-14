// node --test scripts/lacunas.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { adicionar, listar, mudar } from './lacunas.mjs';

const base = { local: 'server/src/x.ts:10', classe: 'defeito', oQue: 'soma ignora sinal', evidencia: 'li x.ts:10' };
const nova = () => mkdtempSync(join(tmpdir(), 'lacunas-'));

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
  const env = { ...process.env, LUMINARIS_LACUNAS_DIR: dir };
  const script = new URL('./lacunas.mjs', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
  const out = execFileSync('node', [script, 'add', '--local', 'a.ts:1', '--classe', 'debito', '--o-que', 'x',
    '--evidencia', 'y'], { env, encoding: 'utf8' });
  assert.match(out, /na caixa: L-/);
  assert.match(execFileSync('node', [script, 'list', '--abertas'], { env, encoding: 'utf8' }), /debito · a\.ts:1/);
});

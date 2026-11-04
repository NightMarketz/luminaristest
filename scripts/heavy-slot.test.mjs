// node --test scripts/heavy-slot.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';

const { acquire, holders, HELD_ENV } = createRequire(import.meta.url)('./heavy-slot.cjs');

const novoDir = () => fs.mkdtempSync(path.join(os.tmpdir(), 'heavy-slot-test-'));
const envCom = (dir, slots) => ({ LUMINARIS_HEAVY_SLOTS: String(slots), LUMINARIS_HEAVY_SLOTS_DIR: dir });
const quieto = { pollMs: 20, log: () => {} };

test('pega vaga e grava PID e rótulo na trava', async () => {
  const env = envCom(novoDir(), 2);
  const release = await acquire({ ...quieto, env, label: 'jest integração' });
  const hs = holders({ slots: 2, dir: env.LUMINARIS_HEAVY_SLOTS_DIR });
  assert.equal(hs.length, 1);
  assert.equal(hs[0].pid, process.pid);
  assert.equal(hs[0].label, 'jest integração');
  release();
  assert.equal(holders({ slots: 2, dir: env.LUMINARIS_HEAVY_SLOTS_DIR }).length, 0);
});

test('sem vaga espera, avisa quem ocupa, e entra quando a vaga é liberada', async () => {
  const dir = novoDir();
  const envA = envCom(dir, 1);
  const envB = envCom(dir, 1);
  const releaseA = await acquire({ ...quieto, env: envA, label: 'next build' });
  const avisos = [];
  let entrou = false;
  const pB = acquire({ pollMs: 20, noticeMs: 0, env: envB, label: 'jest', log: (m) => avisos.push(m) }).then((r) => {
    entrou = true;
    return r;
  });
  await new Promise((r) => setTimeout(r, 150));
  assert.equal(entrou, false, 'B não pode entrar com a única vaga ocupada');
  assert.ok(avisos.some((m) => m.includes('ocupadas')), 'avisa que está esperando');
  assert.ok(avisos.some((m) => m.includes('next build') && m.includes(`PID ${process.pid}`)), 'mostra quem ocupa');
  releaseA();
  const releaseB = await pB;
  assert.equal(entrou, true);
  releaseB();
});

test('trava de processo morto é órfã: a vaga é tomada sem esperar', async () => {
  const dir = novoDir();
  const morto = spawnSync(process.execPath, ['-e', 'process.stdout.write(String(process.pid))'], { encoding: 'utf8' });
  const pidMorto = Number(morto.stdout);
  fs.writeFileSync(path.join(dir, 'slot-0.lock'), JSON.stringify({ pid: pidMorto, label: 'velho', cwd: 'x', since: Date.now() }));
  const release = await acquire({ ...quieto, env: envCom(dir, 1), label: 'novo', timeoutMs: 2000 });
  assert.equal(holders({ slots: 1, dir })[0].label, 'novo');
  release();
});

test('trava de processo vivo mas com mais de 6 h é órfã (PID reaproveitado)', async () => {
  const dir = novoDir();
  const velha = { pid: process.pid, label: 'velho', cwd: 'x', since: Date.now() - 7 * 60 * 60_000 };
  fs.writeFileSync(path.join(dir, 'slot-0.lock'), JSON.stringify(velha));
  const release = await acquire({ ...quieto, env: envCom(dir, 1), label: 'novo' });
  assert.equal(holders({ slots: 1, dir })[0].label, 'novo');
  release();
});

test('release não apaga a trava de outro processo', async () => {
  const dir = novoDir();
  const release = await acquire({ ...quieto, env: envCom(dir, 1), label: 'meu' });
  const outra = { pid: process.ppid, label: 'outro', cwd: 'x', since: Date.now() };
  fs.writeFileSync(path.join(dir, 'slot-0.lock'), JSON.stringify(outra));
  release();
  assert.equal(JSON.parse(fs.readFileSync(path.join(dir, 'slot-0.lock'), 'utf8')).label, 'outro');
});

test('CI ignora, e quem já está dentro de uma vaga não pede outra', async () => {
  const dir = novoDir();
  await acquire({ ...quieto, env: { ...envCom(dir, 1), CI: 'true' } });
  await acquire({ ...quieto, env: { ...envCom(dir, 1), [HELD_ENV]: '123' } });
  assert.equal(fs.readdirSync(dir).length, 0, 'nenhuma trava criada');
});

test('CLI run: segura a vaga durante o comando e devolve o exit code dele', () => {
  const dir = novoDir();
  const script = path.join(path.dirname(new URL(import.meta.url).pathname.replace(/^\/(\w:)/, '$1')), 'heavy-slot.cjs');
  const r = spawnSync(
    process.execPath,
    // Argumentos crus, com `>`, `=` e aspas, como a pessoa digitaria: o run tem de citá-los para o shell.
    [script, 'run', '--label', 'prova', '--', process.execPath, '-e', `const n = require("fs").readdirSync(process.argv[1]).length; process.exit(n >= 1 ? 7 : 3)`, dir],
    { encoding: 'utf8', env: { ...process.env, ...envCom(dir, 1), CI: '' } },
  );
  assert.equal(r.status, 7, `a trava existia durante o comando (stderr: ${r.stderr})`);
  assert.equal(fs.readdirSync(dir).length, 0, 'liberada ao terminar');
});

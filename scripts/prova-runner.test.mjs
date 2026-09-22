// node --test scripts/prova-runner.test.mjs
// Controle negativo da cerca (BRIEF item 4): PROVA que declara sucesso + comando que falha → FALHOU.
// Se o runner algum dia confiar no exit_code declarado, N1 fica vermelho. Esse é o teste da coisa certa.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { runRetorno, parseProva, STAGES } from './prova-runner.mjs';

const dir = mkdtempSync(join(tmpdir(), 'prova-'));
const log = join(dir, 'x.log');
writeFileSync(log, 'saida qualquer');
const sha = createHash('sha256').update(readFileSync(log)).digest('hex');

function retorno({ exitCode, exit, veredito = 'PASS', crlf = false, raw = null, header = 'PASS' }) {
  const prova = raw ?? [
    '```yaml', 'PROVA:',
    `  - command: "node -e \\"process.exit(${exit})\\""`,
    `    exit_code: ${exitCode}`, `    log: ${log.replace(/\\/g, '/')}`, `    sha256: ${sha}`,
    `VEREDITO: ${veredito}`, '```',
  ].join('\n');
  const body = ['# RETORNO — t', `veredicto: ${header}`, '', '### Arquivos', '- nenhum', '', '### Checks executados', prova, ''].join('\n');
  const f = join(dir, `r-${Math.random().toString(36).slice(2)}.md`);
  writeFileSync(f, crlf ? body.replace(/\n/g, '\r\n') : body);
  return f;
}

test('N1 — declara 0, comando sai 1 → FALHOU (controle negativo de false success)', () => {
  const f = retorno({ exitCode: 0, exit: 1 });
  const r = runRetorno(f, { cwd: dir });
  assert.equal(r.status, 'FALHOU');
  assert.match(readFileSync(f, 'utf8'), /^veredicto: FALHOU$/m);
});

test('N1b — declara 1, comando sai 1, VEREDITO PASS → FALHOU (alegação honesta, mas falhou)', () => {
  const r = runRetorno(retorno({ exitCode: 1, exit: 1 }), { cwd: dir });
  assert.equal(r.status, 'FALHOU');
});

test('N2 — declara 1, VEREDITO FAIL, comando sai 0 → INCONSISTENTE', () => {
  const r = runRetorno(retorno({ exitCode: 1, exit: 0, veredito: 'FAIL' }), { cwd: dir });
  assert.equal(r.status, 'INCONSISTENTE');
});

test('N3 — PROVA como string solta → FALHOU SEM-PROVA', () => {
  const r = runRetorno(retorno({ raw: 'PROVA: npm test' }), { cwd: dir });
  assert.equal(r.status, 'FALHOU');
  assert.equal(r.reason, 'SEM-PROVA');
});

test('N4 — sha256 do log não bate → FALHOU', () => {
  const f = retorno({ exitCode: 0, exit: 0 });
  writeFileSync(f, readFileSync(f, 'utf8').replace(sha, 'deadbeef'));
  const r = runRetorno(f, { cwd: dir });
  assert.equal(r.status, 'FALHOU');
  assert.match(r.reason, /sha256/);
});

test('P1 — declara 0, comando sai 0 → PASSOU e sobrescreve veredicto', () => {
  const f = retorno({ exitCode: 0, exit: 0, header: 'FAIL' });
  const r = runRetorno(f, { cwd: dir });
  assert.equal(r.status, 'PASSOU');
  assert.match(readFileSync(f, 'utf8'), /^veredicto: PASSOU$/m);
});

test('CRLF — N1 em \\r\\n dá o mesmo veredito', () => {
  const r = runRetorno(retorno({ exitCode: 0, exit: 1, crlf: true }), { cwd: dir });
  assert.equal(r.status, 'FALHOU');
  assert.equal(parseProva(readFileSync(retorno({ exitCode: 0, exit: 0, crlf: true }), 'utf8')).items.length, 1);
});

test('N/A explícito sem PROVA passa; ausência total não', () => {
  const na = retorno({ raw: '', header: 'N/A' });
  assert.equal(runRetorno(na, { cwd: dir }).status, 'N/A');
  assert.equal(runRetorno(retorno({ raw: '' }), { cwd: dir }).status, 'FALHOU');
});

test('item 7 — ordem do pipeline é prova → invariantes → review-llm (não-gate)', () => {
  assert.equal(STAGES[0], 'prova');
  assert.equal(STAGES[1], 'invariantes');
  assert.match(STAGES[2], /não-gate/);
});

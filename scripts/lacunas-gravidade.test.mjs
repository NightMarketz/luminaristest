// node --test scripts/lacunas-gravidade.test.mjs — critério de entrada da caixa (D-2026-11-25-CRITERIO-DE-ENTRADA-DA-CAIXA).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { adicionar, classificar, grupos, listar, mudar, paradas, pulso, filtrarGravidade } from './lacunas.mjs';

const nova = () => mkdtempSync(join(tmpdir(), 'lacunas-grav-'));
const script = fileURLToPath(new URL('./lacunas.mjs', import.meta.url));
const bug = { local: 'server/src/x.ts:10', classe: 'defeito', gravidade: 'bug', oQue: 'soma ignora sinal', evidencia: 'li x.ts:10', raiz: '' };
const nit = { ...bug, local: 'server/src/y.ts:3', classe: 'debito', gravidade: 'nit', oQue: 'nome confuso' };
// Lacuna gravada antes da gravidade existir (caixa legada): escrita direto, sem passar pelo add.
function legada(dir, id, extra = {}) {
  const em = '2026-11-20T12:00:00.000Z';
  writeFileSync(join(dir, `${id}.json`), JSON.stringify({ id, criada: em, estado: 'aberta', geracao: 1, local: 'z.ts:1',
    classe: 'debito', oQue: 'x', evidencia: 'y', destino: '', historico: [{ em, estado: 'aberta' }], ...extra }));
}

test('add sem gravidade é recusado e cita a regra', () => {
  const { gravidade, ...sem } = bug;
  assert.throws(() => adicionar(sem, nova()), /falta --gravidade.*D-2026-11-25/);
  assert.throws(() => adicionar({ ...bug, gravidade: 'grave' }, nova()), /gravidade inválida/);
});

test('coerência classe × gravidade: bug só em defeito, defeito só com meta, classe gate só com gate', () => {
  assert.throws(() => adicionar({ ...bug, classe: 'debito' }, nova()), /bug exige classe defeito/);
  assert.throws(() => adicionar({ ...bug, gravidade: 'nit' }, nova()), /defeito exige gravidade bug, gate ou fiscal/);
  assert.throws(() => adicionar({ ...bug, classe: 'gate', gravidade: 'fiscal' }, nova()), /classe gate exige gravidade gate/);
  // quebra de check:arch costuma ser débito: gate aceita qualquer classe
  assert.equal(adicionar({ ...bug, classe: 'debito', gravidade: 'gate' }, nova()).gravidade, 'gate');
  assert.equal(adicionar({ ...bug, gravidade: 'fiscal' }, nova()).gravidade, 'fiscal');
});

test('pulso: meta é bug/gate/fiscal (com-dono conta), nit/estilo ficam fora; DRENO só com meta aberta', () => {
  const dir = nova();
  const agora = new Date('2026-11-25T12:00:00Z');
  adicionar(nit, dir, agora);
  adicionar({ ...nit, local: 'w.ts:1', gravidade: 'estilo' }, dir, agora);
  adicionar({ ...nit, local: 'm.ts:1', gravidade: 'melhoria' }, dir, agora);
  let p = pulso(dir, agora);
  assert.equal(p.meta, 0);
  assert.equal(p.foraDaConta, 2);
  assert.equal(p.precisaDreno, false, 'só nit, estilo e melhoria: nada a drenar');
  const g = adicionar({ ...bug, local: 'g.ts:1', classe: 'gate', gravidade: 'gate' }, dir, agora);
  mudar(g.id, { estado: 'com-dono', destino: 'Parado em mim' }, dir, agora);
  p = pulso(dir, agora);
  assert.equal(p.meta, 1, 'gate humano com-dono conta na meta');
  assert.equal(p.precisaDreno, false, 'com-dono não é despachável: não pede cartão');
  adicionar(bug, dir, agora);
  p = pulso(dir, agora);
  assert.equal(p.meta, 2);
  assert.equal(p.metaAberta, 1);
  assert.equal(p.precisaDreno, true);
});

test('caixa legada: sem gravidade conta como meta até classificar; classificar não mexe no estado nem no relógio', () => {
  const dir = nova();
  legada(dir, 'L-legada-0001');
  const agora = new Date('2026-11-25T12:00:00Z');
  let p = pulso(dir, agora);
  assert.equal(p.semGravidade, 1);
  assert.equal(p.meta, 1);
  assert.equal(p.precisaDreno, true);
  assert.deepEqual(filtrarGravidade(listar(dir), 'sem').map((l) => l.id), ['L-legada-0001']);
  assert.throws(() => classificar('L-legada-0001', { gravidade: 'nit' }, dir, agora), /--motivo/);
  const l = classificar('L-legada-0001', { gravidade: 'nit', motivo: 'só renomear' }, dir, agora);
  assert.equal(l.estado, 'aberta');
  assert.equal(l.historico.length, 1, 'classificar não é transição de estado');
  assert.deepEqual(l.classificacoes.map((c) => [c.de, c.para]), [['', 'nit']]);
  p = pulso(dir, agora);
  assert.equal(p.semGravidade, 0);
  assert.equal(p.meta, 0);
  assert.equal(p.precisaDreno, false);
  legada(dir, 'L-legada-0002', { classe: 'defeito' });
  assert.throws(() => classificar('L-legada-0002', { gravidade: 'melhoria', motivo: 'x' }, dir), /defeito exige/);
});

test('nit e estilo não viram paradas nem formam grupo', () => {
  const dir = nova();
  const t0 = new Date('2026-11-01T12:00:00Z');
  adicionar(nit, dir, t0);
  adicionar({ ...nit, local: 'server/src/y.ts:9', gravidade: 'estilo' }, dir, t0);
  assert.deepEqual(paradas(dir, { agora: new Date('2026-11-25T12:00:00Z') }), []);
  assert.deepEqual(grupos(dir), []);
  adicionar({ ...nit, local: 'server/src/y.ts:20', gravidade: 'melhoria' }, dir, t0);
  adicionar({ ...nit, local: 'server/src/y.ts:30', classe: 'defeito', gravidade: 'bug' }, dir, t0);
  assert.equal(grupos(dir)[0].membros.length, 2, 'só melhoria e bug formam o grupo');
});

test('CLI: add exige --gravidade, list filtra por gravidade e meta, classificar grava', () => {
  const dir = nova();
  const env = { ...process.env, LUMINARIS_LACUNAS_DIR: dir };
  const run = (...a) => spawnSync('node', [script, ...a], { env, encoding: 'utf8' });
  const base = ['add', '--local', 'a.ts:1', '--classe', 'debito', '--o-que', 'x', '--evidencia', 'y'];
  const sem = run(...base);
  assert.equal(sem.status, 1);
  assert.match(sem.stderr, /falta --gravidade/);
  assert.equal(run(...base, '--gravidade', 'estilo').status, 0);
  assert.equal(run('add', '--local', 'b.ts:1', '--classe', 'defeito', '--gravidade', 'bug', '--o-que', 'x', '--evidencia', 'y').status, 0);
  assert.match(run('list', '--gravidade', 'meta').stdout, /defeito\/bug · b\.ts:1/);
  assert.doesNotMatch(run('list', '--gravidade', 'meta').stdout, /a\.ts:1/);
  assert.match(run('pulso').stdout, /meta bug\/gate\/fiscal 1 · sem gravidade 0 · nit\/estilo 1/);
  const id = listar(dir).find((l) => l.local === 'a.ts:1').id;
  assert.equal(run('classificar', id, '--gravidade', 'melhoria', '--motivo', 'é duplicação real').status, 0);
  assert.equal(JSON.parse(readFileSync(join(dir, `${id}.json`), 'utf8')).gravidade, 'melhoria');
});

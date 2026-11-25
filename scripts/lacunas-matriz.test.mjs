// node --test scripts/lacunas-matriz.test.mjs — matriz de 6 eixos da caixa (D-2026-11-25-MATRIZ-DE-LACUNAS), que
// substitui o rótulo único da D-2026-11-25-CRITERIO-DE-ENTRADA-DA-CAIXA.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { adicionar, atrasada, classificar, ehMeta, filtrarPrioridade, grupos, listar, mudar, paradas, prioridade, pulso } from './lacunas.mjs';

const nova = () => mkdtempSync(join(tmpdir(), 'lacunas-matriz-'));
const script = fileURLToPath(new URL('./lacunas.mjs', import.meta.url));
const eixos = { dominio: 'contabil', gravidade: 'G2', exposicao: 'E1', deteccao: 'ruidoso', certeza: 'verificado' };
const bug = { local: 'server/src/x.ts:10', classe: 'defeito', ...eixos, oQue: 'soma ignora sinal', evidencia: 'li x.ts:10', raiz: '' };
const nit = { local: 'server/src/y.ts:3', classe: 'debito', dominio: 'engenharia', gravidade: 'G5', oQue: 'nome confuso', evidencia: 'li', raiz: '' };
const feat = { local: 'server/src/f.ts:1', classe: 'feature', dominio: 'fiscal', impacto: 'G3', exposicao: 'E2', deteccao: 'ruidoso',
  certeza: 'verificado', oQue: 'falta Paulistana', evidencia: 'li', raiz: '' };
const P = (m) => prioridade({ classe: 'defeito', ...m });

function legada(dir, id, extra = {}) {
  const em = '2026-11-20T12:00:00.000Z';
  writeFileSync(join(dir, `${id}.json`), JSON.stringify({ id, criada: em, estado: 'aberta', geracao: 1, local: 'z.ts:1',
    classe: 'debito', oQue: 'x', evidencia: 'y', destino: '', historico: [{ em, estado: 'aberta' }], ...extra }));
}

test('§3: tabela gravidade × exposição', () => {
  const d = { deteccao: 'ruidoso' };
  assert.equal(P({ ...d, gravidade: 'G1', exposicao: 'E1' }), 'P0');
  assert.equal(P({ ...d, gravidade: 'G1', exposicao: 'E2' }), 'P0');
  assert.equal(P({ ...d, gravidade: 'G1', exposicao: 'E3' }), 'P1', 'R2: G1 nunca abaixo de P1');
  assert.equal(P({ ...d, gravidade: 'G1', exposicao: 'E4' }), 'P1');
  assert.equal(P({ ...d, gravidade: 'G2', exposicao: 'E2' }), 'P1');
  assert.equal(P({ ...d, gravidade: 'G2', exposicao: 'E3' }), 'P2');
  assert.equal(P({ ...d, gravidade: 'G3', exposicao: 'E1' }), 'P2');
  assert.equal(P({ ...d, gravidade: 'G4', exposicao: 'E1' }), 'P3');
  assert.equal(P({ gravidade: 'G5' }), null, 'G5 fica fora da prioridade');
  assert.equal(P({}), null, 'sem matriz não tem prioridade');
});

test('R1: silencioso sobe só P3→P2 e P2→P1, nunca cria P0 e não vale em E4', () => {
  const s = { deteccao: 'silencioso' };
  assert.equal(P({ ...s, gravidade: 'G4', exposicao: 'E1' }), 'P2');
  assert.equal(P({ ...s, gravidade: 'G3', exposicao: 'E3' }), 'P1', 'piloto 140: JCP em 2 commits');
  assert.equal(P({ ...s, gravidade: 'G2', exposicao: 'E1' }), 'P1', 'piloto 139: não vira P0');
  assert.equal(P({ ...s, gravidade: 'G1', exposicao: 'E3' }), 'P1', 'piloto 214: não vira P0');
  assert.equal(P({ ...s, gravidade: 'G1', exposicao: 'E4' }), 'P1', 'piloto 164 (C1): latente não sobe');
  assert.equal(P({ ...s, gravidade: 'G3', exposicao: 'E4' }), 'P2');
});

test('R3: qualquer gatilho dá piso P1, sem passar de P1', () => {
  assert.equal(P({ deteccao: 'ruidoso', gravidade: 'G4', exposicao: 'E1', gatilhos: ['regressao'] }), 'P1');
  assert.equal(P({ deteccao: 'ruidoso', gravidade: 'G1', exposicao: 'E1', gatilhos: ['vazamento'] }), 'P0');
});

test('meta = P0 + P1 + P2 do domínio fiscal; sem matriz conta como meta', () => {
  const base = { classe: 'defeito', deteccao: 'ruidoso', exposicao: 'E1' };
  assert.equal(ehMeta({ ...base, gravidade: 'G2', dominio: 'produto' }), true);
  assert.equal(ehMeta({ ...base, gravidade: 'G3', dominio: 'engenharia' }), false);
  assert.equal(ehMeta({ ...base, gravidade: 'G3', dominio: 'fiscal' }), true);
  assert.equal(ehMeta({ ...base, gravidade: 'G4', dominio: 'fiscal' }), false);
  assert.equal(ehMeta({ classe: 'debito' }), true);
  assert.equal(ehMeta({ classe: 'debito', gravidade: 'bug' }), true, 'rótulo único antigo = sem matriz');
});

test('add: recusa eixo faltando ou inválido, e gravidade × impacto pela classe (R6)', () => {
  const sem = (k) => { const o = { ...bug }; delete o[k]; return o; };
  for (const k of ['dominio', 'gravidade', 'exposicao', 'deteccao', 'certeza']) {
    assert.throws(() => adicionar(sem(k), nova()), new RegExp(`--${k}`), k);
  }
  assert.throws(() => adicionar({ ...bug, gravidade: 'bug' }, nova()), /--gravidade/);
  assert.throws(() => adicionar({ ...bug, exposicao: 'E9' }, nova()), /--exposicao/);
  assert.throws(() => adicionar({ ...bug, gatilhos: 'pressa' }, nova()), /gatilho inválido/);
  assert.throws(() => adicionar({ ...bug, gravidade: 'G5' }, nova()), /defeito não aceita G5/);
  assert.throws(() => adicionar({ ...bug, classe: 'feature' }, nova()), /usa --impacto, não --gravidade/);
  assert.throws(() => adicionar({ ...feat, gravidade: 'G2' }, nova()), /usa --impacto/);
  const l = adicionar({ ...bug, gatilhos: 'regressao,norma' }, nova());
  assert.deepEqual(l.gatilhos, ['regressao', 'norma']);
  assert.equal(adicionar(feat, nova()).impacto, 'G3');
  const g5 = adicionar(nit, nova());
  assert.equal(g5.gravidade, 'G5');
  assert.equal(g5.exposicao, undefined, 'G5 só pede o domínio');
});

test('pulso: meta separada em dano e falta, G5 fora, atrasadas pelo prazo; DRENO só com meta aberta', () => {
  const dir = nova();
  const t0 = new Date('2026-11-25T12:00:00Z');
  adicionar(nit, dir, t0);
  adicionar({ ...bug, local: 'w.ts:1', classe: 'debito', gravidade: 'G4', dominio: 'produto' }, dir, t0);
  let p = pulso(dir, t0);
  assert.equal(p.meta, 0);
  assert.equal(p.foraDaConta, 1);
  assert.equal(p.precisaDreno, false, 'só G5 e P3: nada a drenar');
  adicionar(feat, dir, t0);
  adicionar(bug, dir, t0);
  p = pulso(dir, t0);
  assert.deepEqual([p.meta, p.metaDano, p.metaFalta, p.semMatriz], [2, 1, 1, 0]);
  assert.equal(p.precisaDreno, true);
  assert.equal(p.atrasadas, 0);
  // P1 tem 7 dias; P2 fiscal tem 30
  p = pulso(dir, new Date('2026-12-03T12:00:00Z'));
  assert.equal(p.atrasadas, 1);
  p = pulso(dir, new Date('2026-12-26T12:00:00Z'));
  assert.equal(p.atrasadas, 2);
});

test('atrasada: prazo conta da última classificação; final, P3 e G5 não atrasam', () => {
  const dir = nova();
  const t0 = new Date('2026-11-01T12:00:00Z');
  const l = adicionar(bug, dir, t0);
  const depois = new Date('2026-11-20T12:00:00Z');
  assert.equal(atrasada(listar(dir)[0], depois), true);
  classificar(l.id, { motivo: 'reli o código', exposicao: 'E2' }, dir, new Date('2026-11-18T12:00:00Z'));
  assert.equal(atrasada(listar(dir)[0], depois), false);
  mudar(l.id, { estado: 'resolvida', destino: 'PR #1' }, dir, depois);
  assert.equal(atrasada(listar(dir)[0], new Date('2027-01-01')), false);
  const g5 = adicionar(nit, dir, t0);
  assert.equal(atrasada(listar(dir).find((x) => x.id === g5.id), new Date('2027-01-01')), false);
});

test('classificar: caixa legada e rótulo único antigo viram matriz, com de → para e motivo, sem mexer no estado', () => {
  const dir = nova();
  legada(dir, 'L-legada-0001', { gravidade: 'bug' });
  const agora = new Date('2026-11-25T12:00:00Z');
  assert.equal(pulso(dir, agora).semMatriz, 1);
  assert.throws(() => classificar('L-legada-0001', { gravidade: 'G2' }, dir, agora), /--motivo/);
  assert.throws(() => classificar('L-legada-0001', { motivo: 'x', gravidade: 'G2' }, dir, agora), /--dominio/);
  const l = classificar('L-legada-0001', { motivo: 'li o código', dominio: 'contabil', gravidade: 'G2', exposicao: 'E2',
    deteccao: 'silencioso', certeza: 'inferido' }, dir, agora);
  assert.equal(l.estado, 'aberta');
  assert.equal(l.historico.length, 1, 'classificar não é transição de estado');
  assert.deepEqual(l.classificacoes.at(-1).mudou.gravidade, { de: 'bug', para: 'G2' });
  assert.equal(prioridade(l), 'P1');
  assert.equal(pulso(dir, agora).semMatriz, 0);
  // reclassificação parcial: só o eixo dado muda; G5 apaga os eixos que não se aplicam
  const g = classificar('L-legada-0001', { motivo: 'é só nome', gravidade: 'G5' }, dir, agora);
  assert.equal(g.exposicao, undefined);
  assert.deepEqual(Object.keys(g.classificacoes.at(-1).mudou).sort(), ['certeza', 'deteccao', 'exposicao', 'gatilhos', 'gravidade']);
});

test('classificar depois de set --classe: o nível do outro lado é descartado', () => {
  const dir = nova();
  const f = adicionar({ ...feat, classe: 'fork' }, dir);
  mudar(f.id, { estado: 'aberta', classe: 'defeito', destino: 'dono, 25/11: é defeito' }, dir);
  assert.equal(prioridade(listar(dir)[0]), null, 'defeito com impacto = sem matriz até classificar');
  const l = classificar(f.id, { motivo: 'virou defeito', gravidade: 'G2' }, dir);
  assert.equal(l.impacto, undefined);
  assert.equal(prioridade(l), 'P1');
});

test('G5 não vira parada nem forma grupo', () => {
  const dir = nova();
  const t0 = new Date('2026-11-01T12:00:00Z');
  adicionar(nit, dir, t0);
  adicionar({ ...nit, local: 'server/src/y.ts:9' }, dir, t0);
  assert.deepEqual(paradas(dir, { agora: new Date('2026-11-25T12:00:00Z') }), []);
  assert.deepEqual(grupos(dir), []);
  adicionar({ ...bug, local: 'server/src/y.ts:30' }, dir, t0);
  adicionar({ ...bug, local: 'server/src/y.ts:40', classe: 'debito', gravidade: 'G3' }, dir, t0);
  assert.equal(grupos(dir)[0].membros.length, 2, 'só as de G1–G4 formam o grupo');
});

test('CLI: add com eixos, list --prioridade, classificar e pulso', () => {
  const dir = nova();
  const env = { ...process.env, LUMINARIS_LACUNAS_DIR: dir };
  const run = (...a) => spawnSync('node', [script, ...a], { env, encoding: 'utf8' });
  const base = ['add', '--local', 'a.ts:1', '--classe', 'debito', '--o-que', 'x', '--evidencia', 'y'];
  const sem = run(...base);
  assert.equal(sem.status, 1);
  assert.match(sem.stderr, /falta --gravidade/);
  assert.equal(run(...base, '--dominio', 'engenharia', '--gravidade', 'G5').status, 0);
  const ok = run('add', '--local', 'b.ts:1', '--classe', 'defeito', '--dominio', 'fiscal', '--gravidade', 'G1', '--exposicao', 'E2',
    '--deteccao', 'silencioso', '--certeza', 'inferido', '--gatilho', 'norma', '--o-que', 'x', '--evidencia', 'y');
  assert.equal(ok.status, 0, ok.stderr);
  assert.match(run('list', '--prioridade', 'meta').stdout, /defeito P0 \(G1·E2·silencioso·inferido·fiscal · gatilho norma\) · b\.ts:1/);
  assert.doesNotMatch(run('list', '--prioridade', 'meta').stdout, /a\.ts:1/);
  assert.equal(run('list', '--gravidade', 'meta').status, 1, '--gravidade saiu do list');
  assert.match(run('pulso').stdout, /meta 1 \(dano 1 · falta 0 · sem matriz 0\) · atrasadas 0 · G5 1/);
  const id = listar(dir).find((l) => l.local === 'a.ts:1').id;
  const r = run('classificar', id, '--motivo', 'é duplicação real', '--gravidade', 'G3', '--exposicao', 'E1', '--deteccao', 'ruidoso',
    '--certeza', 'verificado');
  assert.equal(r.status, 0, r.stderr);
  assert.equal(JSON.parse(readFileSync(join(dir, `${id}.json`), 'utf8')).gravidade, 'G3');
  assert.deepEqual(filtrarPrioridade(listar(dir), 'P2').map((l) => l.local), ['a.ts:1']);
});

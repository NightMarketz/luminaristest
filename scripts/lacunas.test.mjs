// node --test scripts/lacunas.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync, spawnSync } from 'node:child_process';
import {
  adicionar, arquivoDe, grupos, instalar, listar, marcarDreno, mudar, paradas, porArquivo, prDaLacuna, pulso, sincronizar,
  integradosDosTitulos, triar, validarLocal,
  VERSAO,
} from './lacunas.mjs';

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
  assert.equal(r.status, 0);
  // os avisos do add (arquivo ausente, sem --como-provar) são esperados; erro ou aviso de versão não
  assert.doesNotMatch(r.stderr, /Error|cópia global/);
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

test('paradas com --dias N: aberta antiga entra; recém-criada e recém-movida não', () => {
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

test('arquivoDe tira linha, função e comentário, e preserva a letra do drive', () => {
  assert.equal(arquivoDe('server/src/x.ts:10'), 'server/src/x.ts');
  assert.equal(arquivoDe('a/sim.html:regimes()'), 'a/sim.html');
  assert.equal(arquivoDe('a/D11.txt:Anexo XX 3ª/4ª faixa'), 'a/D11.txt');
  assert.equal(arquivoDe('a/sim.html (cenario, repSem; aba 4)'), 'a/sim.html');
  assert.equal(arquivoDe('docs/x.md'), 'docs/x.md');
  assert.equal(arquivoDe('C:\\r\\x.ts:3'), 'C:/r/x.ts');
});

test('add não bloqueia por arquivo ausente, vizinha no mesmo arquivo ou falta de --como-provar: só avisa', () => {
  const dir = nova();
  const raiz = nova();
  writeFileSync(join(raiz, 'existe.ts'), '');
  const a = adicionar({ ...base, local: 'existe.ts:1', comoProvar: 'npx jest x', raiz }, dir);
  assert.deepEqual(a.avisos, []);
  assert.equal(a.arquivoForaDaCheckout, undefined);
  const b = adicionar({ ...base, local: 'existe.ts:9', raiz }, dir);
  assert.ok(b.avisos.some((x) => x.includes(a.id)), 'avisa a vizinha no mesmo arquivo');
  assert.ok(b.avisos.some((x) => /como-provar/.test(x)));
  const abs = adicionar({ ...base, local: `${raiz.replace(/\\/g, '/')}/existe.ts:5`, classe: 'spec', raiz }, dir);
  assert.equal(abs.arquivoForaDaCheckout, undefined, 'absoluto dentro da raiz não é "fora da checkout"');
  const c = adicionar({ ...base, local: 'sumiu.ts:1', comoProvar: 'x', raiz }, dir);
  assert.equal(c.arquivoForaDaCheckout, true);
  assert.ok(c.avisos.some((x) => /não existe nesta checkout/.test(x)));
  assert.equal(listar(dir).length, 4);
});

test('paradas mede o tempo no estado atual, por estado', () => {
  const dir = nova();
  const t0 = new Date('2026-11-01T12:00:00Z');
  const velhaReaberta = adicionar(base, dir, t0);
  mudar(velhaReaberta.id, { estado: 'em-pr', destino: 'x', pr: '1' }, dir, new Date('2026-11-02T12:00:00Z'));
  mudar(velhaReaberta.id, { estado: 'aberta', destino: 'PR fechado' }, dir, new Date('2026-11-20T12:00:00Z'));
  const sessaoMorta = adicionar({ ...base, local: 's.ts:1' }, dir, t0);
  mudar(sessaoMorta.id, { estado: 'em-sessao', destino: 'sessão y' }, dir, new Date('2026-11-18T12:00:00Z'));
  const donoMudo = adicionar({ ...base, local: 'd.ts:1', classe: 'fork' }, dir, t0);
  mudar(donoMudo.id, { estado: 'com-dono', destino: 'pergunta' }, dir, new Date('2026-11-17T12:00:00Z'));
  const agora = new Date('2026-11-21T12:00:00Z');
  const ids = paradas(dir, { agora }).map((l) => l.id).sort();
  // reaberta há 1 dia não é parada (pela criação teria 20); em-sessao há 3 d (limite 2) e com-dono há 4 d (limite 3) são
  assert.deepEqual(ids, [sessaoMorta.id, donoMudo.id].sort());
});

test('porArquivo agrupa as não finais pelo arquivo', () => {
  const dir = nova();
  adicionar({ ...base, local: 'P.ts:1' }, dir);
  adicionar({ ...base, local: 'P.ts:200', classe: 'debito' }, dir);
  const r = adicionar({ ...base, local: 'Q.ts:1' }, dir);
  mudar(r.id, { estado: 'resolvida', destino: 'x' }, dir);
  const g = porArquivo(dir);
  assert.equal(g.length, 1);
  assert.equal(g[0][0], 'P.ts');
  assert.equal(g[0][1].length, 2);
});

test('sincronizar: mergeado que toca resolve; mergeado sem tocar só avisa; fechado reabre; em-sessao com PR aberto sobe', () => {
  const dir = nova();
  const toca = adicionar({ ...base, local: 'a.ts:1' }, dir);
  mudar(toca.id, { estado: 'em-pr', destino: 'x', pr: '10' }, dir);
  const naoToca = adicionar({ ...base, local: 'b.ts:1' }, dir);
  mudar(naoToca.id, { estado: 'em-pr', destino: 'x', pr: '11' }, dir);
  const fechado = adicionar({ ...base, local: 'c.ts:1' }, dir);
  mudar(fechado.id, { estado: 'em-pr', destino: 'x', pr: '12' }, dir);
  const sessao = adicionar({ ...base, local: 'd.ts:1' }, dir);
  mudar(sessao.id, { estado: 'em-sessao', destino: 'sessão z', pr: '13' }, dir);
  const semPr = adicionar({ ...base, local: 'e.ts:1' }, dir);
  mudar(semPr.id, { estado: 'em-sessao', destino: 'sessão w' }, dir);
  const prs = new Map([
    ['10', { state: 'MERGED', mergedAt: '2026-11-20T10:00:00Z' }], ['11', { state: 'MERGED', mergedAt: '2026-11-20' }],
    ['12', { state: 'CLOSED' }], ['13', { state: 'OPEN' }],
  ]);
  const arquivosDoPr = (n) => ({ 10: ['a.ts', 'z.ts'], 11: ['outro.ts'] })[n] ?? [];
  const sim = sincronizar(dir, { prs, arquivosDoPr, simular: true });
  assert.deepEqual(sim.resolvidas, [toca.id]);
  assert.ok(listar(dir).every((l) => l.estado !== 'resolvida'), 'simulação não grava');
  const r = sincronizar(dir, { prs, arquivosDoPr });
  assert.deepEqual(r.conferir.map((c) => c.id), [naoToca.id]);
  assert.deepEqual(r.reabertas, [fechado.id]);
  assert.deepEqual(r.promovidas, [sessao.id]);
  assert.deepEqual(r.semPr, [semPr.id]);
  const est = Object.fromEntries(listar(dir).map((l) => [l.id, l.estado]));
  assert.equal(est[toca.id], 'resolvida');
  assert.equal(est[naoToca.id], 'em-pr');
  assert.equal(est[fechado.id], 'aberta');
  assert.equal(est[sessao.id], 'em-pr');
});

test('prDaLacuna lê o PR do destino antigo só se o PR existir', () => {
  const prs = new Map([['1240', { state: 'MERGED' }]]);
  assert.equal(prDaLacuna({ pr: '', destino: 'PR #1240 (localização; dono: Sim)' }, prs), '1240');
  assert.equal(prDaLacuna({ pr: '', destino: 'ver #99 e #1240' }, prs), '1240');
  assert.equal(prDaLacuna({ pr: '', destino: 'item #7 do BRIEF' }, prs), '');
  assert.equal(prDaLacuna({ pr: '55', destino: '#1240' }, prs), '55');
});

test('pulso conta os estados e os dias desde o último despacho a em-sessao', () => {
  const dir = nova();
  assert.equal(pulso(dir).diasSemDespacho, null);
  const a = adicionar(base, dir, new Date('2026-11-10T12:00:00Z'));
  mudar(a.id, { estado: 'em-sessao', destino: 's' }, dir, new Date('2026-11-15T12:00:00Z'));
  adicionar({ ...base, local: 'n.ts:1' }, dir, new Date('2026-11-20T12:00:00Z'));
  const p = pulso(dir, new Date('2026-11-21T12:00:00Z'));
  assert.equal(p.diasSemDespacho, 6);
  assert.deepEqual(p.conta, { 'em-sessao': 1, aberta: 1 });
});

test('dreno: pede cartão com aberta e sem despacho há 1 dia; a marca segura por 1 dia', () => {
  const dir = nova();
  const a = adicionar(base, dir, new Date('2026-11-10T12:00:00Z'));
  assert.equal(pulso(dir, new Date('2026-11-21T12:00:00Z')).precisaDreno, true, 'nunca houve despacho');
  marcarDreno(dir, new Date('2026-11-21T08:00:00Z'));
  assert.equal(pulso(dir, new Date('2026-11-21T12:00:00Z')).precisaDreno, false, 'cartão proposto há 4 h');
  assert.equal(pulso(dir, new Date('2026-11-22T09:00:00Z')).precisaDreno, true, 'marca venceu');
  mudar(a.id, { estado: 'em-sessao', destino: 's' }, dir, new Date('2026-11-22T10:00:00Z'));
  adicionar({ ...base, local: 'n.ts:1' }, dir, new Date('2026-11-22T10:00:00Z'));
  assert.equal(pulso(dir, new Date('2026-11-22T12:00:00Z')).precisaDreno, false, 'despacho de hoje');
  assert.equal(listar(dir).length, 2, 'a marca não vira lacuna');
});

test('fork respondido volta à fila com a classe que a resposta definiu', () => {
  const dir = nova();
  const f = adicionar({ ...base, classe: 'fork' }, dir);
  triar(dir);
  assert.throws(() => mudar(f.id, { estado: 'aberta', destino: 'x', classe: 'melhoria' }, dir), /classe inválida/);
  const l = mudar(f.id, { estado: 'aberta', destino: 'dono, 21/11: opção (a)', classe: 'defeito' }, dir);
  assert.equal(l.classe, 'defeito');
  assert.deepEqual(triar(dir), [], 'não volta ao dono');
});

test('grupos liga por arquivo e por rodada, transitivamente; isolada fica fora', () => {
  const dir = nova();
  const a = adicionar({ ...base, local: 'P.ts:1' }, dir);
  const b = adicionar({ ...base, local: 'P.ts:90', classe: 'debito', rodada: 'fe-13-11' }, dir);
  const c = adicionar({ ...base, local: 'Q.tsx:4', rodada: 'fe-13-11' }, dir);
  adicionar({ ...base, local: 'sozinha.ts:1' }, dir);
  const gs = grupos(dir);
  assert.equal(gs.length, 1);
  assert.deepEqual(gs[0].membros.map((l) => l.id).sort(), [a.id, b.id, c.id].sort());
  assert.deepEqual(gs[0].arquivos, ['P.ts', 'Q.tsx']);
  assert.deepEqual(gs[0].rodadas, ['fe-13-11']);
  assert.equal(c.rodada, 'fe-13-11');
});

// L-…-d68b: gravar o destino de uma lacuna parada não pode zerar o relógio de `list --paradas`.
test('set no mesmo estado regrava o destino sem zerar o relógio das paradas nem contar como despacho', () => {
  const dir = nova();
  const velha = adicionar(base, dir, new Date('2026-11-10T12:00:00Z'));
  const agora = new Date('2026-11-21T12:00:00Z');
  mudar(velha.id, { estado: 'aberta', destino: 'grupo X → próximo maestro' }, dir, new Date('2026-11-20T12:00:00Z'));
  assert.equal(listar(dir)[0].destino, 'grupo X → próximo maestro');
  assert.deepEqual(paradas(dir, { agora }).map((l) => l.id), [velha.id], 'continua parada há 11 dias');
  assert.equal(paradas(dir, { agora })[0].idadeDias, 11);
  // em-sessao regravada no mesmo estado também não vira "despacho de hoje" no pulso
  const s = adicionar({ ...base, local: 's.ts:1' }, dir, new Date('2026-11-10T12:00:00Z'));
  mudar(s.id, { estado: 'em-sessao', destino: 'sessão a' }, dir, new Date('2026-11-10T13:00:00Z'));
  mudar(s.id, { estado: 'em-sessao', destino: 'sessão a (nota)' }, dir, new Date('2026-11-20T13:00:00Z'));
  assert.equal(pulso(dir, agora).ultimoDespacho, '2026-11-10T13:00:00.000Z');
  // mudar a classe é transição de verdade: zera o relógio
  mudar(velha.id, { estado: 'aberta', destino: 'fork respondido', classe: 'debito' }, dir, new Date('2026-11-21T11:00:00Z'));
  assert.deepEqual(paradas(dir, { agora }).map((l) => l.id).filter((id) => id === velha.id), []);
});

// L-…-a82c: a `aberta` que já traz o campo `pr` de um PR mergeado também resolve (ou sai em `conferir`).
test('sincronizar olha a aberta com campo pr: mergeado que toca resolve, sem tocar vai a conferir, PR fechado não mexe', () => {
  const dir = nova();
  const toca = adicionar({ ...base, local: 'a.ts:1', pr: '20' }, dir);
  const naoToca = adicionar({ ...base, local: 'b.ts:1', pr: '21' }, dir);
  const fechado = adicionar({ ...base, local: 'c.ts:1', pr: '22' }, dir);
  const semPr = adicionar({ ...base, local: 'd.ts:1' }, dir);
  const prs = new Map([['20', { state: 'MERGED', mergedAt: '2026-11-21T10:00:00Z' }], ['21', { state: 'MERGED' }], ['22', { state: 'CLOSED' }]]);
  const arquivosDoPr = (n) => ({ 20: ['a.ts'], 21: ['x.ts'] })[n] ?? [];
  const r = sincronizar(dir, { prs, arquivosDoPr });
  assert.deepEqual(r.resolvidas, [toca.id]);
  assert.deepEqual(r.conferir.map((c) => c.id), [naoToca.id]);
  assert.deepEqual(r.reabertas, []);
  assert.deepEqual(r.semPr, [], 'aberta sem PR é o normal, não é pendência');
  const est = Object.fromEntries(listar(dir).map((l) => [l.id, l.estado]));
  assert.equal(est[toca.id], 'resolvida');
  assert.equal(est[naoToca.id], 'aberta');
  assert.equal(est[fechado.id], 'aberta');
  assert.equal(est[semPr.id], 'aberta');
});

// L-…-cbc8 e L-…-2969: PR de ramo fechado sem merge cujo conteúdo entrou pela integração não reabre a lacuna.
test('PR fechado que um commit de integração da main cita conta como integrado, não como fechado sem merge', () => {
  const dir = nova();
  const integra = adicionar({ ...base, local: 'a.ts:1' }, dir);
  mudar(integra.id, { estado: 'em-pr', destino: 'x', pr: '30' }, dir);
  const abandonado = adicionar({ ...base, local: 'b.ts:1' }, dir);
  mudar(abandonado.id, { estado: 'em-pr', destino: 'x', pr: '31' }, dir);
  const prs = new Map([['30', { state: 'CLOSED' }], ['31', { state: 'CLOSED' }]]);
  const integrados = integradosDosTitulos([
    'integração: Onda 4 e DFe denegado (#30, #1351) (#1378)', 'fix: coisa (#31)', 'docs: integração do manual (#32)',
  ]);
  assert.deepEqual([...integrados].sort(), ['1351', '1378', '30'], 'só título que COMEÇA por integração conta');
  const r = sincronizar(dir, { prs, arquivosDoPr: () => ['a.ts'], integrados });
  assert.deepEqual(r.resolvidas, [integra.id]);
  assert.deepEqual(r.reabertas, [abandonado.id]);
  assert.match(listar(dir).find((l) => l.id === integra.id).destino, /integrado na main/);
});

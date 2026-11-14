#!/usr/bin/env node
// Caixa de lacunas: o caminho de toda lacuna, débito ou achado fora de escopo que uma sessão encontra até o
// maestro, que abre a sessão que o resolve (dono, chat, 2026-11-11: "se as sessões que estão realizando tarefas
// acharem lacunas, elas precisam enviar essas lacunas já direto pro orquestrador e o orquestrador já vai lançar
// outras sessões que vão resolver essas lacunas"). Regra: docs/plano/decisoes/D-2026-11-11-LACUNA-VAI-AO-MAESTRO.md.
//
// Onde fica: <git-common-dir>/lacunas/<id>.json — o `.git` da checkout principal, visível de toda worktree da
// máquina e nunca versionado. Um arquivo por lacuna (criado com `wx`), então sessões em paralelo não colidem.
// $LUMINARIS_LACUNAS_DIR troca a pasta (teste).
//
// Uso:
//   node scripts/lacunas.mjs add --local <arquivo:linha> --classe <classe> --o-que "<o que falta/está errado>"
//        --evidencia "<o que foi lido ou rodado>" [--como-provar "<teste ou comando que falharia>"]
//        [--no <NÓ>] [--pr <n>] [--pai <id da lacuna que originou esta sessão>]
//   node scripts/lacunas.mjs list [--abertas] [--json]
//   node scripts/lacunas.mjs show <id>
//   node scripts/lacunas.mjs set <id> --estado <estado> --destino "<sessão / PR / pergunta / motivo>"
//
// Classes: defeito · debito · spec (o BRIEF pedia e não foi feito) · feature (frente nova, sem spec) ·
//          fork (escolha de produto, lei, arquitetura ou irreversível) · gate (humano ou dado externo)
// Estados: aberta → em-sessao → em-pr → resolvida | com-dono | descartada (descartada exige o motivo no destino)

import { execFileSync } from 'node:child_process';
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { randomBytes } from 'node:crypto';

export const CLASSES = ['defeito', 'debito', 'spec', 'feature', 'fork', 'gate'];
export const ESTADOS = ['aberta', 'em-sessao', 'em-pr', 'resolvida', 'com-dono', 'descartada'];
export const FINAIS = ['resolvida', 'descartada'];
// Geração além disto (lacuna da lacuna da lacuna…) não abre sessão sozinha: vai ao dono como "repensar".
export const GERACAO_MAX = 3;

function git(args) {
  try { return execFileSync('git', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim(); }
  catch { return ''; }
}

export function pasta() {
  if (process.env.LUMINARIS_LACUNAS_DIR) return process.env.LUMINARIS_LACUNAS_DIR;
  const common = git(['rev-parse', '--git-common-dir']);
  if (!common) throw new Error('fora de um repositório git: defina LUMINARIS_LACUNAS_DIR');
  return join(resolve(common), 'lacunas');
}

function ler(dir, id) { return JSON.parse(readFileSync(join(dir, `${id}.json`), 'utf8')); }

export function listar(dir = pasta(), { abertas = false } = {}) {
  let nomes = [];
  try { nomes = readdirSync(dir).filter((n) => n.endsWith('.json')); } catch { return []; }
  const todas = nomes.map((n) => ler(dir, n.slice(0, -5))).sort((a, b) => a.criada.localeCompare(b.criada));
  return abertas ? todas.filter((l) => !FINAIS.includes(l.estado)) : todas;
}

export function adicionar(campos, dir = pasta(), agora = new Date()) {
  const faltam = ['local', 'classe', 'oQue', 'evidencia'].filter((k) => !campos[k] || !String(campos[k]).trim());
  if (faltam.length) throw new Error(`faltam campos: ${faltam.join(', ')} (lacuna sem evidência não entra)`);
  if (!CLASSES.includes(campos.classe)) throw new Error(`classe inválida: ${campos.classe} (use ${CLASSES.join(' · ')})`);
  mkdirSync(dir, { recursive: true });
  const dup = listar(dir, { abertas: true }).find((l) => l.local === campos.local && l.classe === campos.classe);
  if (dup) return { ...dup, duplicada: true };
  let geracao = 1;
  if (campos.pai) {
    try { geracao = (ler(dir, campos.pai).geracao ?? 1) + 1; } catch { throw new Error(`pai inexistente: ${campos.pai}`); }
  }
  const stamp = agora.toISOString().replace(/[-:]/g, '').slice(0, 15).replace('T', '-');
  const id = `L-${stamp}-${randomBytes(2).toString('hex')}`;
  const l = {
    id, criada: agora.toISOString(), estado: 'aberta', geracao,
    local: campos.local, classe: campos.classe, oQue: campos.oQue, evidencia: campos.evidencia,
    comoProvar: campos.comoProvar ?? '', no: campos.no ?? '', pr: campos.pr ?? '', pai: campos.pai ?? '',
    origem: { branch: campos.branch ?? git(['rev-parse', '--abbrev-ref', 'HEAD']), cwd: campos.cwd ?? process.cwd() },
    destino: '', historico: [{ em: agora.toISOString(), estado: 'aberta' }],
  };
  writeFileSync(join(dir, `${id}.json`), JSON.stringify(l, null, 2), { flag: 'wx' });
  return l;
}

export function mudar(id, { estado, destino }, dir = pasta(), agora = new Date()) {
  if (!ESTADOS.includes(estado)) throw new Error(`estado inválido: ${estado} (use ${ESTADOS.join(' · ')})`);
  if (!destino || !String(destino).trim()) throw new Error('--destino é obrigatório (sessão, PR, pergunta ou motivo)');
  const l = ler(dir, id);
  l.estado = estado; l.destino = destino;
  l.historico.push({ em: agora.toISOString(), estado, destino });
  writeFileSync(join(dir, `${id}.json`), JSON.stringify(l, null, 2));
  return l;
}

function flags(argv) {
  const o = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith('--')) { o._.push(a); continue; }
    const k = a.slice(2).replace(/-([a-z])/g, (_, c) => c.toUpperCase());
    const v = argv[i + 1];
    if (v === undefined || v.startsWith('--')) o[k] = true; else { o[k] = v; i++; }
  }
  return o;
}

function linha(l) {
  const alerta = l.geracao > GERACAO_MAX ? ' ⚠ geração > 3: ao dono' : '';
  return `${l.id} · ${l.estado} · ${l.classe} · ${l.local} · ger ${l.geracao}${alerta}\n    ${l.oQue}` +
    (l.destino ? `\n    → ${l.destino}` : '');
}

function main() {
  const [cmd, ...resto] = process.argv.slice(2);
  const f = flags(resto);
  if (cmd === 'add') {
    const l = adicionar({ local: f.local, classe: f.classe, oQue: f.oQue, evidencia: f.evidencia,
      comoProvar: f.comoProvar, no: f.no, pr: f.pr, pai: f.pai });
    console.log(l.duplicada ? `já estava na caixa: ${l.id}` : `na caixa: ${l.id}`);
  } else if (cmd === 'list') {
    const ls = listar(pasta(), { abertas: !!f.abertas });
    if (f.json) console.log(JSON.stringify(ls, null, 2));
    else console.log(ls.length ? ls.map(linha).join('\n') : '(caixa vazia)');
  } else if (cmd === 'show') {
    console.log(JSON.stringify(ler(pasta(), f._[0]), null, 2));
  } else if (cmd === 'set') {
    console.log(linha(mudar(f._[0], { estado: f.estado, destino: f.destino })));
  } else {
    console.error('uso: node scripts/lacunas.mjs add|list|show|set — ver o cabeçalho do arquivo');
    process.exit(2);
  }
}

const direto = process.argv[1] && resolve(process.argv[1]) === resolve(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'));
if (direto) {
  try { main(); } catch (e) { console.error(e.message); process.exit(1); }
}

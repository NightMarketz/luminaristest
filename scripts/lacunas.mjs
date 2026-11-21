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
// Alcance: este arquivo só existe em worktree cortada depois de 11/11 (#1233). `instalar` copia o script para
// ~/.claude/tools/lacunas/lacunas.mjs, e a cópia serve a worktree antiga e a qualquer outro repositório git da máquina
// (cada repositório tem a sua caixa, no próprio .git):
//   node "$HOME/.claude/tools/lacunas/lacunas.mjs" add …     (mesmos comandos, mesma caixa)
// Mudou o script? Suba VERSAO e rode `node scripts/lacunas.mjs instalar`; enquanto a cópia global estiver atrás, todo
// comando rodado daqui avisa no stderr. $LACUNAS_TOOLS_DIR troca a pasta da cópia (teste).
//
// Uso:
//   node scripts/lacunas.mjs add --local <arquivo:linha> --classe <classe> --o-que "<o que falta/está errado>"
//        --evidencia "<o que foi lido ou rodado>" [--como-provar "<teste ou comando que falharia>"]
//        [--no <NÓ>] [--pr <n>] [--pai <id da lacuna que originou esta sessão>]
//   node scripts/lacunas.mjs list [--abertas] [--paradas [dias]] [--json]
//   node scripts/lacunas.mjs show <id>
//   node scripts/lacunas.mjs set <id> --estado <estado> --destino "<sessão / PR / pergunta / motivo>" [--pr <n>]
//        (--estado em-pr exige --pr, ou um pr já gravado na lacuna)
//   node scripts/lacunas.mjs triar [--simular]   (fork, gate e geração > 3 abertos → com-dono; o passo 0 do maestro)
//   node scripts/lacunas.mjs instalar
//
// --local é caminho relativo à raiz do repositório onde o achado está. Caminho de fora dele (`../outra-worktree/…` ou
// absoluto alheio) é recusado: a lacuna vai na caixa da checkout onde o arquivo vive, ou no texto, sem caminho inventado.
//
// Classes: defeito · debito · spec (o BRIEF pedia e não foi feito) · feature (frente nova, sem spec) ·
//          fork (escolha de produto, lei, arquitetura ou irreversível) · gate (humano ou dado externo)
// Estados: aberta → em-sessao → em-pr → resolvida | com-dono | descartada (descartada exige o motivo no destino)

import { execFileSync } from 'node:child_process';
import { copyFileSync, mkdirSync, readdirSync, readFileSync, realpathSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomBytes } from 'node:crypto';

export const VERSAO = 3;
const EU = fileURLToPath(import.meta.url);
export const CLASSES = ['defeito', 'debito', 'spec', 'feature', 'fork', 'gate'];
export const ESTADOS = ['aberta', 'em-sessao', 'em-pr', 'resolvida', 'com-dono', 'descartada'];
export const FINAIS = ['resolvida', 'descartada'];
// Geração além disto (lacuna da lacuna da lacuna…) não abre sessão sozinha: vai ao dono como "repensar".
export const GERACAO_MAX = 3;
// Lacuna `aberta` há mais dias que isto sem destino é "parada": o maestro a lista no resumo com o motivo (OPS-007).
export const DIAS_PARADA = 3;
// Estas classes nunca abrem sessão sozinhas: o destino é sempre o dono (tabela §2 da D-2026-11-11).
export const CLASSES_DO_DONO = ['fork', 'gate'];

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

export function validarLocal(local, raiz = git(['rev-parse', '--show-toplevel'])) {
  const t = String(local).trim();
  if (/^\.\.([\\/]|$)/.test(t)) {
    throw new Error(`--local fora do repositório: ${t} (use caminho relativo à raiz; achado em outra checkout vai na caixa dela)`);
  }
  if (raiz && /^([a-zA-Z]:[\\/]|\/)/.test(t)) {
    const norm = (x) => x.replace(/\\/g, '/').toLowerCase();
    if (!norm(t).startsWith(norm(raiz).replace(/\/$/, '') + '/')) {
      throw new Error(`--local fora do repositório: ${t} (raiz: ${raiz})`);
    }
  }
}

export function adicionar(campos, dir = pasta(), agora = new Date()) {
  const faltam = ['local', 'classe', 'oQue', 'evidencia'].filter((k) => !campos[k] || !String(campos[k]).trim());
  if (faltam.length) throw new Error(`faltam campos: ${faltam.join(', ')} (lacuna sem evidência não entra)`);
  if (!CLASSES.includes(campos.classe)) throw new Error(`classe inválida: ${campos.classe} (use ${CLASSES.join(' · ')})`);
  validarLocal(campos.local);
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

export function paradas(dir = pasta(), { dias = DIAS_PARADA, agora = new Date() } = {}) {
  return listar(dir)
    .filter((l) => l.estado === 'aberta')
    .map((l) => ({ ...l, idadeDias: Math.floor((agora - new Date(l.criada)) / 86_400_000) }))
    .filter((l) => l.idadeDias >= dias);
}

// Passo 0 do maestro, sem julgamento: o que a tabela §2 manda ao dono vai ao dono já no primeiro ciclo.
export function triar(dir = pasta(), { simular = false, agora = new Date() } = {}) {
  const feitas = [];
  for (const l of listar(dir).filter((x) => x.estado === 'aberta')) {
    let destino = '';
    if (l.geracao > GERACAO_MAX) destino = 'geração > 3: repensar a abordagem (a cadeia não está convergindo)';
    else if (l.classe === 'fork') destino = 'fork: pergunta única do dia (AskUserQuestion com contexto)';
    else if (l.classe === 'gate') destino = 'gate humano ou dado externo: "Parado em mim"';
    if (!destino) continue;
    feitas.push({ id: l.id, classe: l.classe, destino });
    if (!simular) mudar(l.id, { estado: 'com-dono', destino }, dir, agora);
  }
  return feitas;
}

export function mudar(id, { estado, destino, pr }, dir = pasta(), agora = new Date()) {
  if (!ESTADOS.includes(estado)) throw new Error(`estado inválido: ${estado} (use ${ESTADOS.join(' · ')})`);
  if (!destino || !String(destino).trim()) throw new Error('--destino é obrigatório (sessão, PR, pergunta ou motivo)');
  const l = ler(dir, id);
  if (pr !== undefined && pr !== true) {
    const n = String(pr).replace(/^#/, '').trim();
    if (!/^\d+$/.test(n)) throw new Error(`--pr inválido: ${pr} (número do PR)`);
    l.pr = n;
  }
  if (estado === 'em-pr' && !l.pr) throw new Error('em-pr exige --pr <n>: sem o número a lacuna não se liga ao PR');
  l.estado = estado; l.destino = destino;
  l.historico.push({ em: agora.toISOString(), estado, destino, ...(l.pr ? { pr: l.pr } : {}) });
  writeFileSync(join(dir, `${id}.json`), JSON.stringify(l, null, 2));
  return l;
}

export function pastaGlobal() {
  return process.env.LACUNAS_TOOLS_DIR || join(homedir(), '.claude', 'tools', 'lacunas');
}

// 0 = não há cópia (ou não é este script).
function versaoDe(arquivo) {
  try { return Number(/^export const VERSAO = (\d+);/m.exec(readFileSync(arquivo, 'utf8'))?.[1] ?? 0); } catch { return 0; }
}

function mesmoArquivo(a, b) {
  try { return realpathSync(a).toLowerCase() === realpathSync(b).toLowerCase(); } catch { return false; }
}

export function instalar(dir = pastaGlobal()) {
  const alvo = join(dir, 'lacunas.mjs');
  if (mesmoArquivo(alvo, EU)) return alvo;
  const la = versaoDe(alvo);
  if (la > VERSAO) throw new Error(`a cópia global é mais nova (v${la}) que este script (v${VERSAO}): instale de uma worktree atualizada`);
  mkdirSync(dir, { recursive: true });
  copyFileSync(EU, alvo);
  return alvo;
}

function avisoCopiaGlobal() {
  const alvo = join(pastaGlobal(), 'lacunas.mjs');
  const la = versaoDe(alvo);
  if (la && la < VERSAO && !mesmoArquivo(alvo, EU)) {
    console.error(`aviso: a cópia global (${alvo}) está na v${la} e este script na v${VERSAO} — rode: node scripts/lacunas.mjs instalar`);
  }
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
    if (f.paradas) {
      const ps = paradas(pasta(), { dias: f.paradas === true ? DIAS_PARADA : Number(f.paradas) });
      console.log(ps.length ? ps.map((l) => `${linha(l)}\n    ⏱ aberta há ${l.idadeDias} dia(s) sem destino`).join('\n') : '(nenhuma parada)');
      avisoCopiaGlobal();
      return;
    }
    const ls = listar(pasta(), { abertas: !!f.abertas });
    if (f.json) console.log(JSON.stringify(ls, null, 2));
    else console.log(ls.length ? ls.map(linha).join('\n') : '(caixa vazia)');
  } else if (cmd === 'show') {
    console.log(JSON.stringify(ler(pasta(), f._[0]), null, 2));
  } else if (cmd === 'set') {
    console.log(linha(mudar(f._[0], { estado: f.estado, destino: f.destino, pr: f.pr })));
  } else if (cmd === 'triar') {
    const fs = triar(pasta(), { simular: !!f.simular });
    console.log(fs.length ? fs.map((x) => `${x.id} · ${x.classe} → com-dono · ${x.destino}`).join('\n') + (f.simular ? '\n(simulação: nada gravado)' : '') : '(nada a triar)');
  } else if (cmd === 'instalar') {
    console.log(`cópia global na v${VERSAO}: ${instalar()}`);
  } else {
    console.error('uso: node scripts/lacunas.mjs add|list|show|set|triar|instalar — ver o cabeçalho do arquivo');
    process.exit(2);
  }
  avisoCopiaGlobal();
}

// fileURLToPath + realpath: caminho com espaço, acento ou junction não pode fazer o script sair calado sem rodar.
const direto = process.argv[1] && mesmoArquivo(process.argv[1], EU);
if (direto) {
  try { main(); } catch (e) { console.error(e.message); process.exit(1); }
}

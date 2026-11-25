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
//        [--rodada <nome>]   (achado de rodada de revisão autorizada, não do caminho de uma tarefa)
//   node scripts/lacunas.mjs list [--abertas] [--paradas [dias]] [--por-arquivo] [--grupos] [--json]
//        --grupos: lacunas não finais ligadas por arquivo ou rodada em comum — cada grupo de 2+ vai a planejamento macro
//        --paradas: tempo no estado atual acima do limite (aberta 3 d · em-sessao 2 d · com-dono 3 d · em-pr 7 d)
//        --por-arquivo: lacunas não finais agrupadas por arquivo (o maestro não abre duas sessões no mesmo arquivo)
//   node scripts/lacunas.mjs show <id>
//   node scripts/lacunas.mjs set <id> --estado <estado> --destino "<sessão / PR / pergunta / motivo>" [--pr <n>]
//        (--estado em-pr exige --pr, ou um pr já gravado na lacuna) [--classe <classe>]
//        (fork respondido: `set <id> --estado aberta --classe <a que a resposta definiu> --destino "dono, <data>: <resposta>"`)
//   node scripts/lacunas.mjs triar [--simular]   (fork, gate e geração > 3 abertos → com-dono; o passo 0 do maestro)
//   node scripts/lacunas.mjs sincronizar [--simular]   (lê o GitHub com `gh`: PR mergeado que toca o arquivo → resolvida;
//        mergeado sem tocar → só avisa; fechado sem merge → aberta; em-sessao com PR aberto → em-pr)
//   node scripts/lacunas.mjs pulso [--marcar-dreno]   (uma linha: estados, paradas, dias desde o último despacho a
//        em-sessao e se é preciso propor o cartão "Drenar a caixa"; --marcar-dreno grava que o cartão foi proposto, e
//        por 1 dia nenhuma outra sessão o propõe de novo)
//   node scripts/lacunas.mjs instalar
//
// --local é caminho relativo à raiz do repositório onde o achado está. Caminho de fora dele (`../outra-worktree/…` ou
// absoluto alheio) é recusado: a lacuna vai na caixa da checkout onde o arquivo vive, ou no texto, sem caminho inventado.
//
// Classes: defeito · debito · spec (o BRIEF pedia e não foi feito) · feature (frente nova, sem spec) ·
//          fork (escolha de produto, lei, arquitetura ou irreversível) · gate (humano ou dado externo)
// Estados: aberta → em-sessao → em-pr → resolvida | com-dono | descartada (descartada exige o motivo no destino)
//
// Gravidade (obrigatória no add; D-2026-11-25-CRITERIO-DE-ENTRADA-DA-CAIXA): bug · gate · fiscal · melhoria · nit · estilo.
//   bug/gate/fiscal = meta do dreno (zerar); melhoria conta mas não é meta; nit/estilo ficam na caixa fora da contagem.
//   node scripts/lacunas.mjs add … --gravidade <g>
//   node scripts/lacunas.mjs classificar <id> --gravidade <g> --motivo "<por quê>"   (não muda estado nem relógio)
//   node scripts/lacunas.mjs list [--abertas] --gravidade <g|sem|meta>

import { execFileSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, realpathSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomBytes } from 'node:crypto';

export const VERSAO = 6;
const EU = fileURLToPath(import.meta.url);
export const CLASSES = ['defeito', 'debito', 'spec', 'feature', 'fork', 'gate'];
export const ESTADOS = ['aberta', 'em-sessao', 'em-pr', 'resolvida', 'com-dono', 'descartada'];
export const FINAIS = ['resolvida', 'descartada'];
// Geração além disto (lacuna da lacuna da lacuna…) não abre sessão sozinha: vai ao dono como "repensar".
export const GERACAO_MAX = 3;
// Lacuna `aberta` há mais dias que isto sem destino é "parada": o maestro a lista no resumo com o motivo (OPS-007).
export const DIAS_PARADA = 3;
// Dias no estado atual (desde a última transição, não desde a criação) até a lacuna contar como parada.
// em-sessao 2: sessão que morreu sem PR. com-dono 3: pergunta sem resposta, ou respondida e não devolvida à fila.
// em-pr 7: PR que não anda (o `sincronizar` cobre o PR mergeado ou fechado).
export const LIMITES_DIAS = { aberta: DIAS_PARADA, 'em-sessao': 2, 'com-dono': 3, 'em-pr': 7 };
// Estas classes nunca abrem sessão sozinhas: o destino é sempre o dono (tabela §2 da D-2026-11-11).
export const CLASSES_DO_DONO = ['fork', 'gate'];
// Gravidade (dono, 25/11): só bug, gate e risco fiscal são a meta do dreno; nit e estilo não entram na contagem.
export const GRAVIDADES = ['bug', 'gate', 'fiscal', 'melhoria', 'nit', 'estilo'];
export const META = ['bug', 'gate', 'fiscal'];
export const FORA_DA_CONTA = ['nit', 'estilo'];
// Lacuna legada (sem gravidade) conta como meta até ser classificada: sem ela não dá para saber se é bug.
export const ehMeta = (l) => !l.gravidade || META.includes(l.gravidade);
export const contaNaCaixa = (l) => !FORA_DA_CONTA.includes(l.gravidade);

export function validarGravidade(gravidade, classe) {
  if (!GRAVIDADES.includes(gravidade)) {
    throw new Error(`gravidade inválida: ${gravidade} (use ${GRAVIDADES.join(' · ')}; regra D-2026-11-25-CRITERIO-DE-ENTRADA-DA-CAIXA)`);
  }
  if (gravidade === 'bug' && classe !== 'defeito') throw new Error(`gravidade bug exige classe defeito (veio ${classe})`);
  if (classe === 'defeito' && !META.includes(gravidade)) {
    throw new Error(`classe defeito exige gravidade bug, gate ou fiscal (veio ${gravidade}); sem efeito de comportamento é debito`);
  }
  if (classe === 'gate' && gravidade !== 'gate') throw new Error(`classe gate exige gravidade gate (veio ${gravidade})`);
}

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

// O arquivo de `local`, sem linha, função ou comentário: "a/b.ts:10" → "a/b.ts"; "x.html (aba 4)" → "x.html".
export function arquivoDe(local) {
  return String(local).trim().replace(/\\/g, '/').replace(/\s+\(.*$/, '').replace(/^([a-zA-Z]:)?([^:]*):.*$/, '$1$2');
}

// Nada aqui bloqueia o registro (a fraqueza da regra é a lacuna que não entra): só avisa e anota.
function avisosDoAdd(campos, dir, raiz) {
  const avisos = [];
  let arq = arquivoDe(campos.local);
  // absoluto dentro da raiz (validarLocal já recusou o de fora): compara como relativo
  const r = raiz ? raiz.replace(/\\/g, '/').replace(/\/$/, '') + '/' : '';
  if (r && arq.toLowerCase().startsWith(r.toLowerCase())) arq = arq.slice(r.length);
  if (raiz && !existsSync(join(raiz, arq))) {
    avisos.push(`o arquivo ${arq} não existe nesta checkout (trabalho não commitado?): quem pegar a lacuna precisa da branch de origem`);
  }
  const vizinhas = listar(dir, { abertas: true }).filter((l) => arquivoDe(l.local) === arq);
  if (vizinhas.length) {
    avisos.push(`já há ${vizinhas.length} lacuna(s) não final(is) em ${arq}: ${vizinhas.map((l) => l.id).join(', ')} — a mesma sessão deve pegá-las`);
  }
  if (['defeito', 'debito'].includes(campos.classe) && !String(campos.comoProvar ?? '').trim()) {
    avisos.push('sem --como-provar: a sessão de correção vai ter de achar o teste ou comando que falha');
  }
  return { avisos, rastreado: raiz ? existsSync(join(raiz, arq)) : null };
}

export function adicionar(campos, dir = pasta(), agora = new Date()) {
  const faltam = ['local', 'classe', 'oQue', 'evidencia'].filter((k) => !campos[k] || !String(campos[k]).trim());
  if (faltam.length) throw new Error(`faltam campos: ${faltam.join(', ')} (lacuna sem evidência não entra)`);
  if (!CLASSES.includes(campos.classe)) throw new Error(`classe inválida: ${campos.classe} (use ${CLASSES.join(' · ')})`);
  if (!campos.gravidade || campos.gravidade === true) {
    throw new Error(`falta --gravidade (${GRAVIDADES.join(' · ')}): critério de entrada D-2026-11-25-CRITERIO-DE-ENTRADA-DA-CAIXA`);
  }
  validarGravidade(campos.gravidade, campos.classe);
  const raiz = campos.raiz ?? git(['rev-parse', '--show-toplevel']);
  validarLocal(campos.local, raiz);
  mkdirSync(dir, { recursive: true });
  const dup = listar(dir, { abertas: true }).find((l) => l.local === campos.local && l.classe === campos.classe);
  if (dup) return { ...dup, duplicada: true, avisos: [] };
  const { avisos, rastreado } = avisosDoAdd(campos, dir, raiz);
  let geracao = 1;
  if (campos.pai) {
    try { geracao = (ler(dir, campos.pai).geracao ?? 1) + 1; } catch { throw new Error(`pai inexistente: ${campos.pai}`); }
  }
  const stamp = agora.toISOString().replace(/[-:]/g, '').slice(0, 15).replace('T', '-');
  const id = `L-${stamp}-${randomBytes(2).toString('hex')}`;
  const l = {
    id, criada: agora.toISOString(), estado: 'aberta', geracao,
    local: campos.local, classe: campos.classe, gravidade: campos.gravidade, oQue: campos.oQue, evidencia: campos.evidencia,
    comoProvar: campos.comoProvar ?? '', no: campos.no ?? '', pr: campos.pr ?? '', pai: campos.pai ?? '',
    rodada: campos.rodada && campos.rodada !== true ? String(campos.rodada) : '',
    origem: { branch: campos.branch ?? git(['rev-parse', '--abbrev-ref', 'HEAD']), cwd: campos.cwd ?? process.cwd() },
    ...(rastreado === false ? { arquivoForaDaCheckout: true } : {}),
    destino: '', historico: [{ em: agora.toISOString(), estado: 'aberta' }],
  };
  writeFileSync(join(dir, `${id}.json`), JSON.stringify(l, null, 2), { flag: 'wx' });
  return { ...l, avisos };
}

// Desde quando a lacuna está no estado atual: a última transição do histórico, não a criação.
function desde(l) { return new Date(l.historico?.at(-1)?.em ?? l.criada); }

// `dias` sobrescreve o limite de todos os estados; sem ele, vale LIMITES_DIAS.
export function paradas(dir = pasta(), { dias, agora = new Date(), limites = LIMITES_DIAS } = {}) {
  return listar(dir)
    .filter((l) => l.estado in limites && contaNaCaixa(l))
    .map((l) => ({ ...l, idadeDias: Math.floor((agora - desde(l)) / 86_400_000) }))
    .filter((l) => l.idadeDias >= (dias ?? limites[l.estado]));
}

export function porArquivo(dir = pasta()) {
  const g = new Map();
  for (const l of listar(dir, { abertas: true })) {
    const a = arquivoDe(l.local);
    g.set(a, [...(g.get(a) ?? []), l]);
  }
  return [...g.entries()].sort((a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0]));
}

// Grupos (dono, 21/11: "Planeja como resolver tudo no macro em vez de vários remendos"): lacunas não finais ligadas por
// arquivo em comum ou pela mesma rodada, fechadas transitivamente. Grupo de 2+ vai a uma sessão de planejamento do
// grupo; lacuna sozinha segue a tabela §2 como antes.
// nit e estilo não formam grupo: vão de carona no PR que tocar o arquivo (D-2026-11-25 §3).
export function grupos(dir = pasta()) {
  const ls = listar(dir, { abertas: true }).filter(contaNaCaixa);
  const pai = ls.map((_, i) => i);
  const raiz = (i) => (pai[i] === i ? i : (pai[i] = raiz(pai[i])));
  const une = (a, b) => { pai[raiz(a)] = raiz(b); };
  const primeiro = new Map();
  ls.forEach((l, i) => {
    for (const chave of [`arq:${arquivoDe(l.local)}`, l.rodada ? `rod:${l.rodada}` : '']) {
      if (!chave) continue;
      if (primeiro.has(chave)) une(i, primeiro.get(chave)); else primeiro.set(chave, i);
    }
  });
  const g = new Map();
  ls.forEach((l, i) => g.set(raiz(i), [...(g.get(raiz(i)) ?? []), l]));
  return [...g.values()]
    .filter((m) => m.length > 1)
    .map((m) => ({
      membros: m,
      arquivos: [...new Set(m.map((l) => arquivoDe(l.local)))].sort(),
      rodadas: [...new Set(m.map((l) => l.rodada).filter(Boolean))].sort(),
    }))
    .sort((a, b) => b.membros.length - a.membros.length);
}

// O número do PR: o campo `pr` ou, nas lacunas antigas (antes da v3 o `set --pr` não gravava), o 1º "#n" do destino,
// aceito só se o PR existir no GitHub.
export function prDaLacuna(l, prs) {
  if (l.pr) return String(l.pr);
  for (const m of String(l.destino ?? '').matchAll(/#(\d{2,6})\b/g)) if (prs.has(m[1])) return m[1];
  return '';
}

// prs: Map(número → { state: OPEN|MERGED|CLOSED, mergedAt }); arquivosDoPr(n) → caminhos que o PR toca.
// PR mergeado só resolve a lacuna se tocar o arquivo dela: o #1240 mergeou sem tocar o arquivo da L-…-8a05 e ela teve
// de ser reaberta à mão. Mergeado sem tocar fica como está e sai em `conferir`.
export function sincronizar(dir, { prs, arquivosDoPr, simular = false, agora = new Date() }) {
  const r = { resolvidas: [], reabertas: [], promovidas: [], conferir: [], semPr: [] };
  for (const l of listar(dir).filter((x) => x.estado === 'em-pr' || x.estado === 'em-sessao')) {
    const n = prDaLacuna(l, prs);
    if (!n) { r.semPr.push(l.id); continue; }
    const p = prs.get(n);
    if (!p) continue;
    const arq = arquivoDe(l.local);
    let mud = null;
    if (p.state === 'MERGED') {
      if (arquivosDoPr(n).includes(arq)) {
        mud = { estado: 'resolvida', destino: `PR #${n} mergeado em ${String(p.mergedAt ?? '').slice(0, 10)} (sincronizar)` };
        r.resolvidas.push(l.id);
      } else r.conferir.push({ id: l.id, pr: n, arquivo: arq });
    } else if (p.state === 'CLOSED') {
      mud = { estado: 'aberta', destino: `PR #${n} fechado sem merge (sincronizar): volta à fila` };
      r.reabertas.push(l.id);
    } else if (p.state === 'OPEN' && l.estado === 'em-sessao') {
      mud = { estado: 'em-pr', destino: `PR #${n} aberto (sincronizar)` };
      r.promovidas.push(l.id);
    }
    if (mud && !simular) mudar(l.id, { ...mud, pr: n }, dir, agora);
  }
  return r;
}

// Pulso do despacho: a caixa só anda se uma sessão maestro rodar o passo 3b. O último `em-sessao` gravado é o sinal
// mais barato de que isso aconteceu.
// Dono, 21/11 ("Cartão de dreno"): sem despacho há 1 dia ou mais e com lacuna aberta, a sessão que registra propõe UM
// cartão "Drenar a caixa". A marca evita que cada sessão do dia proponha o seu.
const MARCA_DRENO = '_dreno.marca';
export function marcarDreno(dir = pasta(), agora = new Date()) {
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, MARCA_DRENO), agora.toISOString());
}

export function pulso(dir = pasta(), agora = new Date()) {
  const todas = listar(dir);
  const conta = {};
  for (const l of todas) conta[l.estado] = (conta[l.estado] ?? 0) + 1;
  const despachos = todas.flatMap((l) => (l.historico ?? []).filter((h) => h.estado === 'em-sessao').map((h) => h.em));
  const ultimo = despachos.sort().at(-1) ?? null;
  const diasSemDespacho = ultimo ? Math.floor((agora - new Date(ultimo)) / 86_400_000) : null;
  let marca = null;
  try { marca = new Date(readFileSync(join(dir, MARCA_DRENO), 'utf8').trim()); } catch { /* sem marca: nunca proposto */ }
  const marcaRecente = marca && !Number.isNaN(+marca) && agora - marca < 86_400_000;
  // Meta do dreno (dono, 25/11): bug, gate e fiscal não finais, não a caixa inteira. `com-dono` conta (gate humano só
  // zera quando o dono responde), mas só `aberta` de meta pede cartão: é o que um maestro consegue despachar.
  const naoFinais = todas.filter((l) => !FINAIS.includes(l.estado));
  const meta = naoFinais.filter(ehMeta).length;
  const semGravidade = naoFinais.filter((l) => !l.gravidade).length;
  const foraDaConta = naoFinais.filter((l) => !contaNaCaixa(l)).length;
  const metaAberta = todas.filter((l) => l.estado === 'aberta' && ehMeta(l)).length;
  const precisaDreno = metaAberta > 0 && (diasSemDespacho === null || diasSemDespacho >= 1) && !marcaRecente;
  return { conta, meta, metaAberta, semGravidade, foraDaConta, paradas: paradas(dir, { agora }).length, ultimoDespacho: ultimo, diasSemDespacho, precisaDreno };
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

// `classe`: fork ou gate respondido pelo dono volta à fila com a classe que a resposta definiu (defeito, feature…).
export function mudar(id, { estado, destino, pr, classe }, dir = pasta(), agora = new Date()) {
  if (!ESTADOS.includes(estado)) throw new Error(`estado inválido: ${estado} (use ${ESTADOS.join(' · ')})`);
  if (!destino || !String(destino).trim()) throw new Error('--destino é obrigatório (sessão, PR, pergunta ou motivo)');
  if (classe !== undefined && !CLASSES.includes(classe)) throw new Error(`classe inválida: ${classe} (use ${CLASSES.join(' · ')})`);
  const l = ler(dir, id);
  if (classe !== undefined) l.classe = classe;
  if (pr !== undefined && pr !== true) {
    const n = String(pr).replace(/^#/, '').trim();
    if (!/^\d+$/.test(n)) throw new Error(`--pr inválido: ${pr} (número do PR)`);
    l.pr = n;
  }
  if (estado === 'em-pr' && !l.pr) throw new Error('em-pr exige --pr <n>: sem o número a lacuna não se liga ao PR');
  l.estado = estado; l.destino = destino;
  l.historico.push({ em: agora.toISOString(), estado, destino, ...(l.pr ? { pr: l.pr } : {}), ...(classe ? { classe } : {}) });
  writeFileSync(join(dir, `${id}.json`), JSON.stringify(l, null, 2));
  return l;
}

// Gravidade de lacuna já gravada (caixa legada, ou reclassificação): não muda estado nem relógio das paradas, por isso
// vai a `classificacoes` e não ao `historico`.
export function classificar(id, { gravidade, motivo }, dir = pasta(), agora = new Date()) {
  if (!motivo || motivo === true || !String(motivo).trim()) throw new Error('--motivo é obrigatório (por que esta gravidade)');
  const l = ler(dir, id);
  validarGravidade(gravidade, l.classe);
  const de = l.gravidade ?? '';
  l.gravidade = gravidade;
  l.classificacoes = [...(l.classificacoes ?? []), { em: agora.toISOString(), de, para: gravidade, motivo: String(motivo) }];
  writeFileSync(join(dir, `${id}.json`), JSON.stringify(l, null, 2));
  return l;
}

export function filtrarGravidade(ls, g) {
  if (!g || g === true) return ls;
  if (g === 'sem') return ls.filter((l) => !l.gravidade);
  if (g === 'meta') return ls.filter(ehMeta);
  if (!GRAVIDADES.includes(g)) throw new Error(`--gravidade inválida: ${g} (use ${GRAVIDADES.join(' · ')} · sem · meta)`);
  return ls.filter((l) => l.gravidade === g);
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
  const alerta = (l.geracao > GERACAO_MAX ? ' ⚠ geração > 3: ao dono' : '') + (l.rodada ? ` · rodada ${l.rodada}` : '');
  return `${l.id} · ${l.estado} · ${l.classe}/${l.gravidade ?? 'sem gravidade'} · ${l.local} · ger ${l.geracao}${alerta}\n    ${l.oQue}` +
    (l.destino ? `\n    → ${l.destino}` : '');
}

function main() {
  const [cmd, ...resto] = process.argv.slice(2);
  const f = flags(resto);
  if (cmd === 'add') {
    const l = adicionar({ local: f.local, classe: f.classe, oQue: f.oQue, evidencia: f.evidencia,
      comoProvar: f.comoProvar, no: f.no, pr: f.pr, pai: f.pai, rodada: f.rodada, gravidade: f.gravidade });
    console.log(l.duplicada ? `já estava na caixa: ${l.id}` : `na caixa: ${l.id}`);
    for (const a of l.avisos ?? []) console.error(`aviso: ${a}`);
  } else if (cmd === 'list') {
    if (f.paradas) {
      const ps = paradas(pasta(), { dias: f.paradas === true ? undefined : Number(f.paradas) });
      console.log(ps.length ? ps.map((l) => `${linha(l)}\n    ⏱ ${l.estado} há ${l.idadeDias} dia(s)`).join('\n') : '(nenhuma parada)');
      avisoCopiaGlobal();
      return;
    }
    if (f.grupos) {
      const gs = grupos(pasta());
      console.log(gs.length ? gs.map((g) => `grupo de ${g.membros.length} · ${g.arquivos.join(', ')}` +
        (g.rodadas.length ? ` · rodada ${g.rodadas.join(', ')}` : '') +
        `\n    ${g.membros.map((l) => `${l.id} ${l.estado} ${l.classe}`).join('\n    ')}`).join('\n') : '(nenhum grupo: só lacunas isoladas)');
      avisoCopiaGlobal();
      return;
    }
    if (f.porArquivo) {
      const g = porArquivo(pasta());
      console.log(g.length ? g.map(([a, ls]) => `${ls.length} · ${a}\n    ${ls.map((l) => `${l.id.slice(-4)} ${l.estado} ${l.classe}`).join(' · ')}`).join('\n') : '(caixa vazia)');
      avisoCopiaGlobal();
      return;
    }
    const ls = filtrarGravidade(listar(pasta(), { abertas: !!f.abertas }), f.gravidade);
    if (f.json) console.log(JSON.stringify(ls, null, 2));
    else console.log(ls.length ? ls.map(linha).join('\n') : '(caixa vazia)');
  } else if (cmd === 'show') {
    console.log(JSON.stringify(ler(pasta(), f._[0]), null, 2));
  } else if (cmd === 'set') {
    console.log(linha(mudar(f._[0], { estado: f.estado, destino: f.destino, pr: f.pr, classe: f.classe })));
  } else if (cmd === 'classificar') {
    console.log(linha(classificar(f._[0], { gravidade: f.gravidade, motivo: f.motivo })));
  } else if (cmd === 'triar') {
    const fs = triar(pasta(), { simular: !!f.simular });
    console.log(fs.length ? fs.map((x) => `${x.id} · ${x.classe} → com-dono · ${x.destino}`).join('\n') + (f.simular ? '\n(simulação: nada gravado)' : '') : '(nada a triar)');
  } else if (cmd === 'sincronizar') {
    const gh = (args) => execFileSync('gh', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
    const lista = JSON.parse(gh(['pr', 'list', '--state', 'all', '--limit', '1000', '--json', 'number,state,mergedAt']));
    const prs = new Map(lista.map((p) => [String(p.number), p]));
    const cache = new Map();
    const arquivosDoPr = (n) => {
      if (!cache.has(n)) cache.set(n, gh(['pr', 'diff', n, '--name-only']).split(/\r?\n/).filter(Boolean));
      return cache.get(n);
    };
    const r = sincronizar(pasta(), { prs, arquivosDoPr, simular: !!f.simular });
    console.log(`resolvidas ${r.resolvidas.length} · reabertas ${r.reabertas.length} · em-sessao→em-pr ${r.promovidas.length}` +
      ` · sem número de PR ${r.semPr.length}${f.simular ? ' (simulação: nada gravado)' : ''}`);
    for (const c of r.conferir) console.log(`conferir: ${c.id} · PR #${c.pr} mergeado sem tocar ${c.arquivo}`);
    for (const id of r.semPr) console.log(`sem PR: ${id}`);
  } else if (cmd === 'pulso') {
    if (f.marcarDreno) marcarDreno(pasta());
    const p = pulso(pasta());
    const c = Object.entries(p.conta).map(([k, v]) => `${k} ${v}`).join(' · ');
    const d = p.diasSemDespacho === null ? 'nenhum despacho a em-sessao registrado' : `último despacho a em-sessao há ${p.diasSemDespacho} dia(s)`;
    console.log(`${c} · meta bug/gate/fiscal ${p.meta} · sem gravidade ${p.semGravidade} · nit/estilo ${p.foraDaConta} · paradas ${p.paradas} · ${d}`);
    if (p.precisaDreno) {
      console.log(`DRENO: proponha UM cartão "Drenar a caixa de lacunas (${p.metaAberta} de bug/gate/fiscal abertas)" e rode \`pulso --marcar-dreno\``);
    }
  } else if (cmd === 'instalar') {
    console.log(`cópia global na v${VERSAO}: ${instalar()}`);
  } else {
    console.error('uso: node scripts/lacunas.mjs add|list|show|set|classificar|triar|sincronizar|pulso|instalar — ver o cabeçalho do arquivo');
    process.exit(2);
  }
  avisoCopiaGlobal();
}

// fileURLToPath + realpath: caminho com espaço, acento ou junction não pode fazer o script sair calado sem rodar.
const direto = process.argv[1] && mesmoArquivo(process.argv[1], EU);
if (direto) {
  try { main(); } catch (e) { console.error(e.message); process.exit(1); }
}

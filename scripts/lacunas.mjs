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
//        (mesmo estado e sem --classe: só regrava o destino; não zera o relógio de --paradas nem conta como despacho)
//        (--estado em-pr exige --pr, ou um pr já gravado na lacuna) [--classe <classe>]
//        (fork respondido: `set <id> --estado aberta --classe <a que a resposta definiu> --destino "dono, <data>: <resposta>"`)
//   node scripts/lacunas.mjs triar [--simular]   (fork, gate e geração > 2 abertos → com-dono; o passo 0 do maestro)
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
// Matriz (obrigatória no add; D-2026-11-25-MATRIZ-DE-LACUNAS, que substitui o rótulo único da CRITERIO-DE-ENTRADA):
//   --dominio <fiscal|contabil|dados|operacao|produto|engenharia>
//   --gravidade <G1..G5> (classe defeito/debito: dano de ter) ou --impacto <G1..G5> (spec/feature/fork/gate: custo de não ter)
//   --exposicao <E1..E4> --deteccao <silencioso|ruidoso> --certeza <verificado|inferido|assumido>
//   [--gatilho regressao,norma,vazamento,persistido]   (qualquer gatilho dá piso P1)
//   G5 (nit/estilo) só pede o domínio: fica na caixa, fora da contagem, sem paradas nem grupos.
//   Prioridade P0–P3 derivada (nunca digitada); meta do dreno = P0 + P1 + P2 do domínio fiscal; prazo P0 1 d · P1 7 d · P2 30 d.
//   node scripts/lacunas.mjs classificar <id> --motivo "<por quê>" [eixos]   (reclassifica; não muda estado nem relógio)
//   node scripts/lacunas.mjs list [--abertas] --prioridade <P0|P1|P2|P3|meta|sem|atrasada>

import { execFileSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, realpathSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomBytes } from 'node:crypto';

export const VERSAO = 8;
const EU = fileURLToPath(import.meta.url);
export const CLASSES = ['defeito', 'debito', 'spec', 'feature', 'fork', 'gate'];
export const ESTADOS = ['aberta', 'em-sessao', 'em-pr', 'resolvida', 'com-dono', 'descartada'];
export const FINAIS = ['resolvida', 'descartada'];
// Geração além disto (lacuna da lacuna…) não abre sessão sozinha: vai ao dono como "repensar".
// Era 3; a D-2026-11-25-MATRIZ-DE-LACUNAS §8b baixou para 2.
export const GERACAO_MAX = 2;
// Lacuna `aberta` há mais dias que isto sem destino é "parada": o maestro a lista no resumo com o motivo (OPS-007).
export const DIAS_PARADA = 3;
// Dias no estado atual (desde a última transição, não desde a criação) até a lacuna contar como parada.
// em-sessao 2: sessão que morreu sem PR. com-dono 3: pergunta sem resposta, ou respondida e não devolvida à fila.
// em-pr 7: PR que não anda (o `sincronizar` cobre o PR mergeado ou fechado).
export const LIMITES_DIAS = { aberta: DIAS_PARADA, 'em-sessao': 2, 'com-dono': 3, 'em-pr': 7 };
// Estas classes nunca abrem sessão sozinhas: o destino é sempre o dono (tabela §2 da D-2026-11-11).
export const CLASSES_DO_DONO = ['fork', 'gate'];
// Matriz de 6 eixos (dono, 25/11 — D-2026-11-25-MATRIZ-DE-LACUNAS). A natureza é a `classe`; os outros cinco vêm aqui.
const REGRA = 'D-2026-11-25-MATRIZ-DE-LACUNAS';
export const DOMINIOS = ['fiscal', 'contabil', 'dados', 'operacao', 'produto', 'engenharia'];
export const NIVEIS = ['G1', 'G2', 'G3', 'G4', 'G5'];
export const EXPOSICOES = ['E1', 'E2', 'E3', 'E4'];
export const DETECCOES = ['silencioso', 'ruidoso'];
export const CERTEZAS = ['verificado', 'inferido', 'assumido'];
export const GATILHOS = ['regressao', 'norma', 'vazamento', 'persistido'];
// Defeito e débito medem o dano de ter (`gravidade`); o resto mede o custo de não ter (`impacto`), na mesma escala (R6).
export const CLASSES_DE_DANO = ['defeito', 'debito'];
export const campoDoNivel = (classe) => (CLASSES_DE_DANO.includes(classe) ? 'gravidade' : 'impacto');
export const PRAZO_DIAS = { P0: 1, P1: 7, P2: 30 };
export const EIXOS = ['dominio', 'gravidade', 'impacto', 'exposicao', 'deteccao', 'certeza', 'gatilhos'];

export const nivelDe = (l) => (NIVEIS.includes(l[campoDoNivel(l.classe)]) ? l[campoDoNivel(l.classe)] : null);
// G5 = nit/estilo: na caixa, fora da contagem.
export const contaNaCaixa = (l) => nivelDe(l) !== 'G5';

// §3 da decisão: tabela gravidade × exposição; silencioso sobe só P3→P2 e P2→P1, e não em E4 (R1); G1 nunca abaixo de
// P1 (R2, já na tabela); qualquer gatilho dá piso P1 (R3). G5 e lacuna sem matriz não têm prioridade (null).
export function prioridade(l) {
  const g = nivelDe(l);
  if (!g || g === 'G5' || !EXPOSICOES.includes(l.exposicao)) return null;
  const perto = l.exposicao === 'E1' || l.exposicao === 'E2';
  let p = { G1: perto ? 0 : 1, G2: perto ? 1 : 2, G3: 2, G4: 3 }[g];
  if (l.deteccao === 'silencioso' && l.exposicao !== 'E4' && p >= 2) p -= 1;
  if ((l.gatilhos ?? []).length && p > 1) p = 1;
  return `P${p}`;
}

// Meta do dreno: P0 + P1 + P2 do domínio fiscal. Lacuna sem matriz (caixa legada) conta como meta até ser classificada.
export function ehMeta(l) {
  if (!nivelDe(l)) return true;
  const p = prioridade(l);
  return p === 'P0' || p === 'P1' || (p === 'P2' && l.dominio === 'fiscal');
}

// Prazo contado da última classificação (ou do registro). P3 e G5 não têm prazo.
export function atrasada(l, agora = new Date()) {
  const dias = PRAZO_DIAS[prioridade(l)];
  if (!dias || FINAIS.includes(l.estado)) return false;
  const desde = new Date(l.classificacoes?.at(-1)?.em ?? l.criada);
  return agora - desde > dias * 86_400_000;
}

function lista(v) {
  if (v === undefined || v === '' || v === true) return [];
  return (Array.isArray(v) ? v : String(v).split(',')).map((x) => x.trim()).filter(Boolean);
}

// Valida a matriz completa de uma lacuna (já mesclada). Devolve os eixos normalizados.
export function validarMatriz(m, classe) {
  const campo = campoDoNivel(classe);
  const outro = campo === 'gravidade' ? 'impacto' : 'gravidade';
  if (m[outro] !== undefined && m[outro] !== '') {
    throw new Error(`classe ${classe} usa --${campo}, não --${outro} (dano de ter × custo de não ter; ${REGRA} R6)`);
  }
  const nivel = m[campo];
  if (!NIVEIS.includes(nivel)) throw new Error(`falta --${campo} <${NIVEIS.join('|')}> ou valor inválido (${nivel ?? 'vazio'}; ${REGRA})`);
  if (!DOMINIOS.includes(m.dominio)) throw new Error(`falta --dominio <${DOMINIOS.join('|')}> ou valor inválido (${m.dominio ?? 'vazio'})`);
  if (classe === 'defeito' && nivel === 'G5') throw new Error('classe defeito não aceita G5: sem efeito de comportamento é debito');
  const gatilhos = lista(m.gatilhos);
  for (const g of gatilhos) if (!GATILHOS.includes(g)) throw new Error(`gatilho inválido: ${g} (use ${GATILHOS.join(' · ')})`);
  const out = { dominio: m.dominio, [campo]: nivel };
  if (nivel === 'G5') return out;
  for (const [k, vals] of [['exposicao', EXPOSICOES], ['deteccao', DETECCOES], ['certeza', CERTEZAS]]) {
    if (!vals.includes(m[k])) throw new Error(`falta --${k} <${vals.join('|')}> ou valor inválido (${m[k] ?? 'vazio'}; ${REGRA})`);
    out[k] = m[k];
  }
  out.gatilhos = gatilhos;
  return out;
}

// Só os eixos presentes em `campos` (CLI ou chamada), sem `true` de flag vazia.
function eixosDe(campos) {
  const o = {};
  for (const k of EIXOS) {
    const v = k === 'gatilhos' ? (campos.gatilhos ?? campos.gatilho) : campos[k];
    if (v !== undefined && v !== true) o[k] = v;
  }
  return o;
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
  const matriz = validarMatriz(eixosDe(campos), campos.classe);
  const raiz = campos.raiz ?? git(['rev-parse', '--show-toplevel']);
  validarLocal(campos.local, raiz);
  mkdirSync(dir, { recursive: true });
  const dup = listar(dir, { abertas: true }).find((l) => l.local === campos.local && l.classe === campos.classe);
  if (dup) return { ...dup, duplicada: true, avisos: [] };
  const { avisos, rastreado } = avisosDoAdd(campos, dir, raiz);
  let geracao = 1;
  if (campos.pai) {
    try { geracao = (ler(dir, campos.pai).geracao ?? 1) + 1; } catch { throw new Error(`pai inexistente: ${campos.pai}`); }
    // §8b: sessão aberta para lacuna só registra filha da meta; o resto vai descrito no relatório, sem add.
    if (!ehMeta({ classe: campos.classe, ...matriz })) {
      throw new Error(`lacuna filha fora da meta (${prioridade({ classe: campos.classe, ...matriz }) ?? 'G5'}): descreva no relatório, sem add (${REGRA} §8b)`);
    }
  }
  const stamp = agora.toISOString().replace(/[-:]/g, '').slice(0, 15).replace('T', '-');
  const id = idLivre(dir, stamp);
  const l = {
    id, criada: agora.toISOString(), estado: 'aberta', geracao,
    local: campos.local, classe: campos.classe, ...matriz, oQue: campos.oQue, evidencia: campos.evidencia,
    comoProvar: campos.comoProvar ?? '', no: campos.no ?? '', pr: campos.pr ?? '', pai: campos.pai ?? '',
    rodada: campos.rodada && campos.rodada !== true ? String(campos.rodada) : '',
    origem: { branch: campos.branch ?? git(['rev-parse', '--abbrev-ref', 'HEAD']), cwd: campos.cwd ?? process.cwd() },
    ...(rastreado === false ? { arquivoForaDaCheckout: true } : {}),
    destino: '', historico: [{ em: agora.toISOString(), estado: 'aberta' }],
  };
  writeFileSync(join(dir, `${id}.json`), JSON.stringify(l, null, 2), { flag: 'wx' });
  return { ...l, avisos };
}

// Id = timestamp (s) + 2 bytes aleatórios. Duas lacunas no mesmo segundo podiam sortear o mesmo sufixo e o `wx` dava
// EEXIST (L-…-42c9: derrubou o CI 'Scripts – node --test' no #1405). Sorteia de novo até achar um nome livre na pasta.
export function idLivre(dir, stamp, sorteio = () => randomBytes(2).toString('hex')) {
  for (let i = 0; i < 64; i++) {
    const id = `L-${stamp}-${sorteio()}`;
    if (!existsSync(join(dir, `${id}.json`))) return id;
  }
  throw new Error(`sem id livre para ${stamp} depois de 64 sorteios`);
}

// Desde quando a lacuna está no estado atual: a última transição do histórico, não a criação. Entrada `semTransicao`
// (só regravou o destino no mesmo estado, L-…-d68b) não zera o relógio.
function desde(l) {
  const h = (l.historico ?? []).filter((x) => !x.semTransicao);
  return new Date(h.at(-1)?.em ?? l.criada);
}

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

// prs: Map(número → { state: OPEN|MERGED|CLOSED, mergedAt }); arquivosDoPr(n) → caminhos que o PR toca;
// integrados: Set dos números de PR citados em commits de integração da main (um PR de ramo fechado sem merge cujo
// conteúdo entrou na main pelo PR `integração: …` de cima — L-…-cbc8 e L-…-2969 foram reabertos por engano).
// PR mergeado só resolve a lacuna se tocar o arquivo dela: o #1240 mergeou sem tocar o arquivo da L-…-8a05 e ela teve
// de ser reaberta à mão. Mergeado sem tocar fica como está e sai em `conferir`.
// Também olha a `aberta` que já traz o campo `pr` (L-…-a82c): se o PR mergeou, a lacuna sai em `conferir` (não resolve
// sozinha: o `pr` dela pode ser o PR onde o achado nasceu).
export function sincronizar(dir, { prs, arquivosDoPr, integrados = new Set(), simular = false, agora = new Date() }) {
  const r = { resolvidas: [], reabertas: [], promovidas: [], conferir: [], semPr: [] };
  for (const l of listar(dir).filter((x) => x.estado === 'em-pr' || x.estado === 'em-sessao' || (x.estado === 'aberta' && x.pr))) {
    const n = prDaLacuna(l, prs);
    if (!n) { if (l.estado !== 'aberta') r.semPr.push(l.id); continue; }
    const p = prs.get(n);
    if (!p) continue;
    const arq = arquivoDe(l.local);
    const porIntegracao = p.state === 'CLOSED' && integrados.has(n);
    let mud = null;
    if ((p.state === 'MERGED' || porIntegracao) && l.estado === 'aberta') {
      // `pr` numa lacuna `aberta` costuma ser o PR onde o achado apareceu ("resto fora do PR"), não o que o corrige:
      // mergeou, então um humano confere o diff; resolver sozinho fecharia lacuna que o PR citou e não tocou.
      r.conferir.push({ id: l.id, pr: n, arquivo: arq });
    } else if (p.state === 'MERGED' || porIntegracao) {
      if (arquivosDoPr(n).includes(arq)) {
        mud = porIntegracao
          ? { estado: 'resolvida', destino: `PR #${n} integrado na main por commit de integração (sincronizar)` }
          : { estado: 'resolvida', destino: `PR #${n} mergeado em ${String(p.mergedAt ?? '').slice(0, 10)} (sincronizar)` };
        r.resolvidas.push(l.id);
      } else r.conferir.push({ id: l.id, pr: n, arquivo: arq });
    } else if (p.state === 'CLOSED' && l.estado !== 'aberta') {
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

// Números de PR citados nos títulos de commit que começam por "integração" (squash de um PR de integração).
export function integradosDosTitulos(titulos) {
  const out = new Set();
  for (const t of titulos) {
    if (!/^integra[cç][aã]o\b/i.test(t)) continue;
    for (const m of t.matchAll(/#(\d{2,6})\b/g)) out.add(m[1]);
  }
  return out;
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
  const despachos = todas.flatMap((l) => (l.historico ?? []).filter((h) => h.estado === 'em-sessao' && !h.semTransicao).map((h) => h.em));
  const ultimo = despachos.sort().at(-1) ?? null;
  const diasSemDespacho = ultimo ? Math.floor((agora - new Date(ultimo)) / 86_400_000) : null;
  let marca = null;
  try { marca = new Date(readFileSync(join(dir, MARCA_DRENO), 'utf8').trim()); } catch { /* sem marca: nunca proposto */ }
  const marcaRecente = marca && !Number.isNaN(+marca) && agora - marca < 86_400_000;
  // Meta do dreno (dono, 25/11, D-2026-11-25-MATRIZ-DE-LACUNAS §3): P0 + P1 + fiscal P2 não finais, não a caixa
  // inteira. `com-dono` conta (gate humano só zera quando o dono responde), mas só `aberta` de meta pede cartão.
  // Dano (gravidade) e falta (impacto) saem em contagens separadas (R6).
  const naoFinais = todas.filter((l) => !FINAIS.includes(l.estado));
  const metaLs = naoFinais.filter(ehMeta);
  const semMatriz = naoFinais.filter((l) => !nivelDe(l)).length;
  const metaDano = metaLs.filter((l) => nivelDe(l) && campoDoNivel(l.classe) === 'gravidade').length;
  const metaFalta = metaLs.filter((l) => nivelDe(l) && campoDoNivel(l.classe) === 'impacto').length;
  const foraDaConta = naoFinais.filter((l) => !contaNaCaixa(l)).length;
  const atrasadas = naoFinais.filter((l) => atrasada(l, agora)).length;
  const metaAberta = todas.filter((l) => l.estado === 'aberta' && ehMeta(l)).length;
  const precisaDreno = metaAberta > 0 && (diasSemDespacho === null || diasSemDespacho >= 1) && !marcaRecente;
  return { conta, meta: metaLs.length, metaDano, metaFalta, metaAberta, semMatriz, foraDaConta, atrasadas, backlog: backlog(todas).length,
    paradas: paradas(dir, { agora }).length, ultimoDespacho: ultimo, diasSemDespacho, precisaDreno };
}

// Passo 0 do maestro, sem julgamento: o que a tabela §2 manda ao dono vai ao dono já no primeiro ciclo.
export function triar(dir = pasta(), { simular = false, agora = new Date() } = {}) {
  const feitas = [];
  for (const l of listar(dir).filter((x) => x.estado === 'aberta')) {
    let destino = '';
    if (l.geracao > GERACAO_MAX) destino = 'geração > 2: repensar a abordagem (a cadeia não está convergindo)';
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
  // Mesmo estado e mesma classe: só regrava o destino (d68b). A entrada fica no histórico, mas não conta como transição.
  const semTransicao = estado === l.estado && classe === undefined;
  l.estado = estado; l.destino = destino;
  l.historico.push({ em: agora.toISOString(), estado, destino, ...(l.pr ? { pr: l.pr } : {}), ...(classe ? { classe } : {}), ...(semTransicao ? { semTransicao: true } : {}) });
  writeFileSync(join(dir, `${id}.json`), JSON.stringify(l, null, 2));
  return l;
}

// Matriz de lacuna já gravada (caixa legada, ou reclassificação): mescla os eixos dados sobre os que a lacuna tem e
// valida o resultado inteiro. Não muda estado nem relógio das paradas, por isso vai a `classificacoes` e não ao
// `historico`; cada entrada guarda o de → para só dos eixos que mudaram. O prazo da prioridade recomeça daqui.
// Valor que não é da matriz (ex.: `gravidade: 'bug'` do rótulo único) é descartado na mescla: conta como sem matriz.
export function classificar(id, campos, dir = pasta(), agora = new Date()) {
  const { motivo } = campos;
  if (!motivo || motivo === true || !String(motivo).trim()) throw new Error('--motivo é obrigatório (por que esta classificação)');
  const l = ler(dir, id);
  const atual = {};
  for (const k of EIXOS) if (l[k] !== undefined) atual[k] = l[k];
  for (const k of ['gravidade', 'impacto']) if (atual[k] !== undefined && !NIVEIS.includes(atual[k])) delete atual[k];
  // Classe trocada por `set --classe` (fork respondido vira defeito…): o nível do outro lado não vale mais.
  delete atual[campoDoNivel(l.classe) === 'gravidade' ? 'impacto' : 'gravidade'];
  const pedido = eixosDe(campos);
  const nova = validarMatriz({ ...atual, ...pedido }, l.classe);
  const mudou = {};
  for (const k of EIXOS) {
    const de = l[k] ?? null; const para = nova[k] ?? null;
    if (JSON.stringify(de) !== JSON.stringify(para)) mudou[k] = { de, para };
    if (para === null) delete l[k]; else l[k] = para;
  }
  if (campos.admitir) {
    if (!ehMeta(l) && !admitida(l)) mudou.admitida = { de: null, para: true };
    l.admitida = { em: agora.toISOString(), motivo: String(motivo) };
  }
  l.classificacoes = [...(l.classificacoes ?? []), { em: agora.toISOString(), mudou, motivo: String(motivo) }];
  writeFileSync(join(dir, `${id}.json`), JSON.stringify(l, null, 2));
  return l;
}

// §7 Admissão: o maestro despacha só a meta e fork/gate (que vão ao dono). O resto `aberta` de G1–G4 é backlog, fora
// do despacho, ordenado por P; o dono o revê por semana e promove com `classificar --admitir --motivo`. G5 vai de carona.
export const admitida = (l) => !!l.admitida;
export const despachavel = (l) => ehMeta(l) || admitida(l) || CLASSES_DO_DONO.includes(l.classe);
export function backlog(ls) {
  return ls.filter((l) => l.estado === 'aberta' && nivelDe(l) && contaNaCaixa(l) && !despachavel(l))
    .sort((a, b) => (prioridade(a) ?? 'P9').localeCompare(prioridade(b) ?? 'P9') || a.criada.localeCompare(b.criada));
}

export function filtrarPrioridade(ls, p, agora = new Date()) {
  if (!p || p === true) return ls;
  if (p === 'sem') return ls.filter((l) => !nivelDe(l));
  if (p === 'meta') return ls.filter(ehMeta);
  if (p === 'atrasada') return ls.filter((l) => atrasada(l, agora));
  if (!['P0', 'P1', 'P2', 'P3'].includes(p)) throw new Error(`--prioridade inválida: ${p} (use P0 · P1 · P2 · P3 · meta · sem · atrasada)`);
  return ls.filter((l) => prioridade(l) === p);
}

export function rotuloMatriz(l) {
  const g = nivelDe(l);
  if (!g) return 'sem matriz';
  if (g === 'G5') return `G5 · ${l.dominio}`;
  const gat = (l.gatilhos ?? []).length ? ` · gatilho ${l.gatilhos.join('+')}` : '';
  return `${prioridade(l)} (${g}·${l.exposicao}·${l.deteccao}·${l.certeza}·${l.dominio}${gat})`;
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
  const alerta = (l.geracao > GERACAO_MAX ? ' ⚠ geração > 2: ao dono' : '') + (l.rodada ? ` · rodada ${l.rodada}` : '');
  const atraso = atrasada(l) ? ' · ⏰ prazo vencido' : '';
  return `${l.id} · ${l.estado} · ${l.classe} ${rotuloMatriz(l)} · ${l.local} · ger ${l.geracao}${alerta}${atraso}\n    ${l.oQue}` +
    (l.destino ? `\n    → ${l.destino}` : '');
}

function main() {
  const [cmd, ...resto] = process.argv.slice(2);
  const f = flags(resto);
  if (cmd === 'add') {
    const l = adicionar({ local: f.local, classe: f.classe, oQue: f.oQue, evidencia: f.evidencia,
      comoProvar: f.comoProvar, no: f.no, pr: f.pr, pai: f.pai, rodada: f.rodada, ...eixosDe(f) });
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
    if (f.backlog) {
      const b = backlog(listar(pasta()));
      console.log(b.length ? b.map(linha).join('\n') : '(backlog vazio)');
      avisoCopiaGlobal();
      return;
    }
    if (f.gravidade !== undefined && f.prioridade === undefined) {
      throw new Error('list --gravidade saiu na v7: use --prioridade <P0|P1|P2|P3|meta|sem|atrasada> (D-2026-11-25-MATRIZ-DE-LACUNAS)');
    }
    const ls = filtrarPrioridade(listar(pasta(), { abertas: !!f.abertas }), f.prioridade);
    if (f.json) console.log(JSON.stringify(ls, null, 2));
    else console.log(ls.length ? ls.map(linha).join('\n') : '(caixa vazia)');
  } else if (cmd === 'show') {
    console.log(JSON.stringify(ler(pasta(), f._[0]), null, 2));
  } else if (cmd === 'set') {
    console.log(linha(mudar(f._[0], { estado: f.estado, destino: f.destino, pr: f.pr, classe: f.classe })));
  } else if (cmd === 'classificar') {
    console.log(linha(classificar(f._[0], { ...eixosDe(f), motivo: f.motivo, admitir: !!f.admitir })));
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
    // Commits de integração da main citam os PRs de ramo no título ("integração: Onda 4 (#1345, #1349) (#1378)").
    let integrados = new Set();
    try {
      const subj = execFileSync('git', ['log', 'origin/main', '--since=60.days', '--format=%s'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
      integrados = integradosDosTitulos(subj.split(/\r?\n/));
    } catch { /* sem origin/main: só o estado do GitHub decide */ }
    const r = sincronizar(pasta(), { prs, arquivosDoPr, integrados, simular: !!f.simular });
    console.log(`resolvidas ${r.resolvidas.length} · reabertas ${r.reabertas.length} · em-sessao→em-pr ${r.promovidas.length}` +
      ` · sem número de PR ${r.semPr.length}${f.simular ? ' (simulação: nada gravado)' : ''}`);
    for (const c of r.conferir) console.log(`conferir: ${c.id} · PR #${c.pr} mergeado sem tocar ${c.arquivo}`);
    for (const id of r.semPr) console.log(`sem PR: ${id}`);
  } else if (cmd === 'pulso') {
    if (f.marcarDreno) marcarDreno(pasta());
    const p = pulso(pasta());
    const c = Object.entries(p.conta).map(([k, v]) => `${k} ${v}`).join(' · ');
    const d = p.diasSemDespacho === null ? 'nenhum despacho a em-sessao registrado' : `último despacho a em-sessao há ${p.diasSemDespacho} dia(s)`;
    console.log(`${c} · meta ${p.meta} (dano ${p.metaDano} · falta ${p.metaFalta} · sem matriz ${p.semMatriz}) · atrasadas ${p.atrasadas}` +
      ` · backlog ${p.backlog} · G5 ${p.foraDaConta} · paradas ${p.paradas} · ${d}`);
    if (p.precisaDreno) {
      console.log(`DRENO: proponha UM cartão "Drenar a caixa de lacunas (${p.metaAberta} de meta P0/P1/fiscal P2 abertas)" e rode \`pulso --marcar-dreno\``);
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

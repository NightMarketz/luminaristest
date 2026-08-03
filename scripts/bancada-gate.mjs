#!/usr/bin/env node
// Gate da BANCADA — a bancada aplicada a si mesma.
//
// Origem: três rodadas (AV-R1, AV-R2, AV-R3) produziram 7 achados sobre o código e 7
// defeitos sobre os próprios instrumentos. Os sete defeitos foram pegos por acidente, no
// meio da execução. Nada na bancada os teria pegado — ela era prosa descrevendo regras,
// sem nenhuma checagem que lesse o artefato.
//
// POR QUE ESTE SCRIPT NÃO CONFERE PROSA. A regra do projeto é dura: regra com consequência
// exige gate que leia o APP, não o texto que descreve a regra. Então aqui nada é validado
// por "o instrumento fala sobre X" — o que se valida é estrutura resolvível (um srcId que
// aponta para um bloco que existe) e conteúdo emitido (um JSON que bate com o contrato que
// ele mesmo declara seguir).
//
// O QUE GARANTE:
//   B1  todo srcId do catálogo resolve para um bloco <script id> presente — e todo srcId
//       do arquivo está preso a um item que o parser leu (guarda de cobertura)
//   B2  todo bloco t-* é referenciado por algum item (sem fiação órfã)
//   B3  todo centerpiece.type emitido está declarado no contrato, e vice-versa
//   B4  todo JSON auditoria/1.1 carrega o envelope completo, sem `severity`
//   B5  todo achado tem evidence, falsificador (ou static_gap) e checagem adversarial
//   B6  damage >= 4 exige demonstration, ou rebaixamento registrado (AV-00 §6b)
//   B7  exposure e barrier_kind dentro das listas fechadas (inclui a emenda v4.1)
//   B8  teto de confiança do AV-00 §2.2: ratio > 0.70 proíbe confiança alta por revisão
//   B9  instrumento marcado v4 (ou v4.x) carrega os blocos 4b e 6b, ou se isenta por
//       v4patch — e nesse caso a emenda compartilhada tem de existir e suprir os dois
//   B11 todo triagem/1.0 tem items não vazio, source_run(s), gates_summary e self_check
//   B12 todo fingerprint da triagem é cópia literal de um fingerprint de relatório emitido
//   B13 todo item declara verification dentro da lista fechada
//   B14 portão dentro da lista fechada; portão que não é aceite nem descarte exige owner e
//       due; aceite exige accepted_reason, accepted_by e review_trigger OBSERVÁVEL
//   B15 self_check.falsifiers_executed/total coerentes com os itens
//   B16 os três campos do precedente AV-L1: verification_note, barriers_searched, own_bias_named
//
// POR QUE B11..B16 EXISTEM. O AV-00 inteiro existe para produzir UM artefato — a triagem — e
// era o único sem nenhuma checagem: a linha `if (j.schema !== 'auditoria/1.1') continue`
// tirava triagem/1.0 de todo o escopo do gate. Achado #4 da revisão independente do PR #164.
// Falsificador que provou: esvaziar `items` de um triagem/1.0 e rodar o gate → exit 0.
//
// Uso:  node scripts/bancada-gate.mjs
// Saída: exit 1 com ::error:: por problema; exit 0 com resumo.

import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const BANCADA = join(ROOT, 'docs/audit/bancada.html');
const AUDIT_DIR = join(ROOT, 'docs/audit');

const erros = [];
const avisos = [];
const err = (b, m) => erros.push(`[${b}] ${m}`);
const warn = (b, m) => avisos.push(`[${b}] ${m}`);

// ---------- leitura da bancada ----------
let html;
try {
  html = readFileSync(BANCADA, 'utf8');
} catch {
  console.error(`::error::bancada não encontrada em ${BANCADA}`);
  process.exit(1);
}

// blocos <script type="text/plain" id="...">
const blocos = new Map();
for (const m of html.matchAll(/<script type="text\/plain" id="([^"]+)">([\s\S]*?)<\/script>/g)) {
  blocos.set(m[1], m[2]);
}

// itens do catálogo: code + ver + srcId + v4patch, lidos das entradas literais
//
// POR QUE ISTO NÃO É UMA REGEX. A versão anterior usava
//     /\{code:"…",\s*fam:"…",\s*ver:"…"[\s\S]*?\}/g
// e o `[\s\S]*?\}` não-guloso parava no PRIMEIRO `}` do item. Item com objeto aninhado
// (`demo:{seconds:12}`) perdia tudo que vinha depois — inclusive `srcId` e `v4patch`.
// Como B1 (`if (it.srcId && …)`) e B9 (`if (… || !it.srcId) continue`) PULAM item sem
// srcId, o efeito não era erro: era silêncio. Medido por mutação nesta bancada: com o
// srcId escondido atrás de um objeto aninhado e o bloco 4b removido do t-av20, o gate
// deixou de reprovar as duas coisas. Gate que não morde é teatro.
//
// Agora a varredura é por chaves balanceadas e ciente de string, e não depende da ordem
// nem da vizinhança das chaves dentro do item.
function fimDoObjeto(s, ini) {
  let prof = 0, aspas = null;
  for (let i = ini; i < s.length; i++) {
    const c = s[i];
    if (aspas) {
      if (c === '\\') { i++; continue; }
      if (c === aspas) aspas = null;
      continue;
    }
    if (c === '"' || c === "'" || c === '`') { aspas = c; continue; }
    if (c === '{') prof++;
    else if (c === '}' && --prof === 0) return i;
  }
  return -1;
}

// ASPAS DAS DUAS FORMAS. A primeira versão desta correção varria só `{code:"` e
// `srcId:"…"`, e um revisor independente derrubou o comentário que dizia cobrir "a classe
// inteira": item escrito com aspas simples — forma que a própria página usa em
// `['pv-med','declarado']` — ficava invisível ao parser E à guarda de cobertura, e um item
// v4 com srcId pendurado passava verde. O escape era da regra, não da forma do objeto.
const itens = [];
for (const m of html.matchAll(/\{code:["']/g)) {
  const fim = fimDoObjeto(html, m.index);
  if (fim < 0) continue;
  const bloco = html.slice(m.index, fim + 1);
  const fam = bloco.match(/\bfam:["']([^"']*)["']/);
  if (!fam) continue; // entrada de CAT (code+title+ver, sem fam) — contada mais abaixo
  const code = bloco.match(/^\{code:["']([^"']+)["']/);
  const ver = bloco.match(/\bver:["']([^"']+)["']/);
  if (!code || !ver) continue;
  const src = bloco.match(/\bsrcId:["']([^"']+)["']/);
  itens.push({
    code: code[1],
    fam: fam[1],
    ver: ver[1],
    srcId: src ? src[1] : null,
    v4patch: /v4patch:\s*true/.test(bloco),
  });
}
if (!itens.length) err('B1', 'nenhum item de catálogo reconhecido — o parser do gate ficou cego ao formato');

// GUARDA DE COBERTURA — a checagem que teria falhado se o defeito acima ainda existisse.
// Todo `srcId` do arquivo tem de estar preso a um item que o parser leu. Se sobrar srcId,
// há fiação que o gate não enxerga, e B1/B9 estão passando por cegueira e não por
// conformidade.
//
// LIMITE DESTA GUARDA, declarado em vez de prometido: ela cobre o que a varredura de srcId
// alcança. Aspas simples e duplas estão cobertas; uma forma de escrever srcId que nenhuma
// das duas regexes veja (chave computada, concatenação, srcId montado em tempo de execução)
// continua fora. A versão anterior deste comentário dizia "impede a classe inteira" e foi
// refutada por mutação numa revisão independente — a promessa era maior que o cheque.
{
  const noArquivo = [...html.matchAll(/srcId:["']([^"']+)["']/g)].map((m) => m[1]);
  const lidos = itens.map((i) => i.srcId).filter(Boolean);
  if (noArquivo.length !== lidos.length) {
    const perdidos = noArquivo.filter((x) => !lidos.includes(x));
    err('B1', `parser cego: o arquivo tem ${noArquivo.length} srcId e o gate prendeu ${lidos.length} a itens` +
      (perdidos.length ? ` — fora do alcance: ${[...new Set(perdidos)].join(', ')}` : ' — duplicata ou item repetido'));
  }
}

// Itens DERIVADOS de CAT: existem no trilho, são criados por ITEMS.push com chave
// abreviada (`fam` em vez de `fam:"…"`) e nenhum parser literal os vê. Nenhum deles recebe
// srcId, então B1 e B9 não se aplicam — mas o total precisa ser honesto: sem esta conta a
// linha final subcontava o catálogo em mais de um terço, e um número que ninguém confere
// é exatamente o que esta bancada existe para não produzir.
const catCodes = [...html.matchAll(/\{code:"(AV-[^"]+)",\s*title:"/g)].map((m) => m[1]);
const excluidos = (html.match(/CAT\.filter\(c=>!\[([^\]]*)\]/) || [, ''])[1]
  .split(',').map((s) => s.trim().replace(/^"|"$/g, '')).filter(Boolean);
const derivados = catCodes.filter((c) => !excluidos.includes(c));
if (!catCodes.length) warn('B1', 'nenhuma entrada de CAT reconhecida — o contador de itens derivados ficou cego');

// ---------- B1 · srcId resolve ----------
for (const it of itens) {
  if (it.srcId && !blocos.has(it.srcId)) {
    err('B1', `${it.code} aponta para srcId "${it.srcId}", que não existe como bloco na bancada`);
  }
}

// ---------- B2 · bloco órfão ----------
const referenciados = new Set(itens.map((i) => i.srcId).filter(Boolean));
// blocos injetados por flag, não por srcId — referência é por T("id") no renderizador
for (const id of blocos.keys()) {
  if (referenciados.has(id)) continue;
  if (new RegExp(`T\\("${id}"\\)`).test(html)) continue; // injetado programaticamente
  if (id === 'seed') continue; // dado do perfil, não instrumento
  err('B2', `bloco "${id}" existe e ninguém o referencia — fiação órfã`);
}

// ---------- contrato: tipos de peça central declarados ----------
const contrato = blocos.get('t-contrato') || '';
const tiposDeclarados = new Set();
{
  const bloco = contrato.match(/centerpiece\.type[\s\S]*?(?=\nscoreboard|\nfindings|$)/);
  const extra = contrato.match(/centerpiece\.type ganhou[\s\S]*?(?=\n[a-z]|\n\n|$)/g) || [];
  const fonte = (bloco ? bloco[0] : '') + extra.join('\n');
  for (const t of fonte.matchAll(/\b([a-z][a-z_]{3,})\b/g)) {
    const v = t[1];
    if (['centerpiece', 'type', 'ganhou', 'scoreboard', 'findings'].includes(v)) continue;
    tiposDeclarados.add(v);
  }
}

// ---------- leitura dos relatórios emitidos ----------
const EXPOSURES = new Set([
  'ja_exposto', 'apos_deploy', 'com_volume', 'com_dado_de_terceiro',
  'apenas_teorico', 'latente_por_dependencia',
]);
const BARREIRAS = new Set([
  'constraint', 'predicado_de_update', 'teste_de_fronteira', 'conjunto_de_avaliacao',
  'alerta', 'ensaio_de_restauracao', 'teste_de_permissao', 'nenhuma_conhecida',
]);
const RUN_OBRIGATORIO = [
  'instrument', 'instrument_version', 'title', 'project', 'repo_commit',
  'generated_at', 'agent', 'closing_block_version', 'scope', 'reduced_mode',
];
const VERIF_MODOS = new Set(['execucao', 'revisao', 'leitura']);

const relatorios = [];
const triagens = [];
for (const f of readdirSync(AUDIT_DIR).filter((x) => x.endsWith('.json'))) {
  let j;
  try {
    j = JSON.parse(readFileSync(join(AUDIT_DIR, f), 'utf8'));
  } catch (e) {
    err('B4', `${f} não é JSON válido: ${e.message}`);
    continue;
  }
  if (j.schema === 'auditoria/1.1') relatorios.push({ f, j });
  else if (j.schema === 'triagem/1.0') triagens.push({ f, j });
  // demais schemas (legado) seguem fora do escopo
}

const tiposUsados = new Set();
for (const { f, j } of relatorios) {
  // ---------- B4 · envelope ----------
  for (const k of RUN_OBRIGATORIO) {
    if (j.run?.[k] === undefined) err('B4', `${f}: run.${k} ausente`);
  }
  for (const k of ['signals', 'not_measured', 'findings', 'cheapest_moves', 'self_check']) {
    if (j[k] === undefined) err('B4', `${f}: ${k} ausente (use null ou [], nunca omita)`);
  }
  if (j.centerpiece?.type) tiposUsados.add(j.centerpiece.type);

  const ratio = j.run?.agent_authored_ratio?.value;
  const tetoAtivo = typeof ratio === 'number' && ratio > 0.7;

  for (const fd of j.findings || []) {
    const id = `${f}:${fd.id || fd.fingerprint || '?'}`;
    if ('severity' in fd) err('B4', `${id}: campo severity saiu do contrato na v3`);

    // ---------- B5 · achado completo ----------
    if (!fd.fingerprint) err('B5', `${id}: sem fingerprint`);
    if (!Array.isArray(fd.evidence) || !fd.evidence.length) err('B5', `${id}: evidence vazio`);
    if (!fd.falsifier_static && !fd.static_gap) err('B5', `${id}: sem falsifier_static e sem static_gap`);
    if (!Array.isArray(fd.adversarial_checks) || !fd.adversarial_checks.length) {
      err('B5', `${id}: sem checagem adversarial`);
    }
    if (!fd.business_impact) err('B5', `${id}: sem business_impact`);

    // ---------- B6 · demonstração (AV-00 §6b) ----------
    if (typeof fd.damage === 'number' && fd.damage >= 4 && !fd.demonstration && !fd.demotion_reason) {
      err('B6', `${id}: damage ${fd.damage} sem demonstration e sem demotion_reason`);
    }
    if (fd.demonstration && fd.demonstration.seconds > 120) {
      err('B6', `${id}: demonstration declara ${fd.demonstration.seconds}s (teto 120)`);
    }

    // ---------- B7 · enums fechados ----------
    if (fd.exposure && !EXPOSURES.has(fd.exposure)) err('B7', `${id}: exposure "${fd.exposure}" fora da lista`);
    if (fd.barrier_kind && !BARREIRAS.has(fd.barrier_kind)) {
      err('B7', `${id}: barrier_kind "${fd.barrier_kind}" fora da lista`);
    }

    // ---------- B8 · teto de confiança (AV-00 §2.2) ----------
    if (fd.verification_mode && !VERIF_MODOS.has(fd.verification_mode)) {
      err('B8', `${id}: verification_mode "${fd.verification_mode}" fora da lista`);
    }
    if (tetoAtivo && fd.confidence === 'alta') {
      if (!fd.verification_mode) {
        err('B8', `${id}: confiança alta com agent_authored_ratio ${ratio} e sem verification_mode — o §2.2 fica inverificável`);
      } else if (fd.verification_mode !== 'execucao') {
        err('B8', `${id}: confiança alta por "${fd.verification_mode}" com ratio ${ratio} — acima de 0.70 só execução sustenta alta`);
      }
    }
  }

  if (j.self_check?.independent_review === false) {
    warn('B10', `${f}: rodada sem revisão independente (AV-00 §9.4)`);
  }
}

// ---------- B3 · tipos de peça central ----------
for (const t of tiposUsados) {
  if (!tiposDeclarados.has(t)) err('B3', `centerpiece.type "${t}" é usado num relatório e não está declarado no contrato`);
}
for (const t of tiposDeclarados) {
  if (!tiposUsados.has(t)) warn('B3', `centerpiece.type "${t}" declarado no contrato e ainda não usado por nenhum relatório`);
}

// ---------- B9 · instrumento v4 carrega 4b e 6b ----------
// DUAS PORTAS DOS FUNDOS, as duas fechadas depois de uma revisão independente prová-las
// com mutação que passava verde:
//   1. `it.ver !== 'v4'` era casamento EXATO. A bancada se anuncia v4.1 no próprio título;
//      o primeiro instrumento marcado ver:"v4.1" saía de B9 em silêncio. Agora é prefixo.
//   2. `if (it.v4patch) continue` isentava sem nunca verificar que a emenda compartilhada
//      existe e carrega o que ela promete suprir. Um token comprava a saída. Agora a
//      isenção só vale se o bloco da emenda existir E carregar os dois blocos: emenda que
//      não supre não isenta ninguém.
//
// O QUE ESTE CHEQUE NÃO FAZ, e é limite de desenho, não descuido: `v4patch` continua sendo
// uma DECLARAÇÃO de autoria. A emenda diz que 4b e 6b valem por referência a ela, então um
// instrumento se apoiar nela é escolha legítima — e nenhum comando distingue a escolha
// legítima do instrumento que só não quis escrever os próprios blocos. O gate não mede
// intenção. O que ele faz é (a) exigir lastro na emenda e (b) NOMEAR quem se isenta na
// linha de saída, para que a isenção não cresça em silêncio. Se um dia a lista crescer sem
// alguém decidir isso, o número está impresso onde quem lê o gate vai ver.
const EMENDA = 't-v4patch';
const emendaTxt = blocos.get(EMENDA) || '';
const emendaSupre = /conventions\[\]/.test(emendaTxt) && /demonstra(ç|c)ão|demonstration/i.test(emendaTxt);
for (const it of itens) {
  if (!/^v4/.test(it.ver) || !it.srcId) continue;
  if (it.v4patch) {
    if (!emendaSupre) {
      err('B9', `${it.code} se isenta por v4patch, mas o bloco "${EMENDA}" ` +
        (blocos.has(EMENDA) ? 'não carrega 4b e 6b' : 'não existe') + ' — a isenção não tem lastro');
    }
    continue;
  }
  const txt = blocos.get(it.srcId) || '';
  if (!/conventions\[\]/.test(txt)) err('B9', `${it.code} é ${it.ver} e não carrega o bloco 4b (conventions[])`);
  if (!/demonstra(ç|c)ão|demonstration/i.test(txt)) err('B9', `${it.code} é ${it.ver} e não carrega o bloco 6b (demonstração)`);
}

// ---------- B11..B16 · triagem/1.0 ----------
// O artefato que o AV-00 inteiro existe para produzir. Antes destas checagens ele era o
// ÚNICO do diretório sem nenhuma: uma triagem com `items: []` passava verde.
//
// O que estas checagens NÃO fazem, declarado em vez de prometido: elas leem ESTRUTURA
// (lista fechada, campo presente, número que bate, caminho que existe no disco). Nenhuma
// delas mede se o falsificador foi de fato executado, se o portão foi bem derivado ou se o
// viés nomeado é o viés real — isso não é medível por comando, e um campo preenchido com
// prosa vazia compra a saída em B16. O limite está aqui para que ninguém leia "gate verde"
// como "triagem boa"; o que ele impede é a triagem INCOMPLETA passar em silêncio.
const TRI_VERIFICACOES = new Set([
  'confirmado', 'refutado', 'inconclusivo', 'nao_executavel', 'nao_executado',
]);
// verificação que representa falsificador EFETIVAMENTE rodado — as outras duas declaram
// por que ele não rodou, e por isso não entram na conta de B15.
const TRI_EXECUTADAS = new Set(['confirmado', 'refutado', 'inconclusivo']);
const TRI_PORTOES = new Set([
  'bloqueia_deploy', 'bloqueia_primeiro_cliente', 'aceito_com_registro', 'descartado',
]);
// portão que fecha o item sem abrir trabalho — não exige owner nem due
const TRI_SEM_TRABALHO = new Set(['aceito_com_registro', 'descartado']);

const vazio = (v) => typeof v !== 'string' || !v.trim();

// fingerprints por relatório emitido, para B12
const fpsPorArquivo = new Map();
const fpsTodos = new Set();
for (const { f, j } of relatorios) {
  const s = new Set((j.findings || []).map((x) => x.fingerprint).filter(Boolean));
  fpsPorArquivo.set(f, s);
  for (const x of s) fpsTodos.add(x);
}

for (const { f, j } of triagens) {
  // ---------- B11 · envelope da triagem ----------
  const items = Array.isArray(j.items) ? j.items : null;
  if (!items || !items.length) {
    err('B11', `${f}: items ausente ou vazio — triagem sem item não tria nada`);
  }
  const runs = Array.isArray(j.source_runs) ? j.source_runs : (j.source_run ? [j.source_run] : []);
  if (!runs.length) err('B11', `${f}: sem source_run nem source_runs — a triagem não diz o que triou`);
  if (!j.gates_summary) err('B11', `${f}: gates_summary ausente`);
  if (!j.self_check) err('B11', `${f}: self_check ausente`);

  for (const [i, it] of (items || []).entries()) {
    const id = `${f}:${it.fingerprint || `item[${i}]`}`;

    // ---------- B12 · fingerprint copiado do relatório de origem ----------
    // O fingerprint é o que liga relatório, triagem e próxima rodada (contrato auditoria/1.1).
    // Reescrevê-lo na triagem quebra o elo em silêncio: os dois artefatos passam a falar de
    // achados diferentes sem que nada reclame.
    if (vazio(it.fingerprint)) {
      err('B12', `${id}: sem fingerprint`);
    } else if (!vazio(it.source_report)) {
      const alvo = it.source_report.replace(/^.*[/\\]/, '');
      if (!fpsPorArquivo.has(alvo)) {
        err('B12', `${id}: source_report "${it.source_report}" não é um relatório auditoria/1.1 lido deste diretório`);
      } else if (!fpsPorArquivo.get(alvo).has(it.fingerprint)) {
        err('B12', `${id}: fingerprint não existe em ${it.source_report} — cópia alterada ou origem errada`);
      }
    } else if (!fpsTodos.has(it.fingerprint)) {
      err('B12', `${id}: fingerprint não bate com nenhum achado de nenhum relatório auditoria/1.1`);
    }

    // ---------- B13 · verificação de lista fechada ----------
    if (vazio(it.verification)) {
      err('B13', `${id}: sem verification — o AV-00 exige o veredito do falsificador`);
    } else if (!TRI_VERIFICACOES.has(it.verification)) {
      err('B13', `${id}: verification "${it.verification}" fora da lista (${[...TRI_VERIFICACOES].join(' | ')})`);
    }

    // ---------- B14 · portão, dono e aceite ----------
    if (vazio(it.gate)) {
      err('B14', `${id}: sem gate`);
      continue;
    }
    if (!TRI_PORTOES.has(it.gate)) {
      err('B14', `${id}: gate "${it.gate}" fora da lista (${[...TRI_PORTOES].join(' | ')})`);
      continue;
    }
    if (!TRI_SEM_TRABALHO.has(it.gate)) {
      // item que abre trabalho sem dono e sem data é backlog, não triagem
      if (vazio(it.owner)) err('B14', `${id}: gate "${it.gate}" abre trabalho e o item não tem owner`);
      if (vazio(it.due)) err('B14', `${id}: gate "${it.gate}" abre trabalho e o item não tem due`);
    }
    if (it.gate === 'aceito_com_registro') {
      if (vazio(it.accepted_reason)) err('B14', `${id}: aceite sem accepted_reason`);
      if (vazio(it.accepted_by)) err('B14', `${id}: aceite sem accepted_by`);
      if (vazio(it.review_trigger)) {
        err('B14', `${id}: aceite sem review_trigger — aceite sem gatilho é o achado esquecido com outro nome`);
      } else {
        // OBSERVÁVEL, e não "escrito": o gatilho tem de nomear ao menos um caminho que
        // existe no repositório hoje. É a checagem mais fraca desta seção e a que mais
        // importa — um gatilho que não aponta para nada verificável não é reexecutável por
        // quem herdar o aceite. Não mede se o gatilho é o CERTO; mede que ele aterrissa.
        const caminhos = it.review_trigger.match(
          /[\w@][\w@./-]*\.(?:ts|tsx|js|jsx|mjs|cjs|json|yml|yaml|md|html|prisma|sql)\b/g,
        ) || [];
        if (!caminhos.some((p) => existsSync(join(ROOT, p)))) {
          err('B14', `${id}: review_trigger não nomeia nenhum caminho existente no repositório ` +
            `— gatilho não observável${caminhos.length ? ` (tentados: ${[...new Set(caminhos)].join(', ')})` : ''}`);
        }
      }
    }
  }

  // ---------- B15 · self_check coerente com os itens ----------
  const sc = j.self_check || {};
  const total = (items || []).length;
  const executados = (items || []).filter((it) => TRI_EXECUTADAS.has(it.verification)).length;
  if (sc.falsifiers_total !== undefined && sc.falsifiers_total !== total) {
    err('B15', `${f}: self_check.falsifiers_total ${sc.falsifiers_total} contra ${total} item(ns)`);
  }
  if (sc.falsifiers_executed !== undefined && sc.falsifiers_executed !== executados) {
    err('B15', `${f}: self_check.falsifiers_executed ${sc.falsifiers_executed} contra ${executados} ` +
      `item(ns) com verification executada (${[...TRI_EXECUTADAS].join('/')})`);
  }
  if (sc.falsifiers_total === undefined || sc.falsifiers_executed === undefined) {
    err('B15', `${f}: self_check sem falsifiers_executed/falsifiers_total — o placar da triagem não existe`);
  }
  if (sc.items_without_owner !== undefined) {
    const semDono = (items || []).filter((it) => !TRI_SEM_TRABALHO.has(it.gate) && vazio(it.owner)).length;
    if (sc.items_without_owner !== semDono) {
      err('B15', `${f}: self_check.items_without_owner ${sc.items_without_owner} contra ${semDono} medido`);
    }
  }

  // ---------- B16 · os três campos do precedente (AV-L1-TRIAGEM) ----------
  // Promovidos ao contrato nesta rodada. A lição que os produziu é do próprio precedente:
  // `nenhuma_conhecida` emitido sem procurar é "não procurei" com nome de veredito. Aqui o
  // gate só consegue exigir que o campo EXISTA — declarado como limite logo acima.
  for (const [k, onde] of [['barriers_searched', 'self_check'], ['own_bias_named', 'self_check']]) {
    if (vazio((j[onde] || {})[k])) err('B16', `${f}: ${onde}.${k} ausente ou vazio (contrato triagem/1.0)`);
  }
  for (const [i, r] of runs.entries()) {
    if (vazio(r.verification_note)) {
      err('B16', `${f}: source_run[${i}] (${r.instrument || '?'}) sem verification_note — ` +
        'a triagem não declara contra qual commit os falsificadores rodaram');
    }
  }
}

// ---------- saída ----------
for (const a of avisos) console.log(`aviso: ${a}`);
if (erros.length) {
  for (const e of erros) console.error(`::error::${e}`);
  console.error(`\nFALHA: ${erros.length} problema(s). Bancada que não se aplica a si mesma é prosa.`);
  process.exit(1);
}
const isentos = itens.filter((i) => i.v4patch).map((i) => i.code);
console.log(
  `\nOK: ${itens.length + derivados.length} itens no catálogo ` +
  `(${itens.length} literais, com ${itens.filter((i) => i.srcId).length} srcId prontos; ` +
  `${derivados.length} derivados de CAT, sem srcId e fora de B1/B9), ` +
  `${blocos.size} blocos, ${relatorios.length} relatório(s) auditoria/1.1, ` +
  `${triagens.length} triagem(ns) 1.0 com ${triagens.reduce((n, t) => n + (t.j.items || []).length, 0)} item(ns), ` +
  `${tiposUsados.size} tipo(s) de peça central em uso, ${avisos.length} aviso(s).` +
  `\nIsenção 4b/6b pela emenda (${isentos.length}): ${isentos.join(', ') || 'nenhuma'} — ` +
  'isenção é declaração de autoria, não medição; o gate exige lastro na emenda e imprime a lista.',
);

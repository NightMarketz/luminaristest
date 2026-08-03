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
//   B4  todo JSON auditoria/1.1 carrega o envelope completo, sem `severity` — e relatório
//       de instrumento v4+ declara `run.review_of_this_run` (AV-00 §9.4)
//   B5  todo achado tem evidence, falsificador (ou static_gap) e checagem adversarial
//   B6  damage >= 4 exige demonstration, ou rebaixamento registrado (AV-00 §6b)
//   B7  exposure e barrier_kind dentro das listas fechadas (inclui a emenda v4.1)
//   B8  teto de confiança do AV-00 §2.2: ratio > 0.70 proíbe confiança alta por revisão
//   B9  instrumento marcado v4 (ou v4.x) carrega os blocos 4b e 6b, ou se isenta por
//       v4patch — e nesse caso a emenda compartilhada tem de existir e suprir os dois
//   B10 rodada sem revisão independente aparece na saída — declarada OU omitida
//   B11 o banner "Sem revisão independente" do visualizador dispara com a chave AUSENTE
//
// SEMÂNTICA DA AUSÊNCIA DE DIVULGAÇÃO DE REVISÃO (§9.4), e por que ela é assimétrica.
// O §9.4 é explícito: "rodada que omite os dois campos está afirmando revisão que não pode
// mostrar". Ou seja, omitir é PIOR que declarar `null` — e antes desta correção era mais
// barato: `false` acendia um aviso, ausência não acendia nada, nos três lugares (B4, B10,
// banner). Silêncio saía mais limpo que confissão. Mas a resposta NÃO é transformar toda
// ausência em erro: o AV-R1 mede 8 revisões independentes nomeadas contra 207 merges, então
// a ausência de revisão é o caso comum, e um erro que dispara em quase todo relatório é um
// erro que se aprende a contornar. A linha fica onde o custo é assimétrico:
//   · a REVISÃO ausente é o caso comum e continua legítima — nunca vira erro;
//   · a DECLARAÇÃO custa uma linha (`review_of_this_run: null` + `review_gap`) e é o que o
//     §9.4 prescreve, então em relatório v4+ (a versão do envelope que criou o campo)
//     omiti-la é erro B4, igual às outras dez chaves obrigatórias de `run`;
//   · relatório pré-v4 (AV-L1 é v3) não tinha o campo no contrato dele: retrofitar seria
//     reescrever história, que o §9 proíbe mais do que proíbe silêncio. Fica em aviso.
// E o aviso B10 passa a disparar nos três estados (ausente, null, false) porque o fato é o
// mesmo — só a mensagem distingue quem declarou de quem calou. Motivo medido: este gate
// imprime ~19 avisos, então aviso solitário não é barreira; a barreira de verdade é o erro
// B4 para quem tem o campo no contrato, mais o banner no visualizador (B11).
//
// Uso:  node scripts/bancada-gate.mjs
// Saída: exit 1 com ::error:: por problema; exit 0 com resumo.

import { readFileSync, readdirSync } from 'node:fs';
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
for (const f of readdirSync(AUDIT_DIR).filter((x) => x.endsWith('.json'))) {
  let j;
  try {
    j = JSON.parse(readFileSync(join(AUDIT_DIR, f), 'utf8'));
  } catch (e) {
    err('B4', `${f} não é JSON válido: ${e.message}`);
    continue;
  }
  if (j.schema !== 'auditoria/1.1') continue; // triagem/1.0 e legado saem do escopo
  relatorios.push({ f, j });
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

  // ---------- B4/B10 · divulgação de revisão independente (AV-00 §9.4) ----------
  // Racional da assimetria erro-×-aviso no cabeçalho deste arquivo. Aqui só o corte: o
  // campo nasceu no envelope v4 (§8b), então v4+ deve declarar; v3 é anistiado com aviso.
  const major = Number((/^v(\d+)/.exec(j.run?.instrument_version || '') || [])[1]);
  const declarou = j.run?.review_of_this_run !== undefined;
  if (!declarou && major >= 4) {
    err('B4', `${f}: run.review_of_this_run ausente — instrumento ${j.run?.instrument_version} ` +
      'carrega o campo no envelope (§8b) e o §9.4 lê a omissão como afirmação de revisão que ' +
      'não pode mostrar; use null + review_gap para declarar que não houve');
  }
  if (!declarou || j.run.review_of_this_run === null || j.self_check?.independent_review === false) {
    warn('B10', declarou
      ? `${f}: rodada sem revisão independente (AV-00 §9.4)`
      : `${f}: rodada OMITE review_of_this_run/review_gap — ausência de declaração, não ` +
        `declaração de ausência (AV-00 §9.4)`);
  }

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

// ---------- B11 · o banner de revisão enxerga chave AUSENTE ----------
// Terceira perna da mesma fuga: o gate podia acender e a página continuar muda, porque o
// teste do visualizador era `r.review_of_this_run===null` e chave ausente é `undefined`.
// Este bloco não confere o TEXTO da condição — ele EXTRAI a expressão que a página usa e a
// avalia contra os três estados. Voltar para `===` deixa o caso "chave ausente" em false e
// reprova aqui, que é a checagem que teria falhado se eu estivesse errado sobre o efeito.
{
  const m = html.match(
    /if\((r\.review_of_this_run[^\n)]*)\)\s*\n?\s*h\+=`<div class="banner"><b>Sem revisão independente/,
  );
  if (!m) {
    err('B11', 'condição do banner "Sem revisão independente" não localizada no visualizador');
  } else {
    let cond;
    try {
      cond = new Function('r', `return !!(${m[1]});`);
    } catch (e) {
      err('B11', `condição do banner não avalia: ${e.message}`);
    }
    const casos = [
      ['chave ausente', {}, true],
      ['review_of_this_run: null', { review_of_this_run: null }, true],
      ['revisão declarada', { review_of_this_run: 'revisao-independente#1' }, false],
    ];
    if (cond) {
      for (const [nome, r, esperado] of casos) {
        if (cond(r) !== esperado) {
          err('B11', `banner do visualizador com ${nome}: esperado ${esperado ? 'acender' : 'não acender'}, obteve o contrário`);
        }
      }
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
  `${tiposUsados.size} tipo(s) de peça central em uso, ${avisos.length} aviso(s).` +
  `\nIsenção 4b/6b pela emenda (${isentos.length}): ${isentos.join(', ') || 'nenhuma'} — ` +
  'isenção é declaração de autoria, não medição; o gate exige lastro na emenda e imprime a lista.',
);

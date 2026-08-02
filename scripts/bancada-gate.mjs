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
//   B1  todo srcId do catálogo resolve para um bloco <script id> presente
//   B2  todo bloco t-* é referenciado por algum item (sem fiação órfã)
//   B3  todo centerpiece.type emitido está declarado no contrato, e vice-versa
//   B4  todo JSON auditoria/1.1 carrega o envelope completo, sem `severity`
//   B5  todo achado tem evidence, falsificador (ou static_gap) e checagem adversarial
//   B6  damage >= 4 exige demonstration, ou rebaixamento registrado (AV-00 §6b)
//   B7  exposure e barrier_kind dentro das listas fechadas (inclui a emenda v4.1)
//   B8  teto de confiança do AV-00 §2.2: ratio > 0.70 proíbe confiança alta por revisão
//   B9  instrumento marcado v4 carrega os blocos 4b e 6b, ou a emenda v4patch
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
const itens = [];
for (const m of html.matchAll(/\{code:"([^"]+)",\s*fam:"([^"]*)",\s*ver:"([^"]+)"[\s\S]*?\}/g)) {
  const bloco = m[0];
  const src = bloco.match(/srcId:"([^"]+)"/);
  itens.push({
    code: m[1],
    fam: m[2],
    ver: m[3],
    srcId: src ? src[1] : null,
    v4patch: /v4patch:\s*true/.test(bloco),
  });
}
if (!itens.length) err('B1', 'nenhum item de catálogo reconhecido — o parser do gate ficou cego ao formato');

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
for (const it of itens) {
  if (it.ver !== 'v4' || !it.srcId) continue;
  if (it.v4patch) continue; // a emenda compartilhada supre os dois blocos
  const txt = blocos.get(it.srcId) || '';
  if (!/conventions\[\]/.test(txt)) err('B9', `${it.code} é v4 e não carrega o bloco 4b (conventions[])`);
  if (!/demonstra(ç|c)ão|demonstration/i.test(txt)) err('B9', `${it.code} é v4 e não carrega o bloco 6b (demonstração)`);
}

// ---------- saída ----------
for (const a of avisos) console.log(`aviso: ${a}`);
if (erros.length) {
  for (const e of erros) console.error(`::error::${e}`);
  console.error(`\nFALHA: ${erros.length} problema(s). Bancada que não se aplica a si mesma é prosa.`);
  process.exit(1);
}
console.log(
  `\nOK: ${itens.length} itens, ${blocos.size} blocos, ${relatorios.length} relatório(s) auditoria/1.1, ` +
  `${tiposUsados.size} tipo(s) de peça central em uso, ${avisos.length} aviso(s).`,
);

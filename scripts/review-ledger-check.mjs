#!/usr/bin/env node
// Gate do achado R1 F4 — `revisao-independente-sem-artefato-por-merge`
// (docs/audit/TRIAGEM-R1-R3.json, item de rank 6, dano 3, bloqueia_primeiro_cliente).
//
// O QUE O ACHADO MEDIU: 9 menções a revisão independente em mensagens de commit contra 207
// merges. O `barrier_note` da triagem já registra a conclusão que este script implementa —
// «a barreira que falta é de REGISTRO, não de ferramenta»: nenhum dos passos do ci.yml exigia
// artefato de revisão, e o único vestígio vivia em prosa de mensagem de commit, que não é
// contável nem confrontável.
//
// O QUE ESTE GATE **NÃO** FAZ, declarado antes do que ele faz: ele não prova que uma revisão
// aconteceu. Ninguém pode provar isso lendo o repositório — a revisão é um ato, o repositório
// só guarda o que alguém escreveu sobre ele. O que ele faz é converter AUSÊNCIA DE DECLARAÇÃO
// em DECLARAÇÃO DE AUSÊNCIA (a distinção é literalmente a mensagem do B10 do bancada-gate):
// todo PR passa a carregar uma entrada estruturada, e `sem_revisao_independente` é um veredito
// LEGÍTIMO da lista fechada. O gate reprova quem não declara nada, não quem declara que não
// houve revisão. Um registro auto-declarado continua sendo auto-declarado; o ganho é que passa
// a ser contável, único por PR e internamente consistente.
//
// O QUE ELE GARANTE (tudo reprova, exit 1):
//   ✓ toda linha do razão é JSON válido com as chaves obrigatórias;
//   ✓ `pr` é inteiro positivo e ÚNICO — duas entradas para o mesmo PR é registro ambíguo;
//   ✓ `verdict` vem da lista fechada;
//   ✓ veredito `revisado_*` exige `reviewer` != `implementer` (AV-00 §9.4: PASS emitido pela
//     mesma sequência que implementou é rejeitado) E `artifact` apontando caminho QUE EXISTE
//     no disco — é o único campo do registro que outra pessoa pode abrir e conferir;
//   ✓ veredito `sem_revisao_independente` exige `note` e PROÍBE reviewer/artifact — não se
//     declara ausência e autoria de revisão na mesma linha;
//   ✓ em evento `pull_request`, o PR do evento tem de ter entrada.
//
// E ele IMPRIME a razão declarado/merges, que é o número que o achado mediu, agora calculado
// pelo próprio gate em vez de a mão. Sem isso o registro apodrece em silêncio.
//
// Uso: node scripts/review-ledger-check.mjs [--pr <n>]
// Em CI o número do PR vem de PR_NUMBER (ver .github/workflows/ci.yml).

import { existsSync, readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const LEDGER = 'docs/audit/REVIEW-LEDGER.jsonl';

/** Lista fechada de vereditos. `sem_revisao_independente` é legítimo — ver cabeçalho. */
const VERDICTS = new Set([
  'revisado_pass',
  'revisado_com_ressalva',
  'revisado_reprovado_e_corrigido',
  'sem_revisao_independente',
]);
const REVIEWED = (v) => v.startsWith('revisado_');

const errors = [];
const err = (m) => errors.push(m);

if (!existsSync(LEDGER)) {
  console.error(`[RL0] ${LEDGER} ausente — o razão de revisão É o artefato deste gate.`);
  process.exit(1);
}

// O arquivo é lido normalizado. `core.autocrlf=true` em checkout Windows entrega CRLF e o
// CI entrega LF: sem isto, `\r` viaja dentro do último campo de cada linha e o gate mediria
// artefato diferente do que o CI mede — foi exatamente assim que o bancada-gate passou dois
// commits verde local e vermelho no CI (CONTINUACAO.md, item 6).
const lines = readFileSync(LEDGER, 'utf8')
  .replace(/\r\n/g, '\n')
  .split('\n')
  .map((l, i) => ({ n: i + 1, raw: l }))
  .filter(({ raw }) => raw.trim() !== '' && !raw.trimStart().startsWith('//'));

const seen = new Map();
const entries = [];

for (const { n, raw } of lines) {
  let e;
  try {
    e = JSON.parse(raw);
  } catch {
    err(`[RL1] linha ${n}: JSON inválido — o razão é JSONL, uma entrada por linha.`);
    continue;
  }
  entries.push(e);

  if (!Number.isInteger(e.pr) || e.pr <= 0) {
    err(`[RL2] linha ${n}: "pr" deve ser inteiro positivo (recebido: ${JSON.stringify(e.pr)}).`);
  } else if (seen.has(e.pr)) {
    err(`[RL2] linha ${n}: PR ${e.pr} já declarado na linha ${seen.get(e.pr)} — registro ambíguo.`);
  } else {
    seen.set(e.pr, n);
  }

  if (typeof e.commit !== 'string' || !/^[0-9a-f]{7,40}$/.test(e.commit)) {
    err(`[RL1] linha ${n}: "commit" deve ser um sha (7-40 hex).`);
  }
  if (typeof e.implementer !== 'string' || e.implementer.trim() === '') {
    err(`[RL1] linha ${n}: "implementer" obrigatório — sem ele não há com quem comparar o revisor.`);
  }
  if (typeof e.verdict !== 'string' || !VERDICTS.has(e.verdict)) {
    err(`[RL3] linha ${n}: "verdict" fora da lista fechada (${[...VERDICTS].join(' | ')}): ${JSON.stringify(e.verdict)}`);
    continue;
  }

  if (REVIEWED(e.verdict)) {
    if (typeof e.reviewer !== 'string' || e.reviewer.trim() === '') {
      err(`[RL4] linha ${n}: veredito "${e.verdict}" exige "reviewer" nomeado.`);
    } else if (e.reviewer.trim() === String(e.implementer).trim()) {
      err(`[RL4] linha ${n}: reviewer === implementer ("${e.reviewer}") — AV-00 §9.4 rejeita PASS emitido pela mesma sequência que implementou.`);
    }
    if (typeof e.artifact !== 'string' || e.artifact.trim() === '') {
      err(`[RL4] linha ${n}: veredito "${e.verdict}" exige "artifact" — caminho que outra pessoa possa abrir.`);
    } else if (!existsSync(e.artifact)) {
      err(`[RL4] linha ${n}: artifact "${e.artifact}" não existe no disco — caminho declarado não é caminho verificável.`);
    }
  } else {
    // sem_revisao_independente
    if (typeof e.note !== 'string' || e.note.trim() === '') {
      err(`[RL5] linha ${n}: "sem_revisao_independente" exige "note" — declaração de ausência tem de dizer por quê.`);
    }
    if (e.reviewer || e.artifact) {
      err(`[RL5] linha ${n}: "sem_revisao_independente" não pode trazer reviewer/artifact — as duas coisas não são verdade juntas.`);
    }
  }
}

// --- exigência por PR: o registro é POR MERGE, não por repositório ---
const prArg = process.argv.indexOf('--pr');
const prNumber = Number(prArg > -1 ? process.argv[prArg + 1] : process.env.PR_NUMBER ?? '');
const isPullRequest = process.env.GITHUB_EVENT_NAME === 'pull_request' || prArg > -1;

if (isPullRequest) {
  if (!Number.isInteger(prNumber) || prNumber <= 0) {
    err('[RL6] evento pull_request sem número de PR legível (PR_NUMBER / --pr).');
  } else if (!seen.has(prNumber)) {
    err(
      `[RL6] PR ${prNumber} não tem entrada em ${LEDGER}. Acrescente UMA linha antes do merge. ` +
        'Se não houve revisão independente, o veredito honesto é "sem_revisao_independente" com "note" — ' +
        'o gate cobra declaração, não aprovação.',
    );
  }
}

// --- relatório: a razão que o achado mediu, agora calculada aqui ---
let merges = null;
try {
  const shallow = execFileSync('git', ['rev-parse', '--is-shallow-repository'], { encoding: 'utf8' }).trim();
  if (shallow === 'false') {
    merges = execFileSync('git', ['log', '--merges', '--format=%H'], { encoding: 'utf8' })
      .split('\n')
      .filter(Boolean).length;
  }
} catch {
  /* sem git no ambiente: a razão fica indisponível, e é dito abaixo */
}

const dist = {};
for (const e of entries) dist[e.verdict] = (dist[e.verdict] ?? 0) + 1;
const declared = seen.size;
const ratio =
  merges === null
    ? 'indisponível (repositório shallow ou sem git) — número OMITIDO em vez de estimado'
    : `${declared} declarado(s) / ${merges} merge(s) na história`;

if (errors.length) {
  for (const e of errors) console.error(`erro: ${e}`);
  console.error(`\nFALHOU: ${errors.length} erro(s) em ${LEDGER}. Cobertura: ${ratio}.`);
  process.exit(1);
}

console.log(`OK: ${declared} PR(s) com veredito declarado em ${LEDGER}.`);
console.log(`Distribuição: ${Object.entries(dist).map(([k, v]) => `${k}=${v}`).join(' · ') || '(vazio)'}`);
console.log(`Cobertura: ${ratio}.`);
console.log(
  'LIMITE: o veredito é auto-declarado. Este gate prova que a declaração existe, é única por PR e ' +
    'é internamente consistente — não que a revisão aconteceu.',
);

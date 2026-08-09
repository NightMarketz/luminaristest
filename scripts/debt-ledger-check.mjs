#!/usr/bin/env node
// Gate C5 — dívida SUPRIMIDA (medida pelo ESLint) × dívida DECLARADA (bloco no spec).
//
// Origem: dimensão C5 do instrumento AV-L1, extraída para CI. (A bancada que a originou foi
// removida em 2026-08-09 — `git show b617d8f1:docs/audit/bancada.html`. Este script NÃO fazia
// parte dela: mora nos jobs server/my-app, depende de node_modules e continua vivo.)
//
// POR QUE ESTE SCRIPT NÃO PROCURA TEXTO. Duas versões anteriores varriam o código atrás
// de `-- DEBT:` com regex, e duas rodadas de review adversarial as reprovaram: regex não
// sabe o que é comentário e o que é string, não conhece as duas famílias de diretiva do
// ESLint (`eslint-disable*` E `/* eslint <regra>: "off" */`), e não sabe quais arquivos o
// linter de fato olha. Cada uma dessas lacunas virou um bypass VERDE com violação viva.
// Aqui quem responde é o ESLint:
//
//   passe A  `eslint --format json`                    → suppressedMessages, com a
//                                                        justification já parseada
//   passe B  `eslint --no-inline-config --format json` → TODA violação real aflora,
//                                                        inclusive a silenciada por
//                                                        inline config
//
// Violação em B sem supressão correspondente em A = regra desligada por um caminho que
// não deixa marcador. É assim que o bypass `/* eslint no-restricted-imports: "off" */` é
// pego — nenhuma regex conseguiria, porque no passe A o ESLint nem reporta a violação.
//
// O QUE GARANTE:
//   ✓ toda supressão de regra de CAMADA carrega `DEBT: <tag>` ou `SANCTIONED` na
//     justification — marcar é condição de merge, não boa-fé;
//   ✓ nenhuma violação de camada silenciada por inline config;
//   ✓ nenhuma regra de camada rebaixada para `warn` (warn não reprova o lint, e a
//     violação entraria viva sem supressão e sem entrada no bloco);
//   ✓ toda entrada do bloco é validada por algum run — caminho fora das raízes conhecidas
//     é erro, não silêncio;
//   ✓ o conjunto suprimido bate com o bloco `debt-ledger`, por arquivo e em contagem.
// O QUE NÃO GARANTE:
//   ✗ semântica do marcador (tag errada num arquivo certo passa);
//   ✗ dívida do contrato §2 fora dos globs do eslint (ver PONTO CEGO em R1 do spec);
//   ✗ defesa contra o PRÓPRIO config: desligar a regra por override (`rules: {..: 'off'}`)
//     ou tirar o arquivo por `ignores` some nos DOIS passes, porque aí o ESLint nunca
//     reporta a violação. O config é a fundação do gate, não algo que ele audita — fechar
//     isso exigiria um `--print-config` por região, e a proteção real é review do diff do
//     config. `warn` é o único caso desta família que dá para pegar, e está pego acima.
//
// DIREÇÃO DA CORREÇÃO: divergência é bug do BLOCO — edite o `debt-ledger`, nunca
// acrescente supressão no código para casar com a lista.
//
// Uso (cwd = a raiz npm, onde o eslint daquela metade roda):
//   cd server && node ../scripts/debt-ledger-check.mjs --root server
//   cd my-app && node ../scripts/debt-ledger-check.mjs --root my-app

import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { relative, resolve, sep } from 'node:path';

// Como o eslint de cada metade é invocado — espelha o script `lint`/`lint:gate` do package.
const ROOTS = {
  server: { args: ['src'] },
  'my-app': { args: ['.', '--config', 'eslint.gate.config.mjs'] },
};
const LAYER_RULES = new Set(['no-restricted-imports']);
const MARKER = /\b(DEBT:\s*\S+|SANCTIONED)\b/;

const rootName = process.argv[process.argv.indexOf('--root') + 1];
if (!ROOTS[rootName]) {
  console.error(`::error::uso: node scripts/debt-ledger-check.mjs --root <${Object.keys(ROOTS).join('|')}>`);
  process.exit(2);
}
const REPO = resolve(process.cwd(), '..');
const SPEC = resolve(REPO, 'docs/architecture/lint-layer-gate.md');

// Caminho relativo ao repo, sempre com barra normal: em win32 o separador é `\` e comparar
// sem normalizar casa zero em silêncio. Ver [OPS-003].
const rel = (abs) => `${rootName}/${relative(process.cwd(), abs).split(sep).join('/')}`;

function eslintJson(extra) {
  const r = spawnSync('npx', ['eslint', ...ROOTS[rootName].args, ...extra, '--format', 'json'], {
    encoding: 'utf8', shell: true, maxBuffer: 64 * 1024 * 1024,
  });
  // exit 1 = há erro de lint, a saída ainda é JSON válido. exit 2 = falha do próprio eslint.
  if (r.status === 2 || !r.stdout.trim()) {
    console.error(`::error::eslint não rodou em ${rootName} (status ${r.status}). stderr:\n${r.stderr}`);
    process.exit(1);
  }
  return JSON.parse(r.stdout);
}

const layerOf = (list) => (list ?? []).filter((m) => LAYER_RULES.has(m.ruleId));

// Severidade abaixo de `error` mata o gate inteiro em silêncio: `warn` não reprova o
// `npm run lint`, e a violação entra viva sem supressão e sem entrada no bloco. O spec
// diz isso em prosa ("não rebaixa nenhuma regra para warn — warn não tem dente no CI");
// aqui vira checagem. Coletado nos DOIS passes: se a regra foi rebaixada e todos os sites
// estiverem suprimidos, só o passe B mostra as mensagens.
const weak = new Set();
const noteWeak = (file, list) => {
  for (const m of layerOf(list)) if (m.severity !== 2) weak.add(`${file}:${m.line ?? '?'}`);
};

// Passe A — o que o ESLint considera suprimido, com a justificativa que ele mesmo extraiu.
const suppressed = {};   // arquivo -> [justification]
const unsuppressed = {}; // arquivo -> violações que passaram (lint vermelho)
for (const f of eslintJson([])) {
  const file = rel(f.filePath);
  for (const m of layerOf(f.suppressedMessages)) {
    (suppressed[file] ??= []).push((m.suppressions ?? []).map((s) => s.justification ?? '').join(' '));
  }
  noteWeak(file, f.messages);
  const live = layerOf(f.messages).length;
  if (live) unsuppressed[file] = live;
}

// Passe B — sem inline config, TODA violação real aparece.
const real = {}; // arquivo -> total de violações de camada
for (const f of eslintJson(['--no-inline-config'])) {
  const file = rel(f.filePath);
  noteWeak(file, f.messages);
  const n = layerOf(f.messages).length;
  if (n) real[file] = n;
}

const problems = [];

// 1. Regra de camada rebaixada para `warn`.
if (weak.size) {
  problems.push(
    `Regra de camada em severidade abaixo de \`error\` em ${weak.size} local(is):\n` +
      [...weak].sort().map((f) => `    - ${f}`).join('\n') +
      `\n  \`warn\` não reprova o \`npm run lint\`, então a violação entra viva, sem supressão e sem\n` +
      `  entrada no bloco — o gate inteiro fica decorativo. Volte a regra para \`error\` no config;\n` +
      `  se o site precisa ficar, é supressão marcada (\` -- DEBT: <tag>\`), não rebaixamento global.`
  );
}

// 2. Violação silenciada por caminho que não deixa marcador (inline config).
for (const [file, n] of Object.entries(real)) {
  const accounted = (suppressed[file]?.length ?? 0) + (unsuppressed[file] ?? 0);
  if (n > accounted) {
    problems.push(
      `\`${file}\`: ${n - accounted} violação(ões) de camada silenciada(s) SEM diretiva de supressão.\n` +
        `  Causa: \`/* eslint <regra>: "off" */\` (inline config) — não deixa marcador e o lint fica\n` +
        `  verde. Troque por \`eslint-disable-next-line <regra> -- DEBT: <tag>\` e registre no bloco\n` +
        `  debt-ledger, ou conserte a violação.`
    );
  }
}

// 2. Supressão sem marcador — marcar não é voluntário.
const counts = {}; // tag -> { arquivo -> quantidade }
for (const [file, justs] of Object.entries(suppressed)) {
  for (const j of justs) {
    const m = j.match(MARKER);
    if (!m) {
      problems.push(
        `\`${file}\`: supressão de regra de camada com justificativa sem marcador` +
          (j.trim() ? ` (\`${j.trim().slice(0, 60)}\`)` : ' (vazia)') +
          `.\n  Toda supressão precisa declarar o que é: \` -- DEBT: <tag>\` ou \` -- SANCTIONED\`.`
      );
      continue;
    }
    const tag = m[1].startsWith('SANCTIONED')
      ? 'SANCTIONED'
      : `DEBT: ${m[1].slice(m[1].indexOf(':') + 1).trim()}`;
    counts[tag] ??= {};
    counts[tag][file] = (counts[tag][file] ?? 0) + 1;
  }
}

// 3. Declarado × medido, só na fatia deste root.
function readLedger() {
  const spec = readFileSync(SPEC, 'utf8');
  const re = /<!--\s*debt-ledger:start\s*-->\s*```json\s*([\s\S]*?)```\s*<!--\s*debt-ledger:end\s*-->/g;
  const all = [...spec.matchAll(re)];
  if (all.length !== 1) {
    throw new Error(
      `${all.length} blocos debt-ledger no spec — tem de haver exatamente UM. ` +
        `Dois blocos são duas listas, e uma seria ignorada em silêncio.`
    );
  }
  return JSON.parse(all[0][1]);
}
let ledger;
try {
  ledger = readLedger();
} catch (e) {
  console.error(`::error::Bloco debt-ledger ilegível: ${e.message}`);
  process.exit(1);
}
const mine = (file) => file.startsWith(`${rootName}/`);

// Entrada cujo caminho não pertence a NENHUMA raiz conhecida não é validada por run nenhum:
// ficaria no bloco para sempre, verde — que é exatamente o trabalho que este gate existe para
// fazer, falhando. O modo de entrada provável não é sabotagem: é caminho copiado do Explorer
// (barra invertida), caixa errada, ou prefixo esquecido. Ambos os runs acusam — duplicar o erro
// é melhor que eleger um dono e depender dele rodar.
for (const [tag, files] of Object.entries(ledger)) {
  for (const file of Object.keys(files)) {
    if (!Object.keys(ROOTS).some((r) => file.startsWith(`${r}/`))) {
      problems.push(
        `[${tag}] \`${file}\`: caminho fora de ${Object.keys(ROOTS).map((r) => `${r}/`).join(' e ')} —` +
          ` nenhum run valida esta entrada, ela ficaria no bloco para sempre sem ninguém conferir.\n` +
          `  Use caminho relativo à raiz do repo, com barra normal e a caixa exata do disco.`
      );
    }
  }
}

for (const tag of [...new Set([...Object.keys(ledger), ...Object.keys(counts)])].sort()) {
  const dec = Object.fromEntries(Object.entries(ledger[tag] ?? {}).filter(([f]) => mine(f)));
  const act = counts[tag] ?? {};
  for (const file of [...new Set([...Object.keys(dec), ...Object.keys(act)])].sort()) {
    const d = dec[file] ?? 0, a = act[file] ?? 0;
    if (d === a) continue;
    if (a === 0) {
      problems.push(`[${tag}] o spec declara \`${file}\` (${d}×) e o ESLint não reporta supressão ali — dívida paga? remova do bloco. (Se o lint está VERMELHO nesse arquivo, é o oposto: conserte o código.)`);
    } else if (d === 0) {
      problems.push(`[${tag}] \`${file}\` tem ${a} supressão(ões) que o spec NÃO declara — acrescente ao bloco, ou pague e remova.`);
    } else {
      problems.push(`[${tag}] \`${file}\`: spec declara ${d}, ESLint reporta ${a}. A contagem é por ocorrência.`);
    }
  }
}

if (problems.length) {
  for (const p of problems) console.error(`::error::${p}\n`);
  console.error(`FALHA (${rootName}): backlog que aponta para nada é backlog que ninguém lê.`);
  process.exit(1);
}
const total = Object.values(counts).reduce((n, f) => n + Object.values(f).reduce((a, b) => a + b, 0), 0);
console.log(`OK (${rootName}): ${total} supressão(ões) de camada, todas marcadas e declaradas no debt-ledger.`);
for (const tag of Object.keys(counts).sort()) {
  console.log(`  ${tag}: ${Object.values(counts[tag]).reduce((a, b) => a + b, 0)}`);
}

#!/usr/bin/env node
// Classe de risco de um PR para o merge da sessão maestro (D-2026-10-28-FLUXO-AUTONOMO).
//   node scripts/classe-risco.mjs pr <n> [--json]        → lê o PR com `gh pr view`
//   node scripts/classe-risco.mjs arquivos <caminho...>  → classifica uma lista local (ex.: git diff --name-only)
// Verde  → a maestro mergeia sozinha com CI verde, sem conflito, fora de draft.
// Vermelho → revisor-independente roda e o PR entra no lote diário do dono, que aprova por número.
// Em dúvida, vermelho: a lista abaixo só cresce por decisão do dono.
import { execFileSync } from 'node:child_process';
import { globToRegex } from './paralelo.mjs';

// Caminho que, tocado, faz o PR inteiro ser vermelho. Cada linha diz o porquê.
export const VERMELHO = [
  ['server/src/features/accounting/**', 'contábil/fiscal (razão, apuração, SPED, NF-e, Reinf)'],
  ['server/src/features/accountingBinding/**', 'ponte venda → razão'],
  ['server/src/features/legalParameters/**', 'parâmetro legal (alíquota, teto, tabela)'],
  ['my-app/features/accounting/**', 'tela fiscal/contábil'],
  ['server/prisma/**', 'schema ou migração'],
  ['server/src/middleware/auth.ts', 'autenticação'],
  ['.github/**', 'CI e automação do repositório'],
  ['.claude/**', 'regra de agente, skill ou gate'],
  ['CLAUDE.md', 'regra de agente'],
  ['**/CLAUDE.md', 'regra de agente'],
  ['docs/plano/gates/**', 'gate humano (desfecho e assinatura são do dono)'],
  ['docs/plano/decisoes/**', 'cédula de decisão do dono'],
  ['docs/plano/trilhos/**', 'trilho travado'],
  ['docs/plano/rejeitadas/**', 'decisão rejeitada'],
  ['docs/adr/**', 'decisão de arquitetura'],
].map(([glob, motivo]) => ({ glob, motivo, re: globToRegex(glob) }));

// "Bump x from 4.104.0 to 7.43.0" → major mudou. Grupo minor-patch do dependabot não traz versão.
export function bumpMajor(titulo) {
  const m = /from v?(\d+)\.[\w.-]* to v?(\d+)\./.exec(titulo);
  return m ? m[1] !== m[2] : false;
}

export function classificar({ arquivos, titulo = '', draft = false }) {
  const motivos = [];
  for (const f of arquivos) {
    const hit = VERMELHO.find((v) => v.re.test(f));
    if (hit) motivos.push(`${f} — ${hit.motivo}`);
  }
  if (bumpMajor(titulo)) motivos.push(`dependência major: ${titulo}`);
  if (/n[ãa]o mergear/i.test(titulo)) motivos.push('título pede para não mergear');
  if (draft) motivos.push('PR em draft');
  if (arquivos.length === 0) motivos.push('sem lista de arquivos (em dúvida, vermelho)');
  return { classe: motivos.length ? 'vermelho' : 'verde', motivos };
}

function lerPr(n) {
  const out = execFileSync('gh', ['pr', 'view', String(n), '--json', 'files,title,isDraft'], { encoding: 'utf8' });
  const pr = JSON.parse(out);
  return { arquivos: pr.files.map((f) => f.path), titulo: pr.title, draft: pr.isDraft };
}

const isMain = process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, '/').split('/').pop());
if (isMain) {
  const [cmd, ...resto] = process.argv.slice(2);
  const json = resto.includes('--json');
  const args = resto.filter((a) => a !== '--json');
  let entrada;
  if (cmd === 'pr' && args[0]) entrada = lerPr(args[0]);
  else if (cmd === 'arquivos') entrada = { arquivos: args };
  else {
    console.error('uso: classe-risco.mjs pr <n> [--json] | arquivos <caminho...>');
    process.exit(2);
  }
  const r = classificar(entrada);
  if (json) console.log(JSON.stringify(r));
  else console.log([r.classe, ...r.motivos.map((m) => `  - ${m}`)].join('\n'));
}

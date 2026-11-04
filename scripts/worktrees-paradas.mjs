#!/usr/bin/env node
// Lista worktrees paradas — SÓ LEITURA, não remove nada (dono, chat, 2026-11-04: "Me da um prompt para implementar todas
// as 7 sugestões"). Medido em 03–04/11: 347 pastas de worktree no disco, 101 com node_modules próprio. A remoção é do
// dono, depois de ver a lista: `git worktree remove <caminho>` (nunca `rm -rf`, que pode seguir a junção do
// node_modules para o depósito ~/.luminaris-deps) e `git worktree prune`.
//
// Parada = não é o checkout principal, não está travada (`git worktree lock`), não é o cwd de sessão listada em
// --excluir, e (a branch já foi mergeada em origin/main — PR MERGED no GitHub ou ancestral — OU o último commit tem
// --dias ou mais). Para cada uma: motivo, idade, arquivos sujos, node_modules (real / junção / —) e tamanho.
//
// Uso:  node scripts/worktrees-paradas.mjs [--dias 7] [--excluir <arquivo com 1 caminho por linha>] [--sem-tamanho] [--json]
//       (o arquivo de --excluir sai do list_sessions do app: o `cwd` de toda sessão não arquivada)
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const args = process.argv.slice(2);
const opt = (name, def) => {
  const i = args.indexOf(name);
  return i === -1 ? def : args[i + 1];
};
const DIAS = Number(opt('--dias', 7));
const semTamanho = args.includes('--sem-tamanho');
const norm = (p) => path.resolve(p).toLowerCase();
const excluir = new Set(
  opt('--excluir') ? fs.readFileSync(opt('--excluir'), 'utf8').split(/\r?\n/).filter(Boolean).map(norm) : [],
);
excluir.add(norm(process.cwd())); // a worktree de quem roda

const git = (a, cwd) => execFileSync('git', a, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], maxBuffer: 64 << 20 });

// 1. Worktrees registradas.
const wts = [];
for (const bloco of git(['worktree', 'list', '--porcelain']).split(/\r?\n\r?\n/)) {
  const w = {};
  for (const l of bloco.split(/\r?\n/)) {
    const [k, ...v] = l.split(' ');
    if (k) w[k] = v.join(' ') || true;
  }
  if (w.worktree) wts.push(w);
}
const principal = wts[0];

// 2. Branches mergeadas: PR MERGED no GitHub (squash não deixa ancestral) ou ancestral de origin/main.
const mergeadas = new Map();
try {
  const prs = JSON.parse(
    execFileSync('gh', ['pr', 'list', '--state', 'merged', '--limit', '3000', '--json', 'headRefName,number'], { encoding: 'utf8', maxBuffer: 64 << 20 }),
  );
  for (const p of prs) if (!mergeadas.has(p.headRefName)) mergeadas.set(p.headRefName, `PR #${p.number} mergeado`);
} catch {
  console.error('aviso: gh indisponível; só conta como mergeada a branch ancestral de origin/main');
}
for (const b of git(['branch', '--merged', 'origin/main', '--format=%(refname:short)']).split(/\r?\n/).filter(Boolean)) {
  if (!mergeadas.has(b)) mergeadas.set(b, 'ancestral de origin/main');
}

// 3. Data do último commit de cada HEAD, numa chamada só.
const heads = [...new Set(wts.map((w) => w.HEAD).filter((h) => typeof h === 'string'))];
const dataDe = new Map();
for (const l of git(['log', '--no-walk', '--format=%H %ct', ...heads]).split(/\r?\n/).filter(Boolean)) {
  const [h, t] = l.split(' ');
  dataDe.set(h, Number(t) * 1000);
}

// Tamanho sem seguir junção/symlink (o depósito não conta).
function tamanho(dir) {
  let total = 0;
  const pilha = [dir];
  while (pilha.length) {
    const d = pilha.pop();
    let itens;
    try {
      itens = fs.readdirSync(d, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const it of itens) {
      const p = path.join(d, it.name);
      if (it.isSymbolicLink()) continue;
      if (it.isDirectory()) pilha.push(p);
      else if (it.isFile()) {
        try {
          total += fs.lstatSync(p).size;
        } catch {}
      }
    }
  }
  return total;
}
function nodeModules(wt) {
  const tipos = ['server', 'my-app'].map((app) => {
    const st = fs.lstatSync(path.join(wt, app, 'node_modules'), { throwIfNoEntry: false });
    return !st ? null : st.isSymbolicLink() ? 'junção' : 'real';
  });
  return tipos.includes('real') ? 'real' : tipos.includes('junção') ? 'junção' : '—';
}

const agora = Date.now();
const paradas = [];
for (const w of wts) {
  if (w === principal || w.locked || excluir.has(norm(w.worktree))) continue;
  const branch = typeof w.branch === 'string' ? w.branch.replace(/^refs\/heads\//, '') : null;
  const existe = fs.existsSync(w.worktree);
  const idadeDias = dataDe.has(w.HEAD) ? (agora - dataDe.get(w.HEAD)) / 86_400_000 : null;
  const motivos = [];
  if (!existe) motivos.push('pasta não existe (prune)');
  if (branch && mergeadas.has(branch)) motivos.push(mergeadas.get(branch));
  if (idadeDias !== null && idadeDias >= DIAS) motivos.push(`último commit há ${Math.floor(idadeDias)} d`);
  if (!motivos.length) continue;
  let sujos = null;
  if (existe) {
    try {
      sujos = git(['status', '--porcelain'], w.worktree).split(/\r?\n/).filter(Boolean).length;
    } catch {
      sujos = '?';
    }
  }
  paradas.push({
    caminho: w.worktree,
    branch: branch ?? `(detached ${String(w.HEAD).slice(0, 8)})`,
    motivos,
    idadeDias: idadeDias === null ? null : Math.floor(idadeDias),
    sujos,
    nodeModules: existe ? nodeModules(w.worktree) : '—',
    bytes: existe && !semTamanho ? tamanho(w.worktree) : null,
  });
}

// Pastas em .claude/worktrees que o git não conhece: não saem com `git worktree remove`; só contadas.
const pastaWts = path.join(principal.worktree, '.claude', 'worktrees');
const registradas = new Set(wts.map((w) => norm(w.worktree)));
const soltas = fs.existsSync(pastaWts)
  ? fs.readdirSync(pastaWts, { withFileTypes: true }).filter((d) => d.isDirectory() && !registradas.has(norm(path.join(pastaWts, d.name)))).map((d) => d.name)
  : [];

if (args.includes('--json')) {
  console.log(JSON.stringify({ registradas: wts.length, paradas, soltas }, null, 2));
} else {
  const gb = (b) => (b === null ? '—' : `${(b / 2 ** 30).toFixed(2)} GB`);
  console.log(`${wts.length} worktrees registradas; ${paradas.length} paradas (critério: mergeada ou ≥ ${DIAS} d sem commit; ${excluir.size} excluídas por sessão).`);
  console.log('caminho\tbranch\tmotivo\tsujos\tnode_modules\ttamanho');
  for (const p of paradas.sort((a, b) => (b.bytes ?? 0) - (a.bytes ?? 0))) {
    console.log([p.caminho, p.branch, p.motivos.join('; '), p.sujos ?? '—', p.nodeModules, gb(p.bytes)].join('\t'));
  }
  const soma = paradas.reduce((s, p) => s + (p.bytes ?? 0), 0);
  console.log(`total: ${gb(soma)}; com node_modules real: ${paradas.filter((p) => p.nodeModules === 'real').length}; com arquivo sujo: ${paradas.filter((p) => p.sujos > 0).length}`);
  if (soltas.length) console.log(`${soltas.length} pastas em .claude/worktrees não registradas no git (não saem com git worktree remove).`);
}

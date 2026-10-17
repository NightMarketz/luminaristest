#!/usr/bin/env node
// Plano de paralelização ANTES de abrir sessões (PAR-002/PAR-006 de .claude/skills/_PARALLELIZATION-CONTRACT.md).
//   node scripts/paralelo.mjs plano <NÓ...> [--sem-prs] [--json]
//        → ondas de nós que podem rodar ao mesmo tempo (write-sets disjuntos fora dos choke points),
//          conflitos com o motivo, Fase 0 (schema), Fase B (registros em série), nós sem write_set
//          (em dúvida → serial) e nós que esbarram num PR aberto.
//   node scripts/paralelo.mjs sugerir <NÓ>
//        → rascunho de write_set a partir dos caminhos citados no BRIEF que a nota linka. Rascunho:
//          quem planeja confere e grava na nota; o cálculo só usa o que está gravado.
// Frontmatter da nota (JSON, como o resto): `write_set` = globs que o nó vai editar ou criar;
// `registros` = choke points de que precisa (vão para a Fase B, não entram na disjunção).
// Choke points são DADO da tabela PAR-001 — lidos de lá, nunca replicados aqui.
import { readFileSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadVault, stripLink, VAULT } from './plano-vault.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const CONTRATO = join(ROOT, '.claude', 'skills', '_PARALLELIZATION-CONTRACT.md');
const FECHADO = ['done', 'decided'];
const SCHEMA = /^server\/prisma\/(schema\.prisma|migrations\/)/;

export function globToRegex(glob) {
  let re = '';
  for (let i = 0; i < glob.length; i++) {
    const c = glob[i];
    if (c === '*' && glob[i + 1] === '*') { re += glob[i + 2] === '/' ? '(?:.*/)?' : '.*'; i += glob[i + 2] === '/' ? 2 : 1; }
    else if (c === '*') re += '[^/]*';
    else if (c === '?') re += '[^/]';
    else re += c.replace(/[.+^${}()|[\]\\]/g, '\\$&');
  }
  return new RegExp(`^${re}$`);
}
const ehGlob = (p) => /[*?]/.test(p);

// Tabela PAR-001: 1ª coluna, cada `caminho` em crase. `<dom>` vira `*` (i18n: disjunto entre domínios,
// compartilhado dentro — o arquivo do domínio entra no write_set e a disjunção por arquivo resolve).
export function parseChokePoints(md) {
  const sec = md.split('## [PAR-001]')[1]?.split('\n## ')[0] ?? '';
  const out = [];
  for (const line of sec.split('\n')) {
    if (!line.startsWith('| `')) continue;
    const c1 = line.split('|')[1];
    const natureza = line.split('|')[3] ?? '';
    if (/disjunto entre domínios/.test(natureza)) continue;
    for (const m of c1.matchAll(/`([^`\s]+)`/g)) {
      const p = m[1].replace(/<dom>/g, '*');
      if (/^[\w.-]+(\/|$)/.test(p) && !p.startsWith('node')) out.push(p.endsWith('/') ? `${p}**` : p);
    }
  }
  return out;
}

export function gitFiles(root = ROOT) {
  return execFileSync('git', ['ls-files'], { cwd: root, encoding: 'utf8', maxBuffer: 64 << 20 }).split('\n').filter(Boolean);
}

// Conjunto concreto de um write_set: arquivos existentes que casam + caminhos literais (arquivo novo).
export function expandir(globs, files) {
  const set = new Set();
  for (const g of globs) {
    if (!ehGlob(g)) { set.add(g); continue; }
    const re = globToRegex(g);
    for (const f of files) if (re.test(f)) set.add(f);
  }
  return set;
}

function cruzam(a, b) {
  const comum = [...a.set].filter((f) => b.set.has(f));
  // arquivo NOVO citado literalmente num lado e coberto por glob do outro
  for (const [x, y] of [[a, b], [b, a]]) for (const f of x.set) if (!comum.includes(f) && y.res.some((r) => r.test(f))) comum.push(f);
  return comum;
}

/**
 * @param nos   [{ id, estado, depende_de, prs, write_set, registros }]
 * @param todos Map id → { estado } do vault inteiro (dependência fora do lote)
 * @param files git ls-files
 * @param chokes globs da PAR-001
 * @param prs   [{ number, files }] PRs abertos
 */
export function planejar({ nos, todos = new Map(), files, chokes, prs = [] }) {
  const chokeRes = chokes.map(globToRegex);
  const ehChoke = (f) => chokeRes.some((r) => r.test(f));
  const lote = new Map(nos.map((n) => [n.id, n]));
  const sem = [], fase0 = new Set(), faseB = new Map(), bloqueados = [], depAberta = [];
  const calc = [];
  for (const n of nos) {
    const regs = n.registros ?? [];
    for (const r of regs) { if (SCHEMA.test(r)) fase0.add(n.id); else { if (!faseB.has(r)) faseB.set(r, []); faseB.get(r).push(n.id); } }
    if (!Array.isArray(n.write_set) || !n.write_set.length) { sem.push(n.id); continue; }
    const bruto = expandir(n.write_set, files);
    const set = new Set();
    for (const f of bruto) {
      if (SCHEMA.test(f)) { fase0.add(n.id); continue; }
      if (ehChoke(f)) { if (!faseB.has(f)) faseB.set(f, []); if (!faseB.get(f).includes(n.id)) faseB.get(f).push(n.id); continue; }
      set.add(f);
    }
    const res = n.write_set.filter(ehGlob).map(globToRegex);
    calc.push({ id: n.id, set, res, n });
    for (const d of (n.depende_de ?? []).map(stripLink)) {
      if (!lote.has(d) && !FECHADO.includes(todos.get(d)?.estado)) depAberta.push({ id: n.id, dep: d });
    }
  }
  // PR aberto que não é do próprio nó (frontmatter `prs`) e cruza o write-set → espera esse PR.
  for (const c of calc) {
    const proprios = new Set((c.n.prs ?? []).map((p) => Number(String(p).replace('#', ''))));
    for (const pr of prs) {
      if (proprios.has(pr.number)) continue;
      const comum = cruzam(c, { set: new Set(pr.files.filter((f) => !ehChoke(f) && !SCHEMA.test(f))), res: [] });
      if (comum.length) bloqueados.push({ id: c.id, pr: pr.number, arquivos: comum });
    }
  }
  const conflitos = [];
  const viz = new Map(calc.map((c) => [c.id, new Set()]));
  for (let i = 0; i < calc.length; i++) for (let j = i + 1; j < calc.length; j++) {
    const comum = cruzam(calc[i], calc[j]);
    if (comum.length) { conflitos.push({ a: calc[i].id, b: calc[j].id, arquivos: comum }); viz.get(calc[i].id).add(calc[j].id); viz.get(calc[j].id).add(calc[i].id); }
  }
  // Ondas: dependência dentro do lote vem antes; dois vizinhos nunca na mesma onda. Guloso por grau.
  const onda = new Map();
  const deps = (id) => (lote.get(id).depende_de ?? []).map(stripLink).filter((d) => viz.has(d));
  const pend = calc.map((c) => c.id).sort((x, y) => viz.get(y).size - viz.get(x).size || x.localeCompare(y));
  let guard = 0;
  while (pend.length && guard++ < 10000) {
    const k = pend.findIndex((id) => deps(id).every((d) => onda.has(d)));
    if (k < 0) { for (const id of pend) depAberta.push({ id, dep: 'ciclo de depende_de no lote' }); break; }
    const id = pend.splice(k, 1)[0];
    let w = Math.max(1, ...deps(id).map((d) => onda.get(d) + 1));
    while ([...viz.get(id)].some((v) => onda.get(v) === w)) w++;
    onda.set(id, w);
  }
  const ondas = [];
  for (const [id, w] of onda) (ondas[w - 1] ??= []).push(id);
  return {
    ondas: ondas.map((o) => (o ?? []).sort()),
    conflitos, fase0: [...fase0].sort(),
    faseB: Object.fromEntries([...faseB].sort((x, y) => x[0].localeCompare(y[0]))),
    semWriteSet: sem.sort(), bloqueados, depAberta,
  };
}

export function relatorio(p) {
  const L = ['## Plano de paralelização (scripts/paralelo.mjs — PAR-006)', ''];
  if (!p.ondas.length) L.push('**Ondas:** nenhuma — nenhum nó do lote tem `write_set`');
  p.ondas.forEach((o, i) => L.push(`**Onda ${i + 1}${i ? ` (depois da ${i})` : ''} — em paralelo:** ${o.join(' · ') || '—'}`));
  L.push('', '**Conflitos (não rodam juntos):**');
  if (!p.conflitos.length) L.push('- nenhum');
  for (const c of p.conflitos) L.push(`- ${c.a} × ${c.b}: ${c.arquivos.slice(0, 4).join(', ')}${c.arquivos.length > 4 ? ` (+${c.arquivos.length - 4})` : ''}`);
  L.push('', `**Fase 0 — schema (serial, uma migração, antes do fanout):** ${p.fase0.join(' · ') || '—'}`, '', '**Fase B — registros (serial, integrador único):**');
  const b = Object.entries(p.faseB);
  if (!b.length) L.push('- nenhum');
  for (const [f, ids] of b) L.push(`- \`${f}\`: ${ids.join(' · ')}`);
  if (p.semWriteSet.length) L.push('', `**Sem \`write_set\` — serial por padrão (PAR-005):** ${p.semWriteSet.join(' · ')}`);
  if (p.bloqueados.length) {
    L.push('', '**Esbarram em PR aberto — esperar o merge ou entrar depois:**');
    for (const x of p.bloqueados) L.push(`- ${x.id} × #${x.pr}: ${x.arquivos.slice(0, 4).join(', ')}${x.arquivos.length > 4 ? ` (+${x.arquivos.length - 4})` : ''}`);
  }
  if (p.depAberta.length) {
    L.push('', '**Dependência aberta fora do lote:**');
    for (const x of p.depAberta) L.push(`- ${x.id} → ${x.dep}`);
  }
  return L.join('\n') + '\n';
}

// Caminhos citados em crase no(s) BRIEF(s) que a nota linka, resolvidos contra o repo.
export function sugerir(nota, files, root = ROOT) {
  const briefs = [...new Set([...nota.body.matchAll(/\]\(([^)\s]*brief[^)\s]*\.md)\)/gi)].map((m) => resolve(dirname(nota.file), m[1].split('#')[0])))];
  // Só código: BRIEF cita docs/ADRs como referência, não como edição.
  const codigo = /^(server|my-app|scripts)\//;
  const porNome = new Map();
  for (const f of files) { const b = f.split('/').pop(); if (!porNome.has(b)) porNome.set(b, []); porNome.get(b).push(f); }
  const out = new Set();
  for (const b of briefs) {
    if (!existsSync(b)) continue;
    for (const m of readFileSync(b, 'utf8').matchAll(/`([\w@./*<>[\]-]+\.(?:ts|tsx|js|mjs|json|prisma|md))(?::\d+[-\d]*)?`/g)) {
      const p = m[1];
      const alvo = codigo.test(p) ? p : porNome.get(p)?.length === 1 ? porNome.get(p)[0] : null;
      if (alvo && codigo.test(alvo)) out.add(alvo);
    }
  }
  return { briefs: briefs.map((b) => b.slice(root.length + 1).replace(/\\/g, '/')), write_set: [...out].sort() };
}

function prsAbertos() {
  const raw = execFileSync('gh', ['pr', 'list', '--state', 'open', '--limit', '100', '--json', 'number,files'], { cwd: ROOT, encoding: 'utf8' });
  return JSON.parse(raw).map((p) => ({ number: p.number, files: p.files.map((f) => f.path) }));
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [cmd, ...args] = process.argv.slice(2);
  const ids = args.filter((a) => !a.startsWith('--'));
  const vault = loadVault(VAULT);
  const byId = new Map(vault.filter((n) => n.fm?.id).map((n) => [n.fm.id, n]));
  const faltam = ids.filter((id) => !byId.has(id));
  if (!cmd || !['plano', 'sugerir'].includes(cmd) || !ids.length || faltam.length) {
    if (faltam.length) console.error(`nó inexistente no vault: ${faltam.join(', ')}`);
    console.error('uso: node scripts/paralelo.mjs plano <NÓ...> [--sem-prs] [--json] | sugerir <NÓ>');
    process.exit(2);
  }
  const files = gitFiles();
  if (cmd === 'sugerir') {
    const s = sugerir(byId.get(ids[0]), files);
    console.log(`BRIEF(s): ${s.briefs.join(', ') || 'nenhum linkado na nota'}`);
    console.log(`write_set: ${JSON.stringify(s.write_set)}`);
    console.log('(rascunho — confira contra o BRIEF, acrescente os arquivos NOVOS e grave na nota)');
  } else {
    const p = planejar({
      nos: ids.map((id) => ({ id, ...byId.get(id).fm })),
      todos: new Map([...byId].map(([id, n]) => [id, n.fm])),
      files, chokes: parseChokePoints(readFileSync(CONTRATO, 'utf8')),
      prs: args.includes('--sem-prs') ? [] : prsAbertos(),
    });
    process.stdout.write(args.includes('--json') ? JSON.stringify(p, null, 2) + '\n' : relatorio(p));
  }
}

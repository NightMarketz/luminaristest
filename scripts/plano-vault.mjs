#!/usr/bin/env node
// Vault do plano (docs/plano/): gera o índice a partir do frontmatter das notas e checa a integridade.
//   node scripts/plano-vault.mjs index   → reescreve docs/plano/_INDEX.md e docs/plano/_ANCORAS.md
//   node scripts/plano-vault.mjs check   → exit 1 se link [[x]] não resolve, frontmatter inválido,
//                                          dependência para nó inexistente ou índice desatualizado.
// Frontmatter: uma chave por linha, valor em JSON (JSON é YAML válido; o Obsidian lê como propriedade).
import { readFileSync, writeFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, relative, basename, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export const VAULT = join(ROOT, 'docs', 'plano');
const GENERATED = ['_INDEX.md', '_ANCORAS.md'];
const OPEN = ['inflight', 'ready', 'planned', 'blocked', 'human-open'];
const DOMINIOS = ['contabil', 'financeiro', 'fiscal'];

export function walk(dir) {
  return readdirSync(dir).flatMap((n) => {
    const p = join(dir, n);
    return statSync(p).isDirectory() ? walk(p) : n.endsWith('.md') ? [p] : [];
  });
}

export function parseNote(text) {
  const t = text.replace(/\r\n/g, '\n');
  if (!t.startsWith('---\n')) return { fm: null, body: t };
  const end = t.indexOf('\n---\n', 4);
  if (end < 0) throw new Error('frontmatter sem fechamento');
  const fm = {};
  for (const line of t.slice(4, end).split('\n')) {
    if (!line.trim()) continue;
    const i = line.indexOf(':');
    if (i < 0) throw new Error(`linha de frontmatter sem ':' → ${line}`);
    fm[line.slice(0, i).trim()] = JSON.parse(line.slice(i + 1).trim());
  }
  return { fm, body: t.slice(end + 5) };
}

export const stripLink = (s) => String(s).replace(/\?$/, '').replace(/^\[\[|\]\]$/g, '');
const link = (id) => `[[${id}]]`;

export function loadVault(vault = VAULT) {
  const notes = [];
  for (const f of walk(vault)) {
    if (GENERATED.includes(basename(f))) continue;
    let parsed;
    try { parsed = parseNote(readFileSync(f, 'utf8')); } catch (e) { throw new Error(`${basename(f)}: ${e.message}`); }
    notes.push({ file: f, stem: basename(f, '.md'), ...parsed });
  }
  return notes;
}

const cell = (c) => String(c ?? '—').replace(/\|/g, '\\|').replace(/\n/g, ' ');
const row = (cells) => `| ${cells.map(cell).join(' | ')} |`;

export function buildIndex(notes) {
  const nodes = notes.filter((n) => n.fm && n.fm.id);
  const byId = new Map(nodes.map((n) => [n.fm.id, n]));
  const done = (id) => ['done', 'decided'].includes(byId.get(stripLink(id))?.fm.estado);
  const deps = (n) => (n.fm.depende_de ?? []).map(stripLink);
  const out = [
    '# Índice do plano (GERADO — não edite)', '',
    '> Gerado por `node scripts/plano-vault.mjs index` a partir do frontmatter das notas. Para mudar um estado,',
    '> edite o frontmatter da nota do nó e regenere. Protocolo de leitura em [[README]].', '',
  ];

  out.push('## Régua (calculada)', '', row(['Domínio', 'Fechados', 'Total']), row(['---', '---', '---']));
  let fT = 0, tT = 0;
  for (const d of DOMINIOS) {
    const r = nodes.filter((n) => n.fm.tipo === 'regua' && n.fm.dominio === d);
    // fecha_regua=false: trabalho mergeado que a leitura ratificada conta como crescimento de outro nó.
    const f = r.filter((n) => n.fm.estado === 'done' && n.fm.fecha_regua !== false).length;
    fT += f; tT += r.length;
    out.push(row([d, f, r.length]));
  }
  out.push(row(['**total**', `**${fT}**`, `**${tT}**`]), '');

  const REFERENCIA = ['diferido', 'trilho', 'rejeitada'];
  const aberto = nodes.filter((n) => OPEN.includes(n.fm.estado) && !REFERENCIA.includes(n.fm.tipo));
  const livres = aberto.filter((n) => ['ready', 'planned', 'inflight'].includes(n.fm.estado) && deps(n).every(done));
  out.push('## Destravados agora (abertos, todas as dependências fechadas)', '',
    '> Candidatos a próximo passo — **ainda exigem autorização citável do dono** (ORCH-006).', '',
    row(['Nó', 'Título', 'Estado', 'Autorização']), row(['---', '---', '---', '---']));
  for (const n of [...livres].sort((a, b) => a.fm.id.localeCompare(b.fm.id))) out.push(row([link(n.fm.id), n.fm.titulo, n.fm.estado, n.fm.autorizacao]));
  out.push('');

  const grupos = [
    ['Gates humanos e dado externo', (n) => ['gate', 'dado-externo'].includes(n.fm.tipo)],
    ['Contábil', (n) => n.fm.dominio === 'contabil'],
    ['Financeiro', (n) => n.fm.dominio === 'financeiro'],
    ['Fiscal', (n) => n.fm.dominio === 'fiscal'],
    ['Motor, plataforma, FE e outros', () => true],
  ];
  const usados = new Set();
  out.push('## Fila aberta', '');
  for (const [titulo, pred] of grupos) {
    const g = aberto.filter((n) => !usados.has(n.fm.id) && pred(n));
    if (!g.length) continue;
    g.forEach((n) => usados.add(n.fm.id));
    out.push(`### ${titulo}`, '', row(['Nó', 'Título', 'Estado', 'Depende de (✗ = aberto)', 'Autorização']), row(['---', '---', '---', '---', '---']));
    for (const n of g.sort((a, b) => a.fm.id.localeCompare(b.fm.id))) {
      const d = deps(n).map((x) => `${link(x)}${done(x) ? '' : ' ✗'}`).join(', ');
      out.push(row([link(n.fm.id), n.fm.titulo, `${n.fm.estado}${n.fm.estado_detalhe ? ` — ${n.fm.estado_detalhe}` : ''}`, d || '—', n.fm.autorizacao]));
    }
    out.push('');
  }

  out.push('## Fechados, decididos e referência', '');
  const fechados = nodes.filter((n) => !aberto.includes(n));
  for (const t of [...new Set(fechados.map((n) => n.fm.tipo))].sort()) {
    const g = fechados.filter((n) => n.fm.tipo === t).sort((a, b) => a.fm.id.localeCompare(b.fm.id));
    out.push(`- **${t}** (${g.length}): ${g.map((n) => link(n.fm.id)).join(' · ')}`);
  }
  out.push('');

  const anc = ['# Âncoras do SDD → notas (GERADO — não edite)', '',
    '> Citação antiga "master map §5.1" = SDD §M5.1 = as notas abaixo. Resolve referências em ADRs, briefs e skills.', '',
    row(['Âncora', 'Notas']), row(['---', '---'])];
  const porAnc = new Map();
  for (const n of nodes) for (const a of String(n.fm.ancora_sdd ?? '').split(/\s*[|;,]\s*/).filter(Boolean)) {
    if (!porAnc.has(a)) porAnc.set(a, []);
    porAnc.get(a).push(n.fm.id);
  }
  for (const [a, ids] of [...porAnc].sort((x, y) => x[0].localeCompare(y[0]))) anc.push(row([a, ids.sort().map(link).join(' · ')]));
  return { '_INDEX.md': out.join('\n') + '\n', '_ANCORAS.md': anc.join('\n') + '\n' };
}

export function check(vault = VAULT) {
  let notes;
  try { notes = loadVault(vault); } catch (e) { return [`frontmatter: ${e.message}`]; }
  const errs = [];
  const stems = new Set([...notes.map((n) => n.stem), ...GENERATED.map((g) => basename(g, '.md'))]);
  const ids = new Set(notes.filter((n) => n.fm?.id).map((n) => n.fm.id));
  const seen = new Map();
  for (const n of notes) {
    const rel = relative(ROOT, n.file).replace(/\\/g, '/');
    if (n.fm?.id) {
      if (seen.has(n.fm.id)) errs.push(`${rel}: id duplicado "${n.fm.id}" (também em ${seen.get(n.fm.id)})`);
      seen.set(n.fm.id, rel);
      for (const k of ['tipo', 'titulo', 'estado']) if (!n.fm[k]) errs.push(`${rel}: frontmatter sem "${k}"`);
      for (const d of (n.fm.depende_de ?? []).map(stripLink)) if (!ids.has(d)) errs.push(`${rel}: depende_de "${d}" não é nó do vault`);
    }
    let fence = false;
    for (const line of n.body.split('\n')) {
      if (line.trimStart().startsWith('```')) fence = !fence;
      if (fence) continue;
      for (const m of line.matchAll(/\[\[([^\]|#]+)(?:[#|][^\]]*)?\]\]/g)) {
        if (!stems.has(m[1].trim())) errs.push(`${rel}: link [[${m[1]}]] não resolve`);
      }
      for (const m of line.matchAll(/\]\((?!https?:|#|mailto:)([^)\s]+)\)/g)) {
        const p = m[1].split('#')[0].replace(/:\d+(-\d+)?$/, '');
        if (p && !existsSync(join(dirname(n.file), p))) errs.push(`${rel}: link (${m[1]}) não existe no disco`);
      }
    }
  }
  for (const [name, content] of Object.entries(buildIndex(notes))) {
    const p = join(vault, name);
    const cur = existsSync(p) ? readFileSync(p, 'utf8').replace(/\r\n/g, '\n') : '';
    if (cur !== content) errs.push(`docs/plano/${name} desatualizado — rode: node scripts/plano-vault.mjs index`);
  }
  return errs;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const cmd = process.argv[2];
  if (cmd === 'index') {
    for (const [name, content] of Object.entries(buildIndex(loadVault()))) writeFileSync(join(VAULT, name), content);
    console.log('índice regenerado');
  } else if (cmd === 'check') {
    const errs = check();
    for (const e of errs) console.error(e);
    console.log(errs.length ? `${errs.length} problema(s)` : 'vault íntegro');
    process.exit(errs.length ? 1 : 0);
  } else {
    console.error('uso: node scripts/plano-vault.mjs index|check');
    process.exit(2);
  }
}

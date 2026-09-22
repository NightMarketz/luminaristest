#!/usr/bin/env node
// prova-runner — o ÚNICO emissor de PASSOU. Reexecuta cada `command` do bloco PROVA de um retorno
// (.claude/retornos/<slug>.md), confere log+sha256, compara exit real × declarado × VEREDITO e
// sobrescreve a linha `veredicto:` do arquivo. BRIEF: docs/operating-manual/CERCA-DE-EXECUCAO-brief.md
//
// Ordem do pipeline (item 7 — fixa, nomeada): STAGES = prova → invariantes → (review LLM fora daqui,
// nunca condição de PASSOU).
//
// uso: node scripts/prova-runner.mjs <retorno.md> [...]   |   --all   |   --no-write (não reescreve)
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export const STAGES = ['prova', 'invariantes', 'review-llm(opcional, não-gate)'];
const TIMEOUT_MS = 10 * 60 * 1000; // F-3 (a): reexecuta tudo, sem allowlist

// ponytail: YAML mínimo — só `PROVA:` + lista de mapas planos + `VEREDITO:`. Qualquer outra forma = SEM-PROVA.
export function parseProva(text) {
  const t = text.replace(/\r\n/g, '\n');
  // review a8409e1c #1: escolhe o fence que contém PROVA, não o primeiro
  const m = [...t.matchAll(/```ya?ml\n([\s\S]*?)```/g)].find((x) => /^PROVA:\s*$/m.test(x[1]));
  if (!m) return null;
  const items = [];
  let cur = null;
  let veredito = null;
  for (const raw of m[1].split('\n')) {
    // review a8409e1c #2: `#` só é comentário fora de aspas (nº par de `"` antes dele)
    const line = raw.replace(/\s+#.*$/, (c, off) => ((raw.slice(0, off).match(/(?<!\\)"/g) || []).length % 2 ? c : '')).trimEnd();
    if (/^PROVA:/.test(line)) continue;
    const v = line.match(/^VEREDITO:\s*(\S+)/);
    if (v) { veredito = v[1]; continue; }
    const kv = line.match(/^\s*(-\s+)?([a-z_0-9]+):\s*(.*)$/);
    if (!kv) continue;
    if (kv[1]) { cur = {}; items.push(cur); }
    if (!cur) return null;
    cur[kv[2]] = kv[3].replace(/^"(.*)"$/, '$1').replace(/\\"/g, '"');
  }
  if (!items.length || !veredito) return null;
  for (const it of items) {
    if (!it.command || !/^-?\d+$/.test(it.exit_code ?? '') || !it.log || !it.sha256) return null;
    it.exit_code = Number(it.exit_code);
  }
  return { items, veredito };
}

const sha256 = (p) => createHash('sha256').update(readFileSync(p)).digest('hex');

export function runRetorno(file, { write = true, cwd = ROOT } = {}) {
  const text = readFileSync(file, 'utf8');
  const slug = file.replace(/\\/g, '/').split('/').pop().replace(/\.md$/, '');
  const prova = parseProva(text);
  let status, reason = '', n = 0;

  if (!prova) {
    if (/^veredicto:\s*N\/A\b/mi.test(text)) return emit(file, text, slug, 'N/A', 0, 'sem PROVA declarada', write);
    return emit(file, text, slug, 'FALHOU', 0, 'SEM-PROVA', write);
  }
  n = prova.items.length;
  // STAGE 1 — prova: reexecução
  for (const [i, it] of prova.items.entries()) {
    const logPath = resolve(cwd, it.log);
    if (!existsSync(logPath)) { status = 'FALHOU'; reason = `cmd${i + 1}: log ausente ${it.log}`; break; }
    if (sha256(logPath) !== it.sha256) { status = 'FALHOU'; reason = `cmd${i + 1}: sha256 do log não bate`; break; }
    const r = spawnSync(it.command, { shell: true, cwd, timeout: TIMEOUT_MS, stdio: 'ignore' });
    const real = r.status ?? 124;
    if (real !== 0) { status = 'FALHOU'; reason = `cmd${i + 1}: exit ${real}` + (real !== it.exit_code ? ` (declarado ${it.exit_code})` : ''); break; }
    if (real !== it.exit_code) { status = 'INCONSISTENTE'; reason = `cmd${i + 1}: exit real ${real} ≠ declarado ${it.exit_code}`; break; }
  }
  if (!status && prova.veredito !== 'PASS') { status = 'INCONSISTENTE'; reason = `todos exit 0 mas VEREDITO ${prova.veredito}`; }
  // STAGE 2 — invariantes: o que a seção Arquivos aciona (tsc / skill-audit)
  if (!status) {
    for (const [pattern, cmd] of INVARIANTES) {
      if (!new RegExp(`^- .*${pattern}`, 'm').test(text.replace(/\r\n/g, '\n'))) continue;
      const r = spawnSync(cmd, { shell: true, cwd, timeout: TIMEOUT_MS, stdio: 'ignore' });
      if (r.status !== 0) { status = 'FALHOU'; reason = `invariante: ${cmd} → exit ${r.status}`; break; }
    }
  }
  return emit(file, text, slug, status ?? 'PASSOU', n, reason, write);
}

export const INVARIANTES = [
  ['server/src/', 'cd server && npx tsc --noEmit'],
  ['my-app/', 'cd my-app && npx tsc --noEmit'],
  ['\\.claude/skills/', 'node .claude/skills/skill-audit/skill-audit.mjs run'],
];

function emit(file, text, slug, status, n, reason, write) {
  if (write && status !== 'N/A') {
    const nl = text.includes('\r\n') ? '\r\n' : '\n';
    const out = /^veredicto:.*$/m.test(text)
      ? text.replace(/^veredicto:.*$/m, `veredicto: ${status}`)
      : `veredicto: ${status}${nl}${text}`;
    writeFileSync(file, out);
  }
  return { slug, status, n, reason };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const write = !args.includes('--no-write');
  let files = args.filter((a) => !a.startsWith('--'));
  if (args.includes('--all')) {
    const dir = join(ROOT, '.claude', 'retornos');
    files = existsSync(dir) ? readdirSync(dir).filter((f) => f.endsWith('.md')).map((f) => join(dir, f)) : [];
    if (!files.length) { console.log('retornos: diretório vazio — captura desligada, não sucesso'); process.exit(1); }
  }
  if (!files.length) { console.error('uso: prova-runner <retorno.md> | --all [--no-write]'); process.exit(2); }
  let ok = true;
  for (const f of files) {
    const r = runRetorno(f, { write });
    ok &&= r.status === 'PASSOU' || r.status === 'N/A';
    console.log(`${r.slug} ${r.status} ${r.n} ${r.reason}`.trim());
  }
  process.exit(ok ? 0 : 1);
}

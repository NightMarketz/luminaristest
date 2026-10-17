#!/usr/bin/env node
// Hook PostToolUse (Edit|Write) — PROPOSTA da Fase 4 do ADR-ARCH-BOUNDARIES (não ligado em
// .claude/settings.json). Roda o dependency-cruiser só no arquivo editado, com a config e o baseline
// do pacote (server/ ou my-app/), e devolve as violações NOVAS ao agente como additionalContext.
// Nunca bloqueia: sai 0 sempre, inclusive em erro interno (o erro vira texto de contexto).
//
// Limite conhecido: cruza a partir do arquivo editado, então pega o que ELE importa (e ciclo que
// passe por ele), não quem passou a importá-lo. O gate completo continua sendo `npm run check:arch`.
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const TEST = /(__tests__|\.(test|spec)\.[cm]?[jt]sx?$)/;
const PACKAGES = {
  server: { dirs: ['src'], exts: /\.[cm]?[jt]s$/ },
  'my-app': { dirs: ['pages', 'features', 'components', 'lib', 'types'], exts: /\.[cm]?[jt]sx?$/ },
};

function emit(text) {
  if (!text) return;
  process.stdout.write(
    JSON.stringify({ hookSpecificOutput: { hookEventName: 'PostToolUse', additionalContext: text } }),
  );
}

function target(filePath) {
  if (!filePath) return null;
  const abs = path.resolve(filePath);
  for (const [pkg, spec] of Object.entries(PACKAGES)) {
    const pkgDir = path.join(ROOT, pkg);
    const rel = path.relative(pkgDir, abs).split(path.sep).join('/');
    if (rel.startsWith('..') || path.isAbsolute(rel)) continue;
    if (!spec.dirs.includes(rel.split('/')[0])) return null;
    if (!spec.exts.test(rel) || rel.endsWith('.d.ts') || TEST.test(rel)) return null;
    if (!existsSync(abs)) return null;
    return { pkg, pkgDir, rel };
  }
  return null;
}

function cruise({ pkg, pkgDir, rel }) {
  const bin = path.join(pkgDir, 'node_modules', 'dependency-cruiser', 'bin', 'dependency-cruise.mjs');
  if (!existsSync(bin)) return `[arch-hook] ${pkg}: dependency-cruiser ausente (rode npm ci em ${pkg}/).`;
  const r = spawnSync(
    process.execPath,
    [bin, rel, '--config', '.dependency-cruiser.cjs',
      '--ignore-known', '.dependency-cruiser-known-violations.json', '--output-type', 'json'],
    { cwd: pkgDir, encoding: 'utf8', maxBuffer: 256 * 1024 * 1024 },
  );
  let out;
  try {
    out = JSON.parse(r.stdout);
  } catch {
    return `[arch-hook] ${pkg}/${rel}: depcruise falhou (exit ${r.status}): ${(r.stderr || r.stdout || '').trim().slice(0, 800)}`;
  }
  const mine = (out.summary?.violations ?? []).filter(
    (v) => v.rule?.severity !== 'ignore' && (v.from === rel || (v.cycle ?? []).some((c) => (c.name ?? c) === rel)),
  );
  if (mine.length === 0) return '';
  const lines = mine.map((v) => {
    const via = v.cycle?.length ? ` (ciclo: ${v.cycle.map((c) => c.name ?? c).join(' → ')})` : '';
    return `- ${v.rule.name}: ${v.from} → ${v.to}${via}`;
  });
  return [
    `[arch-hook] ${mine.length} violação(ões) de fronteira NOVA(S) em ${pkg}/${rel}` +
      ' (fora do baseline; `npm run check:arch` vai barrar). Regras em ' +
      `${pkg}/.dependency-cruiser.cjs; decisão em docs/adr/ADR-ARCH-BOUNDARIES.md:`,
    ...lines,
  ].join('\n');
}

try {
  const input = JSON.parse(readFileSync(0, 'utf8') || '{}');
  const t = target(input.tool_input?.file_path);
  if (t) emit(cruise(t));
} catch (e) {
  emit(`[arch-hook] erro interno (edição não bloqueada): ${e?.message ?? e}`);
}
process.exit(0);

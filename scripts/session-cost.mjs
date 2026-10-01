// session-cost — soma tokens e custo (US$) das sessões do Claude Code que rodaram numa worktree.
//   node scripts/session-cost.mjs            → worktree atual (git toplevel)
//   node scripts/session-cost.mjs <caminho>  → outra worktree
// Fonte: os .jsonl que o Claude Code grava em ~/.claude/projects/<cwd codificado>/ (sessão + subagents/),
// campo `message.usage` de cada resposta. Inclui o revisor despachado como subagente, separado por modelo.
// Medição para o teste Sonnet × Opus (dono, 2026-10-01) — não é gate, nada roda na CI.
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

// US$ por milhão de tokens — skill claude-api, tabela "Current Models" (cached 2026-09-25).
// Escrita de cache: 1,25× o input (TTL 5 min) e 2× (TTL 1 h) — shared/prompt-caching.md §Economics.
export const PRICES = {
  'claude-opus-5-5': { input: 4, output: 20, cacheRead: 0.2 },
  'claude-sonnet-5-5': { input: 2, output: 10, cacheRead: 0.2 },
  'claude-haiku-4-5': { input: 1, output: 5, cacheRead: 0.1 },
};

// Cada bloco de conteúdo vira uma linha com o mesmo message.id e o mesmo usage — conta uma vez por id.
export function tally(records) {
  const byId = new Map();
  for (const r of records) {
    const m = r?.message;
    if (r?.type === 'assistant' && m?.id && m.usage && m.model && m.model !== '<synthetic>') byId.set(m.id, { ...m, sidechain: !!r.isSidechain });
  }
  const models = {};
  for (const m of byId.values()) {
    const u = m.usage;
    const cw1h = u.cache_creation?.ephemeral_1h_input_tokens ?? 0;
    const cw5m = u.cache_creation?.ephemeral_5m_input_tokens ?? (u.cache_creation_input_tokens ?? 0) - cw1h;
    const t = (models[m.model] ??= { input: 0, cacheWrite5m: 0, cacheWrite1h: 0, cacheRead: 0, output: 0, requests: 0, usd: 0 });
    t.input += u.input_tokens ?? 0;
    t.cacheWrite5m += cw5m;
    t.cacheWrite1h += cw1h;
    t.cacheRead += u.cache_read_input_tokens ?? 0;
    t.output += u.output_tokens ?? 0;
    t.requests += 1;
    const p = PRICES[m.model];
    // ponytail: fast mode = 2× tudo (preço oficial do Opus 5.5 fast é 2× input/output; cache read assumido 2×)
    const k = u.speed === 'fast' ? 2 : 1;
    if (p) t.usd += k * ((u.input_tokens ?? 0) * p.input + cw5m * p.input * 1.25 + cw1h * p.input * 2
      + (u.cache_read_input_tokens ?? 0) * p.cacheRead + (u.output_tokens ?? 0) * p.output) / 1e6;
    else t.usd = NaN; // modelo fora da tabela: tokens contam, custo fica explícito como desconhecido
  }
  const usd = Object.values(models).reduce((s, t) => s + t.usd, 0);
  return { models, usd };
}

export function projectDir(worktree) {
  return join(homedir(), '.claude', 'projects', worktree.replace(/[^A-Za-z0-9]/g, '-'));
}

function readJsonl(file) {
  return readFileSync(file, 'utf8').split('\n').filter(Boolean).flatMap((l) => {
    try { return [JSON.parse(l)]; } catch { return []; }
  });
}

function main() {
  const worktree = process.argv[2] ?? execSync('git rev-parse --show-toplevel').toString().trim();
  const dir = projectDir(worktree);
  if (!existsSync(dir)) { console.error(`sem transcrições em ${dir}`); process.exit(1); }
  const files = [];
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    if (e.isFile() && e.name.endsWith('.jsonl')) files.push(join(dir, e.name));
    const sub = join(dir, e.name, 'subagents');
    if (e.isDirectory() && existsSync(sub)) for (const f of readdirSync(sub)) if (f.endsWith('.jsonl')) files.push(join(sub, f));
  }
  const perFile = files.map(readJsonl);
  const records = perFile.flat();
  const { models, usd } = tally(records);
  // duração = soma de (última − primeira linha) por arquivo; só sessões principais (subagente roda dentro delas); worktree reaproveitada não soma o intervalo entre sessões
  const min = Math.round(perFile.filter((_, i) => !files[i].includes('subagents')).reduce((s, rs) => {
    const st = rs.map((r) => r.timestamp).filter(Boolean).sort();
    return s + (st.length ? Date.parse(st.at(-1)) - Date.parse(st[0]) : 0);
  }, 0) / 60000);
  const k = (n) => `${(n / 1000).toFixed(0)}k`;
  console.log(`worktree: ${worktree}\narquivos: ${files.length} · duração: ${min} min`);
  for (const [model, t] of Object.entries(models)) {
    console.log(`${model}: ${t.requests} req · input ${k(t.input)} · cache-write ${k(t.cacheWrite5m + t.cacheWrite1h)} · cache-read ${k(t.cacheRead)} · output ${k(t.output)} · US$ ${t.usd.toFixed(2)}`);
  }
  console.log(`custo: US$ ${usd.toFixed(2)} · ${Object.entries(models).map(([m, t]) => `${m} US$ ${t.usd.toFixed(2)}`).join(' + ')} · ${min} min`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) main();

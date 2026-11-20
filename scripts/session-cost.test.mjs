// node --test scripts/session-cost.test.mjs
// O erro que este teste pega: contar o mesmo message.id várias vezes (o transcript grava uma linha por bloco
// de conteúdo, todas com o mesmo usage) — inflaria o custo de toda sessão por um fator ~2-5.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { tally, projectDir } from './session-cost.mjs';

const usage = { input_tokens: 1_000_000, output_tokens: 1_000_000, cache_read_input_tokens: 1_000_000,
  cache_creation_input_tokens: 2_000_000, cache_creation: { ephemeral_5m_input_tokens: 1_000_000, ephemeral_1h_input_tokens: 1_000_000 } };
const line = (id, model, extra = {}) => ({ type: 'assistant', message: { id, model, usage: { ...usage, ...extra } } });

test('dedupe por message.id e preço do Sonnet 5.5', () => {
  const { models, usd } = tally([line('a', 'claude-sonnet-5-5'), line('a', 'claude-sonnet-5-5'), { type: 'user', message: {} }]);
  assert.equal(models['claude-sonnet-5-5'].requests, 1);
  // 2 input + 2×1,25 write5m + 2×2 write1h + 0,2 read + 10 output
  assert.equal(usd.toFixed(2), (2 + 2.5 + 4 + 0.2 + 10).toFixed(2));
});

test('Opus 5.5 e revisor em subagente somam separados por modelo', () => {
  const { models, usd } = tally([line('a', 'claude-sonnet-5-5'), { ...line('b', 'claude-opus-5-5'), isSidechain: true }]);
  assert.equal(models['claude-opus-5-5'].usd.toFixed(2), (4 + 5 + 8 + 0.2 + 20).toFixed(2));
  assert.equal(usd.toFixed(2), (18.7 + 37.2).toFixed(2));
});

// Preços oficiais de 20/11/2026 (platform.claude.com/docs/en/about-claude/pricing): cache hit do Sonnet 5.5 é
// 0,05× ($0,10), não 0,1×; Haiku 5.5 e Fable 5.2 estavam fora da tabela e saíam NaN.
const so = (model, u) => tally([{ type: 'assistant', message: { id: 'x', model, usage: u } }]).usd;

test('cache hit do Sonnet 5.5 custa $0,10 por milhão', () => {
  assert.equal(so('claude-sonnet-5-5', { cache_read_input_tokens: 1_000_000 }).toFixed(2), '0.10');
});

test('Fable 5.2: $8 input, $40 output, $0,20 cache hit', () => {
  assert.equal(so('claude-fable-5-2', { input_tokens: 1_000_000, output_tokens: 1_000_000, cache_read_input_tokens: 1_000_000 }).toFixed(2), (8 + 40 + 0.2).toFixed(2));
});

test('Haiku 5.5 até 100k de prompt: $0,10 input, $0,50 output, $0,01 cache hit', () => {
  assert.equal(so('claude-haiku-5-5', { input_tokens: 50_000, output_tokens: 1_000_000, cache_read_input_tokens: 40_000 }).toFixed(6),
    ((50_000 * 0.1 + 1_000_000 * 0.5 + 40_000 * 0.01) / 1e6).toFixed(6));
});

test('Haiku 5.5 acima de 100k de prompt (input + cache) paga a faixa longa em tudo', () => {
  // 60k input + 50k cache read = 110k de prompt → $0,50 input, $0,05 cache hit, $2,50 output
  assert.equal(so('claude-haiku-5-5', { input_tokens: 60_000, output_tokens: 10_000, cache_read_input_tokens: 50_000 }).toFixed(6),
    ((60_000 * 0.5 + 50_000 * 0.05 + 10_000 * 2.5) / 1e6).toFixed(6));
});

test('modelo fora da tabela vira custo NaN, não zero silencioso', () => {
  assert.ok(Number.isNaN(tally([line('a', 'claude-xyz')]).usd));
});

test('caminho da worktree codifica como o Claude Code', () => {
  assert.match(projectDir('C:\\Users\\a\\.claude\\worktrees\\x-1'), /C--Users-a--claude-worktrees-x-1$/);
});

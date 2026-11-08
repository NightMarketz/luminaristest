/**
 * BE-INCR-TEAMMATES PR-1 — itens 8 (resolução de chave só BYOK) e 9 (reserva). Provedor falso só na borda do adaptador.
 */
import { LlmProviderError, type LlmCompleteInput, type LlmProvider, type LlmProviderId } from '../../../lib/llm/LlmProvider';
import { LlmSemCredencialError, TeammateLlmCaller, type TeammateLlmConfig } from '../services/TeammateLlmCaller';

const ok = (model: string) => ({
  message: { role: 'assistant' as const, content: 'ok' },
  usage: { model, promptTokens: 10, completionTokens: 2 },
});

function fakeProvider(id: LlmProviderId, behave: (i: LlmCompleteInput) => Promise<ReturnType<typeof ok>>) {
  const calls: LlmCompleteInput[] = [];
  const provider: LlmProvider = { id, complete: async (i) => (calls.push(i), behave(i)) };
  return { provider, calls };
}

const keysOf = (map: Partial<Record<LlmProviderId, string>>) => ({
  findApiKey: async (_u: string, p: LlmProviderId) => map[p] ?? null,
});

const teammate: TeammateLlmConfig = {
  name: 'Conciliação',
  provider: 'anthropic',
  model: 'claude-x',
  fallbackProvider: 'gemini',
  fallbackModel: 'gemini-y',
};
const req = { messages: [{ role: 'user' as const, content: 'oi' }], maxTokens: 100 };

describe('item 8 — chave por turno, só BYOK', () => {
  it('com chave do tenant: chama o provedor do teammate com a chave dele', async () => {
    const a = fakeProvider('anthropic', async () => ok('claude-x'));
    const caller = new TeammateLlmCaller(keysOf({ anthropic: 'sk-ant-tenant' }), { anthropic: a.provider });
    const res = await caller.complete('u1', teammate, req);
    expect(a.calls[0].apiKey).toBe('sk-ant-tenant');
    expect(res).toMatchObject({ provider: 'anthropic', model: 'claude-x', usedFallback: false });
  });

  it('sem chave do tenant: LLM_SEM_CREDENCIAL nomeando teammate e provedor, e nenhum provedor é chamado', async () => {
    const a = fakeProvider('anthropic', async () => ok('claude-x'));
    const g = fakeProvider('gemini', async () => ok('gemini-y'));
    const caller = new TeammateLlmCaller(keysOf({ gemini: 'sk-gem' }), { anthropic: a.provider, gemini: g.provider });
    const err = await caller.complete('u1', teammate, req).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(LlmSemCredencialError);
    expect((err as LlmSemCredencialError).code).toBe('LLM_SEM_CREDENCIAL');
    expect((err as Error).message).toBe('O teammate "Conciliação" não tem credencial do provedor Anthropic cadastrada.');
    expect(a.calls).toHaveLength(0);
    expect(g.calls).toHaveLength(0);
  });
});

describe('item 9 — reserva', () => {
  const run = async (primaryError: LlmProviderError, keys: Partial<Record<LlmProviderId, string>> = { anthropic: 'k1', gemini: 'k2' }) => {
    const a = fakeProvider('anthropic', async () => { throw primaryError; });
    const g = fakeProvider('gemini', async () => ok('gemini-y'));
    const caller = new TeammateLlmCaller(keysOf(keys), { anthropic: a.provider, gemini: g.provider });
    const out = await caller.complete('u1', teammate, req).catch((e: unknown) => e);
    return { out, a, g };
  };

  it.each(['RATE_LIMIT', 'SERVER', 'QUOTA', 'TIMEOUT'] as const)('%s no primário → tenta a reserva uma vez e grava qual respondeu', async (kind) => {
    const { out, a, g } = await run(new LlmProviderError(kind, 'x', 'anthropic'));
    expect(a.calls).toHaveLength(1);
    expect(g.calls).toHaveLength(1);
    expect(g.calls[0]).toMatchObject({ apiKey: 'k2', model: 'gemini-y' });
    expect(out).toMatchObject({ provider: 'gemini', model: 'gemini-y', usedFallback: true });
  });

  it.each(['BAD_REQUEST', 'AUTH'] as const)('%s (400/401) não dispara reserva', async (kind) => {
    const { out, g } = await run(new LlmProviderError(kind, 'x', 'anthropic'));
    expect(out).toBeInstanceOf(LlmProviderError);
    expect((out as LlmProviderError).kind).toBe(kind);
    expect(g.calls).toHaveLength(0);
  });

  it('sem chave do tenant para a reserva → sobe o erro do primário, reserva não é chamada', async () => {
    const { out, g } = await run(new LlmProviderError('RATE_LIMIT', 'x', 'anthropic'), { anthropic: 'k1' });
    expect((out as LlmProviderError).kind).toBe('RATE_LIMIT');
    expect(g.calls).toHaveLength(0);
  });

  it('reserva também falha → uma tentativa só; sobe o erro da reserva', async () => {
    const a = fakeProvider('anthropic', async () => { throw new LlmProviderError('SERVER', 'a', 'anthropic'); });
    const g = fakeProvider('gemini', async () => { throw new LlmProviderError('SERVER', 'g', 'gemini'); });
    const caller = new TeammateLlmCaller(keysOf({ anthropic: 'k1', gemini: 'k2' }), { anthropic: a.provider, gemini: g.provider });
    const out = await caller.complete('u1', teammate, req).catch((e: unknown) => e);
    expect((out as LlmProviderError).provider).toBe('gemini');
    expect(a.calls).toHaveLength(1);
    expect(g.calls).toHaveLength(1);
  });
});

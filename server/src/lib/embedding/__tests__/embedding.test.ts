/**
 * RAG-PR-A itens 5 e 6 — porta `EmbeddingProvider` (adaptador OpenAI @768) e `InstanceEmbeddingKeyResolver`.
 * A resposta do provedor é fixture (régua A5): a fumaça com a chave real fica no runbook.
 */
import { EmbeddingService } from '@/lib/vector/embedding';
import { OpenAIEmbeddingProvider } from '../OpenAIEmbeddingProvider';
import { InstanceEmbeddingKeyResolver } from '../InstanceEmbeddingKeyResolver';
import { EmbeddingSemCredencialError } from '../EmbeddingProvider';
import { UserEmbedder } from '../UserEmbedder';

const fixture = (dims: number) => (texts: string[]) =>
  texts.map((_, i) => Array.from({ length: dims }, (_v, j) => (j === i ? 1 : 0)));

describe('OpenAIEmbeddingProvider (item 5)', () => {
  it('pede dimensions: 768 ao endpoint e devolve vetores de 768 posições', async () => {
    const create = jest.fn(async ({ input }: { input: string[] }) => ({
      data: fixture(768)(input).map((embedding, index) => ({ index, embedding })),
    }));
    const provider = new OpenAIEmbeddingProvider((apiKey) => {
      const svc = new EmbeddingService({ apiKey, model: 'text-embedding-3-small', dimensions: 768 });
      (svc as unknown as { client: unknown }).client = { embeddings: { create } };
      return svc;
    });

    const out = await provider.embed({ apiKey: 'ci-dummy-openai-key', texts: ['a', 'b'] });

    expect(create).toHaveBeenCalledWith(expect.objectContaining({ model: 'text-embedding-3-small', dimensions: 768 }));
    expect(out.dims).toBe(768);
    expect(out.vectors).toHaveLength(2);
    expect(out.vectors.every((v) => v instanceof Float32Array && v.length === 768)).toBe(true);
  });

  it('dimensão diferente da configurada ⇒ erro', async () => {
    const provider = new OpenAIEmbeddingProvider(() => ({
      embedText: jest.fn(),
      embedTexts: jest.fn(async (t: string[]) => fixture(1536)(t)),
    }));
    await expect(provider.embed({ apiKey: 'k', texts: ['a'] })).rejects.toThrow(/expected 768, got 1536/);
  });
});

describe('InstanceEmbeddingKeyResolver (item 6)', () => {
  it('devolve source INSTANCE com a OPENAI_API_KEY e o carimbo openai:text-embedding-3-small@768', async () => {
    const r = await new InstanceEmbeddingKeyResolver(() => 'sk-instancia').resolve('ana');
    expect(r).toEqual({
      provider: 'openai',
      apiKey: 'sk-instancia',
      model: 'text-embedding-3-small',
      dims: 768,
      stamp: 'openai:text-embedding-3-small@768',
      source: 'INSTANCE',
    });
  });

  it('sem OPENAI_API_KEY ⇒ EMBEDDING_SEM_CREDENCIAL', async () => {
    const err = await new InstanceEmbeddingKeyResolver(() => undefined).resolve('ana').catch((e) => e);
    expect(err).toBeInstanceOf(EmbeddingSemCredencialError);
    expect(err.errorCode).toBe('EMBEDDING_SEM_CREDENCIAL');
  });

  it('o UserEmbedder carimba com o carimbo do resolvedor (indexação e pergunta saem do mesmo lugar)', async () => {
    const embedder = new UserEmbedder(new InstanceEmbeddingKeyResolver(() => 'k'), {
      openai: {
        id: 'openai',
        embed: async ({ texts }) => ({ vectors: texts.map(() => new Float32Array(768)), model: 'm', dims: 768 }),
      },
    });
    const out = await embedder.embed('ana', ['x']);
    expect(out.stamp).toBe(await embedder.currentStamp('ana'));
  });
});

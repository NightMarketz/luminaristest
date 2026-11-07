/**
 * `EmbeddingKeyResolver` do RAG-PR-A (item 6): só `source = 'INSTANCE'`, com a `OPENAI_API_KEY` (F-RAG-5b). O RAG-PR-C
 * acrescenta `USER`. Um resolvedor só para indexar e para a pergunta.
 */
import {
  EMBEDDING_DIMS,
  EmbeddingSemCredencialError,
  embeddingStamp,
  type EmbeddingKeyResolver,
  type EmbeddingResolution,
} from './EmbeddingProvider';
import { OPENAI_EMBEDDING_MODEL } from './OpenAIEmbeddingProvider';

export class InstanceEmbeddingKeyResolver implements EmbeddingKeyResolver {
  constructor(private readonly readKey: () => string | undefined = () => process.env.OPENAI_API_KEY) {}

  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- a porta recebe o userId; o PR-C o usa para a chave do usuário
  async resolve(_userId: string): Promise<EmbeddingResolution> {
    const apiKey = this.readKey();
    if (!apiKey) throw new EmbeddingSemCredencialError();
    return {
      provider: 'openai',
      apiKey,
      model: OPENAI_EMBEDDING_MODEL,
      dims: EMBEDDING_DIMS,
      stamp: embeddingStamp('openai', OPENAI_EMBEDDING_MODEL, EMBEDDING_DIMS),
      source: 'INSTANCE',
    };
  }
}

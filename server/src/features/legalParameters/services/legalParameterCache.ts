import type { LegalParameter } from 'generated/prisma';

/**
 * BE-INCR-LEGAL-PARAMS item 5 — cache em memória das linhas PUBLISHED por tabela, invalidado na publicação e na
 * revogação (depois do commit). Processo único (SQLite, sem réplica): não há invalidação distribuída a fazer.
 */
const cache = new Map<string, readonly LegalParameter[]>();

export function cachedPublished(tabela: string): readonly LegalParameter[] | undefined {
  return cache.get(tabela);
}

export function storePublished(tabela: string, linhas: readonly LegalParameter[]): void {
  cache.set(tabela, linhas);
}

/**
 * Emenda §9 L-8 — leitura SÍNCRONA para o DTO Zod estático (LC 116, ISS máximo): as linhas em cache da tabela. O
 * cache é aquecido no boot e reaquecido a cada publicação (`LegalParameterService.aquecer`); frio aqui é defeito de
 * inicialização, não "lista vazia" — erro explícito.
 */
export function linhasEmCacheSincrono(tabela: string): readonly LegalParameter[] {
  const linhas = cache.get(tabela);
  if (!linhas) throw new Error(`legalParameterCache: tabela ${tabela} fora do cache — LegalParameterService.aquecer() não rodou (boot)`);
  return linhas;
}

export function invalidateLegalParameterCache(): void {
  cache.clear();
}

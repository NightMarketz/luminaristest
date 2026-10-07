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

export function invalidateLegalParameterCache(): void {
  cache.clear();
}

import { createHash } from 'crypto';
import type { ChartAccountSnapshot } from '../dtos/CompileBindingDto';

/**
 * `compiledFromHash = sha256(schema + chart canônicos)` (BRIEF item 9). Canonicaliza (ordena
 * chaves de objeto recursivamente; ordena o array do chart por `code`) antes de serializar, para
 * que o MESMO conteúdo semântico sempre produza o MESMO hash independente da ordem de inserção —
 * senão o hash "detecta staleness" por acidente de ordenação, não por mudança real de dado.
 *
 * Função pura, em `domain/` (ADR-MODULE-BOUNDARIES F-MB-5 a e §11.9): o compilador
 * (`services/BindingCompileService`) e os bindings de fixture (`domain/fixtures/`) usam a MESMA função. Veio do
 * `BindingCompileService` sem mudança de corpo; o hash de um mesmo par (schema, chart) não muda.
 */
export function computeCompiledFromHash(
  operationalSchema: Record<string, unknown>,
  chart: ChartAccountSnapshot[],
): string {
  const canonicalSchema = canonicalize(operationalSchema);
  const canonicalChart = [...chart]
    .sort((a, b) => a.code.localeCompare(b.code))
    .map((a) => canonicalize(a));
  const digest = createHash('sha256')
    .update(JSON.stringify({ operationalSchema: canonicalSchema, chart: canonicalChart }))
    .digest('hex');
  return `sha256:${digest}`;
}

/** Ordena chaves de objeto recursivamente (arrays preservam ordem — só o chart acima é reordenado
 *  explicitamente, por semântica de conjunto). */
function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value !== null && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b));
    return Object.fromEntries(entries.map(([k, v]) => [k, canonicalize(v)]));
  }
  return value;
}

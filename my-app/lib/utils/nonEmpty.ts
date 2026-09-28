/**
 * `.min(1)` de um array no DTO do servidor vira `[T, ...T[]]` no tipo gerado
 * (`@/types/contracts/**.gen.ts`, gerador com `maxItems:-1` — decisão do dono, 28/09/2026).
 * `xs.map(toX)` devolve `T[]`; isto prova o "não vazio" em runtime em vez de `as`.
 * `null` = vazio: o chamador mostra o erro de validação e não envia.
 */
export function nonEmpty<T>(xs: readonly T[]): [T, ...T[]] | null {
  if (xs.length === 0) return null;
  const [head, ...tail] = xs;
  return [head, ...tail];
}

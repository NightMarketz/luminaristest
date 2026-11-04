/**
 * Resposta simulada que chega como request real: em macrotask, depois de o caso já ter seguido adiante.
 *
 * Padrão de 0 ms + `ms` (default 50): o salto de 0 ms começa o relógio no 1º yield do caso — um timer simples
 * iniciado na chamada é absorvido por trabalho síncrono lento sob carga (medido no #434).
 *
 * Toda promessa fica em `inflight` até assentar, e o `afterEach` global do `vitest.setup.ts` chama `drainLater()`:
 * a resposta do último caso assenta com o jsdom vivo, nunca depois do teardown (que apaga `window` e faz o
 * `setState` tardio lançar `ReferenceError: window is not defined` com todos os testes verdes — #439, #455, #1046,
 * #1071). Atraso montado à mão num teste escapa do dreno: `__tests__/delayedMockDrain.static.test.ts` reprova.
 */
const inflight = new Set<Promise<unknown>>();

export function later<T>(value: T, ms = 50): Promise<T> {
  const p = new Promise<T>((resolve) => setTimeout(() => setTimeout(() => resolve(value), ms), 0));
  inflight.add(p);
  void p.finally(() => inflight.delete(p));
  return p;
}

export function inflightCount(): number {
  return inflight.size;
}

export async function drainLater(): Promise<void> {
  while (inflight.size > 0) await Promise.allSettled(Array.from(inflight));
}

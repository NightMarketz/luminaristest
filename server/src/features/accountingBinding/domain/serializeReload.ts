/**
 * Serializa as chamadas de uma recarga assíncrona numa cadeia de `Promise` — função pura, sem dependência
 * (FE-INCR-BINDING-ACTIVATION EMENDA-1 item 0b, F-BA-2 → b; BE-INCR-ONBOARDING-ACTIVATION item 13, F-I4-4 → a).
 *
 * Duas chamadas simultâneas rodam em série, a segunda depois da primeira, e nunca uma troca de referência atropela a
 * outra com uma leitura mais velha. Uma recarga rejeitada não quebra a cadeia: quem a pediu recebe a rejeição, e a
 * próxima roda normalmente.
 *
 * Quem liga isto à recarga dos mappers contábeis é a `lib/factory.ts` (`reloadAccountingMappersSerialized()`): rota,
 * controller e job pedem a recarga ao `getFactory()` (ADR-MODULE-BOUNDARIES §11.9; dono, questionário, 25/11/2026:
 * "Factory dona da recarga"). Antes este arquivo era `runtime/mapperReload.ts` e chamava o `getFactory()` ele mesmo.
 *
 * atalho: o teto é um processo (T11). Multi-processo exigiria outro sinal.
 */
export function serializeReload(reload: () => Promise<void>): () => Promise<void> {
  let chain: Promise<void> = Promise.resolve();
  return () => {
    const run = chain.then(reload);
    // eslint-disable-next-line no-restricted-syntax -- SANCTIONED: a rejeição chega a quem pediu a recarga (`run`); aqui só mantém a cadeia andando (OBS-R8)
    chain = run.catch(() => undefined);
    return run;
  };
}

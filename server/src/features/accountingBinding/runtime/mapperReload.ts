import { getFactory } from '../../../lib/factory';

/**
 * Recarga dos mappers contábeis em runtime — UMA implementação para os dois donos (FE-INCR-BINDING-ACTIVATION
 * EMENDA-1 item 0b, F-BA-2 → b; BE-INCR-ONBOARDING-ACTIVATION item 13, F-I4-4 → a). Quem chegou primeiro à `main`
 * criou o módulo (LAC-B PR-0); o controller do onboarding (I4 PR-2) só importa.
 *
 * `ApplicationFactory.initializeAccountingSyncFromBindings()` relê TODO binding `Active` e TROCA a referência de
 * `services.accountingSync` (as pontes a leem lazy, por `getAccountingSyncService()`). As chamadas entram numa cadeia
 * de `Promise`: duas ativações simultâneas recarregam em série, a segunda depois da primeira, e nunca uma troca de
 * referência atropela a outra com uma leitura mais velha. Uma recarga rejeitada não quebra a cadeia: quem a pediu
 * recebe a rejeição, e a próxima roda normalmente.
 *
 * ponytail: o teto é um processo (T11). Multi-processo exigiria outro sinal.
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

export const reloadAccountingMappersSerialized: () => Promise<void> = serializeReload(() =>
  getFactory().initializeAccountingSyncFromBindings(),
);

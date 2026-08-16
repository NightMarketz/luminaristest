import { useStableT } from '../../../lib/hooks/useStableT';

/**
 * `useStableT('accounting')` — o namespace da contabilidade, fixo.
 *
 * Existe como atalho porque TODOS os componentes deste módulo usam o mesmo
 * namespace, e repetir a string em ~10 arquivos é o começo de uma divergência
 * (um deles um dia escreve `'accountig'` e só o fallback inline salva).
 *
 * O porquê do `tRef` — identidade instável do `t` sem instância i18next, e o laço
 * de fetch que ela fecha — está documentado uma vez só, em
 * `lib/hooks/useStableT.ts`. Não duplique a explicação aqui.
 */
export function useAccountingT() {
  return useStableT('accounting');
}

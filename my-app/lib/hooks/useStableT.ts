import { useRef } from 'react';
import { useTranslation } from 'next-i18next';

/**
 * `useTranslation(ns)` + um handle ESTÁVEL do mesmo `t`.
 *
 * ## O mecanismo (lido na fonte, não inferido)
 *
 * Em `react-i18next/dist/commonjs/useTranslation.js` há dois caminhos:
 *
 * - **COM instância i18next** (produção, via `appWithTranslation`): `t` mora em
 *   `useState` e só é trocado por `setT` quando idioma/ready mudam. Identidade
 *   **estável** entre renders.
 * - **SEM instância** (vitest/jsdom — o warning `NO_I18NEXT_INSTANCE` em todo
 *   teste de componente): a função retorna cedo com `notReadyT`, uma arrow
 *   **criada do zero a cada render**. Identidade **instável**.
 *
 * Consequência: `useCallback(fetch, [..., t])` + `useEffect(..., [fetch])` fecha
 * um laço efeito→setState→render→efeito **apenas** onde não há instância — hoje,
 * a suíte. Medido: 1435 chamadas em ~1s (`EntryApprovalsPanel`, 2026-08-06).
 *
 * Por isso o defeito é duplamente invisível: a suíte não contava chamadas e o
 * browser não reproduz. Só aparece quando alguém conta.
 *
 * ## O que NÃO é o problema
 *
 * Passar um ARRAY de namespaces (`useTranslation(['common'])`) recriado a cada
 * render é inofensivo: a dependência do memo interno é `namespaces[0]` — uma
 * string — salvo `nsMode: 'fallback'`, que este projeto não configura. Verificado
 * na fonte + `next-i18next.config.js`. Não gaste tempo hasteando esses arrays.
 *
 * ## Uso
 *
 *   const { t, tRef } = useStableT('common');   // `t` para renderizar
 *   const fetchX = useCallback(async () => {
 *     try { ... } catch (e) { setError(tRef.current('x.error', 'Falhou.')); }
 *   }, [deps, tRef]);   // `tRef` é ref: identidade estável, satisfaz exhaustive-deps
 *
 * Deliberadamente NÃO devolve um `t` embrulhado num wrapper estável: `TFunction` é
 * fortemente sobrecarregado (`t(key)`, `t(key, fallback)`, `t(key, opts)`) e o
 * wrapper colapsaria as sobrecargas numa só — trocaria o laço por erro de tipo nas
 * chamadas de 2 argumentos, que são a maioria no repositório. O ref preserva o tipo
 * exato, sem cast.
 */
export function useStableT(ns: string | string[]) {
  const { t } = useTranslation(ns);
  // Atribuição no corpo do render (não num efeito) de propósito: o callback tem de
  // enxergar o `t` DESTE render — um efeito atualizaria tarde demais. É a leitura
  // que muda, nunca a identidade do ref.
  const tRef = useRef(t);
  tRef.current = t;
  return { t, tRef };
}

import { useRef } from 'react';
import { useTranslation } from 'next-i18next';

/**
 * `useTranslation('accounting')` + a STABLE handle on the same `t`.
 *
 * O problema que isto existe para resolver: **`t` recebe identidade nova a cada
 * render quando não há instância i18next inicializada** — que é exatamente o caso
 * em vitest/jsdom (todo teste de painel imprime `NO_I18NEXT_INSTANCE`). Num
 * `useCallback` de fetch isso fecha um laço:
 *
 *   useCallback(fetch, [unitId, t]) → identidade nova a cada render
 *     → useEffect(..., [fetch]) dispara de novo
 *       → setState → render → novo `t` → ...
 *
 * Medido em 2026-08-06 no `EntryApprovalsPanel`: **1435 chamadas em ~1s** dentro de
 * um `waitFor`. Em PRODUÇÃO o laço não acontece — `appWithTranslation` fornece a
 * instância e o `t` estabiliza (verificado contra o app real: uma chamada por
 * endpoint na carga). O laço é, portanto, invisível na suíte (nenhum teste dos
 * painéis contava chamadas) e invisível no browser — só aparece quando alguém conta.
 *
 * Uso — `t` para renderizar, `tRef.current` DENTRO de callback/efeito:
 *
 *   const { t, tRef } = useAccountingT();
 *   const fetchX = useCallback(async () => {
 *     try { ... } catch (e) { setError(resolveError(e, tRef.current('x.error', 'Falhou.'))); }
 *   }, [unitId]);            // <- sem `t`, e por isso estável
 *
 * Por que um ref e não um wrapper estável: `TFunction` é fortemente sobrecarregado
 * (`t(key)`, `t(key, fallback)`, `t(key, opts)`), e embrulhá-lo colapsaria as
 * sobrecargas numa só — trocaria um laço por erro de tipo nas chamadas de 2
 * argumentos, que são a maioria aqui. O ref preserva o tipo exato, sem cast.
 *
 * Promove para canônico uma técnica que senão seria re-inlinada em 9 arquivos —
 * mesmo precedente de `./resolveError.ts` (Council N7) e `./formatDate.ts`.
 */
export function useAccountingT() {
  const { t } = useTranslation('accounting');
  // Atribuição no corpo do render (não num efeito) de propósito: o callback tem de
  // enxergar o `t` deste render, não o do render anterior — um efeito atualizaria
  // tarde demais. É a leitura, nunca a identidade, que muda.
  const tRef = useRef(t);
  tRef.current = t;
  return { t, tRef };
}

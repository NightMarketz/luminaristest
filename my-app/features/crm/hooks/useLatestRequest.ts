import { useCallback, useEffect, useRef } from 'react';

/**
 * Descarta resposta velha: cada `begin()` invalida os anteriores e devolve `isCurrent()`.
 * Desmontar também invalida. Uso: `const isCurrent = begin(); const r = await f(); if (!isCurrent()) return;`.
 */
export function useLatestRequest() {
  const seq = useRef(0);
  useEffect(() => () => { seq.current += 1; }, []);
  return useCallback(() => {
    const mine = ++seq.current;
    return () => mine === seq.current;
  }, []);
}

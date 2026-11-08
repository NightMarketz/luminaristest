import { useCallback, useEffect, useRef, useState } from 'react';
import { spedService } from '../../../lib/services/sped.service';
import type { Y600Vigencia } from '../lib/ecfY600';

export interface Y600VigenciasState {
  vigencias: Y600Vigencia[];
  /** Soma das participações vigentes em 31/12 — só informativa (F-Y600-8). */
  somaParticipacaoFimBp: number;
  loading: boolean;
  /** O erro da carga como veio do apiClient; o componente traduz. */
  error: unknown;
  reload: () => void;
}

/** Faixa do ano da ECF (`year` do DTO de geração e da query de vigências). */
export const isEcfYear = (y: number | null): y is number => y !== null && Number.isInteger(y) && y >= 2015 && y <= 2100;

/**
 * FE-INCR-ECF-Y600 PR-1 (BRIEF item 6) — as vigências do cadastro de sócios que o Y600 do ano exige, pela rota de leitura
 * do PR-0 (F-FE-Y600-1 → b). Busca só com ano válido, refaz quando o ano muda e descarta a resposta de um ano anterior que
 * chegue depois (mesma regra de `useUnitKit`: só a última carga vale).
 */
export function useY600Vigencias(unitId: string, year: number | null): Y600VigenciasState {
  const [vigencias, setVigencias] = useState<Y600Vigencia[]>([]);
  const [soma, setSoma] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const reqRef = useRef(0);

  const reload = useCallback(() => {
    const req = ++reqRef.current;
    if (!unitId || !isEcfYear(year)) {
      setVigencias([]);
      setSoma(0);
      setLoading(false);
      setError(null);
      return;
    }
    setLoading(true);
    setError(null);
    spedService
      .listY600Vigencias(unitId, year)
      .then((view) => {
        if (req !== reqRef.current) return;
        setVigencias(view.vigencias);
        setSoma(view.somaParticipacaoFimBp);
      })
      .catch((err: unknown) => {
        if (req !== reqRef.current) return;
        setVigencias([]);
        setSoma(0);
        setError(err ?? 'error');
      })
      .finally(() => {
        if (req === reqRef.current) setLoading(false);
      });
  }, [unitId, year]);

  useEffect(() => {
    reload();
  }, [reload]);

  return { vigencias, somaParticipacaoFimBp: soma, loading, error, reload };
}

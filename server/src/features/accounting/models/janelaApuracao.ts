/**
 * BE-INCR-LEGAL-PARAMS PR-4 (item 7) — os dias civis (YYYY-MM-DD, inclusive) a que uma apuração se refere, para o
 * snapshot das linhas de lei (`parametrosUsados`) e para o job de recálculo achar as apurações que uma vigência alcança.
 * Trimestre `T0q` (X7 Fase A), mês `A0m` e ano `A00` (X7 Fase B), mês `Mmm` (X8). Puro, sem fuso: só datas.
 */
import { fimDoMes } from './taxAssessmentCalcAnual';

export function janelaDoPeriodo(ano: number, periodo: string): { de: string; ate: string } {
  const mm = (k: number) => String(k).padStart(2, '0');
  if (periodo === 'A00') return { de: `${ano}-01-01`, ate: `${ano}-12-31` };
  const t = /^T0([1-4])$/.exec(periodo);
  if (t) {
    const q = Number(t[1]);
    return { de: `${ano}-${mm(q * 3 - 2)}-01`, ate: fimDoMes(ano, q * 3) };
  }
  const m = /^[AM](\d{2})$/.exec(periodo);
  if (m && Number(m[1]) >= 1 && Number(m[1]) <= 12) {
    const k = Number(m[1]);
    return { de: `${ano}-${mm(k)}-01`, ate: fimDoMes(ano, k) };
  }
  throw new Error(`janelaDoPeriodo: período '${periodo}' desconhecido.`);
}

/** Ordem cronológica de (ano, período) da mesma família — T01 < T02; A01 < … < A12 < A00; M01 < … < M12. */
export function chaveCronologica(ano: number, periodo: string): number {
  const ordemNoAno = periodo === 'A00' ? 13 : Number(periodo.slice(1).replace(/^0/, ''));
  return ano * 100 + ordemNoAno;
}

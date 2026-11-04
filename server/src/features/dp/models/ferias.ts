/**
 * Períodos de férias do vínculo de emprego — BE-INCR-DP-F0-F1 item 57 (PR-6). Função pura, só para natureza `EMPREGO`.
 *
 * - Aquisitivo: cada 12 meses de vigência do contrato [D05 CLT art. 130 caput]. Termina na véspera do aniversário do
 *   contrato.
 * - Concessivo: os 12 meses seguintes ao aquisitivo [D05 CLT art. 134 caput].
 * - Admissão em 29/02: o aniversário em ano não bissexto cai em 01/03 (leitura adotada no BRIEF; o contador confirma no
 *   golden, §5).
 * - Fora do F1: dias de direito por faltas [art. 130 I–IV] e perda do direito [art. 133] (fase das folhas especiais, §7).
 *
 * Datas date-only (`YYYY-MM-DD`): a comparação é de string, como em `vigencia.ts`.
 */
import { vespera } from './vinculo';

export interface PeriodoFerias {
  aquisitivoInicio: string;
  aquisitivoFim: string;
  concessivoFim: string;
}

const bissexto = (ano: number) => (ano % 4 === 0 && ano % 100 !== 0) || ano % 400 === 0;

/** O `anos`-ésimo aniversário de `data` (anos = 0 ⇒ a própria data); 29/02 em ano não bissexto ⇒ 01/03. */
export function aniversario(data: string, anos: number): string {
  const ano = Number(data.slice(0, 4)) + anos;
  const mmdd = data.slice(5);
  if (mmdd === '02-29' && !bissexto(ano)) return `${String(ano).padStart(4, '0')}-03-01`;
  return `${String(ano).padStart(4, '0')}-${mmdd}`;
}

/**
 * Os períodos `{aquisitivoInicio, aquisitivoFim, concessivoFim}` cujo aquisitivo começa até `dataRef` (inclui o
 * aquisitivo em curso) e, se o contrato tem fim, até `dataFim`. Os períodos têm sempre 12 meses: o F1 não proporcionaliza.
 */
export function periodosDeFerias(dataInicio: string, dataRef: string, dataFim: string | null = null): PeriodoFerias[] {
  const limite = dataFim !== null && dataFim < dataRef ? dataFim : dataRef;
  const out: PeriodoFerias[] = [];
  for (let k = 0; ; k++) {
    const aquisitivoInicio = aniversario(dataInicio, k);
    if (aquisitivoInicio > limite) return out;
    out.push({
      aquisitivoInicio,
      aquisitivoFim: vespera(aniversario(dataInicio, k + 1)),
      concessivoFim: vespera(aniversario(dataInicio, k + 2)),
    });
  }
}

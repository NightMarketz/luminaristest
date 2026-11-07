/**
 * Períodos de férias do vínculo de emprego — BE-INCR-DP-F0-F1 item 57 (PR-6). Função pura, só para natureza `EMPREGO`.
 *
 * - Aquisitivo: cada N meses de vigência do contrato [D05 CLT art. 130 caput]. Termina na véspera do aniversário do
 *   contrato.
 * - Concessivo: os M meses seguintes ao aquisitivo [D05 CLT art. 134 caput].
 * - BE-INCR-DP-F2 item 72: N e M vêm da `FOLHA_REGRA` (`FERIAS_AQUISITIVO_MESES`, `FERIAS_CONCESSIVO_MESES`; valor
 *   inicial 12 e 12), não do código.
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

/** Os meses de aquisitivo e de concessivo, lidos da `FOLHA_REGRA` na admissão (item 72). */
export interface MesesFerias {
  aquisitivo: number;
  concessivo: number;
}

/**
 * `data` + `meses` (meses = 0 ⇒ a própria data); dia que não existe no mês de destino rola para o 1º do mês seguinte
 * (29/02 em ano não bissexto ⇒ 01/03, a leitura do F1).
 */
export function somaMeses(data: string, meses: number): string {
  const total = Number(data.slice(0, 4)) * 12 + (Number(data.slice(5, 7)) - 1) + meses;
  let ano = Math.floor(total / 12);
  let mes = (total % 12) + 1;
  let dia = Number(data.slice(8));
  const ultimo = new Date(Date.UTC(ano, mes, 0)).getUTCDate();
  if (dia > ultimo) {
    dia = 1;
    mes += 1;
    if (mes === 13) {
      mes = 1;
      ano += 1;
    }
  }
  return `${String(ano).padStart(4, '0')}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
}

/** O `anos`-ésimo aniversário de `data` (anos = 0 ⇒ a própria data); 29/02 em ano não bissexto ⇒ 01/03. */
export function aniversario(data: string, anos: number): string {
  return somaMeses(data, anos * 12);
}

/**
 * Os períodos `{aquisitivoInicio, aquisitivoFim, concessivoFim}` cujo aquisitivo começa até `dataRef` (inclui o
 * aquisitivo em curso) e, se o contrato tem fim, até `dataFim`. Os períodos têm sempre `meses.aquisitivo` meses: o F1
 * não proporcionaliza.
 */
export function periodosDeFerias(dataInicio: string, dataRef: string, dataFim: string | null, meses: MesesFerias): PeriodoFerias[] {
  const limite = dataFim !== null && dataFim < dataRef ? dataFim : dataRef;
  const out: PeriodoFerias[] = [];
  for (let k = 0; ; k++) {
    const aquisitivoInicio = somaMeses(dataInicio, k * meses.aquisitivo);
    if (aquisitivoInicio > limite) return out;
    out.push({
      aquisitivoInicio,
      aquisitivoFim: vespera(somaMeses(dataInicio, (k + 1) * meses.aquisitivo)),
      concessivoFim: vespera(somaMeses(dataInicio, (k + 1) * meses.aquisitivo + meses.concessivo)),
    });
  }
}

/**
 * Afastamento pago pela empresa — BE-INCR-DP-F2 itens 32 e 36 (escrito no PR-2 por decisão do dono, chat, 2026-11-07:
 * "Escrever agora"; o fatiamento do PR-3 corta o trecho e o motor do PR-4 paga cada fatia com `proporcionalMensalista`).
 *
 * Os `FOLHA_REGRA`/`AFASTAMENTO_DIAS_EMPRESA` primeiros dias consecutivos desde o início do afastamento são pagos pela
 * empresa (Lei 8.213 art. 60 § 3º [D03]), atravessando competências; do dia seguinte em diante a folha não paga. Quem
 * decide se o motivo dá direito a esta regra (doença ou acidente não do trabalho) é o fatiamento (item 32).
 */
import { dateOnlyFromDayNumber, dayNumberFromDateOnly } from '../../../accounting/models/dates';
import { primeiroDia, ultimoDia, type Competencia } from '../competencia';
import type { RegrasFolha } from '../regrasFolha';

export interface PeriodoAfastamento {
  inicio: string;
  fim: string | null;
}

/**
 * Item 32 — o trecho do mês pago pela empresa: `[inicio, inicio + N − 1]` cortado pelo fim do afastamento e pela
 * competência; `null` quando o trecho não toca o mês.
 */
export function trechoPagoPelaEmpresa(competencia: Competencia, afastamento: PeriodoAfastamento, diasEmpresa: RegrasFolha['afastamentoDiasEmpresa']): { inicio: string; fim: string } | null {
  const fimEmpresa = dateOnlyFromDayNumber(dayNumberFromDateOnly(afastamento.inicio) + diasEmpresa.valor - 1);
  const fim = [fimEmpresa, afastamento.fim ?? fimEmpresa, ultimoDia(competencia)].sort()[0];
  const inicio = [afastamento.inicio, primeiroDia(competencia)].sort()[1];
  return inicio > fim ? null : { inicio, fim };
}

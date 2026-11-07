/**
 * Afastamento pago pela empresa — BE-INCR-DP-F2 itens 32 e 36 (escrito no PR-2 por decisão do dono, chat, 2026-11-07:
 * "Escrever agora"; o fatiamento do PR-3 e o motor do PR-4 só consomem).
 *
 * Os `FOLHA_REGRA`/`AFASTAMENTO_DIAS_EMPRESA` primeiros dias consecutivos desde o início do afastamento são pagos pela
 * empresa (Lei 8.213 art. 60 § 3º [D03]), atravessando competências; do dia seguinte em diante a folha não paga. Quem
 * decide se o motivo dá direito a esta regra (doença ou acidente não do trabalho) é o fatiamento (item 32).
 */
import { dateOnlyFromDayNumber, dayNumberFromDateOnly } from '../../../accounting/models/dates';
import { primeiroDia, ultimoDia, type Competencia } from '../competencia';
import type { RegrasFolha } from '../regrasFolha';
import { fonteLp, no, type Calculo } from './calcNode';
import { diasDevidosMensalista, proporcionalMensalista } from './salario';

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

/**
 * Item 32 — `AFASTAMENTO_EMPRESA_15D` = salário × dias do trecho pago pela empresa ÷ base de dias, contados no mês
 * comercial do mensalista como a admissão e o término (F-DPF-4 a). Sem trecho no mês ⇒ `null` (sem linha).
 */
export function afastamentoEmpresa(
  salarioCents: bigint,
  competencia: Competencia,
  afastamento: PeriodoAfastamento,
  regras: Pick<RegrasFolha, 'afastamentoDiasEmpresa' | 'mensalistaBaseDias' | 'arredondamento'>,
): Calculo<bigint> | null {
  const trecho = trechoPagoPelaEmpresa(competencia, afastamento, regras.afastamentoDiasEmpresa);
  if (trecho === null) return null;
  const dias = diasDevidosMensalista(competencia, trecho.inicio, trecho.fim, regras.mensalistaBaseDias);
  const c = proporcionalMensalista(salarioCents, regras.mensalistaBaseDias, dias, regras.arredondamento);
  return {
    valor: c.valor,
    prova: no(`Afastamento pago pela empresa de ${trecho.inicio} a ${trecho.fim} (${dias} dias)`, c.valor, {
      fonte: 'Lei 8.213/1991 art. 60 § 3º',
      filhos: [{ ...c.prova, soma: true }, no(`Dias pagos pela empresa: ${regras.afastamentoDiasEmpresa.valor}`, 0n, { fonte: fonteLp(regras.afastamentoDiasEmpresa) })],
    }),
  };
}

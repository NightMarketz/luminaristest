/**
 * Faltas e DSR perdido — BE-INCR-DP-F2 item 36 (escrito no PR-2 por decisão do dono, chat, 2026-11-07: "Escrever agora";
 * o motor do PR-4 só consome).
 *
 * Funções puras. A semana do DSR começa no dia `FOLHA_REGRA`/`SEMANA_DSR_INICIO` (Dec. 10.854 art. 158 § 4º [D10]); os
 * dias de repouso saem de `diasDoMes` (item 69: os dias fora da escala e os feriados).
 */
import { dateOnlyFromDayNumber, dayNumberFromDateOnly } from '../../../accounting/models/dates';
import type { Competencia } from '../competencia';
import { diaDaSemana, DIAS_SEMANA, diasDoMes, type DiaSemana, type EscalaJornada } from '../escala';
import type { ValorRegra } from '../regrasFolha';
import { fonteLp, no, type CalcNode, type Calculo } from './calcNode';
import { arredondarCentavos, fracao, inteiro, multiplicar, textoFracao, type Fracao, type ModoArredondamento } from './fracao';

const MINUTOS_POR_HORA = 60n;

/** Item 36 — desconto das faltas = salário-hora × minutos de falta (o lançamento `FALTAS` vem em minutos, PR-1). */
export function descontoFaltas(salarioHora: Fracao, minutos: number, arredondamento: ValorRegra<ModoArredondamento>): Calculo<bigint> {
  const exato = multiplicar(salarioHora, fracao(inteiro(minutos), MINUTOS_POR_HORA));
  const valor = arredondarCentavos(exato, arredondamento.valor);
  return {
    valor,
    prova: no(`Faltas: ${minutos} min × salário-hora ${textoFracao(salarioHora)}`, valor, {
      fonte: 'BRIEF DP-F2 item 36',
      filhos: [no(`Arredondamento ${arredondamento.valor}`, 0n, { fonte: fonteLp(arredondamento) })],
    }),
  };
}

/** O número de dia (UTC) do primeiro dia da semana do DSR que contém `data`. */
function inicioDaSemana(data: string, inicio: DiaSemana): number {
  const n = dayNumberFromDateOnly(data);
  const recuo = (DIAS_SEMANA.indexOf(diaDaSemana(data)) - DIAS_SEMANA.indexOf(inicio) + DIAS_SEMANA.length) % DIAS_SEMANA.length;
  return n - recuo;
}

/**
 * Item 36 — dias de repouso perdidos: para cada semana (a partir de `semanaDsrInicio`) com falta injustificada, os dias
 * de repouso dessa semana que caem na competência — o repouso semanal e o feriado (Lei 605 arts. 6º e 8º [D01]).
 * O dia do repouso que cai no mês seguinte é da folha de lá. `datasFalta` = os dias da falta injustificada (o motor os
 * recebe da porta de jornada ou do snapshot; lacuna registrada no PR-2: o lançamento `MANUAL` não tem data).
 */
export function diasRepousoPerdidos(
  datasFalta: readonly string[],
  competencia: Competencia,
  escala: EscalaJornada,
  feriados: readonly string[],
  semanaDsrInicio: ValorRegra<DiaSemana>,
): { dias: string[]; prova: CalcNode } {
  const semanas = new Set(datasFalta.map((d) => inicioDaSemana(d, semanaDsrInicio.valor)));
  const dias = diasDoMes(competencia, escala, feriados)
    .porDia.filter((d) => d.tipo === 'REPOUSO' && semanas.has(inicioDaSemana(d.data, semanaDsrInicio.valor)))
    .map((d) => d.data);
  return {
    dias,
    prova: no(`Repouso perdido: ${dias.length} dia(s) nas semanas com falta (${[...semanas].sort((a, b) => a - b).map(dateOnlyFromDayNumber).join(', ')})`, 0n, {
      fonte: 'Lei 605/1949 arts. 6º e 8º',
      filhos: [no(`Semana do DSR começa em ${semanaDsrInicio.valor}`, 0n, { fonte: fonteLp(semanaDsrInicio) })],
    }),
  };
}

/**
 * Item 36 — DSR perdido = valor do dia × dias de repouso perdidos. `valorDia` é do chamador: salário ÷ base de dias no
 * mensalista, minutos por dia × salário-hora no horista.
 */
export function dsrPerdido(valorDia: Fracao, perdidos: { dias: readonly string[]; prova: CalcNode }, arredondamento: ValorRegra<ModoArredondamento>): Calculo<bigint> {
  const valor = arredondarCentavos(multiplicar(valorDia, fracao(inteiro(perdidos.dias.length))), arredondamento.valor);
  return {
    valor,
    prova: no(`DSR perdido: ${perdidos.dias.length} dia(s) × valor do dia ${textoFracao(valorDia)}`, valor, {
      fonte: 'Lei 605/1949 art. 6º',
      filhos: [perdidos.prova, no(`Arredondamento ${arredondamento.valor}`, 0n, { fonte: fonteLp(arredondamento) })],
    }),
  };
}

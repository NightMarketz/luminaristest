/**
 * Salário-hora e salário proporcional do mensalista — BE-INCR-DP-F2 itens 3 e 4 (PR-0).
 *
 * Funções puras. Todo número de regra (base de dias, forma do divisor, modo de arredondamento) chega como `ValorRegra`
 * lido de `FOLHA_REGRA` (item 67); aqui só a forma da regra (§0.1 do BRIEF).
 */
import { primeiroDia, ultimoDia, type Competencia } from '../competencia';
import { minutosSemanaisDaEscala, type EscalaJornada } from '../escala';
import type { RegrasFolha, ValorRegra } from '../regrasFolha';
import { fonteLp, no, type Calculo } from './calcNode';
import { arredondarCentavos, dividir, fracao, inteiro, multiplicar, textoFracao, type Fracao, type ModoArredondamento } from './fracao';

export type RegraDivisor = RegrasFolha['salarioHoraDivisor'];

const MINUTOS_POR_HORA = 60n;
/** A forma `SEMANA_SEIS_DIAS` reparte a semana em seis dias (é o nome da forma, não um número de regra). */
const DIAS_DA_FORMA_SEMANA_SEIS_DIAS = 6n;

/**
 * Item 3 — divisor mensal em horas pela forma da linha `SALARIO_HORA_DIVISOR` (CLT art. 64 [D02]; F-DPF-1):
 * `SEMANA_SEIS_DIAS` = minutos semanais ÷ 6 × `baseDias`; `DIAS_DE_TRABALHO_DA_ESCALA` = minutos por dia × `baseDias`.
 */
export function divisorHoras(escala: EscalaJornada, regraDivisor: RegraDivisor, baseDias: ValorRegra<number>): Fracao {
  const base = inteiro(baseDias.valor);
  const minutosDia =
    regraDivisor.valor === 'SEMANA_SEIS_DIAS' ? fracao(inteiro(minutosSemanaisDaEscala(escala)), DIAS_DA_FORMA_SEMANA_SEIS_DIAS) : fracao(inteiro(escala.minutosPorDia));
  return multiplicar(minutosDia, fracao(base, MINUTOS_POR_HORA));
}

/**
 * Item 3 — salário-hora exato (centavos por hora) = salário mensal ÷ divisor. Não arredonda: a prova exibe o valor ao
 * centavo pelo `arredondamento` só para leitura, e o cálculo seguinte usa a fração.
 */
export function salarioHora(
  salarioMensalCents: bigint,
  escala: EscalaJornada,
  regraDivisor: RegraDivisor,
  baseDias: ValorRegra<number>,
  arredondamento: ValorRegra<ModoArredondamento>,
): Calculo<Fracao> & { divisorHoras: Fracao } {
  const divisor = divisorHoras(escala, regraDivisor, baseDias);
  if (divisor.num <= 0n) throw new Error('salarioHora: divisor zero (escala sem minutos).');
  const valor = dividir(fracao(salarioMensalCents), divisor);
  return {
    valor,
    divisorHoras: divisor,
    prova: no(`Salário-hora = ${salarioMensalCents} ÷ ${textoFracao(divisor)} h (exato ${textoFracao(valor)}; exibido ao centavo)`, arredondarCentavos(valor, arredondamento.valor), {
      fonte: 'CLT art. 64',
      filhos: [
        no(`Divisor ${regraDivisor.valor}: ${textoFracao(divisor)} h`, 0n, { fonte: fonteLp(regraDivisor) }),
        no(`Base de dias do mensalista: ${baseDias.valor}`, 0n, { fonte: fonteLp(baseDias) }),
      ],
    }),
  };
}

/** Dia na contagem comercial (F-DPF-4 a): o último dia do mês e os dias acima de `baseDias` contam como `baseDias`. */
function diaComercial(data: string, baseDias: number): number {
  const dia = Number(data.slice(8, 10));
  const ultimo = Number(ultimoDia(data.slice(0, 7) as Competencia).slice(8, 10));
  return dia === ultimo ? baseDias : Math.min(dia, baseDias);
}

/**
 * Item 4 / F-DPF-4 (a) — dias devidos ao mensalista na competência, no mês comercial de `baseDias`: admitido no dia *d*
 * recebe `base − d + 1`; desligado no dia *d* recebe *d* (fevereiro e meses de 31 tratados como 30: o último dia do mês
 * conta como o dia `base`). `inicio`/`fim` fora do mês ⇒ mês cheio daquele lado; período fora do mês ⇒ 0.
 */
export function diasDevidosMensalista(competencia: Competencia, inicio: string, fim: string | null, baseDias: ValorRegra<number>): number {
  const de = primeiroDia(competencia);
  const ate = ultimoDia(competencia);
  if (inicio > ate || (fim !== null && fim < de)) return 0;
  const base = baseDias.valor;
  const d0 = inicio > de ? diaComercial(inicio, base) : 1;
  const d1 = fim !== null && fim < ate ? diaComercial(fim, base) : base;
  return Math.max(0, d1 - d0 + 1);
}

/** Item 4 — salário × dias devidos ÷ `baseDias` (Lei 605 art. 7º § 2º [D01]; Dec. 10.854 art. 157 § 2º [D10]). */
export function proporcionalMensalista(
  salarioCents: bigint,
  baseDias: ValorRegra<number>,
  diasDevidos: number,
  arredondamento: ValorRegra<ModoArredondamento>,
): Calculo<bigint> {
  const exato = fracao(salarioCents * inteiro(diasDevidos), inteiro(baseDias.valor));
  const valor = arredondarCentavos(exato, arredondamento.valor);
  return {
    valor,
    prova: no(`Salário ${salarioCents} × ${diasDevidos} ÷ ${baseDias.valor} dias`, valor, {
      fonte: 'Lei 605/1949 art. 7º § 2º',
      filhos: [no(`Base de dias: ${baseDias.valor}`, 0n, { fonte: fonteLp(baseDias) }), no(`Arredondamento ${arredondamento.valor}`, 0n, { fonte: fonteLp(arredondamento) })],
    }),
  };
}

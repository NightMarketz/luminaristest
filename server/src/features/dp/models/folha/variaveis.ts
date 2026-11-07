/**
 * Variáveis da folha — BE-INCR-DP-F2 itens 9–12 (PR-0): hora extra, adicional noturno, DSR sobre variáveis e
 * complemento até o mínimo (com o piso proporcional do F-DPF-6).
 *
 * Funções puras sobre o salário-hora exato (item 3). Adicionais, hora noturna e limite de jornada chegam como
 * `ValorRegra` de `FOLHA_REGRA` (item 67); os dias de trabalho e de repouso vêm de `diasDoMes` (item 69).
 */
import type { DiasDoMes } from '../escala';
import type { ValorRegra } from '../regrasFolha';
import { fonteLp, no, type Calculo } from './calcNode';
import { arredondarCentavos, fracao, inteiro, multiplicar, textoFracao, type Fracao, type ModoArredondamento } from './fracao';

const BP = 10_000n;
const MINUTOS_POR_HORA = 60n;
const SEGUNDOS_POR_MINUTO = 60n;

/**
 * Item 9 — o adicional que vale: o da lei (`HE_ADICIONAL_BP`/`HE_REPOUSO_ADICIONAL_BP`) ou o da CCT vigente, se maior
 * (§5 do BRIEF: a chave da CCT entra no `CCT_CHAVES` quando a primeira CCT real trouxer a cláusula).
 */
export function adicionalAplicavel(lei: ValorRegra<number>, cct: ValorRegra<number> | null): ValorRegra<number> {
  return cct !== null && cct.valor > lei.valor ? cct : lei;
}

/**
 * Item 9 — hora extra = salário-hora × horas × (1 + adicional) (CLT art. 59 § 1º [D02]; repouso ou feriado trabalhado
 * sem folga, Lei 605 art. 9º [D01]). Arredonda uma vez, no valor da rubrica.
 */
export function horaExtra(salarioHora: Fracao, minutos: number, adicional: ValorRegra<number>, arredondamento: ValorRegra<ModoArredondamento>): Calculo<bigint> {
  const exato = multiplicar(salarioHora, fracao(inteiro(minutos) * (BP + inteiro(adicional.valor)), MINUTOS_POR_HORA * BP));
  const valor = arredondarCentavos(exato, arredondamento.valor);
  return {
    valor,
    prova: no(`Hora extra: ${minutos} min × salário-hora ${textoFracao(salarioHora)} × (1 + ${adicional.valor} bp)`, valor, {
      fonte: 'CLT art. 59 § 1º',
      filhos: [no(`Adicional ${adicional.valor} bp`, 0n, { fonte: fonteLp(adicional) }), no(`Arredondamento ${arredondamento.valor}`, 0n, { fonte: fonteLp(arredondamento) })],
    }),
  };
}

/** Item 10 — minutos de relógio em horas noturnas (hora noturna de `horaSegundos`, CLT art. 73 § 1º [D02]). */
export function horasNoturnas(minutosRelogio: number, horaSegundos: ValorRegra<number>): Fracao {
  return fracao(inteiro(minutosRelogio) * SEGUNDOS_POR_MINUTO, inteiro(horaSegundos.valor));
}

/**
 * Item 10 — adicional noturno = salário-hora × horas noturnas × adicional (CLT art. 73 caput e § 1º [D02]). Os minutos
 * chegam já classificados na janela noturna (`NOTURNO_INICIO_MIN`/`NOTURNO_FIM_MIN`): quem classifica é o `DP-PONTO` ou
 * o operador no lançamento manual.
 */
export function adicionalNoturno(
  salarioHora: Fracao,
  minutosRelogio: number,
  adicional: ValorRegra<number>,
  horaSegundos: ValorRegra<number>,
  arredondamento: ValorRegra<ModoArredondamento>,
): Calculo<bigint> {
  const horas = horasNoturnas(minutosRelogio, horaSegundos);
  const exato = multiplicar(multiplicar(salarioHora, horas), fracao(inteiro(adicional.valor), BP));
  const valor = arredondarCentavos(exato, arredondamento.valor);
  return {
    valor,
    prova: no(`Adicional noturno: ${minutosRelogio} min de relógio = ${textoFracao(horas)} h noturnas × ${textoFracao(salarioHora)} × ${adicional.valor} bp`, valor, {
      fonte: 'CLT art. 73',
      filhos: [
        no(`Hora noturna de ${horaSegundos.valor} s`, 0n, { fonte: fonteLp(horaSegundos) }),
        no(`Adicional ${adicional.valor} bp`, 0n, { fonte: fonteLp(adicional) }),
        no(`Arredondamento ${arredondamento.valor}`, 0n, { fonte: fonteLp(arredondamento) }),
      ],
    }),
  };
}

/**
 * Item 11 — DSR sobre variáveis = variáveis ÷ dias de trabalho × dias de repouso (Lei 605 art. 7º "a"/"b" [D01]; Súm.
 * 172 [D14] e 27 [D13] do TST). Os dois números saem de `diasDoMes` (item 69; F-DPF-2 a).
 */
export function dsrSobreVariaveis(variaveisCents: bigint, dias: Pick<DiasDoMes, 'trabalho' | 'repouso'>, arredondamento: ValorRegra<ModoArredondamento>): Calculo<bigint> {
  if (dias.trabalho <= 0) throw new Error('dsrSobreVariaveis: mês sem dia de trabalho na escala.');
  const valor = arredondarCentavos(fracao(variaveisCents * inteiro(dias.repouso), inteiro(dias.trabalho)), arredondamento.valor);
  return {
    valor,
    prova: no(`DSR: ${variaveisCents} ÷ ${dias.trabalho} dias de trabalho × ${dias.repouso} de repouso`, valor, {
      fonte: 'Lei 605/1949 art. 7º; Súm. TST 172 e 27',
      filhos: [no(`Arredondamento ${arredondamento.valor}`, 0n, { fonte: fonteLp(arredondamento) })],
    }),
  };
}

/** Mínimo de referência do complemento: o salário mínimo (G2), o mínimo-hora do aprendiz ou o piso da CCT (G7). */
export interface MinimoReferencia {
  valorCents: bigint;
  rotulo: string;
  fonte: string;
}

/**
 * Item 12 — complemento até o mínimo = `max(0, mínimo − remuneração)`, sem desconto no mês seguinte (CLT art. 78
 * parágrafo único [D02]; CF art. 7º VII [F1-D12]).
 */
export function complementoMinimo(remuneracaoCents: bigint, minimo: MinimoReferencia): Calculo<bigint> {
  const falta = minimo.valorCents - remuneracaoCents;
  const valor = falta > 0n ? falta : 0n;
  return {
    valor,
    prova: no(`Complemento até ${minimo.rotulo} (${minimo.valorCents}) sobre remuneração de ${remuneracaoCents}`, valor, {
      fonte: 'CLT art. 78 parágrafo único',
      filhos: [no(minimo.rotulo, minimo.valorCents, { fonte: minimo.fonte })],
    }),
  };
}

/**
 * Item 12 / F-DPF-6 (a) — piso proporcional à jornada contratual: piso × minutos semanais ÷ limite semanal vigente
 * (`JORNADA_LIMITE_SEMANAL_MIN`; CLT art. 58-A § 1º [D02]; depois de 16/12/2026 o divisor é o limite vigente, EC 141
 * art. 2º). Quem decide se a jornada é de tempo parcial é o chamador (lacuna registrada no PR-0).
 */
export function pisoProporcional(pisoCents: bigint, minutosSemanais: number, limite: ValorRegra<number>, arredondamento: ValorRegra<ModoArredondamento>): Calculo<bigint> {
  const valor = arredondarCentavos(fracao(pisoCents * inteiro(minutosSemanais), inteiro(limite.valor)), arredondamento.valor);
  return {
    valor,
    prova: no(`Piso ${pisoCents} × ${minutosSemanais} ÷ ${limite.valor} minutos semanais`, valor, {
      fonte: 'CLT art. 58-A § 1º',
      filhos: [no(`Limite semanal ${limite.valor} min`, 0n, { fonte: fonteLp(limite) }), no(`Arredondamento ${arredondamento.valor}`, 0n, { fonte: fonteLp(arredondamento) })],
    }),
  };
}

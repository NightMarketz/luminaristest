/**
 * Adiantamento e o desconto dele na mensal — BE-INCR-DP-F2 itens 42 e 43 (escrito no PR-2 por decisão do dono, chat,
 * 2026-11-07: "Escrever agora"; o motor do PR-4 só consome).
 *
 * O percentual do adiantamento é parâmetro da instância (`DpParametrosFolha`, item 50, PR-5), não lei: chega aqui como
 * argumento com a fonte. Sem parâmetro, quem responde `DP_ADIANTAMENTO_SEM_PARAMETRO` é o roteiro (item 50).
 */
import type { ValorRegra } from '../regrasFolha';
import { fonteLp, no, type Calculo } from './calcNode';
import { arredondarCentavos, fracao, inteiro, type ModoArredondamento } from './fracao';

const BP = 10_000n;

export interface PercentualAdiantamento {
  bp: number;
  /** De onde veio: o id do `DpParametrosFolha` da instância (item 50). */
  fonte: string;
}

/** Item 42 — `ADIANTAMENTO` = percentual × salário contratual da versão vigente no dia do pagamento; sem INSS e sem FGTS. */
export function adiantamento(salarioContratualCents: bigint, percentual: PercentualAdiantamento, arredondamento: ValorRegra<ModoArredondamento>): Calculo<bigint> {
  const valor = arredondarCentavos(fracao(salarioContratualCents * inteiro(percentual.bp), BP), arredondamento.valor);
  return {
    valor,
    prova: no(`Adiantamento: ${percentual.bp} bp × salário ${salarioContratualCents}`, valor, {
      fonte: percentual.fonte,
      filhos: [no(`Arredondamento ${arredondamento.valor}`, 0n, { fonte: fonteLp(arredondamento) })],
    }),
  };
}

export interface ExecucaoAdiantamento {
  folhaId: string;
  /** Instante da execução (ISO); a mais recente vale. */
  calculadaEm: string;
  /** O que a execução pagou ao vínculo na rubrica `ADIANTAMENTO`. */
  valorCents: bigint;
}

/**
 * Item 43 — `DESCONTO_ADIANTAMENTO` = o que a execução `ADIANTAMENTO` mais recente da mesma competência pagou ao
 * vínculo. Sem execução, `null` (nada a descontar). Empate de instante desempata pelo `folhaId`, para ser determinístico.
 */
export function descontoAdiantamento(execucoes: readonly ExecucaoAdiantamento[]): Calculo<bigint> | null {
  if (execucoes.length === 0) return null;
  const maisRecente = [...execucoes].sort((a, b) => (a.calculadaEm === b.calculadaEm ? a.folhaId.localeCompare(b.folhaId) : a.calculadaEm.localeCompare(b.calculadaEm))).at(-1)!;
  return {
    valor: maisRecente.valorCents,
    prova: no(`Desconto do adiantamento pago na execução ${maisRecente.folhaId} (${maisRecente.calculadaEm})`, maisRecente.valorCents, {
      fonte: 'BRIEF DP-F2 item 43',
    }),
  };
}

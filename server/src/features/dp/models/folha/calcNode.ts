/**
 * Nó de prova do cálculo — BE-INCR-DP-F2 item 1 (PR-0; contrato §3.1).
 *
 * Toda calculadora do F2 devolve `{ valor, prova }`. `fonte` é o artigo (`"CLT art. 64"`) ou o id da linha de
 * `LegalParameter` de onde veio o número (`"LP:<id>"`). Os filhos marcados `soma: true` somam o valor do pai; os outros
 * são informativos (a alíquota, a fração exata, a base limitada). Valor negativo é permitido (o "menos" de uma conta).
 */
import type { ValorRegra } from '../regrasFolha';

export type Cents = bigint;

export interface CalcNode {
  rotulo: string;
  valorCents: Cents;
  fonte?: string;
  soma?: boolean;
  filhos: CalcNode[];
}

export interface Calculo<T> {
  valor: T;
  prova: CalcNode;
}

export function no(rotulo: string, valorCents: Cents, opcoes: { fonte?: string; soma?: boolean; filhos?: CalcNode[] } = {}): CalcNode {
  const n: CalcNode = { rotulo, valorCents, filhos: opcoes.filhos ?? [] };
  if (opcoes.fonte !== undefined) n.fonte = opcoes.fonte;
  if (opcoes.soma !== undefined) n.soma = opcoes.soma;
  return n;
}

/** `fonte` de um número lido de `LegalParameter`: o id da linha. */
export function fonteLp(r: Pick<ValorRegra<unknown>, 'linhaId'>): string {
  return `LP:${r.linhaId}`;
}

/** Item 1 — os nós cujos filhos `soma: true` não batem com o valor do nó (vazio = prova coerente). */
export function provaIncoerente(n: CalcNode): string[] {
  const parcelas = n.filhos.filter((f) => f.soma === true);
  const aqui = parcelas.length > 0 && parcelas.reduce((s, f) => s + f.valorCents, 0n) !== n.valorCents ? [n.rotulo] : [];
  return [...aqui, ...n.filhos.flatMap(provaIncoerente)];
}

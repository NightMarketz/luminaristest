/**
 * BE-INCR-IRRF-DISTRIBUICAO PR-1 (itens 2 e 3) — regras puras da vigência do sócio. Datas date-only (YYYY-MM-DD)
 * comparadas como texto; `saidaEm` null = vigência em aberto, inclusive nas duas pontas.
 */
export interface Vigencia {
  entradaEm: string;
  saidaEm: string | null;
}

export type TipoPessoa = 'PF' | 'PJ';

/** Item 1 — derivado do tamanho do `taxId` (11 = CPF, 14 = CNPJ). */
export function tipoPessoaDe(taxId: string): TipoPessoa {
  return taxId.length === 11 ? 'PF' : 'PJ';
}

export function vigenteEm(v: Vigencia, data: string): boolean {
  return v.entradaEm <= data && (v.saidaEm === null || data <= v.saidaEm);
}

/** Item 2 — duas vigências se cruzam quando cada uma começa antes (ou no dia) do fim da outra. */
export function vigenciasSeSobrepoem(a: Vigencia, b: Vigencia): boolean {
  return (b.saidaEm === null || a.entradaEm <= b.saidaEm) && (a.saidaEm === null || b.entradaEm <= a.saidaEm);
}

/** Item 3 (F-IRD-14) — soma das participações, em bp, dos sócios vigentes; 10000 = 100%. */
export const PARTICIPACAO_TOTAL_BP = 10000;
export function somaParticipacaoBp(socios: readonly { participacaoBp: number }[]): number {
  return socios.reduce((s, p) => s + p.participacaoBp, 0);
}

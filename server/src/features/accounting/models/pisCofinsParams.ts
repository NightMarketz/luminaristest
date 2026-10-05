/**
 * BE-INCR-PIS-COFINS (nó X8, BRIEF item 3; ADR D9/D10) — parâmetros da apuração mensal de PIS/Cofins como DADO
 * versionado, no molde de `obrigacoesPorRegime.ts` e `taxAssessmentParams.ts`. Cada linha carrega `fonte` (não
 * vazia), `vigenteDesde` e `vigenteAte = '2026-12-31'`: PIS e Cofins são revogados a partir de 01/01/2027 (LC 214/2025
 * art. 542; efeito pelo art. 544 III). Sem linha vigente ⇒ o chamador (prévia, item 9) responde 400.
 *
 * Alíquotas em pontos-base. As do não cumulativo são as MESMAS constantes do crédito da NF-e (`nfeCost.ts`): mesmo
 * número, mesma lei — importadas, não duplicadas.
 */
import { COFINS_CREDIT_BP, PIS_CREDIT_BP } from '../../../lib/nfeCost';
import { arred } from './taxAssessmentParams';

export type TributoPisCofins = 'PIS' | 'COFINS';
export type ModalidadePisCofins = 'CUMULATIVO' | 'NAO_CUMULATIVO';

export interface ParametroPisCofins {
  tributo: TributoPisCofins;
  modalidade: ModalidadePisCofins;
  aliquotaBp: number;
  /** Código de receita (6 dígitos = código + variação) da tabela DCTF, gravado na apuração (D10). */
  codigoReceita: string;
  fonte: string;
  vigenteDesde: string; // YYYY-MM-DD
  vigenteAte: string; // YYYY-MM-DD, inclusive
}

/** Revogação (LC 214/2025 art. 542; art. 544 III): último dia com PIS/Cofins. */
export const PIS_COFINS_VIGENTE_ATE = '2026-12-31';
export const PIS_COFINS_REVOGACAO_FONTE = 'LC 214/2025 art. 542 (efeito: art. 544 III)';

// vigenteDesde = data do ato citado; só importa que preceda o 1º ano apurável (2025) — artigo de vigência não relido.
const IN_2121 = '2022-12-15';
const CODIGOS_FONTE = 'Receita Federal, DCTF — Tabelas de códigos de receita PIS (27/02/2024) e Cofins (27/07/2023)';

export const PARAMETROS_PIS_COFINS: readonly ParametroPisCofins[] = [
  { tributo: 'PIS', modalidade: 'CUMULATIVO', aliquotaBp: 65, codigoReceita: '810902', fonte: `IN RFB 2.121/2022 art. 128; ${CODIGOS_FONTE}`, vigenteDesde: IN_2121, vigenteAte: PIS_COFINS_VIGENTE_ATE },
  { tributo: 'COFINS', modalidade: 'CUMULATIVO', aliquotaBp: 300, codigoReceita: '217201', fonte: `IN RFB 2.121/2022 art. 128; Lei 9.718/1998 art. 8º; ${CODIGOS_FONTE}`, vigenteDesde: IN_2121, vigenteAte: PIS_COFINS_VIGENTE_ATE },
  { tributo: 'PIS', modalidade: 'NAO_CUMULATIVO', aliquotaBp: PIS_CREDIT_BP, codigoReceita: '691201', fonte: `IN RFB 2.121/2022 art. 150; Lei 10.637/2002 art. 2º; ${CODIGOS_FONTE}`, vigenteDesde: IN_2121, vigenteAte: PIS_COFINS_VIGENTE_ATE },
  { tributo: 'COFINS', modalidade: 'NAO_CUMULATIVO', aliquotaBp: COFINS_CREDIT_BP, codigoReceita: '585601', fonte: `IN RFB 2.121/2022 art. 150; Lei 10.833/2003 art. 2º; ${CODIGOS_FONTE}`, vigenteDesde: IN_2121, vigenteAte: PIS_COFINS_VIGENTE_ATE },
];

/** Linha vigente em `data` (date-only; a apuração consulta o último dia do mês), ou `undefined` (antes ou depois da vigência). */
export function parametroPisCofinsVigente(tributo: TributoPisCofins, modalidade: ModalidadePisCofins, data: string): ParametroPisCofins | undefined {
  return PARAMETROS_PIS_COFINS.find(
    (p) => p.tributo === tributo && p.modalidade === modalidade && p.vigenteDesde <= data && data <= p.vigenteAte,
  );
}

/** Crédito de PIS/Cofins de uma nota de compra no mês (BRIEF item 6) — a entrada da memória `CREDITO_NFE` do PR-2. */
export interface CreditoPisCofinsNota {
  payableId: string;
  documentNumber: string | null;
  issueDate: string; // YYYY-MM-DD (= dhEmi; "mês da aquisição" — P-3)
  amountCents: number;
  baseCents: number | null;
  pisCents: number;
  cofinsCents: number;
  /** true = nota anterior ao item 5: parcelas derivadas de `amountCents` por 165:760 (memória `CREDITO_NFE_DERIVADO`). */
  derivado: boolean;
}

/**
 * Item 6 (F-X8-7 a): linha `PIS_COFINS` com `pisCents`/`cofinsCents` ⇒ usa; sem ⇒ PIS = `arred(amount × 165 / 925)`
 * (item 4: a função half-up única do X7, F-TA-2 a), Cofins = resto — a soma é sempre `amountCents`.
 */
export function separarCreditoPisCofins(line: { amountCents: number; baseCents?: number; pisCents?: number; cofinsCents?: number }): Pick<CreditoPisCofinsNota, 'baseCents' | 'pisCents' | 'cofinsCents' | 'derivado'> {
  if (line.pisCents !== undefined && line.cofinsCents !== undefined) {
    return { baseCents: line.baseCents ?? null, pisCents: line.pisCents, cofinsCents: line.cofinsCents, derivado: false };
  }
  const pis = Number(arred(BigInt(line.amountCents) * BigInt(PIS_CREDIT_BP), BigInt(PIS_CREDIT_BP + COFINS_CREDIT_BP)));
  return { baseCents: null, pisCents: pis, cofinsCents: line.amountCents - pis, derivado: true };
}

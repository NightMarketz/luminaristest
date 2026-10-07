/**
 * BE-INCR-PIS-COFINS (nó X8, BRIEF item 3; ADR D9/D10) — parâmetros da apuração mensal de PIS/Cofins como DADO
 * versionado, no molde de `obrigacoesPorRegime.ts` e `taxAssessmentParams.ts`. Cada linha carrega `fonte` (não
 * vazia), `vigenteDesde` e `vigenteAte = '2026-12-31'`: PIS e Cofins são revogados a partir de 01/01/2027 (LC 214/2025
 * art. 542; efeito pelo art. 544 III). Sem linha vigente ⇒ o chamador (prévia, item 9) responde 400.
 *
 * Alíquotas em pontos-base. BE-INCR-LEGAL-PARAMS PR-1: as linhas moram em `legal_parameters` (tabela `PIS_COFINS`).
 * As do não cumulativo (165/760) ainda coexistem com `PIS_CREDIT_BP`/`COFINS_CREDIT_BP` de `nfeCost.ts`, usadas abaixo
 * na divisão do crédito — a remoção dessas constantes é o item 13 (PR-2); o teste de paridade amarra os números.
 */
import { COFINS_CREDIT_BP, PIS_CREDIT_BP } from '../../../lib/nfeCost';
import { arred } from './taxAssessmentParams';
import type { LinhaLegal } from '../../legalParameters/models/legalParameter';

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

/** Revogação (LC 214/2025 art. 542; art. 544 III). O último dia (2026-12-31) é o `vigenteAte` das linhas `PIS_COFINS`. */
export const PIS_COFINS_REVOGACAO_FONTE = 'LC 214/2025 art. 542 (efeito: art. 544 III)';

/**
 * Códigos de receita por tributo × modalidade (tabela `CODIGO_RECEITA` do inventário, item 14). BE-INCR-LEGAL-PARAMS
 * PR-1 migrou só as ALÍQUOTAS (`PIS_COFINS`); os códigos vão para o banco no PR-2 (emenda §9 L-4).
 */
export const CODIGOS_RECEITA_PIS_COFINS: Readonly<Record<`${TributoPisCofins}|${ModalidadePisCofins}`, string>> = {
  'PIS|CUMULATIVO': '810902',
  'COFINS|CUMULATIVO': '217201',
  'PIS|NAO_CUMULATIVO': '691201',
  'COFINS|NAO_CUMULATIVO': '585601',
};

/**
 * BE-INCR-LEGAL-PARAMS PR-1 (F-LP-4 a) — fotografia das linhas `PIS_COFINS` em vigor (chave = tributo, discriminador
 * = modalidade, `valorInt` = alíquota em bp), montada pelo serviço. As linhas em código saíram na migração.
 */
export function tabelaPisCofinsDe(linhas: readonly LinhaLegal[]): readonly ParametroPisCofins[] {
  return linhas
    .filter((l) => l.tabela === 'PIS_COFINS')
    .map((l) => {
      const tributo = l.chave as TributoPisCofins;
      const modalidade = l.discriminador as ModalidadePisCofins;
      const codigoReceita = CODIGOS_RECEITA_PIS_COFINS[`${tributo}|${modalidade}`];
      if (!codigoReceita || l.valorInt === null) throw new Error(`pisCofinsParams: linha ${l.id} (${l.chave}/${l.discriminador ?? '∅'}) fora do formato de PIS_COFINS`);
      // Sem `vigenteAte` na linha = sem fim publicado; a revogação (LC 214) é a linha que o publica.
      return { tributo, modalidade, aliquotaBp: l.valorInt, codigoReceita, fonte: l.fonte, vigenteDesde: l.vigenteDesde, vigenteAte: l.vigenteAte ?? '9999-12-31' };
    });
}

/** Linha vigente em `data` (date-only; a apuração consulta o último dia do mês), ou `undefined` (antes ou depois da vigência). */
export function parametroPisCofinsVigente(
  tabela: readonly ParametroPisCofins[],
  tributo: TributoPisCofins,
  modalidade: ModalidadePisCofins,
  data: string,
): ParametroPisCofins | undefined {
  let melhor: ParametroPisCofins | undefined;
  for (const p of tabela) {
    if (p.tributo !== tributo || p.modalidade !== modalidade || p.vigenteDesde > data || data > p.vigenteAte) continue;
    if (!melhor || p.vigenteDesde > melhor.vigenteDesde) melhor = p;
  }
  return melhor;
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

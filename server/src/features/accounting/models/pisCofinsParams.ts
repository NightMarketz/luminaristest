/**
 * BE-INCR-PIS-COFINS (nó X8, BRIEF item 3; ADR D9/D10) — parâmetros da apuração mensal de PIS/Cofins como DADO
 * versionado, no molde de `obrigacoesPorRegime.ts` e `taxAssessmentParams.ts`. Cada linha carrega `fonte` (não
 * vazia), `vigenteDesde` e `vigenteAte = '2026-12-31'`: PIS e Cofins são revogados a partir de 01/01/2027 (LC 214/2025
 * art. 542; efeito pelo art. 544 III). Sem linha vigente ⇒ o chamador (prévia, item 9) responde 400.
 *
 * Alíquotas em pontos-base. BE-INCR-LEGAL-PARAMS PR-1: as linhas moram em `legal_parameters` (tabela `PIS_COFINS`).
 * PR-2 (item 13): os códigos de receita vêm da tabela `CODIGO_RECEITA` e a divisão do crédito derivado lê as alíquotas
 * do não cumulativo desta mesma tabela — as constantes `PIS_CREDIT_BP`/`COFINS_CREDIT_BP` de `nfeCost.ts` saíram.
 */
import { arred } from './taxAssessmentParams';
import { SemLinhaVigenteError, linhaLegalVigente, type LinhaLegal } from '../../legalParameters/models/legalParameter';

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
 * BE-INCR-LEGAL-PARAMS PR-1 (F-LP-4 a) — fotografia das linhas `PIS_COFINS` em vigor (chave = tributo, discriminador
 * = modalidade, `valorInt` = alíquota em bp), montada pelo serviço. As linhas em código saíram na migração. PR-2: o
 * código de receita é a linha `CODIGO_RECEITA` de mesma chave/discriminador vigente no início da linha de alíquota.
 */
export function tabelaPisCofinsDe(linhas: readonly LinhaLegal[]): readonly ParametroPisCofins[] {
  return linhas
    .filter((l) => l.tabela === 'PIS_COFINS')
    .map((l) => {
      const tributo = l.chave as TributoPisCofins;
      const modalidade = l.discriminador as ModalidadePisCofins;
      const codigoReceita = linhaLegalVigente(linhas, 'CODIGO_RECEITA', tributo, l.vigenteDesde, modalidade)?.valorTexto;
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

/** Alíquotas do crédito do não cumulativo (bp) — a razão da divisão do crédito derivado (item 6). */
export interface RazaoCreditoPisCofins {
  pisBp: number;
  cofinsBp: number;
}

/**
 * PR-2 (item 13) — PIS/Cofins NAO_CUMULATIVO vigentes em `data` (linhas `PIS_COFINS` da fotografia); sem linha ⇒ erro
 * explícito (400). Substitui `PIS_CREDIT_BP`/`COFINS_CREDIT_BP` (nfeCost) no crédito da NF-e e na divisão derivada.
 */
export function razaoCreditoPisCofins(linhas: readonly LinhaLegal[], data: string): RazaoCreditoPisCofins {
  const pis = linhaLegalVigente(linhas, 'PIS_COFINS', 'PIS', data, 'NAO_CUMULATIVO');
  const cofins = linhaLegalVigente(linhas, 'PIS_COFINS', 'COFINS', data, 'NAO_CUMULATIVO');
  if (pis?.valorInt == null || cofins?.valorInt == null) throw new SemLinhaVigenteError('PIS_COFINS', data, `${pis ? 'COFINS' : 'PIS'}/NAO_CUMULATIVO`);
  return { pisBp: pis.valorInt, cofinsBp: cofins.valorInt };
}

/**
 * Item 6 (F-X8-7 a): linha `PIS_COFINS` com `pisCents`/`cofinsCents` ⇒ usa; sem ⇒ PIS = `arred(amount × pis / (pis +
 * cofins))` (165/925 hoje; item 4: a função half-up única do X7, F-TA-2 a), Cofins = resto — a soma é sempre `amountCents`.
 */
export function separarCreditoPisCofins(
  line: { amountCents: number; baseCents?: number; pisCents?: number; cofinsCents?: number },
  razao: RazaoCreditoPisCofins,
): Pick<CreditoPisCofinsNota, 'baseCents' | 'pisCents' | 'cofinsCents' | 'derivado'> {
  if (line.pisCents !== undefined && line.cofinsCents !== undefined) {
    return { baseCents: line.baseCents ?? null, pisCents: line.pisCents, cofinsCents: line.cofinsCents, derivado: false };
  }
  const pis = Number(arred(BigInt(line.amountCents) * BigInt(razao.pisBp), BigInt(razao.pisBp + razao.cofinsBp)));
  return { baseCents: null, pisCents: pis, cofinsCents: line.amountCents - pis, derivado: true };
}

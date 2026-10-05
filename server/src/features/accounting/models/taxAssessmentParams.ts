/**
 * BE-INCR-TAX-ASSESSMENT Fase A (nó X7, BRIEF itens 4–5; ADR D3, F-X7-10 b, F-X7-14) — parâmetros da apuração de
 * IRPJ/CSLL como DADO versionado (não engine — `R-motor-regras` rejeitado), no molde de `obrigacoesPorRegime.ts`.
 * Cada linha carrega `fonte` (obrigatória, não vazia) e `vigenteDesde` (date-only). Alíquotas e percentuais em
 * pontos-base (convenção de `FiscalProfile.issAliquotaBp`); limites em centavos (`*_CENTS`).
 *
 * O número que sai daqui só tem oráculo quando o H1 (Presumido) ou o X5 (Real) conciliam X7 × PVA (F-X7-2 a, P-9):
 * um teste verde prova a aritmética contra esta tabela, não contra a lei.
 */

/** Versão desta tabela — gravada em `TaxAssessment.tabelaVersao` (D3). Mudou linha ⇒ muda a versão. */
export const TAX_ASSESSMENT_TABELA_VERSAO = '2026-10-04'; // Fase B PR-1: + 16% do prestador exclusivo (item 3b)

export type ChaveParametro =
  | 'IRPJ_ALIQ'
  | 'IRPJ_ADIC_ALIQ'
  | 'IRPJ_ADIC_LIMITE_MES_CENTS'
  | 'PRESUNCAO_IRPJ'
  | 'PRESUNCAO_CSLL'
  | 'COMPENSACAO_TETO'
  | 'LC224_ACRESCIMO_IRPJ'
  | 'LC224_ACRESCIMO_CSLL'
  | 'LC224_LIMITE_TRIMESTRE_CENTS'
  | 'PRESUNCAO_IRPJ_REDUZIDA'
  | 'RECEITA_LIMITE_REDUZIDA_ANO_CENTS';

export type AtividadePresuncao = 'SERVICO' | 'REVENDA';

export interface ParametroApuracao {
  chave: ChaveParametro;
  atividade?: AtividadePresuncao;
  valor: number; // bp, ou centavos nos *_CENTS
  fonte: string;
  vigenteDesde: string; // YYYY-MM-DD
}

// vigenteDesde das linhas-base = data do ato citado (só importa que preceda o 1º ano apurável, 2025).
const LEI_9249 = '1996-01-01'; // Lei 9.249/1995, efeitos a partir de 01/01/1996 (art. 36)
const IN_1700 = '2017-03-16';
const LEI_9250 = '1996-01-01'; // Lei 9.250/1995 (dez/1995) — só importa preceder o 1º ano apurável (artigo de vigência não relido)

export const PARAMETROS_APURACAO: readonly ParametroApuracao[] = [
  { chave: 'IRPJ_ALIQ', valor: 1500, fonte: 'IN RFB 1.700/2017 art. 29 caput', vigenteDesde: IN_1700 },
  { chave: 'IRPJ_ADIC_ALIQ', valor: 1000, fonte: 'IN RFB 1.700/2017 art. 29 § 1º', vigenteDesde: IN_1700 },
  { chave: 'IRPJ_ADIC_LIMITE_MES_CENTS', valor: 2_000_000, fonte: 'IN RFB 1.700/2017 art. 29 §§ 1º–2º (R$ 20.000,00 × meses do período)', vigenteDesde: IN_1700 },
  { chave: 'PRESUNCAO_IRPJ', atividade: 'SERVICO', valor: 3200, fonte: 'Lei 9.249/1995 art. 15 § 1º III a', vigenteDesde: LEI_9249 },
  { chave: 'PRESUNCAO_IRPJ', atividade: 'REVENDA', valor: 800, fonte: 'Lei 9.249/1995 art. 15 caput', vigenteDesde: LEI_9249 },
  { chave: 'PRESUNCAO_CSLL', atividade: 'SERVICO', valor: 3200, fonte: 'Lei 9.249/1995 art. 20 (32% p/ as atividades do art. 15 § 1º III)', vigenteDesde: LEI_9249 },
  { chave: 'PRESUNCAO_CSLL', atividade: 'REVENDA', valor: 1200, fonte: 'Lei 9.249/1995 art. 20 caput', vigenteDesde: LEI_9249 },
  { chave: 'COMPENSACAO_TETO', valor: 3000, fonte: 'IN RFB 1.700/2017 art. 64', vigenteDesde: IN_1700 },
  { chave: 'LC224_ACRESCIMO_IRPJ', valor: 1000, fonte: 'IN RFB 2.305/2025 art. 14 e art. 3º I (IRPJ desde 01/01/2026)', vigenteDesde: '2026-01-01' },
  { chave: 'LC224_ACRESCIMO_CSLL', valor: 1000, fonte: 'IN RFB 2.305/2025 art. 14 e art. 3º II (CSLL desde 01/04/2026)', vigenteDesde: '2026-04-01' },
  { chave: 'LC224_LIMITE_TRIMESTRE_CENTS', valor: 125_000_000, fonte: 'IN RFB 2.305/2025 art. 15 § 2º (redação da IN 2.306/2026)', vigenteDesde: '2026-01-01' },
  // Fase B (BRIEF B item 3b, F-TB-5 b) — estimativa do IRPJ da PJ exclusivamente prestadora de serviços em geral.
  { chave: 'PRESUNCAO_IRPJ_REDUZIDA', valor: 1600, fonte: 'IN RFB 1.700/2017 art. 33 § 7º; Lei 9.250/1995 art. 40', vigenteDesde: LEI_9250 },
  { chave: 'RECEITA_LIMITE_REDUZIDA_ANO_CENTS', valor: 12_000_000, fonte: 'IN RFB 1.700/2017 art. 33 § 7º; Lei 9.250/1995 art. 40 (R$ 120.000,00 no ano)', vigenteDesde: LEI_9250 },
];

const ACRESCIMO_LC224: ReadonlySet<ChaveParametro> = new Set(['LC224_ACRESCIMO_IRPJ', 'LC224_ACRESCIMO_CSLL']);

/** Linha vigente em `dataFimDoPeriodo` (a de `vigenteDesde` mais recente ≤ data), ou `undefined`. */
export function linhaVigente(chave: ChaveParametro, dataFimDoPeriodo: string, atividade?: AtividadePresuncao): ParametroApuracao | undefined {
  let melhor: ParametroApuracao | undefined;
  for (const p of PARAMETROS_APURACAO) {
    if (p.chave !== chave || p.atividade !== atividade || p.vigenteDesde > dataFimDoPeriodo) continue;
    if (!melhor || p.vigenteDesde > melhor.vigenteDesde) melhor = p;
  }
  return melhor;
}

/**
 * Lookup puro (item 4). Sem linha vigente: o acréscimo da LC 224 vale 0 (antes da vigência); qualquer outra chave é
 * erro de programação (a tabela cobre todo ano apurável).
 */
export function parametroVigente(chave: ChaveParametro, dataFimDoPeriodo: string, atividade?: AtividadePresuncao): number {
  const p = linhaVigente(chave, dataFimDoPeriodo, atividade);
  if (p) return p.valor;
  if (ACRESCIMO_LC224.has(chave)) return 0;
  throw new Error(`taxAssessmentParams: sem linha vigente de ${chave}${atividade ? `/${atividade}` : ''} em ${dataFimDoPeriodo}`);
}

/** D8 — alíquota da CSLL pelo `CompanyFiscalProfile.ecfIndAliqCsll` (uma fonte só). */
export const ALIQUOTA_CSLL_BP: Readonly<Record<string, { valor: number; fonte: string }>> = {
  '1': { valor: 900, fonte: 'Lei 7.689/1988 art. 3º III' },
  '4': { valor: 1500, fonte: 'Lei 7.689/1988 art. 3º I' },
};

/**
 * Códigos de receita (6 dígitos = código + variação), fonte: Receita, "DCTF — Tabelas de códigos" IRPJ e CSLL
 * (12/03/2024), ADR §3. Que o MIT use a mesma tabela é inferido (P-8).
 */
export const CODIGOS_RECEITA_FONTE = 'Receita Federal, DCTF — Tabelas de códigos de receita IRPJ e CSLL (12/03/2024)';
export const CODIGOS_RECEITA = {
  IRPJ_PRESUMIDO: '208901',
  IRPJ_REAL_TRIMESTRAL_OBRIGADA: '022001',
  IRPJ_REAL_TRIMESTRAL_OPTANTE: '337301',
  CSLL_PRESUMIDO: '237201',
  CSLL_REAL_TRIMESTRAL: '601201',
  // Fase B (BRIEF B item 3; ADR §3) — Real anual. O mês por balancete com redução usa o código da estimativa (P-B2).
  IRPJ_ESTIMATIVA_OBRIGADA: '236201',
  IRPJ_ESTIMATIVA_OPTANTE: '599301',
  CSLL_ESTIMATIVA: '248401',
  IRPJ_AJUSTE_ANUAL_OBRIGADA: '243001',
  IRPJ_AJUSTE_ANUAL_OPTANTE: '245601',
  CSLL_AJUSTE_ANUAL: '677301',
  IRPJ_DIFERENCA_POSTERGADA_16_OBRIGADA: '236202',
  IRPJ_DIFERENCA_POSTERGADA_16_OPTANTE: '599302',
} as const;

/**
 * F-TA-2 (a) — A ÚNICA função de arredondamento da apuração: meia unidade para cima (half-up) de `num / den` ao
 * centavo inteiro. Toda multiplicação por bp e todo rateio proporcional passam por aqui; cada linha da memória guarda
 * o valor já arredondado. Fonte primária de arredondamento não encontrada (P-4); o PVA usa `ARRED(…)`.
 */
export function arred(num: bigint, den: bigint): bigint {
  if (den <= 0n) throw new Error('arred: denominador deve ser positivo');
  let q = num / den;
  let r = num % den;
  if (r < 0n) {
    q -= 1n;
    r += den;
  } // piso
  return 2n * r >= den ? q + 1n : q;
}

/** `cents × bp₁ × bp₂ … / 10000ⁿ`, arredondado UMA vez por `arred`. */
export function mulBp(cents: bigint, ...bps: number[]): bigint {
  let num = cents;
  let den = 1n;
  for (const bp of bps) {
    num *= BigInt(bp);
    den *= 10_000n;
  }
  return arred(num, den);
}

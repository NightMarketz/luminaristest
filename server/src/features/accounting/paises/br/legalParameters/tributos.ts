import { z } from 'zod';
import type { LegalParameterFormatRegistration } from '../../../../legalParameters/models/formatRegistry';
import { bp, jsonOk, semDisc, so } from '../../../../legalParameters/models/formatHelpers';
import { DEPRECIACAO_ANEXO_III_FONTES, DepreciacaoAnexoJson } from '../../../models/FixedAsset.model';
import { isValidDateOnly } from '../../../models/dates';
import { MARCOS_LEGAIS } from '../../../models/marcoLegal';
import { ObrigacaoRegimeJson, ORDEM_OBRIGACOES } from '../../../models/obrigacoesPorRegime';
import { REGIMES_EMPRESA } from '../../../models/regimeEmpresa';
import { NOMES_CODIGO_RECEITA } from '../../../models/taxAssessmentParams';

/**
 * BE-INCR-PAIS-NA-BORDA-F3 item 3 — formatos das tabelas de IRPJ/CSLL, PIS/COFINS, distribuição de lucros, encargos, obrigações, SPED, depreciação e marcos de lei. Cada regra é a do `formatoLinha.ts`, movida
 * sem mudança: mesmo predicado e mesma mensagem.
 */
const BR = { domain: 'accounting', country: 'br' } as const;

const texto = z.string().trim().min(1);
export const NcmMonofasicoJson = z.object({ ordem: z.number().int().min(1), exceto: z.array(z.string().regex(/^\d{8}$/)).min(1).optional() }).strict();
/** BE-INCR-IRRF-DISTRIBUICAO item 5 — chaves da tabela e o tipo de valor de cada uma. */
const IRRF_DISTRIBUICAO_CHAVES_INT = ['ALIQUOTA_PF_BP', 'LIMITE_MENSAL_PF_CENTS', 'ALIQUOTA_JCP_BP'];
/** EFICIENCIA-FISCAL PR-3 — chaves em bp da ENCARGO_FOLHA (o teto do RGPS é em centavos). DP-F0-F1 item 22: + FGTS do aprendiz. */
const ENCARGO_FOLHA_CHAVES_BP = ['CI_SEGURADO_BP', 'PATRONAL_BP', 'FGTS_BP', 'FGTS_APRENDIZ_BP'];

export const TRIBUTOS_FORMATS: readonly LegalParameterFormatRegistration[] = [
  // Fallback do PR-1, agora explícito (F3 item 4): `ARREDONDAMENTO` é a única linha de texto do TAX_ASSESSMENT.
  {
    table: 'TAX_ASSESSMENT',
    ...BR,
    value: (l) => (l.chave === 'ARREDONDAMENTO' ? 'text' : 'int'),
    check: () => null,
  },
  // Fallback do PR-1 (F3 item 4): valorInt em bp, sem regra de chave.
  { table: 'CSLL_ALIQUOTA', ...BR, value: 'int', check: () => null },
  {
    table: 'CODIGO_RECEITA',
    ...BR,
    value: 'text',
    check: (l) =>
      so(/^\d{6}$/.test(l.valorTexto ?? ''), 'valorTexto = código de receita de 6 dígitos (código + variação)') ??
      so(
        (NOMES_CODIGO_RECEITA.has(l.chave) && semDisc(l)) ||
          (['PIS', 'COFINS'].includes(l.chave) && ['CUMULATIVO', 'NAO_CUMULATIVO'].includes(l.discriminador ?? '')),
        'chave = nome do código IRPJ/CSLL (sem discriminador) ou PIS|COFINS com discriminador CUMULATIVO|NAO_CUMULATIVO',
      ),
  },
  // Fallback do PR-1 (F3 item 4). Lacuna 03e4 (F-F3-6 a): toda linha da PIS_COFINS marca o fim da lei (`fimMonofasicoPisCofins`).
  {
    table: 'PIS_COFINS',
    ...BR,
    value: 'int',
    check: (l) => so(['PIS', 'COFINS'].includes(l.chave) && ['CUMULATIVO', 'NAO_CUMULATIVO'].includes(l.discriminador ?? ''), 'chave PIS|COFINS e discriminador CUMULATIVO|NAO_CUMULATIVO'),
    endRequired: () => true,
  },
  {
    table: 'PIS_COFINS_MONOFASICO_NCM',
    ...BR,
    value: 'json',
    check: (l) =>
      so(/^\d{2,8}$/.test(l.chave) && semDisc(l), 'chave = prefixo de 2 a 8 dígitos do NCM, sem discriminador') ??
      jsonOk(NcmMonofasicoJson, l.valorJson, 'valorJson = { ordem: inteiro ≥ 1, exceto?: [NCM de 8 dígitos] }'),
  },
  {
    table: 'CST_PIS_COFINS',
    ...BR,
    value: 'text',
    check: (l) => so(/^\d{2}$/.test(l.chave) && semDisc(l) && ['SEM_CREDITO', 'TRIBUTADO'].includes(l.valorTexto ?? ''), 'chave = CST de 2 dígitos; valorTexto SEM_CREDITO|TRIBUTADO'),
  },
  {
    table: 'OBRIGACAO_REGIME',
    ...BR,
    value: 'json',
    check: (l) =>
      // Achado 4 do #861: a chave é qualquer obrigação da matriz (ORDEM_OBRIGACOES), não só as do PR-2.
      so((ORDEM_OBRIGACOES as readonly string[]).includes(l.chave) && (REGIMES_EMPRESA as readonly string[]).includes(l.discriminador ?? ''), `chave ${ORDEM_OBRIGACOES.join('|')}; discriminador = regime (MEI|SIMPLES|PRESUMIDO|REAL)`) ??
      jsonOk(ObrigacaoRegimeJson, l.valorJson, 'valorJson = { statusBase, condicoes[], perguntaBase?, inativa }'),
  },
  {
    table: 'LEIAUTE_SPED',
    ...BR,
    value: 'text',
    check: (l) =>
      so(
        semDisc(l) && ((l.chave === 'ECD' && /^\d+\.\d{2}$/.test(l.valorTexto ?? '')) || (l.chave === 'ECF' && /^\d{4}$/.test(l.valorTexto ?? ''))),
        'chave ECD (valorTexto 9.99) ou ECF (valorTexto de 4 dígitos)',
      ),
  },
  {
    table: 'DEPRECIACAO_ANEXO_III',
    ...BR,
    value: 'json',
    check: (l) =>
      so(
        (/^\d+$/.test(l.chave) || l.chave === 'NOTA') && (DEPRECIACAO_ANEXO_III_FONTES as readonly string[]).includes(l.discriminador ?? ''),
        'chave = linha da fonte (sourceRow) ou NOTA; discriminador ANEXO_III_IN_1700_2017|ANEXO_III_NOTA_1|ANEXO_III_NOTA_2',
      ) ??
      jsonOk(DepreciacaoAnexoJson, l.valorJson, 'valorJson = { annualRateBp: 1..10000, ncm: string|null, description, lifeYears ≥ 1, justification? }'),
  },
  { table: 'SALARIO_MINIMO', ...BR, value: 'int', check: () => null },
  // BE-INCR-IRRF-DISTRIBUICAO item 5: alíquotas em bp, limite mensal em centavos (Lei 9.250 art. 6º-A; Lei 9.249 art. 9º
  // § 2º) e o prazo de aprovação do lucro da transição (date-only, art. 6º-A § 3º II; liminar das ADIs 7.912/7.914).
  // EFICIENCIA-FISCAL PR-3 (itens 15–17): alíquotas em bp e o teto do RGPS em centavos, sem discriminador.
  {
    table: 'ENCARGO_FOLHA',
    ...BR,
    value: 'int',
    check: (l) =>
      so(semDisc(l), 'sem discriminador') ??
      (l.chave === 'TETO_RGPS_CENTS'
        ? so((l.valorInt ?? 0) > 0, 'TETO_RGPS_CENTS: valorInt = centavos > 0')
        : so(ENCARGO_FOLHA_CHAVES_BP.includes(l.chave) && bp(l), 'chave CI_SEGURADO_BP|PATRONAL_BP|FGTS_BP|FGTS_APRENDIZ_BP (valorInt em bp 0..10000) ou TETO_RGPS_CENTS')),
  },
  {
    table: 'IRRF_DISTRIBUICAO',
    ...BR,
    value: (l) => (l.chave === 'TRANSICAO_APROVACAO_ATE' ? 'text' : 'int'),
    check: (l) =>
      so(semDisc(l), 'sem discriminador') ??
      (l.chave === 'TRANSICAO_APROVACAO_ATE'
        ? so(isValidDateOnly(l.valorTexto ?? ''), 'TRANSICAO_APROVACAO_ATE: valorTexto = data YYYY-MM-DD de calendário')
        : l.chave === 'LIMITE_MENSAL_PF_CENTS'
          ? so((l.valorInt ?? 0) > 0, 'LIMITE_MENSAL_PF_CENTS: valorInt = centavos > 0')
          : so(IRRF_DISTRIBUICAO_CHAVES_INT.includes(l.chave) && bp(l), 'chave ALIQUOTA_PF_BP|ALIQUOTA_JCP_BP (valorInt em bp 0..10000), LIMITE_MENSAL_PF_CENTS ou TRANSICAO_APROVACAO_ATE')),
  },
  // F-IRD-13/F-IRD-18: chave = trimestre YYYY-T0n; valorInt = taxa MENSAL publicada pela RFB em décimos de milésimo de ponto
  // percentual (0,7742% = 7742).
  {
    table: 'TJLP',
    ...BR,
    value: 'int',
    check: (l) => so(/^\d{4}-T0[1-4]$/.test(l.chave) && semDisc(l) && (l.valorInt ?? 0) > 0, 'chave = trimestre YYYY-T01..T04; valorInt = taxa mensal (0,7742% = 7742) > 0'),
  },
  // Onda 3.2 fatia 4 (dono, 24/11/2026): chave = nome do marco (o que `models/marcoLegal.ts` lê), sem discriminador;
  // valorTexto = a data do marco (YYYY-MM-DD, calendário válido).
  {
    table: 'MARCO_LEGAL',
    ...BR,
    value: 'text',
    check: (l) =>
      so((MARCOS_LEGAIS as readonly string[]).includes(l.chave) && semDisc(l), `chave = um marco conhecido (${MARCOS_LEGAIS.join('|')}); sem discriminador`) ??
      so(isValidDateOnly(l.valorTexto ?? ''), 'valorTexto = data YYYY-MM-DD válida (o 1º dia em que a regra vale)'),
  },
];

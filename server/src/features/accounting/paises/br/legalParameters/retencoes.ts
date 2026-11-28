import type { LegalParameterFormatRegistration, LinhaParaFormato } from '../../../../legalParameters/models/formatRegistry';
import { bp, jsonOk, semDisc, so } from '../../../../legalParameters/models/formatHelpers';
import { CHAVE_CODIGO_INSS, CHAVES_IRRF_PF_INT, CHAVES_IRRF_PF_JSON, CodigoRetencaoJson, DISCRIMINADORES_CODIGO, DISCRIMINADORES_INSS, DISCRIMINADORES_MINIMO, FaixaIrrfPfJson, NaturezaRendimentoJson, NATUREZAS_IRRF_ALIQUOTA, ReducaoArt3AJson, TRIBUTOS_CSRF } from '../../../models/retencaoParams';

/**
 * BE-INCR-PAIS-NA-BORDA-F3 item 3 — formatos das tabelas de retenções na fonte e EFD-Reinf. Cada regra é a do `formatoLinha.ts`, movida
 * sem mudança: mesmo predicado e mesma mensagem.
 */
const BR = { domain: 'accounting', country: 'br' } as const;

const faixa = (l: LinhaParaFormato) => /^F[1-6]$/.test(l.discriminador ?? '');

export const RETENCOES_FORMATS: readonly LegalParameterFormatRegistration[] = [
  // RETENCOES-FONTE PR-1 (item 1): alíquotas em bp por tributo/natureza e mínimos em centavos (Lei 10.833 arts. 30–31;
  // LC 214 art. 509; RIR/2018 arts. 714, 716, 718 e 785; Lei 8.212 art. 31; Lei 9.430 art. 68).
  {
    table: 'RETENCAO',
    ...BR,
    value: 'int',
    check: (l) => {
      const d = l.discriminador ?? '';
      if (l.chave === 'MINIMO') return so((DISCRIMINADORES_MINIMO as readonly string[]).includes(d) && (l.valorInt ?? 0) > 0, `MINIMO: discriminador ${DISCRIMINADORES_MINIMO.join('|')}; valorInt = centavos > 0`);
      const ok =
        (l.chave === 'CSRF' && (TRIBUTOS_CSRF as readonly string[]).includes(d)) ||
        (l.chave === 'IRRF' && (NATUREZAS_IRRF_ALIQUOTA as readonly string[]).includes(d)) ||
        (l.chave === 'INSS' && (DISCRIMINADORES_INSS as readonly string[]).includes(d));
      return so(ok && bp(l), `chave CSRF (${TRIBUTOS_CSRF.join('|')}), IRRF (${NATUREZAS_IRRF_ALIQUOTA.join('|')}), INSS (${DISCRIMINADORES_INSS.join('|')}) ou MINIMO; valorInt em bp (0..10000)`);
    },
  },
  // Item 2 (Emenda 22/10 item 1): chave = natRend de 5 dígitos (o INSS retido, sem natRend, usa CESSAO_MAO_DE_OBRA);
  // discriminador = tributo das tabelas "R-4020"/"R-4010"; valorTexto = código de receita; valorJson = periodicidade.
  {
    table: 'RETENCAO_CODIGO',
    ...BR,
    value: 'text',
    check: (l) =>
      so((DISCRIMINADORES_CODIGO as readonly string[]).includes(l.discriminador ?? ''), `discriminador ${DISCRIMINADORES_CODIGO.join('|')}`) ??
      so(l.discriminador === 'INSS' ? l.chave === CHAVE_CODIGO_INSS : /^\d{5}$/.test(l.chave), `chave = natRend de 5 dígitos (INSS: ${CHAVE_CODIGO_INSS})`) ??
      so(/^\d{6}$/.test(l.valorTexto ?? ''), 'valorTexto = código de receita de 6 dígitos (código + variação)') ??
      jsonOk(CodigoRetencaoJson, l.valorJson, 'valorJson = { periodicidade: MENSAL|DECENDIAL|QUINZENAL|DIARIO }'),
  },
  // Item 7 (F-REINF-5 a; Emenda 22/10 item 1): Tabela 01 da EFD-Reinf.
  {
    table: 'NATUREZA_RENDIMENTO',
    ...BR,
    value: 'json',
    check: (l) =>
      so(/^\d{5}$/.test(l.chave) && semDisc(l), 'chave = natRend de 5 dígitos, sem discriminador') ??
      jsonOk(NaturezaRendimentoJson, l.valorJson, 'valorJson = { descricao, grupo, declarante: PF|PJ|PF/PJ, tributos: [IR|CSLL|COFINS|PP|AGREGADO], tiposIsencao: [] }'),
  },
  // Item 3 (F-RET-17 a): faixas da Lei 11.482 art. 1º XII, redução da Lei 9.250 art. 3º-A, dependente (art. 4º III "i") e
  // desconto simplificado (art. 4º § 2º, bp sobre o teto da faixa zero).
  {
    table: 'IRRF_PF_MENSAL',
    ...BR,
    value: (l) => ((CHAVES_IRRF_PF_INT as readonly string[]).includes(l.chave) ? 'int' : 'json'),
    check: (l) =>
      so(semDisc(l), 'sem discriminador') ??
      (CHAVES_IRRF_PF_JSON.test(l.chave)
        ? jsonOk(FaixaIrrfPfJson, l.valorJson, 'FAIXA_n: valorJson = { ateCents: inteiro > 0 | null, aliquotaBp: 0..10000, deduzirCents ≥ 0 }')
        : l.chave === 'REDUCAO_ART3A'
          ? jsonOk(ReducaoArt3AJson, l.valorJson, 'REDUCAO_ART3A: valorJson = { limiteZeroCents, tetoCents, constanteCents, coeficienteMilionesimos }')
          : l.chave === 'DEPENDENTE'
            ? so((l.valorInt ?? 0) > 0, 'DEPENDENTE: valorInt = centavos > 0')
            : so(l.chave === 'DESCONTO_SIMPLIFICADO_BP' && bp(l), 'chave FAIXA_1..9, REDUCAO_ART3A, DEPENDENTE ou DESCONTO_SIMPLIFICADO_BP (valorInt em bp)')),
  },
];

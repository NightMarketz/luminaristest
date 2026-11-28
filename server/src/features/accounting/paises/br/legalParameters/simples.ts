import type { LegalParameterFormatRegistration, LinhaParaFormato } from '../../../../legalParameters/models/formatRegistry';
import { bp, jsonOk, semDisc, so } from '../../../../legalParameters/models/formatHelpers';
import { MeiAnexoXiJson } from '../../../models/meiAnexoXi';
import { EnquadramentoJsonSchema, FaixaJsonSchema, ReparticaoJsonSchema, TetoIssJsonSchema } from '../../../models/simplesCalc';

/**
 * BE-INCR-PAIS-NA-BORDA-F3 item 3 — formatos das tabelas de Simples Nacional e MEI. Cada regra é a do `formatoLinha.ts`, movida
 * sem mudança: mesmo predicado e mesma mensagem.
 */
const BR = { domain: 'accounting', country: 'br' } as const;

/** D-2026-10-24-LEGAL-PARAMS-SIMPLES-FORMATO — chave = anexo; faixa F1..F6 nas tabelas por faixa (o que `simplesCalc` lê). */
const anexo = (l: LinhaParaFormato) => ['I', 'II', 'III', 'IV', 'V'].includes(l.chave);
const faixa = (l: LinhaParaFormato) => /^F[1-6]$/.test(l.discriminador ?? '');

export const SIMPLES_FORMATS: readonly LegalParameterFormatRegistration[] = [
  // D-2026-10-24-LEGAL-PARAMS-SIMPLES-FORMATO (dono 24/10): o valorJson é o que `simplesCalc` parseia; a semente é do X14 #573.
  {
    table: 'SIMPLES_ANEXO_FAIXA',
    ...BR,
    value: 'json',
    check: (l) =>
      so(anexo(l) && faixa(l), 'chave = anexo I..V; discriminador F1..F6') ??
      jsonOk(FaixaJsonSchema, l.valorJson, 'valorJson = { receitaAteCents, aliquotaNominalBp, parcelaDeduzirCents }'),
  },
  {
    table: 'SIMPLES_ANEXO_REPARTICAO',
    ...BR,
    value: 'json',
    check: (l) =>
      so(anexo(l) && faixa(l), 'chave = anexo I..V; discriminador F1..F6') ??
      jsonOk(ReparticaoJsonSchema, l.valorJson, 'valorJson = { <tributo do Simples>: bp 0..10000 }, ao menos um'),
  },
  {
    table: 'SIMPLES_TETO_ISS',
    ...BR,
    value: 'json',
    check: (l) =>
      so(anexo(l) && semDisc(l), 'chave = anexo I..V, sem discriminador') ??
      jsonOk(TetoIssJsonSchema, l.valorJson, 'valorJson = { percentualBp, limiarAliquotaEfetiva: "decimal", transfereAIbs, transferencia: { <tributo>: bp } }'),
  },
  {
    table: 'SIMPLES_ENQUADRAMENTO',
    ...BR,
    value: 'json',
    check: (l) =>
      so((['REVENDA', 'LOCACAO_MOVEL', 'PARCERIA_GESTAO'].includes(l.chave) || /^SERVICO:\d{6}$/.test(l.chave)) && semDisc(l), 'chave REVENDA|LOCACAO_MOVEL|PARCERIA_GESTAO|SERVICO:<cTribNac de 6 dígitos>, sem discriminador') ??
      jsonOk(EnquadramentoJsonSchema, l.valorJson, 'valorJson = { anexo: I..V, fatorR, semIss }'),
  },
  // Fallback do PR-1 (F3 item 4): valorInt em centavos, sem regra de chave.
  { table: 'SIMPLES_LIMITE', ...BR, value: 'int', check: () => null },
  { table: 'SIMEI_VALOR', ...BR, value: 'int', check: () => null },
  {
    table: 'MEI_ANEXO_XI',
    ...BR,
    value: 'json',
    check: (l) =>
      so(/^[AB]-\d{4}$/.test(l.chave) && l.discriminador === l.chave.slice(0, 1), 'chave = tabela + ordinal da fonte (A-0001…); discriminador = A|B da chave') ??
      jsonOk(MeiAnexoXiJson, l.valorJson, 'valorJson = { ocupacao, cnae 0000-0/00, descricaoCnae, iss, icms }'),
  },
];

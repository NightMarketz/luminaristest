import type { LegalParameterFormatRegistration, LinhaParaFormato } from '../../../../legalParameters/models/formatRegistry';
import { jsonOk, semDisc, so } from '../../../../legalParameters/models/formatHelpers';
import { IcmsStNcmJsonSchema } from '../../../models/segregacaoNcm';

/**
 * BE-INCR-PAIS-NA-BORDA-F3 item 3 — formatos das tabelas de documentos fiscais (NF-e, NFC-e, CFOP) e ICMS-ST. Cada regra é a do `formatoLinha.ts`, movida
 * sem mudança: mesmo predicado e mesma mensagem.
 */
const BR = { domain: 'accounting', country: 'br' } as const;

/** D-2026-10-24-LEGAL-PARAMS-SIMPLES-FORMATO — chave = anexo; faixa F1..F6 nas tabelas por faixa (o que `simplesCalc` lê). */
const anexo = (l: LinhaParaFormato) => ['I', 'II', 'III', 'IV', 'V'].includes(l.chave);

export const DOCUMENTOS_FISCAIS_FORMATS: readonly LegalParameterFormatRegistration[] = [
  {
    table: 'CFOP_IMOBILIZADO',
    ...BR,
    value: 'text',
    check: (l) => so(/^\d{4}$/.test(l.chave) && semDisc(l) && l.valorTexto === 'ENTRADA_IMOBILIZADO', 'chave = CFOP de 4 dígitos; valorTexto ENTRADA_IMOBILIZADO'),
  },
  {
    table: 'NFE_CSTAT_AUTORIZADA',
    ...BR,
    value: 'text',
    check: (l) => so(/^\d{3}$/.test(l.chave) && semDisc(l) && l.valorTexto === 'AUTORIZADA', 'chave = cStat de 3 dígitos; valorTexto AUTORIZADA'),
  },
  // BE-INCR-NFCE PR-3 (item 17): chave = limite em centavos; discriminador = IBGE da UF (2 dígitos) ou nenhum (nacional).
  {
    table: 'NFCE_LIMITE',
    ...BR,
    value: 'int',
    check: (l) =>
      so(
        ['DEST_IDENTIFICADO_CENTS', 'VEDADA_CENTS'].includes(l.chave) && (l.discriminador == null || /^\d{2}$/.test(l.discriminador)) && (l.valorInt ?? 0) > 0,
        'chave DEST_IDENTIFICADO_CENTS|VEDADA_CENTS; discriminador = IBGE da UF (2 dígitos) ou nenhum; valorInt em centavos > 0',
      ),
  },
  // BE-INCR-NFCE PR-4 (EMENDA-3 E3-2 a): chave = tipo (NFE | NFCE); discriminador = IBGE da UF; valorTexto = o aviso.
  {
    table: 'INUT_NAO_SE_APLICA',
    ...BR,
    value: 'text',
    check: (l) =>
      so(
        ['NFE', 'NFCE'].includes(l.chave) && /^\d{2}$/.test(l.discriminador ?? '') && (l.valorTexto ?? '').trim().length > 0,
        'chave NFE|NFCE; discriminador = IBGE da UF (2 dígitos); valorTexto = o aviso',
      ),
  },
  // BE-INCR-EFICIENCIA-FISCAL PR-2 (item 11): chave = prefixo de 4 a 8 dígitos do NCM; discriminador = IBGE da UF;
  // valorJson = itens e CEST do anexo do Conv. ICMS 142/2018.
  {
    table: 'ICMS_ST_NCM_UF',
    ...BR,
    value: 'json',
    check: (l) =>
      so(/^\d{4,8}$/.test(l.chave) && /^\d{2}$/.test(l.discriminador ?? ''), 'chave = prefixo de 4 a 8 dígitos do NCM; discriminador = IBGE da UF (2 dígitos)') ??
      jsonOk(IcmsStNcmJsonSchema, l.valorJson, 'valorJson = { anexo, itens: ["N.N"], cest: ["NN.NNN.NN"] }'),
  },
];

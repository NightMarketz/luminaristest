import type { LegalParameterFormatRegistration } from '../../../../legalParameters/models/formatRegistry';
import { TRIBUTOS_FORMATS } from './tributos';
import { SIMPLES_FORMATS } from './simples';
import { IBS_CBS_ISS_FORMATS } from './ibsCbsIss';
import { RETENCOES_FORMATS } from './retencoes';
import { DOCUMENTOS_FISCAIS_FORMATS } from './documentosFiscais';
import { CALENDARIO_FORMATS } from './calendario';

/**
 * BE-INCR-PAIS-NA-BORDA-F3 itens 3 e 6 — os formatos das tabelas de `LegalParameter` que a contabilidade brasileira
 * declara (BRIEF §5; F-F3-2 a: as cinco que dois domínios leem ficam aqui). Só o `lib/factory.ts` e os testes importam
 * este arquivo (X1, P1).
 */
export const ACCOUNTING_BR_LEGAL_PARAMETER_FORMATS: readonly LegalParameterFormatRegistration[] = [
  ...TRIBUTOS_FORMATS,
  ...SIMPLES_FORMATS,
  ...IBS_CBS_ISS_FORMATS,
  ...RETENCOES_FORMATS,
  ...DOCUMENTOS_FISCAIS_FORMATS,
  ...CALENDARIO_FORMATS,
];

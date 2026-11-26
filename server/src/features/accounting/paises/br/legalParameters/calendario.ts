import type { LegalParameterFormatRegistration } from '../../../../legalParameters/models/formatRegistry';
import { semDisc, so } from '../../../../legalParameters/models/formatHelpers';
import { isValidDateOnly } from '../../../models/dates';

/**
 * BE-INCR-PAIS-NA-BORDA-F3 item 3 — formatos das tabelas de feriados. Cada regra é a do `formatoLinha.ts`, movida
 * sem mudança: mesmo predicado e mesma mensagem.
 */
const BR = { domain: 'accounting', country: 'br' } as const;

export const CALENDARIO_FORMATS: readonly LegalParameterFormatRegistration[] = [
  {
    table: 'FERIADO_NACIONAL',
    ...BR,
    value: 'text',
    check: (l) => so(/^\d{2}-\d{2}$/.test(l.chave) && isValidDateOnly(`2024-${l.chave}`) && semDisc(l) && l.valorTexto === 'FIXO', 'chave = MM-DD de calendário; valorTexto FIXO'),
  },
  // F-E4-1 (a): discriminador = código IBGE da UF (2 dígitos) ou do município (7); data fixa MM-DD ou móvel PASCOA±N.
  {
    table: 'FERIADO_LOCAL',
    ...BR,
    value: 'text',
    check: (l) => so(
      /^(\d{2}|\d{7})$/.test(l.discriminador ?? '') &&
        ((l.valorTexto === 'FIXO' && /^\d{2}-\d{2}$/.test(l.chave) && isValidDateOnly(`2024-${l.chave}`)) ||
          (l.valorTexto === 'PASCOA' && /^PASCOA[+-]\d{1,3}$/.test(l.chave))),
      'discriminador = IBGE da UF (2) ou do município (7); chave MM-DD com valorTexto FIXO, ou PASCOA±N com valorTexto PASCOA',
    ),
  },
];

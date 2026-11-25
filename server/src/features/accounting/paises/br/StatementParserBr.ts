import { parseCnab } from '../../../../lib/cnab';
import { parseOfx } from '../../../../lib/ofx';
import type { StatementParser } from '../../ports/LedgerPorts';

/**
 * Formatos de extrato bancário do Brasil (OFX dos bancos, CNAB 240/400 da FEBRABAN) normalizados para a tabela comum do
 * import. Onda 1.2: saíram do `ReconciliationService` (núcleo do razão) — o núcleo só conhece a porta `StatementParser`;
 * CSV/XLSX (genéricos) continuam no núcleo pelo `lib/spreadsheet`.
 */
export const statementParserBr: StatementParser = {
  parse: (format, buffer) => (format === 'ofx' ? parseOfx(buffer) : parseCnab(buffer)),
};

import { z } from 'zod';

/**
 * Trava de remoção de uma tabela de preset (BE-INCR-WIZARD-REMOVABILITY, nó W2): o motivo e, quando há, as origens.
 *
 * Mora em `models/` (folha: só Zod) para que o model de outra feature o importe por
 * `dynamicTables/public/presets.types.ts` (ADR-MODULE-BOUNDARIES §11.6; dono, questionário, 24/11/2026: "Extrair para
 * models/"). A regra que calcula a trava segue em `domain/presets/removability.ts`, que reexporta estes nomes.
 */

export const TABLE_LOCK_REASONS = [
  'FIXED_MODULE',
  'ACCOUNTING',
  'REQUIRED_RELATION',
  'REQUIRED_TABLE',
  'REQUIRED_CAPABILITY',
] as const;

export const tableLockSchema = z
  .object({
    reason: z.enum(TABLE_LOCK_REASONS),
    /** Origens (REQUIRED_*) ou a chave do módulo (FIXED_MODULE). */
    by: z.array(z.string().min(1)).optional(),
  })
  .strict();
export type TableLock = z.infer<typeof tableLockSchema>;

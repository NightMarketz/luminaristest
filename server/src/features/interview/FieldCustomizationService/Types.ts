import type { z } from 'zod';
import type { AdvancedFieldSchema } from '../../dynamicTables/dtos/DynamicTable.dto';

/**
 * Contratos do W6 (BRIEF WIZARD-W6 §2.2–§2.4). A entrada é o `CustomizeFieldsDto`; a saída do modelo é o
 * `ModelOutputSchema` de `ModelOutput.ts`; a resposta da rota, `CustomizeFieldsResult`, mora no `index.ts` (ela
 * carrega a tabela da sessão, e o tipo da sessão importa este arquivo — sem ciclo).
 */

/** Campo canônico já validado pelo `AdvancedFieldSchema` (item 8) — a forma que o `/dashboard/create` revalida. */
export type AdvancedField = z.output<typeof AdvancedFieldSchema>;

/**
 * Categorias do LGPD art. 5º, II (F-W6-6; dossiê `pesquisas-legais/w6-campos-ia-dado-saude` [D01]) que o modelo pode
 * marcar. O enum do §2.3 é este; `health_or_other_unspecified` só nasce da rede de radicais (item 9).
 */
export const MODEL_SENSITIVE_CATEGORIES = [
  'health',
  'sex_life',
  'genetic',
  'biometric',
  'racial_ethnic',
  'religious',
  'political',
  'union_or_org',
] as const;
export const UNSPECIFIED_SENSITIVE_CATEGORY = 'health_or_other_unspecified' as const;
export type SensitiveCategory =
  | (typeof MODEL_SENSITIVE_CATEGORIES)[number]
  | typeof UNSPECIFIED_SENSITIVE_CATEGORY;

/** Tipos que a IA pode propor (F-W6-4 a): `relation` e `json` ficam fora. */
export const AI_FIELD_TYPES = ['string', 'number', 'boolean', 'date', 'datetime', 'textarea', 'select'] as const;

export type FieldChange =
  | { action: 'add'; field: AdvancedField; sensitiveCategory: SensitiveCategory | null; presetKey: string | null }
  | { action: 'update'; originalName: string; field: AdvancedField; sensitiveCategory: SensitiveCategory | null }
  | { action: 'remove'; originalName: string };

export type DiscardReason = 'reserved' | 'type_not_allowed' | 'exists' | 'not_found' | 'invalid';
export interface DiscardedChange {
  name: string;
  reason: DiscardReason;
}

/** Proposta pendente guardada na tabela da sessão (§2.4) — uma por tabela, a nova substitui a anterior. */
export interface IPendingProposal {
  id: string;
  changes: FieldChange[];
  createdAt: string;
  /** Revisão do #786: a sessão guarda a decisão do servidor; o front lê, não recalcula. Ausente em sessão anterior. */
  requiresSensitiveAck?: boolean;
}

export interface IFieldProposal {
  id: string;
  changes: FieldChange[];
  requiresSensitiveAck: boolean;
}

export type FieldHistoryRole = 'user' | 'assistant' | 'system';
export interface IFieldHistoryEntry {
  role: FieldHistoryRole;
  content: string;
  at: string;
}

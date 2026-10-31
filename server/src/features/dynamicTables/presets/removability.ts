import { z } from 'zod';
import { ValidationError } from '../../../lib/errors';
import type { PresetTableDefinition } from '.';
import { MODULE_REGISTRY, moduleOfTable } from './modules/registry';

/**
 * BE-INCR-WIZARD-REMOVABILITY (nó W2, `docs/accounting/BE-INCR-WIZARD-REMOVABILITY-brief.md`) — regra pura de trava
 * de remoção, numa fonte só para a sessão da Entrevista com IA (`TableExtractor`/`StateManager`) e para o create custom
 * (`handleCustomCreation`). Só metadado de preset: não instala nada nem conhece serviço Prisma (Contrato §2.1).
 *
 * Forks ratificados 2026-10-15 (D-2026-10-15-W2-FORKS): F-W2-1 → trava DINÂMICA (recalculada sobre o conjunto mantido);
 * F-W2-2 → tabelas lidas pela contabilidade travam (`meta.lockedBy: 'accounting'`, declarado nas suítes); F-W2-3 → o
 * create aplica a mesma regra (400 `TABLE_LOCKED`).
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

const PRESET_REF = '@@PRESET_TABLE_KEY::';

/**
 * Item 1. Para cada tabela mantida, a trava que a impede de sair (ou `null`), nesta precedência:
 * ACCOUNTING → FIXED_MODULE → REQUIRED_RELATION → REQUIRED_TABLE → REQUIRED_CAPABILITY. Item 2: só as tabelas AINDA
 * mantidas (`keptKeys`) contam como origem, então a trava se desfaz quando o dependente sai.
 *
 * BE-INCR-MODULOS-BASE-SUBMODULOS PR-2: `customers`/`sales`/`saleItems` viraram tabelas das bases fixas PES-0/VEN-0.
 * A trava contábil vem antes da de módulo fixo para que elas sigam travadas por ACCOUNTING (fotografia do PR-0 e o
 * estado final do item 28); nas tabelas do CRM nada muda (nenhuma tem trava contábil).
 */
export function computeTableLocks(
  tables: Readonly<Record<string, PresetTableDefinition>>,
  keptKeys: ReadonlySet<string>,
): Record<string, TableLock | null> {
  const kept = Object.keys(tables).filter((k) => keptKeys.has(k));
  const locks: Record<string, TableLock | null> = {};
  for (const key of kept) locks[key] = lockOf(key, tables, kept);
  return locks;
}

function lockOf(
  key: string,
  tables: Readonly<Record<string, PresetTableDefinition>>,
  kept: readonly string[],
): TableLock | null {
  if (tables[key].meta?.lockedBy === 'accounting') return { reason: 'ACCOUNTING' };
  const moduleKey = moduleOfTable(key);
  if (moduleKey && MODULE_REGISTRY[moduleKey].fixed) return { reason: 'FIXED_MODULE', by: [moduleKey] };

  const others = kept.filter((k) => k !== key);
  const byRelation = others.filter((k) =>
    tables[k].schema.fields.some(
      (f) => f.type === 'relation' && f.required && f.relation?.targetTable === `${PRESET_REF}${key}`,
    ),
  );
  if (byRelation.length > 0) return { reason: 'REQUIRED_RELATION', by: byRelation };

  const byTable = others.filter((k) => (tables[k].meta?.requiresTables ?? []).includes(key));
  if (byTable.length > 0) return { reason: 'REQUIRED_TABLE', by: byTable };

  const provided = tables[key].meta?.providesCapabilities ?? [];
  const byCapability = others.filter((k) =>
    (tables[k].meta?.requiresCapabilities ?? []).some(
      (cap) => provided.includes(cap) && !others.some((o) => (tables[o].meta?.providesCapabilities ?? []).includes(cap)),
    ),
  );
  if (byCapability.length > 0) return { reason: 'REQUIRED_CAPABILITY', by: byCapability };

  return null;
}

const LOCK_MESSAGE: Record<TableLock['reason'], (table: string, by: string) => string> = {
  FIXED_MODULE: (t, by) => `A tabela '${t}' faz parte do módulo fixo '${by}' e não pode ser removida.`,
  ACCOUNTING: (t) => `A tabela '${t}' é usada pela contabilidade do setor e não pode ser removida.`,
  REQUIRED_RELATION: (t, by) => `A tabela '${t}' não pode ser removida: ${by} depende(m) dela.`,
  REQUIRED_TABLE: (t, by) => `A tabela '${t}' não pode ser removida: ${by} exige(m) a presença dela.`,
  REQUIRED_CAPABILITY: (t, by) => `A tabela '${t}' não pode ser removida: ${by} precisa(m) do que ela fornece.`,
};

/** Mensagem em pt de uma trava (usada no 400 do create e na recusa da conversa). */
export function describeTableLock(table: string, lock: TableLock): string {
  return LOCK_MESSAGE[lock.reason](table, (lock.by ?? []).join(', '));
}

/**
 * Item 7 (F-W2-3). Lança `ValidationError { reason:'TABLE_LOCKED', table, lock }` na primeira tabela removida que
 * continua travada contra o conjunto FINAL mantido (remover dependente e alvo juntos passa). Tabelas de módulo FIXO
 * sem trava contábil ficam de fora: quem decide é o `applyModuleRemovals` (I8 / F-SUB-6, módulo inteiro ou nada).
 * Chave fora de `tables` (ex.: tabela do Core, que o create ignora — item 8) também fica de fora.
 *
 * BE-INCR-MODULOS-BASE-SUBMODULOS PR-2: as tabelas de PESSOAS/VENDAS viraram tabelas de módulo, mas suas travas de
 * tabela (contábil em `customers`/`sales`/`saleItems`/`packages`; relação obrigatória de `productUnits` em `products`,
 * de `appointments` em `services`) continuam valendo como antes — por isso só a tabela de módulo fixo sem trava
 * contábil fica de fora, e o create chama esta regra ANTES de `applyModuleRemovals`.
 */
export function assertRemovalsAllowed(
  tables: Readonly<Record<string, PresetTableDefinition>>,
  removedTables: readonly string[],
): void {
  const removed = new Set(removedTables);
  const candidates = removedTables.filter((k) => {
    if (!tables[k]) return false;
    const moduleKey = moduleOfTable(k);
    return !moduleKey || !MODULE_REGISTRY[moduleKey].fixed || tables[k].meta?.lockedBy === 'accounting';
  });
  for (const key of candidates) {
    const keptPlusThis = new Set(Object.keys(tables).filter((k) => !removed.has(k) || k === key));
    const lock = computeTableLocks(tables, keptPlusThis)[key];
    if (lock) {
      throw new ValidationError(describeTableLock(key, lock), { reason: 'TABLE_LOCKED', table: key, lock });
    }
  }
}

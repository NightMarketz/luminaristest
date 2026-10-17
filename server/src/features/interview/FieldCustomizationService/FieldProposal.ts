import { AdvancedFieldSchema } from '../../dynamicTables/dtos/DynamicTable.dto';
import type { ISchemaField } from '../../dynamicTables/models/DynamicTable.model';
import type { ModelChange } from './ModelOutput';
import type { FieldPresetMatcher } from './FieldPresetMatcher';
import {
  AI_FIELD_TYPES,
  UNSPECIFIED_SENSITIVE_CATEGORY,
  type AdvancedField,
  type DiscardedChange,
  type FieldChange,
  type SensitiveCategory,
} from './Types';

/**
 * Item 9 (F-W6-6 a): rede determinística sobre o nome e o rótulo do campo. Heurística de produto (BRIEF §5), não regra
 * legal — a lei define as categorias (LGPD art. 5º, II), não as palavras. Só ACRESCENTA marca, nunca tira.
 */
const SENSITIVE_RADICALS = [
  'saude',
  'alerg',
  'diagnost',
  'medica',
  'gestant',
  'biometr',
  'religi',
  'etnia',
  'raca',
  'sexual',
  'sindic',
  'genetic',
] as const;

const fold = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

export function matchesSensitiveRadical(...texts: string[]): boolean {
  const haystack = texts.map(fold).join(' ');
  return SENSITIVE_RADICALS.some((r) => haystack.includes(r));
}

function sensitiveCategoryOf(change: ModelChange): SensitiveCategory | null {
  if (change.sensitiveCategory) return change.sensitiveCategory;
  return matchesSensitiveRadical(change.name, change.label) ? UNSPECIFIED_SENSITIVE_CATEGORY : null;
}

type FieldCheck = { ok: true; field: AdvancedField } | { ok: false; reason: DiscardedChange['reason'] };

/**
 * Item 8: o candidato passa pelo `AdvancedFieldSchema` canônico. Tipos fora da lista da IA (F-W6-4 a) são
 * descartados antes; o resto do schema decide o nome reservado e o `select` sem opção.
 */
function checkField(change: ModelChange): FieldCheck {
  if (!(AI_FIELD_TYPES as readonly string[]).includes(change.type)) return { ok: false, reason: 'type_not_allowed' };
  const candidate = {
    name: change.name,
    label: change.label,
    type: change.type,
    required: change.required,
    ...(change.description ? { description: change.description } : {}),
    ...(change.type === 'select' ? { options: change.options } : {}),
  };
  const parsed = AdvancedFieldSchema.safeParse(candidate);
  if (parsed.success) return { ok: true, field: parsed.data };
  const reserved = parsed.error.issues.some((i) => i.path[0] === 'name' && /reservado/i.test(i.message));
  return { ok: false, reason: reserved ? 'reserved' : 'invalid' };
}

/**
 * Converte a saída do modelo em mudanças propostas, na ordem em que o `FieldUpdater` as aplicará. `add` de nome que
 * já existe e `update`/`remove` de nome inexistente são descartados com motivo, não corrigidos (ADR-W6 §2.2, 2).
 */
export function buildFieldChanges(
  modelChanges: ModelChange[],
  existingFields: ISchemaField[],
  matcher: FieldPresetMatcher,
): { changes: FieldChange[]; discarded: DiscardedChange[] } {
  const names = new Set(existingFields.map((f) => f.name));
  const presetKeys = new Set(matcher.presetKeys());
  const changes: FieldChange[] = [];
  const discarded: DiscardedChange[] = [];

  for (const c of modelChanges) {
    if (c.action === 'remove') {
      const originalName = c.originalName ?? c.name;
      if (!names.has(originalName)) {
        discarded.push({ name: originalName, reason: 'not_found' });
        continue;
      }
      names.delete(originalName);
      changes.push({ action: 'remove', originalName });
      continue;
    }

    if (c.action === 'update') {
      // §2.3: `originalName` pode voltar null; sem ele, o update é no próprio `name` (sem renomear).
      const originalName = c.originalName ?? c.name;
      if (!names.has(originalName)) {
        discarded.push({ name: originalName, reason: 'not_found' });
        continue;
      }
      const check = checkField(c);
      if (!check.ok) {
        discarded.push({ name: c.name, reason: check.reason });
        continue;
      }
      if (check.field.name !== originalName && names.has(check.field.name)) {
        discarded.push({ name: check.field.name, reason: 'exists' });
        continue;
      }
      names.delete(originalName);
      names.add(check.field.name);
      changes.push({ action: 'update', originalName, field: check.field, sensitiveCategory: sensitiveCategoryOf(c) });
      continue;
    }

    const check = checkField(c);
    if (!check.ok) {
      discarded.push({ name: c.name, reason: check.reason });
      continue;
    }
    if (names.has(check.field.name)) {
      discarded.push({ name: check.field.name, reason: 'exists' });
      continue;
    }
    names.add(check.field.name);
    // Item 6: o casamento semântico vem do schema; o exato por nome/sinônimo continua determinístico.
    const presetKey =
      c.presetKey && presetKeys.has(c.presetKey)
        ? c.presetKey
        : (matcher.findExactFieldMatch(check.field.name)?.key ?? null);
    changes.push({ action: 'add', field: check.field, sensitiveCategory: sensitiveCategoryOf(c), presetKey });
  }

  return { changes, discarded };
}

export function requiresSensitiveAck(changes: FieldChange[]): boolean {
  return changes.some((c) => c.action !== 'remove' && c.sensitiveCategory !== null);
}

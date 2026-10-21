import type { ISchemaField } from '../../dynamicTables/models/DynamicTable.model';
import type { ManualChange } from '../dtos/CustomizeFields.dto';
import { matchesSensitiveRadical, parseCanonicalField } from './FieldProposal';

export type ManualChangeReason = 'reserved' | 'exists' | 'not_found' | 'duplicate' | 'invalid';
export interface ManualChangeIssue {
  index: number;
  name: string;
  reason: ManualChangeReason;
}

export type ManualOutcome =
  | { ok: true; fields: ISchemaField[]; sensitive: boolean }
  | { ok: false; issues: ManualChangeIssue[] };

/**
 * W6 emenda (BRIEF WIZARD-W6-MANUAL-SESSION item 3): aplica o lote do modo manual sobre os campos da sessão, tudo ou
 * nada. `add` passa pelo `AdvancedFieldSchema` canônico (o mesmo do item 8 do W6); nome já na tabela → `exists`,
 * repetido no lote → `duplicate`; `setHidden` só sobre campo existente. `sensitive` = algum campo novo casa a rede
 * de radicais do item 9 (F-MS-3 a: a ciência é a do modo IA).
 */
export function applyManualChanges(current: ISchemaField[], changes: ManualChange[]): ManualOutcome {
  let fields = [...current];
  const original = new Set(current.map((f) => f.name));
  const touched = new Set<string>();
  const issues: ManualChangeIssue[] = [];
  let sensitive = false;

  changes.forEach((change, index) => {
    const name = change.action === 'add' ? change.field.name : change.name;
    if (touched.has(name)) {
      issues.push({ index, name, reason: 'duplicate' });
      return;
    }
    touched.add(name);

    if (change.action === 'setHidden') {
      if (!fields.some((f) => f.name === name)) {
        issues.push({ index, name, reason: 'not_found' });
        return;
      }
      fields = fields.map((f) => (f.name === name ? { ...f, hidden: change.hidden } : f));
      return;
    }

    if (original.has(name)) {
      issues.push({ index, name, reason: 'exists' });
      return;
    }
    const check = parseCanonicalField({ ...change.field });
    if (!check.ok) {
      issues.push({ index, name, reason: check.reason });
      return;
    }
    fields.push(check.field as ISchemaField);
    if (matchesSensitiveRadical(check.field.name, check.field.label)) sensitive = true;
  });

  return issues.length > 0 ? { ok: false, issues } : { ok: true, fields, sensitive };
}

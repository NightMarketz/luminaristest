import type { CustomizeFieldsDtoInput } from '@/types/contracts/interview/CustomizeFields.dto.gen';
import type { ITable, ITableField } from '../../types/RightSidebarTypes';

/**
 * W6 emenda (BRIEF WIZARD-W6-MANUAL-SESSION itens 8, 9 e 11): o "Salvar Alterações" do modo manual vira um lote
 * `kind:'manual'` montado pelo diff entre a tabela que o hook tem e a editada no painel.
 */
type ManualBody = Extract<CustomizeFieldsDtoInput, { kind: 'manual' }>;
export type ManualChangeInput = ManualBody['changes'][number];
type ManualField = Extract<ManualChangeInput, { action: 'add' }>['field'];

/** F-MS-2 (a): o que o formulário oferece; `email` e `phone` viram `format` de um campo texto. Senha saiu. */
export const MANUAL_FORM_TYPES = ['string', 'number', 'boolean', 'date', 'datetime', 'email', 'phone'] as const;
const ENGINE_TYPES: readonly string[] = ['string', 'number', 'boolean', 'date', 'datetime'] satisfies ManualField['type'][];
const FORMATS: readonly string[] = ['email', 'phone'] satisfies NonNullable<ManualField['format']>[];

const isEngineType = (type: string): type is ManualField['type'] => ENGINE_TYPES.includes(type);
const isFormat = (format: string): format is NonNullable<ManualField['format']> => FORMATS.includes(format);

/** O tipo escolhido no formulário vira o par `type`/`format` do motor. */
export function fromFormType(formType: string): Pick<ITableField, 'type' | 'format'> {
  return isFormat(formType) ? { type: 'string', format: formType } : { type: formType };
}

function toManualField(field: ITableField): ManualField | null {
  if (!isEngineType(field.type)) return null;
  const required = field.required ?? false;
  return field.format && isFormat(field.format)
    ? { name: field.name, label: field.label, type: field.type, required, format: field.format }
    : { name: field.name, label: field.label, type: field.type, required };
}

/** Campo novo → `add`; `hidden` mudado em campo que já existia → `setHidden`. */
export function diffManualChanges(before: ITable, after: ITable): ManualChangeInput[] {
  const original = new Map((before.fields ?? []).map((f) => [f.name, f]));
  const changes: ManualChangeInput[] = [];
  for (const field of after.fields ?? []) {
    const prev = original.get(field.name);
    if (!prev) {
      const manual = toManualField(field);
      if (manual) changes.push({ action: 'add', field: manual });
    } else if (Boolean(prev.hidden) !== Boolean(field.hidden)) {
      changes.push({ action: 'setHidden', name: field.name, hidden: Boolean(field.hidden) });
    }
  }
  return changes;
}

/**
 * Espelho da rede de radicais do servidor (`FieldProposal.SENSITIVE_RADICALS`, W6 item 9) — o servidor é quem
 * decide (400 sem a ciência); aqui só se mostra o selo e a caixa antes. O teste `manualChanges.test.ts` compara as
 * duas listas.
 */
export const SENSITIVE_RADICALS = [
  'saude', 'alerg', 'diagnost', 'medica', 'gestant', 'biometr', 'religi', 'etnia', 'raca', 'sexual', 'sindic', 'genetic',
] as const;

const fold = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

export function matchesSensitiveRadical(...texts: string[]): boolean {
  const haystack = texts.map(fold).join(' ');
  return SENSITIVE_RADICALS.some((r) => haystack.includes(r));
}

/** Campos novos do lote que casam a rede (F-MS-3 a: pedem a ciência, como no modo IA). */
export function sensitiveAdds(changes: ManualChangeInput[]): ManualField[] {
  return changes
    .filter((c): c is Extract<ManualChangeInput, { action: 'add' }> => c.action === 'add')
    .map((c): ManualField => c.field)
    .filter((f) => matchesSensitiveRadical(f.name, f.label));
}

/**
 * Diff do ledger de versões (BE-INCR-DT-VERSION-LEDGER itens 12–13). Funções puras: sem banco, sem relógio.
 *
 * - Linha: só campos de topo de `data`; igualdade JSON profunda (ordem de chave não conta). O rótulo vem do
 *   schema do lado `to`, depois do `from`, depois o próprio nome — campo que sumiu do schema aparece com o rótulo
 *   da versão antiga.
 * - Schema: campo a campo pelo `name`.
 */
import type { ITableSchema, ISchemaField } from '../models/DynamicTable.model';
import type { FieldDiff } from '../dtos/DynamicTableVersion.dto';

function stable(value: unknown): string {
  if (value === undefined) return 'undefined';
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stable).join(',')}]`;
  const obj = value as Record<string, unknown>;
  return `{${Object.keys(obj).sort().map(k => `${JSON.stringify(k)}:${stable(obj[k])}`).join(',')}}`;
}

export function deepEqualJson(a: unknown, b: unknown): boolean {
  return stable(a) === stable(b);
}

function fieldsOf(schema: ITableSchema | null | undefined): ISchemaField[] {
  return Array.isArray(schema?.fields) ? schema!.fields : [];
}

/** Ordem: campos do schema `to`, depois os do `from`, depois as chaves restantes em ordem alfabética. */
function orderedKeys(keys: Set<string>, ...schemas: Array<ITableSchema | null | undefined>): string[] {
  const out: string[] = [];
  for (const schema of schemas) {
    for (const f of fieldsOf(schema)) {
      if (keys.has(f.name) && !out.includes(f.name)) out.push(f.name);
    }
  }
  for (const k of [...keys].sort()) if (!out.includes(k)) out.push(k);
  return out;
}

function labelOf(name: string, ...schemas: Array<ITableSchema | null | undefined>): string {
  for (const schema of schemas) {
    const f = fieldsOf(schema).find(x => x.name === name);
    if (f?.label) return f.label;
  }
  return name;
}

export function diffRowData(
  before: Record<string, unknown> | null,
  after: Record<string, unknown>,
  schemas: { from: ITableSchema | null; to: ITableSchema | null },
): FieldDiff[] {
  const prev = before ?? {};
  const keys = new Set([...Object.keys(prev), ...Object.keys(after)]);
  const changes: FieldDiff[] = [];
  for (const field of orderedKeys(keys, schemas.to, schemas.from)) {
    const inBefore = Object.prototype.hasOwnProperty.call(prev, field);
    const inAfter = Object.prototype.hasOwnProperty.call(after, field);
    const label = labelOf(field, schemas.to, schemas.from);
    if (inBefore && !inAfter) changes.push({ field, label, kind: 'removed', before: prev[field], after: null });
    else if (!inBefore && inAfter) changes.push({ field, label, kind: 'added', before: null, after: after[field] });
    else if (!deepEqualJson(prev[field], after[field])) changes.push({ field, label, kind: 'changed', before: prev[field], after: after[field] });
  }
  return changes;
}

export function diffSchemas(before: ITableSchema | null, after: ITableSchema): FieldDiff[] {
  const prev = new Map(fieldsOf(before).map(f => [f.name, f] as const));
  const next = new Map(fieldsOf(after).map(f => [f.name, f] as const));
  const keys = new Set([...prev.keys(), ...next.keys()]);
  const changes: FieldDiff[] = [];
  for (const field of orderedKeys(keys, after, before)) {
    const a = prev.get(field);
    const b = next.get(field);
    const label = labelOf(field, after, before);
    if (a && !b) changes.push({ field, label, kind: 'removed', before: a, after: null });
    else if (!a && b) changes.push({ field, label, kind: 'added', before: null, after: b });
    else if (a && b && !deepEqualJson(a, b)) changes.push({ field, label, kind: 'changed', before: a, after: b });
  }
  return changes;
}

/**
 * BE-INCR-DT-VERSION-LEDGER itens 12–13: diff puro de linha e de schema.
 */
import { diffRowData, diffSchemas, deepEqualJson } from '../versionDiff';
import type { ITableSchema } from '../../models/DynamicTable.model';

const OLD: ITableSchema = {
  fields: [
    { name: 'title', label: 'Título', type: 'string' },
    { name: 'legacy', label: 'Campo antigo', type: 'string' },
    { name: 'clientRef', label: 'Cliente', type: 'relation', relation: { targetTable: 't1' } },
    { name: 'price', label: 'Preço', type: 'money' },
  ],
} as ITableSchema;
const NEW: ITableSchema = {
  fields: [
    { name: 'title', label: 'Nome', type: 'string' },
    { name: 'clientRef', label: 'Cliente', type: 'relation', relation: { targetTable: 't1' } },
    { name: 'price', label: 'Preço', type: 'money' },
    { name: 'extra', label: 'Extra', type: 'string' },
  ],
} as ITableSchema;

describe('diffRowData', () => {
  it('campo novo, removido, igual, relação e dinheiro', () => {
    const changes = diffRowData(
      { title: 'a', legacy: 'x', clientRef: 'r1', price: 10.5 },
      { title: 'a', clientRef: 'r2', price: 10.5, extra: 'e' },
      { from: OLD, to: NEW },
    );
    expect(changes).toEqual([
      { field: 'clientRef', label: 'Cliente', kind: 'changed', before: 'r1', after: 'r2' },
      { field: 'extra', label: 'Extra', kind: 'added', before: null, after: 'e' },
      // sumiu do schema novo: rótulo vem do schema antigo
      { field: 'legacy', label: 'Campo antigo', kind: 'removed', before: 'x', after: null },
    ]);
  });

  it('dinheiro diferente aparece; igualdade profunda ignora ordem de chave', () => {
    const changes = diffRowData({ price: 10.5, meta: { a: 1, b: 2 } }, { price: 10.51, meta: { b: 2, a: 1 } }, { from: OLD, to: NEW });
    expect(changes.map(c => c.field)).toEqual(['price']);
  });

  it('sem anterior: tudo é added; rótulo cai para o nome sem schema', () => {
    expect(diffRowData(null, { z: 1 }, { from: null, to: null })).toEqual([{ field: 'z', label: 'z', kind: 'added', before: null, after: 1 }]);
  });

  it('rótulo prefere o schema `to`', () => {
    const [c] = diffRowData({ title: 'a' }, { title: 'b' }, { from: OLD, to: NEW });
    expect(c.label).toBe('Nome');
  });
});

describe('diffSchemas', () => {
  it('added / removed / changed por name', () => {
    const changes = diffSchemas(OLD, NEW);
    expect(changes.map(c => [c.field, c.kind])).toEqual([['title', 'changed'], ['extra', 'added'], ['legacy', 'removed']]);
  });

  it('schemas iguais → vazio; sem anterior → tudo added', () => {
    expect(diffSchemas(NEW, NEW)).toEqual([]);
    expect(diffSchemas(null, NEW).every(c => c.kind === 'added')).toBe(true);
  });
});

describe('deepEqualJson', () => {
  it('arrays respeitam ordem; undefined ≠ null', () => {
    expect(deepEqualJson([1, 2], [2, 1])).toBe(false);
    expect(deepEqualJson(undefined, null)).toBe(false);
  });
});

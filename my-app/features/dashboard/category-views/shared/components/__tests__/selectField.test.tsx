import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';

(globalThis as unknown as { React: typeof React }).React = React;

const LABELS: Record<string, string> = { 'database:options.Small': 'Pequena' };
vi.mock('next-i18next', () => ({
  useTranslation: () => ({ t: (k: string, d?: string) => LABELS[k] ?? d ?? k }),
}));
vi.mock('../../../../shared/hooks/useRenderTypedValue', () => ({
  useRenderTypedValue: () => (v: unknown) => String(v),
}));
vi.mock('../RowActionsCell', () => ({ RowActionsCell: () => null }));

import { GenericRow } from '../GenericRow';
import { GenericFilterBar } from '../GenericFilterBar';
import type { ITableSchema } from '../../../../components/shared/dynamic-tables.client';

// GAP-MAP Nível 3 "FE shared — `select` tratado só como `'enum'`": o servidor emite `type: 'select'` (nunca 'enum').
// Comportamento esperado (precedente PlanningRow.tsx:109): campo select ganha rótulo `database:options.<valor>` na célula
// e filtro por opção na barra.
const schema = {
  fields: [
    { name: 'name', label: 'Nome', type: 'string' },
    { name: 'size', label: 'Porte', type: 'select', options: ['Small', 'Large'] },
  ],
} as unknown as ITableSchema;

describe('campo `select` do DynamicTable nos componentes shared', () => {
  beforeEach(() => cleanup());

  it('GenericRow: célula de select mostra o rótulo database:options, não o valor cru', () => {
    render(
      <table><tbody>
        <GenericRow
          record={{ id: 'r1', data: { name: 'ACME', size: 'Small' } } as never}
          schema={schema}
          tableId="t1"
          relationLookups={{}}
          orderedCols={['name', 'size']}
          onEditSuccess={() => {}}
          onDeleteClick={() => {}}
        />
      </tbody></table>,
    );
    expect(screen.queryByText('Pequena'), 'célula do select deveria usar database:options').not.toBeNull();
  });

  it('GenericFilterBar: campo select ganha filtro com "todos" + opções rotuladas', () => {
    render(
      <GenericFilterBar query="" setQuery={() => {}} recordCount={1} schema={schema} fieldFilters={{}} setFieldFilters={() => {}} />,
    );
    const sel = Array.from(document.querySelectorAll('select')).find((s) =>
      Array.from(s.options).some((o) => o.value === 'Small'),
    );
    expect(sel, 'barra deveria ter <select> de filtro para o campo select').toBeDefined();
    expect(Array.from(sel!.options).map((o) => [o.value, o.text])).toEqual([['', 'All'], ['Small', 'Pequena'], ['Large', 'Large']]);
  });
});

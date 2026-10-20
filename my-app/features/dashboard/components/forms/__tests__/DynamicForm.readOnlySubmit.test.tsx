import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';

(globalThis as unknown as { React: typeof React }).React = React;
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import DynamicForm from '../DynamicForm';
import type { ITableSchema } from '../../shared/dynamic-tables.client';

/**
 * Teste-guarda (GAP-MAP Nível 3) — o submit do DynamicForm envia campo `readOnly`.
 *
 * `EditRecordButton` preenche `initialData` com a linha inteira (inclusive os campos `readOnly`, ex.:
 * `sales.isNewCustomer`) e `handleSubmit` itera `schema.fields` sem pular `field.readOnly` — o booleano entra
 * sempre (`payload[key] = Boolean(value)`). O servidor (`GovernanceEngine.assertReadOnly`) rejeita QUALQUER chave
 * `readOnly` presente no body → a edição genérica de uma linha com campo readOnly preenchido responde 400
 * "are read-only". Comportamento correto esperado: `onSubmit` NÃO recebe a chave do campo `readOnly`.
 */
vi.mock('@/lib/notifications/notify', () => ({ notify: vi.fn() }));
vi.mock('next-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, def?: unknown) => (typeof def === 'string' ? def : key),
    i18n: { exists: () => false },
  }),
}));

afterEach(() => cleanup());

function submit() {
  fireEvent.click(screen.getByRole('button', { name: 'Save Changes' }));
}

describe('DynamicForm — submit não envia campo readOnly', () => {
  it('string readOnly preenchida pela initialData fica fora do payload; o campo editável entra', () => {
    const schema: ITableSchema = {
      fields: [
        { name: 'x', label: 'X', type: 'string', readOnly: true },
        { name: 'name', label: 'Name', type: 'string' },
      ],
    };
    const onSubmit = vi.fn();
    render(<DynamicForm schema={schema} onSubmit={onSubmit} onClose={() => {}} initialData={{ x: 'v', name: 'Ana' }} />);
    submit();
    expect(onSubmit).toHaveBeenCalledTimes(1);
    const payload = onSubmit.mock.calls[0][0] as Record<string, unknown>;
    expect(payload).toMatchObject({ name: 'Ana' });
    expect(payload).not.toHaveProperty('x');
  });

  it('boolean readOnly (ex.: sales.isNewCustomer) fica fora do payload mesmo sem valor na initialData', () => {
    const schema: ITableSchema = {
      fields: [
        { name: 'isNewCustomer', label: 'New customer', type: 'boolean', readOnly: true },
        { name: 'name', label: 'Name', type: 'string' },
      ],
    };
    const onSubmit = vi.fn();
    render(<DynamicForm schema={schema} onSubmit={onSubmit} onClose={() => {}} initialData={{ name: 'Ana' }} />);
    submit();
    expect(onSubmit).toHaveBeenCalledTimes(1);
    const payload = onSubmit.mock.calls[0][0] as Record<string, unknown>;
    expect(payload).toMatchObject({ name: 'Ana' });
    expect(payload).not.toHaveProperty('isNewCustomer');
  });
});

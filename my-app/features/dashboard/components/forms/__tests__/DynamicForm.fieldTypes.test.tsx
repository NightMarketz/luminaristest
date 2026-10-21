import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';

(globalThis as unknown as { React: typeof React }).React = React;
import { render, cleanup } from '@testing-library/react';
import DynamicForm from '../DynamicForm';
import type { ITableSchema } from '../../shared/dynamic-tables.client';

/**
 * Testes-guarda — ACHADOS-2026-10-19 §3.5 itens 3 e 10 (FIX-FE-DASHBOARD).
 *
 * 3: `fieldComponentMap.datetime` renderiza `type="date"` ("Fallback to date for now"): a hora some e o valor ISO UTC
 *    vira o dia anterior no fuso local. Esperado: campo `datetime` usa `datetime-local`.
 * 10: tipo `json` sem componente cai no `string` → o input mostra "[object Object]". Esperado: nenhum controle do
 *    form exibe "[object Object]" para um valor json.
 */
vi.mock('@/lib/notifications/notify', () => ({ notify: vi.fn() }));
vi.mock('next-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, def?: unknown) => (typeof def === 'string' ? def : key),
    i18n: { exists: () => false },
  }),
}));

afterEach(() => cleanup());

describe('DynamicForm — tipos de campo', () => {
  it('item 3: datetime renderiza input datetime-local (não date)', () => {
    const schema = { fields: [{ name: 'startsAt', label: 'Starts at', type: 'datetime' }] } as unknown as ITableSchema;
    const { container } = render(
      <DynamicForm schema={schema} onSubmit={() => {}} onClose={() => {}} initialData={{ startsAt: '2026-10-21T15:30' }} />,
    );
    const input = container.querySelector('input[name="startsAt"]');
    expect(input).not.toBeNull();
    expect(input?.getAttribute('type')).toBe('datetime-local');
  });

  it('item 10: valor json não aparece como "[object Object]"', () => {
    const schema = { fields: [{ name: 'meta', label: 'Meta', type: 'json' }] } as unknown as ITableSchema;
    const { container } = render(
      <DynamicForm schema={schema} onSubmit={() => {}} onClose={() => {}} initialData={{ meta: { a: 1 } }} />,
    );
    expect(container.querySelector('[name="meta"]')).not.toBeNull();
    const values = Array.from(container.querySelectorAll('input, textarea')).map((el) => (el as HTMLInputElement).value);
    expect(values).not.toContain('[object Object]');
  });
});

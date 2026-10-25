process.env.TZ = 'America/Sao_Paulo';
import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';

(globalThis as unknown as { React: typeof React }).React = React;
import { render, cleanup, fireEvent } from '@testing-library/react';
import DynamicForm from '../DynamicForm';
import type { ITableSchema } from '../../shared/dynamic-tables.client';

/**
 * Teste-guarda — ACHADOS-2026-10-19 §3.5 item 3, resíduo (FIX-FE-DASHBOARD). O #804 trocou `type="date"` por
 * `datetime-local`, mas o guarda dele usou '2026-10-21T15:30' — não o que o servidor devolve. O motor grava `datetime`
 * via `z.coerce.date()` → JSON ISO UTC ('…T15:30:00.000Z'), que o `datetime-local` não aceita como valor (fica vazio:
 * a hora some na edição). E o valor digitado ('2026-10-24T12:30', hora de parede sem fuso) sobe cru: o servidor o lê no
 * fuso DELE.
 * Esperado: na edição o campo mostra a hora local do instante gravado; no submit sobe o instante absoluto (ISO UTC).
 * Fuso fixo America/Sao_Paulo (UTC−3, sem horário de verão em 2026).
 */
vi.mock('@/lib/notifications/notify', () => ({ notify: vi.fn() }));
vi.mock('next-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, def?: unknown) => (typeof def === 'string' ? def : key),
    i18n: { exists: () => false },
  }),
}));

afterEach(() => cleanup());

const schema = { fields: [{ name: 'nextActionAt', label: 'Next action', type: 'datetime' }] } as unknown as ITableSchema;

describe('DynamicForm — datetime com o ISO real do servidor', () => {
  it('edição: ISO UTC gravado aparece na hora local (15:30Z → 12:30 em SP)', () => {
    const { container } = render(
      <DynamicForm schema={schema} onSubmit={() => {}} onClose={() => {}} initialData={{ nextActionAt: '2026-10-24T15:30:00.000Z' }} />,
    );
    const input = container.querySelector('input[name="nextActionAt"]') as HTMLInputElement | null;
    expect(input?.value).toBe('2026-10-24T12:30');
  });

  it('submit: hora local digitada sobe como instante ISO UTC (12:30 em SP → 15:30Z)', () => {
    const onSubmit = vi.fn();
    const { container } = render(<DynamicForm schema={schema} onSubmit={onSubmit} onClose={() => {}} />);
    const input = container.querySelector('input[name="nextActionAt"]') as HTMLInputElement;
    fireEvent.change(input, { target: { value: '2026-10-24T12:30' } });
    fireEvent.submit(container.querySelector('form') as HTMLFormElement);
    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit.mock.calls[0][0]).toEqual({ nextActionAt: '2026-10-24T15:30:00.000Z' });
  });
});

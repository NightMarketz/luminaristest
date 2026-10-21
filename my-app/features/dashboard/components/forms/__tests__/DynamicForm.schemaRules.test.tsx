import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';

(globalThis as unknown as { React: typeof React }).React = React;
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import DynamicForm from '../DynamicForm';
import type { ITableSchema } from '../../shared/dynamic-tables.client';

/**
 * Testes-guarda — ACHADOS-2026-10-19 §3.5 itens 9 e 11 (FIX-FE-DASHBOARD).
 *
 * 9: o `handleSubmit` só olha `required` e número inválido: ignora `requiredIf`, `validation.minValue/maxValue`,
 *    `format: 'url'` e `defaultValue` do schema do servidor (o tipo `ISchemaField` do cliente nem os declara).
 *    Esperado: violação de `requiredIf`/`minValue`/`url` barra o `onSubmit`; criação sem valor leva o `defaultValue`.
 * 11: `DynamicForm` passa `readOnly`/`disabled`/`aria-invalid`, mas `SelectField`, `TextareaField`, `CurrencyField`,
 *    `PercentageField` e `CheckboxField` não os aceitam. Esperado: campo `readOnly` sai desabilitado/somente leitura
 *    e campo com erro sai com `aria-invalid="true"`.
 */
vi.mock('@/lib/notifications/notify', () => ({ notify: vi.fn() }));
vi.mock('next-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, def?: unknown) => (typeof def === 'string' ? def : key),
    i18n: { exists: () => false },
  }),
}));
vi.mock('@/lib/context/CurrencyContext', () => ({
  useCurrency: () => ({ currency: 'BRL' }),
  useFormatCurrency: () => (v: number | null | undefined) => String(v ?? ''),
  SUPPORTED_CURRENCIES: [{ code: 'BRL', label: 'Real', symbol: 'R$', flag: '', locale: 'pt-BR' }],
}));

afterEach(() => cleanup());

const asSchema = (fields: unknown[]) => ({ fields }) as unknown as ITableSchema;
function submit() {
  fireEvent.click(screen.getByRole('button', { name: 'Save Changes' }));
}

describe('DynamicForm — item 9: regras do schema', () => {
  it('requiredIf satisfeito e campo vazio barra o submit', () => {
    const onSubmit = vi.fn();
    const schema = asSchema([
      { name: 'paymentStatus', label: 'Status', type: 'string' },
      { name: 'paymentDate', label: 'Paid at', type: 'date', requiredIf: { field: 'paymentStatus', op: 'eq', value: 'Paid' } },
    ]);
    render(<DynamicForm schema={schema} onSubmit={onSubmit} onClose={() => {}} initialData={{ paymentStatus: 'Paid' }} />);
    submit();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('validation.minValue violado barra o submit', () => {
    const onSubmit = vi.fn();
    const schema = asSchema([{ name: 'qty', label: 'Qty', type: 'number', validation: { minValue: 0 } }]);
    render(<DynamicForm schema={schema} onSubmit={onSubmit} onClose={() => {}} initialData={{ qty: -5 }} />);
    submit();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('format url com valor que não é URL barra o submit', () => {
    const onSubmit = vi.fn();
    const schema = asSchema([{ name: 'site', label: 'Site', type: 'string', format: 'url' }]);
    render(<DynamicForm schema={schema} onSubmit={onSubmit} onClose={() => {}} initialData={{ site: 'não é url' }} />);
    submit();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('criação sem valor leva o defaultValue do schema', () => {
    const onSubmit = vi.fn();
    const schema = asSchema([{ name: 'origin', label: 'Origin', type: 'string', defaultValue: 'Balcão' }]);
    render(<DynamicForm schema={schema} onSubmit={onSubmit} onClose={() => {}} />);
    submit();
    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit.mock.calls[0][0]).toMatchObject({ origin: 'Balcão' });
  });
});

describe('DynamicForm — item 11: readOnly e aria-invalid nos campos especializados', () => {
  it('readOnly chega a select, textarea, moeda, percentual e checkbox', () => {
    const schema = asSchema([
      { name: 'status', label: 'Status', type: 'select', options: ['A', 'B'], readOnly: true },
      { name: 'notes', label: 'Notes', type: 'textarea', readOnly: true },
      { name: 'price', label: 'Price', type: 'number', readOnly: true },
      { name: 'commission', label: 'Commission', type: 'number', readOnly: true },
      { name: 'active', label: 'Active', type: 'boolean', readOnly: true },
    ]);
    const { container } = render(<DynamicForm schema={schema} onSubmit={() => {}} onClose={() => {}} initialData={{}} />);
    const names = ['status', 'notes', 'price', 'commission', 'active'];
    const els = names.map((n) => container.querySelector(`[name="${n}"]`) as HTMLInputElement | null);
    expect(els.every(Boolean)).toBe(true);
    const editaveis = names.filter((_, i) => !(els[i]!.disabled || els[i]!.readOnly));
    expect(editaveis).toEqual([]);
  });

  it('aria-invalid chega ao select com erro', () => {
    const schema = asSchema([{ name: 'status', label: 'Status', type: 'select', options: ['A', 'B'] }]);
    const { container } = render(
      <DynamicForm schema={schema} onSubmit={() => {}} onClose={() => {}} initialData={{}} fieldErrors={{ status: 'obrigatório' }} />,
    );
    const el = container.querySelector('[name="status"]');
    expect(el).not.toBeNull();
    expect(el?.getAttribute('aria-invalid')).toBe('true');
  });
});

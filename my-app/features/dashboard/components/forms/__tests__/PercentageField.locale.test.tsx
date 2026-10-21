import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';

(globalThis as unknown as { React: typeof React }).React = React;
import { render, fireEvent, cleanup } from '@testing-library/react';
import PercentageField from '../dynamic-form-fields/PercentageField';

/**
 * Teste-guarda — ACHADOS-2026-10-19 §3.5 item 12 (FIX-FE-DASHBOARD).
 *
 * `parsePercent` remove todo "." antes de trocar "," por "." — certo em pt-BR, errado em en-US, onde "." é o
 * separador decimal: "1.5%" vira 15. Esperado: com a moeda USD (locale en-US), digitar "1.5%" emite 1.5.
 */
vi.mock('@/lib/context/CurrencyContext', () => ({
  useCurrency: () => ({ currency: 'USD' }),
  SUPPORTED_CURRENCIES: [
    { code: 'BRL', locale: 'pt-BR' },
    { code: 'USD', locale: 'en-US' },
  ],
}));

afterEach(() => cleanup());

describe('PercentageField — en-US', () => {
  it('"1.5%" vira 1.5, não 15', () => {
    const onChange = vi.fn();
    const { container } = render(<PercentageField name="commission" value={0} onChange={onChange} className="" />);
    fireEvent.change(container.querySelector('input') as HTMLInputElement, { target: { value: '1.5%' } });
    expect(onChange).toHaveBeenLastCalledWith('commission', 1.5);
  });
});

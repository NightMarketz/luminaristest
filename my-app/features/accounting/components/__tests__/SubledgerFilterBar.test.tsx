import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// This component compiles JSX to bare `React.createElement` (esbuild classic runtime)
// and does not `import React` — expose it globally for the render, like the
// AccountsPayablePanel test.
(globalThis as unknown as { React: typeof React }).React = React;
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import type { TFunction } from 'i18next';
import { SubledgerFilterBar, type SubledgerFilterValue } from '../SubledgerFilterBar';

const t = ((key: string, fallback?: string) => fallback ?? key) as unknown as TFunction;

const counterpartyOptions = [
  { id: 'cp1', name: 'Fornecedor A' },
  { id: 'cp2', name: 'Fornecedor B' },
];

describe('SubledgerFilterBar (render)', () => {
  beforeEach(() => {
    cleanup();
  });

  it('renders the search input, counterparty select, due-date range and overdue toggle', () => {
    render(
      <SubledgerFilterBar value={{}} onChange={vi.fn()} counterpartyOptions={counterpartyOptions} t={t} />,
    );
    expect(screen.getByPlaceholderText('Descrição ou nº do documento…')).toBeInTheDocument();
    expect(screen.getByText('Fornecedor A')).toBeInTheDocument();
    expect(screen.getByText('Fornecedor B')).toBeInTheDocument();
    expect(screen.getByLabelText('Vencimento de')).toBeInTheDocument();
    expect(screen.getByLabelText('Vencimento até')).toBeInTheDocument();
    expect(screen.getByText('Só vencidos')).toBeInTheDocument();
    // Clear button only shows with active filters
    expect(screen.queryByText('Limpar filtros')).not.toBeInTheDocument();
  });

  it('typing in the search field reports q via onChange (undefined when cleared)', () => {
    const onChange = vi.fn();
    render(
      <SubledgerFilterBar value={{}} onChange={onChange} counterpartyOptions={counterpartyOptions} t={t} />,
    );
    fireEvent.change(screen.getByPlaceholderText('Descrição ou nº do documento…'), {
      target: { value: 'aluguel' },
    });
    expect(onChange).toHaveBeenCalledWith({ q: 'aluguel' });
  });

  it('toggling the overdue checkbox ON reports overdue: true, toggling OFF reports overdue: undefined (never false)', () => {
    const onChange = vi.fn();
    const { rerender } = render(
      <SubledgerFilterBar value={{}} onChange={onChange} counterpartyOptions={counterpartyOptions} t={t} />,
    );
    const checkbox = screen.getByRole('checkbox');
    fireEvent.click(checkbox);
    expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({ overdue: true }));

    // Simulate the controlled value now being on, then click again to turn it off.
    const onValue: SubledgerFilterValue = { overdue: true };
    rerender(
      <SubledgerFilterBar value={onValue} onChange={onChange} counterpartyOptions={counterpartyOptions} t={t} />,
    );
    fireEvent.click(screen.getByRole('checkbox'));
    const lastCall = onChange.mock.calls[onChange.mock.calls.length - 1][0] as SubledgerFilterValue;
    expect(lastCall.overdue).toBeUndefined();
    expect(lastCall).not.toHaveProperty('overdue', false);
  });

  it('combining counterparty + due range + overdue merges into a single value object', () => {
    const onChange = vi.fn();
    let value: SubledgerFilterValue = {};
    const handleChange = (next: SubledgerFilterValue) => {
      value = next;
      onChange(next);
    };
    const { rerender } = render(
      <SubledgerFilterBar value={value} onChange={handleChange} counterpartyOptions={counterpartyOptions} t={t} />,
    );

    fireEvent.change(screen.getByLabelText('Contraparte'), { target: { value: 'cp1' } });
    rerender(
      <SubledgerFilterBar value={value} onChange={handleChange} counterpartyOptions={counterpartyOptions} t={t} />,
    );
    fireEvent.change(screen.getByLabelText('Vencimento de'), { target: { value: '2026-06-01' } });
    rerender(
      <SubledgerFilterBar value={value} onChange={handleChange} counterpartyOptions={counterpartyOptions} t={t} />,
    );
    fireEvent.click(screen.getByRole('checkbox'));

    expect(value).toEqual({ counterpartyId: 'cp1', dueFrom: '2026-06-01', overdue: true });
    expect(screen.getByText('Limpar filtros')).toBeInTheDocument();
  });
});

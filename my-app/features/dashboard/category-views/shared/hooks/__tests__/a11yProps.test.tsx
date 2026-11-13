import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { sortableThProps, activatableProps } from '../a11yProps';

// L-20261113-152229-7c2c: ordenação por <th onClick> e linhas só-mouse não eram operáveis por teclado.
describe('sortableThProps', () => {
  it('th ordenável: Enter e Espaço ordenam, aria-sort reflete o estado, tabIndex 0', () => {
    const onSort = vi.fn();
    render(<table><thead><tr><th {...sortableThProps(true, { direction: 'desc' }, onSort)}>Nome</th></tr></thead></table>);
    const th = screen.getByRole('columnheader');
    expect(th).toHaveAttribute('aria-sort', 'descending');
    expect(th).toHaveAttribute('tabindex', '0');
    fireEvent.keyDown(th, { key: 'Enter' });
    fireEvent.keyDown(th, { key: ' ' });
    expect(onSort).toHaveBeenCalledTimes(2);
  });
  it('sem ordem ativa: aria-sort none; não ordenável: sem props', () => {
    render(<table><thead><tr><th {...sortableThProps(true, null, () => {})}>A</th><th {...sortableThProps(false, null, () => {})}>B</th></tr></thead></table>);
    const [a, b] = screen.getAllByRole('columnheader');
    expect(a).toHaveAttribute('aria-sort', 'none');
    expect(b).not.toHaveAttribute('tabindex');
  });
});

describe('activatableProps', () => {
  it('Enter ativa a linha, mas tecla vinda de botão filho não', () => {
    const open = vi.fn();
    render(<table><tbody><tr {...activatableProps(open)}><td><button>x</button></td></tr></tbody></table>);
    const row = screen.getByRole('row');
    fireEvent.keyDown(row, { key: 'Enter' });
    expect(open).toHaveBeenCalledTimes(1);
    fireEvent.keyDown(screen.getByRole('button'), { key: 'Enter' });
    expect(open).toHaveBeenCalledTimes(1);
  });
});

describe('fiação nas tabelas', () => {
  const root = join(__dirname, '..', '..', '..');
  const files = [
    'shared/components/GenericTable.tsx', 'finance/components/expenses/ExpensesTable.tsx',
    'inventory/components/InventoryTable.tsx', 'people/components/PeopleTable.tsx',
    'planning/components/PlanningTable.tsx', 'products/components/ProductsTable.tsx',
    'services/components/ServicesTable.tsx',
  ];
  it.each(files)('%s: <th> ordenável usa sortableThProps', (f) => {
    const src = readFileSync(join(root, f), 'utf8');
    expect(src).not.toMatch(/onClick=\{sortable \?/);
    expect(src).toContain('sortableThProps');
  });
  const rows = ['finance/components/expenses/ExpensesRow.tsx', 'people/components/PeopleRow.tsx', 'planning/components/PlanningRow.tsx', 'products/components/ProductRow.tsx'];
  it.each(rows)('%s: linha clicável usa activatableProps', (f) => {
    expect(readFileSync(join(root, f), 'utf8')).toContain('activatableProps');
  });
});

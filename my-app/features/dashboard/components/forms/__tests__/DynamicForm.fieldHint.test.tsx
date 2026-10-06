import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';

(globalThis as unknown as { React: typeof React }).React = React;
import { render, screen, cleanup } from '@testing-library/react';
import DynamicForm from '../DynamicForm';
import type { ITableSchema } from '../../shared/dynamic-tables.client';
import pt from '../../../../../public/locales/pt/database.json';
import en from '../../../../../public/locales/en/database.json';

/**
 * FE-INCR-PACOTE-VALIDADE item 14 (dono 05/10: override no front) — o campo `validityDays` do catálogo de pacotes ganha
 * rótulo "Validade (dias)" (`database:fields.validityDays`, o mesmo caminho do rótulo de todo campo) e a orientação do
 * F-JUR-1 sob o campo (`database:field_descriptions.validityDays`). Campo sem a chave não ganha texto.
 */
const catalog: Record<string, unknown> = {
  'database:fields.validityDays': pt.fields.validityDays,
  'database:field_descriptions.validityDays': pt.field_descriptions.validityDays,
};

vi.mock('@/lib/notifications/notify', () => ({ notify: vi.fn() }));
vi.mock('next-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, def?: unknown) => (key in catalog ? String(catalog[key]) : typeof def === 'string' ? def : key),
    i18n: { exists: (key: string) => key in catalog },
  }),
}));

const schema: ITableSchema = {
  fields: [
    { name: 'name', label: 'Name', type: 'string' },
    { name: 'validityDays', label: 'Validity (days)', type: 'number' },
  ],
};

afterEach(() => cleanup());

describe('DynamicForm — rótulo e orientação do validityDays', () => {
  it('mostra "Validade (dias)" e a orientação do F-JUR-1 sob o campo; o outro campo não ganha texto', () => {
    const { container } = render(<DynamicForm schema={schema} onSubmit={() => {}} onClose={() => {}} />);
    expect(screen.getByText('Validade (dias)')).toBeInTheDocument();
    const hint = screen.getByText(/12 meses ou mais é a mais defensável/);
    expect(hint.textContent).toBe(
      'Prazo em dias corridos a partir da compra. Validade de 12 meses ou mais é a mais defensável; 0 ou vazio = sem validade.',
    );
    // exatamente uma orientação no formulário
    expect(container.querySelectorAll('p.text-xs.text-neutral-500')).toHaveLength(1);
  });

  it('sem a chave, nenhum campo ganha orientação (o `description` do schema não é desenhado)', () => {
    for (const k of Object.keys(catalog)) delete catalog[k];
    // o tipo do FE não declara `description`, mas o servidor o manda (DynamicTable.model.ts:22-28)
    const withDescription = { fields: [{ name: 'dueDate', label: 'Due', type: 'string', description: 'Payment due date.' }] } as unknown as ITableSchema;
    render(<DynamicForm schema={withDescription} onSubmit={() => {}} onClose={() => {}} />);
    expect(screen.queryByText('Payment due date.')).toBeNull();
  });
});

describe('locales database — paridade pt/en do rótulo e da orientação', () => {
  it('as duas chaves existem nos dois idiomas, com o texto do F-JUR-1', () => {
    expect(pt.fields.validityDays).toBe('Validade (dias)');
    expect(en.fields.validityDays).toBe('Validity (days)');
    expect(pt.field_descriptions.validityDays).toContain('12 meses');
    expect(en.field_descriptions.validityDays).toContain('12 months');
  });
});

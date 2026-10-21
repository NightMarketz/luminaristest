// Fuso de Brasília: date-only "AAAA-MM-DD" vira meia-noite UTC e, lido no fuso local, recua um dia (item 14).
process.env.TZ = 'America/Sao_Paulo';

import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';

(globalThis as unknown as { React: typeof React }).React = React;
import { render, cleanup } from '@testing-library/react';
import { KanbanCardDetailModal } from '../KanbanCardDetailModal';
import type { ITableSchema } from '@/features/dashboard/components/shared/dynamic-tables.client';
import type { Task } from '@/types/Task.types';

/**
 * Testes-guarda — ACHADOS-2026-10-19 §3.5 itens 7 e 14 (FIX-FE-DASHBOARD).
 *
 * 7: no detalhe do card, `SidebarButton` "Arquivar", "Copiar", "Compartilhar" e "Seguir" nascem sem `onClick` —
 *    o botão aparece e não faz nada. Esperado: todo `SidebarButton` do modal recebe `onClick`.
 * 14: `renderFieldValue` faz `new Date('2026-10-21').toLocaleDateString()` (UTC-shift: mostra o dia 20 em
 *    Brasília) e formata dinheiro sempre em `pt-BR`/`BRL`, ignorando a moeda ativa. Esperado: a data mostra o dia
 *    escrito, e o valor sai na moeda ativa (USD aqui).
 */
vi.mock('next-i18next', () => ({
  useTranslation: () => ({ t: (key: string, def?: unknown) => (typeof def === 'string' ? def : key) }),
}));
vi.mock('@/lib/services/dynamic-table.service', () => ({ DynamicTableService: {} }));
vi.mock('@/features/dashboard/components/forms/RelationSelector', () => ({ default: () => null }));
vi.mock('@/lib/context/CurrencyContext', () => ({
  useCurrency: () => ({ currency: 'USD' }),
  useFormatCurrency: () => (v: number | null | undefined) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(v ?? 0),
  SUPPORTED_CURRENCIES: [
    { code: 'BRL', locale: 'pt-BR' },
    { code: 'USD', locale: 'en-US' },
  ],
}));

afterEach(() => cleanup());

describe('KanbanCardDetailModal — item 7: botões de ação', () => {
  it('todo <SidebarButton> do modal recebe onClick', () => {
    const src = readFileSync(path.resolve(__dirname, '../KanbanCardDetailModal.tsx'), 'utf8');
    const usages = src.match(/<SidebarButton\b[\s\S]*?\/>/g) ?? [];
    expect(usages.length).toBeGreaterThan(0);
    const semHandler = usages
      .filter((u) => !/\bonClick=/.test(u))
      .map((u) => /label="([^"]+)"/.exec(u)?.[1] ?? u);
    expect(semHandler).toEqual([]);
  });
});

describe('KanbanCardDetailModal — item 14: data e moeda', () => {
  const schema = {
    fields: [
      { name: 'dueDate', label: 'Due', type: 'date' },
      { name: 'price', label: 'Price', type: 'number' },
    ],
  } as unknown as ITableSchema;
  const task = {
    id: 'k1', name: 'Card', description: null, status: 'To_Do', priority: null,
    createdAt: '2026-10-01T12:00:00.000Z', updatedAt: '2026-10-01T12:00:00.000Z',
    dueDate: '2026-10-21', price: 1234.5,
  } as unknown as Task;

  function renderModal() {
    return render(
      <KanbanCardDetailModal isOpen onClose={() => {}} task={task} tableId="t" tableSchema={schema} onUpdate={() => {}} />,
    );
  }

  it('date-only "2026-10-21" mostra o dia 21, não o 20', () => {
    const text = renderModal().baseElement.textContent ?? '';
    expect(text).toContain('Due');
    expect(text).not.toMatch(/10\/20\/2026|20\/10\/2026/);
  });

  it('valor monetário sai na moeda ativa (USD), não fixo em R$', () => {
    const text = renderModal().baseElement.textContent ?? '';
    expect(text).toContain('Price');
    expect(text).not.toContain('R$');
  });
});

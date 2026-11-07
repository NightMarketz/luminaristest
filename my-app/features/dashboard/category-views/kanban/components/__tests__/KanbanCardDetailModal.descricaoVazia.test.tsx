import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';

(globalThis as unknown as { React: typeof React }).React = React;
import { render, cleanup, fireEvent } from '@testing-library/react';
import { KanbanCardDetailModal } from '../KanbanCardDetailModal';
import type { ITableSchema } from '@/features/dashboard/components/shared/dynamic-tables.client';
import type { Task } from '@/types/Task.types';

/**
 * Teste-guarda — RUNBOOK-KANBAN-REORDER passo 9 (continuação de 28/10, FALHOU) e
 * D-2026-11-06-PARADOS-NO-DONO §3 ("Corrigir e agente roda").
 *
 * Com a tela em EN, o detalhe de um card sem descrição mostra "Adicione uma descrição mais detalhada..." em PT:
 * o texto está fixo no JSX (placeholder do textarea e texto do campo vazio), fora do `t()`.
 * Esperado: com o idioma ativo em EN, nenhum dos dois mostra o texto em PT.
 * O `t` daqui resolve a chave no `public/locales/en/*.json` real; chave inexistente cai no default do código,
 * como o i18next faz.
 */
const locales = path.resolve(__dirname, '../../../../../../public/locales/en');
const en: Record<string, unknown> = {
  common: JSON.parse(readFileSync(path.join(locales, 'common.json'), 'utf8')),
  database: JSON.parse(readFileSync(path.join(locales, 'database.json'), 'utf8')),
};
function tEn(key: string, def?: unknown): string {
  const [ns, rest] = key.includes(':') ? key.split(':', 2) : ['common', key];
  let cur: unknown = en[ns];
  for (const part of rest.split('.')) cur = (cur as Record<string, unknown> | undefined)?.[part];
  if (typeof cur === 'string') return cur;
  return typeof def === 'string' ? def : key;
}

vi.mock('next-i18next', () => ({ useTranslation: () => ({ t: tEn }) }));
vi.mock('@/lib/services/dynamic-table.service', () => ({ DynamicTableService: {} }));
vi.mock('@/features/dashboard/components/forms/RelationSelector', () => ({ default: () => null }));
vi.mock('@/lib/context/CurrencyContext', () => ({
  useCurrency: () => ({ currency: 'USD' }),
  useFormatCurrency: () => (v: number | null | undefined) => String(v ?? 0),
}));

afterEach(() => cleanup());

const PT = /Adicione uma descri/;
const schema = { fields: [] } as unknown as ITableSchema;
const task = {
  id: 'k1', name: 'Feito 1', description: null, status: 'Done', priority: null,
  createdAt: '2026-10-28T12:00:00.000Z', updatedAt: '2026-10-28T12:00:00.000Z',
} as unknown as Task;

describe('KanbanCardDetailModal — passo 9: descrição vazia no idioma ativo (EN)', () => {
  it('texto do campo vazio e placeholder do textarea não ficam em PT com a tela em EN', () => {
    const { baseElement } = render(
      <KanbanCardDetailModal isOpen onClose={() => {}} task={task} tableId="t" tableSchema={schema} onUpdate={() => {}} />,
    );
    const vazio = Array.from(baseElement.querySelectorAll('div')).find((d) => d.className.includes('italic'));
    expect(vazio, 'campo vazio da descrição não encontrado').toBeTruthy();
    const textoVazio = vazio!.textContent ?? '';

    fireEvent.click(vazio!);
    const textarea = baseElement.querySelector('textarea');
    expect(textarea, 'textarea da descrição não abriu').toBeTruthy();
    const placeholder = textarea!.getAttribute('placeholder') ?? '';

    expect({ textoVazio, placeholder }).toEqual({
      textoVazio: expect.not.stringMatching(PT),
      placeholder: expect.not.stringMatching(PT),
    });
  });
});

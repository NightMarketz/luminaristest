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
 * Teste-guarda — RUNBOOK-KANBAN-REORDER passo 9, rodada de 06/11 (FALHOU; PR #1112): com a tela em PT, os rótulos dos
 * campos do detalhe do card saem em EN (ASSIGNEE, DUE DATE, LEAD, REMINDER AT). O modal escreve o rótulo do schema cru
 * (`field.label || field.name`), enquanto o `GenericTable` passa por `t('database:fields.<nome>', field.label …)`.
 * Esperado: com o idioma ativo em PT, cada rótulo de campo é a tradução `database:fields.<nome>` do idioma ativo
 * ("Lead" é termo do próprio pt — por isso a asserção é pela chave, não pela ausência do texto EN).
 * O `t` daqui resolve a chave no `public/locales/pt/*.json` real; chave inexistente cai no default, como o i18next.
 */
const locales = path.resolve(__dirname, '../../../../../../public/locales/pt');
const pt: Record<string, unknown> = {
  common: JSON.parse(readFileSync(path.join(locales, 'common.json'), 'utf8')),
  database: JSON.parse(readFileSync(path.join(locales, 'database.json'), 'utf8')),
};
function tPt(key: string, def?: unknown): string {
  const [ns, rest] = key.includes(':') ? key.split(':', 2) : ['common', key];
  let cur: unknown = pt[ns];
  for (const part of rest.split('.')) cur = (cur as Record<string, unknown> | undefined)?.[part];
  if (typeof cur === 'string') return cur;
  return typeof def === 'string' ? def : key;
}

vi.mock('next-i18next', () => ({ useTranslation: () => ({ t: tPt }) }));
vi.mock('@/lib/services/dynamic-table.service', () => ({ DynamicTableService: {} }));
vi.mock('@/features/dashboard/components/forms/RelationSelector', () => ({ default: () => null }));
vi.mock('@/lib/context/CurrencyContext', () => ({
  useCurrency: () => ({ currency: 'BRL' }),
  useFormatCurrency: () => (v: number | null | undefined) => String(v ?? 0),
}));

afterEach(() => cleanup());

// Campos do preset Tasks com os rótulos gravados no schema (TasksModule.ts), os que o detalhe lista
const camposEn = [
  { name: 'assigneeId', label: 'Assignee', type: 'relation' },
  { name: 'date', label: 'Due Date', type: 'date' },
  { name: 'leadId', label: 'Lead', type: 'relation' },
  { name: 'reminderAt', label: 'Reminder At', type: 'datetime' },
];
const schema = { fields: camposEn } as unknown as ITableSchema;
const task = {
  id: 'k1', name: 'A fazer 2', description: null, status: 'To Do', priority: null,
  createdAt: '2026-11-06T12:00:00.000Z', updatedAt: '2026-11-06T12:00:00.000Z',
} as unknown as Task;

describe('KanbanCardDetailModal — passo 9: rótulos dos campos no idioma ativo (PT)', () => {
  it('cada rótulo de campo é a tradução database:fields.<nome> do idioma ativo (PT)', () => {
    const { baseElement } = render(
      <KanbanCardDetailModal isOpen onClose={() => {}} task={task} tableId="t" tableSchema={schema} onUpdate={() => {}} />,
    );
    const rotulos = Array.from(baseElement.querySelectorAll('span.uppercase')).map((s) => (s.textContent ?? '').trim());
    const deCampo = rotulos.filter((r) => !/^(Prioridade|Ações Rápidas)$/i.test(r));
    expect(deCampo.length, 'rótulos dos campos não encontrados').toBe(camposEn.length);
    // cada rótulo sai da tradução PT por nome de campo; sem chave PT, a falha nomeia o campo
    expect(deCampo).toEqual(camposEn.map((c) => tPt(`database:fields.${c.name}`, `<sem tradução pt: fields.${c.name}>`)));
  });
});

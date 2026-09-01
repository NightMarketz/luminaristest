import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';

// DynamicForm importa React por conta própria, mas os field components compilam JSX com
// o runtime clássico — mesmo shim dos demais testes de render.
(globalThis as unknown as { React: typeof React }).React = React;
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import DynamicForm from '../DynamicForm';
import type { ITableSchema } from '../../shared/dynamic-tables.client';

vi.mock('@/lib/notifications/notify', () => ({ notify: vi.fn() }));

const schema: ITableSchema = {
  fields: [{ name: 'quando', label: 'Quando', type: 'date' }],
};

// ── Teste-guarda (sessão de instrumentação 2026-09-01) — classe date-only UTC shift ──
// O botão "Hoje" do campo de data (DynamicForm.tsx:301) escreve
// `new Date().toISOString().split('T')[0]` (UTC): entre 21h-00h BRT o dia UTC já virou e
// o botão ROTULADO "Hoje" grava o "amanhã" do escopo em qualquer tabela dinâmica — o
// usuário pediu explicitamente o hoje e recebe outro dia, em silêncio. Comportamento
// correto (sem fork aqui — o rótulo define a semântica): o clique escreve o HOJE do
// escopo. Instante FIXADO com fake timers na janela que morde; o clique é síncrono, o
// clock fica congelado só durante ele (determinístico em qualquer máquina/fuso).
describe('DynamicForm — botão "Hoje" (classe date-only UTC shift)', () => {
  afterEach(() => cleanup());

  it('guarda: clicar em "Hoje" na janela 21h-00h BRT escreve o hoje do escopo, não o amanhã UTC', () => {
    const { container } = render(
      <DynamicForm schema={schema} onSubmit={() => {}} onClose={() => {}} />,
    );

    vi.useFakeTimers();
    try {
      vi.setSystemTime(new Date('2026-09-01T02:30:00Z')); // 23:30 BRT de 2026-08-31
      fireEvent.click(screen.getByRole('button', { name: 'Today' }));

      const input = container.querySelector('input[type="date"]') as HTMLInputElement;
      expect(
        input.value,
        'o botão "Hoje" às 23:30 BRT de 2026-08-31 deve escrever o hoje do escopo — escreveu o "amanhã" UTC: o rótulo promete hoje e o campo recebe outro dia',
      ).toBe('2026-08-31');
    } finally {
      vi.useRealTimers();
    }
  });
});

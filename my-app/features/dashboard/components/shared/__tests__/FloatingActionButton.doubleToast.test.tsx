import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';

(globalThis as unknown as { React: typeof React }).React = React;
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react';
import { FloatingActionButton } from '../FloatingActionButton';
import { notify } from '@/lib/notifications/notify';
import type { ITableSchema } from '../dynamic-tables.client';

/**
 * Teste-guarda — ACHADOS-2026-10-19 §3.5 item 28 (FIX-FE-DASHBOARD), no `FloatingActionButton` (dono, chat,
 * 2026-10-21: "instrumenta o item 28 no FloatingActionButton").
 *
 * `handleSubmit` chama `DynamicTableService.createRecord` sem `silent`: num 400 o `apiClient` já dispara o toast de
 * erro, e o `catch` do botão mostra a MESMA mensagem no banner do modal — o usuário vê o erro duas vezes.
 * Esperado (neutro entre calar o toast ou o banner): a mensagem do servidor aparece uma vez só.
 */
vi.mock('@/lib/notifications/notify', () => ({ notify: vi.fn() }));
vi.mock('cookies-next', () => ({ getCookie: () => undefined }));
vi.mock('next-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, def?: unknown) => (typeof def === 'string' ? def : key),
    i18n: { exists: () => false },
  }),
}));

afterEach(() => cleanup());

describe('FloatingActionButton — erro de criação aparece uma vez', () => {
  it('400 { error } não vira toast E banner ao mesmo tempo', async () => {
    const MSG = 'Já existe um registro com esse nome';
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false, status: 400, statusText: 'Bad Request',
      text: async () => JSON.stringify({ success: false, error: MSG }),
    } as unknown as Response);
    const schema = { fields: [{ name: 'name', label: 'Name', type: 'string' }] } as unknown as ITableSchema;

    render(<FloatingActionButton tableId="t1" tableSchema={schema}>Novo</FloatingActionButton>);
    fireEvent.click(screen.getByRole('button', { name: /Novo/ }));
    fireEvent.click(await screen.findByRole('button', { name: 'Save Changes' }));

    await waitFor(() => expect(globalThis.fetch).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(screen.getByRole('button', { name: /Novo/ })).not.toBeDisabled());

    const toasts = vi.mocked(notify).mock.calls.filter(([m, kind]) => kind === 'error' && String(m).includes(MSG)).length;
    const banners = screen.queryAllByText(MSG).length;
    expect(toasts + banners).toBeGreaterThan(0);
    expect({ toasts, banners }).not.toEqual({ toasts: 1, banners: 1 });
  });
});

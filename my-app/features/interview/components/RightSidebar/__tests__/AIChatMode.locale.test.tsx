import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, fireEvent, waitFor, screen } from '@testing-library/react';

// Lacuna L-20261111-214837-3484 (RUNBOOK-W7, passo 8): o painel de campos por IA não mandava o idioma da UI e o
// modelo respondia em português com a UI em inglês. O corpo da mensagem leva `locale` quando a instância i18n o conhece.
(globalThis as unknown as { React: typeof React }).React = React;
let language = 'en';
vi.mock('cookies-next', () => ({ getCookie: () => 'tok' }));
vi.mock('next-i18next', () => ({ useTranslation: () => ({ t: (k: string) => k, i18n: { language } }) }));
vi.mock('@/lib/notifications/notify', () => ({ notify: vi.fn() }));

import AIChatMode from '../AIChatMode';

Element.prototype.scrollIntoView = vi.fn();

const tabela = { key: 'clientes', name: 'Clientes', description: 'x', conversationHistory: [], fields: [] };
const ok = {
  sessionId: 's1', tableKey: 'clientes', table: tabela, conversationHistory: [], proposal: null, discarded: [],
};

async function enviar(): Promise<Record<string, unknown>> {
  render(<AIChatMode tableData={tabela} sessionId="s1" onSaveChanges={vi.fn()} onSync={vi.fn()} onClose={vi.fn()} />);
  const input = screen.getByPlaceholderText('onboardingFieldsAiInputPlaceholder');
  fireEvent.change(input, { target: { value: 'add notes' } });
  fireEvent.keyDown(input, { key: 'Enter' });
  await waitFor(() => expect(globalThis.fetch).toHaveBeenCalled());
  const [, init] = vi.mocked(globalThis.fetch).mock.calls[0] as [string, RequestInit];
  return JSON.parse(String(init.body));
}

describe('AIChatMode — idioma da UI vai na mensagem', () => {
  beforeEach(() => {
    globalThis.fetch = vi.fn().mockResolvedValue({ ok: true, status: 200, statusText: 'OK', text: async () => JSON.stringify(ok) }) as unknown as typeof fetch;
  });

  it('UI em inglês: locale "en"', async () => {
    language = 'en-US';
    expect(await enviar()).toMatchObject({ kind: 'message', message: 'add notes', locale: 'en' });
  });

  it('UI em português: locale "pt"', async () => {
    language = 'pt-BR';
    expect(await enviar()).toMatchObject({ kind: 'message', locale: 'pt' });
  });
});

import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup, act, waitFor } from '@testing-library/react';

(globalThis as unknown as { React: typeof React }).React = React;

const TOKEN = 'header.payload.signature';
const deleteCookie = vi.fn();

vi.mock('next/router', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), events: { on: vi.fn(), off: vi.fn() }, locale: 'pt', asPath: '/' }),
}));
vi.mock('cookies-next', () => ({
  getCookie: () => TOKEN,
  deleteCookie: (...args: unknown[]) => deleteCookie(...args),
}));
vi.mock('@/lib/notifications/notify', () => ({ notify: vi.fn() }));

import { AuthProvider, useAuth } from '../AuthContext';
// Pelo caminho de uma tela: service → apiClient (o lint gate barra importar o apiClient fora de lib/services).
import { SetupService } from '../../services/setup.service';

function Status() {
  const { isAuthenticated } = useAuth();
  return <span>{isAuthenticated ? 'logado' : 'deslogado'}</span>;
}

const ME = { data: { id: 'u1', username: 'ana', email: 'a@x.com', name: 'Ana', role: 'USER', locale: 'pt', currency: 'BRL' } };

/**
 * FIX-FE-DASHBOARD — ACHADOS-2026-10-19 §3.5 item 4: sem interceptor de 401. Com o token expirado, toda chamada do
 * `apiClient` volta 401 e só vira toast genérico; a sessão só cai quando o usuário navega (o `/auth/me` do
 * `routeChangeComplete` é o único ponto que trata 401). Não há rota de refresh no servidor.
 * Esperado: um 401 numa chamada autenticada do `apiClient` encerra a sessão na hora, como o 401 do `/auth/me`
 * (cookie apagado, usuário nulo → o `withAuth` manda para o login).
 */
describe('AuthContext × apiClient — 401 encerra a sessão sem esperar navegação', () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    deleteCookie.mockReset();
  });

  it('401 numa chamada do apiClient (via SetupService) → isAuthenticated false e auth_token apagado', async () => {
    const fetchMock = vi.fn(async (url: RequestInfo | URL) =>
      String(url).endsWith('/auth/me')
        ? new Response(JSON.stringify(ME), { status: 200 })
        : new Response(JSON.stringify({ message: 'Token expirado' }), { status: 401, statusText: 'Unauthorized' }),
    );
    vi.stubGlobal('fetch', fetchMock);

    render(<AuthProvider><Status /></AuthProvider>);
    await waitFor(() => expect(screen.getByText('logado')).toBeTruthy());

    await act(async () => {
      await SetupService.getPresets().catch(() => undefined);
    });

    expect({
      estado: screen.queryByText('deslogado') ? 'deslogado' : 'logado',
      cookieApagado: deleteCookie.mock.calls.some(([name]) => name === 'auth_token'),
    }).toEqual({ estado: 'deslogado', cookieApagado: true });
  });
});

import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup, act, fireEvent, waitFor } from '@testing-library/react';

(globalThis as unknown as { React: typeof React }).React = React;

const TOKEN = 'header.payload.signature';

vi.mock('next/router', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), events: { on: vi.fn(), off: vi.fn() }, locale: 'pt', asPath: '/' }),
}));
vi.mock('cookies-next', () => ({
  getCookie: () => TOKEN,
  deleteCookie: vi.fn(),
}));

import { AuthProvider, useAuth } from '../AuthContext';

function LogoutButton() {
  const { logout } = useAuth();
  return <button onClick={() => logout()}>sair</button>;
}

/**
 * FIX-AUTH-CONTA §3.4 #4 — o logout do frontend chama POST /auth/logout sem o token: sem header
 * Authorization e sem `credentials`. A rota não é pública, então a chamada morre em 401 e o servidor
 * nunca incrementa o tokenVersion (§3.4 #3, #808) — o JWT segue válido depois do "sair".
 * O guarda aceita qualquer das duas formas de levar a sessão; não escolhe entre elas.
 */
describe('AuthContext.logout — envia a sessão ao servidor', () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it('POST /auth/logout leva Authorization: Bearer <token> ou credentials: include', async () => {
    const fetchMock = vi.fn(async (_url: RequestInfo | URL, _init?: RequestInit) => new Response(JSON.stringify({}), { status: 401 }));
    vi.stubGlobal('fetch', fetchMock);

    render(<AuthProvider><LogoutButton /></AuthProvider>);
    await act(async () => {
      fireEvent.click(screen.getByText('sair'));
    });

    await waitFor(() =>
      expect(fetchMock.mock.calls.some(([url]) => String(url).endsWith('/auth/logout'))).toBe(true),
    );
    const [, init] = fetchMock.mock.calls.find(([url]) => String(url).endsWith('/auth/logout'))!;
    const headers = new Headers(init?.headers);
    const carriesSession = headers.get('Authorization') === `Bearer ${TOKEN}` || init?.credentials === 'include';
    expect({ authorization: headers.get('Authorization'), credentials: init?.credentials ?? null, carriesSession }).toEqual(
      expect.objectContaining({ carriesSession: true }),
    );
  });
});

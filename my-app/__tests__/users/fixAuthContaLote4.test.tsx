import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup, act, fireEvent, waitFor } from '@testing-library/react';

(globalThis as unknown as { React: typeof React }).React = React;

/**
 * FIX-AUTH-CONTA lote 4 (§3.4 #7 #8 #16 do ACHADOS-2026-10-19) — guardas do frontend, com o
 * comportamento decidido pelo dono em `docs/plano/decisoes/D-2026-10-22-FIX-AUTH-CHAT-DASHBOARD.md`.
 */

const auth = vi.hoisted(() => ({
  isAuthenticated: true,
  user: { id: 'u-1', username: 'comum', email: 'comum@test.co', name: 'Comum', role: 'USER', locale: 'pt', currency: 'BRL' } as Record<string, unknown>,
}));
const userService = vi.hoisted(() => ({
  getUserById: vi.fn(async () => auth.user),
  changeRole: vi.fn(),
}));
const authService = vi.hoisted(() => ({
  login: vi.fn(async (_input: Record<string, unknown>) => ({ data: { user: auth.user, token: 'h.p.s' } })),
}));

vi.mock('next/router', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), reload: vi.fn(), query: { id: 'u-1' }, pathname: '/', locale: 'pt', asPath: '/' }),
}));
vi.mock('next-i18next', () => ({
  useTranslation: () => ({ t: (k: string, d?: unknown) => (typeof d === 'string' ? d : k), i18n: { language: 'pt', changeLanguage: vi.fn() } }),
  withTranslation: () => (C: React.ComponentType<Record<string, unknown>>) => (p: Record<string, unknown>) =>
    <C {...p} t={(k: string) => k} i18n={{ language: 'pt' }} />,
}));
vi.mock('next-i18next/serverSideTranslations', () => ({ serverSideTranslations: vi.fn() }));
vi.mock('cookies-next', () => ({ getCookie: () => 'h.p.s', setCookie: vi.fn(), deleteCookie: vi.fn() }));
vi.mock('@/lib/context/AuthContext', () => ({
  useAuth: () => ({ user: auth.isAuthenticated ? auth.user : null, isAuthenticated: auth.isAuthenticated, isLoading: false, login: vi.fn(), logout: vi.fn() }),
}));
vi.mock('@/lib/services/user.service', () => ({ UserService: userService }));
// O layout de autenticação usa matchMedia (tema); fora do que o guarda afirma.
vi.mock('@/components/layout/AuthSplitLayout', () => ({
  AuthSplitLayout: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));
vi.mock('@/lib/services/auth.service', () => ({ AuthService: authService }));

import EditUserPage from '@/pages/users/edit/[id]';
import ProfilePage from '@/pages/users/profile';
import LoginPage from '@/pages/users/login';

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  auth.isAuthenticated = true;
});

describe('§3.4 #7 — tela de edição de usuário é só de admin', () => {
  it('USER não chega a pedir GET /users/:id (o middleware nega a USER)', async () => {
    render(<EditUserPage />);
    await act(async () => {});
    expect(userService.getUserById).not.toHaveBeenCalled();
  });
});

describe('§3.4 #8 — botão "Make admin" removido do perfil', () => {
  it('o perfil de USER não oferece promover a própria conta', async () => {
    render(<ProfilePage />);
    await act(async () => {});
    expect(screen.queryByText('makeAdminButtonText')).toBeNull();
  });
});

describe('§3.4 #16 — "Lembrar-me 30 dias" chega ao servidor', () => {
  it('login com a caixa marcada envia rememberMe: true', async () => {
    auth.isAuthenticated = false; // a página de login só renderiza para visitante
    const { container } = render(<LoginPage />);
    fireEvent.change(container.querySelector('input[name="identifier"]')!, { target: { name: 'identifier', value: 'comum' } });
    fireEvent.change(container.querySelector('input[name="password"]')!, { target: { name: 'password', value: 'Passw0rd!' } });
    fireEvent.click(container.querySelector('input[type="checkbox"]')!);
    await act(async () => {
      fireEvent.submit(container.querySelector('form')!);
    });
    await waitFor(() => expect(authService.login).toHaveBeenCalled());
    expect(authService.login.mock.calls[0][0]).toEqual(expect.objectContaining({ rememberMe: true }));
  });
});

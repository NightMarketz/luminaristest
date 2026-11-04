import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup, act, fireEvent, waitFor } from '@testing-library/react';

(globalThis as unknown as { React: typeof React }).React = React;

/**
 * H2 C7 achado 21-1 (03/11, PR #982): o servidor exige `currentPassword` para trocar o próprio e-mail ou a senha
 * (FIX-AUTH-CONTA §3.4 #6, `UserService.updateUser`), mas a tela de perfil não tinha o campo — toda troca morria.
 * Guarda: trocar o e-mail no perfil envia a senha atual digitada no PUT.
 */

const auth = vi.hoisted(() => ({
  user: { id: 'u-1', username: 'comum', email: 'comum@test.co', name: 'Comum', role: 'USER', locale: 'pt', currency: 'BRL' } as Record<string, unknown>,
}));
const userService = vi.hoisted(() => ({
  updateProfile: vi.fn(async (_id: string, data: Record<string, unknown>) => ({ ...auth.user, ...data })),
  updatePreferences: vi.fn(),
}));

vi.mock('next/router', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), reload: vi.fn(), query: {}, pathname: '/users/profile', locale: 'pt', asPath: '/users/profile' }),
}));
vi.mock('next-i18next', () => ({
  useTranslation: () => ({ t: (k: string, d?: unknown) => (typeof d === 'string' ? d : k), i18n: { language: 'pt', changeLanguage: vi.fn() } }),
}));
vi.mock('next-i18next/serverSideTranslations', () => ({ serverSideTranslations: vi.fn() }));
vi.mock('cookies-next', () => ({ getCookie: () => 'h.p.s', setCookie: vi.fn(), deleteCookie: vi.fn() }));
vi.mock('@/lib/context/AuthContext', () => ({
  useAuth: () => ({ user: auth.user, isAuthenticated: true, isLoading: false, login: vi.fn(), logout: vi.fn() }),
}));
vi.mock('@/lib/services/user.service', () => ({ UserService: userService }));

import ProfilePage from '@/pages/users/profile';

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('perfil — troca de e-mail leva a senha atual (H2 21-1)', () => {
  it('o PUT de troca de e-mail envia currentPassword', async () => {
    const { container } = render(<ProfilePage />);
    await act(async () => {});
    fireEvent.change(container.querySelector('input[name="email"]')!, { target: { name: 'email', value: 'novo@test.co' } });

    const current = screen.queryByLabelText(/senha atual/i);
    expect(current, 'a tela de perfil não tem o campo "Senha atual" que o servidor exige').not.toBeNull();
    fireEvent.change(current!, { target: { name: 'currentPassword', value: 'OldPass1' } });

    await act(async () => {
      fireEvent.submit(container.querySelector('form')!);
    });
    await waitFor(() => expect(userService.updateProfile).toHaveBeenCalled());
    expect(userService.updateProfile.mock.calls[0][1]).toEqual(
      expect.objectContaining({ email: 'novo@test.co', currentPassword: 'OldPass1' }),
    );
  });
});

import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup, act, fireEvent } from '@testing-library/react';

(globalThis as unknown as { React: typeof React }).React = React;

/**
 * L-20261113-152227-ccc8: salvar preferências troca o `actor` no AuthContext (login(...)); o useEffect que copiava
 * actor → formData apagava nome/e-mail digitados e ainda não salvos. Guarda: troca de objeto do mesmo usuário não
 * reescreve o rascunho; os selects de idioma e moeda têm label associado.
 */

const auth = vi.hoisted(() => ({
  user: { id: 'u-1', username: 'comum', email: 'comum@test.co', name: 'Comum', role: 'USER', locale: 'pt', currency: 'BRL' } as Record<string, unknown>,
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
vi.mock('@/lib/services/user.service', () => ({ UserService: { updateProfile: vi.fn(), updatePreferences: vi.fn() } }));

import ProfilePage from '@/pages/users/profile';

afterEach(() => cleanup());

describe('perfil — rascunho sobrevive à troca do actor', () => {
  it('nome digitado não é apagado quando o actor muda de referência (preferências salvas)', async () => {
    const { container, rerender } = render(<ProfilePage />);
    await act(async () => {});
    const name = container.querySelector('input[name="name"]') as HTMLInputElement;
    fireEvent.change(name, { target: { name: 'name', value: 'Nome editado' } });
    expect(name.value).toBe('Nome editado');

    auth.user = { ...auth.user, locale: 'en', currency: 'USD' };
    rerender(<ProfilePage />);
    await act(async () => {});

    expect((container.querySelector('input[name="name"]') as HTMLInputElement).value).toBe('Nome editado');
  });

  it('selects de idioma e moeda têm nome acessível', async () => {
    render(<ProfilePage />);
    await act(async () => {});
    expect(screen.getByLabelText('Idioma')).toBeInTheDocument();
    expect(screen.getByLabelText('Moeda')).toBeInTheDocument();
  });
});

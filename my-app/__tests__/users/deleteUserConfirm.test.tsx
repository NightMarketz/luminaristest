import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react';

(globalThis as unknown as { React: typeof React }).React = React;

/**
 * L-20261113-153617-f697: o botão de excluir usuário era só ícone (sem nome acessível, title com chave i18n crua) e a
 * confirmação era window.confirm genérico. Guarda: o botão diz qual usuário, a confirmação é o ConfirmModal e só
 * confirmar chama o DELETE.
 */

const userSvc = vi.hoisted(() => ({ getUsers: vi.fn(), deleteUser: vi.fn() }));
const i18n = vi.hoisted(() => ({
  value: {
    t: (k: string, d?: unknown) => (typeof d === 'string' ? d : k),
    i18n: { language: 'pt' },
  },
}));

vi.mock('next/router', () => ({ useRouter: () => ({ push: vi.fn(), replace: vi.fn(), query: {}, pathname: '/', locale: 'pt', asPath: '/' }) }));
vi.mock('next-i18next', () => ({ useTranslation: () => i18n.value, Trans: ({ children }: { children?: React.ReactNode }) => <>{children}</> }));
vi.mock('next-i18next/serverSideTranslations', () => ({ serverSideTranslations: vi.fn() }));
vi.mock('cookies-next', () => ({ getCookie: () => 'h.p.s', setCookie: vi.fn(), deleteCookie: vi.fn() }));
vi.mock('../../lib/hoc/withAuth', () => ({ default: (C: unknown) => C }));
vi.mock('../../lib/context/AuthContext', () => ({ useAuth: () => ({ user: { id: 'me', role: 'ADMIN' }, isAuthenticated: true, isLoading: false }) }));
vi.mock('../../lib/services/user.service', () => ({ UserService: userSvc }));

import UsersPage from '../../pages/users/index';

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('usuários — excluir', () => {
  it('o botão nomeia o usuário; confirmar pelo modal canônico chama o DELETE; window.confirm não é usado', async () => {
    const nativeConfirm = vi.spyOn(window, 'confirm');
    userSvc.getUsers.mockResolvedValue({
      data: [{ id: 'u2', name: 'Maria', email: 'm@x.co', username: 'maria', role: 'USER' }],
      pagination: { page: 1, totalPages: 1, totalCount: 1 },
    });
    userSvc.deleteUser.mockResolvedValue({});
    render(<UsersPage />);
    const del = await screen.findByRole('button', { name: /userCardDeleteUser: Maria/ });
    fireEvent.click(del);
    expect(await screen.findByRole('dialog')).toBeInTheDocument();
    expect(userSvc.deleteUser).not.toHaveBeenCalled();
    expect(nativeConfirm).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
    await waitFor(() => expect(userSvc.deleteUser).toHaveBeenCalledWith('u2'));
  });
});

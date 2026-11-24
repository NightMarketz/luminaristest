import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react';

(globalThis as unknown as { React: typeof React }).React = React;

/**
 * L-20261113-152223-e69d: erro de carga sem retry em /users ("Go to Homepage" apenas) e em /documents (só o texto do
 * erro). Guarda: o erro vem como role=alert com "Try again" que refaz a busca e, funcionando, lista os itens.
 */

const userSvc = vi.hoisted(() => ({ getUsers: vi.fn(), deleteUser: vi.fn() }));
const docSvc = vi.hoisted(() => ({ getDocuments: vi.fn(), deleteDocument: vi.fn() }));

vi.mock('next/router', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), query: {}, pathname: '/', locale: 'pt', asPath: '/' }),
}));
// `t` estável: a página de usuários refaz a busca quando a identidade de `t` muda
const i18n = vi.hoisted(() => ({
  value: {
    t: (k: string, d?: unknown) => (typeof d === 'string' ? d : (d as { defaultValue?: string })?.defaultValue ?? k),
    i18n: { language: 'pt' },
  },
}));
vi.mock('next-i18next', () => ({
  useTranslation: () => i18n.value,
  Trans: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
}));
vi.mock('next-i18next/serverSideTranslations', () => ({ serverSideTranslations: vi.fn() }));
vi.mock('cookies-next', () => ({ getCookie: () => 'h.p.s', setCookie: vi.fn(), deleteCookie: vi.fn() }));
vi.mock('@/lib/hoc/withAuth', () => ({ default: (C: unknown) => C }));
vi.mock('../lib/hoc/withAuth', () => ({ default: (C: unknown) => C }));
vi.mock('../lib/context/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'me', role: 'ADMIN' }, isAuthenticated: true, isLoading: false }),
}));
vi.mock('../lib/services/user.service', () => ({ UserService: userSvc }));
vi.mock('../lib/services/document.service', () => ({ DocumentService: docSvc }));

import UsersPage from '../pages/users/index';
import DocumentsPage from '../pages/documents/index';

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('listas — erro de carga tem retry', () => {
  it('/users: falha → alerta + Try again → lista', async () => {
    userSvc.getUsers
      .mockRejectedValueOnce(new Error('boom'))
      .mockResolvedValue({ data: [{ id: 'u2', name: 'Maria', email: 'm@x.co', username: 'maria', role: 'USER' }], pagination: { page: 1, totalPages: 1, totalCount: 1 } });
    render(<UsersPage />);
    expect(await screen.findByRole('alert')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    await waitFor(() => expect(screen.getByText('Maria')).toBeInTheDocument());
    expect(userSvc.getUsers).toHaveBeenCalledTimes(2);
  });

  it('/documents: falha → alerta + Try again → refaz a busca', async () => {
    docSvc.getDocuments.mockRejectedValueOnce(new Error('boom')).mockResolvedValue({ data: { documents: [] } });
    render(<DocumentsPage />);
    expect(await screen.findByRole('alert')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    await waitFor(() => expect(screen.queryByRole('alert')).toBeNull());
    expect(docSvc.getDocuments).toHaveBeenCalledTimes(2);
  });
});

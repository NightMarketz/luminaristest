import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';

(globalThis as unknown as { React: typeof React }).React = React;

/**
 * L-20261113-152226-0690: /accounting fazia auth própria (efeito + redirect) em vez de withAuth. Guarda: a página é
 * protegida pelo HOC canônico — sem sessão não monta a contabilidade e manda ao login.
 */
const auth = vi.hoisted(() => ({ isAuthenticated: false, isLoading: false, user: null as null | { id: string; role: string } }));
const push = vi.hoisted(() => vi.fn());
const replace = vi.hoisted(() => vi.fn());

vi.mock('next/router', () => ({ useRouter: () => ({ push, replace, query: {}, pathname: '/accounting', locale: 'pt', asPath: '/accounting' }) }));
vi.mock('next/head', () => ({ default: () => null }));
vi.mock('next-i18next', () => ({ useTranslation: () => ({ t: (_k: string, d?: string) => d ?? _k }) }));
vi.mock('next-i18next/serverSideTranslations', () => ({ serverSideTranslations: vi.fn() }));
vi.mock('../lib/context/AuthContext', () => ({ useAuth: () => auth }));
vi.mock('../features/accounting/AccountingView', () => ({ AccountingView: () => <div data-testid="accounting-view" /> }));

import AccountingPage from '../pages/accounting/index';

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('/accounting — withAuth', () => {
  it('sem sessão: não renderiza a contabilidade e redireciona ao login', () => {
    auth.isAuthenticated = false;
    auth.user = null;
    render(<AccountingPage />);
    expect(screen.queryByTestId('accounting-view')).toBeNull();
    // withAuth redireciona com router.push; a auth própria antiga usava router.replace
    expect(push).toHaveBeenCalledWith('/users/login');
    expect(replace).not.toHaveBeenCalled();
  });

  it('autenticado: renderiza a contabilidade', () => {
    auth.isAuthenticated = true;
    auth.user = { id: 'u1', role: 'USER' };
    render(<AccountingPage />);
    expect(screen.getByTestId('accounting-view')).toBeInTheDocument();
  });
});

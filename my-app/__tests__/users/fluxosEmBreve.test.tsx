import React from 'react';
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';

(globalThis as unknown as { React: typeof React }).React = React;

/**
 * L-20261113-152230-7a0d (dono, 13/11/2026: manter visível com aviso "Em breve"): "Esqueceu a senha?" era href="#" e
 * confirmar assinatura só fechava o modal. Guarda: os dois dizem, em aviso, que ainda não existem.
 */
vi.mock('next/router', () => ({ useRouter: () => ({ push: vi.fn(), replace: vi.fn(), query: {}, pathname: '/', locale: 'pt', asPath: '/' }) }));
vi.mock('next-i18next', () => ({
  useTranslation: () => ({ t: (k: string, d?: unknown) => (typeof d === 'string' ? d : k), i18n: { language: 'pt' } }),
}));
vi.mock('next-i18next/serverSideTranslations', () => ({ serverSideTranslations: vi.fn() }));
vi.mock('cookies-next', () => ({ getCookie: () => undefined, setCookie: vi.fn(), deleteCookie: vi.fn() }));
vi.mock('../../lib/hoc/withAuth', () => ({ default: (C: unknown) => C }));
vi.mock('../../lib/context/AuthContext', () => ({ useAuth: () => ({ user: { id: 'u1', role: 'USER' }, isAuthenticated: false, isLoading: false, login: vi.fn() }) }));
vi.mock('../../lib/services/auth.service', () => ({ AuthService: { login: vi.fn() } }));
vi.mock('../../components/layout/AuthSplitLayout', () => ({ AuthSplitLayout: ({ children }: { children: React.ReactNode }) => <div>{children}</div> }));

import LoginPage from '../../pages/users/login';
import SubscriptionPage from '../../pages/users/subscription';

const Login = LoginPage as unknown as React.ComponentType;
const Subscription = SubscriptionPage as unknown as React.ComponentType;

let notices: Array<{ message: string; type?: string }>;
const onNotify = (e: Event) => notices.push((e as CustomEvent).detail);
beforeEach(() => {
  notices = [];
  window.addEventListener('app:notify', onNotify);
});
afterEach(() => {
  window.removeEventListener('app:notify', onNotify);
  cleanup();
});

describe('fluxos ainda inexistentes avisam "em breve"', () => {
  it('login: "Esqueceu a senha?" é botão e avisa que a recuperação não existe', () => {
    render(<Login />);
    const el = screen.getByText('Esqueceu a senha?');
    expect(el.tagName).toBe('BUTTON');
    fireEvent.click(el);
    expect(notices).toHaveLength(1);
    expect(notices[0].message).toMatch(/recuperação de senha/);
  });

  it('assinatura: confirmar avisa que a contratação não está disponível', () => {
    render(<Subscription />);
    fireEvent.click(screen.getAllByText('Assinar Agora')[0]);
    fireEvent.click(screen.getByText('Confirmar'));
    expect(notices.some((n) => /ainda não está disponível/.test(n.message))).toBe(true);
  });
});

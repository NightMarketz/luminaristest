import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react';

(globalThis as unknown as { React: typeof React }).React = React;

/**
 * L-20261113-152222-df3a: qualquer resposta >= 400 da carga SSR do dashboard (inclusive 500) redirecionava a
 * /users/login, que devolve o usuário logado a "/" e esconde o erro; a barra lateral trocava a navegação por
 * "Error loading." sem retry. Guarda: 500 vira estado de erro com "tentar de novo"; 401 continua indo ao login.
 */

const router = vi.hoisted(() => ({ replace: vi.fn(), push: vi.fn(), query: {}, isReady: true, pathname: '/dashboard', asPath: '/dashboard' }));
const svc = vi.hoisted(() => ({ getTablesSsr: vi.fn(), getSidebar: vi.fn(), getTables: vi.fn(), deleteSystem: vi.fn() }));

vi.mock('next-i18next', () => ({
  useTranslation: () => ({ t: (k: string, d?: unknown) => (typeof d === 'string' ? d : k), i18n: { language: 'pt' } }),
}));
vi.mock('next-i18next/serverSideTranslations', () => ({ serverSideTranslations: vi.fn(async () => ({})) }));
vi.mock('next/router', () => ({ useRouter: () => router }));
vi.mock('next/head', () => ({ default: () => null }));
vi.mock('next/dynamic', () => ({ default: () => () => <div /> }));
vi.mock('cookies-next', () => ({ getCookie: vi.fn(), deleteCookie: vi.fn() }));
vi.mock('../../lib/context/AuthContext', () => ({ useAuth: () => ({ user: { id: 'u1' }, isLoading: false }) }));
vi.mock('../../lib/services/dynamic-table.service', () => ({ DynamicTableService: svc }));
vi.mock('../../features/dev/seed', () => ({ runDevSeed: vi.fn() }));
vi.mock('../../features/dashboard/components/DashboardOverview', () => ({ default: () => null }));

import DashboardPage, { getServerSideProps } from '../../pages/dashboard/index';
import { DashboardSidebar } from '../../features/dashboard/DashboardSidebar';

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

function ctx() {
  return { req: { headers: { cookie: 'auth_token=abc' } }, res: {}, locale: 'pt' } as never;
}

describe('dashboard — erro de carga', () => {
  it('SSR: API 500 não redireciona ao login; devolve loadError', async () => {
    svc.getTablesSsr.mockRejectedValue({ status: 500 });
    const out = (await getServerSideProps(ctx())) as { props?: Record<string, unknown>; redirect?: unknown };
    expect(out.redirect).toBeUndefined();
    expect(out.props).toMatchObject({ allTables: [], loadError: 500 });
  });

  it('SSR: 401 continua indo ao login', async () => {
    svc.getTablesSsr.mockRejectedValue({ status: 401 });
    const out = (await getServerSideProps(ctx())) as { redirect?: { destination: string } };
    expect(out.redirect?.destination).toBe('/users/login');
  });

  it('página com loadError mostra o alerta e "Try again" recarrega a rota', () => {
    render(<DashboardPage allTables={[]} loadError={500} />);
    expect(screen.getByRole('alert')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(router.replace).toHaveBeenCalledWith('/dashboard');
  });

  it('barra lateral: erro mostra "Try again" que refaz a busca e some o erro', async () => {
    svc.getSidebar.mockRejectedValueOnce(new Error('x')).mockResolvedValue({ data: [] });
    render(<DashboardSidebar onSelectCategory={() => {}} selectedCategory={null} />);
    const retry = await screen.findByRole('button', { name: 'Try again' });
    fireEvent.click(retry);
    await waitFor(() => expect(screen.queryByRole('button', { name: 'Try again' })).toBeNull());
    expect(svc.getSidebar).toHaveBeenCalledTimes(2);
  });
});

import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

(globalThis as unknown as { React: typeof React }).React = React;
// Tradutor que marca a chave: se o texto vier fixo em português, o teste vê.
const i18nStable = { t: (k: string) => `T:${k}` };
vi.mock('next-i18next', () => ({ useTranslation: () => i18nStable }));

import ErrorBoundary from '../ErrorBoundary';
import LoadingSpinner from '../../ui/feedback/LoadingSpinner';

// L-20261113-152231-9ee0 (parte compartilhada): textos fixos em pt com a UI em en.
describe('textos compartilhados passam pelo i18n', () => {
  it('ErrorBoundary: título, corpo e botão traduzidos', () => {
    const Boom = () => { throw new Error('x'); };
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    render(<ErrorBoundary><Boom /></ErrorBoundary>);
    spy.mockRestore();
    expect(screen.getByRole('heading')).toHaveTextContent('T:errorBoundary.title');
    expect(screen.getByRole('button', { name: 'T:errorBoundary.retry' })).toBeInTheDocument();
  });
  it('LoadingSpinner: texto para leitor de tela traduzido', () => {
    render(<LoadingSpinner />);
    expect(screen.getByRole('status')).toHaveTextContent('T:loading');
  });
  it('Navbar: nenhum texto/aria-label fixo (só via t())', () => {
    const src = readFileSync(join(__dirname, '..', '..', '..', 'components/layout/Navbar.tsx'), 'utf8');
    expect(src).not.toMatch(/>\s*(Minha Dashboard|Contabilidade)\s*</);
    expect(src).not.toMatch(/(^|[ 	])(Minha Dashboard|Contabilidade)[ 	]*$/m);
    expect(src).not.toMatch(/aria-label="(Change language|User menu)"/);
  });
  it('useConfirmModal: aviso de falha e título vêm de t()', () => {
    const src = readFileSync(join(__dirname, '..', '..', '..', 'components/ui/feedback/useConfirmModal.ts'), 'utf8');
    expect(src).not.toMatch(/: 'Não foi possível concluir a ação\.', 'error', 'Erro'/);
    expect(src).toContain("useTranslation");
  });
});

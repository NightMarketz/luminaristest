import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react';

(globalThis as unknown as { React: typeof React }).React = React;

/**
 * L-20261113-152225-2bc6: o input file era `hidden` (fora da ordem de Tab) e a escolha de propósito era <div onClick>.
 * Guarda: input de arquivo focável (não display:none), propósito é radiogroup navegável, e falha na estimativa de
 * tokens deixa de mostrar "A calcular..." para sempre.
 */

const svc = vi.hoisted(() => ({ getTokenCost: vi.fn(), uploadDocument: vi.fn() }));
vi.mock('next/router', () => ({ useRouter: () => ({ push: vi.fn(), query: {}, locale: 'pt' }) }));
vi.mock('next-i18next', () => ({
  useTranslation: () => ({ t: (k: string, d?: unknown) => (typeof d === 'string' ? d : (d as { defaultValue?: string })?.defaultValue ?? k) }),
}));
vi.mock('next-i18next/serverSideTranslations', () => ({ serverSideTranslations: vi.fn() }));
vi.mock('@/lib/hoc/withAuth', () => ({ default: (C: unknown) => C }));
vi.mock('../lib/hoc/withAuth', () => ({ default: (C: unknown) => C }));
vi.mock('../lib/services/document.service', () => ({ DocumentService: svc }));

import DocumentCreatePage from '../pages/documents/create';

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('documents/create — teclado e estimativa', () => {
  it('o input de arquivo não é display:none (entra na ordem de Tab)', () => {
    const { container } = render(<DocumentCreatePage />);
    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    expect(input.className).not.toMatch(/\bhidden\b/);
    expect(input.tabIndex).not.toBe(-1);
  });

  it('o propósito é um radiogroup com dois radios; escolher muda o valor', () => {
    render(<DocumentCreatePage />);
    const group = screen.getByRole('radiogroup');
    expect(group).toBeInTheDocument();
    const radios = screen.getAllByRole('radio');
    expect(radios).toHaveLength(2);
    fireEvent.click(radios[1]);
    expect(radios[1]).toBeChecked();
  });

  it('falha na estimativa de tokens não deixa "A calcular..." para sempre', async () => {
    svc.getTokenCost.mockRejectedValue(new Error('x'));
    const { container } = render(<DocumentCreatePage />);
    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [new File(['a'], 'a.pdf', { type: 'application/pdf' })] } });
    await waitFor(() => expect(screen.queryByText('A calcular...')).toBeNull());
    expect(screen.getByText(/Não foi possível estimar/)).toBeInTheDocument();
  });
});

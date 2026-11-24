import React from 'react';
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { render, screen, cleanup, act, fireEvent } from '@testing-library/react';

(globalThis as unknown as { React: typeof React }).React = React;

vi.mock('next-i18next', () => ({ useTranslation: () => ({ t: (_k: string, d?: string) => d ?? _k }) }));

import { Toast } from '../Toast';

// L-20261113-152224-7cfa: erro de API só chegava por toast sem aria-live/role (leitor de tela não ouvia), sumia em 5 s
// fixos (erro incluso) e o botão de fechar não tinha nome.

beforeEach(() => vi.useFakeTimers());
afterEach(() => {
  vi.useRealTimers();
  cleanup();
});

describe('Toast — a11y', () => {
  it('erro tem role=alert; sucesso tem role=status', () => {
    const { rerender } = render(<Toast id="1" type="error" message="Falhou" onClose={() => {}} />);
    expect(screen.getByRole('alert')).toHaveTextContent('Falhou');
    rerender(<Toast id="1" type="success" message="Salvo" onClose={() => {}} />);
    expect(screen.getByRole('status')).toHaveTextContent('Salvo');
  });

  it('o botão de fechar tem nome acessível', () => {
    render(<Toast id="1" type="info" message="x" onClose={() => {}} />);
    expect(screen.getByRole('button', { name: 'Close' })).toBeInTheDocument();
  });

  it('erro não some sozinho; sucesso some depois de 5 s', async () => {
    const onErr = vi.fn();
    const onOk = vi.fn();
    render(<Toast id="e" type="error" message="Falhou" onClose={onErr} />);
    render(<Toast id="s" type="success" message="Salvo" onClose={onOk} />);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(7000);
    });
    expect(onErr).not.toHaveBeenCalled();
    expect(onOk).toHaveBeenCalledTimes(1);
  });

  it('o ponteiro sobre o toast pausa o fechamento automático', async () => {
    const onClose = vi.fn();
    render(<Toast id="s" type="success" message="Salvo" onClose={onClose} />);
    fireEvent.mouseEnter(screen.getByRole('status'));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(9000);
    });
    expect(onClose).not.toHaveBeenCalled();
  });
});

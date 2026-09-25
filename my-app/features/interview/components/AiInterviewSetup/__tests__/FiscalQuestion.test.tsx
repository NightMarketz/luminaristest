import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

// X13 PR-3 item 20 — pergunta fechada de regime/porte no fim da entrevista.
vi.mock('next-i18next', () => ({ useTranslation: () => ({ t: (k: string) => k }) }));

import FiscalQuestion from '../FiscalQuestion';

describe('FiscalQuestion (X13 PR-3 item 20)', () => {
  it('lista os 4 regimes + "não sei"; o botão só habilita com regime escolhido', () => {
    const onConfirm = vi.fn();
    render(<FiscalQuestion onConfirm={onConfirm} />);
    for (const r of ['MEI', 'SIMPLES', 'PRESUMIDO', 'REAL', 'NAO_SEI']) expect(screen.getByLabelText(`fiscalRegime_${r}`)).toBeInTheDocument();
    const botao = screen.getByRole('button', { name: 'fiscalCreateButton' });
    expect(botao).toBeDisabled();
    fireEvent.click(botao);
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('confirma com o regime e o porte escolhidos; porte não respondido segue como null ("não sei")', () => {
    const onConfirm = vi.fn();
    render(<FiscalQuestion onConfirm={onConfirm} />);
    fireEvent.click(screen.getByLabelText('fiscalRegime_MEI'));
    fireEvent.click(screen.getByRole('button', { name: 'fiscalCreateButton' }));
    expect(onConfirm).toHaveBeenLastCalledWith({ regime: 'MEI', grandePorte: null });

    fireEvent.click(screen.getByLabelText('fiscalRegime_REAL'));
    fireEvent.click(screen.getByLabelText('fiscalPorte_sim'));
    fireEvent.click(screen.getByRole('button', { name: 'fiscalCreateButton' }));
    expect(onConfirm).toHaveBeenLastCalledWith({ regime: 'REAL', grandePorte: true });
  });
});

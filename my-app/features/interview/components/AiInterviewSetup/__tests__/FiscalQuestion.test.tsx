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
    // I4 PR-4 (F-I4-7 a): em REAL a pergunta de ICMS aparece; não respondida segue como null ("não sei")
    expect(onConfirm).toHaveBeenLastCalledWith({ regime: 'REAL', grandePorte: true, icmsContribuinte: null });
  });

  it('I4 PR-4 (F-I4-7 a): a pergunta de ICMS aparece só em PRESUMIDO/REAL e vai como icmsContribuinte true/false/null', () => {
    const onConfirm = vi.fn();
    render(<FiscalQuestion onConfirm={onConfirm} />);
    expect(screen.queryByText('fiscalIcmsLabel')).not.toBeInTheDocument();

    for (const r of ['MEI', 'SIMPLES', 'NAO_SEI']) {
      fireEvent.click(screen.getByLabelText(`fiscalRegime_${r}`));
      expect(screen.queryByText('fiscalIcmsLabel')).not.toBeInTheDocument();
    }
    for (const r of ['PRESUMIDO', 'REAL']) {
      fireEvent.click(screen.getByLabelText(`fiscalRegime_${r}`));
      expect(screen.getByText('fiscalIcmsLabel')).toBeInTheDocument();
    }

    fireEvent.click(screen.getByLabelText('fiscalRegime_PRESUMIDO'));
    for (const [opcao, valor] of [['sim', true], ['nao', false], ['naoSei', null]] as const) {
      fireEvent.click(screen.getByLabelText(`fiscalIcms_${opcao}`));
      fireEvent.click(screen.getByRole('button', { name: 'fiscalCreateButton' }));
      expect(onConfirm).toHaveBeenLastCalledWith({ regime: 'PRESUMIDO', grandePorte: null, icmsContribuinte: valor });
    }

    // respondeu ICMS e trocou para um regime sem a pergunta ⇒ o campo não vai (o servidor força false no MEI/Simples)
    fireEvent.click(screen.getByLabelText('fiscalIcms_sim'));
    fireEvent.click(screen.getByLabelText('fiscalRegime_SIMPLES'));
    fireEvent.click(screen.getByRole('button', { name: 'fiscalCreateButton' }));
    expect(onConfirm).toHaveBeenLastCalledWith({ regime: 'SIMPLES', grandePorte: null });
  });
});

import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

// W3 FE-INCR-W3-CHOICE itens 7, 8, 9, 10, 11, 12 (BRIEF WIZARD-W3-ESCOLHA-CRIACAO).
vi.mock('next-i18next', () => ({ useTranslation: () => ({ t: (k: string) => k }) }));

import CreationChoice from '../CreationChoice';
import type { CreationChoiceReason } from '../../../types/InterviewTypes';

const prompt = (reason: CreationChoiceReason) => ({ kind: 'creation_type' as const, reason });
const setup = (reason: CreationChoiceReason, disabled = false) => {
  const onChoose = vi.fn();
  const utils = render(<CreationChoice prompt={prompt(reason)} presetKey="salon" disabled={disabled} onChoose={onChoose} />);
  return { onChoose, ...utils };
};

describe('CreationChoice (W3 FE)', () => {
  it('item 7: mostra os dois botões', () => {
    setup('initial');
    expect(screen.getByRole('button', { name: 'choiceCreateNow' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'choiceCustomize' })).toBeInTheDocument();
  });

  it('item 8: Customizar envia direto, sem modal', () => {
    const { onChoose } = setup('initial');
    fireEvent.click(screen.getByRole('button', { name: 'choiceCustomize' }));
    expect(onChoose).toHaveBeenCalledTimes(1);
    expect(onChoose).toHaveBeenCalledWith('customize');
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('item 9: Criar abre o modal; Voltar não envia; Confirmar envia create', () => {
    const { onChoose } = setup('initial');
    fireEvent.click(screen.getByRole('button', { name: 'choiceCreateNow' }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(onChoose).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'choiceBack' }));
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(onChoose).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'choiceCreateNow' }));
    fireEvent.click(screen.getByRole('button', { name: 'choiceConfirm' }));
    expect(onChoose).toHaveBeenCalledTimes(1);
    expect(onChoose).toHaveBeenCalledWith('create');
  });

  it('item 10: modal da negação abre sozinho só em declined_customize; botões enviam create/customize sem 2º modal', () => {
    const { onChoose } = setup('declined_customize');
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'choiceCreateShort' }));
    expect(onChoose).toHaveBeenLastCalledWith('create');
    fireEvent.click(screen.getByRole('button', { name: 'choiceCustomizeAnyway' }));
    expect(onChoose).toHaveBeenLastCalledWith('customize');
    expect(onChoose).toHaveBeenCalledTimes(2);
    expect(screen.getAllByRole('dialog')).toHaveLength(1);
  });

  it.each(['initial', 'unclear', 'error'] as const)('itens 10/11: reason=%s não abre modal e mantém os botões', (reason) => {
    setup(reason);
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(screen.getByRole('button', { name: 'choiceCreateNow' })).toBeEnabled();
  });

  it('item 12: com disabled os botões não disparam', () => {
    const { onChoose } = setup('unclear', true);
    expect(screen.getByRole('button', { name: 'choiceCreateNow' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'choiceCustomize' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'choiceCustomize' }));
    expect(onChoose).not.toHaveBeenCalled();
  });
});

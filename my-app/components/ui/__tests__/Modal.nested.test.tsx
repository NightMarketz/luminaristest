import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';

vi.mock('next-i18next', () => ({
  useTranslation: () => ({ t: (_k: string, d?: string) => d ?? _k }),
}));

import { Modal } from '../Modal';

// Lacuna (teste vivo 2026-09-25): Lead360 abre Criar Oportunidade / Converter Lead /
// Proposta / Não compareceu como Modal DENTRO de Modal. Cada Modal faz portal pro
// body, então o listener de mousedown do pai vê o clique no filho como "fora" e
// fecha o pai — o filho desmonta junto e o formulário fica impreenchível.
describe('Modal aninhado', () => {
  beforeEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('mousedown num campo do modal filho NÃO fecha o modal pai', () => {
    const closeParent = vi.fn();
    const closeChild = vi.fn();
    render(
      <Modal isOpen onClose={closeParent} title="Pai">
        <p>conteúdo do pai</p>
        <Modal isOpen onClose={closeChild} title="Filho">
          <input aria-label="valor-filho" />
        </Modal>
      </Modal>,
    );

    fireEvent.mouseDown(screen.getByLabelText('valor-filho'));

    expect(closeParent).not.toHaveBeenCalled();
    expect(closeChild).not.toHaveBeenCalled();
  });
});

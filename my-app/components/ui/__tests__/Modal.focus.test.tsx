import React, { useState } from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react';

vi.mock('next-i18next', () => ({
  useTranslation: () => ({ t: (_k: string, d?: string) => d ?? _k }),
}));

import { Modal } from '../Modal';
import { ConfirmModal } from '../feedback/ConfirmModal';

(globalThis as unknown as { React: typeof React }).React = React;

// L-20261113-152224-a0c9: o foco não entrava no diálogo (o Modal montado já aberto rodava o efeito antes do portal
// existir), não voltava ao gatilho ao fechar, o id do título era fixo (colide em Modal aninhado) e o ConfirmModal
// não movia nem prendia o foco.

function Host() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button onClick={() => setOpen(true)}>abrir</button>
      {/* montado só quando aberto — como o Lead360Modal */}
      {open && (
        <Modal isOpen onClose={() => setOpen(false)} title="Ficha">
          <input aria-label="campo" />
        </Modal>
      )}
    </>
  );
}

describe('Modal — foco', () => {
  beforeEach(() => cleanup());

  it('ao abrir, o foco entra no diálogo', async () => {
    render(<Host />);
    const trigger = screen.getByText('abrir');
    trigger.focus();
    fireEvent.click(trigger);
    const dialog = await screen.findByRole('dialog');
    await waitFor(() => expect(dialog.contains(document.activeElement)).toBe(true));
  });

  it('ao fechar (Esc), o foco volta ao gatilho', async () => {
    render(<Host />);
    const trigger = screen.getByText('abrir');
    trigger.focus();
    fireEvent.click(trigger);
    const dialog = await screen.findByRole('dialog');
    await waitFor(() => expect(dialog.contains(document.activeElement)).toBe(true));
    fireEvent.keyDown(document, { key: 'Escape' });
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(document.activeElement).toBe(trigger);
  });

  it('Modal aninhado: os dois títulos têm ids diferentes e cada diálogo aponta para o seu', () => {
    render(
      <Modal isOpen onClose={() => {}} title="Pai">
        <Modal isOpen onClose={() => {}} title="Filho">
          <input aria-label="x" />
        </Modal>
      </Modal>,
    );
    const dialogs = screen.getAllByRole('dialog');
    const ids = dialogs.map((d) => d.getAttribute('aria-labelledby'));
    expect(new Set(ids).size).toBe(2);
    expect(screen.getByRole('dialog', { name: 'Pai' })).toBeInTheDocument();
    expect(screen.getByRole('dialog', { name: 'Filho' })).toBeInTheDocument();
  });
});

describe('ConfirmModal — foco', () => {
  beforeEach(() => cleanup());

  it('o foco vai para o botão Cancelar, Tab circula dentro e fechar devolve o foco', () => {
    function C() {
      const [open, setOpen] = useState(false);
      return (
        <>
          <button onClick={() => setOpen(true)}>excluir</button>
          <ConfirmModal isOpen={open} onClose={() => setOpen(false)} onConfirm={() => {}} cancelLabel="Voltar" confirmLabel="Excluir" message="Certeza?" />
        </>
      );
    }
    render(<C />);
    const trigger = screen.getByText('excluir');
    trigger.focus();
    fireEvent.click(trigger);
    const cancel = screen.getByRole('button', { name: 'Voltar' });
    expect(document.activeElement).toBe(cancel);

    // Tab do último focável volta ao primeiro (não escapa para a página atrás)
    const confirm = screen.getByRole('button', { name: 'Excluir' });
    confirm.focus();
    fireEvent.keyDown(document, { key: 'Tab' });
    expect(document.activeElement).not.toBe(trigger);
    expect(screen.getByRole('dialog').contains(document.activeElement)).toBe(true);

    fireEvent.click(cancel);
    expect(document.activeElement).toBe(trigger);
  });
});

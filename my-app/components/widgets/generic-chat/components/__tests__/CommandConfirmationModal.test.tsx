import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const tStable = (_k: string, d?: string | Record<string, unknown>) => (typeof d === 'string' ? d : _k);
const i18nStable = { t: tStable };
vi.mock('next-i18next', () => ({ useTranslation: () => i18nStable }));

import { CommandConfirmationModal } from '../CommandConfirmationModal';

const proposal = { id: 'p1', action: 'CREATE' as const, tableName: 't', tableLabel: 'Clientes', data: { nome: 'Ana' } };

// L-20261113-152229-8df5: o modal que confirma escrita proposta pela IA não tinha nome, Esc, trap de foco,
// estado pendente nem i18n. Agora usa o Modal compartilhado.
describe('CommandConfirmationModal', () => {
  it('é um dialog nomeado (aria-labelledby aponta para um título existente)', () => {
    render(<CommandConfirmationModal isOpen onClose={() => {}} onConfirm={() => {}} proposal={proposal} />);
    const dlg = screen.getByRole('dialog');
    const id = dlg.getAttribute('aria-labelledby');
    expect(id).toBeTruthy();
    expect(document.getElementById(id!)).toHaveTextContent('Confirmar Novo Registro');
  });

  it('Esc fecha', () => {
    const onClose = vi.fn();
    render(<CommandConfirmationModal isOpen onClose={onClose} onConfirm={() => {}} proposal={proposal} />);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalled();
  });

  it('duplo clique em Confirmar aplica uma única vez e o botão fica desabilitado', async () => {
    const onConfirm = vi.fn(() => new Promise<void>(() => {}));
    render(<CommandConfirmationModal isOpen onClose={() => {}} onConfirm={onConfirm} proposal={proposal} />);
    const btn = screen.getByRole('button', { name: /Confirmar e Aplicar/ });
    fireEvent.click(btn);
    fireEvent.click(btn);
    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(btn).toBeDisabled();
  });

  it('o fonte não usa zinc-*', () => {
    const src = readFileSync(join(__dirname, '..', 'CommandConfirmationModal.tsx'), 'utf8');
    expect(src).not.toMatch(/zinc-/);
  });
});

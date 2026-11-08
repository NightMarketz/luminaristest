import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('next-i18next', () => ({
  useTranslation: () => ({ t: (_k: string, d?: string) => d ?? _k }),
}));

import { Modal } from '../Modal';

// Achado do RUNBOOK-W3-ESCOLHA-CRIACAO (06/11): o subtítulo "Formulário Administrativo" aparecia em modal de
// confirmação. O padrão continua para quem não passa `subtitle`; `null` tira a linha; string troca o texto.
describe('Modal — subtítulo', () => {
  it('sem `subtitle`: mantém "Formulário Administrativo"', () => {
    render(<Modal isOpen onClose={() => {}} title="T"><p>x</p></Modal>);
    expect(screen.getByRole('dialog')).toHaveTextContent('Formulário Administrativo');
  });

  it('`subtitle={null}`: sem linha de subtítulo', () => {
    render(<Modal isOpen onClose={() => {}} title="T" subtitle={null}><p>x</p></Modal>);
    expect(screen.getByRole('dialog')).not.toHaveTextContent('Formulário Administrativo');
  });

  it('`subtitle` string: mostra o texto dado', () => {
    render(<Modal isOpen onClose={() => {}} title="T" subtitle="Outro"><p>x</p></Modal>);
    expect(screen.getByRole('dialog')).toHaveTextContent('Outro');
  });
});

import React from 'react';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { useConfirmModal } from '../useConfirmModal';

(globalThis as unknown as { React: typeof React }).React = React;

// F1-N3 (achado do #1226): o `handleConfirm` engole o erro do `onConfirm` e só o manda ao console. O comentário
// supõe que quem chama já mostrou o toast, mas nada garante isso: um erro que não vem do apiClient (ex.: o
// `onUpdate()` depois do delete no Kanban) some sem aviso. Esperado: avisar quando ninguém avisou e não
// repetir o toast que o apiClient já mostrou (`notified`).

function Harness({ onConfirm }: { onConfirm: () => Promise<void> }) {
  const { confirm, confirmNode } = useConfirmModal();
  return (
    <>
      <button onClick={() => void confirm({ message: 'Tem certeza?', confirmLabel: 'Sim', onConfirm })}>abrir</button>
      {confirmNode}
    </>
  );
}

describe('F1-N3 — useConfirmModal não engole a falha da ação', () => {
  let notices: Array<{ message: string; type?: string }>;
  const onNotify = (e: Event) => notices.push((e as CustomEvent).detail);
  beforeEach(() => {
    notices = [];
    window.addEventListener('app:notify', onNotify);
  });
  afterEach(() => {
    window.removeEventListener('app:notify', onNotify);
    cleanup();
  });

  async function runWith(onConfirm: () => Promise<void>) {
    render(<Harness onConfirm={onConfirm} />);
    fireEvent.click(screen.getByText('abrir'));
    fireEvent.click(await screen.findByText('Sim'));
    await waitFor(() => expect(screen.getByText('Sim')).not.toBeDisabled());
  }

  it('erro que ninguém notificou vira toast de erro com o motivo', async () => {
    await runWith(async () => {
      throw new Error('falha ao recarregar o quadro');
    });
    expect(notices).toContainEqual(expect.objectContaining({ type: 'error', message: 'falha ao recarregar o quadro' }));
  });

  it('erro já notificado pelo apiClient não repete o toast', async () => {
    await runWith(async () => {
      throw Object.defineProperty(new Error('Erro 500'), 'notified', { value: true });
    });
    expect(notices).toEqual([]);
  });

  // L-20261113-152224-a0c9: a ação falhava e o diálogo fechava como se tivesse dado certo
  it('falha mantém o diálogo aberto; sucesso fecha', async () => {
    await runWith(async () => {
      throw new Error('boom');
    });
    expect(screen.getByText('Tem certeza?')).toBeInTheDocument();
    cleanup();
    render(<Harness onConfirm={async () => {}} />);
    fireEvent.click(screen.getByText('abrir'));
    fireEvent.click(await screen.findByText('Sim'));
    await waitFor(() => expect(screen.queryByText('Tem certeza?')).toBeNull());
  });
});

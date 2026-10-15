import React from 'react';
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup, act } from '@testing-library/react';
import { ToastProvider } from '../ToastContext';
import { notify } from '../../notifications/notify';

(globalThis as unknown as { React: typeof React }).React = React;

/**
 * Dedupe do toast (D-2026-10-15-FE-SIMPLES-PR-A-LACUNAS, lacuna 3): a grade do Simples dispara 12 GETs; se todos
 * falham pelo mesmo motivo, o apiClient notifica 12 vezes o mesmo texto — aparece um toast só.
 */
describe('ToastProvider — dedupe', () => {
  afterEach(cleanup);

  it('12 notificações iguais viram um toast; texto ou tipo diferente continua separado', () => {
    render(<ToastProvider><div /></ToastProvider>);
    act(() => {
      for (let i = 0; i < 12; i++) notify('Declare no perfil fiscal de 2024…', 'error', 'Erro');
      notify('Outro erro', 'error', 'Erro');
      notify('Declare no perfil fiscal de 2024…', 'warning', 'Erro');
    });
    expect(screen.getAllByText('Declare no perfil fiscal de 2024…')).toHaveLength(2);
    expect(screen.getAllByText('Outro erro')).toHaveLength(1);
  });
});

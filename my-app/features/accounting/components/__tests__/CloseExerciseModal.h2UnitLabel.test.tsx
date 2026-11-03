import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// The component does not `import React` — expose it globally for the render (my-app/CLAUDE.md).
(globalThis as unknown as { React: typeof React }).React = React;
import { render, screen, cleanup } from '@testing-library/react';
import { CloseExerciseModal } from '../CloseExerciseModal';

vi.mock('../../../../lib/services/accounting.service', () => ({
  accountingService: { closeExercise: vi.fn() },
}));

// unitId real do seed-real no H2 (29/10) — o que apareceu cru no campo Unidade.
const UNIT_ID = 'cmuw4z7zj02ehcii0st3unfr4';

// Achado (J) do H2 (RUNBOOK-H2-BROWSER-SIGNOFF passo 15, execução 29/10, build de produção de 455c1a45):
// o modal "Encerrar exercício" (aberto pelo PeriodsPanel) mostra o unitId cru no campo Unidade, em vez do nome.
// A asserção é agnóstica à forma do fix (prop com o nome vinda do PeriodsPanel/AccountingView, ou busca no
// próprio modal): o campo Unidade continua na tela e o texto dele não é o id.
// Teste-guarda: VERMELHO até a sessão de correção. Autorização: dono em chat 29/10 ("Pode disparar uma
// sessão de correção"; instrumentação antes, escolha "As duas").
describe('CloseExerciseModal — campo Unidade (achado J do H2)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    cleanup();
  });

  it('J1: o campo Unidade não mostra o unitId cru', () => {
    render(<CloseExerciseModal isOpen onClose={() => {}} unitId={UNIT_ID} year={2027} onSuccess={() => {}} />);

    // Sanidade do setup: o campo Unidade está no modal.
    const label = screen.getByText('Unidade');
    // O <dl> tem Exercício e Unidade: o valor é o <dd> irmão do rótulo, não o primeiro <dd> da lista.
    const value = label.nextElementSibling;
    expect(value?.tagName, 'o campo Unidade deve ter um valor (<dd>) ao lado do rótulo').toBe('DD');
    expect(
      value?.textContent,
      'o campo Unidade do modal "Encerrar exercício" mostra o unitId cru — deve mostrar o nome da unidade',
    ).not.toBe(UNIT_ID);
  });
});

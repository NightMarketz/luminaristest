import React from 'react';
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';

import DashboardBarComparison from '../DashboardBarComparison';

/**
 * GAP-MAP Nível 5 — barra "período anterior" FABRICADA (metade do gráfico).
 *
 * Sem `previous` no ponto, o gráfico não pode desenhar barra nem legenda "Anterior": antes do fix a prop era
 * obrigatória e o chamador a fabricava (`value * 0.8`).
 */
describe('DashboardBarComparison — sem valor anterior', () => {
  afterEach(cleanup);

  it.each([false, true])('isHorizontal=%s: não desenha barra nem legenda "Anterior" quando previous está ausente', (isHorizontal) => {
    const { container } = render(
      <DashboardBarComparison title="Receita por Tipo" data={[{ name: 'Produto', current: 1000 }, { name: 'Serviço', current: 250 }]} isHorizontal={isHorizontal} />,
    );

    expect(screen.queryByText('Anterior')).toBeNull();
    expect(container.querySelectorAll('.bg-indigo-300')).toHaveLength(0);
  });

  it('controle: com previous, desenha a legenda e uma barra anterior por ponto', () => {
    const { container } = render(
      <DashboardBarComparison title="Receita por Tipo" data={[{ name: 'Produto', current: 1000, previous: 900 }]} />,
    );

    expect(screen.getByText('Anterior')).toBeInTheDocument();
    // legenda + 1 barra
    expect(container.querySelectorAll('.bg-indigo-300')).toHaveLength(2);
  });
});

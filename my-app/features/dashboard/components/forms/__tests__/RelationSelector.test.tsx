import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// O componente não faz `import React` explícito para o runtime clássico do esbuild.
(globalThis as unknown as { React: typeof React }).React = React;
import { render, screen, cleanup, waitFor } from '@testing-library/react';
import RelationSelector from '../RelationSelector';
import { fetchRelatedTableData } from '../../shared/relation-utils.client';

vi.mock('../../shared/relation-utils.client', () => ({
  fetchRelatedTableData: vi.fn(),
  formatRelatedDisplayValue: (r: { data?: { name?: string } }) => String(r?.data?.name ?? ''),
}));

describe('RelationSelector', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    cleanup();
  });

  it('carrega a tabela alvo UMA vez (guarda da classe `t` instável)', async () => {
    vi.mocked(fetchRelatedTableData).mockResolvedValue([
      { id: 'r1', data: { name: 'Matriz' } },
      { id: 'r2', data: { name: 'Filial' } },
    ] as never);

    render(
      <RelationSelector name="unitId" value="" onChange={() => {}} targetTable="tbl-units" />,
    );

    await waitFor(() => expect(fetchRelatedTableData).toHaveBeenCalled());
    // Com `t` no dep array do useCallback, o efeito `[loadRelatedData]` re-dispara a
    // cada render e esta contagem explode. Ver lib/hooks/useStableT.
    await waitFor(() => expect(fetchRelatedTableData).toHaveBeenCalledTimes(1));
    expect(fetchRelatedTableData).toHaveBeenCalledWith('tbl-units');
  });

  it('mostra o erro traduzido quando a carga falha, sem quebrar o render', async () => {
    vi.mocked(fetchRelatedTableData).mockResolvedValue(null as never);

    render(
      <RelationSelector name="unitId" value="" onChange={() => {}} targetTable="tbl-units" />,
    );

    // O fallback inline é o que aparece sem instância i18next — provar que a troca
    // para `tRef.current` não perdeu a mensagem.
    expect(await screen.findByText('Failed to load data.')).toBeInTheDocument();
    expect(fetchRelatedTableData).toHaveBeenCalledTimes(1);
  });
});

import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup, within } from '@testing-library/react';
import { RecalcJobsSection } from '../RecalcJobsSection';
import type { RecalcJob } from '../../../../lib/services/legalParameters.service';

(globalThis as unknown as { React: typeof React }).React = React;

const listRecalcJobs = vi.fn();
vi.mock('../../../../lib/services/legalParameters.service', () => ({
  legalParametersService: { listRecalcJobs: (...a: unknown[]) => listRecalcJobs(...a) },
}));

const job = (id: string, extra: Partial<RecalcJob> = {}): RecalcJob => ({
  id, evento: 'PUBLISHED', status: 'DONE', tentativas: 1, ultimoErro: null, resumo: { reconfirmadas: 2, avisos: 1, inalteradas: 3 },
  createdAt: '2026-10-08T09:00:00.000Z', processedAt: '2026-10-08T09:01:00.000Z', legalParameterId: 'lp1-ta-irpj_aliq',
  linha: { tabela: 'TAX_ASSESSMENT', chave: 'IRPJ_ALIQ', discriminador: null, vigenteDesde: '2025-01-01', vigenteAte: null, status: 'PUBLISHED' },
  ...extra,
});

describe('RecalcJobsSection (RECALC-STATUS item 6)', () => {
  afterEach(() => { cleanup(); vi.clearAllMocks(); });

  it('lista os jobs com a linha, o status, o resultado e o último erro; linha sumida aparece como tal', async () => {
    listRecalcJobs.mockResolvedValue({ items: [job('j1'), job('j2', { status: 'PENDING', evento: 'REVOKED', resumo: null, ultimoErro: 'falhou', tentativas: 3, linha: null })], total: 2, page: 1, pageSize: 20 });
    render(<RecalcJobsSection />);
    const corpo = await screen.findByTestId('recalc-jobs');
    await waitFor(() => expect(within(corpo).getAllByRole('row')).toHaveLength(2));
    expect(within(corpo).getByText(/TAX_ASSESSMENT · IRPJ_ALIQ/)).toBeInTheDocument();
    expect(within(corpo).getByText('Concluído')).toBeInTheDocument();
    expect(within(corpo).getByText('Pendente')).toBeInTheDocument();
    expect(within(corpo).getByText(/falhou/)).toBeInTheDocument();
    expect(within(corpo).getByText('linha não encontrada')).toBeInTheDocument();
    expect(listRecalcJobs).toHaveBeenCalledWith({ page: 1, pageSize: 20 });
  });

  it('filtro por status vai ao servidor e "Atualizar" recarrega', async () => {
    listRecalcJobs.mockResolvedValue({ items: [], total: 0, page: 1, pageSize: 20 });
    render(<RecalcJobsSection />);
    expect(await screen.findByText('Nenhum recálculo.')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Status'), { target: { value: 'PENDING' } });
    await waitFor(() => expect(listRecalcJobs).toHaveBeenLastCalledWith({ status: 'PENDING', page: 1, pageSize: 20 }));
    const n = listRecalcJobs.mock.calls.length;
    fireEvent.click(screen.getByRole('button', { name: /Atualizar/ }));
    await waitFor(() => expect(listRecalcJobs.mock.calls.length).toBe(n + 1));
  });
});

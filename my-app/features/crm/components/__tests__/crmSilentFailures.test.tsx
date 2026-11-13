import React from 'react';
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { render, screen, cleanup, fireEvent, waitFor, renderHook, act } from '@testing-library/react';

(globalThis as unknown as { React: typeof React }).React = React;

/**
 * L-20261113-152228-dc12: ações do CRM que falhavam em silêncio — drag recusado pelo servidor só ia ao console;
 * "Criar oportunidade" ficava desabilitado sem motivo quando os pipelines não carregavam; "Registrar falta" ficava com
 * o botão travado após a falha.
 */

vi.mock('next-i18next', () => {
  const value = {
    t: (k: string, d?: unknown) => (typeof d === 'string' ? d : ((d as { defaultValue?: string } | undefined)?.defaultValue ?? k)),
    i18n: { language: 'pt' },
  };
  return { useTranslation: () => value };
});
const dts = vi.hoisted(() => ({ getTables: vi.fn(), getTableById: vi.fn(async () => ({ data: { schema: null } })) }));
vi.mock('../../../../lib/services/dynamic-table.service', () => ({ DynamicTableService: dts }));
vi.mock('../../../../lib/services/crm.service', () => ({ CrmService: { convertLeadToOpportunity: vi.fn() } }));
vi.mock('../../../../lib/context/AuthContext', () => ({ useAuth: () => ({ user: { id: 'u1', role: 'USER' } }) }));
vi.mock('../../../dashboard/components/shared/dynamic-tables.client', async (orig) => ({
  ...(await orig<Record<string, unknown>>()),
  fetchAllRows: vi.fn(async () => []),
}));

import { usePipelineBoard } from '../../hooks/usePipelineBoard';
import { OpportunityCreateModal } from '../OpportunityCreateModal';
import { NoShowCaptureModal } from '../NoShowCaptureModal';

let notices: Array<{ message: string; type?: string }>;
const onNotify = (e: Event) => notices.push((e as CustomEvent).detail);
beforeEach(() => {
  notices = [];
  window.addEventListener('app:notify', onNotify);
  vi.clearAllMocks();
});
afterEach(() => {
  window.removeEventListener('app:notify', onNotify);
  cleanup();
});

// referências estáveis: usePipelineBoard espelha `records` num efeito com [records]
const records = [{ id: 'r1', createdAt: '', updatedAt: '', data: { stageId: 's1', pipelineId: 'p1' } }] as never;
const stages = [
  { id: 's1', data: { name: 'A', order: 0, pipelineId: 'p1', type: 'new' } },
  { id: 's2', data: { name: 'B', order: 1, pipelineId: 'p1', type: 'qualified' } },
] as never;
const pipelines = [{ id: 'p1', data: { name: 'P' } }] as never;
const reload = async () => {};

describe('CRM — falhas deixam de ser silenciosas', () => {
  it('drag recusado pelo servidor: o card volta E o usuário é avisado', async () => {
    const advance = vi.fn().mockRejectedValue(new Error('Etapa inválida para este lead'));
    const { result } = renderHook(() =>
      usePipelineBoard({
        records,
        recordsTableId: null,
        stages,
        pipelines,
        loading: false,
        error: null,
        reload,
        advance,
        logLabel: 'T',
      }),
    );
    act(() => result.current.handleDragEnd({ active: { id: 'r1' }, over: { id: 's2' } } as never));
    await waitFor(() => expect(notices.some((n) => /Etapa inválida/.test(n.message) && n.type === 'error')).toBe(true));
    // o card voltou à etapa de origem
    await waitFor(() => expect(result.current.recordById.get('r1')?.data?.stageId).toBe('s1'));
  });

  it('Criar oportunidade: pipelines não carregam → alerta com retry (não só botão desabilitado)', async () => {
    dts.getTables.mockRejectedValueOnce(new Error('rede')).mockResolvedValue({ data: [] });
    render(<OpportunityCreateModal isOpen onClose={() => {}} leadId="l1" leadName="Acme" onCreated={() => {}} />);
    expect(await screen.findByText('Não foi possível carregar os pipelines.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }));
    await waitFor(() => expect(screen.queryByText('Não foi possível carregar os pipelines.')).toBeNull());
    expect(dts.getTables).toHaveBeenCalledTimes(2);
  });

  it('Registrar falta: depois de falhar, o botão volta a habilitar para tentar de novo', async () => {
    const onConfirm = vi.fn().mockRejectedValueOnce(new Error('x')).mockResolvedValue(undefined);
    render(<NoShowCaptureModal isOpen canRevert onConfirm={onConfirm} onCancel={() => {}} />);
    fireEvent.change(document.querySelector('input[type="datetime-local"]') as HTMLInputElement, { target: { value: '2026-12-01T10:00' } });
    const confirm = screen.getByRole('button', { name: 'Confirmar' });
    await act(async () => {
      fireEvent.click(confirm);
      await Promise.resolve().catch(() => {});
    });
    await waitFor(() => expect(screen.getByRole('button', { name: 'Confirmar' })).toBeEnabled());
  });
});

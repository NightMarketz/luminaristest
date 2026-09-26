import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';

vi.mock('../../../../lib/services/dynamic-table.service', () => ({
  DynamicTableService: { getTableById: vi.fn() },
}));
vi.mock('../../lib/crmFetch', () => ({
  fetchAllRows: vi.fn(async () => []),
}));
// usePipelineBoard → useOwnerFilter → useAuth (fora de AuthProvider lançaria no setup).
vi.mock('../../../../lib/context/AuthContext', () => ({
  useAuth: () => ({ user: null }),
}));

import { useActorNames } from '../useActorNames';
import { usePipelineBoard } from '../usePipelineBoard';
import { DynamicTableService } from '../../../../lib/services/dynamic-table.service';

const getTableById = DynamicTableService.getTableById as unknown as ReturnType<typeof vi.fn>;

const SCHEMA = {
  fields: [
    { name: 'name', label: 'Task', type: 'string' },
    { name: 'assigneeId', label: 'Assignee', type: 'relation', relation: { targetTable: 'emp' } },
    { name: 'leadId', label: 'Lead', type: 'relation', relation: { targetTable: 'leads' } },
  ],
};

// Forma REAL de GET /api/dynamic-tables/:id (capturada no teste vivo 2026-09-25):
// o apiClient não desembrulha, então o hook recebe o envelope inteiro.
const envelope = () => ({
  success: true,
  data: { id: 't1', name: 'Tasks', internalName: 'tasks', schema: SCHEMA },
});

// Lacuna: useActorNames/usePipelineBoard leem `meta.schema` do envelope → schema null →
// tarefas/notas "não disponíveis", filtro de vendedor e create do pipeline somem.
describe('schema de getTableById (envelope {success,data})', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getTableById.mockResolvedValue(envelope());
  });

  it('useActorNames expõe o schema da tabela', async () => {
    const { result } = renderHook(() => useActorNames('t1', 'assigneeId'));
    await waitFor(() => expect(getTableById).toHaveBeenCalled());
    await waitFor(() => expect(result.current.schema?.fields.map((f) => f.name) ?? []).toContain('leadId'));
  });

  it('usePipelineBoard expõe o schema da tabela de registros', async () => {
    // Config estável: arrays novos a cada render re-disparam o efeito [records] em loop.
    const config = {
      records: [],
      recordsTableId: 't1',
      stages: [],
      pipelines: [],
      loading: false,
      error: null,
      reload: async () => {},
      advance: async () => undefined,
      logLabel: 'test',
    };
    const { result } = renderHook(() => usePipelineBoard(config));
    await waitFor(() => expect(getTableById).toHaveBeenCalled());
    await waitFor(() => expect(result.current.schema?.fields.map((f) => f.name) ?? []).toContain('leadId'));
  });
});

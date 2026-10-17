/**
 * LuminarisAgentService — permissão antes da proposta (BRIEF BE-INCR-CHAT-AGENT, PR-1, itens 1–5).
 *
 * Policy REAL (`DynamicTablePolicy`) e repositório de proposta falso: o que se prova é que a
 * proposta só é gravada quando a confirmação poderia executá-la. Falsificador: remover a checagem
 * de `canManageData` do item 1 deixa (a) e (b) vermelhos.
 * PR-2 (item 9): `query_table_data` delega ao `searchTableData` e devolve `{ rows, total, returned, truncated }`.
 */
import { LuminarisAgentService } from '../LuminarisAgentService';
import { DynamicTablePolicy } from '@/features/dynamicTables/policies/DynamicTablePolicy';
import { AgentToolErrorSchema, QueryTableDataRowsSchema } from '../../models/AgentTool.model';
import { ForbiddenError, ValidationError } from '@/lib/errors';
import type { UserContext } from '@/lib/authUtils';
import { Role } from '@/features/users/models/User.model';

function makeUser(id: string, role: Role = Role.USER): UserContext {
  return {
    id, userId: id, name: id, username: id, email: `${id}@test.co`, userEmail: `${id}@test.co`,
    role, userRole: role, createdAt: new Date(), updatedAt: new Date(),
  };
}

const owner = makeUser('owner');
const admin = makeUser('admin', Role.ADMIN);

const commonTable = { id: 'tbl_sales', name: 'sales', userId: 'owner', schema: { fields: [] } };
const systemTable = { id: 'tbl_defs', name: 'analyticsDefinitions', userId: 'owner', schema: { fields: [], ui: { presentation: 'system' } } };

function makeService(table: Record<string, unknown>, rowsInTable: Array<{ id: string; dynamicTableId: string }> = []) {
  const dynamicTableService = {
    getTableById: jest.fn().mockResolvedValue(table),
    getTableDataByIds: jest.fn(async (_u: UserContext, tableId: string, ids: string[]) =>
      rowsInTable.filter(r => ids.includes(r.id) && r.dynamicTableId === tableId)),
    searchTableData: jest.fn(),
  };
  const proposalRepository = {
    create: jest.fn(async (data: Record<string, unknown>) => ({ ...data, id: 'prop_1' })),
    findById: jest.fn(), delete: jest.fn(), findByUserId: jest.fn(),
    deleteOldProposals: jest.fn(), deleteByUserId: jest.fn(),
  };
  const service = new LuminarisAgentService(dynamicTableService as any, proposalRepository as any, new DynamicTablePolicy());
  return { service, dynamicTableService, proposalRepository };
}

describe('request_record_creation — permissão antes de gravar', () => {
  it('(a) tabela system → SEM_PERMISSAO e nenhuma proposta gravada', async () => {
    const { service, proposalRepository } = makeService(systemTable);

    const res = await service.handleToolCall(owner, 'request_record_creation', { tableId: 'tbl_defs', data: { a: 1 } });

    expect(AgentToolErrorSchema.parse(res).error).toBe('SEM_PERMISSAO');
    expect(proposalRepository.create).not.toHaveBeenCalled();
  });

  it('(b) ADMIN em tabela de outro dono → SEM_PERMISSAO e nenhuma proposta gravada', async () => {
    const { service, proposalRepository } = makeService(commonTable);

    const res = await service.handleToolCall(admin, 'request_record_creation', { tableId: 'tbl_sales', data: { a: 1 } });

    expect(AgentToolErrorSchema.parse(res).error).toBe('SEM_PERMISSAO');
    expect(proposalRepository.create).not.toHaveBeenCalled();
  });

  it('(c) dono em tabela comum → PROPOSED', async () => {
    const { service, proposalRepository } = makeService(commonTable);

    const res = await service.handleToolCall(owner, 'request_record_creation', { tableId: 'tbl_sales', data: { a: 1 } });

    expect(res).toMatchObject({ status: 'PROPOSED', proposalId: 'prop_1' });
    expect(proposalRepository.create).toHaveBeenCalledWith(expect.objectContaining({ action: 'CREATE', tableId: 'tbl_sales', userId: 'owner' }));
  });

  it('data vazio → DADOS_VAZIOS no formato AgentToolError', async () => {
    const { service, proposalRepository } = makeService(commonTable);

    const res = await service.handleToolCall(owner, 'request_record_creation', { tableId: 'tbl_sales', data: {} });

    expect(AgentToolErrorSchema.parse(res).error).toBe('DADOS_VAZIOS');
    expect(proposalRepository.create).not.toHaveBeenCalled();
  });
});

describe('request_record_update — permissão e pertença do registro', () => {
  it('tabela system → SEM_PERMISSAO, sem gravar', async () => {
    const { service, proposalRepository } = makeService(systemTable, [{ id: 'r1', dynamicTableId: 'tbl_defs' }]);

    const res = await service.handleToolCall(owner, 'request_record_update', { tableId: 'tbl_defs', recordId: 'r1', data: { a: 2 } });

    expect(AgentToolErrorSchema.parse(res).error).toBe('SEM_PERMISSAO');
    expect(proposalRepository.create).not.toHaveBeenCalled();
  });

  it('ADMIN em tabela de outro dono → SEM_PERMISSAO, sem gravar', async () => {
    const { service, proposalRepository } = makeService(commonTable, [{ id: 'r1', dynamicTableId: 'tbl_sales' }]);

    const res = await service.handleToolCall(admin, 'request_record_update', { tableId: 'tbl_sales', recordId: 'r1', data: { a: 2 } });

    expect(AgentToolErrorSchema.parse(res).error).toBe('SEM_PERMISSAO');
    expect(proposalRepository.create).not.toHaveBeenCalled();
  });

  it('(d) recordId de outra tabela → REGISTRO_NAO_ENCONTRADO, sem gravar', async () => {
    const { service, proposalRepository, dynamicTableService } = makeService(commonTable, [{ id: 'r_other', dynamicTableId: 'tbl_other' }]);

    const res = await service.handleToolCall(owner, 'request_record_update', { tableId: 'tbl_sales', recordId: 'r_other', data: { a: 2 } });

    expect(AgentToolErrorSchema.parse(res).error).toBe('REGISTRO_NAO_ENCONTRADO');
    expect(dynamicTableService.getTableDataByIds).toHaveBeenCalledWith(owner, 'tbl_sales', ['r_other']);
    expect(proposalRepository.create).not.toHaveBeenCalled();
  });

  it('(e) update válido → PROPOSED com data.id = recordId', async () => {
    const { service, proposalRepository } = makeService(commonTable, [{ id: 'r1', dynamicTableId: 'tbl_sales' }]);

    const res = await service.handleToolCall(owner, 'request_record_update', { tableId: 'tbl_sales', recordId: 'r1', data: { a: 2 } });

    expect(res).toMatchObject({ status: 'PROPOSED', proposalId: 'prop_1' });
    expect(proposalRepository.create).toHaveBeenCalledWith(expect.objectContaining({ action: 'UPDATE', data: { a: 2, id: 'r1' } }));
  });
});

describe('query_table_data — busca no repositório (PR-2)', () => {
  const row = (id: string) => ({ id, data: { code: id }, createdAt: new Date('2026-10-16T12:00:00.000Z') });

  it('delega ao searchTableData com limite 10 e devolve rows/total/returned/truncated', async () => {
    const { service, dynamicTableService } = makeService(commonTable);
    dynamicTableService.searchTableData.mockResolvedValue({ rows: [row('r1'), row('r2')], total: 37, limit: 10 });

    const res = await service.handleToolCall(owner, 'query_table_data', { tableId: 'tbl_sales', filters: { code: 'x' } });

    expect(dynamicTableService.searchTableData).toHaveBeenCalledWith(owner, 'tbl_sales', { code: 'x' }, 10);
    expect(QueryTableDataRowsSchema.parse(res)).toEqual({
      rows: [
        { id: 'r1', data: { code: 'r1' }, createdAt: '2026-10-16T12:00:00.000Z' },
        { id: 'r2', data: { code: 'r2' }, createdAt: '2026-10-16T12:00:00.000Z' },
      ],
      total: 37, returned: 2, truncated: true,
    });
  });

  it('truncated = false quando tudo que casa foi devolvido', async () => {
    const { service, dynamicTableService } = makeService(commonTable);
    dynamicTableService.searchTableData.mockResolvedValue({ rows: [row('r1')], total: 1, limit: 10 });

    const res = QueryTableDataRowsSchema.parse(await service.handleToolCall(owner, 'query_table_data', { tableId: 'tbl_sales' }));

    expect(res.truncated).toBe(false);
  });

  it('ValidationError do filtro volta ao modelo como FILTRO_INVALIDO', async () => {
    const { service, dynamicTableService } = makeService(commonTable);
    dynamicTableService.searchTableData.mockRejectedValue(new ValidationError("Campo de filtro inválido: 'x'."));

    const res = AgentToolErrorSchema.parse(await service.handleToolCall(owner, 'query_table_data', { tableId: 'tbl_sales', filters: { x: 1 } }));

    expect(res).toEqual({ error: 'FILTRO_INVALIDO', message: "Campo de filtro inválido: 'x'." });
  });

  it('outros erros (permissão) seguem lançados — só ValidationError vira AgentToolError', async () => {
    const { service, dynamicTableService } = makeService(commonTable);
    dynamicTableService.searchTableData.mockRejectedValue(new ForbiddenError('no'));

    await expect(service.handleToolCall(owner, 'query_table_data', { tableId: 'tbl_sales' })).rejects.toBeInstanceOf(ForbiddenError);
  });
});

/**
 * BRD F-57.3 (GAP-MAP, faixa 1 de 2026-11-10; ficha BRD-57 do inventário de estruturas implícitas).
 *
 * `request_record_creation` / `request_record_update` gravavam a proposta só com "dados não vazios", permissão e
 * existência do registro; a validação contra o schema da tabela acontecia só na confirmação
 * (`validateDataAgainstSchema` no `DynamicTableService`). O usuário confirmava o modal e recebia o erro.
 * Comportamento esperado: a proposta é validada contra o schema ao ser criada (completa no CREATE, parcial no
 * UPDATE); dado inválido volta ao modelo como recusa de ferramenta e nenhuma proposta é gravada.
 */
import { LuminarisAgentService } from '../LuminarisAgentService';
import { DynamicTablePolicy } from '@/features/dynamicTables/policies/DynamicTablePolicy';
import type { UserContext } from '@/lib/authUtils';
import { Role } from '@/features/users/models/User.model';

const owner = {
  id: 'owner', userId: 'owner', name: 'owner', username: 'owner', email: 'o@test.co', userEmail: 'o@test.co',
  role: Role.USER, userRole: Role.USER, createdAt: new Date(), updatedAt: new Date(),
} as UserContext;

const table = {
  id: 'tbl_sales',
  name: 'sales',
  userId: 'owner',
  schema: { fields: [{ name: 'valor', label: 'Valor', type: 'number', required: true }] },
};

function makeService() {
  const dynamicTableService = {
    getTableById: jest.fn().mockResolvedValue(table),
    getTableDataByIds: jest.fn(async () => [{ id: 'row_1', dynamicTableId: 'tbl_sales' }]),
    searchTableData: jest.fn(),
  };
  const proposalRepository = {
    create: jest.fn(async (data: Record<string, unknown>) => ({ ...data, id: 'prop_1' })),
    findById: jest.fn(), delete: jest.fn(), findByUserId: jest.fn(),
    deleteOldProposals: jest.fn(), deleteByUserId: jest.fn(),
  };
  const writeEffects = { afterDataWrite: jest.fn(), afterStructureWrite: jest.fn() };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const service = new LuminarisAgentService(dynamicTableService as any, proposalRepository as any, new DynamicTablePolicy(), writeEffects, {} as any);
  return { service, proposalRepository };
}

describe('BRD F-57.3 — proposta validada contra o schema ao ser criada', () => {
  it('BRD F-57.3 CREATE com campo de tipo errado ⇒ DADOS_INVALIDOS, nenhuma proposta', async () => {
    const { service, proposalRepository } = makeService();
    const res = await service.handleToolCall(owner, 'request_record_creation', { tableId: 'tbl_sales', data: { valor: 'abc' } });
    expect(res).toMatchObject({ error: 'DADOS_INVALIDOS' });
    expect(proposalRepository.create).not.toHaveBeenCalled();
  });

  it('BRD F-57.3 UPDATE com campo de tipo errado ⇒ DADOS_INVALIDOS, nenhuma proposta', async () => {
    const { service, proposalRepository } = makeService();
    const res = await service.handleToolCall(owner, 'request_record_update', { tableId: 'tbl_sales', recordId: 'row_1', data: { valor: 'abc' } });
    expect(res).toMatchObject({ error: 'DADOS_INVALIDOS' });
    expect(proposalRepository.create).not.toHaveBeenCalled();
  });

  it('BRD F-57.3 controle: dado válido ⇒ PROPOSED', async () => {
    const { service, proposalRepository } = makeService();
    const res = await service.handleToolCall(owner, 'request_record_creation', { tableId: 'tbl_sales', data: { valor: 10 } });
    expect(res).toMatchObject({ status: 'PROPOSED' });
    expect(proposalRepository.create).toHaveBeenCalledTimes(1);
  });
});

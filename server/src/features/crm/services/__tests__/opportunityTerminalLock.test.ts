// A gravação do caminho genérico abre prisma.$transaction: aqui ela "sucede" sem banco, para que
// sem a trava o update RESOLVA e a asserção (rejeitar) seja o que falha.
jest.mock('../../../../lib/prisma', () => ({
  __esModule: true,
  default: { $transaction: jest.fn(async () => ({ id: 'opp-1', data: {} })) },
}));

import { DynamicTableService } from '../../../dynamicTables/services/DynamicTableService';
import { CrmPipelineService } from '../CrmPipelineService';
import { opportunitiesModule } from '../../../dynamicTables/presets/modules/crm/OpportunitiesModule';
import { ValidationError } from '../../../../lib/errors';

// Lacuna (teste vivo 2026-09-25): oportunidade Ganha continua editável — mudar o valor depois do
// Won deixou o CRM em R$90k e o título/razão em R$60k, e recarimbou closedAt. O ADR-CRM-AR-SEAM
// aceitava "sem guard terminal". Decisão do dono 2026-09-25 (chat): "decide pós-Won: travar".
// Mesmo padrão da venda do salão: o preset trava o caminho genérico (immutableAfter) e o serviço
// orquestrado (isSystem, que pula o immutableAfter) checa o estado terminal por conta própria.
const user = { userId: 'u1', role: 'USER' } as any;

const wonOpp = {
  id: 'opp-1',
  dynamicTableId: 'crmOpportunities-table',
  data: {
    name: 'Oscorp ME',
    pipelineId: 'p1',
    stageId: 's-won',
    status: 'Won',
    amount: 60000,
    currency: 'BRL',
    closedAt: '2026-09-25T16:10:48.216Z',
  },
};

describe('Oportunidade Won/Lost é terminal', () => {
  it.failing('caminho genérico (edição inline da tabela): mudar amount de opp Won → ValidationError', async () => {
    const repository = {
      findTableByDataId: jest.fn(async () => ({
        id: 'crmOpportunities-table',
        userId: 'u1',
        category: 'crm',
        schema: opportunitiesModule.schema,
      })),
      findDataById: jest.fn(async () => ({ ...wonOpp })),
      findTableById: jest.fn(async () => null),
      existsByIdInTable: jest.fn(async () => true),
      updateData: jest.fn(async () => ({ ...wonOpp })),
    };
    const policy = { canView: jest.fn(() => true), canManageData: jest.fn(() => true) };
    const svc = new DynamicTableService(repository as any, policy as any);

    await expect(
      svc.updateTableData(user, 'opp-1', { data: { amount: 90000 } } as any),
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it.failing('advanceOpportunity (isSystem): opp já Won → ValidationError, sem escrita', async () => {
    const updateTableData = jest.fn(async () => ({ id: 'opp-1', data: {} }));
    const repository = {
      findTableByInternalName: jest.fn(async (_u: string, internal: string) => ({
        id: `${internal}-table`,
        userId: 'u1',
        schema: { fields: [] },
      })),
      findDataById: jest.fn(async () => ({ ...wonOpp })),
    };
    const svc = new CrmPipelineService({ updateTableData } as any, repository as any);

    await expect(
      svc.advanceOpportunity(user, { opportunityId: 'opp-1', stageId: 's-won', stageType: 'closed_won', amount: 90000 }),
    ).rejects.toBeInstanceOf(ValidationError);
    expect(updateTableData).not.toHaveBeenCalled();
  });
});

import { DynamicTableService } from '../DynamicTableService';

/**
 * Lacuna (teste vivo 2026-09-25): no Zod 4, `.partial()` APLICA o `.default()` de campo ausente.
 * `updateTableData` valida o payload com `buildZodSchema(schema).partial()` e faz merge
 * `{...existente, ...validado}` — então um update parcial reseta para o default todo campo com
 * `defaultValue` que não veio no payload. Visto ao vivo: PUT {amount} numa oportunidade Won → status
 * voltou a 'Open'. Autorização do dono 2026-09-25 (chat): "autorizo instrumentar e corrigir o bug do Zod".
 *
 * Comportamento correto: update parcial altera SÓ os campos enviados; o resto mantém o valor atual.
 */
const user = { userId: 'u1', role: 'USER' } as any;

const schema = {
  fields: [
    { name: 'name', label: 'Name', type: 'string', required: true },
    { name: 'status', label: 'Status', type: 'select', options: ['Open', 'Won', 'Lost'], required: true, defaultValue: 'Open' },
    { name: 'priority', label: 'Priority', type: 'select', options: ['Low', 'Medium', 'High'], required: false, defaultValue: 'Medium' },
    { name: 'amount', label: 'Amount', type: 'number', required: false },
  ],
};

describe('DynamicTableService.updateTableData — update parcial não aplica defaults', () => {
  it('campo com defaultValue ausente do payload mantém o valor atual', async () => {
    const existing = { id: 'row-1', dynamicTableId: 'tbl-1', data: { name: 'Deal', status: 'Won', priority: 'High', amount: 1 } };
    const repository = {
      findTableByDataId: jest.fn(async () => ({ id: 'tbl-1', userId: 'u1', name: 'Deals', category: 'custom', schema })),
      findDataById: jest.fn(async () => ({ ...existing, data: { ...existing.data } })),
    };
    const policy = { canView: jest.fn(() => true), canManageData: jest.fn(() => true) };
    const svc = new DynamicTableService(repository as any, policy as any);
    // options.tx: a escrita vai direto por este tx (sem prisma.$transaction) e é capturada aqui.
    const tx = {
      dynamicTableData: {
        update: jest.fn(async ({ where, data }: any) => ({ id: where.id, dynamicTableId: 'tbl-1', data: data.data })),
      },
    };

    await svc.updateTableData(user, 'row-1', { data: { amount: 2 } } as any, { tx: tx as any });

    const persisted = tx.dynamicTableData.update.mock.calls[0][0].data.data;
    expect({ status: persisted.status, priority: persisted.priority, amount: persisted.amount }).toEqual({
      status: 'Won',
      priority: 'High',
      amount: 2,
    });
  });
});

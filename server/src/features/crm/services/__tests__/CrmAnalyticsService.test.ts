import { CrmAnalyticsService } from '../CrmAnalyticsService';

// Lacuna (teste vivo 2026-09-25): o analytics só lê `leads` — uma oportunidade Ganha (a
// portadora de receita, que gera o título a receber) não aparece em Ganhos nem no ticket.
// Decisão do dono (2026-09-25, AskUserQuestion): "Incluir oportunidades" — ganhos, win rate,
// ticket e receita vêm de crmOpportunities; leads ficam com funil/qualificação.
describe('CrmAnalyticsService — oportunidades', () => {
  it('conta a oportunidade Ganha em wonLeads e no ticket médio', async () => {
    const tables: Record<string, { id: string; internalName: string; schema: { fields: [] } }> = {
      leads: { id: 'leads-t', internalName: 'leads', schema: { fields: [] } },
      crmOpportunities: { id: 'opps-t', internalName: 'crmOpportunities', schema: { fields: [] } },
    };
    const now = new Date();
    const data: Record<string, Array<{ id: string; data: Record<string, unknown>; createdAt: Date; updatedAt: Date }>> = {
      'leads-t': [{ id: 'l1', data: { status: 'Open' }, createdAt: now, updatedAt: now }],
      'opps-t': [{ id: 'o1', data: { status: 'Won', amount: 90000, currency: 'BRL' }, createdAt: now, updatedAt: now }],
    };
    const repository = {
      findTableByInternalName: jest.fn(async (_u: string, key: string) => tables[key] ?? null),
    };
    const dynamicTableService = {
      getAllTableData: jest.fn(async (_u: unknown, tableId: string) => data[tableId] ?? []),
    };
    const svc = new CrmAnalyticsService(dynamicTableService as any, repository as any);

    const bundle = await svc.getAnalytics({ userId: 'u1', role: 'USER' } as any, {} as any);

    const card = (name: string) => bundle.cards.find((c) => c.name === name)?.value;
    expect({ wonLeads: card('wonLeads'), avgTicket: card('avgTicket') }).toEqual({ wonLeads: 1, avgTicket: 90000 });
  });
});

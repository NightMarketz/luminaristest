import { LeadsSeedOnUnitPlugin } from '../LeadsSeedOnUnitPlugin';

// Lacuna (teste vivo 2026-09-25): o pipeline padrão semeado por unidade só tem etapas
// init/meeting/proposal/negotiation. Sem etapa closed_won/closed_lost, uma oportunidade
// nunca pode ser Ganha/Perdida pela UI (o board fecha Won/Lost só ao mover para essas etapas).
describe('LeadsSeedOnUnitPlugin — pipeline padrão', () => {
  it('semeia etapas de fechamento (closed_won e closed_lost)', async () => {
    const created: Array<{ tableId: string; data: Record<string, unknown> }> = [];
    const tables: Record<string, { id: string; category: string; internalName: string; name: string }> = {
      leadPipelines: { id: 'pipes', category: 'leads', internalName: 'leadPipelines', name: 'Pipelines de Lead' },
      leadStages: { id: 'stages', category: 'leads', internalName: 'leadStages', name: 'Etapas de Lead' },
    };
    const ctx = {
      userId: 'u1',
      after: { id: 'unit-1' },
      table: { category: 'business', internalName: 'units', name: 'Units' },
      repository: {
        findTableByInternalName: jest.fn(async (_u: string, key: string) => tables[key] ?? null),
        findTablesByUserId: jest.fn(async () => Object.values(tables)),
        findRowsByFieldValue: jest.fn(async () => []),
        createData: jest.fn(async (tableId: string, data: Record<string, unknown>) => {
          created.push({ tableId, data });
          return { id: `${tableId}-${created.length}` };
        }),
      },
    } as any;

    await LeadsSeedOnUnitPlugin.afterCreate!(ctx);

    const stageTypes = created.filter((c) => c.tableId === 'stages').map((c) => c.data.type);
    expect(stageTypes).toEqual(expect.arrayContaining(['closed_won', 'closed_lost']));
  });
});

// I8 (BE-INCR-CRM-MODULE-COMPOSITION) comportamentos 3 e 6.
describe('LeadsSeedOnUnitPlugin — módulos CRM (I8)', () => {
  type T = { id: string; category: string; internalName: string; name: string };
  const PIPES: T = { id: 'pipes', category: 'leads', internalName: 'leadPipelines', name: 'Pipelines de Lead' };
  const STAGES: T = { id: 'stages', category: 'leads', internalName: 'leadStages', name: 'Etapas de Lead' };
  const PROPOSALS: T = { id: 'props', category: 'leads', internalName: 'leadProposals', name: 'Lead Proposals' };

  function run(tables: Record<string, T>) {
    const created: Array<{ tableId: string; data: Record<string, unknown> }> = [];
    const ctx = {
      userId: 'u1',
      after: { id: 'unit-1' },
      table: { category: 'business', internalName: 'units', name: 'Units' },
      repository: {
        findTableByInternalName: jest.fn(async (_u: string, key: string) => tables[key] ?? null),
        findTablesByUserId: jest.fn(async () => Object.values(tables)),
        findRowsByFieldValue: jest.fn(async () => []),
        createData: jest.fn(async (tableId: string, data: Record<string, unknown>) => {
          created.push({ tableId, data });
          return { id: `${tableId}-${created.length}` };
        }),
      },
    } as any;
    return { created, promise: LeadsSeedOnUnitPlugin.afterCreate!(ctx) };
  }

  beforeEach(() => jest.clearAllMocks());

  it('c3: tenant sem CRM (sem tabelas de lead) → retorna sem erro e sem linhas', async () => {
    const { created, promise } = run({});
    await expect(promise).resolves.toBeUndefined();
    expect(created).toEqual([]);
  });

  it('c6: CRM-0 sem CRM-1 (sem leadProposals) → nenhuma etapa do tipo proposal', async () => {
    const { created, promise } = run({ leadPipelines: PIPES, leadStages: STAGES });
    await promise;
    const types = created.filter((c) => c.tableId === 'stages').map((c) => c.data.type);
    expect(types.length).toBeGreaterThan(0);
    expect(types).not.toContain('proposal');
  });

  it('c6: com CRM-1 (leadProposals instalada) → etapa proposal semeada como antes', async () => {
    const { created, promise } = run({ leadPipelines: PIPES, leadStages: STAGES, leadProposals: PROPOSALS });
    await promise;
    const types = created.filter((c) => c.tableId === 'stages').map((c) => c.data.type);
    expect(types).toEqual(['init', 'meeting', 'proposal', 'negotiation', 'closed_won', 'closed_lost']);
  });
});

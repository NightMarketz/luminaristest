import { GoalsPlugin } from '../GoalsPlugin';
import { resolveModuleSelection } from '../../../presets/modules/moduleSelection';
import { composeModuleTables } from '../../../presets/modules/registry';
import { CoreSystemPreset } from '../../../presets';

/**
 * BE-INCR-MODULOS-BASE-SUBMODULOS — PR-4, item 25 (meta sem fonte). GES-META sem VENDAS: a meta com `metricKey` de
 * venda é aceita e o acompanhamento fica vazio, sem erro. A meta não tem relação com tabela de venda (E14) e o
 * plugin só olha a própria linha — nenhuma leitura de outra tabela, então a ausência de `sales` não pode quebrar.
 */
describe('GoalsPlugin — item 25: meta sem fonte (GES-META sem VENDAS)', () => {
  // Repositório que reprova qualquer acesso: prova que o plugin não procura a fonte do indicador.
  const repository = new Proxy({}, {
    get: (_t, prop) => () => { throw new Error(`GoalsPlugin não deveria ler o repositório (${String(prop)})`); },
  });
  const ctx = (after: Record<string, unknown>) => ({
    userId: 'u1',
    table: { id: 'goals', category: 'operations', internalName: 'goals', name: 'Goals' },
    schema: { fields: [] },
    operation: 'create',
    after,
    repository,
  }) as never;

  it('GES-META instala sozinho: só `goals` (+ Core), sem relação para tabela de VENDAS', () => {
    const tables = composeModuleTables(resolveModuleSelection(['GES-META']));
    expect(Object.keys(tables)).toEqual(['goals']);
    const alvos = tables.goals.schema.fields.filter((f) => f.type === 'relation').map((f) => f.relation?.targetTable);
    expect(alvos.every((t) => t && Object.keys(CoreSystemPreset.tables).includes(t.replace('@@PRESET_TABLE_KEY::', '')))).toBe(true);
  });

  it('metricKey de venda sem a tabela de vendas → aceita; o resultado fica vazio, não erro', async () => {
    const after = { description: 'Faturar 10 mil', metricKey: 'REVENUE_TOTAL', targetAmount: 10000, startDate: '2026-11-01', endDate: '2026-11-30' };
    expect(GoalsPlugin.supports(ctx(after))).toBe(true);
    await expect(GoalsPlugin.beforeCreate!(ctx(after))).resolves.toBeUndefined();
    expect(after).not.toHaveProperty('result');
    expect(after).not.toHaveProperty('actualAmount');
  });

  it('com o realizado informado à mão, o resultado segue a regra de sempre (sem consultar a fonte)', async () => {
    const after: Record<string, unknown> = { metricKey: 'REVENUE_TOTAL', targetAmount: 10000, actualAmount: 12000 };
    await GoalsPlugin.beforeUpdate!(ctx(after));
    expect(after.result).toBe('Reached');
  });
});

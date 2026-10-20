import { DynamicTableWriteEffects } from '../DynamicTableWriteEffects';

function build(syncFails = false) {
  const graph = {
    syncGraph: jest.fn(async () => {
      if (syncFails) throw new Error('grafo quebrou');
      return { tables: [] } as never;
    }),
  };
  const kpiCache = { invalidate: jest.fn() };
  return { effects: new DynamicTableWriteEffects(graph, kpiCache), graph, kpiCache };
}

describe('DynamicTableWriteEffects (BE-INCR-DT-NO-CONSUMER-CALLS)', () => {
  it('afterDataWrite invalida só o KPI do dono — linha não muda o grafo', () => {
    const { effects, graph, kpiCache } = build();
    effects.afterDataWrite('owner-1');
    expect(kpiCache.invalidate).toHaveBeenCalledWith('owner-1');
    expect(graph.syncGraph).not.toHaveBeenCalled();
  });

  it('afterStructureWrite invalida o KPI e reconstrói o grafo do dono', async () => {
    const { effects, graph, kpiCache } = build();
    await effects.afterStructureWrite('owner-1');
    expect(kpiCache.invalidate).toHaveBeenCalledWith('owner-1');
    expect(graph.syncGraph).toHaveBeenCalledWith('owner-1');
  });

  it('F4: falha do grafo é propagada ao chamador (não fica em silêncio), com o KPI já invalidado', async () => {
    const { effects, kpiCache } = build(true);
    await expect(effects.afterStructureWrite('owner-1')).rejects.toThrow('grafo quebrou');
    expect(kpiCache.invalidate).toHaveBeenCalledWith('owner-1');
  });
});

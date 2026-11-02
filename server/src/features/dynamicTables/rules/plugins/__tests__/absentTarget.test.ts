/**
 * BE-INCR-MODULOS-BASE-SUBMODULOS — PR-3, item 19 (docs/accounting/BE-INCR-MODULOS-BASE-SUBMODULOS-brief.md §2): com
 * ESTOQUE (EST-0) ou AGENDA (AGE-0) fora, os plugins que escrevem/leem essas tabelas são no-op — criar produto, unidade
 * ou venda não lança. O workspace falso é o que o create instala: Core + os módulos escolhidos (fonte real do registro).
 */
import { ProductAutoStockPlugin } from '../ProductAutoStockPlugin';
import { UnitAutoStockPlugin } from '../UnitAutoStockPlugin';
import { StockMovementsApplyPlugin } from '../StockMovementsApplyPlugin';
import { adjustReservationForItemChange, createMovementsForItems, processSaleStockUpdate } from '../sales/stockSync';
import {
  assertServiceAppointmentsReady,
  cancelLinkedAppointmentsIfScheduled,
  validateServiceAppointmentCoherence,
} from '../sales/appointmentSync';
import { CoreSystemPreset } from '../../../presets';
import { composeModuleTables, type ModuleKey } from '../../../presets/modules/registry';
import { resolveModuleSelection } from '../../../presets/modules/moduleSelection';

beforeEach(() => jest.clearAllMocks());

type FakeTable = { id: string; internalName: string; name: string; category: string; schema: unknown };

/** Workspace instalado com Core + `modules` (fechados pelas dependências); linhas por tabela. */
function workspace(modules: ModuleKey[], rows: Record<string, { id: string; data: Record<string, unknown> }[]> = {}) {
  const defs = { ...CoreSystemPreset.tables, ...composeModuleTables(resolveModuleSelection(modules)) };
  const tables: FakeTable[] = Object.entries(defs).map(([k, d]) => ({ id: `t-${k}`, internalName: k, name: d.name, category: d.category, schema: d.schema }));
  const byInternal = new Map(tables.map((t) => [t.internalName, t]));
  const rowsOf = (tableId: string) => rows[tableId.replace(/^t-/, '')] ?? [];
  const repository = {
    findTableByInternalName: jest.fn(async (_u: string, k: string) => byInternal.get(k) ?? null),
    findTablesByUserId: jest.fn(async () => tables),
    findDataByTableId: jest.fn(async (tableId: string) => ({ data: rowsOf(tableId) })),
    findRowsByFieldValue: jest.fn(async (tableId: string, field: string, value: string) => rowsOf(tableId).filter((r) => String(r.data[field]) === value)),
    findDataById: jest.fn(async (id: string) => Object.values(rows).flat().find((r) => r.id === id) ?? null),
    createData: jest.fn(async () => ({ id: 'novo' })),
    updateData: jest.fn(async () => ({ id: 'x' })),
  };
  const ctx = (table: string, after: Record<string, unknown> | null = null) =>
    ({ userId: 'u1', table: byInternal.get(table), after, before: null, repository }) as never;
  return { tables, ctx, repository };
}

// Salão sem ESTOQUE e sem AGENDA: PESSOAS + VENDAS com os três catálogos.
const SEM_EST_AGE: ModuleKey[] = ['VEN-SERV', 'VEN-PROD', 'VEN-PAC'];

describe('item 19 — plugins com alvo ausente são no-op', () => {
  it('o workspace de teste não tem productUnits, stockMovements nem appointments (sanidade)', () => {
    const { tables } = workspace(SEM_EST_AGE);
    const names = tables.map((t) => t.internalName);
    expect(names).toEqual(expect.arrayContaining(['units', 'products', 'services', 'sales', 'saleItems']));
    for (const k of ['productUnits', 'stockMovements', 'appointments']) expect(names).not.toContain(k);
  });

  it('ProductAutoStockPlugin: criar produto sem EST-0 não cria estoque nem lança', async () => {
    const w = workspace(SEM_EST_AGE, { units: [{ id: 'unit-1', data: { name: 'Matriz' } }] });
    const ctx = w.ctx('products', { id: 'p1', name: 'Shampoo' });
    expect(ProductAutoStockPlugin.supports(ctx)).toBe(true);
    await expect(ProductAutoStockPlugin.afterCreate!(ctx)).resolves.toBeUndefined();
    expect(w.repository.createData).not.toHaveBeenCalled();
  });

  it('UnitAutoStockPlugin: criar unidade sem EST-0 não cria estoque nem lança', async () => {
    const w = workspace(SEM_EST_AGE, { products: [{ id: 'p1', data: { name: 'Shampoo' } }] });
    const ctx = w.ctx('units', { id: 'unit-2', name: 'Filial' });
    expect(UnitAutoStockPlugin.supports(ctx)).toBe(true);
    await expect(UnitAutoStockPlugin.afterCreate!(ctx)).resolves.toBeUndefined();
    expect(w.repository.createData).not.toHaveBeenCalled();
  });

  it('StockMovementsApplyPlugin: sem EST-0 não casa com nenhuma tabela instalada (nunca roda)', () => {
    const w = workspace(SEM_EST_AGE);
    for (const t of w.tables) expect({ t: t.internalName, ok: StockMovementsApplyPlugin.supports(w.ctx(t.internalName)) }).toEqual({ t: t.internalName, ok: false });
  });

  it('sales/stockSync: reservar, finalizar e gerar movimentação de item de produto sem EST-0 não lança nem escreve', async () => {
    const venda = { id: 's1', data: { status: 'Draft', unitId: 'unit-1' } };
    const w = workspace(SEM_EST_AGE, { sales: [venda] });
    const item = { id: 'i1', data: { saleId: 's1', type: 'Product', productId: 'p1', quantity: 2 } };
    const ctx = w.ctx('saleItems', item.data);
    await expect(adjustReservationForItemChange(ctx, null, item.data)).resolves.toBeUndefined();
    await expect(processSaleStockUpdate(ctx, [item], 'unit-1', 'Draft', 'Finalized')).resolves.toBeUndefined();
    await expect(createMovementsForItems(ctx, [item], 'unit-1', 'Out')).resolves.toBeUndefined();
    expect(w.repository.createData).not.toHaveBeenCalled();
    expect(w.repository.updateData).not.toHaveBeenCalled();
  });

  it('sales/appointmentSync: validar, finalizar e cancelar item de serviço sem AGE-0 não lança nem escreve', async () => {
    const w = workspace(SEM_EST_AGE);
    const item = { id: 'i1', data: { saleId: 's1', type: 'Service', serviceId: 'sv1', quantity: 1, requiresAppointment: false } };
    const ctx = w.ctx('saleItems', item.data);
    await expect(validateServiceAppointmentCoherence(ctx, item.data, 'unit-1')).resolves.toBeUndefined();
    await expect(assertServiceAppointmentsReady(ctx, [item])).resolves.toBeUndefined();
    await expect(cancelLinkedAppointmentsIfScheduled(ctx, [item])).resolves.toBeUndefined();
    expect(w.repository.updateData).not.toHaveBeenCalled();
  });

  it('controle: COM EST-0 o ProductAutoStockPlugin provisiona estoque (o no-op acima não é tautológico)', async () => {
    const w = workspace([...SEM_EST_AGE, 'EST-0'], { units: [{ id: 'unit-1', data: { name: 'Matriz' } }] });
    await ProductAutoStockPlugin.afterCreate!(w.ctx('products', { id: 'p1', name: 'Shampoo' }));
    expect(w.repository.createData).toHaveBeenCalledWith('t-productUnits', { productId: 'p1', unitId: 'unit-1', stock: 0, reserved: 0 });
  });
});

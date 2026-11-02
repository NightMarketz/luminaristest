/**
 * BE-INCR-MODULOS-BASE-SUBMODULOS item 12: a variante de `saleItems` sai dos catálogos de VENDAS instalados
 * (`catalog.products`, `services.catalog`, `catalog.packages`), não do estoque. Antes, Produtos sem Estoque caía em
 * services-only (a variante lia `inventory.stock`, que vem de `productUnits`). F-MS-3 (a): Pacotes não muda a
 * variante; só Pacotes → mista (a única com `packageId`).
 */
import { DynamicTableService } from '../DynamicTableService';
import type { IDynamicTableRepository } from '../../repositories/IDynamicTableRepository';
import type { IDynamicTablePolicy } from '../../policies/IDynamicTablePolicy';
import type { ITableSchema } from '../../models/DynamicTable.model';
import { CoreSystemPreset } from '../../presets';
import { composeModuleTables, type ModuleKey } from '../../presets/modules/registry';
import { createTableFromModule } from '../../utils/TableFactory';
import { productUnitModule } from '../../presets/modules/product/ProductModule';
import { saleItemsMixedModule } from '../../presets/modules/finance/SalesItemsMixed';
import { saleItemsProductsOnlyModule } from '../../presets/modules/finance/SalesItemsProductsOnly';
import { saleItemsServicesOnlyModule } from '../../presets/modules/finance/SalesItemsServicesOnly';

const names = (schema: { fields: { name: string }[] }) => schema.fields.map((f) => f.name);
const MIXED = names(saleItemsMixedModule.schema);
const PRODUCTS_ONLY = names(saleItemsProductsOnlyModule.schema);
const SERVICES_ONLY = names(saleItemsServicesOnlyModule.schema);

type Variant = { schema: ITableSchema };
/** Campos da variante como o instalador os grava: relação opcional para tabela não instalada sai (regra E5 do BRIEF). */
const asInstalled = (variant: Variant, installed: readonly string[]) =>
  variant.schema.fields
    .filter((f) => {
      const target = f.type === 'relation' && !f.required ? f.relation?.targetTable : undefined;
      return !target || installed.includes(target.replace('@@PRESET_TABLE_KEY::', ''));
    })
    .map((f) => f.name);

/**
 * Instala Core + os módulos dados (+ `productUnits` do ESTOQUE, se pedido) e devolve os campos finais de `saleItems` e
 * as tabelas instaladas.
 */
async function install(modules: ModuleKey[], withStock = false): Promise<{ fields: string[]; installed: string[] }> {
  const schemas = new Map<string, ITableSchema>();
  const idByName = new Map<string, string>();
  const txRepo = {
    createTable: jest.fn(async (_u: string, d: { internalName: string; schema: ITableSchema }) => {
      const id = `id-${d.internalName}`;
      idByName.set(d.internalName, id);
      schemas.set(id, d.schema);
      return { id };
    }),
    updateTableSchema: jest.fn(async (id: string, d: { schema: ITableSchema }) => {
      schemas.set(id, d.schema);
    }),
  };
  const repo = {
    runInTransaction: jest.fn(async (fn: (r: unknown, tx: unknown) => Promise<unknown>) =>
      fn(txRepo, { user: { updateMany: jest.fn(async () => ({ count: 1 })) } }),
    ),
  };
  const svc = new DynamicTableService(repo as unknown as IDynamicTableRepository, {} as IDynamicTablePolicy);
  const tables = {
    ...CoreSystemPreset.tables,
    ...composeModuleTables(['PES-0', 'VEN-0', ...modules]),
    ...(withStock ? { productUnits: createTableFromModule(productUnitModule) } : {}),
  };
  await svc.installPresetAsSystem('u1', { tables });
  return { fields: names(schemas.get(idByName.get('saleItems')!)!), installed: Object.keys(tables) };
}

describe('installPresetAsSystem — variante de saleItems pelos submódulos de VENDAS (item 12)', () => {
  it('{VEN-PROD, VEN-SERV} → mista', async () => {
    const r = await install(['VEN-PROD', 'VEN-SERV']);
    expect(r.fields).toEqual(asInstalled(saleItemsMixedModule, r.installed));
    expect(r.fields).toEqual(expect.arrayContaining(['type', 'productId', 'serviceId']));
  });

  it('{VEN-PROD} com ESTOQUE → só produtos', async () => {
    const r = await install(['VEN-PROD'], true);
    expect(r.fields).toEqual(asInstalled(saleItemsProductsOnlyModule, r.installed));
  });

  it('{VEN-PROD} sem ESTOQUE → só produtos (antes caía em só serviços)', async () => {
    const r = await install(['VEN-PROD']);
    expect(r.fields).toEqual(asInstalled(saleItemsProductsOnlyModule, r.installed));
    expect(r.fields).toContain('productId');
    expect(r.fields).not.toContain('serviceId');
  });

  it('{VEN-SERV} → só serviços', async () => {
    const r = await install(['VEN-SERV']);
    expect(r.fields).toEqual(asInstalled(saleItemsServicesOnlyModule, r.installed));
    expect(r.fields).toContain('serviceId');
  });

  it('{VEN-PAC} → mista (F-MS-3 a: só a mista tem packageId); catálogo ausente descartado, sem 400', async () => {
    const r = await install(['VEN-PAC']);
    expect(r.fields).toEqual(asInstalled(saleItemsMixedModule, r.installed));
    expect(r.fields).toContain('packageId');
    expect(r.fields).not.toContain('productId');
  });

  it('premissa do F-MS-3: só a variante mista declara packageId', () => {
    expect(PRODUCTS_ONLY).not.toContain('packageId');
    expect(SERVICES_ONLY).not.toContain('packageId');
    expect(MIXED).toContain('packageId');
  });
});

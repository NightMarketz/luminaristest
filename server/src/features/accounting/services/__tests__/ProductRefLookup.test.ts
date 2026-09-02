/**
 * DynamicTableProductRefLookup — port fino de existência de produto (LAC-E F-E2).
 *
 * What is mocked: o IDynamicTableRepository (as duas leituras). These tests pin:
 *  - linha viva na tabela `products` do dono → true;
 *  - linha de OUTRA tabela (mesmo id válido) → false — guarda cross-tenant, findDataById é global;
 *  - id inexistente → false; tenant sem tabela `products` → false (nunca explode).
 */
import { DynamicTableProductRefLookup } from '../ProductRefLookup';
import type { AccountingScope } from '../../scope/AccountingScope';

const scope: AccountingScope = {
  ownerUserId: 'u1',
  actorUserId: 'u1',
  unitId: 'unit-1',
  ledgerCode: 'DEFAULT',
  baseCurrencyCode: 'BRL',
  timeZone: 'America/Sao_Paulo',
};

function buildLookup(over: { table?: { id: string } | null; row?: { dynamicTableId: string } | null } = {}) {
  const repo = {
    findTableByInternalName: jest.fn(async () => ('table' in over ? over.table : { id: 'tbl-products' })),
    findDataById: jest.fn(async () => ('row' in over ? over.row : { dynamicTableId: 'tbl-products' })),
  };
  /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
  return { lookup: new DynamicTableProductRefLookup(repo as any), repo };
}

describe('DynamicTableProductRefLookup.productExists', () => {
  it('true para linha viva da tabela products do dono (e busca a tabela pelo internalName certo)', async () => {
    const { lookup, repo } = buildLookup();
    await expect(lookup.productExists(scope, 'prod-1')).resolves.toBe(true);
    expect(repo.findTableByInternalName).toHaveBeenCalledWith('u1', 'products');
    expect(repo.findDataById).toHaveBeenCalledWith('prod-1');
  });

  it('false quando a linha pertence a OUTRA tabela (guarda cross-tenant)', async () => {
    const { lookup } = buildLookup({ row: { dynamicTableId: 'tbl-de-outro-dono' } });
    await expect(lookup.productExists(scope, 'prod-1')).resolves.toBe(false);
  });

  it('false para id inexistente e para tenant sem tabela products — sem explodir', async () => {
    const semLinha = buildLookup({ row: null });
    await expect(semLinha.lookup.productExists(scope, 'typo')).resolves.toBe(false);

    const semTabela = buildLookup({ table: null });
    await expect(semTabela.lookup.productExists(scope, 'prod-1')).resolves.toBe(false);
    // Sem tabela nem consulta a linha — short-circuit.
    expect(semTabela.repo.findDataById).not.toHaveBeenCalled();
  });
});

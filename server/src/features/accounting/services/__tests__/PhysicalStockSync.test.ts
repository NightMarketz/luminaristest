/**
 * DynamicTablePhysicalStockSync — espelho físico da compra (BE-INCR-PURCHASE-PHYSICAL-SYNC).
 *
 * What is mocked: IDynamicTableRepository (reads) e DynamicTableService (escrita isSystem).
 * These tests pin:
 *  - o movimento In nasce com reason='Purchase', detailKey determinístico (o discriminador que
 *    SOBREVIVE ao strip do Zod — sourceType custom seria removido pelo schema do preset),
 *    cost em REAIS informativo (F-PS2) e escrita `isSystem: true`;
 *  - idempotência read-first por detailKey ('already-exists', zero escrita);
 *  - bootstrap da linha productUnits quando o produto nunca foi movimentado na unidade
 *    (o plugin RECUSA movimento sem a linha — insumo ausente 1 do BRIEF);
 *  - F-PS1: reversão é CONTRA-MOVIMENTO Out (reason='Adjustment', chave ':reversal'), nunca
 *    delete; 'already-reversed' e 'not-found' sem escrita;
 *  - tenant sem tabela stockMovements → 'skipped' sem explodir.
 */
import { DynamicTablePhysicalStockSync } from '../PhysicalStockSync';
import type { AccountingScope } from '../../scope/AccountingScope';

const scope: AccountingScope = {
  ownerUserId: 'owner-1',
  actorUserId: 'owner-1',
  unitId: 'unit-1',
  ledgerCode: 'DEFAULT',
  baseCurrencyCode: 'BRL',
  timeZone: 'America/Sao_Paulo',
};

const MOVES_TABLE = { id: 'tbl-moves', internalName: 'stockMovements' };
const PU_TABLE = { id: 'tbl-pu', internalName: 'productUnits' };

function build(over: {
  movesTable?: typeof MOVES_TABLE | null;
  rowsByKey?: Record<string, Array<{ id: string; data: Record<string, unknown> }>>;
  puRows?: Array<{ id: string; data: Record<string, unknown> }>;
} = {}) {
  const rowsByKey = over.rowsByKey ?? {};
  const repo = {
    findTableByInternalName: jest.fn(async (_u: string, name: string) => {
      if (name === 'stockMovements') return 'movesTable' in over ? over.movesTable : MOVES_TABLE;
      if (name === 'productUnits') return PU_TABLE;
      return null;
    }),
    findRowsByFieldValue: jest.fn(async (tableId: string, field: string, value: string) => {
      if (tableId === PU_TABLE.id) return over.puRows ?? [];
      if (field === 'detailKey') return rowsByKey[value] ?? [];
      return [];
    }),
  };
  const dts = { createTableData: jest.fn(async () => ({ id: 'row-new' })) };
  /* eslint-disable @typescript-eslint/no-explicit-any */
  const sync = new DynamicTablePhysicalStockSync(dts as any, repo as any);
  /* eslint-enable @typescript-eslint/no-explicit-any */
  return { sync, repo, dts };
}

const PU_ROW = { id: 'pu-1', data: { productId: 'prod-1', unitId: 'unit-1', stock: 3 } };

const inboundParams = {
  productRef: 'prod-1',
  unitId: 'unit-1',
  qty: 10,
  payableId: 'pay-1',
  occurredAt: new Date('2026-09-01T12:00:00Z'),
  totalValueCents: 30000,
};

describe('recordPurchaseInbound', () => {
  it('cria o movimento In com detailKey discriminador, cost em reais e isSystem', async () => {
    const { sync, dts } = build({ puRows: [PU_ROW] });
    await expect(sync.recordPurchaseInbound(scope, inboundParams)).resolves.toBe('created');

    expect(dts.createTableData).toHaveBeenCalledTimes(1);
    const [user, tableId, payload, options] = dts.createTableData.mock.calls[0] as unknown[];
    expect((user as { userId: string }).userId).toBe('owner-1');
    expect(tableId).toBe(MOVES_TABLE.id);
    const written = (payload as { data: Record<string, unknown> }).data;
    expect(written).toMatchObject({
      productId: 'prod-1',
      unitId: 'unit-1',
      type: 'In',
      quantity: 10,
      reason: 'Purchase',
      cost: 300, // F-PS2: total informativo em REAIS (30000 centavos)
      detailKey: 'ACCOUNTING_PAYABLE:pay-1',
    });
    // sourceType custom NÃO é enviado: o schema do preset o removeria (strip do Zod) — o
    // discriminador que o plugin lê é o PREFIXO do detailKey (campo declarado).
    expect('sourceType' in written).toBe(false);
    expect(options).toEqual({ isSystem: true });
  });

  it('é idempotente por detailKey: movimento existente ⇒ already-exists, ZERO escrita', async () => {
    const { sync, dts } = build({
      puRows: [PU_ROW],
      rowsByKey: { 'ACCOUNTING_PAYABLE:pay-1': [{ id: 'mov-1', data: {} }] },
    });
    await expect(sync.recordPurchaseInbound(scope, inboundParams)).resolves.toBe('already-exists');
    expect(dts.createTableData).not.toHaveBeenCalled();
  });

  it('produto nunca movimentado na unidade: cria a linha productUnits (stock 0) ANTES do movimento', async () => {
    const { sync, dts } = build({ puRows: [] });
    await sync.recordPurchaseInbound(scope, inboundParams);

    expect(dts.createTableData).toHaveBeenCalledTimes(2);
    const [, firstTable, firstPayload] = dts.createTableData.mock.calls[0] as unknown[];
    expect(firstTable).toBe(PU_TABLE.id);
    expect((firstPayload as { data: Record<string, unknown> }).data).toEqual({
      productId: 'prod-1',
      unitId: 'unit-1',
      stock: 0,
    });
    const [, secondTable] = dts.createTableData.mock.calls[1] as unknown[];
    expect(secondTable).toBe(MOVES_TABLE.id);
  });

  it('tenant sem tabela stockMovements ⇒ skipped, sem explodir', async () => {
    const { sync, dts } = build({ movesTable: null });
    await expect(sync.recordPurchaseInbound(scope, inboundParams)).resolves.toBe('skipped');
    expect(dts.createTableData).not.toHaveBeenCalled();
  });
});

describe('reversePurchaseInbound (F-PS1: contra-movimento, nunca delete)', () => {
  const original = {
    id: 'mov-1',
    data: { productId: 'prod-1', unitId: 'unit-1', quantity: 10 },
  };

  it('cria contra-movimento Out com a chave :reversal e reason Adjustment', async () => {
    const { sync, dts } = build({ rowsByKey: { 'ACCOUNTING_PAYABLE:pay-1': [original] } });
    await expect(
      sync.reversePurchaseInbound(scope, { payableId: 'pay-1', reversalDate: new Date('2026-09-02T00:00:00Z') }),
    ).resolves.toBe('reversed');

    expect(dts.createTableData).toHaveBeenCalledTimes(1);
    const [, , payload] = dts.createTableData.mock.calls[0] as unknown[];
    expect((payload as { data: Record<string, unknown> }).data).toMatchObject({
      productId: 'prod-1',
      unitId: 'unit-1',
      type: 'Out',
      quantity: 10,
      reason: 'Adjustment',
      detailKey: 'ACCOUNTING_PAYABLE:pay-1:reversal',
    });
    // Nota: o contra-movimento NÃO carrega o prefixo de isenção puro do inbound — mas carrega
    // ':reversal', e o plugin só isenta a validação de COMPRA manual (reason Purchase); um Out
    // com reason Adjustment nunca entra naquele branch.
  });

  it('reversão já existente ⇒ already-reversed; físico nunca criado ⇒ not-found — ambos sem escrita', async () => {
    const done = build({
      rowsByKey: {
        'ACCOUNTING_PAYABLE:pay-1': [original],
        'ACCOUNTING_PAYABLE:pay-1:reversal': [{ id: 'mov-2', data: {} }],
      },
    });
    await expect(
      done.sync.reversePurchaseInbound(scope, { payableId: 'pay-1', reversalDate: new Date() }),
    ).resolves.toBe('already-reversed');
    expect(done.dts.createTableData).not.toHaveBeenCalled();

    const never = build();
    await expect(
      never.sync.reversePurchaseInbound(scope, { payableId: 'pay-9', reversalDate: new Date() }),
    ).resolves.toBe('not-found');
    expect(never.dts.createTableData).not.toHaveBeenCalled();
  });
});

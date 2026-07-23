import { readFileSync } from 'fs';
import { join } from 'path';
import { NfeImportService } from '../NfeImportService';
import { ForbiddenError, ValidationError } from '../../../../lib/errors';
import { resolveAccountingScope } from '../../scope/AccountingScope';
import type { CreatePayableInput } from '../../dtos/PayableDto';
import type { ImportNfePurchaseInput } from '../../dtos/NfeDto';
import type { Payable } from 'generated/prisma';

const scope = resolveAccountingScope({ userId: 'owner-1' }, 'unit-1');

// The multi-item COMPRA fixture (F0-3). Values were chosen so desconto+frete+IPI do NOT divide exact
// across the 3 itens → exercises the rateio residue (Gate 1). Parsed by the REAL lib/nfe.ts here.
const PURCHASE_XML = readFileSync(
  join(__dirname, '../../../../lib/__tests__/fixtures/nfe/purchase-multi-item.SYNTHETIC.xml'),
  'utf8',
);

// Fixture facts (from the XML totals, §5 cost D3):
//   vProd 183.33, vDesc 10.00, vFrete 15.00, vIPI 5.00, vST 0, vOutro 0 → custo = 18333−1000+1500+500 = 19333
//   (vICMS 33.00 is NOT subtracted — the named ALTO risk). vNF = 193.33 = 19333 → ties out.
const CHAVE = '35250712345678000190550010000000011000000017';
const CUSTO_TOTAL = 19333;

/** cProd → productRef mappings covering all 3 fixture itens (D6). */
const FULL_MAPPINGS: ImportNfePurchaseInput['itemMappings'] = [
  { cProd: 'SHAMP-500', productRef: 'prod-shamp' },
  { cProd: 'COND-500', productRef: 'prod-cond' },
  { cProd: 'MASC-300', productRef: 'prod-masc' },
];

function payableRow(over: Partial<Payable> = {}): Payable {
  return {
    id: 'pay-nfe-1', userId: 'owner-1', unitId: 'unit-1', supplierName: 'ACME', supplierRef: null,
    counterpartyId: null, documentNumber: CHAVE, description: 'NF-e', issueDate: new Date('2025-07-10'),
    dueDate: new Date('2025-07-10'), amountCents: CUSTO_TOTAL, expenseAccountId: null,
    inventoryProductRef: null, inventoryQty: null, inventoryMultiItem: true,
    status: 'OPEN', createdById: 'owner-1', cancelledById: null, cancelReason: null,
    createdAt: new Date(), updatedAt: new Date(), deletedAt: null, ...over,
  } as Payable;
}

interface Opts {
  canManage?: boolean;
  counterparty?: { id: string; userId: string; unitId: string; type: string } | null;
  /** Successive createPayable behaviours: 'ok' resolves, 'dup' throws the @@unique ValidationError. */
  createResults?: Array<'ok' | 'dup'>;
}

function build(opts: Opts = {}) {
  const createResults = [...(opts.createResults ?? ['ok'])];
  const createPayable = jest.fn(async (_s: unknown, input: CreatePayableInput) => {
    const r = createResults.length ? createResults.shift()! : 'ok';
    if (r === 'dup') {
      throw new ValidationError('Já existe uma conta a pagar em aberto para este fornecedor e documento.');
    }
    return payableRow({ documentNumber: input.documentNumber ?? CHAVE, amountCents: input.amountCents });
  });
  const payableService = { createPayable };

  const defaultCp = { id: 'cp-sup', userId: 'owner-1', unitId: 'unit-1', type: 'SUPPLIER' };
  const counterpartyRepo = {
    findById: jest.fn(async () => (opts.counterparty === undefined ? defaultCp : opts.counterparty)),
  };
  const policy = { canManagePayable: () => opts.canManage ?? true };
  const auditService = { append: jest.fn(async () => undefined) };

  const service = new NfeImportService(
    payableService as never,
    counterpartyRepo as never,
    policy as never,
    auditService as never,
  );
  return { service, createPayable, counterpartyRepo, auditService };
}

function dto(over: Partial<ImportNfePurchaseInput> = {}): ImportNfePurchaseInput {
  return { unitId: 'unit-1', itemMappings: FULL_MAPPINGS, ...over };
}

describe('NfeImportService.importPurchase', () => {
  it('computes cost D3 and books ONE Payable with the note total (F-NFE7→a)', async () => {
    const { service, createPayable } = build();

    const payable = await service.importPurchase(scope, PURCHASE_XML, dto());

    expect(createPayable).toHaveBeenCalledTimes(1);
    const input = createPayable.mock.calls[0][1] as CreatePayableInput;
    // Cost D3: vProd − vDesc + vFrete + vOutro + vIPI + vST (ICMS próprio NOT subtracted).
    expect(input.amountCents).toBe(CUSTO_TOTAL);
    // Multi-item shape: flag set, NO single-SKU columns, NO expense.
    expect(input.inventoryMultiItem).toBe(true);
    expect(input.inventoryProductRef).toBeUndefined();
    expect(input.inventoryQty).toBeUndefined();
    expect(input.expenseAccountId).toBeUndefined();
    expect(payable.id).toBe('pay-nfe-1');
  });

  it('rateia the header proportional to vProd with the residue on the last line → Σ === total (Gate 1)', async () => {
    const { service, createPayable } = build();

    await service.importPurchase(scope, PURCHASE_XML, dto());

    const input = createPayable.mock.calls[0][1] as CreatePayableInput;
    const items = input.inventoryItems!;
    expect(items).toHaveLength(3);
    // floor(19333·10000/18333)=10545 · floor(19333·5000/18333)=5272 · residue=19333−15817=3516
    expect(items.map((i) => i.valueCents)).toEqual([10545, 5272, 3516]);
    // Tie-out: the shares sum EXACTLY to the note total (no cent lost, no float).
    expect(items.reduce((a, i) => a + i.valueCents, 0)).toBe(CUSTO_TOTAL);
    // qCom → integer units per item, mapped productRef preserved (D6).
    expect(items.map((i) => i.qty)).toEqual([10, 5, 3]);
    expect(items.map((i) => i.productRef)).toEqual(['prod-shamp', 'prod-cond', 'prod-masc']);
  });

  it('keys idempotency on the access key: documentNumber === chaveAcesso (Gate 2, T7)', async () => {
    const { service, createPayable } = build();

    await service.importPurchase(scope, PURCHASE_XML, dto());

    const input = createPayable.mock.calls[0][1] as CreatePayableInput;
    expect(input.documentNumber).toBe(CHAVE);
  });

  it('re-import trips the business key: createPayable rejects loud, NOT swallowed → still 1 Payable (Gate 2)', async () => {
    const { service, createPayable } = build({ createResults: ['ok', 'dup'] });

    await service.importPurchase(scope, PURCHASE_XML, dto()); // 1st import books the payable

    // 2nd import of the SAME note → @@unique(supplierName, documentNumber=chave) collides; the service
    // propagates the rejection instead of minting a second passivo/estoque (and never broad-catches it).
    await expect(service.importPurchase(scope, PURCHASE_XML, dto())).rejects.toThrow(ValidationError);
    expect(createPayable).toHaveBeenCalledTimes(2); // attempted twice; only the 1st succeeded
  });

  it('rejects an item with no operator mapping (D6) before any write', async () => {
    const { service, createPayable } = build();

    // Drop the mapping for MASC-300 → that note item is unmapped.
    const partial = dto({
      itemMappings: [
        { cProd: 'SHAMP-500', productRef: 'prod-shamp' },
        { cProd: 'COND-500', productRef: 'prod-cond' },
      ],
    });

    await expect(service.importPurchase(scope, PURCHASE_XML, partial)).rejects.toThrow(ValidationError);
    expect(createPayable).not.toHaveBeenCalled();
  });

  it('D6: an operator-confirmed counterpartyId must be a live SUPPLIER of this unit', async () => {
    // Cross-tenant / archived id → findById returns null → reject.
    const missing = build({ counterparty: null });
    await expect(
      missing.service.importPurchase(scope, PURCHASE_XML, dto({ counterpartyId: 'cp-x' })),
    ).rejects.toThrow(ValidationError);
    expect(missing.createPayable).not.toHaveBeenCalled();

    // A CUSTOMER counterparty → reject (a compra links only a SUPPLIER).
    const customer = build({ counterparty: { id: 'cp-c', userId: 'owner-1', unitId: 'unit-1', type: 'CUSTOMER' } });
    await expect(
      customer.service.importPurchase(scope, PURCHASE_XML, dto({ counterpartyId: 'cp-c' })),
    ).rejects.toThrow(ValidationError);
  });

  it('passes a confirmed SUPPLIER counterpartyId through to createPayable', async () => {
    const { service, createPayable } = build(); // default counterparty = SUPPLIER cp-sup
    await service.importPurchase(scope, PURCHASE_XML, dto({ counterpartyId: 'cp-sup' }));
    const input = createPayable.mock.calls[0][1] as CreatePayableInput;
    expect(input.counterpartyId).toBe('cp-sup');
  });

  it('enforces the policy gate (canManagePayable)', async () => {
    const { service, createPayable } = build({ canManage: false });
    await expect(service.importPurchase(scope, PURCHASE_XML, dto())).rejects.toThrow(ForbiddenError);
    expect(createPayable).not.toHaveBeenCalled();
  });

  it('propagates the parser gate (D5): a non-authorized note never reaches createPayable', async () => {
    const { service, createPayable } = build();
    // Flip cStat 100 → 110 (Uso Denegado): parseNfe rejects loud before any valuation.
    const denegada = PURCHASE_XML.replace('<cStat>100</cStat>', '<cStat>110</cStat>');
    await expect(service.importPurchase(scope, denegada, dto())).rejects.toThrow(ValidationError);
    expect(createPayable).not.toHaveBeenCalled();
  });
});

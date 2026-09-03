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
    return payableRow({ documentNumber: input.documentNumber ?? CHAVE, amountCents: BigInt(input.amountCents) });
  });
  const payableService = { createPayable };

  const defaultCp = { id: 'cp-sup', userId: 'owner-1', unitId: 'unit-1', type: 'SUPPLIER' };
  const counterpartyRepo = {
    findById: jest.fn(async () => (opts.counterparty === undefined ? defaultCp : opts.counterparty)),
  };
  const policy = { canManagePayable: () => opts.canManage ?? true };

  const service = new NfeImportService(
    payableService as never,
    counterpartyRepo as never,
    policy as never,
  );
  return { service, createPayable, counterpartyRepo };
}

function dto(over: Partial<ImportNfePurchaseInput> = {}): ImportNfePurchaseInput {
  return { unitId: 'unit-1', itemMappings: FULL_MAPPINGS, ...over };
}

/**
 * A minimal authorized NF-e built INLINE. Deliberately NOT a new file under `lib/__tests__/fixtures/nfe`
 * — that directory is the F0-3 merge gate (`nfe-fixture-provenance.test.ts` scans it), so a throwaway
 * arithmetic vehicle does not belong there. Only the tags `parseNfe` reads are emitted.
 */
function inlineNfe(
  items: Array<{ cProd: string; xProd: string; qCom: string; vProd: string; indTot?: string }>,
  totals: { vProd: string; vFrete?: string; vSeg?: string; vDesc?: string; vIPI?: string; vNF: string },
): string {
  const chave = '35250712345678000190550010000000021000000025';
  const dets = items
    .map(
      (it, i) => `      <det nItem="${i + 1}">
        <prod>
          <cProd>${it.cProd}</cProd>
          <xProd>${it.xProd}</xProd>
          <uCom>UN</uCom>
          <qCom>${it.qCom}</qCom>
          <vUnCom>1.0000000000</vUnCom>
          <vProd>${it.vProd}</vProd>
          <indTot>${it.indTot ?? '1'}</indTot>
        </prod>
      </det>`,
    )
    .join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>
<nfeProc xmlns="http://www.portalfiscal.inf.br/nfe" versao="4.00">
  <NFe>
    <infNFe Id="NFe${chave}" versao="4.00">
      <ide>
        <natOp>COMPRA</natOp><mod>55</mod><serie>1</serie><nNF>2</nNF>
        <dhEmi>2025-07-11T09:30:00-03:00</dhEmi><tpNF>1</tpNF><tpAmb>1</tpAmb>
      </ide>
      <emit><CNPJ>12345678000190</CNPJ><xNome>FORNECEDOR EXEMPLO LTDA</xNome></emit>
      <dest><CNPJ>98765432000155</CNPJ><xNome>SALAO EXEMPLO LTDA</xNome></dest>
${dets}
      <total>
        <ICMSTot>
          <vProd>${totals.vProd}</vProd>
          <vFrete>${totals.vFrete ?? '0.00'}</vFrete>
          <vDesc>${totals.vDesc ?? '0.00'}</vDesc>
          <vIPI>${totals.vIPI ?? '0.00'}</vIPI>
          <vST>0.00</vST><vSeg>${totals.vSeg ?? '0.00'}</vSeg><vOutro>0.00</vOutro><vICMS>0.00</vICMS>
          <vNF>${totals.vNF}</vNF>
        </ICMSTot>
      </total>
    </infNFe>
  </NFe>
  <protNFe versao="4.00">
    <infProt>
      <chNFe>${chave}</chNFe><dhRecbto>2025-07-11T09:31:12-03:00</dhRecbto>
      <nProt>135250000000025</nProt><cStat>100</cStat>
    </infProt>
  </protNFe>
</nfeProc>`;
}

describe('NfeImportService.importPurchase', () => {
  it('computes cost D3 and books ONE Payable with the note total (F-NFE7→a)', async () => {
    const { service, createPayable } = build();

    const { payable, ignoredItems } = await service.importPurchase(scope, PURCHASE_XML, dto());

    expect(createPayable).toHaveBeenCalledTimes(1);
    expect(ignoredItems).toEqual([]); // every fixture line has indTot=1 → nothing ignored
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

// ── vSeg (seguro) compõe o custo D3 (decisão E) ──────────────────────────────────────────────────
// Seguro é custo de aquisição e compõe o vNF. Sem ele o passivo nasceria menor que a nota e o
// pagamento full-balance quitaria a menos.
describe('NfeImportService.importPurchase — vSeg entra no custo D3 (decisão E)', () => {
  it('inclui o seguro no passivo: custo casa com vNF quando a nota tem vSeg', async () => {
    // vProd 100,00 + vFrete 10,00 + vSeg 5,00 = vNF 115,00. Sem vSeg o passivo daria 11000 (< nota).
    const xml = inlineNfe(
      [{ cProd: 'SEG-1', xProd: 'Item com seguro', qCom: '1', vProd: '100.00' }],
      { vProd: '100.00', vFrete: '10.00', vSeg: '5.00', vNF: '115.00' },
    );
    const { service, createPayable } = build();
    await service.importPurchase(
      scope, xml, dto({ itemMappings: [{ cProd: 'SEG-1', productRef: 'prod-seg' }] }),
    );
    const input = createPayable.mock.calls[0][1] as CreatePayableInput;
    // 10000 (vProd) + 1000 (vFrete) + 500 (vSeg) = 11500 = vNF. Sem a correção (E) daria 11000.
    expect(input.amountCents).toBe(11500);
  });
});

// ── indTot='0' (MOC I17b, layout transcription §I17b) ────────────────────────────────────────────
// The tag was parsed but had ZERO consumers: a line that does NOT compose the note total was still
// receiving a share of the acquisition cost AND a stock inbound. It must be excluded from the rateio
// weight and from the subledger, and REPORTED (never a silent drop).
describe('NfeImportService.importPurchase — indTot=0 (item que não compõe o total)', () => {
  /** The fixture's 2nd item (COND-500, vProd 50.00) flipped to indTot=0. The header totals are left as
   *  they are: what is under test is what the ALLOCATION does with the flag. */
  const XML_INDTOT_0 = PURCHASE_XML.replace(
    /(<vProd>50\.00<\/vProd>\s*)<indTot>1<\/indTot>/,
    '$1<indTot>0</indTot>',
  );

  it('exclui o item indTot=0 do rateio E do estoque, e o reporta no resultado', async () => {
    // Guard: the replace above really changed the document (else the test would pass vacuously).
    expect(XML_INDTOT_0).not.toBe(PURCHASE_XML);

    const { service, createPayable } = build();
    const { ignoredItems } = await service.importPurchase(scope, XML_INDTOT_0, dto());

    const items = createPayable.mock.calls[0][1].inventoryItems!;
    // Only the 2 costed lines reach the subledger — COND-500 has NO stock movement and NO cost.
    expect(items.map((i) => i.productRef)).toEqual(['prod-shamp', 'prod-masc']);
    expect(items.some((i) => i.productRef === 'prod-cond')).toBe(false);
    // Rateio over the REMAINING weight (10000 + 3333 = 13333): floor(19333·10000/13333)=14500, residue 4833.
    expect(items.map((i) => i.valueCents)).toEqual([14500, 4833]);
    // Tie-out survives the exclusion: Σ shares === the 1.1.6 debit.
    expect(items.reduce((a, i) => a + i.valueCents, 0)).toBe(CUSTO_TOTAL);
    // Reported, not swallowed.
    expect(ignoredItems).toEqual([
      { nItem: 2, cProd: 'COND-500', xProd: 'Condicionador Profissional 500ml', reason: 'indTot-0' },
    ]);
  });

  it('um item indTot=0 NÃO precisa de mapeamento (nunca chega ao estoque)', async () => {
    const { service, createPayable } = build();
    // Mapping for COND-500 dropped on purpose — the excluded line must not trip the D6 gate.
    const partial = dto({
      itemMappings: [
        { cProd: 'SHAMP-500', productRef: 'prod-shamp' },
        { cProd: 'MASC-300', productRef: 'prod-masc' },
      ],
    });
    await expect(service.importPurchase(scope, XML_INDTOT_0, partial)).resolves.toBeDefined();
    expect(createPayable).toHaveBeenCalledTimes(1);
  });

  it('rejeita loud uma nota em que TODOS os itens são indTot=0 (nada a custear)', async () => {
    const allZero = PURCHASE_XML.replace(/<indTot>1<\/indTot>/g, '<indTot>0</indTot>');
    const { service, createPayable } = build();
    await expect(service.importPurchase(scope, allZero, dto())).rejects.toThrow(ValidationError);
    expect(createPayable).not.toHaveBeenCalled();
  });
});

// ── rateio arithmetic: the product must not cross the float boundary ─────────────────────────────
describe('NfeImportService.importPurchase — rateio em BigInt (sem fronteira de float)', () => {
  it('mantém o share EXATO quando custoTotal × vProd estoura 2^53', async () => {
    // custoTotal = 1 988 479 238 cents, item vProd = 251 629 936, Σ vProd = 503 259 872.
    // Exact:  (1988479238 × 251629936) / 503259872 = 994239619
    // Double: Math.floor((1988479238 * 251629936) / 503259872) = 994239618  ← one cent on the wrong SKU
    const xml = inlineNfe(
      [
        { cProd: 'BIG-1', xProd: 'Item grande 1', qCom: '1', vProd: '2516299.36' },
        { cProd: 'BIG-2', xProd: 'Item grande 2', qCom: '1', vProd: '2516299.36' },
      ],
      { vProd: '5032598.72', vFrete: '14852193.66', vNF: '19884792.38' },
    );
    // Sanity: the double path really is wrong for these numbers (else the test proves nothing).
    expect(Math.floor((1988479238 * 251629936) / 503259872)).toBe(994239618);

    const { service, createPayable } = build();
    await service.importPurchase(
      scope,
      xml,
      dto({
        itemMappings: [
          { cProd: 'BIG-1', productRef: 'prod-big-1' },
          { cProd: 'BIG-2', productRef: 'prod-big-2' },
        ],
      }),
    );

    const input = createPayable.mock.calls[0][1] as CreatePayableInput;
    expect(input.amountCents).toBe(1988479238);
    // Two identical lines ⇒ two identical shares. The float path would give [994239618, 994239620].
    expect(input.inventoryItems!.map((i) => i.valueCents)).toEqual([994239619, 994239619]);
    expect(input.inventoryItems!.reduce((a, i) => a + i.valueCents, 0)).toBe(1988479238);
  });
});

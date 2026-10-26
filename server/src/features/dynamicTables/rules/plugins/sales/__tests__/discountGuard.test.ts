/**
 * EFICIENCIA-FISCAL PR-1 item 2 (BRIEF §3; ADR-INCR-EFICIENCIA-FISCAL D4.1, I-1, I-4; F-EF-9 a) — guarda aritmética do
 * desconto no finalize: um teste por regra e o teste de mutação do I-1.
 */
import { assertSaleDiscountItemization, isCostSnapshotOnlyWrite } from '../discountGuard';

const it_ = (id: string, data: Record<string, unknown>) => ({ id, data: { quantity: 1, ...data } });
const codeOf = (fn: () => void): string | undefined => {
  try {
    fn();
    return undefined;
  } catch (e) {
    return (e as { errorCode?: string }).errorCode;
  }
};

describe('assertSaleDiscountItemization', () => {
  it('(i) desconto destacado por item sem discountKind ⇒ DESCONTO_SEM_TIPO; só no cabeçalho (legado/wizard atual) passa — dono, 26/10', () => {
    expect(codeOf(() => assertSaleDiscountItemization({ discountAmount: 10 }, [it_('a', { unitPrice: 100, discountCents: 1_000 })]))).toBe('DESCONTO_SEM_TIPO');
    expect(codeOf(() => assertSaleDiscountItemization({ discountAmount: 10 }, [it_('a', { unitPrice: 100 })]))).toBeUndefined();
    expect(codeOf(() => assertSaleDiscountItemization({ discountAmount: 0 }, [it_('a', { unitPrice: 100 })]))).toBeUndefined();
  });

  it('(ii) Σ item.discountCents ≠ round(discountAmount × 100) ± 1 ⇒ RATEIO_NAO_FECHA', () => {
    const itens = [it_('a', { unitPrice: 100, catalogUnitPrice: 100, discountCents: 2_000 }), it_('b', { unitPrice: 100, catalogUnitPrice: 100, discountCents: 1_999 })];
    expect(codeOf(() => assertSaleDiscountItemization({ discountAmount: 40, discountKind: 'UNCONDITIONAL' }, itens))).toBeUndefined();
    expect(codeOf(() => assertSaleDiscountItemization({ discountAmount: 41, discountKind: 'UNCONDITIONAL' }, itens))).toBe('RATEIO_NAO_FECHA');
  });

  it('(iii) desconto do item negativo ou acima de quantidade × catálogo ⇒ DESCONTO_ITEM_FORA_DA_FAIXA', () => {
    expect(codeOf(() => assertSaleDiscountItemization({ discountAmount: 0, discountKind: 'UNCONDITIONAL' }, [it_('a', { unitPrice: 100, discountCents: -1 })]))).toBe(
      'DESCONTO_ITEM_FORA_DA_FAIXA',
    );
    expect(
      codeOf(() => assertSaleDiscountItemization({ discountAmount: 210, discountKind: 'UNCONDITIONAL' }, [it_('a', { unitPrice: 100, quantity: 2, discountCents: 20_001 })])),
    ).toBe('DESCONTO_ITEM_FORA_DA_FAIXA');
  });

  it('(iv) com catálogo, preço ≠ catálogo ⇒ 400 nomeado; o desconto vai em discountCents', () => {
    expect(codeOf(() => assertSaleDiscountItemization({}, [it_('a', { unitPrice: 90, catalogUnitPrice: 100 })]))).toBe('PRECO_DIFERENTE_DO_CATALOGO_SEM_DESCONTO');
    expect(codeOf(() => assertSaleDiscountItemization({}, [it_('a', { unitPrice: 110, catalogUnitPrice: 100 })]))).toBe('ITEM_ACIMA_DO_CATALOGO');
    expect(
      codeOf(() => assertSaleDiscountItemization({ discountAmount: 10, discountKind: 'UNCONDITIONAL' }, [it_('a', { unitPrice: 100, catalogUnitPrice: 100, discountCents: 1_000 })])),
    ).toBeUndefined();
  });

  it('I-1 (mutação): R$ 10 de A para B mantendo o total ⇒ 400 em B (ITEM_ACIMA_DO_CATALOGO)', () => {
    let err: { errorCode?: string; details?: { itemRef?: string } } | undefined;
    try {
      assertSaleDiscountItemization({}, [it_('A', { unitPrice: 90, catalogUnitPrice: 100 }), it_('B', { unitPrice: 110, catalogUnitPrice: 100 })]);
    } catch (e) {
      err = e as typeof err;
    }
    expect(err).toMatchObject({ errorCode: 'ITEM_ACIMA_DO_CATALOGO', details: { itemRef: 'B' } });
  });

  it('legado (sem catálogo, desconto só no cabeçalho) passa: catálogo := unitPrice e o rateio fica com o fiscal-check', () => {
    expect(codeOf(() => assertSaleDiscountItemization({ discountAmount: 15, discountKind: 'UNCONDITIONAL' }, [it_('a', { unitPrice: 100 }), it_('b', { unitPrice: 50 })]))).toBeUndefined();
  });
});

describe('isCostSnapshotOnlyWrite (item 6: única escrita em item de venda finalizada)', () => {
  it('só custoSnapshotCents mudou ⇒ true; qualquer outra coluna junto ⇒ false', () => {
    const before = { id: 'x', unitPrice: 100, custoSnapshotCents: null };
    expect(isCostSnapshotOnlyWrite(before, { ...before, custoSnapshotCents: 4_000 })).toBe(true);
    expect(isCostSnapshotOnlyWrite(before, { ...before, custoSnapshotCents: 4_000, unitPrice: 1 })).toBe(false);
    expect(isCostSnapshotOnlyWrite(before, { ...before })).toBe(false);
  });
});

/**
 * EFICIENCIA-FISCAL PR-1 itens 4 e 10 (BRIEF §3; ADR-INCR-EFICIENCIA-FISCAL D2, D6, I-1, I-3, I-7; F-EF-1 a, F-EF-4 c,
 * F-EF-14 a) — um teste por código de violação, o piso por item e o tratamento do kit.
 */
import { pisoPorItem, verificarItens, verificarKits, type CabecalhoVenda, type ItemVendido } from '../fiscalGuard';
import { naturezaDoItemDoKit } from '../../../accounting/models/taxOptimization';

const item = (over: Partial<ItemVendido> = {}): ItemVendido => ({
  itemRef: 'i1', natureza: 'SERVICO', unitPriceCents: 10_000n, catalogUnitPriceCents: 10_000n, discountCents: 0n, quantity: 1, pisoCents: 5_000n, ...over,
});
const prop = { criterio: 'PROPORCIONAL_CATALOGO' as const, severidadePisoProporcional: 'WARN' as const };
const carga = { criterio: 'CARGA_TRIBUTARIA' as const, severidadePisoProporcional: 'WARN' as const };
const cab = (over: Partial<CabecalhoVenda> = {}): CabecalhoVenda => ({ discountCents: 0n, discountKind: null, descontoItemizado: false, ...over });
const codigos = (v: ReturnType<typeof verificarItens>) => v.map((x) => `${x.code}:${x.severity}`);

describe('verificarItens — fronteira (BLOCK, sem flag de tenant — D2)', () => {
  it('ITEM_ACIMA_DO_CATALOGO', () => {
    const v = verificarItens([item({ unitPriceCents: 11_000n })], prop, cab());
    expect(v).toEqual([expect.objectContaining({ code: 'ITEM_ACIMA_DO_CATALOGO', severity: 'BLOCK', itemRef: 'i1', legalBasis: expect.stringContaining('Lei 8.137') })]);
  });

  it('PRECO_DIFERENTE_DO_CATALOGO_SEM_DESCONTO', () => {
    expect(codigos(verificarItens([item({ unitPriceCents: 9_000n })], prop, cab()))).toEqual(['PRECO_DIFERENTE_DO_CATALOGO_SEM_DESCONTO:BLOCK']);
  });

  it('I-1 (mutação): R$ 10 transferidos de A para B mantendo o total ⇒ A abaixo e B acima do catálogo', () => {
    const v = verificarItens([item({ itemRef: 'A', unitPriceCents: 9_000n }), item({ itemRef: 'B', unitPriceCents: 11_000n })], prop, cab());
    expect(v.map((x) => [x.itemRef, x.code])).toEqual([
      ['A', 'PRECO_DIFERENTE_DO_CATALOGO_SEM_DESCONTO'],
      ['B', 'ITEM_ACIMA_DO_CATALOGO'],
    ]);
  });

  it('RATEIO_NAO_FECHA (± 1 centavo tolerado)', () => {
    const itens = [item({ itemRef: 'a', discountCents: 1_000n }), item({ itemRef: 'b', discountCents: 999n, pisoCents: null })];
    expect(codigos(verificarItens(itens, prop, cab({ discountCents: 2_000n, discountKind: 'UNCONDITIONAL', descontoItemizado: true })))).not.toContain('RATEIO_NAO_FECHA:BLOCK');
    expect(codigos(verificarItens(itens, prop, cab({ discountCents: 2_100n, discountKind: 'UNCONDITIONAL', descontoItemizado: true })))).toContain('RATEIO_NAO_FECHA:BLOCK');
  });
});

describe('verificarItens — piso (F-EF-14 a: WARN sob proporcional, BLOCK sob carga)', () => {
  const abaixo = [item({ discountCents: 6_000n })]; // líquido R$ 40 < piso R$ 50
  const desc = cab({ discountCents: 6_000n, discountKind: 'UNCONDITIONAL', descontoItemizado: true });

  it('ITEM_ABAIXO_DO_PISO e COMBO_ABAIXO_DO_CUSTO = WARN no proporcional', () => {
    expect(codigos(verificarItens(abaixo, prop, desc))).toEqual(['ITEM_ABAIXO_DO_PISO:WARN', 'COMBO_ABAIXO_DO_CUSTO:WARN']);
  });

  it('… e BLOCK na carga (D6, I-3)', () => {
    expect(codigos(verificarItens(abaixo, carga, desc))).toEqual(['ITEM_ABAIXO_DO_PISO:BLOCK', 'COMBO_ABAIXO_DO_CUSTO:BLOCK']);
  });

  it('SEM_CUSTO quando há desconto e o item não tem piso', () => {
    expect(codigos(verificarItens([item({ pisoCents: null, discountCents: 1_000n })], prop, cab({ discountCents: 1_000n, discountKind: 'UNCONDITIONAL', descontoItemizado: true })))).toEqual([
      'SEM_CUSTO:WARN',
    ]);
  });

  it('sem desconto não há verificação de piso', () => {
    expect(verificarItens([item({ pisoCents: 20_000n })], carga, cab())).toEqual([]);
  });
});

describe('verificarItens — natureza do desconto', () => {
  it('DESCONTO_FORA_DO_DOCUMENTO: só no cabeçalho (legado), incondicional ou sem discountKind', () => {
    expect(codigos(verificarItens([item({ discountCents: 1_000n })], prop, cab({ discountCents: 1_000n, discountKind: 'UNCONDITIONAL' })))).toEqual([
      'DESCONTO_FORA_DO_DOCUMENTO:WARN',
    ]);
    expect(codigos(verificarItens([item({ discountCents: 1_000n })], prop, cab({ discountCents: 1_000n, discountKind: null })))).toEqual(['DESCONTO_FORA_DO_DOCUMENTO:WARN']);
    expect(codigos(verificarItens([item({ discountCents: 1_000n })], prop, cab({ discountCents: 1_000n, discountKind: 'CONDITIONAL' })))).toEqual([]);
  });

  it('DESCONTO_CONDICIONAL_COMO_INCONDICIONAL: condicional lançado por item', () => {
    expect(codigos(verificarItens([item({ discountCents: 1_000n })], prop, cab({ discountCents: 1_000n, discountKind: 'CONDITIONAL', descontoItemizado: true })))).toEqual([
      'DESCONTO_CONDICIONAL_COMO_INCONDICIONAL:WARN',
    ]);
  });
});

describe('pisoPorItem (F-EF-1 a; D6)', () => {
  const custo = { custoCents: 4_000n, catalogoMinimoCents: 6_000n };
  it('produto = custo médio unitário × quantidade; sem custo ⇒ null', () => {
    expect(pisoPorItem({ natureza: 'REVENDA', quantity: 3, custoSnapshotCents: 1_500n }, { pisoServico: 'CUSTO_INFORMADO' }, null)).toBe(4_500n);
    expect(pisoPorItem({ natureza: 'REVENDA', quantity: 3, custoSnapshotCents: null }, { pisoServico: 'CUSTO_INFORMADO' }, null)).toBeNull();
  });
  it('serviço: custo informado → preço mínimo → nenhum, a partir do ponto que a política escolhe', () => {
    const s = { natureza: 'SERVICO' as const, quantity: 2, custoSnapshotCents: null };
    expect(pisoPorItem(s, { pisoServico: 'CUSTO_INFORMADO' }, custo)).toBe(8_000n);
    expect(pisoPorItem(s, { pisoServico: 'CUSTO_INFORMADO' }, { custoCents: null, catalogoMinimoCents: 6_000n })).toBe(12_000n);
    expect(pisoPorItem(s, { pisoServico: 'CATALOGO_MINIMO' }, custo)).toBe(12_000n);
    expect(pisoPorItem(s, { pisoServico: 'SEM_DESCONTO_ALEM_DO_PROPORCIONAL' }, custo)).toBeNull();
    expect(pisoPorItem(s, { pisoServico: 'CUSTO_INFORMADO' }, null)).toBeNull();
  });
  it('pacote fica fora da alocação', () => {
    expect(pisoPorItem({ natureza: 'PACOTE', quantity: 1, custoSnapshotCents: 100n }, { pisoServico: 'CUSTO_INFORMADO' }, custo)).toBeNull();
  });
});

describe('kit (item 10; F-EF-4 c; I-7)', () => {
  it('KIT_SEM_PRINCIPAL: naturezas diferentes sem item principal ⇒ aviso; com principal ⇒ nada', () => {
    const kit = [
      { itemRef: 'a', natureza: 'SERVICO' as const, kitRef: 'kit-1', principalItem: false },
      { itemRef: 'b', natureza: 'REVENDA' as const, kitRef: 'kit-1', principalItem: false },
      { itemRef: 'c', natureza: 'REVENDA' as const, kitRef: null, principalItem: false },
    ];
    expect(verificarKits(kit)).toEqual([expect.objectContaining({ code: 'KIT_SEM_PRINCIPAL', severity: 'WARN', itemRef: null })]);
    expect(verificarKits(kit.map((k) => (k.itemRef === 'a' ? { ...k, principalItem: true } : k)))).toEqual([]);
  });

  it('tratamento do principal só com PRINCIPAL_ACESSORIO aceita E a partir de 2027', () => {
    expect(naturezaDoItemDoKit('REVENDA', 'SERVICO', true, '2026-12-31')).toBe('REVENDA');
    expect(naturezaDoItemDoKit('REVENDA', 'SERVICO', true, '2027-01-01')).toBe('SERVICO');
    expect(naturezaDoItemDoKit('REVENDA', 'SERVICO', false, '2027-06-01')).toBe('REVENDA');
  });
});

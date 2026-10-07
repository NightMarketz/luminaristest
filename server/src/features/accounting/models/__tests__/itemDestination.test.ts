import { defaultByProductRefFrom, resolveDestinations } from '../itemDestination';

import { CFOPS_IMOBILIZADO_SEMENTE } from '@test/helpers/legalParams';
/**
 * ITEM-DESTINATION item 9 (resolver puro) + EMENDA 29/09 itens 22–23. PR-1 (BRIEF §7): sem a origem PRODUTO —
 * a destinação vem do override do `itemMapping` (o `classId` é a declaração de IMOBILIZADO) ou cai em
 * REVENDA/FALLBACK com warning (F-ID-6 a).
 */
describe('resolveDestinations', () => {
  const itens = [
    { nItem: 1, cProd: 'TINTA', cfop: '5102' },
    { nItem: 2, cProd: 'MAQ', cfop: '5102' },
    { nItem: 3, cProd: 'SHAMPOO', cfop: '5102' },
  ];

  it('uma origem por item: OVERRIDE por destination, OVERRIDE por classId (IMOBILIZADO), FALLBACK com warning', () => {
    const r = resolveDestinations(
      itens,
      new Map([
        ['TINTA', { productRef: 'tinta-1', destination: 'INSUMO_SERVICO' as const }],
        ['MAQ', { classId: 'class-1' }],
        ['SHAMPOO', { productRef: 'shampoo-1' }],
      ]), new Map(), CFOPS_IMOBILIZADO_SEMENTE,
    );
    expect(r.destinacoes).toEqual([
      { nItem: 1, cProd: 'TINTA', destination: 'INSUMO_SERVICO', origem: 'OVERRIDE' },
      { nItem: 2, cProd: 'MAQ', destination: 'IMOBILIZADO', origem: 'OVERRIDE' },
      { nItem: 3, cProd: 'SHAMPOO', destination: 'REVENDA', origem: 'FALLBACK' },
    ]);
    expect([...r.byNItem.entries()]).toEqual([[1, 'INSUMO_SERVICO'], [2, 'IMOBILIZADO'], [3, 'REVENDA']]);
    expect(r.warnings).toHaveLength(1);
    expect(r.warnings[0]).toMatch(/item 3 \(SHAMPOO\).*REVENDA.*FALLBACK/);
  });

  it('sem mapeamento algum (preview cru): tudo REVENDA/FALLBACK', () => {
    const r = resolveDestinations(itens, new Map(), new Map(), CFOPS_IMOBILIZADO_SEMENTE);
    expect(r.destinacoes.map((d) => `${d.destination}/${d.origem}`)).toEqual(Array(3).fill('REVENDA/FALLBACK'));
  });

  it('EMENDA item 23 — CFOP 1551/2551 mapeado com productRef: só warning, a destinação segue o mapeamento', () => {
    const r = resolveDestinations(
      [{ nItem: 1, cProd: 'MAQ', cfop: '1551' }, { nItem: 2, cProd: 'X', cfop: '2551' }],
      new Map([
        ['MAQ', { productRef: 'maq-1', destination: 'REVENDA' as const }],
        ['X', { productRef: 'x-1', destination: 'INSUMO_SERVICO' as const }],
      ]), new Map(), CFOPS_IMOBILIZADO_SEMENTE,
    );
    expect(r.destinacoes.map((d) => d.destination)).toEqual(['REVENDA', 'INSUMO_SERVICO']);
    expect(r.warnings.filter((w) => /CFOP de imobilizado mapeado como estoque\/insumo — confira/.test(w))).toHaveLength(2);
  });
});

// ITEM-DESTINATION PR-2 (item 9, origem PRODUTO — F-ID-2 a; EMENDA item 25).
describe('resolveDestinations — default por produto', () => {
  it('3 itens, um por origem: OVERRIDE vence o default, PRODUTO sem override, FALLBACK sem default', () => {
    const r = resolveDestinations(
      [
        { nItem: 1, cProd: 'TINTA', cfop: '5102' },
        { nItem: 2, cProd: 'OXI', cfop: '5102' },
        { nItem: 3, cProd: 'SHAMPOO', cfop: '5102' },
      ],
      new Map([
        ['TINTA', { productRef: 'tinta-1', destination: 'REVENDA' as const }],
        ['OXI', { productRef: 'oxi-1' }],
        ['SHAMPOO', { productRef: 'shampoo-1' }],
      ]),
      new Map([
        ['tinta-1', 'INSUMO_SERVICO' as const],
        ['oxi-1', 'INSUMO_SERVICO' as const],
      ]), CFOPS_IMOBILIZADO_SEMENTE,
    );
    expect(r.destinacoes).toEqual([
      { nItem: 1, cProd: 'TINTA', destination: 'REVENDA', origem: 'OVERRIDE' },
      { nItem: 2, cProd: 'OXI', destination: 'INSUMO_SERVICO', origem: 'PRODUTO' },
      { nItem: 3, cProd: 'SHAMPOO', destination: 'REVENDA', origem: 'FALLBACK' },
    ]);
    expect(r.warnings).toHaveLength(1); // só o FALLBACK avisa
    expect(r.warnings[0]).toMatch(/item 3 \(SHAMPOO\)/);
  });

  it('classId (IMOBILIZADO) ignora o default; o default não alcança item sem productRef', () => {
    const r = resolveDestinations(
      [{ nItem: 1, cProd: 'MAQ', cfop: '5102' }, { nItem: 2, cProd: 'SOLTO', cfop: '5102' }],
      new Map([['MAQ', { classId: 'class-1' }]]),
      new Map([['maq-1', 'REVENDA' as const]]), CFOPS_IMOBILIZADO_SEMENTE,
    );
    expect(r.destinacoes.map((d) => `${d.destination}/${d.origem}`)).toEqual(['IMOBILIZADO/OVERRIDE', 'REVENDA/FALLBACK']);
  });

  it('defaultByProductRefFrom: valor fora de REVENDA|INSUMO_SERVICO (inclusive IMOBILIZADO) falha alto', () => {
    expect([...defaultByProductRefFrom([{ productRef: 'a', destination: 'REVENDA' }]).entries()]).toEqual([['a', 'REVENDA']]);
    expect(() => defaultByProductRefFrom([{ productRef: 'a', destination: 'IMOBILIZADO' }])).toThrow(/destination inválida 'IMOBILIZADO'/);
  });
});

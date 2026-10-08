/**
 * BE-INCR-SIMPLES-NACIONAL PR-2 (nó X14, item 15) — rateio puro do subrazão: Σ das linhas = créditos 3.1/3.3 que o
 * `SaleFinalizedMapper` lança (`splitRevenueCredit`), em qualquer combinação de itens.
 */
import { ratearReceita } from '../ReceitaFiscalService';
import { splitRevenueCredit } from '../../sync/mappers/revenueSplit';
import type { SaleRevenueLine } from '../../sync/bridges/saleItems';

const L = (itemRef: string, nature: 'Service' | 'Product', lineReais: number): SaleRevenueLine => ({
  itemRef, nature, serviceRef: nature === 'Service' ? `s-${itemRef}` : null, productRef: nature === 'Product' ? `p-${itemRef}` : null, employeeRef: null, lineReais,
});
const soma = (natureza: string, r: ReturnType<typeof ratearReceita>) => r.filter((x) => x.natureza === natureza).reduce((s, x) => s + x.receitaCents, 0);

describe('ratearReceita', () => {
  it('três serviços que não dividem exato: o resíduo vai para o último e o total bate com o crédito 3.1', () => {
    const r = ratearReceita(100, [L('a', 'Service', 1), L('b', 'Service', 1), L('c', 'Service', 1)]);
    expect(r.map((x) => x.receitaCents)).toEqual([3333, 3333, 3334]);
  });

  it('mista com desconto no cabeçalho: cada natureza soma exatamente o crédito do razão', () => {
    const lines = [L('a', 'Service', 70), L('b', 'Service', 33.33), L('c', 'Product', 49.99)];
    const r = ratearReceita(147.31, lines);
    const [c31, c33] = splitRevenueCredit(14731, { serviceReais: 103.33, productReais: 49.99 });
    expect([soma('SERVICO', r), soma('REVENDA', r)]).toEqual([c31.creditCents, c33.creditCents]);
  });

  it('sem decomposição utilizável (itens de preço zero ou nenhum item): uma linha de serviço com a venda inteira, como o razão', () => {
    expect(ratearReceita(80, [])).toEqual([{ line: null, natureza: 'SERVICO', receitaCents: 8000 }]);
    expect(ratearReceita(80, [L('a', 'Product', 0)])).toEqual([{ line: null, natureza: 'SERVICO', receitaCents: 8000 }]);
  });

  it('item de preço zero numa venda com outros itens não gera linha', () => {
    const r = ratearReceita(50, [L('a', 'Service', 50), L('b', 'Service', 0)]);
    expect(r.map((x) => x.line?.itemRef)).toEqual(['a']);
  });
});

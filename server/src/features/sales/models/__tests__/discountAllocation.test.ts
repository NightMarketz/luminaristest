/**
 * EFICIENCIA-FISCAL PR-1 item 3 (BRIEF §3; ADR-INCR-EFICIENCIA-FISCAL D5, D6, §12, I-3, I-4b) — alocação fiscal do desconto.
 * Caso do ADR §12: serviço R$ 100 (piso R$ 70) + cosmético R$ 100 (custo R$ 60), combo de R$ 200 vendido por R$ 160,
 * R$ 110 e R$ 50. Σ (catálogo − piso) = 30 + 40 = R$ 70: o desconto de R$ 90 (combo R$ 110) e o de R$ 150 (combo R$ 50)
 * passam desse total — a conta do ADR para R$ 110 ("cosmético R$ 80") não fecha (70 + 80 = 150 ≠ 110); vale a aritmética.
 */
import { alocarDescontoFiscal, economiaPotencialCents, type ItemParaAlocacao } from '../discountAllocation';

const servico = (over: Partial<ItemParaAlocacao> = {}): ItemParaAlocacao => ({
  itemRef: 'a-servico', catalogUnitPriceCents: 10_000n, quantity: 1, pisoCents: 7_000n, cargaBp: 1_500, ...over,
});
const cosmetico = (over: Partial<ItemParaAlocacao> = {}): ItemParaAlocacao => ({
  itemRef: 'b-cosmetico', catalogUnitPriceCents: 10_000n, quantity: 1, pisoCents: 6_000n, cargaBp: 600, ...over,
});
const porRef = (r: ReturnType<typeof alocarDescontoFiscal>) => Object.fromEntries(r.porItem.map((p) => [p.itemRef, p.discountCents]));
const soma = (r: ReturnType<typeof alocarDescontoFiscal>) => r.porItem.reduce((s, p) => s + p.discountCents, 0n);

describe('alocarDescontoFiscal — PROPORCIONAL_CATALOGO (padrão desde 21/10)', () => {
  it('combo R$ 200 → R$ 160: R$ 20 em cada item (peso = catálogo × quantidade)', () => {
    const r = alocarDescontoFiscal([servico(), cosmetico()], 4_000n, 'PROPORCIONAL_CATALOGO');
    expect(porRef(r)).toEqual({ 'a-servico': 2_000n, 'b-cosmetico': 2_000n });
    expect(r).toMatchObject({ criterioAplicado: 'PROPORCIONAL_CATALOGO', avisos: [], excedenteCents: 0n });
  });

  it('resíduo de centavo no último item da ordem estável por itemRef; soma exata', () => {
    const itens = [servico({ itemRef: 'x' }), cosmetico({ itemRef: 'y' }), servico({ itemRef: 'z', catalogUnitPriceCents: 3_333n })];
    const r = alocarDescontoFiscal(itens, 1_001n, 'PROPORCIONAL_CATALOGO');
    expect(soma(r)).toBe(1_001n);
    expect(r.porItem.map((p) => p.itemRef)).toEqual(['x', 'y', 'z']);
  });

  it('desconto acima do catálogo: aloca o catálogo inteiro e devolve o excedente', () => {
    const r = alocarDescontoFiscal([servico()], 12_000n, 'PROPORCIONAL_CATALOGO');
    expect(soma(r)).toBe(10_000n);
    expect(r.excedenteCents).toBe(2_000n);
  });
});

describe('alocarDescontoFiscal — CARGA_TRIBUTARIA (só com aceite do contador)', () => {
  it('combo R$ 200 → R$ 160: o item de maior carga recebe até o piso (R$ 30), o resto vai ao seguinte', () => {
    const r = alocarDescontoFiscal([servico(), cosmetico()], 4_000n, 'CARGA_TRIBUTARIA');
    expect(porRef(r)).toEqual({ 'a-servico': 3_000n, 'b-cosmetico': 1_000n });
    expect(r).toMatchObject({ criterioAplicado: 'CARGA_TRIBUTARIA', excedenteCents: 0n });
  });

  it('combo R$ 200 → R$ 110: Σ (catálogo − piso) = R$ 70 < R$ 90 ⇒ excedente R$ 20 (COMBO_ABAIXO_DO_CUSTO)', () => {
    const r = alocarDescontoFiscal([servico(), cosmetico()], 9_000n, 'CARGA_TRIBUTARIA');
    expect(porRef(r)).toEqual({ 'a-servico': 3_000n, 'b-cosmetico': 4_000n });
    expect(r.excedenteCents).toBe(2_000n);
  });

  it('combo R$ 200 → R$ 50: excedente R$ 80', () => {
    expect(alocarDescontoFiscal([servico(), cosmetico()], 15_000n, 'CARGA_TRIBUTARIA').excedenteCents).toBe(8_000n);
  });

  it('item sem piso não passa da cota proporcional (D6) e gera aviso SEM_CUSTO', () => {
    const r = alocarDescontoFiscal([servico({ pisoCents: null }), cosmetico()], 4_000n, 'CARGA_TRIBUTARIA');
    expect(porRef(r)).toEqual({ 'a-servico': 2_000n, 'b-cosmetico': 2_000n });
    expect(r.avisos).toEqual(['SEM_CUSTO']);
  });

  it('carga indeterminada em algum item ⇒ proporcional com ORDEM_DE_CARGA_INDETERMINADA (D5)', () => {
    const r = alocarDescontoFiscal([servico({ cargaBp: null }), cosmetico()], 4_000n, 'CARGA_TRIBUTARIA');
    expect(r).toMatchObject({ criterioAplicado: 'PROPORCIONAL_CATALOGO', avisos: ['ORDEM_DE_CARGA_INDETERMINADA'] });
    expect(porRef(r)).toEqual({ 'a-servico': 2_000n, 'b-cosmetico': 2_000n });
  });

  it('empate de carga: maior catálogo primeiro, depois itemRef', () => {
    const r = alocarDescontoFiscal(
      [servico({ itemRef: 'b', cargaBp: 900, pisoCents: 0n }), servico({ itemRef: 'a', cargaBp: 900, catalogUnitPriceCents: 5_000n, pisoCents: 0n })],
      6_000n,
      'CARGA_TRIBUTARIA',
    );
    expect(porRef(r)).toEqual({ a: 0n, b: 6_000n });
  });
});

describe('I-4b — determinismo (propriedade)', () => {
  it('mesmos itens em qualquer ordem de entrada ⇒ a mesma alocação, nos dois critérios', () => {
    let seed = 7;
    const rnd = (n: number) => (seed = (seed * 1_103_515_245 + 12_345) % 2 ** 31) % n;
    for (let caso = 0; caso < 200; caso++) {
      const itens: ItemParaAlocacao[] = Array.from({ length: 1 + rnd(5) }, (_, i) => ({
        itemRef: `it-${caso}-${i}`,
        catalogUnitPriceCents: BigInt(100 + rnd(50_000)),
        quantity: 1 + rnd(3),
        pisoCents: rnd(4) === 0 ? null : BigInt(rnd(20_000)),
        cargaBp: rnd(6) === 0 ? null : rnd(3_000),
      }));
      const desconto = BigInt(rnd(60_000));
      const embaralhado = [...itens].reverse();
      for (const c of ['PROPORCIONAL_CATALOGO', 'CARGA_TRIBUTARIA'] as const) {
        const a = alocarDescontoFiscal(itens, desconto, c);
        expect(alocarDescontoFiscal(embaralhado, desconto, c)).toEqual(a);
        expect(soma(a) + a.excedenteCents).toBe(desconto);
        for (const p of a.porItem) expect(p.discountCents >= 0n).toBe(true);
      }
    }
  });
});

describe('economiaPotencialCents (item 8)', () => {
  it('Σ cargaBp × (desconto da carga − desconto proporcional) / 10 000', () => {
    const itens = [servico(), cosmetico()];
    const carga = alocarDescontoFiscal(itens, 4_000n, 'CARGA_TRIBUTARIA');
    const prop = alocarDescontoFiscal(itens, 4_000n, 'PROPORCIONAL_CATALOGO');
    // serviço +R$ 10 de desconto × 15 % − cosmético −R$ 10 × 6 % = R$ 0,90
    expect(economiaPotencialCents(itens, carga, prop)).toBe(90n);
  });

  it('sem carga de todos os itens ⇒ null', () => {
    const itens = [servico({ cargaBp: null }), cosmetico()];
    expect(
      economiaPotencialCents(itens, alocarDescontoFiscal(itens, 4_000n, 'CARGA_TRIBUTARIA'), alocarDescontoFiscal(itens, 4_000n, 'PROPORCIONAL_CATALOGO')),
    ).toBeNull();
  });
});

/**
 * Onda 2.3 (auditoria fiscal/contábil de 24/11/2026) — CARACTERIZAÇÃO do float residual em reais → centavos no subrazão
 * fiscal: `ratearReceita` (rateio por proporção), `registrarVenda` (cota do profissional) e
 * `ReceitaFiscalRecebimentoService.registrar` (borda da DynamicTable, onde money é float JSON).
 *
 * Estas asserções FIXAM a saída que o código tem antes da correção, com valores que quebram em float (0,1+0,2; 1,005;
 * quantidade × preço de 0,333 e 2,5). O conversor canônico `reaisToCents` (`lib/saleLine.ts`) arredonda como o
 * `SaleFinalizedMapper` (razão): 1,005 → 100 nos dois lados, e é isso que mantém o tie-out do subrazão em dia.
 */
import { ratearReceita, ReceitaFiscalService, type VendaReconhecida } from '../ReceitaFiscalService';
import { ReceitaFiscalRecebimentoService, MEIO_PACOTE } from '../ReceitaFiscalRecebimentoService';
import { resolveAccountingScopeInternal } from '../../models/resolveAccountingScopeInternal';
import { MAX_CENTS } from '../../models/money';
import type { SaleRevenueLine } from '../../sync/bridges/saleItems';
import type { ReceitaFiscalLinhaData } from '../../repositories/IReceitaFiscalRepository';

const L = (itemRef: string, nature: 'Service' | 'Product', lineReais: number, employeeRef: string | null = null): SaleRevenueLine => ({
  itemRef,
  nature,
  serviceRef: nature === 'Service' ? `s-${itemRef}` : null,
  productRef: nature === 'Product' ? `p-${itemRef}` : null,
  employeeRef,
  lineReais,
});
const cents = (r: ReturnType<typeof ratearReceita>) => r.map((x) => x.receitaCents);
const scope = resolveAccountingScopeInternal({ userId: 'owner-1' }, 'unit-1');

describe('ratearReceita — total da venda (reais float → centavos)', () => {
  it('0,1 + 0,2 (= 0,30000000000000004) vale 30 centavos e o rateio fecha em 30', () => {
    const r = ratearReceita(0.1 + 0.2, [L('a', 'Service', 0.1), L('b', 'Service', 0.2)]);
    expect(cents(r)).toEqual([10, 20]);
  });

  it('1,005 vale 100 centavos (o float de 1,005 é 1,00499999999999989…) — igual ao SaleFinalizedMapper', () => {
    expect(cents(ratearReceita(1.005, [L('a', 'Service', 1.005)]))).toEqual([100]);
  });

  it('sem itens classificáveis: uma linha de serviço com a venda inteira', () => {
    expect(ratearReceita(0.1 + 0.2, [])).toEqual([{ line: null, natureza: 'SERVICO', receitaCents: 30 }]);
  });
});

describe('ratearReceita — linhas de quantidade × preço fracionários (a conta do bridge é quantity × unitPrice cru)', () => {
  it('0,333 × 10,00 e 2,5 × 33,33: cada natureza soma o crédito e a distribuição é a de hoje', () => {
    const a = 0.333 * 10; // 3.33 (float)
    const b = 2.5 * 33.33; // 83.325 (float)
    const r = ratearReceita(86.66, [L('a', 'Service', a), L('b', 'Service', b)]);
    expect(cents(r)).toEqual([333, 8333]);
    expect(cents(r).reduce((s, v) => s + v, 0)).toBe(8666);
  });

  it('mista serviço × produto com quantidades fracionárias: Σ por natureza = crédito do razão', () => {
    // Total 86,655 (float 86,65499…): ×100 arredonda para 8665 — o mesmo número que o SaleFinalizedMapper lança no razão.
    const r = ratearReceita(0.333 * 10 + 2.5 * 33.33, [L('a', 'Service', 0.333 * 10), L('b', 'Product', 2.5 * 33.33)]);
    expect(r.map((x) => [x.natureza, x.receitaCents])).toEqual([
      ['SERVICO', 333],
      ['REVENDA', 8332],
    ]);
  });
});

describe('ratearReceita — empate exato de meio centavo (onde a razão em float erra)', () => {
  it('10 centavos entre linhas de 0,01 e 0,19: 10 × 1/20 = 0,5 exato ⇒ meio-para-cima dá 1 à 1ª (antes da onda 2.3, o float dava [0, 10])', () => {
    const r = ratearReceita(0.1, [L('a', 'Service', 0.01), L('b', 'Service', 0.19)]);
    expect(cents(r)).toEqual([1, 9]);
  });

  it('empates que o float acerta: 1 centavo entre duas linhas iguais vai à 1ª; 3 centavos entre duas, 2 e 1', () => {
    expect(cents(ratearReceita(0.01, [L('a', 'Service', 1), L('b', 'Service', 1)]))).toEqual([1, 0]);
    expect(cents(ratearReceita(0.03, [L('a', 'Service', 1), L('b', 'Service', 1)]))).toEqual([2, 1]);
  });
});

describe('registrarVenda — cota do profissional (parceria) sobre a receita da linha', () => {
  const linhasGravadas: ReceitaFiscalLinhaData[] = [];
  const service = (cotaSalaoBp: number) =>
    new ReceitaFiscalService(
      { createLinhasDaVenda: async (_s: unknown, l: ReceitaFiscalLinhaData[]) => (linhasGravadas.splice(0, linhasGravadas.length, ...l), l.length) } as never,
      { findManyByServiceRefs: async () => [] },
      { contratoEmEfeito: async () => ({ id: 'ct-1', cotaSalaoBp }) } as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
    );
  const venda = (amount: number, lineReais: number): VendaReconhecida => ({
    saleId: 'v1',
    amount,
    dia: '2026-11-10',
    lines: [L('a', 'Service', lineReais, 'prof-1')],
    tomadorTipo: 'NAO_IDENTIFICADO' as never,
  });

  it('5 centavos com o salão em 50% (empate exato 2,5): a cota do profissional é 3 (meio-para-cima)', async () => {
    await service(5000).registrarVenda(scope, venda(0.05, 0.05));
    expect(linhasGravadas.map((l) => [l.receitaCents, l.cotaProfissionalCents])).toEqual([[5n, 3n]]);
  });

  it('R$ 0,1 + 0,2 com o salão em 33,33%: 30 centavos × 66,67% = 20,001 → 20', async () => {
    await service(3333).registrarVenda(scope, venda(0.1 + 0.2, 0.1 + 0.2));
    expect(linhasGravadas.map((l) => [l.receitaCents, l.cotaProfissionalCents])).toEqual([[30n, 20n]]);
  });
});

describe('ReceitaFiscalRecebimentoService.registrar — valor do recebimento (borda float)', () => {
  const criadas: Array<{ valorCents: bigint }> = [];
  const service = new ReceitaFiscalRecebimentoService(
    { createIfAbsent: async (_s: unknown, d: { valorCents: bigint }) => (criadas.push(d), true) } as never,
    {} as never,
  );
  const registrar = (amount: number) => service.registrar(scope, { saleId: 'v1', amount, meio: MEIO_PACOTE, diaPagamento: '2026-11-10', diaPrestacao: '2026-11-10' });

  beforeEach(() => criadas.splice(0));

  it('0,1 + 0,2 grava 30 centavos', async () => {
    await registrar(0.1 + 0.2);
    expect(criadas.map((c) => c.valorCents)).toEqual([30n]);
  });

  it('1,005 grava 100 centavos (o mesmo arredondamento do razão)', async () => {
    await registrar(1.005);
    expect(criadas.map((c) => c.valorCents)).toEqual([100n]);
  });

  it('0 e negativo: ValidationError "Valor inválido para o recebimento da venda"', async () => {
    for (const bad of [0, -5]) {
      await expect(registrar(bad)).rejects.toThrow("Valor inválido para o recebimento da venda 'v1'.");
    }
    expect(criadas).toHaveLength(0);
  });

  it('NaN/Infinity: ValidationError do conversor canônico (antes da onda 2.3: a mensagem do recebimento)', async () => {
    for (const bad of [Number.NaN, Number.POSITIVE_INFINITY]) {
      await expect(registrar(bad)).rejects.toThrow('Valor em reais inválido: não é um número finito.');
    }
    expect(criadas).toHaveLength(0);
  });

  // O teto vem do próprio MAX_CENTS (F-W2B-2 → b, #1350: 2^43 − 1): um literal em reais aqui ficou velho quando o teto subiu
  // de Int32 e o teste passou a esperar recusa de um valor que o razão agora aceita.
  it('valor acima de MAX_CENTS (teto de política, hoje 2^43 − 1 centavos): recusa na borda como o razão', async () => {
    await expect(registrar((MAX_CENTS + 1) / 100)).rejects.toThrow('Valor em reais fora da faixa suportada de centavos.');
    expect(criadas).toHaveLength(0);
  });
});

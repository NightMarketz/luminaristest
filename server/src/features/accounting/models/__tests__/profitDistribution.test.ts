/**
 * BE-INCR-IRRF-DISTRIBUICAO PR-2 (BRIEF itens 12, 13, 15, 16 e 21) — regras puras do IRRF na distribuição e contrato Zod
 * do evento. Lei 9.250 art. 6º-A [D05]: acima de R$ 50 mil no mês, 10% sobre o total; a transição sai da base e conta
 * no limite (F-IRD-6).
 */
import { legalParamsSeedRows } from '@test/helpers/legalParams';
import { ProfitDistributionInputSchema } from '../../dtos/ProfitDistributionDto';
import {
  brutoMinimo,
  calcularMes,
  sugestao,
  tetoSemRetencao,
  vencimentoIrrfDividendos,
  type EventoDoMes,
  type ParametrosIrrf,
} from '../profitDistribution';

const P: ParametrosIrrf = { aliquotaBp: 1000, limiteMensalCents: 5_000_000n };
const k = (reais: number) => BigInt(reais * 100);
let seq = 0;

/** Lança os eventos em ordem, como o serviço: cada um vê os anteriores do mês com o IRRF já retido. */
function emSerie(eventos: Array<{ bruto: number; origem?: string }>, tipoPessoa = 'PF'): EventoDoMes[] {
  const feitos: EventoDoMes[] = [];
  for (const e of eventos) {
    const origemLucro = e.origem ?? 'CORRENTE';
    const c = calcularMes(feitos, { brutoCents: k(e.bruto), origemLucro }, P, tipoPessoa);
    feitos.push({ id: `e${++seq}`, brutoCents: k(e.bruto), irrfCents: c.irrfEventoCents, origemLucro });
  }
  return feitos;
}

describe('item 12 — cálculo do mês (L1–L3, F-IRD-6)', () => {
  it.each([
    ['49k + 2k: o 2º cruza e retém 10% do total do mês', [{ bruto: 49_000 }, { bruto: 2_000 }], [0, 5_100]],
    ['30k + 30k: o 2º retém 6k (10% de 60k)', [{ bruto: 30_000 }, { bruto: 30_000 }], [0, 6_000]],
    ['60k num só evento: 6k', [{ bruto: 60_000 }], [6_000]],
    ['30k de transição + 30k corrente: retém 3k (a transição conta no limite e sai da base)', [{ bruto: 30_000, origem: 'TRANSICAO' }, { bruto: 30_000 }], [0, 3_000]],
    ['exatamente 50k: não passa do limite', [{ bruto: 50_000 }], [0]],
    ['60k + 10k: o 2º retém só a diferença (7k − 6k)', [{ bruto: 60_000 }, { bruto: 10_000 }], [6_000, 1_000]],
  ])('%s', (_nome, eventos, irrf) => {
    expect(emSerie(eventos).map((e) => Number(e.irrfCents) / 100)).toEqual(irrf);
  });

  it('a memória do cálculo: soma, base sem a transição, devido, já retido', () => {
    const antes = emSerie([{ bruto: 30_000, origem: 'TRANSICAO' }, { bruto: 10_000 }]);
    expect(calcularMes(antes, { brutoCents: k(20_000), origemLucro: 'CORRENTE' }, P, 'PF')).toEqual({
      somaMesCents: k(60_000),
      baseMesCents: k(30_000),
      devidoMesCents: k(3_000),
      jaRetidoCents: 0n,
      irrfEventoCents: k(3_000),
    });
  });

  it('item 13 (L5): beneficiário PJ residente não retém nem soma com ninguém', () => {
    expect(emSerie([{ bruto: 60_000 }, { bruto: 90_000 }], 'PJ').map((e) => e.irrfCents)).toEqual([0n, 0n]);
  });
});

describe('itens 15 e 16 — teto, mínimo e sugestão (F-IRD-5R)', () => {
  it('item 15: 40k já no mês → teto 10k; cruzar o limite sugere mover o excedente', () => {
    const outros = emSerie([{ bruto: 40_000 }]);
    expect(tetoSemRetencao(outros, P)).toBe(k(10_000));
    const calc = calcularMes(outros, { brutoCents: k(20_000), origemLucro: 'CORRENTE' }, P, 'PF');
    expect(sugestao(outros, calc, k(20_000), P, 'PF')).toBe('MOVER_EXCEDENTE_MES_SEGUINTE');
    expect(tetoSemRetencao(emSerie([{ bruto: 70_000 }]), P)).toBe(0n);
  });

  it('item 16: 49k + 2k → o IRRF (5.100) passa do bruto; o mínimo que cobre é 5.444,44 (10% de 54.444,44 arredonda para 5.444,44)', () => {
    const outros = emSerie([{ bruto: 49_000 }]);
    const calc = calcularMes(outros, { brutoCents: k(2_000), origemLucro: 'CORRENTE' }, P, 'PF');
    expect(calc.irrfEventoCents > k(2_000)).toBe(true);
    expect(sugestao(outros, calc, k(2_000), P, 'PF')).toBe('AUMENTAR_BRUTO');
    const minimo = brutoMinimo(outros, 'CORRENTE', P, 'PF');
    expect(minimo).toBe(544_444n);
    // o mínimo cobre; um centavo a menos não
    expect(calcularMes(outros, { brutoCents: minimo, origemLucro: 'CORRENTE' }, P, 'PF').irrfEventoCents <= minimo).toBe(true);
    expect(calcularMes(outros, { brutoCents: minimo - 1n, origemLucro: 'CORRENTE' }, P, 'PF').irrfEventoCents > minimo - 1n).toBe(true);
  });

  it('item 16: evento de transição que cruza o limite carrega o IRRF da base corrente; o mínimo é o que cruza (5.000,01)', () => {
    const outros = emSerie([{ bruto: 45_000 }]);
    expect(calcularMes(outros, { brutoCents: k(5_001), origemLucro: 'TRANSICAO' }, P, 'PF').irrfEventoCents).toBe(k(4_500));
    expect(brutoMinimo(outros, 'TRANSICAO', P, 'PF')).toBe(500_001n);
  });
});

describe('item 21 — vencimento do DARF 1841 (L8)', () => {
  const feriados = legalParamsSeedRows();
  it.each([
    ['2026-03', '2026-04-20'], // segunda-feira
    ['2026-05', '2026-06-19'], // 20/06 é sábado → sexta
    ['2026-10', '2026-11-19'], // 20/11 é feriado nacional (Lei 14.759/2023) → quinta
    ['2026-12', '2027-01-20'], // virada do ano
  ])('competência %s → %s', (competencia, vencimento) => {
    expect(vencimentoIrrfDividendos(competencia, feriados)).toBe(vencimento);
  });
});

describe('contrato Zod — ProfitDistributionInputSchema (itens 10, 11, 14)', () => {
  const base = { unitId: 'u', partnerId: 'p', evento: 'PAGAMENTO', dataEvento: '2026-03-10', brutoCents: 100, debitoAccountId: 'd', contraAccountId: 'c', origemLucro: 'CORRENTE' };
  const ok = (v: Record<string, unknown>) => ProfitDistributionInputSchema.safeParse(v).success;

  it('aceita o básico e recusa campo desconhecido (.strict)', () => {
    expect(ok(base)).toBe(true);
    expect(ok({ ...base, extra: 1 })).toBe(false);
  });

  it('item 11: CREDITO não aceita contraAccountId; os outros exigem', () => {
    expect(ok({ ...base, evento: 'CREDITO' })).toBe(false);
    const { contraAccountId: _c, ...semContra } = base;
    expect(ok({ ...semContra, evento: 'CREDITO' })).toBe(true);
    expect(ok({ ...semContra, evento: 'EMPREGO' })).toBe(false);
  });

  it('item 14: TRANSICAO exige ano ≤ 2025, aprovação e ato; CORRENTE recusa esses campos', () => {
    const t = { ...base, origemLucro: 'TRANSICAO', anoResultado: 2025, aprovadoEm: '2026-01-20', atoSourceDocumentId: 'doc' };
    expect(ok(t)).toBe(true);
    expect(ok({ ...t, anoResultado: 2026 })).toBe(false);
    expect(ok({ ...t, atoSourceDocumentId: undefined })).toBe(false);
    expect(ok({ ...base, anoResultado: 2025 })).toBe(false);
  });

  it('bruto positivo e data real', () => {
    expect(ok({ ...base, brutoCents: 0 })).toBe(false);
    expect(ok({ ...base, dataEvento: '2026-02-30' })).toBe(false);
  });
});

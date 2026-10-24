/**
 * BE-INCR-IRRF-DISTRIBUICAO PR-3 (BRIEF itens 24–26) — regras puras do JCP: faixas pro rata die, limite dedutível,
 * rateio, IRRF e a Parte A prevista. IN 1.700 art. 75 [D11]; SC Cosit 45/2018 e 70/2025; F-IRD-16/18.
 */
import { JcpPreviewInputSchema } from '../../dtos/InterestOnEquityDto';
import { codigosJcp } from '../../services/InterestOnEquityService';
import { legalParamsSeedRows } from '@test/helpers/legalParams';
import { chaveTjlp, faixasJcp, irrfJcp, lalurPrevisto, limiteDedutivel, rateioPorParticipacao, vencimentoIrrfJcp } from '../interestOnEquity';

const TJLP_T01 = 7658; // 0,7658% ao mês (L17)

describe('item 24 — faixas pro rata die', () => {
  it('mês cheio com saldo constante = saldo × taxa mensal', () => {
    const r = faixasJcp('2026-01-01', '2026-01-31', () => 110_000_000n, () => TJLP_T01);
    expect(r.faixas).toHaveLength(1);
    expect(r.jurosMaxTjlpCents).toBe(842_380n); // 1.100.000,00 × 0,7658%
    expect(r.faixas[0].jurosCents).toBe(842_380n);
  });

  it('crédito no dia 15 conta só os dias até 15 (taxa diária = mensal ÷ 31)', () => {
    expect(faixasJcp('2026-01-01', '2026-01-15', () => 110_000_000n, () => TJLP_T01).jurosMaxTjlpCents).toBe(407_603n);
  });

  it('a base do dia é o saldo do fim do dia anterior: mudança no dia 45 vale a partir do dia 46; o mês abre faixa nova', () => {
    const base = (dia: string) => (dia >= '2026-02-14' ? 120_000_000n : 110_000_000n);
    const r = faixasJcp('2026-01-01', '2026-03-31', base, () => TJLP_T01);
    expect(r.faixas.map((f) => [f.de, f.ate, f.baseCents])).toEqual([
      ['2026-01-01', '2026-01-31', 110_000_000n],
      ['2026-02-01', '2026-02-14', 110_000_000n],
      ['2026-02-15', '2026-02-28', 120_000_000n],
      ['2026-03-01', '2026-03-31', 120_000_000n],
    ]);
  });

  it('a chave da TJLP é o trimestre do dia', () => {
    expect([chaveTjlp('2026-03-31'), chaveTjlp('2026-04-01'), chaveTjlp('2026-12-31')]).toEqual(['2026-T01', '2026-T02', '2026-T04']);
  });
});

describe('item 25 — limite dedutível (§ 2º)', () => {
  it('ramo do lucro: min(juros, 50% do lucro) quando o lucro é o maior', () => {
    expect(limiteDedutivel(1_000_000n, 300_000n, 100_000n)).toEqual({ limite50LucroCents: 150_000n, limite50ReservasCents: 50_000n, limiteDedutivelCents: 150_000n });
  });
  it('ramo das reservas: 50% de lucros + reservas quando é o maior', () => {
    expect(limiteDedutivel(1_000_000n, -50_000n, 400_000n)).toEqual({ limite50LucroCents: 0n, limite50ReservasCents: 200_000n, limiteDedutivelCents: 200_000n });
  });
  it('os juros pela TJLP limitam quando são menores', () => {
    expect(limiteDedutivel(80_000n, 300_000n, 400_000n).limiteDedutivelCents).toBe(80_000n);
  });
});

describe('item 26 — rateio e IRRF', () => {
  it('rateio pela participação, resíduo no último; IRRF de 17,5%', () => {
    const r = rateioPorParticipacao(1_000_001n, [{ partnerId: 'a', participacaoBp: 6000 }, { partnerId: 'b', participacaoBp: 4000 }]);
    expect(r).toEqual([{ partnerId: 'a', brutoCents: 600_000n }, { partnerId: 'b', brutoCents: 400_001n }]);
    expect(irrfJcp(600_000n, 1750)).toBe(105_000n);
  });
});

describe('item 29 — Parte A prevista (quatro combinações) e códigos do catálogo L12', () => {
  const cod = () => ({ exclusao: '166.03', adicaoExcesso: '20' });
  it.each([
    ['PL sem excesso: exclui o total', 'PL', 100n, 150n, [['lalur', '166.03', 100n], ['lacs', '166.03', 100n]]],
    ['PL com excesso: exclui só o limite, sem adição', 'PL', 200n, 150n, [['lalur', '166.03', 150n], ['lacs', '166.03', 150n]]],
    ['DESPESA sem excesso: nada na Parte A', 'DESPESA', 100n, 150n, []],
    ['DESPESA com excesso: adiciona o excesso', 'DESPESA', 200n, 150n, [['lalur', '20', 50n], ['lacs', '20', 50n]]],
  ] as const)('%s', (_n, forma, total, limite, esperado) => {
    expect(lalurPrevisto(forma, total, limite, cod).map((l) => [l.livro, l.codigo, l.valorCents])).toEqual(esperado);
  });

  it('os códigos vêm do catálogo vigente no ano (lalur e lacs)', () => {
    expect([codigosJcp('lalur', 2026), codigosJcp('lacs', 2026)]).toEqual([
      { exclusao: '166.03', adicaoExcesso: '20' },
      { exclusao: '166.03', adicaoExcesso: '20' },
    ]);
  });
});

describe('item 31 (L13) — vencimento do IRRF do JCP: 3º dia útil depois do decêndio', () => {
  const feriados = legalParamsSeedRows();
  it.each([
    ['2026-03-05', '2026-03-13'], // 1º decêndio fecha 10/03 (ter) → qua, qui, sex
    ['2026-03-15', '2026-03-25'], // 2º fecha 20/03 (sex) → seg, ter, qua
    ['2026-03-25', '2026-04-03'], // 3º fecha 31/03 (ter) → qua, qui, sex
    ['2026-04-15', '2026-04-24'], // 2º fecha 20/04 (seg); 21/04 é feriado nacional → qua, qui, sex
  ])('crédito em %s → %s', (dataCredito, vencimento) => {
    expect(vencimentoIrrfJcp(dataCredito, feriados)).toBe(vencimento);
  });
});

describe('contrato Zod — JcpPreviewInputSchema', () => {
  const base = { unitId: 'u', anoCalendario: 2026, periodo: 'T01', dataCredito: '2026-03-31', forma: 'DESPESA', totalCents: 100 };
  const ok = (v: Record<string, unknown>) => JcpPreviewInputSchema.safeParse(v).success;
  it('PL exige debitoPlAccountId; DESPESA recusa; ano ≥ 2026; crédito no ano; sócio sem repetir', () => {
    expect(ok(base)).toBe(true);
    expect(ok({ ...base, forma: 'PL' })).toBe(false);
    expect(ok({ ...base, forma: 'PL', debitoPlAccountId: 'x' })).toBe(true);
    expect(ok({ ...base, debitoPlAccountId: 'x' })).toBe(false);
    expect(ok({ ...base, anoCalendario: 2025, dataCredito: '2025-03-31' })).toBe(false);
    expect(ok({ ...base, dataCredito: '2027-01-10' })).toBe(false);
    expect(ok({ ...base, rateio: [{ partnerId: 'a', brutoCents: 50 }, { partnerId: 'a', brutoCents: 50 }] })).toBe(false);
    expect(ok({ ...base, extra: 1 })).toBe(false);
  });
});

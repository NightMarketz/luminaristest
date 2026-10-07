/**
 * BE-INCR-TAX-ASSESSMENT Fase B PR-1 (nó X7, BRIEF B itens 3, 4, 7, 8, 9, 10; testes do item 26 d, e, f, h, i) —
 * funções puras do Lucro Real anual. Teste-tabela com a conta feita à mão no comentário e o parágrafo citado. Valores
 * em centavos. Um teste verde prova a aritmética contra a tabela, não contra a lei — o oráculo é X5 × PVA (P-B9).
 */
import { ValidationError } from '../../../../lib/errors';
import { mesBounds, periodoBounds, quarterBounds, type LalurMes } from '../Lalur.model';
import { MemoriaCalculoSchema } from '../taxAssessmentCalc';
import {
  apurarAjusteAnual,
  apurarBalancete,
  apurarEstimativaReceitaBruta,
  codigoReceitaAnual,
  mesesEmAtividade,
  type EntradaAjusteAnual,
  type EntradaBalancete,
  type MesConfirmado,
  type PerfilApuracaoAnual,
  type ResultadoApuracaoAnual,
} from '../taxAssessmentCalcAnual';
import type { TributoApuracao } from '../taxAssessmentCalc';
import { tabelaApuracaoSemente } from '@test/helpers/legalParams';

const tabela = tabelaApuracaoSemente(); // BE-INCR-LEGAL-PARAMS PR-1: a fotografia da semente da migração

const R = (reais: number): bigint => BigInt(Math.round(reais * 100));
const A = (m: number): LalurMes => `A${String(m).padStart(2, '0')}` as LalurMes;
const PERFIL: PerfilApuracaoAnual = {
  ecfIndAliqCsll: '1',
  lucroRealObrigatorio: false,
  prestadoraExclusivaServicos: false,
  inicioAtividadeEm: null,
  encerramentoAtividadeEm: null,
};
const v = (r: ResultadoApuracaoAnual, codigo: string): string | undefined => r.memoria.find((m) => m.codigo === codigo)?.valorCents;
const confirmar = (r: ResultadoApuracaoAnual, periodo: LalurMes): MesConfirmado => ({
  id: `id-${periodo}-${r.tributo}`,
  periodo,
  tributo: r.tributo,
  modo: r.modo as MesConfirmado['modo'],
  devidoCents: r.devidoCents,
  deducoesCents: r.deducoesCents,
  aPagarCents: r.aPagarCents,
  diferencaPostergadaCents: r.diferencaPostergadaCents,
  memoria: r.memoria,
});

/** Mês m por receita bruta, alimentado com as receitas e as linhas "confirmadas" dos meses anteriores. */
type Mes = { servico: number; revenda?: number } | { balancete: true; servico: number };
function apurarMeses(meses: Mes[], tributo: TributoApuracao = 'IRPJ', perfil: Partial<PerfilApuracaoAnual> = {}): ResultadoApuracaoAnual[] {
  const out: ResultadoApuracaoAnual[] = [];
  const confirmados: MesConfirmado[] = [];
  meses.forEach((mes, i) => {
    const periodo = A(i + 1);
    const receitasMesesAnteriores = meses.slice(0, i).map((x, j) => ({ periodo: A(j + 1), servicoCents: R(x.servico), revendaCents: R('revenda' in x ? x.revenda ?? 0 : 0) }));
    const r =
      'balancete' in mes
        ? apurarBalancete({
            tabela, ano: 2026, periodo, tributo, resultadoAntesCents: R(0), contasProvisaoConfiguradas: true, linhasParteA: [],
            anteriores: [...confirmados], perfil: { ...PERFIL, ...perfil }, deducoes: [],
          })
        : apurarEstimativaReceitaBruta({
            tabela, ano: 2026, periodo, tributo, receitaServicoCents: R(mes.servico), receitaRevendaCents: R(mes.revenda ?? 0),
            receitasMesesAnteriores, confirmados: [...confirmados], perfil: { ...PERFIL, ...perfil }, deducoes: [],
          });
    out.push(r);
    confirmados.push(confirmar(r, periodo));
  });
  return out;
}

describe('item 3 — códigos de receita (ADR §3)', () => {
  it('cada modo × lucroRealObrigatorio resolve exatamente um código; IRPJ com obrigatoriedade nula ⇒ 400', () => {
    const codigos: [TributoApuracao, 'ESTIMATIVA' | 'AJUSTE_ANUAL' | 'DIFERENCA_POSTERGADA_16', boolean, string][] = [
      ['IRPJ', 'ESTIMATIVA', true, '236201'],
      ['IRPJ', 'ESTIMATIVA', false, '599301'],
      ['IRPJ', 'AJUSTE_ANUAL', true, '243001'],
      ['IRPJ', 'AJUSTE_ANUAL', false, '245601'],
      ['IRPJ', 'DIFERENCA_POSTERGADA_16', true, '236202'],
      ['IRPJ', 'DIFERENCA_POSTERGADA_16', false, '599302'],
      ['CSLL', 'ESTIMATIVA', true, '248401'],
      ['CSLL', 'ESTIMATIVA', false, '248401'],
      ['CSLL', 'AJUSTE_ANUAL', true, '677301'],
      ['CSLL', 'AJUSTE_ANUAL', false, '677301'],
    ];
    for (const [t, c, o, cod] of codigos) expect(codigoReceitaAnual(tabela, '2026-12-31', t, c, o).codigo).toBe(cod);
    expect(() => codigoReceitaAnual(tabela, '2026-12-31', 'IRPJ', 'ESTIMATIVA', null)).toThrow(ValidationError);
    expect(codigoReceitaAnual(tabela, '2026-12-31', 'CSLL', 'ESTIMATIVA', null).codigo).toBe('248401');
    // o balancete com redução usa o código da estimativa (P-B2)
    const bal = apurarBalancete({
      tabela, ano: 2026, periodo: 'A01', tributo: 'IRPJ', resultadoAntesCents: R(10_000), contasProvisaoConfiguradas: true,
      linhasParteA: [], anteriores: [], perfil: { ...PERFIL, lucroRealObrigatorio: true }, deducoes: [],
    });
    expect(bal.codigoReceita).toBe('236201');
  });
});

describe('item 4 — janelas de período', () => {
  it('A03 = período em curso (01/01 → 31/03); mesBounds(3) = só março; T02 = quarterBounds; A00 = o ano', () => {
    expect(periodoBounds(2026, 'A03')).toEqual({ from: new Date('2026-01-01T00:00:00.000Z'), to: new Date('2026-03-31T23:59:59.999Z') });
    expect(mesBounds(2026, 3)).toEqual({ from: new Date('2026-03-01T00:00:00.000Z'), to: new Date('2026-03-31T23:59:59.999Z') });
    expect(periodoBounds(2026, 'T02')).toEqual(quarterBounds(2026, 'T02'));
    expect(periodoBounds(2026, 'A00')).toEqual({ from: new Date('2026-01-01T00:00:00.000Z'), to: new Date('2026-12-31T23:59:59.999Z') });
    expect(mesBounds(2028, 2).to).toEqual(new Date('2028-02-29T23:59:59.999Z')); // bissexto
  });

  it('início de atividade no ano (F-TA-4 b) desloca o início do período em curso; de outro ano, não', () => {
    expect(periodoBounds(2026, 'A05', '2026-03-15').from).toEqual(new Date('2026-03-15T00:00:00.000Z'));
    expect(periodoBounds(2026, 'A05', '2024-03-15').from).toEqual(new Date('2026-01-01T00:00:00.000Z'));
    expect(mesesEmAtividade(2026, '2026-03-15', '2026-10-02')).toEqual([3, 4, 5, 6, 7, 8, 9, 10]);
  });
});

describe('item 7 — estimativa por receita bruta (B2)', () => {
  it('IRPJ = 15% + 10% sobre a base acima de 20.000 × 1 mês; CSLL 9% × 32%/12%; sem LC 224; deduções do A-11', () => {
    // serviço 100.000 × 32% = 32.000 + revenda 50.000 × 8% = 4.000 ⇒ base 36.000
    // IRPJ = 5.400 + 10% × (36.000 − 20.000) = 1.600 ⇒ 7.000 (Lei 9.430 art. 2º §§ 1º–2º; IN 1.700 art. 42)
    const base = {
      tabela, ano: 2026, periodo: 'A07' as LalurMes, receitaServicoCents: R(100_000), receitaRevendaCents: R(50_000),
      receitasMesesAnteriores: [], confirmados: [], perfil: PERFIL,
    };
    const irpj = apurarEstimativaReceitaBruta({ ...base, tributo: 'IRPJ', deducoes: [{ tributo: 'IRPJ', tipo: 'IRRF', valorCents: '50000' }] });
    expect(irpj.baseCents).toBe(R(36_000));
    expect(v(irpj, 'ADICIONAL')).toBe(String(R(1_600)));
    expect(irpj.devidoCents).toBe(R(7_000));
    expect(irpj.aPagarCents).toBe(R(6_500)); // IRRF do mês, art. 44
    expect(irpj).toMatchObject({ modo: 'ESTIMATIVA_RECEITA', codigoReceita: '599301', diferencaPostergadaCents: 0n });
    expect(irpj.memoria.some((l) => l.codigo.startsWith('LC224'))).toBe(false); // P-B3
    expect(MemoriaCalculoSchema.safeParse(irpj.memoria).success).toBe(true);
    // CSLL: 100.000 × 32% + 50.000 × 12% = 38.000 × 9% = 3.420 (IN 1.700 arts. 34 e 45)
    const csll = apurarEstimativaReceitaBruta({ ...base, tributo: 'CSLL', deducoes: [] });
    expect(csll.devidoCents).toBe(R(3_420));
    expect(csll.codigoReceita).toBe('248401');
  });

  it('recusas: CSLL sem alíquota (D8); mês fora da atividade (F-TA-4 b)', () => {
    expect(() => apurarMeses([{ servico: 1 }], 'CSLL', { ecfIndAliqCsll: null })).toThrow(/indAliqCsll/);
    expect(() => apurarMeses([{ servico: 1 }], 'IRPJ', { inicioAtividadeEm: '2026-02-10' })).toThrow(/fora do período de atividade/);
  });

  it("26 (e) art. 47 § 2º: um balancete com excesso em A04 não muda a estimativa de A05", () => {
    const sem = apurarMeses([{ servico: 50_000 }, { servico: 50_000 }, { servico: 50_000 }, { servico: 50_000 }, { servico: 70_000 }]);
    const com = apurarMeses([{ servico: 50_000 }, { servico: 50_000 }, { servico: 50_000 }, { balancete: true, servico: 50_000 }, { servico: 70_000 }]);
    expect(com[3]).toMatchObject({ modo: 'BALANCETE_SUSPENSAO_REDUCAO', devidoCents: 0n }); // prejuízo/0 ⇒ suspensão
    // A05: 70.000 × 32% = 22.400; 15% = 3.360 + 10% × 2.400 = 240 ⇒ 3.600, com ou sem o A04
    expect(com[4].devidoCents).toBe(R(3_600));
    expect(com[4].memoria).toEqual(sem[4].memoria);
  });
});

describe('item 8 — balancete de suspensão/redução (B3)', () => {
  const bal = (o: Partial<EntradaBalancete>): ResultadoApuracaoAnual =>
    apurarBalancete({
      tabela, ano: 2026, periodo: 'A03', tributo: 'IRPJ', resultadoAntesCents: R(100_000), contasProvisaoConfiguradas: true,
      linhasParteA: [], anteriores: [], perfil: PERFIL, deducoes: [], ...o,
    });
  const mesConf = (periodo: LalurMes, devido: number, tributo: TributoApuracao = 'IRPJ', dif = 0): MesConfirmado => ({
    id: `c-${periodo}`, periodo, tributo, modo: 'ESTIMATIVA_RECEITA', devidoCents: R(devido), deducoesCents: 0n,
    aPagarCents: R(devido), diferencaPostergadaCents: R(dif), memoria: [],
  });

  it('26 (f): adicional de A03 = 10% sobre o que passa de 60.000 (3 meses), não de 20.000; redução', () => {
    // L = 100.000; IRPJ do período = 15.000 + 10% × (100.000 − 60.000) = 4.000 ⇒ 19.000 (art. 49 II; art. 29 § 1º)
    // anteriores A01 + A02 = 6.000 + 5.000 (+ diferença postergada de 500 em A02, P-B6) ⇒ devido do mês 7.500
    const r = bal({ anteriores: [mesConf('A01', 6_000), mesConf('A02', 5_000, 'IRPJ', 500), mesConf('A02', 999_999, 'CSLL'), mesConf('A04', 999_999)] });
    expect(v(r, 'MESES_PERIODO')).toBe('3');
    expect(v(r, 'ADICIONAL')).toBe(String(R(4_000)));
    expect(v(r, 'DEVIDO_PERIODO_EM_CURSO')).toBe(String(R(19_000)));
    expect(v(r, 'DEVIDO_MESES_ANTERIORES')).toBe(String(R(11_500))); // só IRPJ, só < A03
    expect(r.memoria.find((l) => l.codigo === 'DEVIDO_MESES_ANTERIORES')?.descricao).toContain('A01:c-A01');
    expect(v(r, 'REDUCAO')).toBe(String(R(7_500)));
    expect(r).toMatchObject({ devidoCents: R(7_500), aPagarCents: R(7_500), modo: 'BALANCETE_SUSPENSAO_REDUCAO', baseCents: R(100_000) });
    expect(MemoriaCalculoSchema.safeParse(r.memoria).success).toBe(true);
  });

  it('26 (d) suspensão: devido do período ≤ anteriores ⇒ devido 0 e a pagar 0; prejuízo desde janeiro também', () => {
    const r = bal({ anteriores: [mesConf('A01', 10_000), mesConf('A02', 10_000)] }); // 19.000 ≤ 20.000
    expect(r).toMatchObject({ devidoCents: 0n, aPagarCents: 0n });
    expect(v(r, 'SUSPENSAO')).toBe('0');
    expect(v(r, 'REDUCAO')).toBeUndefined();
    const prejuizo = bal({ resultadoAntesCents: R(-5_000) }); // art. 48 p.ú.; Lei 8.981 art. 35 § 2º
    expect(prejuizo).toMatchObject({ devidoCents: 0n, aPagarCents: 0n });
    expect(v(prejuizo, 'SUSPENSAO')).toBe('0');
  });

  it('janeiro por balancete (art. 48): anteriores = 0; início de atividade em março ⇒ A05 tem n = 3', () => {
    const jan = bal({ periodo: 'A01', resultadoAntesCents: R(30_000) });
    expect(jan.devidoCents).toBe(R(5_500)); // 4.500 + 10% × 10.000
    const r = bal({ periodo: 'A05', perfil: { ...PERFIL, inicioAtividadeEm: '2026-03-10' } });
    expect(v(r, 'MESES_PERIODO')).toBe('3');
    expect(v(r, 'ADICIONAL')).toBe(String(R(4_000))); // 10% × (100.000 − 60.000)
  });

  it('D6 por tributo: compensação acima de 30% do lucro ajustado ⇒ 400; CSLL com o livro lacs', () => {
    // linha 'P' do catálogo: o mesmo código que o teste do Real trimestral usa
    expect(() => bal({ linhasParteA: [{ codigo: '173', valorCents: R(31_000) }] })).toThrow(/acima do teto/);
    const csll = bal({ tributo: 'CSLL', anteriores: [mesConf('A01', 1_000, 'CSLL')] });
    expect(csll.devidoCents).toBe(R(8_000)); // 100.000 × 9% − 1.000
  });
});

describe('item 9 — 16% do prestador exclusivo (IN 1.700 art. 33 §§ 7º–10; Lei 9.250 art. 40)', () => {
  const PREST = { prestadoraExclusivaServicos: true };

  it('abaixo do limite o ano todo: 12 × 10.000 = 120.000 ≤ 120.000 ⇒ 16% em todos os meses, sem diferença', () => {
    const r = apurarMeses(Array.from({ length: 12 }, () => ({ servico: 10_000 })), 'IRPJ', PREST);
    for (const m of r) {
      expect(m.devidoCents).toBe(R(240)); // 10.000 × 16% = 1.600 × 15%
      expect(v(m, 'PRESUNCAO_REDUZIDA_16')).toBe(String(R(1_600)));
      expect(m.diferencaPostergadaCents).toBe(0n);
    }
    expect(v(r[11], 'RECEITA_ACUMULADA_ANO')).toBe(String(R(120_000)));
  });

  it('cruzando em m* = 7 com 1–6 a 16%: diferença = 6 × (864 − 432) no A07; depois, 32% sem diferença', () => {
    // 18.000/mês: acumulada A06 = 108.000 ≤ 120.000; A07 = 126.000 > 120.000 ⇒ m* = 7
    // k = 1..6: 32% → 5.760 × 15% = 864; 16% → 2.880 × 15% = 432 ⇒ 432 cada, Σ 2.592 (§ 8º)
    const r = apurarMeses(Array.from({ length: 8 }, () => ({ servico: 18_000 })), 'IRPJ', PREST);
    expect(r[5].devidoCents).toBe(R(432));
    expect(r[6].devidoCents).toBe(R(864));
    expect(r[6].diferencaPostergadaCents).toBe(R(2_592));
    expect(v(r[6], 'DIFERENCA_POSTERGADA_A03')).toBe(String(R(432)));
    expect(r[6].memoria.find((l) => l.codigo === 'DIFERENCA_POSTERGADA')?.descricao).toContain('599302');
    expect(r[6].memoria.find((l) => l.codigo === 'DIFERENCA_POSTERGADA_VENCIMENTO')?.descricao).toContain('08/2026');
    expect(r[6].aPagarCents).toBe(R(864)); // a diferença tem código próprio, fora do a pagar da estimativa
    expect(r[7]).toMatchObject({ devidoCents: R(864), diferencaPostergadaCents: 0n });
  });

  it('adicional incluído no recálculo (D7, 1 mês): A01 de 100.000 a 16% e cruzamento em A02', () => {
    // A01: 16% → 16.000 × 15% = 2.400; a 32% → 32.000 × 15% = 4.800 + 10% × 12.000 = 1.200 ⇒ 6.000; diferença 3.600
    const r = apurarMeses([{ servico: 100_000 }, { servico: 30_000 }], 'IRPJ', PREST);
    expect(r[0].devidoCents).toBe(R(2_400));
    expect(r[1].diferencaPostergadaCents).toBe(R(3_600));
  });

  it('um mês por balancete no meio fica fora da diferença: 5 × 432', () => {
    const meses: Mes[] = Array.from({ length: 7 }, () => ({ servico: 18_000 }));
    meses[3] = { balancete: true, servico: 18_000 }; // a receita do A04 conta na acumulada, mas a base dele é o lucro real
    const r = apurarMeses(meses, 'IRPJ', PREST);
    expect(r[6].diferencaPostergadaCents).toBe(R(2_160));
    expect(v(r[6], 'DIFERENCA_POSTERGADA_A04')).toBeUndefined();
  });

  it('declaração + revenda no ano ⇒ 400; CSLL sempre em 32%', () => {
    expect(() => apurarMeses([{ servico: 1_000 }, { servico: 1_000, revenda: 1 }, { servico: 1_000 }], 'IRPJ', PREST)).toThrow(
      /declarou prestadora exclusiva de serviços, mas há receita de revenda/,
    );
    const csll = apurarMeses([{ servico: 10_000 }], 'CSLL', PREST)[0];
    expect(csll.devidoCents).toBe(R(288)); // 10.000 × 32% × 9%
    expect(v(csll, 'PRESUNCAO_REDUZIDA_16')).toBeUndefined();
  });

  it('sem a declaração: 32% mesmo abaixo do limite', () => {
    expect(apurarMeses([{ servico: 10_000 }])[0].devidoCents).toBe(R(480));
  });
});

describe('item 10 — ajuste anual (B6; F-TB-2 b)', () => {
  // 12 × serviço 100.000: estimativa = 32.000 × 15% + 10% × 12.000 = 6.000/mês; Σ 72.000
  // ajuste com LAIR 384.000: 57.600 + 10% × (384.000 − 240.000) = 14.400 ⇒ 72.000
  const meses = (): MesConfirmado[] => apurarMeses(Array.from({ length: 12 }, () => ({ servico: 100_000 }))).map((r, i) => confirmar(r, A(i + 1)));
  const ajuste = (o: Partial<EntradaAjusteAnual>): ResultadoApuracaoAnual =>
    apurarAjusteAnual({
      tabela, ano: 2026, tributo: 'IRPJ', resultadoAntesCents: R(384_000), contasProvisaoConfiguradas: true, linhasParteA: [],
      parteBFechada: true, meses: meses(), perfil: PERFIL, deducoes: [], ...o,
    });

  it('12 estimativas por receita bruta e ajuste igual ao devido ⇒ saldo 0; código 245601', () => {
    const r = ajuste({});
    expect(r).toMatchObject({ devidoCents: R(72_000), aPagarCents: 0n, saldoNegativoCents: 0n, codigoReceita: '245601', modo: 'AJUSTE_ANUAL' });
    expect(v(r, 'SALDO_AJUSTE')).toBe('0');
    expect(v(r, 'ADICIONAL')).toBe(String(R(14_400))); // 20.000 × 12 meses em atividade
    expect(MemoriaCalculoSchema.safeParse(r.memoria).success).toBe(true);
  });

  it('26 (i): sem estimativasPagas deduz o confirmado com aviso; com pago menor, o saldo sobe na diferença', () => {
    const r = ajuste({});
    expect(v(r, 'ESTIMATIVA_PAGA_ASSUMIDA')).toBe(String(R(72_000)));
    const menor = ajuste({ estimativasPagas: [{ periodo: 'A03', tributo: 'IRPJ', valorCents: String(R(5_000)) }, { periodo: 'A04', tributo: 'IRPJ', valorCents: String(R(6_000)) }] });
    expect(menor.aPagarCents).toBe(R(1_000));
    expect(v(menor, 'ESTIMATIVA_NAO_PAGA')).toBe(String(R(1_000)));
    expect(v(menor, 'ESTIMATIVA_PAGA_ASSUMIDA')).toBe(String(R(60_000))); // 10 meses não informados
    expect(menor.memoria.find((l) => l.codigo === 'VENCIMENTO_QUOTA_UNICA')?.fonte).toContain('art. 6º');
    // o pago de outro tributo não conta
    expect(ajuste({ estimativasPagas: [{ periodo: 'A03', tributo: 'CSLL', valorCents: '0' }] }).aPagarCents).toBe(0n);
  });

  it('balancete de suspensão no meio: o ajuste deduz só o pago (0 no mês suspenso), não um "pago a maior"', () => {
    const ms = meses();
    ms[5] = { ...ms[5], modo: 'BALANCETE_SUSPENSAO_REDUCAO', devidoCents: 0n, aPagarCents: 0n };
    expect(ajuste({ meses: ms }).aPagarCents).toBe(R(6_000));
  });

  it('retenções: o retido já usado nos meses entra uma vez, e o do ano pelo A-11; saldo negativo', () => {
    // A01 com IRRF de 1.000: aPagar 5.000 + retido 1.000 reconstroem o devido 6.000 — saldo segue 0
    const ms = meses();
    ms[0] = { ...ms[0], deducoesCents: R(1_000), aPagarCents: R(5_000) };
    const r = ajuste({ meses: ms, deducoes: [{ tributo: 'IRPJ', tipo: 'IRRF', valorCents: String(R(2_500)) }] });
    expect(v(r, 'RETIDO_MESES')).toBe(String(R(1_000)));
    expect(r).toMatchObject({ aPagarCents: 0n, saldoNegativoCents: R(2_500) });
    expect(r.memoria.find((l) => l.codigo === 'SALDO_NEGATIVO')?.fonte).toBe('Lei 9.430/1996 art. 6º § 1º II');
  });

  it('pré-condições (400): Parte B do A00 aberta; mês em atividade sem confirmação; início em março = 10 meses', () => {
    expect(() => ajuste({ parteBFechada: false })).toThrow(/Feche a Parte B/);
    expect(() => ajuste({ meses: meses().filter((c) => c.periodo !== 'A07') })).toThrow(/faltam A07/);
    const r = ajuste({ meses: meses().slice(2), perfil: { ...PERFIL, inicioAtividadeEm: '2026-03-01' } });
    expect(v(r, 'ADICIONAL')).toBe(String(R(18_400))); // 10% × (384.000 − 200.000)
    // mês fora da atividade vindo na entrada não conta como pago (review, achado 4)
    const comForaDeAtividade = ajuste({ perfil: { ...PERFIL, inicioAtividadeEm: '2026-03-01' } });
    expect(v(comForaDeAtividade, 'ESTIMATIVA_PAGA_A01')).toBeUndefined();
    expect(comForaDeAtividade.deducoesCents).toBe(R(60_000));
  });
});

// ═══ X7 Fase B PR-3 — decisão do dono 05/10 ([[D-2026-10-05-X7-FASE-B-PR3-LACUNAS]] 1) + item 16 ═══════════════════

describe('PR-3, decisão 1 — balancete no mês do excesso m* calcula e grava a diferença postergada (IN 1.700 art. 33 § 8º)', () => {
  const PREST = { ...PERFIL, prestadoraExclusivaServicos: true };
  // 1–6 por receita bruta a 18.000/mês a 16% (acumulada A06 = 108.000 ≤ 120.000): 2.880 × 15% = 432 cada (item 9)
  const seis = (): MesConfirmado[] => apurarMeses(Array.from({ length: 6 }, () => ({ servico: 18_000 })), 'IRPJ', PREST).map((r, i) => confirmar(r, A(i + 1)));
  const receitas = (n: number) => Array.from({ length: n }, (_, j) => ({ periodo: A(j + 1), servicoCents: R(18_000), revendaCents: 0n }));
  const balancete = (m: number, anteriores: MesConfirmado[], o: Partial<EntradaBalancete> = {}): ResultadoApuracaoAnual =>
    apurarBalancete({
      tabela, ano: 2026, periodo: A(m), tributo: 'IRPJ', resultadoAntesCents: R(0), contasProvisaoConfiguradas: true, linhasParteA: [],
      anteriores, perfil: PREST, deducoes: [], receitaMes: { periodo: A(m), servicoCents: R(18_000), revendaCents: 0n },
      receitasMesesAnteriores: receitas(m - 1), ...o,
    });

  it('A07 por balancete cruza o limite (108.000 → 126.000): diferença = 6 × (864 − 432) = 2.592, código 599302, fora do a pagar', () => {
    const r = balancete(7, seis());
    expect(r.modo).toBe('BALANCETE_SUSPENSAO_REDUCAO');
    expect(r.devidoCents).toBe(0n); // LAIR 0 ⇒ suspensão
    expect(r.diferencaPostergadaCents).toBe(R(2_592));
    expect(v(r, 'RECEITA_ACUMULADA_ANO')).toBe(String(R(126_000)));
    expect(v(r, 'DIFERENCA_POSTERGADA_A01')).toBe(String(R(432)));
    expect(r.memoria.find((l) => l.codigo === 'DIFERENCA_POSTERGADA')?.descricao).toContain('599302');
    expect(r.aPagarCents).toBe(0n);
    expect(MemoriaCalculoSchema.safeParse(r.memoria).success).toBe(true);
  });

  it('a diferença do A07 entra nos "anteriores" do balancete seguinte: 6 × 432 + 0 + 2.592 = 5.184', () => {
    const ms = seis();
    ms.push(confirmar(balancete(7, ms), A(7)));
    const a08 = balancete(8, ms);
    expect(v(a08, 'DEVIDO_MESES_ANTERIORES')).toBe(String(R(5_184)));
    expect(a08.diferencaPostergadaCents).toBe(0n); // A08 não é m*: a acumulada anterior já passou do limite
  });

  it('sem cruzamento no mês, CSLL ou sem a declaração: nenhuma diferença', () => {
    expect(balancete(6, seis().slice(0, 5)).diferencaPostergadaCents).toBe(0n); // acumulada A06 = 108.000 ≤ limite
    expect(balancete(7, seis(), { tributo: 'CSLL' }).diferencaPostergadaCents).toBe(0n);
    expect(balancete(7, seis(), { perfil: PERFIL }).diferencaPostergadaCents).toBe(0n);
  });
});

describe('PR-3, item 16 — o A00 grava na memória o valor da provisão do ajuste (devido anual − Σ devido + diferença dos meses)', () => {
  const meses = (): MesConfirmado[] => apurarMeses(Array.from({ length: 12 }, () => ({ servico: 100_000 }))).map((r, i) => confirmar(r, A(i + 1)));
  const ajuste = (ms: MesConfirmado[], lair: number): ResultadoApuracaoAnual =>
    apurarAjusteAnual({ tabela, ano: 2026, tributo: 'IRPJ', resultadoAntesCents: R(lair), contasProvisaoConfiguradas: true, linhasParteA: [], parteBFechada: true, meses: ms, perfil: PERFIL, deducoes: [] });

  it('igual aos meses ⇒ 0; mês suspenso ⇒ positivo; lucro anual menor ⇒ negativo; a diferença postergada conta como provisionado', () => {
    expect(v(ajuste(meses(), 384_000), 'PROVISAO_AJUSTE_ANUAL')).toBe('0');
    const suspenso = meses();
    suspenso[5] = { ...suspenso[5], modo: 'BALANCETE_SUSPENSAO_REDUCAO', devidoCents: 0n, aPagarCents: 0n };
    expect(v(ajuste(suspenso, 384_000), 'PROVISAO_AJUSTE_ANUAL')).toBe(String(R(6_000)));
    // LAIR 240.000: 15% = 36.000, sem adicional (240.000 − 20.000 × 12 = 0) ⇒ 36.000 − 72.000 = −36.000
    expect(v(ajuste(meses(), 240_000), 'PROVISAO_AJUSTE_ANUAL')).toBe(String(-R(36_000)));
    const comDif = meses();
    comDif[6] = { ...comDif[6], diferencaPostergadaCents: R(1_000) };
    expect(v(ajuste(comDif, 384_000), 'PROVISAO_AJUSTE_ANUAL')).toBe(String(-R(1_000)));
  });
});

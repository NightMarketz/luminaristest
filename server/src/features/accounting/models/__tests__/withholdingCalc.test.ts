/**
 * BE-INCR-RETENCOES-FONTE PR-2 (BRIEF itens 10, 11, 17 e 18; invariantes 1, 2, 4, 5, 6, 10 e 11) — cálculo puro sobre a
 * fotografia da semente da migração.
 */
import { LEGAIS_SEMENTE } from '@test/helpers/legalParams';
import { linhasEmVigor } from '../../../legalParameters/models/legalParameter';
import { brutoDaParcela, calcularIrrfPf, calcularRetencoes, csrfDoBruto, type EntradaRetencao, type PerfilParaCalculo } from '../withholdingCalc';

const tabela = linhasEmVigor(LEGAIS_SEMENTE);
const PERFIL: PerfilParaCalculo = { naturezaServico: 'SERVICO_PROFISSIONAL', natRend: '15022', irrf: true, csrf: true, inss: false, inssCprb: null, issRetido: false, issAliquotaBp: null };
const base = (o: Partial<EntradaRetencao> = {}): EntradaRetencao => ({
  event: 'RECOGNITION',
  brutoCents: 100_000n,
  dataFatoGerador: '2026-03-10',
  regimePagador: 'PRESUMIDO',
  beneficiario: { regime: 'PRESUMIDO', temDeclaracaoOptante: false, taxIdKind: 'CNPJ' },
  perfil: PERFIL,
  tabela,
  ...o,
});
const resumo = (r: ReturnType<typeof calcularRetencoes>) => r.linhas.map((l) => [l.tributo, l.amountCents, l.dispensa, l.codigoReceita]);

describe('calcularRetencoes (item 10)', () => {
  it('RECOGNITION de R$ 1.000 a PJ Presumido, serviço profissional ⇒ IRRF 1,5% = R$ 15,00 com o código 170806', () => {
    expect(resumo(calcularRetencoes(base()))).toEqual([['IRRF', 1500n, null, '170806']]);
  });

  it('invariante 1: SETTLEMENT em 2026-12-31 ⇒ CSRF 4,65% em 3 linhas com o AGREGADO; em 2027-01-01 ⇒ só CSLL 1%', () => {
    expect(resumo(calcularRetencoes(base({ event: 'SETTLEMENT', dataFatoGerador: '2026-12-31' })))).toEqual([
      ['CSLL', 1000n, null, '595207'],
      ['COFINS', 3000n, null, '595207'],
      ['PIS', 650n, null, '595207'],
    ]);
    // R$ 2.000: a CSLL de 2027 (R$ 20) passa do mínimo; com R$ 1.000 (R$ 10,00) seria dispensa (art. 31 § 3º).
    expect(resumo(calcularRetencoes(base({ event: 'SETTLEMENT', brutoCents: 200_000n, dataFatoGerador: '2027-01-01' })))).toEqual([['CSLL', 2000n, null, '598707']]);
  });

  it('invariante 2: pagador SIMPLES/MEI ⇒ sem CSRF; IRRF pelo perfil', () => {
    for (const regimePagador of ['SIMPLES', 'MEI'] as const) {
      expect(calcularRetencoes(base({ event: 'SETTLEMENT', regimePagador })).linhas).toEqual([]);
      expect(resumo(calcularRetencoes(base({ regimePagador })))).toEqual([['IRRF', 1500n, null, '170806']]);
    }
  });

  it('invariante 4: beneficiário SIMPLES ⇒ sem CSRF; sem IRRF só com declaração; sem declaração retém e avisa', () => {
    const optante = (temDeclaracaoOptante: boolean) => ({ regime: 'SIMPLES' as const, temDeclaracaoOptante, taxIdKind: 'CNPJ' as const });
    expect(calcularRetencoes(base({ event: 'SETTLEMENT', beneficiario: optante(false) })).linhas).toEqual([]);
    expect(resumo(calcularRetencoes(base({ beneficiario: optante(true) })))).toEqual([['IRRF', 0n, 'OPTANTE_SIMPLES', '170806']]);
    const sem = calcularRetencoes(base({ beneficiario: optante(false) }));
    expect([resumo(sem), sem.avisos]).toEqual([[['IRRF', 1500n, null, '170806']], ['SEM_DECLARACAO_OPTANTE']]);
  });

  it('invariante 4: COOPERATIVA ⇒ só CSLL; EXTERIOR ⇒ 400; sem regime ⇒ não optante com aviso', () => {
    const coop = { regime: 'COOPERATIVA' as const, temDeclaracaoOptante: false, taxIdKind: 'CNPJ' as const };
    expect(resumo(calcularRetencoes(base({ event: 'SETTLEMENT', brutoCents: 200_000n, beneficiario: coop })))).toEqual([['CSLL', 2000n, null, '595207']]);
    expect(() => calcularRetencoes(base({ beneficiario: { regime: 'EXTERIOR', temDeclaracaoOptante: false, taxIdKind: null } }))).toThrow(/exterior/i);
    const semRegime = calcularRetencoes(base({ beneficiario: { regime: null, temDeclaracaoOptante: false, taxIdKind: 'CNPJ' } }));
    expect([resumo(semRegime), semRegime.avisos]).toEqual([[['IRRF', 1500n, null, '170806']], ['SEM_REGIME_BENEFICIARIO']]);
  });

  it('invariante 5: CSRF ≤ R$ 10 por pagamento ⇒ dispensa MINIMO_R10 (R$ 200 ⇒ R$ 9,30); R$ 250 ⇒ R$ 11,63 retida', () => {
    expect(resumo(calcularRetencoes(base({ event: 'SETTLEMENT', brutoCents: 20_000n })))).toEqual([
      ['CSLL', 0n, 'MINIMO_R10', '595207'],
      ['COFINS', 0n, 'MINIMO_R10', '595207'],
      ['PIS', 0n, 'MINIMO_R10', '595207'],
    ]);
    const r = calcularRetencoes(base({ event: 'SETTLEMENT', brutoCents: 25_000n }));
    expect(r.linhas.reduce((s, l) => s + l.amountCents, 0n)).toBe(1163n);
  });

  it('invariante 5: IRRF ≤ R$ 10 dispensado para Presumido; optante sem declaração retém mesmo pouco', () => {
    expect(resumo(calcularRetencoes(base({ brutoCents: 50_000n })))).toEqual([['IRRF', 0n, 'MINIMO_R10', '170806']]); // R$ 7,50
    const simples = { regime: 'SIMPLES' as const, temDeclaracaoOptante: false, taxIdKind: 'CNPJ' as const };
    expect(resumo(calcularRetencoes(base({ brutoCents: 50_000n, beneficiario: simples })))).toEqual([['IRRF', 750n, null, '170806']]);
  });

  it('sem perfil ⇒ nenhuma linha + aviso SEM_PERFIL_RETENCAO para PJ; PF sem perfil não avisa', () => {
    expect(calcularRetencoes(base({ perfil: null }))).toMatchObject({ linhas: [], avisos: ['SEM_PERFIL_RETENCAO'] });
    expect(calcularRetencoes(base({ perfil: null, beneficiario: { regime: 'PF', temDeclaracaoOptante: false, taxIdKind: 'CPF' } })).avisos).toEqual([]);
  });

  it('INSS 11% sobre o bruto (código DRAFT ⇒ null + aviso) e ISS pela alíquota do perfil', () => {
    const r = calcularRetencoes(base({ perfil: { ...PERFIL, irrf: false, inss: true, issRetido: true, issAliquotaBp: 200 } }));
    expect(resumo(r)).toEqual([['INSS', 11_000n, null, null], ['ISS', 2_000n, null, null]]);
    expect(r.avisos).toEqual(['CODIGO_RECEITA_DRAFT']);
  });

  it('invariante 10: parametrosSha256 estável para a mesma fotografia e diferente com uma linha nova', () => {
    const a = calcularRetencoes(base());
    expect(calcularRetencoes(base()).parametrosSha256).toBe(a.parametrosSha256);
    const extra = { ...tabela.find((l) => l.tabela === 'RETENCAO')!, id: 'ret-nova', valorInt: 200, vigenteDesde: '2026-03-01' };
    expect(calcularRetencoes(base({ tabela: [...tabela, extra] })).parametrosSha256).not.toBe(a.parametrosSha256);
  });
});

describe('calcularIrrfPf (item 11; F-RET-17 a)', () => {
  const pf = { rendimentoMesAntesCents: 0n, retidoMesAntesCents: 0n, dependentes: 0, previdenciaCents: 0n, pensaoCents: 0n };

  it('invariante 11: R$ 5.000 sem dedução ⇒ IR zero (art. 3º-A)', () => {
    expect(calcularIrrfPf(500_000n, pf, tabela, '2026-03-10')).toMatchObject({ amountCents: 0n, dispensa: null });
  });

  it('R$ 6.000 ⇒ redução 179,75; R$ 7.350,01 ⇒ sem redução', () => {
    expect(calcularIrrfPf(600_000n, pf, tabela, '2026-03-10').pf.reducaoArt3ACents).toBe(17_975n);
    expect(calcularIrrfPf(735_001n, pf, tabela, '2026-03-10').pf.reducaoArt3ACents).toBe(0n);
  });

  it('invariante 11: 2º pagamento no mês retém pela diferença sobre a soma (F-RET-17 a)', () => {
    const primeiro = calcularIrrfPf(400_000n, pf, tabela, '2026-03-05'); // R$ 4.000 ⇒ zerado pela redução
    expect(primeiro.amountCents).toBe(0n);
    const segundo = calcularIrrfPf(400_000n, { ...pf, rendimentoMesAntesCents: 400_000n, retidoMesAntesCents: primeiro.amountCents }, tabela, '2026-03-20');
    const sozinho = calcularIrrfPf(800_000n, pf, tabela, '2026-03-20');
    expect(segundo.amountCents).toBe(sozinho.amountCents);
    expect(segundo.amountCents > 0n).toBe(true);
  });

  it('deduções do art. 4º maiores que o desconto simplificado substituem o desconto', () => {
    const r = calcularIrrfPf(800_000n, { ...pf, dependentes: 4 }, tabela, '2026-03-10'); // 4 × 189,59 = 758,36 > 607,20
    expect([r.pf.deducaoDependentesCents, r.pf.descontoSimplificadoCents, r.baseCents]).toEqual([75_836n, 0n, 724_164n]);
  });
});

describe('brutoDaParcela (itens 17 e 18; invariante 6)', () => {
  const bps = [100, 300, 65];

  it('R$ 1.000 numa baixa: pago 953,50 ⇒ bruto 1.000,00 (CSRF 46,50)', () => {
    expect(brutoDaParcela(95_350n, bps, 100_000n, 1000n)).toBe(100_000n);
    expect(csrfDoBruto(100_000n, bps)).toBe(4650n);
  });

  it('4 parcelas de R$ 250: pago 238,37 ⇒ bruto 250 (CSRF 11,63), o MAIOR que fecha (249,99 também fecha; dono 24/10)', () => {
    let restante = 100_000n;
    for (let i = 0; i < 4; i++) {
      const g = brutoDaParcela(23_837n, bps, restante, 1000n);
      expect([i, g, csrfDoBruto(g, bps)]).toEqual([i, 25_000n, 1163n]);
      restante -= g;
    }
    expect(restante).toBe(0n);
  });

  it('a última parcela absorve o centavo: o restante que fecha vence o menor bruto', () => {
    // restante 250,01 com CSRF 11,63 ⇒ pago 238,38; o menor bruto que fecha 238,38 seria 250,01 também, mas o restante
    // é preferido quando fecha — a soma das parcelas fecha amountCents exatamente.
    expect(brutoDaParcela(25_001n - csrfDoBruto(25_001n, bps), bps, 25_001n, 1000n)).toBe(25_001n);
  });

  it('5 parcelas de R$ 200 (CSRF 9,30 ≤ R$ 10 ⇒ dispensada): pago 200 ⇒ bruto 200', () => {
    expect(brutoDaParcela(20_000n, bps, 100_000n, 1000n)).toBe(20_000n);
  });

  it('pago que nenhum bruto fecha ⇒ 409 nomeado', () => {
    // Com as alíquotas da CSRF todo pago tem bruto; o 409 só aparece com alíquotas que somam 100%.
    expect(() => brutoDaParcela(1_000n, [3333, 3333, 3334], 5_000n, null)).toThrow(/BRUTO_DA_PARCELA_SEM_SOLUCAO/);
  });
});

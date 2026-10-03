/**
 * BE-INCR-TAX-ASSESSMENT Fase A (nó X7, BRIEF itens 8–11; 23 c/d) — funções puras da apuração trimestral.
 *
 * Teste-tabela da LC 224 (item 9): um caso por parágrafo da IN RFB 2.305/2025 art. 15 (redação da IN 2.306/2026,
 * texto vigente relido em 03/10/2026 na fonte), com a conta feita à mão no comentário. Valores em centavos.
 * Um teste verde prova a aritmética contra a tabela, não contra a lei — o oráculo é H1/X5 × PVA (P-9).
 */
import { ValidationError } from '../../../../lib/errors';
import {
  MemoriaCalculoSchema,
  apurarPresumidoTrimestral,
  apurarRealTrimestral,
  trimestresEmAtividade,
  type DeducaoInformada,
  type EntradaReal,
  type MemoriaAnterior,
  type PerfilApuracaoPresumido,
  type PeriodoTrimestral,
  type ResultadoApuracao,
  type TributoApuracao,
} from '../taxAssessmentCalc';

const R = (reais: number): bigint => BigInt(Math.round(reais * 100));
const PERFIL: PerfilApuracaoPresumido = {
  ecfIndAliqCsll: '1',
  ecfIndRecReceita: '2',
  lc224AcrescimoSuspenso: false,
  lc224LiminarReferencia: null,
  inicioAtividadeEm: null,
  encerramentoAtividadeEm: null,
};
const v = (r: ResultadoApuracao, codigo: string): string | undefined => r.memoria.find((m) => m.codigo === codigo)?.valorCents;

/** Apura o ano em sequência, alimentando cada trimestre com as memórias "confirmadas" dos anteriores (F-TA-3 a). */
function apurarAno(
  receitas: Partial<Record<PeriodoTrimestral, [number, number]>>, // [serviço, revenda] em reais
  tributo: TributoApuracao = 'IRPJ',
  perfil: Partial<PerfilApuracaoPresumido> = {},
  deducoes: DeducaoInformada[] = [],
  ano = 2026,
): Record<string, ResultadoApuracao> {
  const out: Record<string, ResultadoApuracao> = {};
  const anteriores: MemoriaAnterior[] = [];
  for (const periodo of ['T01', 'T02', 'T03', 'T04'] as const) {
    const rec = receitas[periodo];
    if (!rec) continue;
    const r = apurarPresumidoTrimestral({
      ano,
      periodo,
      tributo,
      receitaServicoCents: R(rec[0]),
      receitaRevendaCents: R(rec[1]),
      perfil: { ...PERFIL, ...perfil },
      anteriores: [...anteriores],
      deducoes: periodo === 'T04' ? deducoes : [],
    });
    out[periodo] = r;
    anteriores.push({ periodo, memoria: r.memoria });
  }
  return out;
}

describe('Presumido trimestral (item 8) e LC 224 (item 9)', () => {
  it('sem LC 224 (2025): IRPJ = 15% + adicional; CSLL 9%; códigos 208901 / 237201; memória no schema', () => {
    // serviço 100.000,00 × 32% = 32.000,00; IRPJ 15% = 4.800,00; adicional 10% × (32.000 − 60.000) = 0
    const irpj = apurarAno({ T01: [100_000, 0] }, 'IRPJ', {}, [], 2025).T01;
    expect(irpj.baseCents).toBe(R(32_000));
    expect(irpj.devidoCents).toBe(R(4_800));
    expect(irpj.codigoReceita).toBe('208901');
    expect(v(irpj, 'LC224_EXCEDENTE')).toBeUndefined(); // limite sem linha vigente em 2025
    expect(MemoriaCalculoSchema.safeParse(irpj.memoria).success).toBe(true);
    const csll = apurarAno({ T01: [100_000, 0] }, 'CSLL', {}, [], 2025).T01;
    expect(csll.devidoCents).toBe(R(2_880)); // 32.000 × 9%
    expect(csll.codigoReceita).toBe('237201');
  });

  it('recusas (400): CSLL sem alíquota no perfil (D8); regime de caixa (IN 1.700 art. 223)', () => {
    expect(() => apurarAno({ T01: [1, 0] }, 'IRPJ', { ecfIndAliqCsll: null })).toThrow(ValidationError);
    expect(() => apurarAno({ T01: [1, 0] }, 'IRPJ', { ecfIndRecReceita: '1' })).toThrow(/regime de caixa/);
  });

  it('§ 3º: parcela acima de R$ 1.250.000,00 no trimestre recebe o percentual acrescido; CSLL só desde 01/04/2026', () => {
    // T01/2026, serviço 2.000.000,00 → excedente 750.000,00
    // IRPJ: 2.000.000 × 32% = 640.000; 750.000 × 32% × 10% = 24.000 → base 664.000
    //       15% = 99.600; adicional 10% × (664.000 − 60.000) = 60.400 → devido 160.000,00
    const irpj = apurarAno({ T01: [2_000_000, 0] }).T01;
    expect(v(irpj, 'LC224_EXCEDENTE')).toBe(String(R(750_000)));
    expect(v(irpj, 'LC224_ACRESCIMO_SERVICO')).toBe(String(R(24_000)));
    expect(irpj.baseCents).toBe(R(664_000));
    expect(irpj.devidoCents).toBe(R(160_000));
    // CSLL T01/2026: acréscimo 0 (IN 2.305 art. 3º II); o excedente é contado igual (P-2) → base 640.000 × 9% = 57.600
    const csll = apurarAno({ T01: [2_000_000, 0] }, 'CSLL').T01;
    expect(v(csll, 'LC224_EXCEDENTE')).toBe(String(R(750_000)));
    expect(csll.devidoCents).toBe(R(57_600));
  });

  it('§ 4º: a diferença não usada passa ao trimestre seguinte (e só a parte não usada)', () => {
    // T01 1.000.000 → sobra 250.000; T02 limite 1.500.000, receita 1.400.000 → excedente 0, sobra 100.000
    // T03 limite 1.350.000, receita 1.400.000 → excedente 50.000
    const r = apurarAno({ T01: [1_000_000, 0], T02: [1_400_000, 0], T03: [1_400_000, 0] });
    expect(v(r.T02, 'LC224_SOBRA_ANTERIOR')).toBe(String(R(250_000)));
    expect(v(r.T02, 'LC224_EXCEDENTE')).toBe('0');
    expect(v(r.T03, 'LC224_SOBRA_ANTERIOR')).toBe(String(R(100_000)));
    expect(v(r.T03, 'LC224_EXCEDENTE')).toBe(String(R(50_000)));
  });

  it('§§ 1º II e 6º: acréscimo proporcional à receita de cada atividade no trimestre', () => {
    // T02/2026: serviço 1.500.000 + revenda 500.000 = 2.000.000 (sem T01 confirmado: sobra 0) → excedente 750.000
    // repartição: serviço 750.000 × 1,5/2 = 562.500; revenda 187.500
    // IRPJ: 562.500 × 32% × 10% = 18.000; 187.500 × 8% × 10% = 1.500
    // CSLL (já vigente em 30/06): 18.000 e 187.500 × 12% × 10% = 2.250
    const irpj = apurarAno({ T02: [1_500_000, 500_000] }).T02;
    expect(v(irpj, 'LC224_ACRESCIMO_SERVICO')).toBe(String(R(18_000)));
    expect(v(irpj, 'LC224_ACRESCIMO_REVENDA')).toBe(String(R(1_500)));
    const csll = apurarAno({ T02: [1_500_000, 500_000] }, 'CSLL').T02;
    expect(v(csll, 'LC224_ACRESCIMO_SERVICO')).toBe(String(R(18_000)));
    expect(v(csll, 'LC224_ACRESCIMO_REVENDA')).toBe(String(R(2_250)));
  });

  it('§ 5º I: acumulada abaixo do limite anual ⇒ sem acréscimo no T04 e a diferença dos anteriores é deduzida', () => {
    // T01 2.000.000 (devido 160.000, ver § 3º); T02 0; T03 0; T04 1.000.000 → acumulada 3.000.000 < 5.000.000
    // recálculo do T01 sem acréscimo: base 640.000 → 96.000 + 58.000 = 154.000 → diferença 6.000
    // T04: base 320.000 → 48.000 + 26.000 = 74.000; a pagar 74.000 − 6.000 = 68.000
    const r = apurarAno({ T01: [2_000_000, 0], T02: [0, 0], T03: [0, 0], T04: [1_000_000, 0] });
    expect(v(r.T04, 'LC224_EXCEDENTE')).toBe('0');
    expect(r.T04.memoria.find((m) => m.codigo === 'LC224_EXCEDENTE')?.fonte).toMatch(/§ 5º I$/);
    expect(v(r.T04, 'LC224_ACERTO_T04')).toBe(String(R(6_000)));
    expect(r.T04.devidoCents).toBe(R(74_000));
    expect(r.T04.aPagarCents).toBe(R(68_000));
  });

  it('§ 5º II: excedente anual menor que a soma das anteriores ⇒ rateio pela razão e recálculo', () => {
    // T01 3.000.000 → excedente 1.750.000; base 960.000 + 1.750.000 × 3,2% = 56.000 → 1.016.000
    //   devido = 152.400 + 10% × 956.000 = 95.600 → 248.000
    // T02/T03 0; T04 2.500.000 → acumulada 5.500.000; excedente anual 500.000 < 1.750.000
    // excedente' do T01 = 1.750.000 × 500.000 / 1.750.000 = 500.000 → base 960.000 + 16.000 = 976.000
    //   devido' = 146.400 + 91.600 = 238.000 → diferença 10.000
    // T04: base 800.000 → 120.000 + 74.000 = 194.000; a pagar 184.000
    const r = apurarAno({ T01: [3_000_000, 0], T02: [0, 0], T03: [0, 0], T04: [2_500_000, 0] });
    expect(r.T01.devidoCents).toBe(R(248_000));
    expect(v(r.T04, 'LC224_EXCEDENTE_ANUAL')).toBe(String(R(500_000)));
    expect(v(r.T04, 'LC224_ACERTO_T04')).toBe(String(R(10_000)));
    expect(r.T04.memoria.find((m) => m.codigo === 'LC224_ACERTO_T04')?.fonte).toMatch(/§ 5º II b/);
    expect(r.T04.aPagarCents).toBe(R(184_000));
  });

  it('§ 5º III: excedente anual maior ⇒ a do T04 fica limitada à diferença (excedente anual − anteriores)', () => {
    // T01 2.000.000 (excedente 750.000); T02/T03 0 (sobra acumulada 2.500.000 → limite do T04 3.750.000)
    // T04 6.000.000 → excedente do trimestre 2.250.000; acumulada 8.000.000, excedente anual 3.000.000
    // diferença 3.000.000 − 750.000 = 2.250.000 → min(2.250.000, 2.250.000). Com a sobra cumulativa do § 4º a trava
    // coincide com a regra trimestral; o caso em que ela morde é o do § 9º (abaixo).
    const r = apurarAno({ T01: [2_000_000, 0], T02: [0, 0], T03: [0, 0], T04: [6_000_000, 0] });
    expect(v(r.T04, 'LC224_EXCEDENTE')).toBe(String(R(2_250_000)));
    expect(r.T04.memoria.find((m) => m.codigo === 'LC224_EXCEDENTE')?.fonte).toMatch(/§ 5º III$/);
    expect(v(r.T04, 'LC224_ACERTO_T04')).toBeUndefined();
  });

  it('§ 9º: início de atividade no ano reduz o limite anual (trimestres em atividade × 1.250.000)', () => {
    expect(trimestresEmAtividade(2026, '2026-07-01', null)).toEqual(['T03', 'T04']);
    expect(trimestresEmAtividade(2026, '2025-03-10', '2026-05-15')).toEqual(['T01', 'T02']);
    // início 01/07: T03 1.000.000 (sobra 250.000); T04 2.000.000 → limite do trimestre 1.500.000, excedente 500.000
    // limite anual 2 × 1.250.000 = 2.500.000; acumulada 3.000.000 → excedente anual 500.000 ≥ 0 ⇒ III: 500.000
    const com = apurarAno({ T03: [1_000_000, 0], T04: [2_000_000, 0] }, 'IRPJ', { inicioAtividadeEm: '2026-07-01' });
    expect(v(com.T04, 'LC224_LIMITE_ANUAL')).toBe(String(R(2_500_000)));
    expect(v(com.T04, 'LC224_EXCEDENTE')).toBe(String(R(500_000)));
    // sem a data (ano inteiro): limite anual 5.000.000 > 3.000.000 ⇒ I: sem acréscimo no T04
    const sem = apurarAno({ T03: [1_000_000, 0], T04: [2_000_000, 0] });
    expect(v(sem.T04, 'LC224_EXCEDENTE')).toBe('0');
  });

  it('§ 5º — fronteiras que a IN não nomeia (acumulada = limite anual; excedente anual = soma) dão o número do ramo vizinho', () => {
    // acumulada = 5.000.000 exata: excedente anual 0 < 750.000 ⇒ recálculo sem acréscimo, como no ramo I (dif. 6.000)
    const igualLimite = apurarAno({ T01: [2_000_000, 0], T02: [0, 0], T03: [0, 0], T04: [3_000_000, 0] });
    expect(v(igualLimite.T04, 'LC224_EXCEDENTE')).toBe('0');
    expect(v(igualLimite.T04, 'LC224_ACERTO_T04')).toBe(String(R(6_000)));
    // excedente anual = soma (750.000): o ramo III dá excedente 0 no T04 e o II não muda nada — sem acerto
    const igualSoma = apurarAno({ T01: [2_000_000, 0], T02: [0, 0], T03: [0, 0], T04: [3_750_000, 0] });
    expect(v(igualSoma.T04, 'LC224_EXCEDENTE')).toBe('0');
    expect(v(igualSoma.T04, 'LC224_ACERTO_T04')).toBeUndefined();
  });

  it('§ 7º: dedução do T04 maior que o devido ⇒ a pagar 0 e saldo negativo "pedido fora do sistema"', () => {
    // T01 3.000.000 (excedente 1.750.000) e T04 0: acumulada 3.000.000 < 5.000.000 ⇒ ramo I
    // diferença do T01 = 248.000 − (960.000 → 144.000 + 90.000 = 234.000) = 14.000; T04 devido 0
    const r = apurarAno({ T01: [3_000_000, 0], T02: [0, 0], T03: [0, 0], T04: [0, 0] });
    expect(r.T04.aPagarCents).toBe(0n);
    expect(r.T04.saldoNegativoCents).toBe(R(14_000));
    expect(r.T04.memoria.find((m) => m.codigo === 'SALDO_NEGATIVO')?.fonte).toMatch(/§ 7º — pedido fora do sistema/);
  });

  it('liminar (item 2b, F-TA-5 a): acréscimo 0 no trimestre, linha LC224_SUSPENSO com o processo; limite e sobra seguem contados', () => {
    const r = apurarAno({ T01: [2_000_000, 0] }, 'IRPJ', { lc224AcrescimoSuspenso: true, lc224LiminarReferencia: '5001234-56.2026.4.03.6100' });
    expect(v(r.T01, 'LC224_EXCEDENTE')).toBe(String(R(750_000)));
    expect(v(r.T01, 'LC224_ACRESCIMO_SERVICO')).toBe('0');
    expect(r.T01.baseCents).toBe(R(640_000));
    expect(r.T01.memoria.find((m) => m.codigo === 'LC224_SUSPENSO')?.descricao).toContain('5001234-56.2026.4.03.6100');
    // o T04 lê a memória como está: o T01 suspenso é recalculado também sem acréscimo ⇒ diferença 0
    const ano = apurarAno({ T01: [2_000_000, 0], T02: [0, 0], T03: [0, 0], T04: [1_000_000, 0] }, 'IRPJ', {
      lc224AcrescimoSuspenso: true,
      lc224LiminarReferencia: 'proc-1',
    });
    expect(v(ano.T04, 'LC224_ACERTO_T04')).toBe('0');
  });
});

describe('deduções (item 11, F-X7-11 a; F-TA-9 a)', () => {
  it('só as do próprio tributo; OUTRA com documento na memória; excedente vira saldo negativo', () => {
    // 2025, serviço 100.000 → IRPJ devido 4.800,00
    const deducoes: DeducaoInformada[] = [
      { tributo: 'IRPJ', tipo: 'IRRF', valorCents: String(R(1_500)) },
      { tributo: 'IRPJ', tipo: 'OUTRA', valorCents: String(R(500)), documento: 'DARF 123' },
      { tributo: 'CSLL', tipo: 'CSLL_RETIDA', valorCents: String(R(999)) },
    ];
    const r = apurarPresumidoTrimestral({
      ano: 2025, periodo: 'T01', tributo: 'IRPJ', receitaServicoCents: R(100_000), receitaRevendaCents: 0n,
      perfil: PERFIL, anteriores: [], deducoes,
    });
    expect(r.deducoesCents).toBe(R(2_000));
    expect(r.aPagarCents).toBe(R(2_800));
    expect(r.memoria.find((m) => m.codigo === 'DEDUCAO_2')?.descricao).toBe('OUTRA — DARF 123');
    const acima = apurarPresumidoTrimestral({
      ano: 2025, periodo: 'T01', tributo: 'IRPJ', receitaServicoCents: R(100_000), receitaRevendaCents: 0n,
      perfil: PERFIL, anteriores: [], deducoes: [{ tributo: 'IRPJ', tipo: 'IRRF', valorCents: String(R(5_000)) }],
    });
    expect(acima.aPagarCents).toBe(0n);
    expect(acima.saldoNegativoCents).toBe(R(200));
    expect(acima.memoria.find((m) => m.codigo === 'SALDO_NEGATIVO')?.fonte).toMatch(/F-TA-9/);
  });
});

describe('Real trimestral (item 10; 23 c/d)', () => {
  const base: EntradaReal = {
    ano: 2026, periodo: 'T01', tributo: 'IRPJ', resultadoAntesCents: R(100_000), contasProvisaoConfiguradas: true,
    linhasParteA: [], parteBFechada: true, perfil: { ecfIndAliqCsll: '4', lucroRealObrigatorio: false }, deducoes: [],
  };

  it('L = resultado + A − E; C = linhas P; código 337301 (optante) / 022001 (obrigada) / 601201 (CSLL)', () => {
    // 100.000 + 20.000 (linha 6, A) − 10.000 (linha 95, E) = 110.000; compensação 173 = 33.000 = 30% × 110.000
    // base 77.000 → 15% 11.550 + 10% × 17.000 = 1.700 → 13.250
    const r = apurarRealTrimestral({
      ...base,
      linhasParteA: [{ codigo: '6', valorCents: R(20_000) }, { codigo: '95', valorCents: R(10_000) }, { codigo: '173', valorCents: R(33_000) }],
    });
    expect(v(r, 'LUCRO_AJUSTADO')).toBe(String(R(110_000)));
    expect(v(r, 'COMPENSACAO_TETO')).toBe(String(R(33_000)));
    expect(r.baseCents).toBe(R(77_000));
    expect(r.devidoCents).toBe(R(13_250));
    expect(r.codigoReceita).toBe('337301');
    expect(apurarRealTrimestral({ ...base, perfil: { ...base.perfil, lucroRealObrigatorio: true } }).codigoReceita).toBe('022001');
    const csll = apurarRealTrimestral({ ...base, tributo: 'CSLL' });
    expect(csll.codigoReceita).toBe('601201');
    expect(csll.devidoCents).toBe(R(15_000)); // 100.000 × 15% (indAliqCsll '4')
  });

  it('23(d) D6: compensação = arred(30% × L) passa; um centavo acima ⇒ 400 nomeando a linha P; L ≤ 0 com C > 0 ⇒ 400', () => {
    const teto = R(30_000); // 30% × 100.000
    expect(() => apurarRealTrimestral({ ...base, linhasParteA: [{ codigo: '174', valorCents: teto }] })).not.toThrow();
    expect(() => apurarRealTrimestral({ ...base, linhasParteA: [{ codigo: '174', valorCents: teto + 1n }] })).toThrow(/lalur\/174.*teto/);
    expect(() =>
      apurarRealTrimestral({ ...base, tributo: 'CSLL', resultadoAntesCents: 0n, linhasParteA: [{ codigo: '173', valorCents: 1n }] }),
    ).toThrow(/CSLL: compensação.*lacs\/173/);
  });

  it('23(c) adicional: base exatamente 60.000,00 ⇒ 0; 1 centavo acima ⇒ 0,1 → 0; 5 centavos acima ⇒ 0,5 → 1 (F-TA-2)', () => {
    const adicional = (resultado: bigint) => v(apurarRealTrimestral({ ...base, resultadoAntesCents: resultado }), 'ADICIONAL');
    expect(adicional(R(60_000))).toBe('0');
    expect(adicional(R(60_000) + 1n)).toBe('0');
    expect(adicional(R(60_000) + 5n)).toBe('1');
  });

  it('prejuízo ⇒ base e imposto 0; pré-condições (400): Parte B aberta, lucroRealObrigatorio nulo (só IRPJ), linha não-E', () => {
    const prej = apurarRealTrimestral({ ...base, resultadoAntesCents: -R(1_000) });
    expect(prej.baseCents).toBe(0n);
    expect(prej.devidoCents).toBe(0n);
    expect(() => apurarRealTrimestral({ ...base, parteBFechada: false })).toThrow(/Parte B/);
    expect(() => apurarRealTrimestral({ ...base, perfil: { ...base.perfil, lucroRealObrigatorio: null } })).toThrow(/lucroRealObrigatorio/);
    expect(() => apurarRealTrimestral({ ...base, tributo: 'CSLL', perfil: { ...base.perfil, lucroRealObrigatorio: null } })).not.toThrow();
    expect(() => apurarRealTrimestral({ ...base, linhasParteA: [{ codigo: '175', valorCents: 1n }] })).toThrow(/não é linha de entrada/);
  });

  it('guarda de circularidade sem contas configuradas fica registrada na memória (item 7)', () => {
    const r = apurarRealTrimestral({ ...base, contasProvisaoConfiguradas: false });
    expect(r.memoria.find((m) => m.codigo === 'GUARDA_CIRCULARIDADE')?.descricao).toBe('guarda de circularidade sem contas configuradas');
  });
});

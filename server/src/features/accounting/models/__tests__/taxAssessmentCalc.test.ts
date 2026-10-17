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
import { tabelaApuracaoSemente } from '@test/helpers/legalParams';

const tabela = tabelaApuracaoSemente(); // BE-INCR-LEGAL-PARAMS PR-1: a fotografia da semente da migração

const R = (reais: number): bigint => BigInt(Math.round(reais * 100));
const PERFIL: PerfilApuracaoPresumido = {
  ecfIndAliqCsll: '1',
  ecfIndRecReceita: '2',
  lc224AcrescimoSuspenso: false,
  lc224LiminarReferencia: null,
  inicioAtividadeEm: null,
  encerramentoAtividadeEm: null,
  prestadoraExclusivaServicos: false,
  declaraNaoProfissaoRegulamentada: false,
};
const v = (r: ResultadoApuracao, codigo: string): string | undefined => r.memoria.find((m) => m.codigo === codigo)?.valorCents;

/** Apura o ano em sequência, alimentando cada trimestre com as memórias "confirmadas" dos anteriores (F-TA-3 a). */
function apurarAno(
  receitas: Partial<Record<PeriodoTrimestral, [number, number]>>, // [serviço, revenda] em reais
  tributo: TributoApuracao = 'IRPJ',
  perfil: Partial<PerfilApuracaoPresumido> = {},
  deducoes: DeducaoInformada[] = [],
  ano = 2026,
): Record<string, ReturnType<typeof apurarPresumidoTrimestral>> {
  const out: Record<string, ReturnType<typeof apurarPresumidoTrimestral>> = {};
  const anteriores: MemoriaAnterior[] = [];
  for (const periodo of ['T01', 'T02', 'T03', 'T04'] as const) {
    const rec = receitas[periodo];
    if (!rec) continue;
    const r = apurarPresumidoTrimestral({
      tabela,
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
    // CSLL T01/2026: fora da LC 224 (art. 3º II; F-E1-1 a) — sem linha de limite/excedente → base 640.000 × 9% = 57.600
    const csll = apurarAno({ T01: [2_000_000, 0] }, 'CSLL').T01;
    expect(v(csll, 'LC224_EXCEDENTE')).toBeUndefined();
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
    // diferença 3.000.000 − 750.000 = 2.250.000 → min(2.250.000, 2.250.000). Com a sobra cumulativa do § 4º e a ordem
    // sequencial do F-TA-3 a trava do § 5º III coincide com a regra trimestral — nenhum caso aqui a faz cortar (o
    // `minB` é defesa para memória confirmada fora dessa cadeia). O teste fixa ramo e valor, não o corte.
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
    // (o que o § 9º muda aqui é o RAMO — III com a data, I sem ela —, não o corte do min)
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

  it('EMENDAS-BRIEF-2026-10-11 E1-1: CSLL de 2026 conta ¾ do limite (R$ 3.750.000,00 no ano; T02 sem sobra do T01)', () => {
    // P&R LC 224 v5 item 13 e SC Disit/SRRF10 10010/2026: a CSLL só tem a LC 224 desde 01/04/2026, então o limite
    // anual dela em 2026 é 3 × 1.250.000 = 3.750.000. Receita 1.500.000/trimestre: o IRPJ (controle) continua com
    // 4 × 1.250.000 = 5.000.000; a CSLL do T04 tem de trazer 3.750.000 e a do T02 nenhuma sobra do T01.
    const receitas: Record<PeriodoTrimestral, [number, number]> = { T01: [1_500_000, 0], T02: [1_500_000, 0], T03: [1_500_000, 0], T04: [1_500_000, 0] };
    const irpj = apurarAno(receitas, 'IRPJ');
    expect(v(irpj.T04, 'LC224_LIMITE_ANUAL')).toBe(String(R(5_000_000)));
    const csll = apurarAno(receitas, 'CSLL');
    expect(v(csll.T02, 'LC224_SOBRA_ANTERIOR')).toBe('0');
    expect(v(csll.T04, 'LC224_LIMITE_ANUAL')).toBe(String(R(3_750_000)));
  });
});

/**
 * BE-INCR-TAX-PRESUMIDO-16 (F-P16-0 a; IN RFB 1.700/2017 art. 215 §§ 10–13) — 16% do IRPJ do prestador exclusivo no
 * Presumido. Conta à mão no comentário; o oráculo do número é o H1 × PVA (§4 item 3 do BRIEF).
 */
describe('Presumido — 16% do prestador exclusivo (BE-INCR-TAX-PRESUMIDO-16)', () => {
  const P16 = { prestadoraExclusivaServicos: true, declaraNaoProfissaoRegulamentada: true };

  it('item 2: acumulada ≤ R$ 120 mil ⇒ IRPJ a 16% com a fonte do art. 215 § 10; a CSLL continua 32%', () => {
    // serviço 30.000 × 16% = 4.800; IRPJ 15% = 720,00 (adicional 0). CSLL: 30.000 × 32% = 9.600 × 9% = 864,00
    const irpj = apurarAno({ T01: [30_000, 0] }, 'IRPJ', P16).T01;
    expect(irpj.baseCents).toBe(R(4_800));
    expect(irpj.devidoCents).toBe(R(720));
    expect(irpj.memoria.find((m) => m.codigo === 'PRESUNCAO_REDUZIDA_16')?.fonte).toMatch(/art\. 215 § 10/);
    expect(v(irpj, 'PRESUNCAO_SERVICO')).toBeUndefined();
    expect(irpj.diferencaPostergadaCents).toBe(0n);
    const csll = apurarAno({ T01: [30_000, 0] }, 'CSLL', P16).T01;
    expect(csll.baseCents).toBe(R(9_600));
    expect(csll.devidoCents).toBe(R(864));
    expect(v(csll, 'PRESUNCAO_REDUZIDA_16')).toBeUndefined();
  });

  it('item 3: revenda no ano com a flag ⇒ 400 (art. 215 § 10); no trimestre atual ou num anterior', () => {
    expect(() => apurarAno({ T01: [30_000, 1] }, 'IRPJ', P16)).toThrow(/exclusividade.*art\. 215 § 10/);
    const t01 = apurarAno({ T01: [30_000, 0] }, 'IRPJ', P16).T01;
    const comRevendaAntes = { periodo: 'T01' as const, memoria: t01.memoria.map((m) => (m.codigo === 'RECEITA_REVENDA' ? { ...m, valorCents: '100' } : m)) };
    expect(() =>
      apurarPresumidoTrimestral({
        tabela, ano: 2026, periodo: 'T02', tributo: 'IRPJ', receitaServicoCents: R(1_000), receitaRevendaCents: 0n,
        perfil: { ...PERFIL, ...P16 }, anteriores: [comRevendaAntes], deducoes: [],
      }),
    ).toThrow(ValidationError);
  });

  it('itens 4 e 6: 1º trimestre acima do limite ⇒ 32% + diferença postergada dos trimestres a 16% (208902, vencimento)', () => {
    // T01 = T02 = 60.000 (acumulada 120.000 = limite, ainda 16%): base 9.600, IRPJ 1.440,00 cada.
    // T03 = 10.000 (acumulada 130.000): base 3.200, IRPJ 480,00; diferença = 2 × (60.000 × 32% × 15% − 1.440) = 2 × 1.440
    const ano = apurarAno({ T01: [60_000, 0], T02: [60_000, 0], T03: [10_000, 0] }, 'IRPJ', P16);
    expect(ano.T02.devidoCents).toBe(R(1_440));
    expect(v(ano.T02, 'PRESUNCAO_REDUZIDA_16')).toBe(String(R(9_600)));
    expect(ano.T03.devidoCents).toBe(R(480));
    expect(v(ano.T03, 'PRESUNCAO_SERVICO')).toBe(String(R(3_200)));
    expect(v(ano.T03, 'DIFERENCA_POSTERGADA_T01')).toBe(String(R(1_440)));
    expect(v(ano.T03, 'DIFERENCA_POSTERGADA_T02')).toBe(String(R(1_440)));
    expect(ano.T03.diferencaPostergadaCents).toBe(R(2_880));
    expect(ano.T03.codigoReceita).toBe('208901');
    expect(ano.T03.aPagarCents).toBe(R(480)); // a diferença vai na coluna (2º débito no X9), não no a pagar do 208901
    expect(ano.T03.memoria.find((m) => m.codigo === 'DIFERENCA_POSTERGADA')?.descricao).toContain('208902');
    expect(ano.T03.memoria.find((m) => m.codigo === 'DIFERENCA_POSTERGADA_VENCIMENTO')?.descricao).toContain('10/2026');
    expect(MemoriaCalculoSchema.safeParse(ano.T03.memoria).success).toBe(true);
  });

  it('item 5: trimestre depois do excesso ⇒ 32% sem nova diferença', () => {
    const ano = apurarAno({ T01: [60_000, 0], T02: [60_000, 0], T03: [10_000, 0], T04: [10_000, 0] }, 'IRPJ', P16);
    expect(ano.T04.devidoCents).toBe(R(480));
    expect(ano.T04.diferencaPostergadaCents).toBe(0n);
    expect(v(ano.T04, 'DIFERENCA_POSTERGADA')).toBeUndefined();
  });

  it('F-P16-1 (a): flag sem a confirmação da Lei 9.250 art. 40 p.ú. ⇒ 400; sem a flag nada muda', () => {
    expect(() => apurarAno({ T01: [30_000, 0] }, 'IRPJ', { prestadoraExclusivaServicos: true })).toThrow(/art\. 40 parágrafo único/);
    expect(apurarAno({ T01: [30_000, 0] }, 'IRPJ').T01.baseCents).toBe(R(9_600)); // 32%
  });

  it('item 10 / F-P16-3 (b): flag + receita do trimestre acima do limite da LC 224 ⇒ 400 nos dois tributos; antes da LC 224, não', () => {
    expect(() => apurarAno({ T01: [1_300_000, 0] }, 'IRPJ', P16)).toThrow(/F-P16-3/);
    expect(() => apurarAno({ T02: [1_300_000, 0] }, 'CSLL', P16)).toThrow(/F-P16-3/); // CSLL só desde o T02/2026 (F-E1-1 a)
    expect(apurarAno({ T01: [1_300_000, 0] }, 'IRPJ', P16, [], 2025).T01.diferencaPostergadaCents).toBe(0n);
  });
});

describe('3.4 receita por não uso (BE-INCR-H1-REFERENCIAL-3-4, F-HR-3 b)', () => {
  const P16 = { prestadoraExclusivaServicos: true, declaraNaoProfissaoRegulamentada: true };
  const trimestre = (periodo: PeriodoTrimestral, servico: number, naoUso: number, anteriores: MemoriaAnterior[] = [], perfil: Partial<PerfilApuracaoPresumido> = {}) =>
    apurarPresumidoTrimestral({
      tabela, ano: 2025, periodo, tributo: 'IRPJ', receitaServicoCents: R(servico), receitaRevendaCents: 0n, receitaNaoUsoCents: R(naoUso),
      perfil: { ...PERFIL, ...perfil }, anteriores, deducoes: [],
    });

  it('itens 2/2a/5: a 3.4 entra na base de serviço; RECEITA_SERVICO segue só a 3.1; linha própria RECEITA_NAO_USO', () => {
    // (100.000 + 10.000) × 32% = 35.200,00; IRPJ 15% = 5.280,00 (adicional 0)
    const r = trimestre('T01', 100_000, 10_000);
    expect(r.baseCents).toBe(R(35_200));
    expect(r.devidoCents).toBe(R(5_280));
    expect(v(r, 'RECEITA_SERVICO')).toBe(String(R(100_000)));
    expect(v(r, 'RECEITA_NAO_USO')).toBe(String(R(10_000)));
    expect(r.memoria.find((m) => m.codigo === 'RECEITA_NAO_USO')?.fonte).toMatch(/DL 1\.598\/1977 art\. 12 IV/);
    expect(MemoriaCalculoSchema.safeParse(r.memoria).success).toBe(true);
  });

  it('item 2a: sem movimento na 3.4 a memória não ganha a linha (memória de hoje inalterada)', () => {
    expect(v(trimestre('T01', 100_000, 0), 'RECEITA_NAO_USO')).toBeUndefined();
  });

  it('item 2: débito líquido na 3.4 (estorno) reduz a base de serviço; piso 0 na soma', () => {
    expect(trimestre('T01', 1_000, -200).baseCents).toBe(R(256)); // 800 × 32%
    expect(trimestre('T01', 100, -200).baseCents).toBe(0n);
  });

  it('item 2b: memória confirmada sem a linha da 3.4 (anterior ao incremento) é lida como 0, sem 400', () => {
    const t01 = trimestre('T01', 60_000, 0, [], P16);
    expect(v(t01, 'RECEITA_NAO_USO')).toBeUndefined();
    const t02 = trimestre('T02', 10_000, 0, [{ periodo: 'T01', memoria: t01.memoria }], P16);
    expect(v(t02, 'RECEITA_ACUMULADA_ANO')).toBe(String(R(70_000))); // acumulada igual à de hoje: 60.000 + 10.000
  });

  it('item 6: a 3.4 conta no teto do 16% — 3.1 = 110 mil + 3.4 = 15 mil passa do limite e gera a diferença do T01', () => {
    // T01: 60.000 a 16%. T02: 50.000 + 15.000 = 65.000 → acumulada 125.000 > 120.000 ⇒ 32% + diferença do T01.
    const t01 = trimestre('T01', 60_000, 0, [], P16);
    const t02 = trimestre('T02', 50_000, 15_000, [{ periodo: 'T01', memoria: t01.memoria }], P16);
    expect(v(t02, 'RECEITA_ACUMULADA_ANO')).toBe(String(R(125_000)));
    expect(v(t02, 'PRESUNCAO_SERVICO')).toBe(String(R(20_800))); // 65.000 × 32%
    expect(t02.diferencaPostergadaCents).toBe(R(1_440)); // 60.000 × 32% × 15% − 1.440
    // sem a 3.4 a acumulada (110.000) fica abaixo do limite: 16%, sem diferença
    expect(trimestre('T02', 50_000, 0, [{ periodo: 'T01', memoria: t01.memoria }], P16).diferencaPostergadaCents).toBe(0n);
  });

  it('item 2b: a diferença postergada recalcula o trimestre anterior com a 3.4 lida da memória', () => {
    // T01: 50.000 + 10.000 a 16% → devido 60.000 × 16% × 15% = 1.440. T02: 70.000 → acumulada 130.000 ⇒ diferença
    // = 60.000 × 32% × 15% − 1.440 = 1.440 (a 3.4 do T01 entra no recálculo a 32%).
    const t01 = trimestre('T01', 50_000, 10_000, [], P16);
    expect(t01.devidoCents).toBe(R(1_440));
    const t02 = trimestre('T02', 70_000, 0, [{ periodo: 'T01', memoria: t01.memoria }], P16);
    expect(v(t02, 'DIFERENCA_POSTERGADA_T01')).toBe(String(R(1_440)));
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
      tabela, ano: 2025, periodo: 'T01', tributo: 'IRPJ', receitaServicoCents: R(100_000), receitaRevendaCents: 0n,
      perfil: PERFIL, anteriores: [], deducoes,
    });
    expect(r.deducoesCents).toBe(R(2_000));
    expect(r.aPagarCents).toBe(R(2_800));
    expect(r.memoria.find((m) => m.codigo === 'DEDUCAO_2')?.descricao).toBe('OUTRA — DARF 123');
    const acima = apurarPresumidoTrimestral({
      tabela, ano: 2025, periodo: 'T01', tributo: 'IRPJ', receitaServicoCents: R(100_000), receitaRevendaCents: 0n,
      perfil: PERFIL, anteriores: [], deducoes: [{ tributo: 'IRPJ', tipo: 'IRRF', valorCents: String(R(5_000)) }],
    });
    expect(acima.aPagarCents).toBe(0n);
    expect(acima.saldoNegativoCents).toBe(R(200));
    expect(acima.memoria.find((m) => m.codigo === 'SALDO_NEGATIVO')?.fonte).toMatch(/F-TA-9/);
  });
});

describe('Real trimestral (item 10; 23 c/d)', () => {
  const base: EntradaReal = {
    tabela, ano: 2026, periodo: 'T01', tributo: 'IRPJ', resultadoAntesCents: R(100_000), contasProvisaoConfiguradas: true,
    linhasParteA: [], parteBFechada: true, perfil: { ecfIndAliqCsll: '4', lucroRealObrigatorio: false, inicioAtividadeEm: null, encerramentoAtividadeEm: null }, deducoes: [],
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

  it('BE-INCR-CSLL-BANCOS-Q1 item 4: banco (indAliqCsll 3) no T01/2026 — Presumido e Real a 20%, citando a Lei 7.689 art. 3º II-A (lp8-csll-3-e, verificação legal 17/10)', () => {
    const real = apurarRealTrimestral({ ...base, tributo: 'CSLL', perfil: { ...base.perfil, ecfIndAliqCsll: '3' } });
    expect(real.devidoCents).toBe(R(20_000)); // 100.000 × 20%
    expect(real.memoria.some((m) => m.fonte.includes('art. 3º II-A'))).toBe(true);
    const pres = apurarAno({ T01: [100_000, 0] }, 'CSLL', { ecfIndAliqCsll: '3' }).T01;
    expect(pres.devidoCents).toBe(R(6_400)); // 32.000 × 20%
    expect(pres.memoria.some((m) => m.fonte.includes('art. 3º II-A'))).toBe(true);
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

describe('adicional do IRPJ no trimestre de início/encerramento (verificação legal 17/10, divergência 1)', () => {
  // Lei 9.249/1995 art. 3º § 1º: o limite do adicional é R$ 20.000 × "o número de meses do respectivo período de
  // apuração". Premissa (A6 do consolidado, leitura mais segura): conta-se o mês que a atividade toca, como no
  // anual (`mesesEmAtividade`) — sem regra de fração de mês.
  it('Presumido: PJ aberta em 10/02/2025 ⇒ T01 com limite de 2 meses (fev–mar), não 3', () => {
    // serviço 200.000 × 32% = 64.000; adicional = 10% × (64.000 − 40.000) = 2.400 (com × 3 seria 400)
    const r = apurarAno({ T01: [200_000, 0] }, 'IRPJ', { inicioAtividadeEm: '2025-02-10' }, [], 2025).T01;
    expect(v(r, 'ADICIONAL')).toBe(String(R(2_400)));
  });

  it('Presumido: encerramento em 15/11/2025 ⇒ T04 com limite de 2 meses (out–nov)', () => {
    const r = apurarAno({ T04: [200_000, 0] }, 'IRPJ', { encerramentoAtividadeEm: '2025-11-15' }, [], 2025).T04;
    expect(v(r, 'ADICIONAL')).toBe(String(R(2_400)));
  });

  it('Real trimestral: PJ aberta em 10/02/2026 ⇒ T01 com limite de 2 meses', () => {
    // base 100.000; adicional = 10% × (100.000 − 40.000) = 6.000 (com × 3 seria 4.000)
    const r = apurarRealTrimestral({
      tabela, ano: 2026, periodo: 'T01', tributo: 'IRPJ', resultadoAntesCents: R(100_000), contasProvisaoConfiguradas: true,
      linhasParteA: [], parteBFechada: true, deducoes: [],
      perfil: { ecfIndAliqCsll: '4', lucroRealObrigatorio: false, inicioAtividadeEm: '2026-02-10', encerramentoAtividadeEm: null },
    });
    expect(v(r, 'ADICIONAL')).toBe(String(R(6_000)));
  });
});

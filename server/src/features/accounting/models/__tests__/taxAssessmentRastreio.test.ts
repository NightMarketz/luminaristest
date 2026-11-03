/**
 * BE-INCR-TAX-ASSESSMENT-C — EMENDA RASTREIO (BRIEF `docs/accounting/BE-INCR-TAX-ASSESSMENT-C-EMENDA-RASTREIO-brief.md`
 * itens 1–5 e o teste do F-RT-6 a) — a origem de cada linha da memória, montada na confirmação. Puro: o serviço passa os
 * movimentos e saldos; a prova pelo banco (confirmação grava, lançamento retroativo não muda) é a suíte de integração.
 */
import {
  apurarPresumidoTrimestral,
  apurarRealTrimestral,
  type MemoriaAnterior,
  type MemoriaLinha,
  type PerfilApuracaoPresumido,
  type PeriodoTrimestral,
  type TributoApuracao,
} from '../taxAssessmentCalc';
import {
  apurarAjusteAnual,
  apurarBalancete,
  apurarEstimativaReceitaBruta,
  type MesConfirmado,
  type PerfilApuracaoAnual,
  type ResultadoApuracaoAnual,
} from '../taxAssessmentCalcAnual';
import type { LalurMes } from '../Lalur.model';
import {
  DESCRICAO_COM_OPERACAO,
  RastreioApuracaoSchema,
  RastreioInvalidoError,
  montarRastreio,
  origemTipoDaLinha,
  validarRastreio,
  type ContextoRastreio,
} from '../taxAssessmentRastreio';
import { tabelaApuracaoSemente } from '@test/helpers/legalParams';

const tabela = tabelaApuracaoSemente();
const R = (reais: number): bigint => BigInt(Math.round(reais * 100));
const A = (m: number): LalurMes => `A${String(m).padStart(2, '0')}` as LalurMes;
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
const PERFIL_ANUAL: PerfilApuracaoAnual = { ecfIndAliqCsll: '1', lucroRealObrigatorio: false, prestadoraExclusivaServicos: false, inicioAtividadeEm: null, encerramentoAtividadeEm: null };
const SEM_RAZAO: ContextoRastreio['razao'] = { from: '2026-01-01', to: '2026-03-31', contasPorCodigo: {} };
const linhaDe = (memoria: MemoriaLinha[], codigo: string): MemoriaLinha => memoria.find((l) => l.codigo === codigo)!;

/** Presumido do ano em sequência, alimentando cada trimestre com as memórias "confirmadas" dos anteriores. */
function presumidoAno(
  receitas: Partial<Record<PeriodoTrimestral, [number, number]>>,
  tributo: TributoApuracao = 'IRPJ',
  perfil: Partial<PerfilApuracaoPresumido> = {},
  extra: { hospitalar?: number; naoUso?: number; deducaoT04?: number } = {},
): Record<string, MemoriaLinha[]> {
  const out: Record<string, MemoriaLinha[]> = {};
  const anteriores: MemoriaAnterior[] = [];
  for (const periodo of ['T01', 'T02', 'T03', 'T04'] as const) {
    const rec = receitas[periodo];
    if (!rec) continue;
    const r = apurarPresumidoTrimestral({
      tabela, ano: 2026, periodo, tributo, receitaServicoCents: R(rec[0]), receitaRevendaCents: R(rec[1]),
      receitaNaoUsoCents: extra.naoUso ? R(extra.naoUso) : undefined, receitaHospitalarCents: extra.hospitalar ? R(extra.hospitalar) : undefined,
      perfil: { ...PERFIL, ...perfil }, anteriores: [...anteriores],
      deducoes: periodo === 'T04' && extra.deducaoT04 ? [{ tributo, tipo: 'IRRF', valorCents: String(R(extra.deducaoT04)), documento: 'DARF 1' }] : [],
    });
    out[periodo] = r.memoria;
    anteriores.push({ periodo, memoria: r.memoria });
  }
  return out;
}

const confirmar = (r: ResultadoApuracaoAnual, periodo: LalurMes): MesConfirmado => ({
  id: `id-${periodo}-${r.tributo}`, periodo, tributo: r.tributo, modo: r.modo as MesConfirmado['modo'], devidoCents: r.devidoCents,
  deducoesCents: r.deducoesCents, aPagarCents: r.aPagarCents, diferencaPostergadaCents: r.diferencaPostergadaCents, memoria: r.memoria,
});

/** 12 estimativas por receita bruta (com o 16% do prestador exclusivo estourando o limite no meio do ano). */
function estimativas(tributo: TributoApuracao, perfil: Partial<PerfilApuracaoAnual> = {}): ResultadoApuracaoAnual[] {
  const out: ResultadoApuracaoAnual[] = [];
  const confirmados: MesConfirmado[] = [];
  for (let m = 1; m <= 12; m += 1) {
    const r = apurarEstimativaReceitaBruta({
      tabela, ano: 2026, periodo: A(m), tributo, receitaServicoCents: R(20_000), receitaRevendaCents: 0n,
      receitasMesesAnteriores: Array.from({ length: m - 1 }, (_, j) => ({ periodo: A(j + 1), servicoCents: R(20_000), revendaCents: 0n })),
      confirmados: [...confirmados], perfil: { ...PERFIL_ANUAL, ...perfil }, deducoes: [],
    });
    out.push(r);
    confirmados.push(confirmar(r, A(m)));
  }
  return out;
}

/** Todas as memórias que as funções puras produzem nos cenários que cobrem cada ramo de linha. */
function todasAsMemorias(): MemoriaLinha[][] {
  const memorias: MemoriaLinha[][] = [];
  const add = (ms: Record<string, MemoriaLinha[]>) => memorias.push(...Object.values(ms));
  for (const t of ['IRPJ', 'CSLL'] as const) {
    add(presumidoAno({ T01: [2_000_000, 100_000], T02: [0, 0], T03: [0, 0], T04: [1_000_000, 0] }, t, {}, { deducaoT04: 1_000 })); // § 5º I
    add(presumidoAno({ T01: [3_000_000, 0], T02: [0, 0], T03: [0, 0], T04: [2_500_000, 0] }, t)); // § 5º II
    add(presumidoAno({ T01: [3_000_000, 0], T02: [0, 0], T03: [0, 0], T04: [0, 0] }, t)); // § 7º saldo negativo
    add(presumidoAno({ T01: [2_000_000, 0] }, t, { lc224AcrescimoSuspenso: true, lc224LiminarReferencia: 'proc' })); // liminar
    add(presumidoAno({ T01: [500_000, 0] }, t, {}, { hospitalar: 100_000, naoUso: 1_000 })); // hospitalar + 3.4
  }
  add(presumidoAno({ T01: [60_000, 0], T02: [60_000, 0], T03: [10_000, 0] }, 'IRPJ', { prestadoraExclusivaServicos: true, declaraNaoProfissaoRegulamentada: true })); // 16% + diferença
  for (const t of ['IRPJ', 'CSLL'] as const) {
    const perfilReal = { ecfIndAliqCsll: '4', lucroRealObrigatorio: false, inicioAtividadeEm: null, encerramentoAtividadeEm: null };
    for (const contas of [true, false]) {
      memorias.push(apurarRealTrimestral({
        tabela, ano: 2026, periodo: 'T01', tributo: t, resultadoAntesCents: R(100_000), contasProvisaoConfiguradas: contas,
        linhasParteA: [], parteBFechada: true, perfil: perfilReal, deducoes: [{ tributo: t, tipo: 'OUTRA', valorCents: String(R(500_000)) }],
      }).memoria);
    }
    const meses = estimativas(t, { prestadoraExclusivaServicos: t === 'IRPJ' });
    memorias.push(...meses.map((r) => r.memoria));
    const confirmados = meses.map((r, i) => confirmar(r, A(i + 1)));
    memorias.push(apurarBalancete({
      tabela, ano: 2026, periodo: 'A03', tributo: t, resultadoAntesCents: R(100_000), contasProvisaoConfiguradas: false,
      linhasParteA: [], anteriores: confirmados.slice(0, 2), perfil: PERFIL_ANUAL, deducoes: [],
    }).memoria);
    memorias.push(apurarBalancete({
      tabela, ano: 2026, periodo: 'A03', tributo: t, resultadoAntesCents: R(1_000), contasProvisaoConfiguradas: true,
      linhasParteA: [], anteriores: confirmados.slice(0, 2), perfil: PERFIL_ANUAL, deducoes: [],
    }).memoria);
    for (const lair of [R(5_000_000), R(0)]) {
      memorias.push(apurarAjusteAnual({
        tabela, ano: 2026, tributo: t, resultadoAntesCents: lair, contasProvisaoConfiguradas: true, linhasParteA: [], parteBFechada: true,
        meses: confirmados, perfil: PERFIL_ANUAL, deducoes: [], estimativasPagas: [{ periodo: 'A01', tributo: t, valorCents: '0' }],
      }).memoria);
    }
  }
  return memorias;
}

describe('EMENDA RASTREIO item 1 — contrato e validação na confirmação', () => {
  const memoria: MemoriaLinha[] = [{ codigo: 'BASE', descricao: 'Base = x', valorCents: '1', fonte: 'f' }];

  it('rastreio montado passa no RastreioApuracaoSchema e tem uma entrada por código da memória', () => {
    const m = presumidoAno({ T01: [100_000, 0] }).T01;
    const r = validarRastreio(montarRastreio(m, { razao: SEM_RAZAO, anteriores: [] }), m);
    expect(RastreioApuracaoSchema.safeParse(r).success).toBe(true);
    expect(r.map((l) => l.codigo)).toEqual([...new Set(m.map((l) => l.codigo))]);
  });

  it('código que não existe na memória ⇒ RastreioInvalidoError (não silencia)', () => {
    expect(() => validarRastreio([{ codigo: 'FANTASMA', origemTipo: 'CALCULO' }], memoria)).toThrow(RastreioInvalidoError);
    expect(() => validarRastreio([{ codigo: 'FANTASMA', origemTipo: 'CALCULO' }], memoria)).toThrow(/FANTASMA/);
  });

  it('schema: origem desconhecida, chave a mais e centavos em float ⇒ RastreioInvalidoError', () => {
    expect(() => validarRastreio([{ codigo: 'BASE', origemTipo: 'OUTRA' }], memoria)).toThrow(RastreioInvalidoError);
    expect(() => validarRastreio([{ codigo: 'BASE', origemTipo: 'CALCULO', formula: 'x' }], memoria)).toThrow(RastreioInvalidoError);
    const conta = { accountCode: '3.1', accountName: 'R', from: '2026-01-01', to: '2026-03-31', movimentoCents: '1.5' };
    expect(() => validarRastreio([{ codigo: 'BASE', origemTipo: 'RAZAO', contas: [conta] }], memoria)).toThrow(RastreioInvalidoError);
  });
});

describe('EMENDA RASTREIO itens 2 e 3 — linhas do razão por conta analítica, com o saldo congelado', () => {
  const razao: ContextoRastreio['razao'] = {
    from: '2026-01-01',
    to: '2026-03-31',
    contasPorCodigo: {
      LAIR: [
        { accountId: 'a-41', accountCode: '4.1', accountName: 'Despesas gerais', movimentoCents: R(-20_000) },
        { accountId: 'a-31', accountCode: '3.1', accountName: 'Receita de Serviços', movimentoCents: R(120_000) },
        { accountId: 'a-35', accountCode: '3.5.1', accountName: 'Juros recebidos', movimentoCents: 0n }, // movimento 0 não entra
      ],
    },
  };

  it('LAIR com 2 contas analíticas com movimento ⇒ 2 entradas (ordem por código); a soma = valorCents da linha', () => {
    const m = apurarRealTrimestral({
      tabela, ano: 2026, periodo: 'T01', tributo: 'IRPJ', resultadoAntesCents: R(100_000), contasProvisaoConfiguradas: true,
      linhasParteA: [], parteBFechada: true, perfil: { ecfIndAliqCsll: '1', lucroRealObrigatorio: false, inicioAtividadeEm: null, encerramentoAtividadeEm: null }, deducoes: [],
    }).memoria;
    const saldo = new Map([['a-31', R(120_000)], ['a-41', R(-50_000)]]);
    const r = montarRastreio(m, { razao, saldoFinalPorConta: saldo, anteriores: [] });
    const lair = r.find((l) => l.codigo === 'LAIR')!;
    expect(lair.origemTipo).toBe('RAZAO');
    expect(lair.contas).toEqual([
      { accountCode: '3.1', accountName: 'Receita de Serviços', from: '2026-01-01', to: '2026-03-31', movimentoCents: String(R(120_000)), saldoFinalCents: String(R(120_000)) },
      { accountCode: '4.1', accountName: 'Despesas gerais', from: '2026-01-01', to: '2026-03-31', movimentoCents: String(R(-20_000)), saldoFinalCents: String(R(-50_000)) },
    ]);
    expect(lair.contas!.reduce((s, c) => s + BigInt(c.movimentoCents), 0n)).toBe(BigInt(linhaDe(m, 'LAIR').valorCents));
  });

  it('A2 (dono 03/11): 3.1 líquida negativa ⇒ linha 0 e rastreio com o movimento negativo; a descrição diz max(0, …)', () => {
    const m = presumidoAno({ T01: [0, 0] }).T01; // receitaBrutaPorAtividade entrega max(0, net) = 0
    const r = montarRastreio(m, {
      razao: { ...SEM_RAZAO, contasPorCodigo: { RECEITA_SERVICO: [{ accountId: 's', accountCode: '3.1', accountName: 'Receita de Serviços', movimentoCents: R(-500) }] } },
      anteriores: [],
    });
    expect(linhaDe(m, 'RECEITA_SERVICO').valorCents).toBe('0');
    expect(r.find((l) => l.codigo === 'RECEITA_SERVICO')!.contas![0].movimentoCents).toBe(String(R(-500)));
    expect(linhaDe(m, 'RECEITA_SERVICO').descricao).toContain('max(0, crédito − débito da conta 3.1)');
    expect(linhaDe(m, 'RECEITA_REVENDA').descricao).toContain('max(0, crédito − débito da conta 3.3)');
  });

  it('Presumido: RECEITA_SERVICO e RECEITA_REVENDA apontam as contas 3.1 e 3.3; sem saldo lido ⇒ sem saldoFinalCents', () => {
    const m = presumidoAno({ T01: [100_000, 30_000] }).T01;
    const r = montarRastreio(m, {
      razao: {
        ...SEM_RAZAO,
        contasPorCodigo: {
          RECEITA_SERVICO: [{ accountId: 's', accountCode: '3.1', accountName: 'Receita de Serviços', movimentoCents: R(100_000) }],
          RECEITA_REVENDA: [{ accountId: 'v', accountCode: '3.3', accountName: 'Receita de Revenda', movimentoCents: R(30_000) }],
        },
      },
      anteriores: [],
    });
    for (const [codigo, conta] of [['RECEITA_SERVICO', '3.1'], ['RECEITA_REVENDA', '3.3']]) {
      const l = r.find((x) => x.codigo === codigo)!;
      expect(l.contas).toHaveLength(1);
      expect(l.contas![0]).toMatchObject({ accountCode: conta, movimentoCents: linhaDe(m, codigo).valorCents });
      expect(l.contas![0].saldoFinalCents).toBeUndefined();
    }
  });
});

describe('EMENDA RASTREIO item 4 — período de origem das linhas que vêm de outra apuração', () => {
  it('a sobra do T02 aponta a apuração T01 confirmada', () => {
    const ano = presumidoAno({ T01: [500_000, 0], T02: [100_000, 0] });
    const r = montarRastreio(ano.T02, { razao: SEM_RAZAO, anteriores: [{ id: 'ta-t01', periodo: 'T01' }] });
    expect(r.find((l) => l.codigo === 'LC224_SOBRA_ANTERIOR')).toEqual({
      codigo: 'LC224_SOBRA_ANTERIOR', origemTipo: 'MEMORIA_ANTERIOR', origemApuracaoId: 'ta-t01', origemPeriodo: 'T01',
    });
  });

  it('linha de um período nomeado aponta aquele período; a acumulada é CALCULO com os períodos somados (A1, dono 03/11)', () => {
    const ano = presumidoAno({ T01: [60_000, 0], T02: [60_000, 0], T03: [10_000, 0] }, 'IRPJ', { prestadoraExclusivaServicos: true, declaraNaoProfissaoRegulamentada: true });
    const anteriores = [{ id: 'ta-t02', periodo: 'T02' }, { id: 'ta-t01', periodo: 'T01' }];
    const r = montarRastreio(ano.T03, { razao: SEM_RAZAO, anteriores });
    expect(r.find((l) => l.codigo === 'DIFERENCA_POSTERGADA_T01')).toMatchObject({ origemTipo: 'MEMORIA_ANTERIOR', origemApuracaoId: 'ta-t01', origemPeriodo: 'T01' });
    // A memória do T02 não carrega o acumulado do T01: um ponteiro para ela não sustentaria o número.
    expect(r.find((l) => l.codigo === 'RECEITA_ACUMULADA_ANO')).toEqual({ codigo: 'RECEITA_ACUMULADA_ANO', origemTipo: 'CALCULO' });
    expect(linhaDe(ano.T03, 'RECEITA_ACUMULADA_ANO').descricao).toContain('Σ receita bruta de T01, T02, T03');
  });

  it('A1: toda linha que soma vários períodos é CALCULO e nomeia os períodos (T04 da LC 224; ajuste anual)', () => {
    const t04 = presumidoAno({ T01: [2_000_000, 0], T02: [0, 0], T03: [0, 0], T04: [1_000_000, 0] }).T04;
    expect(linhaDe(t04, 'LC224_RECEITA_ACUMULADA').descricao).toContain('T01, T02, T03, T04');
    expect(linhaDe(t04, 'LC224_EXCEDENTES_ANTERIORES').descricao).toContain('T01, T02, T03');
    const meses = estimativas('IRPJ').map((r, i) => confirmar(r, A(i + 1)));
    const a00 = apurarAjusteAnual({
      tabela, ano: 2026, tributo: 'IRPJ', resultadoAntesCents: R(300_000), contasProvisaoConfiguradas: true, linhasParteA: [], parteBFechada: true,
      meses, perfil: PERFIL_ANUAL, deducoes: [], estimativasPagas: [{ periodo: 'A01', tributo: 'IRPJ', valorCents: '100' }],
    }).memoria;
    expect(linhaDe(a00, 'RETIDO_MESES').descricao).toContain('A01, A02, A03');
    expect(linhaDe(a00, 'ESTIMATIVA_PAGA_ASSUMIDA').descricao).toContain('A02, A03');
    expect(linhaDe(a00, 'ESTIMATIVA_NAO_PAGA').descricao).toContain('A01');
    const somam = [...t04, ...a00].filter((l) => ['LC224_RECEITA_ACUMULADA', 'LC224_EXCEDENTES_ANTERIORES', 'RETIDO_MESES', 'ESTIMATIVA_PAGA_ASSUMIDA', 'ESTIMATIVA_NAO_PAGA'].includes(l.codigo));
    expect(somam).toHaveLength(5);
    expect(somam.every((l) => origemTipoDaLinha(l) === 'CALCULO' && DESCRICAO_COM_OPERACAO.test(l.descricao))).toBe(true);
    expect(origemTipoDaLinha({ codigo: 'DEVIDO_MESES_ANTERIORES', descricao: 'Σ devido', valorCents: '0', fonte: '' })).toBe('CALCULO');
  });
});

describe('EMENDA RASTREIO item 5 — parâmetro, informado e cálculo (F-RT-6 a)', () => {
  it('alíquota da CSLL ⇒ PARAMETRO; dedução informada ⇒ INFORMADO; presunção ⇒ CALCULO', () => {
    const csll = presumidoAno({ T01: [100_000, 0], T02: [0, 0], T03: [0, 0], T04: [100_000, 0] }, 'CSLL', {}, { deducaoT04: 100 }).T04;
    expect(origemTipoDaLinha(linhaDe(csll, 'ALIQUOTA'))).toBe('PARAMETRO');
    expect(origemTipoDaLinha(linhaDe(csll, 'DEDUCAO_1'))).toBe('INFORMADO');
    expect(origemTipoDaLinha(linhaDe(csll, 'PRESUNCAO_SERVICO'))).toBe('CALCULO');
    const r = montarRastreio(csll, { razao: SEM_RAZAO, anteriores: [] });
    expect(r.find((l) => l.codigo === 'ALIQUOTA')).toEqual({ codigo: 'ALIQUOTA', origemTipo: 'PARAMETRO' }); // sem conta, sem origem
  });

  it('ajuste anual: estimativa paga informada ⇒ INFORMADO; assumida = confirmada ⇒ MEMORIA_ANTERIOR daquele mês', () => {
    const meses = estimativas('IRPJ').map((r, i) => confirmar(r, A(i + 1)));
    const a00 = apurarAjusteAnual({
      tabela, ano: 2026, tributo: 'IRPJ', resultadoAntesCents: R(300_000), contasProvisaoConfiguradas: true, linhasParteA: [], parteBFechada: true,
      meses, perfil: PERFIL_ANUAL, deducoes: [], estimativasPagas: [{ periodo: 'A01', tributo: 'IRPJ', valorCents: '100' }],
    }).memoria;
    expect(origemTipoDaLinha(linhaDe(a00, 'ESTIMATIVA_PAGA_A01'))).toBe('INFORMADO');
    const r = montarRastreio(a00, { razao: SEM_RAZAO, anteriores: meses.map((m) => ({ id: m.id, periodo: m.periodo })) });
    expect(r.find((l) => l.codigo === 'ESTIMATIVA_PAGA_A02')).toMatchObject({ origemTipo: 'MEMORIA_ANTERIOR', origemApuracaoId: 'id-A02-IRPJ', origemPeriodo: 'A02' });
  });

  it('F-RT-6 (a): toda linha CALCULO de todos os modos diz a operação na descrição', () => {
    const memorias = todasAsMemorias();
    const calculo = memorias.flat().filter((l) => origemTipoDaLinha(l) === 'CALCULO');
    expect(new Set(calculo.map((l) => l.codigo)).size).toBeGreaterThan(15); // o cenário cobre os ramos, não 1 linha
    const semOperacao = calculo.filter((l) => !DESCRICAO_COM_OPERACAO.test(l.descricao)).map((l) => `${l.codigo}: ${l.descricao}`);
    expect([...new Set(semOperacao)]).toEqual([]);
  });

  it('cobertura: todo código das memórias tem origem — nenhum RAZAO fora da lista e nenhum código novo caindo calado', () => {
    const codigos = new Set(todasAsMemorias().flat().map((l) => l.codigo));
    const razao = [...codigos].filter((c) => origemTipoDaLinha({ codigo: c, descricao: '', valorCents: '0', fonte: '' }) === 'RAZAO').sort();
    expect(razao).toEqual(['LAIR', 'LAIR_PERIODO_EM_CURSO', 'RECEITA_NAO_USO', 'RECEITA_REVENDA', 'RECEITA_SERVICO']);
  });
});

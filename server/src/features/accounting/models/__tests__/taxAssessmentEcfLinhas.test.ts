/**
 * Emenda C8 ao BRIEF X7-C (§1 C3 item 5; nota D-2026-11-02-DELEGACAO-DONO §9) — a tabela memória → linha da ECF.
 * O teste-guarda decisivo sobre o seed é `taxAssessmentMemoEcf.integration.test.ts`; aqui: (1) as linhas do Real
 * existem no catálogo da tabela dinâmica com o mesmo DT_INI/DT_FIM; (2) vigência por período; (3) os casos fora da
 * tabela; (4) um cenário que o seed não alcança — receita acima do limite da LC 224 e adicional do IRPJ > 0 — contra o
 * mesmo oráculo das fórmulas da tabela dinâmica.
 */
import { ECF_L12_CATALOG, type EcfAbaLinhas } from '../Lalur.model';
import { apurarPresumidoTrimestral, linha, somarDeducoes, type DeducaoInformada, type MemoriaLinha, type ModoApuracao, type PerfilApuracaoPresumido, type ResultadoApuracao } from '../taxAssessmentCalc';
import { linhaEcfDoPasso, linhaEcfDoResumo, linhasEcfDaTabela, type ApuracaoRef } from '../taxAssessmentEcfLinhas';
import { tabelaApuracaoSemente } from '@test/helpers/legalParams';
import { confrontarMemoriaComEcf, oraculoEcfPresumidoT01 } from '@test/helpers/ecfPresumidoOraculo';

const R = (reais: number): bigint => BigInt(Math.round(reais * 100));
const PERFIL: PerfilApuracaoPresumido = {
  ecfIndAliqCsll: '1', ecfIndRecReceita: '2', lc224AcrescimoSuspenso: false, lc224LiminarReferencia: null,
  inicioAtividadeEm: null, encerramentoAtividadeEm: null, prestadoraExclusivaServicos: false, declaraNaoProfissaoRegulamentada: false,
};
const ref = (over: Partial<ApuracaoRef> = {}): ApuracaoRef => ({ anoCalendario: 2026, periodo: 'T01', tributo: 'IRPJ', modo: 'PRESUMIDO', ...over });
const passo = (codigo: string, descricao = codigo) => linha(codigo, descricao, 0n, 'teste');

describe('C8 — tabela memória de cálculo → linha da ECF', () => {
  // Achado 3 do #1021 (F-C8-R1 a, dono, chat, 03/11: "Sim, opção (a)"): a dedução retida leva o retentor, e a linha da ECF
  // depende dele (tabela dinâmica L12, abas P300/P500/N620/N630A/N660/N670). IRRF sem retentor = linha genérica.
  it('dedução retida com retentor: cada (tipo, retentor) cai na linha da ECF do retentor, por modo', () => {
    const casos: [ModoApuracao, 'IRPJ' | 'CSLL', string, string | undefined, string][] = [
      ['PRESUMIDO', 'IRPJ', 'IRRF', undefined, 'P300:10'],
      ['PRESUMIDO', 'IRPJ', 'IRRF', 'ORGAO_FEDERAL', 'P300:12'],
      ['PRESUMIDO', 'IRPJ', 'IRRF', 'ENTIDADE_ADM_FEDERAL', 'P300:13'],
      ['PRESUMIDO', 'IRPJ', 'IRRF', 'PJ_PRIVADA', 'P300:10'],
      ['PRESUMIDO', 'IRPJ', 'IRRF', 'ORGAO_ESTADUAL_MUNICIPAL', 'P300:10'],
      ['PRESUMIDO', 'CSLL', 'CSLL_RETIDA', 'ORGAO_FEDERAL', 'P500:9'],
      ['PRESUMIDO', 'CSLL', 'CSLL_RETIDA', 'ENTIDADE_ADM_FEDERAL', 'P500:10'],
      ['PRESUMIDO', 'CSLL', 'CSLL_RETIDA', 'PJ_PRIVADA', 'P500:11'],
      ['PRESUMIDO', 'CSLL', 'CSLL_RETIDA', 'ORGAO_ESTADUAL_MUNICIPAL', 'P500:12'],
      ['REAL_TRIMESTRAL', 'IRPJ', 'IRRF', 'ORGAO_FEDERAL', 'N630:21'],
      ['AJUSTE_ANUAL', 'IRPJ', 'IRRF', 'ENTIDADE_ADM_FEDERAL', 'N630:22'],
      ['REAL_TRIMESTRAL', 'CSLL', 'CSLL_RETIDA', 'PJ_PRIVADA', 'N670:17'],
      ['AJUSTE_ANUAL', 'CSLL', 'CSLL_RETIDA', 'ORGAO_ESTADUAL_MUNICIPAL', 'N670:18'],
      ['ESTIMATIVA_RECEITA', 'IRPJ', 'IRRF', 'ORGAO_FEDERAL', 'N620:23'],
      ['BALANCETE_SUSPENSAO_REDUCAO', 'IRPJ', 'IRRF', 'ENTIDADE_ADM_FEDERAL', 'N620:24'],
      ['ESTIMATIVA_RECEITA', 'CSLL', 'CSLL_RETIDA', 'ORGAO_FEDERAL', 'N660:14'],
      ['BALANCETE_SUSPENSAO_REDUCAO', 'CSLL', 'CSLL_RETIDA', 'PJ_PRIVADA', 'N660:16'],
    ];
    for (const [modo, tributo, tipo, retentor, esperado] of casos) {
      const deducao = { tributo, tipo, valorCents: '100', documento: 'NF 7', ...(retentor ? { retentor } : {}) };
      const memoria: MemoriaLinha[] = [];
      somarDeducoes(tributo, [deducao as DeducaoInformada], memoria);
      const periodo = modo === 'PRESUMIDO' || modo === 'REAL_TRIMESTRAL' ? 'T01' : modo === 'AJUSTE_ANUAL' ? 'A00' : 'A01';
      const l = linhaEcfDoPasso(ref({ modo, tributo, periodo }), memoria[0], memoria);
      expect([modo, tipo, retentor ?? '—', l ? `${l.registro}:${l.linha}` : null]).toEqual([modo, tipo, retentor ?? '—', esperado]);
    }
  });

  it('as linhas do Real (N620/N630/N660/N670) existem na aba da tabela dinâmica, não são rótulo e têm o DT_INI/DT_FIM da aba', () => {
    const ABA: Record<string, EcfAbaLinhas> = { N620: 'N620', N630: 'N630A', N660: 'N660', N670: 'N670' };
    const reais = linhasEcfDaTabela().filter((l) => l.def.registro.startsWith('N'));
    expect(reais.length).toBeGreaterThan(20);
    for (const { modo, codigo, def } of reais) {
      const cat = ECF_L12_CATALOG.abas[ABA[def.registro]].find((r) => r.codigo === def.linha);
      expect({ modo, codigo, achou: Boolean(cat), tipo: cat?.tipo === 'R' ? 'R' : 'ok' }).toEqual({ modo, codigo, achou: true, tipo: 'ok' });
      expect([cat!.dtIni, cat!.dtFim]).toEqual([def.dtIni, def.dtFim]);
    }
  });

  it('vigência: LC 224 só a partir do DT_INI da aba — P200 desde 01/01/2026, P400 desde 01/04/2026', () => {
    const lim = passo('LC224_LIMITE_TRIMESTRE');
    expect(linhaEcfDoPasso(ref({ anoCalendario: 2025, periodo: 'T04' }), lim, [])).toBeNull();
    expect(linhaEcfDoPasso(ref(), lim, [])).toEqual({ registro: 'P200', linha: '25140' });
    expect(linhaEcfDoPasso(ref({ tributo: 'CSLL' }), lim, [])).toBeNull();
    expect(linhaEcfDoPasso(ref({ tributo: 'CSLL', periodo: 'T02' }), lim, [])).toEqual({ registro: 'P400', linha: '20140' });
    // linha de 2015 vale em qualquer ano apurável
    expect(linhaEcfDoPasso(ref({ anoCalendario: 2025 }), passo('A_PAGAR'), [])).toEqual({ registro: 'P300', linha: '15' });
  });

  it('casos especiais: dedução por tipo, 16% no acréscimo, estimativas pagas do ajuste; vazios onde a ECF não tem linha', () => {
    expect(linhaEcfDoPasso(ref(), passo('DEDUCAO_1', 'IRRF — NF 12'), [])).toEqual({ registro: 'P300', linha: '10' });
    expect(linhaEcfDoPasso(ref({ tributo: 'CSLL' }), passo('DEDUCAO_1', 'CSLL_RETIDA'), [])).toBeNull();
    expect(linhaEcfDoPasso(ref(), passo('DEDUCAO_2', 'OUTRA'), [])).toBeNull();
    // Hospitalar: a P200 8 é a comum; memória anterior ao #1024 (sem a comum) deixa a P200 8 vazia, nunca a 3.1 inteira.
    const hospNova = [passo('RECEITA_SERVICO'), passo('RECEITA_HOSPITALAR'), passo('RECEITA_SERVICO_COMUM')];
    const hospAntiga = [passo('RECEITA_SERVICO'), passo('RECEITA_HOSPITALAR')];
    expect(linhaEcfDoPasso(ref(), passo('RECEITA_SERVICO_COMUM'), hospNova)).toEqual({ registro: 'P200', linha: '8' });
    expect(linhaEcfDoPasso(ref({ tributo: 'CSLL', periodo: 'T02' }), passo('RECEITA_HOSPITALAR'), hospNova)).toEqual({ registro: 'P400', linha: '2' });
    for (const m of [hospNova, hospAntiga]) {
      expect(linhaEcfDoPasso(ref(), passo('RECEITA_SERVICO'), m)).toBeNull();
      expect(linhaEcfDoPasso(ref(), passo('RECEITA_HOSPITALAR'), m)).toEqual({ registro: 'P200', linha: '4' });
    }
    const com16 = [passo('PRESUNCAO_REDUZIDA_16')];
    expect(linhaEcfDoPasso(ref(), passo('LC224_ACRESCIMO_SERVICO'), com16)).toEqual({ registro: 'P200', linha: '25230' });
    expect(linhaEcfDoPasso(ref(), passo('LC224_ACRESCIMO_SERVICO'), [])).toEqual({ registro: 'P200', linha: '25240' });
    const a00 = ref({ periodo: 'A00', modo: 'AJUSTE_ANUAL' });
    expect(linhaEcfDoPasso(a00, passo('ESTIMATIVA_PAGA_A03'), [])).toEqual({ registro: 'N630', linha: '24' });
    expect(linhaEcfDoPasso({ ...a00, tributo: 'CSLL' }, passo('ESTIMATIVA_PAGA_A03'), [])).toEqual({ registro: 'N670', linha: '19' });
    for (const c of ['GUARDA_CIRCULARIDADE', 'LAIR', 'ADICOES', 'RECEITA_HOSPITALAR', 'SALDO_NEGATIVO', 'DIFERENCA_POSTERGADA_T01', 'DEVIDO']) {
      expect([c, linhaEcfDoPasso(ref({ modo: 'REAL_TRIMESTRAL' }), passo(c), [])]).toEqual([c, null]);
    }
    expect(linhaEcfDoPasso(ref({ tributo: 'PIS', periodo: 'A01' }), passo('BASE'), [])).toBeNull();
    expect(linhaEcfDoResumo(ref(), 'deducoes')).toBeNull();
    expect(linhaEcfDoResumo(ref({ tributo: 'CSLL' }), 'devido')).toEqual({ registro: 'P500', linha: '4' });
  });

  it('receita acima do limite da LC 224 (T01/2026, adicional > 0): a memória marcada bate com as fórmulas da tabela dinâmica', () => {
    const tabela = tabelaApuracaoSemente();
    const servico = R(1_500_000);
    const revenda = R(200_000);
    const apurar = (tributo: 'IRPJ' | 'CSLL'): ResultadoApuracao =>
      apurarPresumidoTrimestral({ tabela, ano: 2026, periodo: 'T01', tributo, receitaServicoCents: servico, receitaRevendaCents: revenda, perfil: PERFIL, anteriores: [], deducoes: [] });
    const marcadas: [string, bigint][] = [];
    const resumo: [string, string, bigint][] = [];
    for (const tributo of ['IRPJ', 'CSLL'] as const) {
      const r = apurar(tributo);
      const rf = ref({ tributo });
      for (const m of r.memoria) {
        const l = linhaEcfDoPasso(rf, m, r.memoria);
        if (l) marcadas.push([`${l.registro}:${l.linha}`, BigInt(m.valorCents)]);
      }
      const colunas = { base: r.baseCents, devido: r.devidoCents, deducoes: r.deducoesCents, aPagar: r.aPagarCents, saldoNegativo: r.saldoNegativoCents };
      for (const [codigo, v] of Object.entries(colunas)) {
        const l = linhaEcfDoResumo(rf, codigo);
        if (l) resumo.push([codigo, `${l.registro}:${l.linha}`, v]);
      }
    }
    const e = new Map([['P200:8', servico], ['P200:4', revenda], ['P400:4', servico], ['P400:2', revenda]]);
    const { soma, divergencias } = confrontarMemoriaComEcf(marcadas, resumo, e, oraculoEcfPresumidoT01(e, true));
    expect(divergencias).toEqual([]);
    expect(soma.get('P300:4')).toBeGreaterThan(0n); // o adicional que o seed não alcança
    expect(soma.get('P200:25200')).toBe(R(450_000)); // excedente do trimestre
    expect(soma.get('P200:25240')! + soma.get('P200:25220')!).toBeGreaterThan(0n); // acréscimos da LC 224
  });
});

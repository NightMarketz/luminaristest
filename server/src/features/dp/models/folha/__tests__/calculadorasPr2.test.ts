/**
 * BE-INCR-DP-F2 PR-2 (item 24, decisão do dono, chat, 2026-11-07: "Escrever agora") — as calculadoras que o BRIEF punha
 * no PR-4: faltas e DSR perdido (36), afastamento pago pela empresa (32), adiantamento e desconto (42–43), salário-família
 * (15 / F-DPF-7), horista (37) e valor informado (38). Cada uma com a fotografia de regras real e uma alterada.
 */
import type { Competencia } from '../../competencia';
import type { EscalaJornada } from '../../escala';
import { adiantamento, descontoAdiantamento } from '../adiantamento';
import { afastamentoEmpresa, trechoPagoPelaEmpresa } from '../afastamento';
import { provaIncoerente } from '../calcNode';
import { descontoFaltas, diasRepousoPerdidos, dsrPerdido } from '../faltas';
import { fracao } from '../fracao';
import { salarioHorista } from '../salario';
import { salarioFamilia } from '../salarioFamilia';
import { valorInformado } from '../variaveis';
import { alterada, regras } from './fotografias';

const r = regras();
const MARCO = '2026-03' as Competencia; // começa num domingo, 31 dias, sem feriado nacional
const ABRIL = '2026-04' as Competencia;
const SEIS_POR_UM: EscalaJornada = { diasTrabalho: ['SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SAB'], minutosPorDia: 440 };

describe('DP-F2 item 36 — faltas', () => {
  it('salário-hora × minutos; a linha ARREDONDAMENTO muda o centavo', () => {
    expect(descontoFaltas(fracao(1000n), 90, r.arredondamento).valor).toBe(1500n);
    const sh = fracao(1000n, 3n); // R$ 3,33… por hora: 1 min = 5,55… centavos
    expect(descontoFaltas(sh, 1, r.arredondamento).valor).toBe(6n);
    expect(descontoFaltas(sh, 1, regras(alterada({ ARREDONDAMENTO: 'TRUNCA_CENTAVO' })).arredondamento).valor).toBe(5n);
  });
});

describe('DP-F2 item 36 — DSR perdido (Lei 605 arts. 6º e 8º)', () => {
  it('a semana da falta perde o repouso dela; SEMANA_DSR_INICIO muda qual semana é', () => {
    expect(diasRepousoPerdidos(['2026-03-04'], MARCO, SEIS_POR_UM, [], r.semanaDsrInicio).dias).toEqual(['2026-03-08']);
    const domingo = regras(alterada({ SEMANA_DSR_INICIO: 'DOM' })).semanaDsrInicio;
    expect(diasRepousoPerdidos(['2026-03-04'], MARCO, SEIS_POR_UM, [], domingo).dias).toEqual(['2026-03-01']);
  });

  it('o feriado da semana também se perde; duas faltas na mesma semana perdem uma vez; repouso do mês seguinte fica de fora', () => {
    expect(diasRepousoPerdidos(['2026-03-04'], MARCO, SEIS_POR_UM, ['2026-03-05'], r.semanaDsrInicio).dias).toEqual(['2026-03-05', '2026-03-08']);
    expect(diasRepousoPerdidos(['2026-03-03', '2026-03-06'], MARCO, SEIS_POR_UM, [], r.semanaDsrInicio).dias).toEqual(['2026-03-08']);
    expect(diasRepousoPerdidos(['2026-03-30'], MARCO, SEIS_POR_UM, [], r.semanaDsrInicio).dias).toEqual([]);
    expect(diasRepousoPerdidos([], MARCO, SEIS_POR_UM, [], r.semanaDsrInicio).dias).toEqual([]);
  });

  it('valor = valor do dia × dias perdidos, com a prova coerente', () => {
    const perdidos = diasRepousoPerdidos(['2026-03-04', '2026-03-11'], MARCO, SEIS_POR_UM, [], r.semanaDsrInicio);
    const c = dsrPerdido(fracao(300000n, 30n), perdidos, r.arredondamento);
    expect(c.valor).toBe(20000n);
    expect(provaIncoerente(c.prova)).toEqual([]);
    expect(c.prova.filhos[0].filhos[0].fonte).toMatch(/^LP:/);
  });
});

describe('DP-F2 item 32 — afastamento pago pela empresa (Lei 8.213 art. 60 § 3º)', () => {
  const regras15 = r;
  const regras5 = regras(alterada({ AFASTAMENTO_DIAS_EMPRESA: 5 }));

  it('começa no mês: os dias até o fim do mês, na base do mensalista; a linha AFASTAMENTO_DIAS_EMPRESA muda o trecho', () => {
    expect(afastamentoEmpresa(300000n, MARCO, { inicio: '2026-03-20', fim: null }, regras15)?.valor).toBe(110000n);
    expect(trechoPagoPelaEmpresa(MARCO, { inicio: '2026-03-20', fim: null }, regras5.afastamentoDiasEmpresa)).toEqual({ inicio: '2026-03-20', fim: '2026-03-24' });
    expect(afastamentoEmpresa(300000n, MARCO, { inicio: '2026-03-20', fim: null }, regras5)?.valor).toBe(50000n);
  });

  it('atravessa a competência; o fim do afastamento corta o trecho; fora do mês não há linha', () => {
    expect(trechoPagoPelaEmpresa(ABRIL, { inicio: '2026-03-20', fim: null }, regras15.afastamentoDiasEmpresa)).toEqual({ inicio: '2026-04-01', fim: '2026-04-03' });
    expect(afastamentoEmpresa(300000n, ABRIL, { inicio: '2026-03-20', fim: null }, regras15)?.valor).toBe(30000n);
    expect(afastamentoEmpresa(300000n, MARCO, { inicio: '2026-03-10', fim: '2026-03-12' }, regras15)?.valor).toBe(30000n);
    expect(afastamentoEmpresa(300000n, MARCO, { inicio: '2026-02-01', fim: null }, regras15)).toBeNull();
    const c = afastamentoEmpresa(300000n, MARCO, { inicio: '2026-03-20', fim: null }, regras15)!;
    expect(provaIncoerente(c.prova)).toEqual([]);
  });
});

describe('DP-F2 itens 42–43 — adiantamento e desconto', () => {
  it('percentual da instância × salário contratual; o percentual muda o valor', () => {
    expect(adiantamento(300000n, { bp: 4000, fonte: 'DpParametrosFolha:x' }, r.arredondamento).valor).toBe(120000n);
    expect(adiantamento(300000n, { bp: 3333, fonte: 'DpParametrosFolha:x' }, r.arredondamento).valor).toBe(99990n);
    expect(adiantamento(300000n, { bp: 4000, fonte: 'DpParametrosFolha:x' }, r.arredondamento).prova.fonte).toBe('DpParametrosFolha:x');
  });

  it('desconta a execução mais recente da competência; sem execução, nada', () => {
    expect(descontoAdiantamento([])).toBeNull();
    const d = descontoAdiantamento([
      { folhaId: 'b', calculadaEm: '2026-03-15T10:00:00.000Z', valorCents: 120000n },
      { folhaId: 'a', calculadaEm: '2026-03-16T09:00:00.000Z', valorCents: 90000n },
      { folhaId: 'c', calculadaEm: '2026-03-14T09:00:00.000Z', valorCents: 1n },
    ]);
    expect(d?.valor).toBe(90000n);
  });
});

describe('DP-F2 item 15 / F-DPF-7 — salário-família (só a forma)', () => {
  const v = { id: 'v1', matricula: 'M-001' };
  const tabela = { cotaCents: 6500n, limiteRemuneracaoCents: 190000n, fonte: 'LP:salario-familia-teste' };

  it('sem a tabela: aviso SALARIO_FAMILIA_SEM_PARAMETRO não bloqueante, nunca um valor padrão', () => {
    const s = salarioFamilia(v, 2, 180000n, null);
    expect(s?.tipo).toBe('SEM_PARAMETRO');
    expect(s?.tipo === 'SEM_PARAMETRO' && [s.pendencia.codigo, s.pendencia.bloqueante, s.pendencia.dado]).toEqual(['SALARIO_FAMILIA_SEM_PARAMETRO', false, 'M-001']);
  });

  it('com a tabela: cota × dependentes até o limite; acima do limite, zero; sem dependente, sem linha', () => {
    const dentro = salarioFamilia(v, 2, 180000n, tabela);
    expect(dentro?.tipo === 'CALCULADO' && dentro.calculo.valor).toBe(13000n);
    const outraCota = salarioFamilia(v, 2, 180000n, { ...tabela, cotaCents: 7000n });
    expect(outraCota?.tipo === 'CALCULADO' && outraCota.calculo.valor).toBe(14000n);
    const acima = salarioFamilia(v, 2, 190001n, tabela);
    expect(acima?.tipo === 'CALCULADO' && acima.calculo.valor).toBe(0n);
    expect(salarioFamilia(v, 0, 180000n, null)).toBeNull();
  });
});

describe('DP-F2 itens 37–38 — horista e valor informado', () => {
  it('horas normais × salário-hora (G3: 190h40 a R$ 15,00 = R$ 2.860,00)', () => {
    expect(salarioHorista(fracao(1500n), 26 * 440, r.arredondamento).valor).toBe(286000n);
    const sh = fracao(1000n, 3n);
    expect(salarioHorista(sh, 1, r.arredondamento).valor).toBe(6n);
    expect(salarioHorista(sh, 1, regras(alterada({ ARREDONDAMENTO: 'TRUNCA_CENTAVO' })).arredondamento).valor).toBe(5n);
  });

  it('valor informado é o valor do lançamento', () => {
    expect(valorInformado('COMISSAO', 12345n, 'DpLancamento:l1')).toEqual({ valor: 12345n, prova: { rotulo: 'COMISSAO: valor informado', valorCents: 12345n, fonte: 'DpLancamento:l1', filhos: [] } });
  });
});

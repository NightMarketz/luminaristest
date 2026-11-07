/**
 * BE-INCR-DP-F2 PR-0 itens 3 e 4 — salário-hora pela forma da linha `SALARIO_HORA_DIVISOR` (F-DPF-1) e o proporcional do
 * mensalista no mês comercial (F-DPF-4 a). Cada caso roda com a fotografia real e com uma alterada.
 */
import { ParametroLegalAusenteError } from '../../../../legalParameters/models/legalParameter';
import type { Competencia } from '../../competencia';
import type { EscalaJornada } from '../../escala';
import { regrasFolha } from '../../regrasFolha';
import { provaIncoerente } from '../calcNode';
import { arredondarCentavos, fracao } from '../fracao';
import { diasDevidosMensalista, divisorHoras, proporcionalMensalista, salarioHora } from '../salario';
import { alterada, REAL, regras } from './fotografias';

const SEIS_POR_UM: EscalaJornada = { diasTrabalho: ['SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SAB'], minutosPorDia: 440 };
const CINCO_POR_DOIS_40: EscalaJornada = { diasTrabalho: ['SEG', 'TER', 'QUA', 'QUI', 'SEX'], minutosPorDia: 480 };
const r = regras();
const comDivisor = (v: 'SEMANA_SEIS_DIAS' | 'DIAS_DE_TRABALHO_DA_ESCALA') => ({ ...r.salarioHoraDivisor, valor: v });

describe('DP-F2 item 3 — salarioHora', () => {
  it('44 h em 6 dias dá 220 h nas duas formas; 40 h em 5 dias dá 200 numa e 240 na outra', () => {
    expect(divisorHoras(SEIS_POR_UM, comDivisor('SEMANA_SEIS_DIAS'), r.mensalistaBaseDias)).toEqual(fracao(220n));
    expect(divisorHoras(SEIS_POR_UM, comDivisor('DIAS_DE_TRABALHO_DA_ESCALA'), r.mensalistaBaseDias)).toEqual(fracao(220n));
    expect(divisorHoras(CINCO_POR_DOIS_40, comDivisor('SEMANA_SEIS_DIAS'), r.mensalistaBaseDias)).toEqual(fracao(200n));
    expect(divisorHoras(CINCO_POR_DOIS_40, comDivisor('DIAS_DE_TRABALHO_DA_ESCALA'), r.mensalistaBaseDias)).toEqual(fracao(240n));
  });

  it('a linha vigente decide: 5×2 de 40 h dá 200 em 03/2026 e 240 depois de 16/12/2026 (fotografia real, sem código)', () => {
    const marco = regras(REAL, '2026-03-15');
    const dezembro = regras(REAL, '2026-12-20');
    const sh = (rg: typeof marco) => salarioHora(480000n, CINCO_POR_DOIS_40, rg.salarioHoraDivisor, rg.mensalistaBaseDias, rg.arredondamento);
    expect(sh(marco).valor).toEqual(fracao(2400n));
    expect(sh(dezembro).valor).toEqual(fracao(2000n));
    expect(sh(marco).prova.filhos[0].fonte).toBe('LP:dp-regra-divisor-1943');
    expect(sh(dezembro).prova.filhos[0].fonte).toBe('LP:dp-regra-divisor-2026');
  });

  it('o salário-hora não arredonda: a fração exata segue, a prova só exibe ao centavo', () => {
    const c = salarioHora(100000n, SEIS_POR_UM, r.salarioHoraDivisor, r.mensalistaBaseDias, r.arredondamento);
    expect(c.valor).toEqual(fracao(100000n, 220n));
    expect(c.prova.valorCents).toBe(455n);
    expect(provaIncoerente(c.prova)).toEqual([]);
  });

  it('base de dias alterada na linha muda o salário-hora', () => {
    const alt = regras(alterada({ MENSALISTA_BASE_DIAS: 31 }));
    const a = salarioHora(220000n, SEIS_POR_UM, r.salarioHoraDivisor, r.mensalistaBaseDias, r.arredondamento).valor;
    const b = salarioHora(220000n, SEIS_POR_UM, alt.salarioHoraDivisor, alt.mensalistaBaseDias, alt.arredondamento).valor;
    expect(a).toEqual(fracao(1000n));
    expect(b).not.toEqual(a);
  });

  it('sem linha SALARIO_HORA_DIVISOR vigente na competência ⇒ PARAMETRO_LEGAL_AUSENTE', () => {
    const sem = REAL.filter((l) => l.chave !== 'SALARIO_HORA_DIVISOR' || l.vigenteAte !== null);
    expect(() => regrasFolha(sem, '2026-12-20')).toThrow(ParametroLegalAusenteError);
    expect(regrasFolha(sem, '2026-03-15').salarioHoraDivisor.valor).toBe('SEMANA_SEIS_DIAS');
  });
});

describe('DP-F2 item 4 — mensalista no mês comercial (F-DPF-4 a)', () => {
  const base = r.mensalistaBaseDias;
  it.each([
    ['mês cheio de 31 dias', '2026-03', '2020-01-01', null, 30],
    ['fevereiro cheio', '2026-02', '2020-01-01', null, 30],
    ['admitido em 15/03 recebe 30 − 15 + 1', '2026-03', '2026-03-15', null, 16],
    ['admitido em 31/03 recebe 1 dia', '2026-03', '2026-03-31', null, 1],
    ['admitido em 28/02/2026 (último dia) recebe 1 dia', '2026-02', '2026-02-28', null, 1],
    ['desligado em 10/03 recebe 10', '2026-03', '2020-01-01', '2026-03-10', 10],
    ['desligado em 28/02/2026 (último dia) recebe o mês cheio', '2026-02', '2020-01-01', '2026-02-28', 30],
    ['admitido em 10/03 e desligado em 20/03', '2026-03', '2026-03-10', '2026-03-20', 11],
    ['admitido depois do mês', '2026-03', '2026-04-01', null, 0],
    ['desligado antes do mês', '2026-03', '2020-01-01', '2026-02-27', 0],
  ] as const)('%s', (_n, comp, inicio, fim, esperado) => {
    expect(diasDevidosMensalista(comp as Competencia, inicio, fim, base)).toBe(esperado);
  });

  it('proporcional = salário × dias ÷ base, arredondado só no fim; base alterada muda o valor', () => {
    const c = proporcionalMensalista(300000n, base, 16, r.arredondamento);
    expect(c.valor).toBe(160000n);
    expect(c.prova.fonte).toBe('Lei 605/1949 art. 7º § 2º');
    const alt = regras(alterada({ MENSALISTA_BASE_DIAS: 31, ARREDONDAMENTO: 'TRUNCA_CENTAVO' }));
    expect(proporcionalMensalista(300000n, alt.mensalistaBaseDias, 16, alt.arredondamento).valor).toBe(arredondarCentavos(fracao(300000n * 16n, 31n), 'TRUNCA_CENTAVO'));
    expect(proporcionalMensalista(100000n, base, 1, r.arredondamento).valor).toBe(3333n);
  });
});

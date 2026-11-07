/**
 * BE-INCR-DP-F2 PR-0 itens 9–12 — hora extra, adicional noturno, DSR sobre variáveis e complemento até o mínimo, cada um
 * com a fotografia de regras real e uma alterada.
 */
import type { Competencia } from '../../competencia';
import { diasDoMes, type EscalaJornada } from '../../escala';
import { provaIncoerente } from '../calcNode';
import { fracao } from '../fracao';
import { adicionalAplicavel, adicionalNoturno, complementoMinimo, dsrSobreVariaveis, horaExtra, horasNoturnas, pisoProporcional } from '../variaveis';
import { alterada, params, regras } from './fotografias';

const r = regras();
const alt = regras(alterada({ HE_ADICIONAL_BP: 6000, HE_REPOUSO_ADICIONAL_BP: 12000, NOTURNO_ADICIONAL_BP: 2500, NOTURNO_HORA_SEGUNDOS: 3600, JORNADA_LIMITE_SEMANAL_MIN: 2400 }));
const SH = fracao(1000n); // R$ 10,00 por hora

describe('DP-F2 item 9 — hora extra', () => {
  it('60 min a R$ 10,00 com 50% = R$ 15,00; com a linha em 60% = R$ 16,00', () => {
    expect(horaExtra(SH, 60, r.heAdicionalBp, r.arredondamento).valor).toBe(1500n);
    expect(horaExtra(SH, 60, alt.heAdicionalBp, alt.arredondamento).valor).toBe(1600n);
    expect(horaExtra(SH, 60, r.heAdicionalBp, r.arredondamento).prova.filhos[0].fonte).toBe('LP:dp-regra-he-adicional-1988');
  });

  it('repouso trabalhado sem folga: 100% (Lei 605 art. 9º); arredonda uma vez no valor', () => {
    expect(horaExtra(SH, 30, r.heRepousoAdicionalBp, r.arredondamento).valor).toBe(1000n);
    expect(horaExtra(fracao(100000n, 220n), 7, r.heAdicionalBp, r.arredondamento).valor).toBe(80n); // 454,5454… × 7/60 × 1,5 = 79,54
  });

  it('o adicional da CCT vale só se maior que o da lei', () => {
    const cct = { valor: 7000, linhaId: 'cct', fonte: 'CCT' };
    expect(adicionalAplicavel(r.heAdicionalBp, cct)).toBe(cct);
    expect(adicionalAplicavel(r.heAdicionalBp, { ...cct, valor: 4000 })).toBe(r.heAdicionalBp);
    expect(adicionalAplicavel(r.heAdicionalBp, null)).toBe(r.heAdicionalBp);
  });
});

describe('DP-F2 item 10 — adicional noturno', () => {
  it('420 min de relógio = 8 horas noturnas de 52\'30"; × R$ 10,00 × 20% = R$ 16,00', () => {
    expect(horasNoturnas(420, r.noturno.horaSegundos)).toEqual(fracao(8n));
    expect(adicionalNoturno(SH, 420, r.noturno.adicionalBp, r.noturno.horaSegundos, r.arredondamento).valor).toBe(1600n);
  });

  it('com a hora de 3600 s e 25% na fotografia alterada: 7 h × R$ 10,00 × 25% = R$ 17,50', () => {
    expect(adicionalNoturno(SH, 420, alt.noturno.adicionalBp, alt.noturno.horaSegundos, alt.arredondamento).valor).toBe(1750n);
  });
});

describe('DP-F2 item 11 — DSR sobre variáveis pela escala (F-DPF-2 a)', () => {
  const seisPorUm: EscalaJornada = { diasTrabalho: ['SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SAB'], minutosPorDia: 440 };
  const cincoPorDois: EscalaJornada = { diasTrabalho: ['SEG', 'TER', 'QUA', 'QUI', 'SEX'], minutosPorDia: 528 };

  it('R$ 1.000,00 de HE em 03/2026: 6×1 (26/5) dá 192,31; 5×2 (22/9) dá 409,09 — sem nenhuma linha de código a mais', () => {
    const a = dsrSobreVariaveis(100000n, diasDoMes('2026-03' as Competencia, seisPorUm, []), r.arredondamento);
    const b = dsrSobreVariaveis(100000n, diasDoMes('2026-03' as Competencia, cincoPorDois, []), r.arredondamento);
    expect([a.valor, b.valor]).toEqual([19231n, 40909n]);
    expect(provaIncoerente(a.prova)).toEqual([]);
  });

  it('o modo de arredondamento da linha muda o centavo', () => {
    const trunca = regras(alterada({ ARREDONDAMENTO: 'TRUNCA_CENTAVO' }));
    expect(dsrSobreVariaveis(100000n, { trabalho: 26, repouso: 5 }, trunca.arredondamento).valor).toBe(19230n);
  });

  it('mês sem dia de trabalho é erro de programação', () => {
    expect(() => dsrSobreVariaveis(1n, { trabalho: 0, repouso: 31 }, r.arredondamento)).toThrow();
  });
});

describe('DP-F2 item 12 — complemento até o mínimo', () => {
  const p = params();
  const minimo = { valorCents: p.salarioMinimoCents, rotulo: 'salário mínimo nacional', fonte: 'CF art. 7º IV' };

  it('max(0, mínimo − remuneração)', () => {
    expect(complementoMinimo(p.salarioMinimoCents - 12345n, minimo).valor).toBe(12345n);
    expect(complementoMinimo(p.salarioMinimoCents + 1n, minimo).valor).toBe(0n);
    expect(complementoMinimo(0n, minimo).prova.filhos[0].valorCents).toBe(p.salarioMinimoCents);
  });

  it('piso proporcional à jornada (F-DPF-6 a): o divisor é o limite semanal da linha vigente', () => {
    expect(pisoProporcional(264000n, 1320, r.jornadaLimiteSemanalMin, r.arredondamento).valor).toBe(132000n);
    expect(pisoProporcional(264000n, 1320, alt.jornadaLimiteSemanalMin, alt.arredondamento).valor).toBe(145200n);
  });
});

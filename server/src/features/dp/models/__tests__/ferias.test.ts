/**
 * BE-INCR-DP-F0-F1 item 57 (PR-6) — `periodosDeFerias`: aquisitivo de 12 meses [CLT art. 130 caput], concessivo nos 12
 * seguintes [art. 134 caput], véspera do aniversário do contrato; bordas de 29/02 e 31/01; propriedades por fast-check.
 */
import fc from 'fast-check';
import { dateOnlyFromDayNumber, dayNumberFromDateOnly } from '../../../accounting/models/dates';
import { LEGAL_PARAMS_SEED_FILE_DP_REGRAS, legalParamsSeedRows } from '@test/helpers/legalParams';
import type { LinhaLegal } from '../../../legalParameters/models/legalParameter';
import { aniversario, periodosDeFerias as periodosComMeses } from '../ferias';
import { mesesFerias } from '../regrasFolha';

// BE-INCR-DP-F2 item 72: os meses vêm da FOLHA_REGRA da carga; as asserções do F1 seguem as mesmas.
const FOTO = legalParamsSeedRows(LEGAL_PARAMS_SEED_FILE_DP_REGRAS) as LinhaLegal[];
const periodosDeFerias = (inicio: string, ref: string, fim: string | null = null) => periodosComMeses(inicio, ref, fim, mesesFerias(FOTO, inicio));

const diaSeguinte = (d: string) => dateOnlyFromDayNumber(dayNumberFromDateOnly(d) + 1);
const dias = (de: string, ate: string) => dayNumberFromDateOnly(ate) - dayNumberFromDateOnly(de) + 1;
const data = fc
  .integer({ min: dayNumberFromDateOnly('2000-01-01'), max: dayNumberFromDateOnly('2040-12-31') })
  .map(dateOnlyFromDayNumber);

describe('periodosDeFerias (item 57)', () => {
  it('admissão comum: aquisitivo até a véspera do aniversário, concessivo nos 12 meses seguintes', () => {
    expect(periodosDeFerias('2026-03-10', '2027-03-10')).toEqual([
      { aquisitivoInicio: '2026-03-10', aquisitivoFim: '2027-03-09', concessivoFim: '2028-03-09' },
      { aquisitivoInicio: '2027-03-10', aquisitivoFim: '2028-03-09', concessivoFim: '2029-03-09' },
    ]);
    // Antes do 1º aniversário: só o aquisitivo em curso; antes da admissão: nenhum.
    expect(periodosDeFerias('2026-03-10', '2027-03-09')).toHaveLength(1);
    expect(periodosDeFerias('2026-03-10', '2026-03-09')).toEqual([]);
  });

  it('borda 31/01: o aniversário é sempre 31/01 (sem cair em fim de fevereiro)', () => {
    expect(periodosDeFerias('2026-01-31', '2028-02-01').map((p) => [p.aquisitivoInicio, p.aquisitivoFim, p.concessivoFim])).toEqual([
      ['2026-01-31', '2027-01-30', '2028-01-30'],
      ['2027-01-31', '2028-01-30', '2029-01-30'],
      ['2028-01-31', '2029-01-30', '2030-01-30'],
    ]);
  });

  it('borda 29/02: em ano não bissexto o aniversário cai em 01/03 e volta a 29/02 no bissexto', () => {
    expect(aniversario('2024-02-29', 1)).toBe('2025-03-01');
    expect(aniversario('2024-02-29', 4)).toBe('2028-02-29');
    expect(periodosDeFerias('2024-02-29', '2028-02-29').map((p) => [p.aquisitivoInicio, p.aquisitivoFim])).toEqual([
      ['2024-02-29', '2025-02-28'],
      ['2025-03-01', '2026-02-28'],
      ['2026-03-01', '2027-02-28'],
      ['2027-03-01', '2028-02-28'],
      ['2028-02-29', '2029-02-28'],
    ]);
    expect(periodosDeFerias('2024-02-29', '2025-03-01')[0].concessivoFim).toBe('2026-02-28');
  });

  it('contrato com fim: não abre aquisitivo depois do término', () => {
    expect(periodosDeFerias('2026-03-10', '2030-01-01', '2027-06-30').map((p) => p.aquisitivoInicio)).toEqual(['2026-03-10', '2027-03-10']);
    expect(periodosDeFerias('2026-03-10', '2026-12-31', '2028-06-30').map((p) => p.aquisitivoInicio)).toEqual(['2026-03-10']);
  });

  it('fast-check: períodos contíguos, sem sobreposição, de 12 meses, concessivo nos 12 seguintes; o 1º começa na admissão', () => {
    fc.assert(
      fc.property(data, fc.integer({ min: 0, max: 3650 }), (inicio, n) => {
        const ref = dateOnlyFromDayNumber(dayNumberFromDateOnly(inicio) + n);
        const ps = periodosDeFerias(inicio, ref);
        expect(ps[0].aquisitivoInicio).toBe(inicio);
        expect(ps[ps.length - 1].aquisitivoInicio <= ref).toBe(true);
        expect(ps[ps.length - 1].aquisitivoFim >= ref).toBe(true); // nenhum aquisitivo que começa até ref ficou de fora
        ps.forEach((p, k) => {
          expect([365, 366]).toContain(dias(p.aquisitivoInicio, p.aquisitivoFim));
          expect([365, 366]).toContain(dias(diaSeguinte(p.aquisitivoFim), p.concessivoFim));
          expect(diaSeguinte(p.aquisitivoFim)).toBe(aniversario(inicio, k + 1));
          if (k > 0) expect(ps[k - 1].aquisitivoFim < p.aquisitivoInicio && diaSeguinte(ps[k - 1].aquisitivoFim) === p.aquisitivoInicio).toBe(true);
        });
      }),
    );
  });

  it('BE-INCR-DP-F2 item 72 — trocar a linha troca o período, sem código: aquisitivo de 6 e concessivo de 3 meses', () => {
    const troca = FOTO.map((l) =>
      l.chave === 'FERIAS_AQUISITIVO_MESES' ? { ...l, valorInt: 6 } : l.chave === 'FERIAS_CONCESSIVO_MESES' ? { ...l, valorInt: 3 } : l,
    );
    expect(periodosComMeses('2026-03-10', '2026-09-10', null, mesesFerias(troca, '2026-03-10'))).toEqual([
      { aquisitivoInicio: '2026-03-10', aquisitivoFim: '2026-09-09', concessivoFim: '2026-12-09' },
      { aquisitivoInicio: '2026-09-10', aquisitivoFim: '2027-03-09', concessivoFim: '2027-06-09' },
    ]);
    // Sem linha vigente na admissão ⇒ PARAMETRO_LEGAL_AUSENTE, nunca um 12 do código.
    expect(() => mesesFerias(FOTO.filter((l) => l.chave !== 'FERIAS_AQUISITIVO_MESES'), '2026-03-10')).toThrow(/FOLHA_REGRA\/FERIAS_AQUISITIVO_MESES/);
  });
});

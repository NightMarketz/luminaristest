/**
 * BE-INCR-DP-F2 PR-0R itens 68, 69 e 71 — escala como dado da jornada: minutos semanais derivados e conferidos, 12×36
 * recusado, dias de trabalho e de repouso do mês pela escala e pelos feriados, aviso contra a lei vigente.
 */
import fc from 'fast-check';
import { LEGAL_PARAMS_SEED_FILE_DP_REGRAS, LEGAL_PARAMS_SEED_FILES, legalParamsSeedRows } from '@test/helpers/legalParams';
import type { AppError } from '../../../../lib/errors';
import type { LinhaLegal } from '../../../legalParameters/models/legalParameter';
import type { Competencia } from '../competencia';
import {
  assertEscalaRegular,
  avisosDaJornada,
  DIAS_SEMANA,
  diaDaSemana,
  diasDoMes,
  escalaDaJornada,
  feriadosDoMes,
  lerDias,
  serializarDias,
  type DiaSemana,
  type EscalaJornada,
} from '../escala';
import { regraInt } from '../regrasFolha';

const SEIS: EscalaJornada = { diasTrabalho: ['SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SAB'], minutosPorDia: 440 };
const CINCO: EscalaJornada = { diasTrabalho: ['SEG', 'TER', 'QUA', 'QUI', 'SEX'], minutosPorDia: 480 };
const reason = (fn: () => unknown) => {
  try {
    fn();
    return null;
  } catch (e) {
    return (e as AppError).errorCode;
  }
};

describe('item 68 — escala da jornada', () => {
  it('minutosSemanais derivado = minutosPorDia × dias; informado diferente ⇒ DP_ESCALA_IRREGULAR; 12×36 recusado', () => {
    expect(assertEscalaRegular(SEIS, '9', undefined)).toBe(2640);
    expect(assertEscalaRegular(SEIS, '9', 2640)).toBe(2640);
    expect(assertEscalaRegular(CINCO, '4', 2400)).toBe(2400);
    expect(reason(() => assertEscalaRegular(SEIS, '9', 2600))).toBe('DP_ESCALA_IRREGULAR');
    expect(reason(() => assertEscalaRegular({ diasTrabalho: ['SEG', 'QUA', 'SEX'], minutosPorDia: 720 }, '2', undefined))).toBe('DP_ESCALA_IRREGULAR');
  });

  it('máscara canônica SEG..DOM; jornada migrada sem minutosPorDia ⇒ sem escala (o cálculo trava, item 68)', () => {
    expect(serializarDias(['SAB', 'SEG', 'QUA'])).toBe('SEG,QUA,SAB');
    expect(lerDias('SEG,TER,QUA,QUI,SEX,SAB')).toEqual(['SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SAB']);
    expect(() => lerDias('SEG,XYZ')).toThrow(/fora do domínio/);
    expect(escalaDaJornada({ diasTrabalho: 'SEG,TER,QUA,QUI,SEX,SAB', minutosPorDia: null })).toBeNull();
    expect(escalaDaJornada({ diasTrabalho: 'SEG,TER', minutosPorDia: 480 })).toEqual({ diasTrabalho: ['SEG', 'TER'], minutosPorDia: 480 });
  });
});

describe('item 69 — diasDoMes(competencia, escala, feriados)', () => {
  it('dia da semana pelo calendário (2026-03-01 é domingo)', () => {
    expect(['2026-03-01', '2026-03-02', '2026-03-07'].map(diaDaSemana)).toEqual(['DOM', 'SEG', 'SAB']);
  });

  it('março de 2026: 6×1 dá 26 de trabalho e 5 de repouso; 5×2 tira um dia por semana (22 e 9)', () => {
    const c = '2026-03' as Competencia;
    expect([diasDoMes(c, SEIS, []).trabalho, diasDoMes(c, SEIS, []).repouso]).toEqual([26, 5]);
    expect([diasDoMes(c, CINCO, []).trabalho, diasDoMes(c, CINCO, []).repouso]).toEqual([22, 9]);
  });

  it('feriado em dia de trabalho vira repouso; feriado no domingo não muda a conta', () => {
    const c = '2026-04' as Competencia; // 21/04 (terça) e 05/04 (domingo de Páscoa, não é feriado nacional)
    const feriados = feriadosDoMes(c, legalParamsSeedRows(LEGAL_PARAMS_SEED_FILES) as LinhaLegal[], null);
    expect(feriados).toContain('2026-04-21');
    const sem = diasDoMes(c, SEIS, []);
    const com = diasDoMes(c, SEIS, feriados);
    expect(com.trabalho).toBe(sem.trabalho - feriados.filter((d) => diaDaSemana(d) !== 'DOM').length);
    expect(com.porDia.find((d) => d.data === '2026-04-21')?.tipo).toBe('REPOUSO');
  });

  it('fast-check: trabalho + repouso = dias do mês; tirar um dia da escala nunca aumenta os dias de trabalho', () => {
    const competencia = fc.tuple(fc.integer({ min: 2000, max: 2040 }), fc.integer({ min: 1, max: 12 })).map(
      ([a, m]) => `${a}-${String(m).padStart(2, '0')}` as Competencia,
    );
    const dias = fc.subarray([...DIAS_SEMANA] as DiaSemana[], { minLength: 2 });
    fc.assert(
      fc.property(competencia, dias, (c, d) => {
        const r = diasDoMes(c, { diasTrabalho: d, minutosPorDia: 60 }, []);
        expect(r.trabalho + r.repouso).toBe(r.porDia.length);
        expect(diasDoMes(c, { diasTrabalho: d.slice(1), minutosPorDia: 60 }, []).trabalho).toBeLessThanOrEqual(r.trabalho);
      }),
    );
  });
});

describe('item 71 — aviso da jornada contra a lei vigente (não bloqueia)', () => {
  const FOTO = legalParamsSeedRows(LEGAL_PARAMS_SEED_FILE_DP_REGRAS) as LinhaLegal[];
  const avisos = (e: EscalaJornada, d: string) =>
    avisosDaJornada(e, regraInt(FOTO, 'JORNADA_LIMITE_SEMANAL_MIN', d), regraInt(FOTO, 'REPOUSO_DIAS_MIN', d), d).map((a) => a.codigo);

  it('44 h em 6×1 não avisa antes da EC 141; a partir de 16/12/2026 avisa limite e repouso', () => {
    expect(avisos(SEIS, '2026-11-07')).toEqual([]);
    expect(avisos(SEIS, '2026-12-16')).toEqual(['JORNADA_ACIMA_DO_LIMITE', 'REPOUSO_ABAIXO_DO_MINIMO']);
    expect(avisos(CINCO, '2026-12-16')).toEqual([]);
    expect(avisos(CINCO, '2027-12-16')).toEqual([]);
    expect(avisos({ ...CINCO, minutosPorDia: 500 }, '2027-12-16')).toEqual(['JORNADA_ACIMA_DO_LIMITE']);
  });

  it('a mensagem cita o número e a fonte da linha vigente', () => {
    const [a] = avisosDaJornada(SEIS, regraInt(FOTO, 'JORNADA_LIMITE_SEMANAL_MIN', '2026-12-16'), regraInt(FOTO, 'REPOUSO_DIAS_MIN', '2026-12-16'), '2026-12-16');
    expect(a.mensagem).toBe('A escala soma 2640 minutos por semana, acima do limite de 2520 vigente em 2026-12-16 (EC 141/2026 art. 6º I (42 h, 2 meses após a publicação no DOU de 16/10/2026)).');
  });
});

/**
 * dates.ts — `isValidDateOnly` (round-trip de calendário) e `scopeToday` (dia-calendário NO FUSO).
 *
 * O teste que importa aqui é o de fuso: com relógio fixo às 23:30 UTC, o dia-calendário em
 * `America/Sao_Paulo` (UTC-3) é o ANTERIOR. A implementação antiga (`toISOString().slice(0,10)`)
 * devolvia o dia de amanhã das 21:00 às 23:59 BRT — e com isso o aging marcava como VENCIDA uma
 * conta que vence hoje, e o tie-out era suprimido para quem passasse a data BRT correta.
 *
 * `jest.setSystemTime` é o oráculo: sem congelar o relógio, este teste passaria/falharia conforme a
 * hora em que a suíte roda — exatamente a razão pela qual o defeito sobreviveu.
 */
import { isValidDateOnly, scopeDay, scopeToday } from '../dates';
import { ValidationError } from '../../../../lib/errors';

const BRT = { timeZone: 'America/Sao_Paulo' };

describe('scopeDay — dia-calendário de um INSTANTE, no fuso do escopo', () => {
  it('datetime ISO às 21h BRT ⇒ o dia AINDA é o corrente (o caso das pontes)', () => {
    // paidAt/returnedAt/closedAt são gravados como new Date().toISOString() — instantes.
    expect(scopeDay(BRT, '2026-08-14T00:05:00.000Z')).toBe('2026-08-13');
    expect(scopeDay(BRT, new Date('2026-08-14T00:05:00.000Z'))).toBe('2026-08-13');
    // Falsificador: o `.slice(0,10)` que estava no CrmReceivableBridge daria o dia errado.
    expect('2026-08-14T00:05:00.000Z'.slice(0, 10)).toBe('2026-08-14');
  });

  /**
   * A REGRA DELICADA. Um YYYY-MM-DD já é um dia escolhido, não um instante: reinterpretá-lo em BRT
   * o puxaria um dia para trás (meia-noite UTC = 21h do dia anterior em BRT) — exatamente o bug que
   * PostingService.fiscalYearFrom documenta ter sofrido. Sem este short-circuit, consertar as pontes
   * QUEBRARIA toda venda cujo `date` do preset já é date-only.
   */
  it('date-only entra e sai INTACTO — nunca é reinterpretado num fuso', () => {
    expect(scopeDay(BRT, '2026-01-01')).toBe('2026-01-01'); // não pode virar 2025-12-31
    expect(scopeDay(BRT, '2026-08-13')).toBe('2026-08-13');
    expect(scopeDay({ timeZone: 'Asia/Tokyo' }, '2026-01-01')).toBe('2026-01-01'); // nem para frente
  });

  it('instante inválido LANÇA — nunca inventa um "hoje" plausível por cima de lixo', () => {
    expect(() => scopeDay(BRT, 'ontem')).toThrow(ValidationError);
    expect(() => scopeDay(BRT, '')).toThrow(ValidationError);
    expect(() => scopeDay(BRT, new Date('lixo'))).toThrow(ValidationError);
  });

  /**
   * REGRESSÃO PEGA PELA SUÍTE EXISTENTE (CrmReceivableBridge): a 1ª versão de scopeDay parseava antes
   * de validar, e `new Date('2026-02-30T00:00:00Z')` rola para 03-02 EM SILÊNCIO — uma data impossível
   * virava uma data plausível e ia parar no razão. O guard de calendário roda ANTES do parse.
   */
  it('datetime com dia-calendário IMPOSSÍVEL lança em vez de rolar em silêncio', () => {
    expect(() => scopeDay(BRT, '2026-02-30T00:00:00.000Z')).toThrow(ValidationError);
    expect(() => scopeDay(BRT, '2026-06-31T12:00:00.000Z')).toThrow(ValidationError);
    // Falsificador: sem o guard, o Date rolaria e devolveria um dia válido.
    expect(new Date('2026-02-30T00:00:00.000Z').toISOString().slice(0, 10)).toBe('2026-03-02');
    // 29/02 de ano bissexto REAL continua passando (o guard não é um regex bruto).
    expect(scopeDay(BRT, '2024-02-29T12:00:00.000Z')).toBe('2024-02-29');
  });

  it('sem instante ⇒ agora (é o mesmo caminho de scopeToday)', () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-08-14T00:05:00.000Z'));
    expect(scopeDay(BRT)).toBe('2026-08-13');
    expect(scopeDay(BRT)).toBe(scopeToday(BRT));
    jest.useRealTimers();
  });
});

describe('scopeToday — dia-calendário no fuso do escopo', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('23:30 UTC ⇒ em BRT ainda é o dia ANTERIOR (o caso que o UTC errava)', () => {
    jest.setSystemTime(new Date('2026-08-13T23:30:00.000Z')); // 13/08 20:30 BRT
    expect(scopeToday(BRT)).toBe('2026-08-13');

    jest.setSystemTime(new Date('2026-08-14T00:05:00.000Z')); // 13/08 21:05 BRT — o bug
    expect(scopeToday(BRT)).toBe('2026-08-13');
    // Falsificador: se scopeToday voltasse a ser UTC, este seria '2026-08-14'.
    expect(new Date().toISOString().slice(0, 10)).toBe('2026-08-14');
  });

  it('a janela inteira das 21:00 às 23:59 BRT permanece no dia corrente', () => {
    for (const utc of ['2026-08-14T00:00:00.000Z', '2026-08-14T01:30:00.000Z', '2026-08-14T02:59:59.999Z']) {
      jest.setSystemTime(new Date(utc));
      expect(scopeToday(BRT)).toBe('2026-08-13');
    }
    jest.setSystemTime(new Date('2026-08-14T03:00:00.000Z')); // 14/08 00:00 BRT — a virada REAL
    expect(scopeToday(BRT)).toBe('2026-08-14');
  });

  it('a virada de ANO segue o fuso (31/12 21:00 BRT não vira 2027)', () => {
    jest.setSystemTime(new Date('2027-01-01T02:30:00.000Z')); // 31/12/2026 23:30 BRT
    expect(scopeToday(BRT)).toBe('2026-12-31');
  });

  it('devolve estritamente YYYY-MM-DD (zero à esquerda preservado) e é uma data real', () => {
    jest.setSystemTime(new Date('2026-03-05T12:00:00.000Z'));
    const today = scopeToday(BRT);
    expect(today).toBe('2026-03-05');
    expect(isValidDateOnly(today)).toBe(true); // o contrato que o resto do módulo assume
  });

  it('um escopo em UTC continua UTC — o fuso vem do escopo, não é hard-coded em BRT', () => {
    jest.setSystemTime(new Date('2026-08-14T00:05:00.000Z'));
    expect(scopeToday({ timeZone: 'UTC' })).toBe('2026-08-14');
  });
});

describe('isValidDateOnly — o regex sozinho não valida o calendário', () => {
  it('aceita datas reais', () => {
    expect(isValidDateOnly('2026-02-28')).toBe(true);
    expect(isValidDateOnly('2024-02-29')).toBe(true); // bissexto real
  });

  it('recusa o overflow que o Date rolaria em silêncio', () => {
    expect(isValidDateOnly('2026-02-30')).toBe(false); // rolaria p/ 03-02
    expect(isValidDateOnly('2026-06-31')).toBe(false); // rolaria p/ 07-01
    expect(isValidDateOnly('2026-13-01')).toBe(false);
  });

  it('recusa formas fora do YYYY-MM-DD estrito', () => {
    expect(isValidDateOnly('2026-8-13')).toBe(false);
    expect(isValidDateOnly('2026-08-13T00:00:00Z')).toBe(false);
    expect(isValidDateOnly('')).toBe(false);
  });
});

/**
 * periodComparison.dto — barreira do achado R3 F3 (`fronteira-de-dto-quase-nao-testada`).
 *
 * Este DTO não só valida: ele TRANSFORMA a data-only em `Date` de meia-noite UTC. As duas
 * metades precisam de asserção separada, e a segunda é a que a memória do projeto registra
 * como classe de bug (`date-only-rendering-utc-shift-class-bug`): meia-noite LOCAL em UTC-3
 * volta um dia, e o comparativo passaria a ler o saldo do dia anterior.
 */
import { isPeriodComparisonInput, PeriodComparisonSchema } from '../periodComparison.dto';

const valid = { asOfCurrent: '2026-06-30', asOfPrevious: '2026-05-31' };

describe('PeriodComparisonSchema', () => {
  it('accepts a well-formed pair (CONTROLE)', () => {
    expect(PeriodComparisonSchema.safeParse(valid).success).toBe(true);
  });

  it('transforma para meia-noite UTC, sem deslocamento de dia', () => {
    const parsed = PeriodComparisonSchema.safeParse(valid);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.asOfCurrent.toISOString()).toBe('2026-06-30T00:00:00.000Z');
      expect(parsed.data.asOfPrevious.toISOString()).toBe('2026-05-31T00:00:00.000Z');
    }
  });

  it('rejects non-calendar dates em qualquer das duas pontas (round-trip)', () => {
    expect(PeriodComparisonSchema.safeParse({ ...valid, asOfCurrent: '2026-02-30' }).success).toBe(false);
    expect(PeriodComparisonSchema.safeParse({ ...valid, asOfPrevious: '2026-06-31' }).success).toBe(false);
  });

  it('rejects datetime com timezone (entraria como instante e deslocaria o dia)', () => {
    expect(
      PeriodComparisonSchema.safeParse({ ...valid, asOfCurrent: '2026-06-30T23:00:00-03:00' }).success,
    ).toBe(false);
  });

  it('rejects campo ausente e unknown keys (.strict)', () => {
    expect(PeriodComparisonSchema.safeParse({ asOfCurrent: '2026-06-30' }).success).toBe(false);
    expect(PeriodComparisonSchema.safeParse({ ...valid, unitId: 'u1' }).success).toBe(false);
  });

  it('isPeriodComparisonInput concorda com o schema nos dois sentidos', () => {
    expect(isPeriodComparisonInput(valid)).toBe(true);
    expect(isPeriodComparisonInput({ ...valid, asOfCurrent: '2026-02-30' })).toBe(false);
  });
});

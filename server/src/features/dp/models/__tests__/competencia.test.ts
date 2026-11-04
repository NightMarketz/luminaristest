/**
 * BE-INCR-DP-F0-F1 item 2 — competência `YYYY-MM` e funções puras (fast-check).
 */
import fc from 'fast-check';
import {
  anterior,
  comparar,
  CompetenciaSchema,
  competenciaDe,
  primeiroDia,
  proxima,
  ultimoDia,
  type Competencia,
} from '../competencia';
import { isValidDateOnly } from '../../../accounting/models/dates';

const competenciaArb = fc
  .tuple(fc.integer({ min: 1900, max: 2999 }), fc.integer({ min: 1, max: 12 }))
  .map(([a, m]) => CompetenciaSchema.parse(`${a}-${String(m).padStart(2, '0')}`));

describe('competência (item 2)', () => {
  it('competenciaDe(primeiroDia(c)) = c = competenciaDe(ultimoDia(c))', () => {
    fc.assert(
      fc.property(competenciaArb, (c) => {
        expect(competenciaDe(primeiroDia(c))).toBe(c);
        expect(competenciaDe(ultimoDia(c))).toBe(c);
        expect(isValidDateOnly(ultimoDia(c))).toBe(true);
      }),
    );
  });

  it('proxima(anterior(c)) = c e anterior(proxima(c)) = c', () => {
    fc.assert(
      fc.property(competenciaArb, (c) => {
        expect(proxima(anterior(c))).toBe(c);
        expect(anterior(proxima(c))).toBe(c);
        expect(comparar(c, proxima(c))).toBe(-1);
        expect(comparar(proxima(c), c)).toBe(1);
        expect(comparar(c, c)).toBe(0);
      }),
    );
  });

  it('último dia segue o calendário real (fevereiro bissexto)', () => {
    expect(ultimoDia('2028-02' as Competencia)).toBe('2028-02-29');
    expect(ultimoDia('2027-02' as Competencia)).toBe('2027-02-28');
    expect(ultimoDia('2100-02' as Competencia)).toBe('2100-02-28');
    expect(ultimoDia('2027-12' as Competencia)).toBe('2027-12-31');
    expect(proxima('2027-12' as Competencia)).toBe('2028-01');
    expect(anterior('2027-01' as Competencia)).toBe('2026-12');
  });

  it('recusa competência e data fora do formato ou do calendário', () => {
    for (const ruim of ['2027-13', '2027-00', '2027-1', '27-01', '2027-01-01']) {
      expect(CompetenciaSchema.safeParse(ruim).success).toBe(false);
    }
    expect(() => competenciaDe('2027-02-30')).toThrow('Data inválida');
  });
});

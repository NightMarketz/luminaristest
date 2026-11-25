import { deveAlertarAdiamento } from '../dfePollAdiamento';

/** Lacuna 92c5 (dono 24/11): alerta depois de 1 h adiado, uma vez por episódio (o estado mora nas colunas do documento — 6e13). */
const HORA = 3_600_000;
const T0 = new Date('2026-11-24T10:00:00.000Z');
const em = (ms: number) => new Date(T0.getTime() + ms);

describe('dfePollAdiamento', () => {
  it('1º adiamento (sem episódio) nunca alerta; <1 h não alerta; ≥1 h alerta; já alertado não repete', () => {
    expect(deveAlertarAdiamento(null, em(10 * HORA), HORA)).toBe(false);
    const aberto = { desde: T0, alertado: false };
    expect(deveAlertarAdiamento(aberto, em(HORA - 1), HORA)).toBe(false);
    expect(deveAlertarAdiamento(aberto, em(HORA), HORA)).toBe(true);
    expect(deveAlertarAdiamento(aberto, em(5 * HORA), HORA)).toBe(true);
    expect(deveAlertarAdiamento({ desde: T0, alertado: true }, em(5 * HORA), HORA)).toBe(false);
  });
});

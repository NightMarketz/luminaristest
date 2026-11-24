import { deveAlertarAdiamento, gravarAdiamentoTransporte, lerAdiamentoTransporte } from '../dfePollAdiamento';

/** Lacuna 92c5 (dono 24/11): alerta depois de 1 h adiado, uma vez por episódio; o episódio mora em `pollLastError`. */
const HORA = 3_600_000;
const T0 = new Date('2026-11-24T10:00:00.000Z');
const em = (ms: number) => new Date(T0.getTime() + ms);

describe('dfePollAdiamento', () => {
  it('grava e lê de volta o episódio (início e "alertado")', () => {
    const texto = gravarAdiamentoTransporte({ desde: T0, alertado: false }, 'dfe_assinador_sem_dispositivo: caixa desligada');
    expect(texto).toBe('dfe_transporte_indisponivel desde=2026-11-24T10:00:00.000Z alertado=0: dfe_assinador_sem_dispositivo: caixa desligada');
    expect(lerAdiamentoTransporte(texto)).toEqual({ desde: T0, alertado: false });
    expect(lerAdiamentoTransporte(gravarAdiamentoTransporte({ desde: T0, alertado: true }, 'x'))).toEqual({ desde: T0, alertado: true });
  });

  it('outro conteúdo em pollLastError (erro comum, vazio, data ilegível) não é episódio', () => {
    for (const outro of [null, undefined, '', 'sefaz_http: HTTP 503', 'dfe_transporte_indisponivel desde=ontem alertado=0: x', 'dfe_transporte_indisponivel desde=2026-13-45T10:00:00.000Z alertado=0: x']) {
      expect(lerAdiamentoTransporte(outro)).toBeNull();
    }
  });

  it('1º adiamento (sem episódio) nunca alerta; <1 h não alerta; ≥1 h alerta; já alertado não repete', () => {
    expect(deveAlertarAdiamento(null, em(10 * HORA), HORA)).toBe(false);
    const aberto = { desde: T0, alertado: false };
    expect(deveAlertarAdiamento(aberto, em(HORA - 1), HORA)).toBe(false);
    expect(deveAlertarAdiamento(aberto, em(HORA), HORA)).toBe(true);
    expect(deveAlertarAdiamento(aberto, em(5 * HORA), HORA)).toBe(true);
    expect(deveAlertarAdiamento({ desde: T0, alertado: true }, em(5 * HORA), HORA)).toBe(false);
  });
});

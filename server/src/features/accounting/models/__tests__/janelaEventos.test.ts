/**
 * BE-INCR-DFE-EVENTOS (nó X11, item 3) — tabela de casos da janela (F-EVT-2 b: base `nfseDhProc`, dias de calendário
 * em America/Sao_Paulo, vence 23:59:59 do último dia; teto nacional 2 anos, Anexo I [114]).
 */
import { foraDaJanela, janelaEventos } from '../janelaEventos';

const PERFIL = { cancelPrazoDias: 1, substPrazoDias: 30 };

describe('janelaEventos — item 3', () => {
  it('prazo nulo: cancelarAte/substituirAte null, teto existe, fonte desconhecida', () => {
    const j = janelaEventos({ nfseDhProc: new Date('2026-10-01T10:00:00-03:00') }, { cancelPrazoDias: null, substPrazoDias: null });
    expect(j).toEqual({ cancelarAte: null, substituirAte: null, substituirTeto: '2028-10-01T23:59:59-03:00', fonte: 'desconhecida' });
  });

  it('sem perfil: idem (fonte desconhecida)', () => {
    expect(janelaEventos({ nfseDhProc: new Date('2026-10-01T10:00:00-03:00') }, null).fonte).toBe('desconhecida');
  });

  it('base nula (documento anterior ao X11): tudo null', () => {
    expect(janelaEventos({ nfseDhProc: null }, PERFIL)).toEqual({ cancelarAte: null, substituirAte: null, substituirTeto: null, fonte: 'perfil' });
  });

  it('prazos configurados: dias de calendário, vencendo 23:59:59 SP do último dia', () => {
    const j = janelaEventos({ nfseDhProc: new Date('2026-10-01T10:00:00-03:00') }, PERFIL);
    expect(j).toEqual({
      cancelarAte: '2026-10-02T23:59:59-03:00',
      substituirAte: '2026-10-31T23:59:59-03:00',
      substituirTeto: '2028-10-01T23:59:59-03:00',
      fonte: 'perfil',
    });
  });

  it('virada de dia: 22:30 BRT (= 01:30Z do dia seguinte) conta o dia de SP, não o UTC', () => {
    const j = janelaEventos({ nfseDhProc: new Date('2026-10-01T22:30:00-03:00') }, PERFIL);
    expect(j.cancelarAte).toBe('2026-10-02T23:59:59-03:00');
  });

  it('borda exata: o último instante está dentro; 1 s depois está fora', () => {
    const { cancelarAte } = janelaEventos({ nfseDhProc: new Date('2026-10-01T10:00:00-03:00') }, PERFIL);
    expect(foraDaJanela(cancelarAte, new Date('2026-10-02T23:59:59-03:00'))).toBe(false);
    expect(foraDaJanela(cancelarAte, new Date('2026-10-03T00:00:00-03:00'))).toBe(true);
    expect(foraDaJanela(null, new Date('2099-01-01T00:00:00Z'))).toBe(false); // sem janela, nunca "fora"
  });

  it('teto de 2 anos a partir de 29/02 cai em 28/02 (nunca rola para março)', () => {
    expect(janelaEventos({ nfseDhProc: new Date('2028-02-29T12:00:00-03:00') }, null).substituirTeto).toBe('2030-02-28T23:59:59-03:00');
  });
});

/**
 * BE-INCR-DFE-EVENTOS (nó X11, item 3) — tabela de casos da janela (F-EVT-2 b: base `nfseDhProc`, dias de calendário
 * em America/Sao_Paulo, vence 23:59:59 do último dia; teto nacional 2 anos, Anexo I [114]).
 */
import { foraDaJanela, janelaEventos } from '../janelaEventos';

const PERFIL = { cancelPrazoDias: 1, substPrazoDias: 30 };

describe('janelaEventos — item 3', () => {
  it('prazo nulo: cancelarAte/substituirAte null, teto existe, fonte desconhecida', () => {
    const j = janelaEventos({ kind: 'NFSE', nfseDhProc: new Date('2026-10-01T10:00:00-03:00') }, { cancelPrazoDias: null, substPrazoDias: null });
    expect(j).toEqual({ cancelarAte: null, substituirAte: null, substituirTeto: '2028-10-01T23:59:59-03:00', fonte: 'desconhecida' });
  });

  it('sem perfil: idem (fonte desconhecida)', () => {
    expect(janelaEventos({ kind: 'NFSE', nfseDhProc: new Date('2026-10-01T10:00:00-03:00') }, null).fonte).toBe('desconhecida');
  });

  it('base nula (documento anterior ao X11): tudo null', () => {
    expect(janelaEventos({ kind: 'NFSE', nfseDhProc: null }, PERFIL)).toEqual({ cancelarAte: null, substituirAte: null, substituirTeto: null, fonte: 'perfil' });
  });

  it('prazos configurados: dias de calendário, vencendo 23:59:59 SP do último dia', () => {
    const j = janelaEventos({ kind: 'NFSE', nfseDhProc: new Date('2026-10-01T10:00:00-03:00') }, PERFIL);
    expect(j).toEqual({
      cancelarAte: '2026-10-02T23:59:59-03:00',
      substituirAte: '2026-10-31T23:59:59-03:00',
      substituirTeto: '2028-10-01T23:59:59-03:00',
      fonte: 'perfil',
    });
  });

  it('virada de dia: 22:30 BRT (= 01:30Z do dia seguinte) conta o dia de SP, não o UTC', () => {
    const j = janelaEventos({ kind: 'NFSE', nfseDhProc: new Date('2026-10-01T22:30:00-03:00') }, PERFIL);
    expect(j.cancelarAte).toBe('2026-10-02T23:59:59-03:00');
  });

  it('borda exata: o último instante está dentro; 1 s depois está fora', () => {
    const { cancelarAte } = janelaEventos({ kind: 'NFSE', nfseDhProc: new Date('2026-10-01T10:00:00-03:00') }, PERFIL);
    expect(foraDaJanela(cancelarAte, new Date('2026-10-02T23:59:59-03:00'))).toBe(false);
    expect(foraDaJanela(cancelarAte, new Date('2026-10-03T00:00:00-03:00'))).toBe(true);
    expect(foraDaJanela(null, new Date('2099-01-01T00:00:00Z'))).toBe(false); // sem janela, nunca "fora"
  });

  it('ramo NFS-e ignora os prazos da NF-e/NFC-e', () => {
    const j = janelaEventos({ kind: 'NFSE', nfseDhProc: new Date('2026-10-01T10:00:00-03:00') }, { ...PERFIL, nfeCancelPrazoHoras: 1, nfceCancelPrazoMinutos: 5 });
    expect(j.cancelarAte).toBe('2026-10-02T23:59:59-03:00');
  });

  it('teto de 2 anos a partir de 29/02 cai em 28/02 (nunca rola para março)', () => {
    expect(janelaEventos({ kind: 'NFSE', nfseDhProc: new Date('2028-02-29T12:00:00-03:00') }, null).substituirTeto).toBe('2030-02-28T23:59:59-03:00');
  });
});

/**
 * BE-INCR-NFCE (nó X10a, item 27; EMENDA 2026-10-11 §3 E3-1/E3-2) — ramo 55/65: base `dhRecbto` (na mesma coluna), prazo
 * corrido em minutos — NF-e null ⇒ 24 h (Aj. SINIEF 07/05 cl. 12ª), NFC-e null ⇒ 30 min (Aj. SINIEF 19/16 cl. 15ª).
 */
describe('janelaEventos — ramo NF-e/NFC-e (BE-INCR-NFCE item 27)', () => {
  const BASE = new Date('2026-10-01T10:00:00-03:00');
  const VAZIO = { cancelPrazoDias: null, substPrazoDias: null, nfeCancelPrazoHoras: null, nfceCancelPrazoMinutos: null };

  it('NFC-e sem prazo no perfil: base + 30 min, fonte nacional, sem substituição', () => {
    expect(janelaEventos({ kind: 'NFCE', nfseDhProc: BASE }, VAZIO)).toEqual({
      cancelarAte: '2026-10-01T10:30:00-03:00',
      substituirAte: null,
      substituirTeto: null,
      fonte: 'nacional',
    });
    expect(janelaEventos({ kind: 'NFCE', nfseDhProc: BASE }, null).fonte).toBe('nacional');
  });

  it('E3-2: NFC-e com 29 min está dentro; com 31 min está fora', () => {
    const { cancelarAte } = janelaEventos({ kind: 'NFCE', nfseDhProc: BASE }, null);
    expect(foraDaJanela(cancelarAte, new Date(BASE.getTime() + 29 * 60_000))).toBe(false);
    expect(foraDaJanela(cancelarAte, new Date(BASE.getTime() + 31 * 60_000))).toBe(true);
  });

  it('NF-e sem prazo no perfil: base + 24 h (prazo corrido, atravessa o dia), fonte nacional', () => {
    const j = janelaEventos({ kind: 'NFE', nfseDhProc: BASE }, VAZIO);
    expect(j).toMatchObject({ cancelarAte: '2026-10-02T10:00:00-03:00', fonte: 'nacional', substituirTeto: null });
    expect(foraDaJanela(j.cancelarAte, new Date(BASE.getTime() + 25 * 3_600_000))).toBe(true);
  });

  it('prazo do perfil vence o nacional, cada um no seu tipo (fonte perfil só com o campo do tipo)', () => {
    const perfil = { ...VAZIO, nfeCancelPrazoHoras: 2, nfceCancelPrazoMinutos: 10 };
    expect(janelaEventos({ kind: 'NFCE', nfseDhProc: BASE }, perfil)).toMatchObject({ cancelarAte: '2026-10-01T10:10:00-03:00', fonte: 'perfil' });
    expect(janelaEventos({ kind: 'NFE', nfseDhProc: BASE }, perfil)).toMatchObject({ cancelarAte: '2026-10-01T12:00:00-03:00', fonte: 'perfil' });
    expect(janelaEventos({ kind: 'NFE', nfseDhProc: BASE }, { ...VAZIO, nfceCancelPrazoMinutos: 10 }).fonte).toBe('nacional');
  });

  it('sem dhRecbto gravado: cancelarAte null (nunca "fora")', () => {
    expect(janelaEventos({ kind: 'NFE', nfseDhProc: null }, null)).toEqual({ cancelarAte: null, substituirAte: null, substituirTeto: null, fonte: 'nacional' });
  });

  it('dhRecbto em UTC (Z) sai no fuso de SP', () => {
    expect(janelaEventos({ kind: 'NFCE', nfseDhProc: new Date('2026-10-01T23:45:00Z') }, null).cancelarAte).toBe('2026-10-01T21:15:00-03:00');
  });
});

/**
 * BE-INCR-DFE-EVENTOS (nó X11, PR-2, item 18) — teste de contrato do `EventoNfseSchema`: o que a porta pode devolver
 * em `consultarEventos(chave)` (BRIEF §4; Anexo II v1.01 aba TIPO EVENTOS DE NFSe; XSD 1.01 TSChaveNFSe/TSCodJustSubst).
 * O snapshot de shape vê a forma; aqui ficam os casos que a forma sozinha não prova.
 */
import { EVENTOS_QUE_CANCELAM, EventoNfseSchema, EventosTickSummarySchema } from '../EventoNfseDto';

const CH = '35503082211222333000181000000000004226091234567890';

describe('EventoNfseSchema', () => {
  it.each(['e101101', 'e305101', 'e105104', 'e105105', 'e101103'])('%s com dhProc com fuso → válido', (tipo) => {
    expect(EventoNfseSchema.safeParse({ tipo, dhProc: '2026-11-02T09:15:00-03:00' }).success).toBe(true);
  });

  it('e105102 exige chSubstituta (50 dígitos) e cMotivo TSCodJustSubst (string de 2)', () => {
    expect(EventoNfseSchema.safeParse({ tipo: 'e105102', dhProc: '2026-11-02T09:15:00-03:00', chSubstituta: CH, cMotivo: '01' }).success).toBe(true);
    expect(EventoNfseSchema.safeParse({ tipo: 'e105102', dhProc: '2026-11-02T09:15:00-03:00', cMotivo: '01' }).success).toBe(false);
    expect(EventoNfseSchema.safeParse({ tipo: 'e105102', dhProc: '2026-11-02T09:15:00-03:00', chSubstituta: CH.slice(1), cMotivo: '01' }).success).toBe(false);
    expect(EventoNfseSchema.safeParse({ tipo: 'e105102', dhProc: '2026-11-02T09:15:00-03:00', chSubstituta: CH, cMotivo: 1 }).success).toBe(false);
  });

  it('tipo fora da lista, dhProc sem fuso e chave extra → inválido (vira "evento desconhecido" no job)', () => {
    expect(EventoNfseSchema.safeParse({ tipo: 'e110111', dhProc: '2026-11-02T09:15:00-03:00' }).success).toBe(false);
    expect(EventoNfseSchema.safeParse({ tipo: 'e101101', dhProc: '2026-11-02T09:15:00' }).success).toBe(false);
    expect(EventoNfseSchema.safeParse({ tipo: 'e101101', dhProc: '2026-11-02T09:15:00-03:00', cMotivo: '1' }).success).toBe(false);
  });

  it('os que cancelam são e101101, e305101, e105104 e e105102 (e101103/e105105 são do PR-3)', () => {
    expect([...EVENTOS_QUE_CANCELAM].sort()).toEqual(['e101101', 'e105102', 'e105104', 'e305101']);
  });

  it('EventosTickSummarySchema é estrito', () => {
    const ok = { consultadas: 1, canceladas: 0, substituidasFora: 0, ignorados: 0, skipped: 0, failed: 0, avisos: [] };
    expect(EventosTickSummarySchema.safeParse(ok).success).toBe(true);
    expect(EventosTickSummarySchema.safeParse({ ...ok, extra: 1 }).success).toBe(false);
  });
});

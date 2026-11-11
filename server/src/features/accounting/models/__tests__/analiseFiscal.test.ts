/**
 * BE-INCR-DFE-EVENTOS (nó X11, PR-3, item 20) — regras puras da análise fiscal do cancelamento: o desfecho pelos eventos
 * do fisco (`desfechoDaAnalise`) e o status de autorização da nota em análise (`statusDeAutorizacao`, decisão do dono de
 * 07/11 "Apuração": a nota em análise conta como autorizada, divergente se era divergente antes).
 */
import { desfechoDaAnalise } from '../eventosNfse';
import { NOTA_VALIDA_STATUSES, statusDeAutorizacao } from '../../repositories/IFiscalDocumentRepository';

const ev = (tipo: string, dia: number) => ({ tipo, dhProc: `2026-11-0${dia}T10:00:00-03:00` });

describe('desfechoDaAnalise', () => {
  it.each([
    ['sem evento de análise', [ev('e101101', 1)], 'AUTHORIZED', null],
    ['e101103 numa nota AUTHORIZED', [ev('e101103', 1)], 'AUTHORIZED', 'entrar'],
    ['e101103 numa nota AUTHORIZED_DIVERGENT', [ev('e101103', 1)], 'AUTHORIZED_DIVERGENT', 'entrar'],
    ['e101103 numa nota já em análise', [ev('e101103', 1)], 'CANCEL_ANALYSIS', null],
    ['e105105 por último numa nota em análise', [ev('e101103', 1), ev('e105105', 2)], 'CANCEL_ANALYSIS', 'indeferir'],
    ['e105105 por último numa nota AUTHORIZED (pedida e indeferida fora)', [ev('e101103', 1), ev('e105105', 2)], 'AUTHORIZED', null],
    ['pedida de novo depois do indeferimento (ordem embaralhada)', [ev('e105105', 2), ev('e101103', 3), ev('e101103', 1)], 'AUTHORIZED', 'entrar'],
    ['nota cancelada', [ev('e101103', 1)], 'CANCELLED', null],
  ] as const)('%s → %s', (_n, eventos, status, esperado) => {
    expect(desfechoDaAnalise(eventos, status)).toBe(esperado);
  });
});

describe('statusDeAutorizacao / NOTA_VALIDA_STATUSES', () => {
  it('a nota em análise é válida e herda o status de antes (ausente = AUTHORIZED)', () => {
    expect(NOTA_VALIDA_STATUSES).toEqual(['AUTHORIZED', 'AUTHORIZED_DIVERGENT', 'CANCEL_ANALYSIS']);
    expect(statusDeAutorizacao({ status: 'CANCEL_ANALYSIS', statusAntesAnalise: 'AUTHORIZED_DIVERGENT' })).toBe('AUTHORIZED_DIVERGENT');
    expect(statusDeAutorizacao({ status: 'CANCEL_ANALYSIS', statusAntesAnalise: null })).toBe('AUTHORIZED');
    expect(statusDeAutorizacao({ status: 'AUTHORIZED_DIVERGENT' })).toBe('AUTHORIZED_DIVERGENT');
    expect(statusDeAutorizacao({ status: 'CANCELLED' })).toBeNull();
  });
});

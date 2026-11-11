import { describe, it, expect } from 'vitest';
import { assinadorEstado, versaoMenor } from '../assinadorEstado';
import type { DfeSignerView } from '../../../../lib/services/dfeAssinador.service';

/** FE-INCR-NFCE-ASSINADOR FA-5 — tabela view → estado de tela, cada aviso sozinho e combinado. */
const view = (over: Partial<DfeSignerView> = {}): DfeSignerView => ({
  dispositivoId: 'd1', nome: 'Caixa 1', versaoAssinador: '1.0.0', versaoMinima: '1.0.0',
  lastSeenAt: '2026-11-07T12:00:00.000Z', online: true, tokenPresente: true, certCnpjRaiz: '11444777',
  certNotAfter: '2027-11-07', diasParaVencer: 365, certThumbprint: 'a'.repeat(64), ambiente: 'homologacao',
  pareadoEm: '2026-11-01T00:00:00.000Z', outrasUnidades: [], ...over,
});

describe('assinadorEstado (FA-5)', () => {
  it.each([
    ['sem view', null, { kind: 'sem-pareamento' }],
    ['online sem aviso', view(), { kind: 'online', avisos: [] }],
    ['fora (servidor diz)', view({ online: false }), { kind: 'fora', desde: '2026-11-07T12:00:00.000Z', avisos: [] }],
    ['fora e nunca visto', view({ online: false, lastSeenAt: null }), { kind: 'fora', desde: null, avisos: [] }],
    ['token ausente', view({ tokenPresente: false }), { kind: 'online', avisos: ['token-ausente'] }],
    ['vence em 30 dias', view({ diasParaVencer: 30 }), { kind: 'online', avisos: ['cert-vencendo'] }],
    ['vence hoje', view({ diasParaVencer: 0 }), { kind: 'online', avisos: ['cert-vencendo'] }],
    ['31 dias ainda não avisa', view({ diasParaVencer: 31 }), { kind: 'online', avisos: [] }],
    ['vencido', view({ diasParaVencer: -1 }), { kind: 'online', avisos: ['cert-vencido'] }],
    ['versão antiga', view({ versaoAssinador: '0.9.9' }), { kind: 'online', avisos: ['versao-antiga'] }],
    [
      'combinados, fora',
      view({ online: false, tokenPresente: false, diasParaVencer: -5, versaoAssinador: '1.0.0', versaoMinima: '1.2.0' }),
      { kind: 'fora', desde: '2026-11-07T12:00:00.000Z', avisos: ['token-ausente', 'cert-vencido', 'versao-antiga'] },
    ],
  ])('%s', (_n, v, esperado) => {
    expect(assinadorEstado(v)).toEqual(esperado);
  });

  it('versaoMenor compara por número, não por texto', () => {
    expect(versaoMenor('1.9.0', '1.10.0')).toBe(true);
    expect(versaoMenor('1.10.0', '1.9.0')).toBe(false);
    expect(versaoMenor('1.0.0', '1.0.0')).toBe(false);
  });
});

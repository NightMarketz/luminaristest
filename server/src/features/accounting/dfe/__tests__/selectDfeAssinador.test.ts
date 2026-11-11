import { selectDfeAssinador } from '../selectDfeAssinador';
import { selectDfeEmissor } from '../selectDfeEmissor';
import { ligarTransporteAssinadorLocal } from '../local/assinadorLocalRuntime';
import { SefazNfeEmissor } from '../sefaz/SefazNfeEmissor';
import type { SefazTransporte } from '../sefaz/SefazTransporte';

/** X10a EMENDA-4 AL-2 — tabela env → seleção do assinador e da porta `sefaz` (F-AL-7 a). */

const transporteFalso: SefazTransporte = { call: async () => '<retEnviNFe/>' };
const SEFAZ = { DFE_PARTNER: 'sefaz', DFE_PARTNER_ENV: 'homologacao' };

describe('selectDfeAssinador — AL-2 (DFE_ASSINADOR_<KIND> com fallback)', () => {
  it.each([
    [{ ...SEFAZ, DFE_ASSINADOR: 'local' }, 'NFCE', { enabled: true, kind: 'local' }],
    [{ ...SEFAZ, DFE_ASSINADOR: 'psc' }, 'NFE', { enabled: true, kind: 'psc' }],
    [{ ...SEFAZ, DFE_ASSINADOR: 'psc', DFE_ASSINADOR_NFCE: 'local' }, 'NFCE', { enabled: true, kind: 'local' }],
    [{ ...SEFAZ, DFE_ASSINADOR: 'psc', DFE_ASSINADOR_NFCE: 'local' }, 'NFE', { enabled: true, kind: 'psc' }],
  ] as const)('%j / %s ⇒ %j', (env, kind, esperado) => {
    expect(selectDfeAssinador(env, kind)).toEqual(esperado);
  });

  it('ausente ⇒ desabilitado com o motivo nomeado', () => {
    const s = selectDfeAssinador(SEFAZ, 'NFCE');
    expect(s).toEqual({ enabled: false, reason: expect.stringMatching(/^DFE_ASSINADOR não configurado para NFCE/) });
  });

  it('valor desconhecido ⇒ desabilitado com o motivo nomeado', () => {
    const s = selectDfeAssinador({ ...SEFAZ, DFE_ASSINADOR: 'hsm' }, 'NFE');
    expect(s).toEqual({ enabled: false, reason: expect.stringMatching(/^assinador 'hsm' desconhecido para NFE/) });
  });

  it("'local' sem o parceiro 'sefaz' ⇒ desabilitado", () => {
    const s = selectDfeAssinador({ DFE_PARTNER: 'null', DFE_PARTNER_ENV: 'homologacao', DFE_ASSINADOR: 'local' }, 'NFCE');
    expect(s).toEqual({ enabled: false, reason: expect.stringMatching(/só se aplica ao parceiro 'sefaz'.*'null'/) });
  });
});

describe("selectDfeEmissor 'sefaz' — AL-2 (sem DFE_TRANSMISSOR_CERT)", () => {
  afterEach(() => ligarTransporteAssinadorLocal(null));

  it('sem DFE_ASSINADOR ⇒ porta desabilitada com o motivo', () => {
    const s = selectDfeEmissor(SEFAZ, 'NFCE', { transporteLocal: transporteFalso });
    expect([s.enabled, s.reason]).toEqual([false, expect.stringMatching(/^parceiro 'sefaz' sem assinador: DFE_ASSINADOR não configurado/)]);
  });

  it('com assinador mas sem o transporte do assinador local ligado ⇒ desabilitada (nunca cai no e-CNPJ do Luminaris)', () => {
    const s = selectDfeEmissor({ ...SEFAZ, DFE_ASSINADOR: 'local', DFE_TRANSMISSOR_CERT: '/qualquer.pfx' }, 'NFCE');
    expect([s.enabled, s.reason]).toEqual([false, "parceiro 'sefaz' sem transporte: o assinador local não está ligado nesta instância"]);
  });

  it.each(['local', 'psc'] as const)("'%s' com o transporte ligado pelo factory ⇒ SefazNfeEmissor habilitado e o assinador na seleção", (kind) => {
    ligarTransporteAssinadorLocal(transporteFalso);
    const s = selectDfeEmissor({ ...SEFAZ, DFE_ASSINADOR: kind }, 'NFE');
    expect(s.enabled).toBe(true);
    expect(s.port).toBeInstanceOf(SefazNfeEmissor);
    expect(s.assinador).toBe(kind);
  });

  it('parceiro que não é sefaz não leva assinador na seleção', () => {
    const s = selectDfeEmissor({ NODE_ENV: 'test', DFE_PARTNER: 'null', DFE_PARTNER_ENV: 'homologacao', DFE_ASSINADOR: 'local' }, 'NFCE');
    expect(s.enabled).toBe(true);
    expect(s.assinador).toBeUndefined();
  });
});

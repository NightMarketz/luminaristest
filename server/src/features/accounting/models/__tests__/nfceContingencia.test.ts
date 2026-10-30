import { FERIADOS_SEMENTE } from '@test/helpers/legalParams';
import { alertaDePrazo, emContingencia, prazoTransmissao } from '../nfceContingencia';
import type { NfePayloadSemNumeracao } from '../../dtos/NfePayloadDto';

/**
 * X10a PR-9 — regras puras da contingência off-line (E-9). Prazo: "até o final do primeiro dia útil subsequente" (MOC 7.0
 * Anexo IV p. 7), dia útil = seg–sex fora de FERIADO_NACIONAL (decisão 9); alerta faltando 4 h (decisão 9).
 */
describe('nfceContingencia — prazo de transmissão e alerta', () => {
  it('quinta ⇒ fim de sexta, no fuso do dhEmi', () => {
    expect(prazoTransmissao('2026-10-29T15:00:00-03:00', FERIADOS_SEMENTE).toISOString()).toBe('2026-10-31T02:59:59.000Z');
  });

  it('sexta ⇒ pula o fim de semana e o Finados (02/11, feriado nacional) ⇒ fim de terça', () => {
    expect(prazoTransmissao('2026-10-30T22:00:00-03:00', FERIADOS_SEMENTE).toISOString()).toBe('2026-11-04T02:59:59.000Z');
  });

  it('sexta comum ⇒ fim de segunda', () => {
    expect(prazoTransmissao('2026-10-23T09:00:00-03:00', FERIADOS_SEMENTE).toISOString()).toBe('2026-10-27T02:59:59.000Z');
  });

  it('alerta: > 4 h ⇒ nada; ≤ 4 h ⇒ PERTO; depois do fim ⇒ VENCIDO', () => {
    const prazo = new Date('2026-10-31T02:59:59.000Z');
    expect(alertaDePrazo(new Date('2026-10-30T22:59:58.000Z'), prazo)).toBeNull();
    expect(alertaDePrazo(new Date('2026-10-30T22:59:59.000Z'), prazo)).toBe('PERTO');
    expect(alertaDePrazo(new Date('2026-10-31T03:00:00.000Z'), prazo)).toBe('VENCIDO');
  });

  it('emContingencia: tpEmis=9 com dhCont/xJust; na NF-e 55 é erro (rej. 711)', () => {
    const base = { infNFe: { ide: { mod: 65, tpEmis: 1, dhEmi: '2026-10-29T10:00:00-03:00' } } } as unknown as NfePayloadSemNumeracao;
    const c = { dhEmi: '2026-10-29T10:05:00-03:00', dhCont: '2026-10-29T10:04:00-03:00', xJust: 'Falha de comunicacao com a SEFAZ' };
    expect(emContingencia(base, c).infNFe.ide).toMatchObject({ tpEmis: 9, ...c });
    const nfe = { infNFe: { ide: { mod: 55, tpEmis: 1 } } } as unknown as NfePayloadSemNumeracao;
    expect(() => emContingencia(nfe, c)).toThrow(/711/);
  });
});

/**
 * BE-INCR-EFD-REINF PR-1 — prazo mensal da Reinf (item 21 na regra mensal; invariante 10): dia 15 do mês seguinte,
 * AVANÇADO ao dia útil seguinte (IN RFB 2.043 art. 6º § 2º).
 */
import { prazoReinfMensal } from '../prazoReinf';
import type { LinhaLegal } from '../../features/legalParameters/models/legalParameter';

const feriado = (mmdd: string): LinhaLegal => ({
  id: `f-${mmdd}`, tabela: 'FERIADO_NACIONAL', chave: mmdd, discriminador: null, valorInt: null, valorTexto: null, valorJson: null,
  fonte: 'teste', vigenteDesde: '2000-01-01', vigenteAte: null, status: 'PUBLISHED', supersedesId: null,
});

/** A tabela vazia é recusada (SemLinhaVigenteError): toda fotografia real tem ao menos o 1º de janeiro. */
const BASE = [feriado('01-01')];

describe('prazoReinfMensal', () => {
  it('dia 15 útil ⇒ dia 15', () => expect(prazoReinfMensal('2026-08', BASE)).toBe('2026-09-15'));
  it('dia 15 num sábado ⇒ segunda (2026-08-15)', () => expect(prazoReinfMensal('2026-07', BASE)).toBe('2026-08-17'));
  it('dia 15 feriado nacional numa quarta ⇒ quinta (2028-11-15, Proclamação)', () => {
    expect(prazoReinfMensal('2028-10', [...BASE, feriado('11-15')])).toBe('2028-11-16');
  });
  it('dezembro vira o ano', () => expect(prazoReinfMensal('2026-12', BASE)).toBe('2027-01-15'));
  it('competência inválida é bug de quem chamou', () => expect(() => prazoReinfMensal('2026-13', BASE)).toThrow());
});

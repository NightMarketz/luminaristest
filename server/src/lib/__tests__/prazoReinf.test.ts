/**
 * BE-INCR-EFD-REINF PR-1 — prazo mensal da Reinf (item 21 na regra mensal; invariante 10): dia 15 do mês seguinte,
 * AVANÇADO ao dia útil seguinte (IN RFB 2.043 art. 6º § 2º).
 */
import { prazoReinfIsentos, prazoReinfMensal } from '../prazoReinf';
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

/** PR-3 (item 21; invariante 10, 2ª metade) — isentos: dia 15 do 2º mês após o trimestre (§ 3º), avançado como no § 2º. */
describe('prazoReinfIsentos', () => {
  it('trimestre 2026-T1 ⇒ 2026-05-15 (qualquer mês do trimestre)', () => {
    expect(['2026-01', '2026-02', '2026-03'].map((c) => prazoReinfIsentos(c, BASE))).toEqual(['2026-05-15', '2026-05-15', '2026-05-15']);
  });
  it('2026-T2 ⇒ 2026-08-15 é sábado ⇒ segunda 2026-08-17', () => expect(prazoReinfIsentos('2026-05', BASE)).toBe('2026-08-17'));
  it('2026-T4 vira o ano: 2027-02-15 (segunda)', () => expect(prazoReinfIsentos('2026-11', BASE)).toBe('2027-02-15'));
  it('nunca antes do mensal da mesma competência', () => {
    for (const c of ['2026-01', '2026-03', '2026-06', '2026-12']) expect(prazoReinfIsentos(c, BASE) >= prazoReinfMensal(c, BASE)).toBe(true);
  });
  it('competência inválida é bug de quem chamou', () => expect(() => prazoReinfIsentos('2026-00', BASE)).toThrow());
});

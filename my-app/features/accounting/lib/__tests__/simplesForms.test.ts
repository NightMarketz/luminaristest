import { describe, it, expect } from 'vitest';
import { avisoReRegistro, ehDataValida, parceriaVazia, sugestaoVencimento, toDasRegistro, toParceriaForm, toParceriaInput, type ParceriaForm } from '../simplesForms';

/** FE-INCR-SIMPLES PR-B — formulários do DAS oficial (item 9) e da parceria (item 10). */
describe('simplesForms', () => {
  it('date-only de calendário: 30/02 e 31/04 não passam', () => {
    expect(ehDataValida('2026-02-28')).toBe(true);
    expect(ehDataValida('2028-02-29')).toBe(true);
    expect(ehDataValida('2026-02-30')).toBe(false);
    expect(ehDataValida('2026-04-31')).toBe(false);
    expect(ehDataValida('2026-4-1')).toBe(false);
    expect(ehDataValida('')).toBe(false);
  });

  it('item 9: sugestão de vencimento = dia 20 do mês seguinte (vira o ano em dezembro)', () => {
    expect(sugestaoVencimento('2026-03')).toBe('2026-04-20');
    expect(sugestaoVencimento('2026-12')).toBe('2027-01-20');
  });

  it('item 9: corpo do PUT …/das em centavos; erros de forma', () => {
    expect(toDasRegistro('u1', { numeroDocumento: ' 07202603 ', valor: '1.234,56', vencimento: '2026-04-20' })).toEqual({
      ok: true, body: { unitId: 'u1', numeroDocumento: '07202603', valorCents: 123456, vencimento: '2026-04-20' },
    });
    expect(toDasRegistro('u1', { numeroDocumento: '1', valor: '80,9', vencimento: '2026-04-20' })).toMatchObject({ ok: true, body: { valorCents: 8090 } });
    expect(toDasRegistro('u1', { numeroDocumento: '', valor: '1', vencimento: '2026-04-20' })).toEqual({ ok: false, error: 'numeroObrigatorio' });
    expect(toDasRegistro('u1', { numeroDocumento: '1', valor: 'abc', vencimento: '2026-04-20' })).toEqual({ ok: false, error: 'valorInvalido' });
    expect(toDasRegistro('u1', { numeroDocumento: '1', valor: '0,00', vencimento: '2026-04-20' })).toEqual({ ok: false, error: 'valorInvalido' });
    expect(toDasRegistro('u1', { numeroDocumento: '1', valor: '10', vencimento: '2026-02-30' })).toEqual({ ok: false, error: 'vencimentoInvalido' });
  });

  it('P4-7: re-registro — mesmo número e valor completa a provisão; outro substitui', () => {
    const vigente = { id: 'd', numeroDocumento: 'A', valorCents: 100, vencimento: '2026-04-20', provisaoPendente: true };
    expect(avisoReRegistro(null, { numeroDocumento: 'A', valorCents: 100 })).toBeNull();
    expect(avisoReRegistro(vigente, { numeroDocumento: 'A', valorCents: 100 })).toBe('completa');
    expect(avisoReRegistro(vigente, { numeroDocumento: 'A', valorCents: 101 })).toBe('substitui');
    expect(avisoReRegistro(vigente, { numeroDocumento: 'B', valorCents: 100 })).toBe('substitui');
  });

  const ok: ParceriaForm = {
    profissionalContactId: 'emp-1', cota: '40,5', naturezaCota: 'ALUGUEL_BEM_MOVEL', homologadoEm: '2026-01-10',
    sindicato: ' Sindicato X ', vigenteDesde: '2026-01-15', vigenteAte: '',
  };

  it('item 10: cota % → bp, sindicato aparado, sem fim = null', () => {
    expect(toParceriaInput('u1', ok)).toEqual({
      ok: true,
      body: {
        unitId: 'u1', profissionalContactId: 'emp-1', cotaSalaoBp: 4050, naturezaCota: 'ALUGUEL_BEM_MOVEL', homologadoEm: '2026-01-10',
        sindicato: 'Sindicato X', vigenteDesde: '2026-01-15', vigenteAte: null,
      },
    });
  });

  it('item 10: cada campo obrigatório e os limites do DTO (bp 1..9999, vigência ordenada)', () => {
    expect(toParceriaInput('u1', parceriaVazia())).toEqual({ ok: false, error: 'profissional' });
    expect(toParceriaInput('u1', { ...ok, cota: '0' })).toEqual({ ok: false, error: 'cota' });
    expect(toParceriaInput('u1', { ...ok, cota: '100' })).toEqual({ ok: false, error: 'cota' });
    expect(toParceriaInput('u1', { ...ok, cota: '99,99' })).toMatchObject({ ok: true, body: { cotaSalaoBp: 9999 } });
    expect(toParceriaInput('u1', { ...ok, cota: '0,01' })).toMatchObject({ ok: true, body: { cotaSalaoBp: 1 } });
    expect(toParceriaInput('u1', { ...ok, naturezaCota: '' })).toEqual({ ok: false, error: 'natureza' });
    expect(toParceriaInput('u1', { ...ok, homologadoEm: '' })).toEqual({ ok: false, error: 'homologadoEm' });
    expect(toParceriaInput('u1', { ...ok, sindicato: '   ' })).toEqual({ ok: false, error: 'sindicato' });
    expect(toParceriaInput('u1', { ...ok, vigenteDesde: '2026-13-01' })).toEqual({ ok: false, error: 'vigenteDesde' });
    expect(toParceriaInput('u1', { ...ok, vigenteAte: '2026-01-14' })).toEqual({ ok: false, error: 'vigenteAte' });
    expect(toParceriaInput('u1', { ...ok, vigenteAte: '2026-01-15' })).toMatchObject({ ok: true, body: { vigenteAte: '2026-01-15' } });
  });

  it('item 10: o formulário de edição nasce da view', () => {
    expect(toParceriaForm({
      id: 'p1', unitId: 'u1', profissionalContactId: 'emp-1', cotaSalaoBp: 4050, naturezaCota: 'GESTAO', homologadoEm: '2026-01-10',
      sindicato: 'S', vigenteDesde: '2026-01-15', vigenteAte: null, createdAt: '', updatedAt: '',
    })).toEqual({ profissionalContactId: 'emp-1', cota: '40,50', naturezaCota: 'GESTAO', homologadoEm: '2026-01-10', sindicato: 'S', vigenteDesde: '2026-01-15', vigenteAte: '' });
  });
});

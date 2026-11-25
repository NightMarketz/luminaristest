import { canTransition, sourcesOf, terminalStates, assertTransition } from '../../../../lib/lifecycle';
import {
  PAYABLE_STATUSES,
  PAYABLE_TRANSITIONS,
  PAYABLE_SETTLEABLE_STATUSES,
  PAYABLE_OUTSTANDING_STATUSES,
  payableStatusForBalance,
} from '../Payable.model';
import { ValidationError } from '../../../../lib/errors';

// PRE-ADR-LIFECYCLE-TRANSITIONS (piloto): a tabela declarada e as constantes que os CAS usam não podem divergir.
describe('PAYABLE_TRANSITIONS', () => {
  it('declara todo status e só status conhecidos', () => {
    expect(Object.keys(PAYABLE_TRANSITIONS).sort()).toEqual([...PAYABLE_STATUSES].sort());
  });

  it('o claim do sum-CAS parte exatamente de PAYABLE_SETTLEABLE_STATUSES', () => {
    expect(sourcesOf(PAYABLE_TRANSITIONS, 'PAYING').sort()).toEqual([...PAYABLE_SETTLEABLE_STATUSES].sort());
  });

  it('CANCELLED é o único terminal; nenhum status em aberto é terminal', () => {
    expect(terminalStates(PAYABLE_TRANSITIONS)).toEqual(['CANCELLED']);
    for (const s of PAYABLE_OUTSTANDING_STATUSES) expect(terminalStates(PAYABLE_TRANSITIONS)).not.toContain(s);
  });

  it('todo resultado de payableStatusForBalance é alcançável a partir de PAYING (finalize + revertClaim)', () => {
    for (const [paid, amount] of [[0, 100], [40, 100], [100, 100]]) {
      expect(canTransition(PAYABLE_TRANSITIONS, 'PAYING', payableStatusForBalance(paid, amount))).toBe(true);
    }
  });

  it('nada sai de CANCELLED e DEFERRED só reabre em OPEN', () => {
    for (const s of PAYABLE_STATUSES) {
      if (s !== 'CANCELLED') expect(canTransition(PAYABLE_TRANSITIONS, 'CANCELLED', s)).toBe(false);
    }
    expect(sourcesOf(PAYABLE_TRANSITIONS, 'DEFERRED')).toEqual(['OPEN']);
    expect(PAYABLE_TRANSITIONS.DEFERRED).toEqual(['OPEN']);
  });

  it('assertTransition recusa com ValidationError; X → X não é implícito', () => {
    expect(() => assertTransition(PAYABLE_TRANSITIONS, 'CANCELLED', 'OPEN', 'Conta a pagar')).toThrow(ValidationError);
    expect(() => assertTransition(PAYABLE_TRANSITIONS, 'OPEN', 'PAYING', 'Conta a pagar')).not.toThrow();
    expect(canTransition(PAYABLE_TRANSITIONS, 'OPEN', 'OPEN')).toBe(false);
  });

  // BE-INCR-CANCELAMENTO-CANCELLING PR-0 (0.2, F-CX-2 a): a intenção de cancelar só avança.
  it('CANCELLING só avança para CANCELLED (rejeita CANCELLING → OPEN/PAID/PARTIALLY_PAID/PAYING)', () => {
    expect(PAYABLE_TRANSITIONS.CANCELLING).toEqual(['CANCELLED']);
    for (const to of ['OPEN', 'PARTIALLY_PAID', 'PAYING', 'PAID', 'DEFERRED'] as const) {
      expect(canTransition(PAYABLE_TRANSITIONS, 'CANCELLING', to)).toBe(false);
    }
    expect(() => assertTransition(PAYABLE_TRANSITIONS, 'CANCELLING', 'OPEN', 'Conta a pagar')).toThrow(ValidationError);
  });

  it('só OPEN, PARTIALLY_PAID e PAID abrem CANCELLING; título em baixa em trânsito (PAYING) não', () => {
    expect(sourcesOf(PAYABLE_TRANSITIONS, 'CANCELLING').sort()).toEqual(['OPEN', 'PAID', 'PARTIALLY_PAID']);
  });

  it('CANCELLING não é liquidável (escrita nova morta) mas segue "em aberto" para a leitura (F-CX-3 a: vivo para razão/fiscal, morto para escrita)', () => {
    expect(PAYABLE_SETTLEABLE_STATUSES).not.toContain('CANCELLING');
    expect(PAYABLE_OUTSTANDING_STATUSES).toContain('CANCELLING');
  });
});

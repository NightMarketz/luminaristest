import { canTransition, sourcesOf, terminalStates } from '../../../../lib/lifecycle';
import {
  RECEIVABLE_STATUSES,
  RECEIVABLE_TRANSITIONS,
  RECEIVABLE_SETTLEABLE_STATUSES,
  RECEIVABLE_OUTSTANDING_STATUSES,
  receivableStatusForBalance,
} from '../Receivable.model';

// PRE-ADR-LIFECYCLE-TRANSITIONS §4 item 1: a tabela declarada e as constantes que os CAS usam não podem divergir.
describe('RECEIVABLE_TRANSITIONS', () => {
  it('declara todo status e só status conhecidos', () => {
    expect(Object.keys(RECEIVABLE_TRANSITIONS).sort()).toEqual([...RECEIVABLE_STATUSES].sort());
  });

  it('o claim do sum-CAS parte exatamente de RECEIVABLE_SETTLEABLE_STATUSES', () => {
    expect(sourcesOf(RECEIVABLE_TRANSITIONS, 'RECEIVING').sort()).toEqual([...RECEIVABLE_SETTLEABLE_STATUSES].sort());
  });

  it('CANCELLED é o único terminal (RECEIVED reabre no estorno); nenhum status em aberto é terminal', () => {
    expect(terminalStates(RECEIVABLE_TRANSITIONS)).toEqual(['CANCELLED']);
    for (const s of RECEIVABLE_OUTSTANDING_STATUSES) expect(terminalStates(RECEIVABLE_TRANSITIONS)).not.toContain(s);
  });

  it('todo resultado de receivableStatusForBalance é alcançável a partir de RECEIVING (finalize + revertClaim)', () => {
    for (const [received, amount] of [[0, 100], [40, 100], [100, 100]]) {
      expect(canTransition(RECEIVABLE_TRANSITIONS, 'RECEIVING', receivableStatusForBalance(received, amount))).toBe(true);
    }
  });

  it('o estorno de recebimento nunca recalcula para RECEIVED nem sai de CANCELLED', () => {
    expect(canTransition(RECEIVABLE_TRANSITIONS, 'RECEIVED', 'RECEIVED')).toBe(false);
    expect(sourcesOf(RECEIVABLE_TRANSITIONS, 'CANCELLED')).toEqual(['OPEN']);
    for (const s of RECEIVABLE_STATUSES) expect(canTransition(RECEIVABLE_TRANSITIONS, 'CANCELLED', s)).toBe(false);
  });
});

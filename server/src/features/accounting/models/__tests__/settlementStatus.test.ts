/**
 * BE-INCR-PARTIAL-SETTLEMENT — item 3 do BRIEF (forma dos arrays de status) + a função pura que
 * decide o status pelo saldo (F-PS2 → a / F-PS3 → a), usada por finalize, estorno e revert.
 */
import { ValidationError } from '../../../../lib/errors';
import {
  PAYABLE_OUTSTANDING_STATUSES,
  PAYABLE_SETTLEABLE_STATUSES,
  PAYABLE_STATUSES,
  payableStatusForBalance,
} from '../Payable.model';
import {
  RECEIVABLE_OUTSTANDING_STATUSES,
  RECEIVABLE_SETTLEABLE_STATUSES,
  RECEIVABLE_STATUSES,
  receivableStatusForBalance,
} from '../Receivable.model';

describe('status arrays (BRIEF item 3)', () => {
  it('PARTIALLY_PAID entra entre OPEN e PAYING; OUTSTANDING e SETTLEABLE o incluem; terminais ficam fora', () => {
    expect(PAYABLE_STATUSES).toEqual(['OPEN', 'PARTIALLY_PAID', 'PAYING', 'PAID', 'CANCELLED']);
    expect(PAYABLE_OUTSTANDING_STATUSES).toEqual(['OPEN', 'PARTIALLY_PAID', 'PAYING']);
    expect(PAYABLE_SETTLEABLE_STATUSES).toEqual(['OPEN', 'PARTIALLY_PAID']);
    expect(PAYABLE_OUTSTANDING_STATUSES).not.toContain('PAID');
    expect(PAYABLE_SETTLEABLE_STATUSES).not.toContain('PAYING'); // in flight is not settleable again
  });

  it('espelho AR', () => {
    expect(RECEIVABLE_STATUSES).toEqual(['OPEN', 'PARTIALLY_RECEIVED', 'RECEIVING', 'RECEIVED', 'CANCELLED']);
    expect(RECEIVABLE_OUTSTANDING_STATUSES).toEqual(['OPEN', 'PARTIALLY_RECEIVED', 'RECEIVING']);
    expect(RECEIVABLE_SETTLEABLE_STATUSES).toEqual(['OPEN', 'PARTIALLY_RECEIVED']);
  });
});

describe('payableStatusForBalance / receivableStatusForBalance (F-PS2 a, F-PS3 a)', () => {
  it.each([
    [0, 50000, 'OPEN'],
    [1, 50000, 'PARTIALLY_PAID'],
    [49999, 50000, 'PARTIALLY_PAID'],
    [50000, 50000, 'PAID'],
  ])('paidCents %i de %i → %s', (paid, amount, expected) => {
    expect(payableStatusForBalance(paid, amount)).toBe(expected);
  });

  it('REJEITA saldo negativo ou acima do total (guarda defensiva — invariante paidCents ≤ amountCents)', () => {
    expect(() => payableStatusForBalance(-1, 50000)).toThrow(ValidationError);
    expect(() => payableStatusForBalance(50001, 50000)).toThrow(ValidationError);
    expect(() => receivableStatusForBalance(50001, 50000)).toThrow(ValidationError);
  });

  it('espelho AR: 0 → OPEN, parcial → PARTIALLY_RECEIVED, total → RECEIVED', () => {
    expect(receivableStatusForBalance(0, 100)).toBe('OPEN');
    expect(receivableStatusForBalance(40, 100)).toBe('PARTIALLY_RECEIVED');
    expect(receivableStatusForBalance(100, 100)).toBe('RECEIVED');
  });
});

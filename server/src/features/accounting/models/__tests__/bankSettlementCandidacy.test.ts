import {
  BANK_SETTLEMENT_CHARGE_CAP_BP,
  pickCandidate,
  type CandidateTitle,
} from '../BankSettlement.model';

/** BE-INCR-BANK-SETTLEMENT item 3 — regra de candidatura pura (F-F7-5 a: cap 20% do saldo). */
const D = (s: string) => new Date(`${s}T00:00:00.000Z`);
const title = (over: Partial<CandidateTitle> = {}): CandidateTitle => ({
  id: 'p1',
  titleType: 'PAYABLE',
  dueDate: D('2026-06-20'),
  openCents: 10000,
  documentNumber: null,
  ...over,
});
const line = (amountCents: number, over: Partial<{ date: Date; externalRef: string | null }> = {}) => ({
  amountCents,
  date: D('2026-06-18'),
  externalRef: null,
  ...over,
});

describe('pickCandidate — fixture literal do BRIEF (exata / parcial / com encargo / fora da janela)', () => {
  it('|line| === saldo → baixa exata, charge 0', () => {
    expect(pickCandidate(line(-10000), [title()])).toEqual({ outcome: 'one', title: title(), proposedCents: 10000, chargeCents: 0 });
  });

  it('|line| < saldo → baixa PARCIAL (#307), charge 0', () => {
    const r = pickCandidate(line(-7000), [title()]);
    expect(r.outcome).toBe('one');
    expect(r.proposedCents).toBe(7000);
    expect(r.chargeCents).toBe(0);
  });

  it('saldo < |line| ≤ saldo + 20% → baixa total + encargo = diferença (F-F7-5 a)', () => {
    const r = pickCandidate(line(-11500), [title()]);
    expect(r).toEqual({ outcome: 'one', title: title(), proposedCents: 10000, chargeCents: 1500 });
  });

  it('|line| > saldo + cap → none (o humano concilia à mão)', () => {
    const cap = Math.floor((10000 * BANK_SETTLEMENT_CHARGE_CAP_BP) / 10000);
    expect(pickCandidate(line(-(10000 + cap + 1)), [title()]).outcome).toBe('none');
    expect(pickCandidate(line(-(10000 + cap)), [title()]).outcome).toBe('one'); // borda inclusiva
  });

  it('vencimento fora de [line − 30d, line + 5d] → none', () => {
    expect(pickCandidate(line(-10000), [title({ dueDate: D('2026-05-18') })]).outcome).toBe('none'); // −31d
    expect(pickCandidate(line(-10000), [title({ dueDate: D('2026-06-24') })]).outcome).toBe('none'); // +6d
    expect(pickCandidate(line(-10000), [title({ dueDate: D('2026-05-19') })]).outcome).toBe('one'); // −30d
    expect(pickCandidate(line(-10000), [title({ dueDate: D('2026-06-23') })]).outcome).toBe('one'); // +5d
  });

  it('dois candidatos elegíveis sem desempate → ambiguous', () => {
    expect(pickCandidate(line(-10000), [title({ id: 'a' }), title({ id: 'b' })]).outcome).toBe('ambiguous');
  });

  it('desempate por documentNumber === line.externalRef (insumo §4.2) — escolhe o casado', () => {
    const r = pickCandidate(line(-10000, { externalRef: 'NF-77' }), [title({ id: 'a' }), title({ id: 'b', documentNumber: 'NF-77' })]);
    expect(r.outcome).toBe('one');
    expect(r.title?.id).toBe('b');
  });

  it('desempate empatado (dois com o mesmo documentNumber) continua ambiguous', () => {
    const r = pickCandidate(line(-10000, { externalRef: 'NF-77' }), [title({ id: 'a', documentNumber: 'NF-77' }), title({ id: 'b', documentNumber: 'NF-77' })]);
    expect(r.outcome).toBe('ambiguous');
  });

  it('linha zero ou título com saldo zero → none', () => {
    expect(pickCandidate(line(0), [title()]).outcome).toBe('none');
    expect(pickCandidate(line(-10000), [title({ openCents: 0 })]).outcome).toBe('none');
  });
});

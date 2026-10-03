import {
  expiryCompetence,
  expiryMovementKey,
  isDueForExpiry,
  isExpiredForConsumption,
  lastValidDay,
  parseExpiryMovementKey,
} from '../validity';

describe('lastValidDay (item 1)', () => {
  it('null/0 = sem validade', () => {
    expect(lastValidDay('2026-03-01', null)).toBeNull();
    expect(lastValidDay('2026-03-01', 0)).toBeNull();
  });
  it('venda 01/03 + 30 → usa até 31/03 (CC 132 caput)', () => {
    expect(lastValidDay('2026-03-01', 30)).toBe('2026-03-31');
  });
  it('vira mês, ano e passa por 29/02', () => {
    expect(lastValidDay('2026-01-31', 1)).toBe('2026-02-01');
    expect(lastValidDay('2026-12-15', 30)).toBe('2027-01-14');
    expect(lastValidDay('2028-02-28', 1)).toBe('2028-02-29');
    expect(lastValidDay('2028-02-29', 1)).toBe('2028-03-01');
  });
  it('recusa prazo negativo/fracionário e data impossível', () => {
    expect(() => lastValidDay('2026-03-01', -1)).toThrow();
    expect(() => lastValidDay('2026-03-01', 1.5)).toThrow();
    expect(() => lastValidDay('2026-02-30', 1)).toThrow();
  });
});

describe('carência (item 8): pré-check recusa em +1, job vence em +2', () => {
  const expiresOn = '2026-03-31';
  it('dia expiresOn: consome, não vence', () => {
    expect(isExpiredForConsumption(expiresOn, '2026-03-31')).toBe(false);
    expect(isDueForExpiry(expiresOn, '2026-03-31')).toBe(false);
  });
  it('dia +1: pré-check recusa, job ainda não vence', () => {
    expect(isExpiredForConsumption(expiresOn, '2026-04-01')).toBe(true);
    expect(isDueForExpiry(expiresOn, '2026-04-01')).toBe(false);
  });
  it('dia +2: job vence', () => {
    expect(isDueForExpiry(expiresOn, '2026-04-02')).toBe(true);
  });
  it('sem validade nunca vence', () => {
    expect(isExpiredForConsumption(null, '2099-01-01')).toBe(false);
    expect(isDueForExpiry(null, '2099-01-01')).toBe(false);
  });
});

describe('competência e chave', () => {
  it('F-PV-5 a: expiresOn + 1 — na virada do ano vira receita de 01/01', () => {
    expect(expiryCompetence('2026-12-31')).toBe('2027-01-01');
  });
  it('chave round-trip', () => {
    const key = expiryMovementKey('cbal123', '2026-03-31');
    expect(key).toBe('expiry:cbal123:2026-03-31');
    expect(parseExpiryMovementKey(key)).toEqual({ balanceId: 'cbal123', expiresOn: '2026-03-31' });
    expect(parseExpiryMovementKey('sale-1')).toBeNull();
  });
});

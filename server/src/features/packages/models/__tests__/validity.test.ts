import {
  expiryCompetence,
  expiryMovementKey,
  isDueForExpiry,
  isExpiredForConsumption,
  isNationalHoliday,
  lastValidDay,
  parseExpiryMovementKey,
} from '../validity';

import { FERIADOS_SEMENTE } from '@test/helpers/legalParams';
describe('lastValidDay (item 1)', () => {
  it('null/0 = sem validade', () => {
    expect(lastValidDay('2026-03-01', null, FERIADOS_SEMENTE)).toBeNull();
    expect(lastValidDay('2026-03-01', 0, FERIADOS_SEMENTE)).toBeNull();
  });
  it('venda 01/03 + 30 → usa até 31/03 (CC 132 caput)', () => {
    expect(lastValidDay('2026-03-01', 30, FERIADOS_SEMENTE)).toBe('2026-03-31');
  });
  it('vira mês, ano e passa por 29/02', () => {
    expect(lastValidDay('2026-01-31', 1, FERIADOS_SEMENTE)).toBe('2026-02-01');
    expect(lastValidDay('2026-12-15', 30, FERIADOS_SEMENTE)).toBe('2027-01-14');
    expect(lastValidDay('2028-02-28', 1, FERIADOS_SEMENTE)).toBe('2028-02-29');
    expect(lastValidDay('2028-02-29', 1, FERIADOS_SEMENTE)).toBe('2028-03-01');
  });
  it('recusa prazo negativo/fracionário e data impossível', () => {
    expect(() => lastValidDay('2026-03-01', -1, FERIADOS_SEMENTE)).toThrow();
    expect(() => lastValidDay('2026-03-01', 1.5, FERIADOS_SEMENTE)).toThrow();
    expect(() => lastValidDay('2026-02-30', 1, FERIADOS_SEMENTE)).toThrow();
  });
});

describe('feriado nacional prorroga o último dia (CC 132 § 1º, F-JUR-6)', () => {
  it('cai em 25/12 → 26/12', () => {
    expect(lastValidDay('2026-11-25', 30, FERIADOS_SEMENTE)).toBe('2026-12-26'); // 25/12/2026 é sexta
  });
  it('feriado seguido de domingo pula o domingo: 15/11/2025 (sábado) → 17/11', () => {
    // 15/11/2025 é sábado, 16/11 domingo → 1º dia útil = segunda 17/11
    expect(lastValidDay('2025-10-16', 30, FERIADOS_SEMENTE)).toBe('2025-11-17');
  });
  it('20/11 (Consciência Negra, feriado nacional ≥ 2024) numa sexta → o último dia vai para o sábado 21/11 (útil)', () => {
    expect(lastValidDay('2026-10-21', 30, FERIADOS_SEMENTE)).toBe('2026-11-21'); // 20/11/2026 sexta → 21/11 sábado (útil)
  });
  it('dia comum e domingo comum não mudam', () => {
    expect(lastValidDay('2026-03-01', 30, FERIADOS_SEMENTE)).toBe('2026-03-31');
    expect(lastValidDay('2026-03-01', 4, FERIADOS_SEMENTE)).toBe('2026-03-05');
    expect(lastValidDay('2026-02-01', 7, FERIADOS_SEMENTE)).toBe('2026-02-08'); // domingo, não é feriado
  });
  it('lista fixa da lei; Sexta-feira da Paixão e Carnaval fora; 20/11 só a partir de 2024', () => {
    for (const d of ['01-01', '04-21', '05-01', '09-07', '10-12', '11-02', '11-15', '12-25']) {
      expect(isNationalHoliday(`2027-${d}`, FERIADOS_SEMENTE)).toBe(true);
    }
    expect(isNationalHoliday('2026-04-03', FERIADOS_SEMENTE)).toBe(false); // Sexta-feira da Paixão 2026
    expect(isNationalHoliday('2026-02-17', FERIADOS_SEMENTE)).toBe(false); // Carnaval 2026
    expect(isNationalHoliday('2024-11-20', FERIADOS_SEMENTE)).toBe(true);
    expect(isNationalHoliday('2023-11-20', FERIADOS_SEMENTE)).toBe(false);
  });
  it('domingos de eleição (1º e último de outubro, anos pares) são feriado; ímpar não', () => {
    expect(isNationalHoliday('2026-10-04', FERIADOS_SEMENTE)).toBe(true); // 1º turno 2026
    expect(isNationalHoliday('2026-10-25', FERIADOS_SEMENTE)).toBe(true); // 2º turno 2026
    expect(isNationalHoliday('2026-10-11', FERIADOS_SEMENTE)).toBe(false); // domingo do meio
    expect(isNationalHoliday('2027-10-03', FERIADOS_SEMENTE)).toBe(false); // ano ímpar
    expect(lastValidDay('2026-09-04', 30, FERIADOS_SEMENTE)).toBe('2026-10-05'); // vence no domingo de eleição → segunda
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
    expect(parseExpiryMovementKey(key)).toEqual({ balanceId: 'cbal123', expiresOn: '2026-03-31', occurrence: 1 });
    expect(parseExpiryMovementKey('sale-1')).toBeNull();
  });
  it('review #483 achado 3: 2ª ocorrência na mesma data ganha sufixo; :0/:1 não são forma válida', () => {
    expect(expiryMovementKey('cbal123', '2026-03-31', 1)).toBe('expiry:cbal123:2026-03-31');
    expect(expiryMovementKey('cbal123', '2026-03-31', 2)).toBe('expiry:cbal123:2026-03-31:2');
    expect(parseExpiryMovementKey('expiry:cbal123:2026-03-31:2')).toEqual({ balanceId: 'cbal123', expiresOn: '2026-03-31', occurrence: 2 });
    expect(parseExpiryMovementKey('expiry:cbal123:2026-03-31:12')).toMatchObject({ occurrence: 12 });
    expect(parseExpiryMovementKey('expiry:cbal123:2026-03-31:1')).toBeNull();
    expect(parseExpiryMovementKey('expiry:cbal123:2026-03-31:0')).toBeNull();
  });
});

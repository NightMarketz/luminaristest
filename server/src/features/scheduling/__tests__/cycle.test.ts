import { addDays, dayOfCycle } from '../models/cycle';

/** BE-INCR-ESCALA-BASE item 2 — dia do ciclo por número de dia. */
describe('dayOfCycle (item 2)', () => {
  it('n = 7 com âncora numa segunda: segunda = 1, domingo = 7', () => {
    expect(dayOfCycle('2024-01-01', '2024-01-01', 7)).toBe(1);
    expect(dayOfCycle('2026-11-23', '2024-01-01', 7)).toBe(1); // segunda-feira
    expect(dayOfCycle('2026-11-29', '2024-01-01', 7)).toBe(7); // domingo
  });

  it('data antes da âncora continua no ciclo (mod positivo)', () => {
    expect(dayOfCycle('2023-12-31', '2024-01-01', 7)).toBe(7); // domingo antes da segunda-âncora
    expect(dayOfCycle('2023-12-25', '2024-01-01', 7)).toBe(1); // segunda, uma semana antes
    expect(dayOfCycle('2024-01-01', '2024-01-03', 2)).toBe(1);
    expect(dayOfCycle('2024-01-02', '2024-01-03', 2)).toBe(2);
  });

  it('n = 1: todo dia é o dia 1', () => {
    expect(dayOfCycle('2026-02-28', '2024-01-01', 1)).toBe(1);
    expect(dayOfCycle('1999-07-15', '2024-01-01', 1)).toBe(1);
  });

  it('n = 56: o dia 56 é o último, e o seguinte volta ao 1', () => {
    expect(dayOfCycle(addDays('2024-01-01', 55), '2024-01-01', 56)).toBe(56);
    expect(dayOfCycle(addDays('2024-01-01', 56), '2024-01-01', 56)).toBe(1);
    expect(dayOfCycle(addDays('2024-01-01', -1), '2024-01-01', 56)).toBe(56);
  });

  it('não depende do fuso do processo (cruza fim de mês e ano bissexto)', () => {
    expect(addDays('2024-02-28', 1)).toBe('2024-02-29');
    expect(addDays('2024-12-31', 1)).toBe('2025-01-01');
  });
});

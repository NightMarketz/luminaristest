/**
 * cashFlowReport.dto — barreira do achado R3 F3 (`fronteira-de-dto-quase-nao-testada`).
 *
 * Sem mutação nomeada no AV-R3, mas com a MESMA invariante que a M7 derrubou em aging.dto:
 * `asOf` é data-only validada por `isValidDateOnly` (regex + round-trip). Aqui a consequência
 * é mais dura que no aging — `asOf` define a janela year-to-date (1º-jan → asOf), então uma
 * data que rola para frente move o fecho do exercício.
 */
import { CashFlowStatementQuerySchema } from '../cashFlowReport.dto';

const valid = { unitId: 'unit-1', asOf: '2026-06-30' };

describe('CashFlowStatementQuerySchema', () => {
  it('accepts a well-formed payload (CONTROLE)', () => {
    expect(CashFlowStatementQuerySchema.safeParse(valid).success).toBe(true);
  });

  it('rejects a non-calendar date (round-trip, não regex nu)', () => {
    expect(CashFlowStatementQuerySchema.safeParse({ ...valid, asOf: '2026-02-30' }).success).toBe(false);
    expect(CashFlowStatementQuerySchema.safeParse({ ...valid, asOf: '2026-09-31' }).success).toBe(false);
  });

  it('accepts 2024-02-29 (bissexto real)', () => {
    expect(CashFlowStatementQuerySchema.safeParse({ ...valid, asOf: '2024-02-29' }).success).toBe(true);
  });

  it('rejects asOf ausente (aqui é OBRIGATÓRIA — contraste deliberado com aging.dto)', () => {
    expect(CashFlowStatementQuerySchema.safeParse({ unitId: 'unit-1' }).success).toBe(false);
  });

  it('rejects datetime e forma inválida', () => {
    expect(CashFlowStatementQuerySchema.safeParse({ ...valid, asOf: '2026-06-30T12:00:00-03:00' }).success).toBe(false);
    expect(CashFlowStatementQuerySchema.safeParse({ ...valid, asOf: '30/06/2026' }).success).toBe(false);
  });

  it('rejects unitId vazio e unknown keys (.strict)', () => {
    expect(CashFlowStatementQuerySchema.safeParse({ ...valid, unitId: '' }).success).toBe(false);
    expect(CashFlowStatementQuerySchema.safeParse({ ...valid, from: '2026-01-01' }).success).toBe(false);
  });
});

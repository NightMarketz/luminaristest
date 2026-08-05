/**
 * dailyJournal.dto — barreira do achado R3 F3 (`fronteira-de-dto-quase-nao-testada`).
 *
 * Duas invariantes na mesma fronteira: `from`/`to` são data-only validadas por
 * `isValidDateOnly` (round-trip de calendário), e a ORDEM `from <= to` é fechada por
 * superRefine. A segunda é o caso que um teste de forma sozinho não pega: duas datas
 * individualmente válidas e invertidas produziriam um Livro Diário vazio sem erro.
 */
import { DailyJournalRequestSchema } from '../dailyJournal.dto';

const valid = { unitId: 'unit-1', from: '2026-01-01', to: '2026-01-31' };

describe('DailyJournalRequestSchema', () => {
  it('accepts a well-formed window (CONTROLE)', () => {
    expect(DailyJournalRequestSchema.safeParse(valid).success).toBe(true);
  });

  it('accepts from === to (um único dia é janela legítima, não off-by-one)', () => {
    expect(DailyJournalRequestSchema.safeParse({ ...valid, to: '2026-01-01' }).success).toBe(true);
  });

  it('rejects from > to (janela invertida — as duas datas são válidas isoladamente)', () => {
    const parsed = DailyJournalRequestSchema.safeParse({ ...valid, from: '2026-02-01', to: '2026-01-01' });
    expect(parsed.success).toBe(false);
    // Controle de DISCRIMINAÇÃO: falha pelo motivo certo, não por harness quebrado.
    if (!parsed.success) {
      expect(parsed.error.issues.some((i) => i.path[0] === 'from')).toBe(true);
    }
  });

  it('rejects non-calendar dates em qualquer das duas pontas', () => {
    expect(DailyJournalRequestSchema.safeParse({ ...valid, from: '2026-02-30' }).success).toBe(false);
    expect(DailyJournalRequestSchema.safeParse({ ...valid, to: '2026-11-31' }).success).toBe(false);
  });

  it('rejects datetime, forma inválida e campo ausente', () => {
    expect(DailyJournalRequestSchema.safeParse({ ...valid, to: '2026-01-31T23:59:59Z' }).success).toBe(false);
    expect(DailyJournalRequestSchema.safeParse({ ...valid, from: '2026-1-1' }).success).toBe(false);
    expect(DailyJournalRequestSchema.safeParse({ unitId: 'unit-1', from: '2026-01-01' }).success).toBe(false);
  });

  it('rejects unitId vazio e unknown keys (.strict)', () => {
    expect(DailyJournalRequestSchema.safeParse({ ...valid, unitId: '' }).success).toBe(false);
    expect(DailyJournalRequestSchema.safeParse({ ...valid, unitid: 'unit-1' }).success).toBe(false);
  });
});

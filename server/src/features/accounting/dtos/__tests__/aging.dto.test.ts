/**
 * aging.dto — barreira do achado R3 F3 (`fronteira-de-dto-quase-nao-testada`).
 *
 * Mutação NOMEADA: M7 do AV-R3 (`aging.dto.ts:35`, `refine(isValidDateOnly)` removido)
 * sobreviveu porque `isValidDateOnly` só era exercitado num teste de reconciliação — a
 * FIAÇÃO neste DTO nunca era tocada. Os casos de calendário abaixo são o que mata M7.
 *
 * Sem o refine, `asOf` cai para `z.string()` puro: '2026-02-30' passaria, o service faria
 * `new Date('2026-02-30')` → 03-02, e a data-base do aging deslocaria dois dias sem erro.
 */
import { AgingReportQuerySchema } from '../aging.dto';

const valid = { unitId: 'unit-1', kind: 'payable' as const, asOf: '2026-06-30' };

describe('AgingReportQuerySchema', () => {
  it('accepts a well-formed payload (CONTROLE)', () => {
    expect(AgingReportQuerySchema.safeParse(valid).success).toBe(true);
  });

  it('accepts asOf ausente (default hoje é do service, não do DTO)', () => {
    expect(AgingReportQuerySchema.safeParse({ unitId: 'unit-1', kind: 'receivable' }).success).toBe(true);
  });

  it('rejects a non-calendar date que o regex sozinho aceitaria (mata M7 do AV-R3)', () => {
    // new Date('2026-02-30') rola para 2026-03-02 em silêncio; só o round-trip pega.
    expect(AgingReportQuerySchema.safeParse({ ...valid, asOf: '2026-02-30' }).success).toBe(false);
    expect(AgingReportQuerySchema.safeParse({ ...valid, asOf: '2026-04-31' }).success).toBe(false);
    expect(AgingReportQuerySchema.safeParse({ ...valid, asOf: '2025-02-29' }).success).toBe(false);
  });

  it('accepts 2024-02-29 (ano bissexto real — a regra é calendário, não "fevereiro tem 28")', () => {
    expect(AgingReportQuerySchema.safeParse({ ...valid, asOf: '2024-02-29' }).success).toBe(true);
  });

  it('rejects forma errada de data (mês 13, dia 99, datetime, vazio)', () => {
    expect(AgingReportQuerySchema.safeParse({ ...valid, asOf: '2026-13-01' }).success).toBe(false);
    expect(AgingReportQuerySchema.safeParse({ ...valid, asOf: '2026-06-99' }).success).toBe(false);
    expect(AgingReportQuerySchema.safeParse({ ...valid, asOf: '2026-06-30T00:00:00Z' }).success).toBe(false);
    expect(AgingReportQuerySchema.safeParse({ ...valid, asOf: '' }).success).toBe(false);
  });

  it('rejects kind fora do par fechado payable|receivable', () => {
    expect(AgingReportQuerySchema.safeParse({ ...valid, kind: 'both' }).success).toBe(false);
    expect(AgingReportQuerySchema.safeParse({ unitId: 'unit-1', asOf: '2026-06-30' }).success).toBe(false);
  });

  it('rejects unitId vazio (chave de escopo)', () => {
    expect(AgingReportQuerySchema.safeParse({ ...valid, unitId: '' }).success).toBe(false);
  });

  it('rejects unknown keys (.strict — param com typo é 400, não descarte silencioso)', () => {
    expect(AgingReportQuerySchema.safeParse({ ...valid, asof: '2026-06-30' }).success).toBe(false);
  });
});

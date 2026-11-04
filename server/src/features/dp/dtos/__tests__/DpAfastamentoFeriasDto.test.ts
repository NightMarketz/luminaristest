/**
 * BE-INCR-DP-F0-F1 itens 56, 58 e 59 (PR-6) — contrato dos DTOs do afastamento e das férias: `.strict()`, motivo de 2
 * dígitos, data com calendário, fim ≥ início, dias gozados 0..30 e PATCH parcial SEM default.
 */
import {
  CreateAfastamentoSchema,
  CreateFeriasImplantacaoSchema,
  DpFeriasQuerySchema,
  UpdateAfastamentoSchema,
  UpdateFeriasImplantacaoSchema,
} from '../DpAfastamentoFeriasDto';

const ok = (s: { safeParse: (v: unknown) => { success: boolean } }, v: unknown) => s.safeParse(v).success;

describe('DpAfastamentoFeriasDto (PR-6)', () => {
  it('item 56 — afastamento: motivo de 2 dígitos, datas reais, fim ≥ início, sem CID nem campo extra', () => {
    expect(CreateAfastamentoSchema.parse({ unitId: 'u', motivo: '01', inicio: '2026-03-01' })).toEqual({ unitId: 'u', motivo: '01', inicio: '2026-03-01' });
    expect(ok(CreateAfastamentoSchema, { unitId: 'u', motivo: '1', inicio: '2026-03-01' })).toBe(false);
    expect(ok(CreateAfastamentoSchema, { unitId: 'u', motivo: '01', inicio: '2026-02-30' })).toBe(false);
    expect(ok(CreateAfastamentoSchema, { unitId: 'u', motivo: '01', inicio: '2026-03-02', fim: '2026-03-01' })).toBe(false);
    expect(ok(CreateAfastamentoSchema, { unitId: 'u', motivo: '01', inicio: '2026-03-01', cid: 'J11' })).toBe(false);
    expect(ok(CreateAfastamentoSchema, { unitId: 'u', motivo: '01', inicio: '2026-03-01', fim: null })).toBe(false);
  });

  it('item 56 — PATCH do afastamento sem default: ausente fica ausente; null reabre/apaga; vazio ⇒ falha', () => {
    expect(UpdateAfastamentoSchema.parse({ unitId: 'u', fim: null })).toEqual({ unitId: 'u', fim: null });
    expect(UpdateAfastamentoSchema.parse({ unitId: 'u', observacao: null })).toEqual({ unitId: 'u', observacao: null });
    expect(ok(UpdateAfastamentoSchema, { unitId: 'u' })).toBe(false);
    expect(ok(UpdateAfastamentoSchema, { unitId: 'u', inicio: '2026-03-02', fim: '2026-03-01' })).toBe(false);
  });

  it('item 58 — implantação: dias 0..30 inteiros, fonte obrigatória, aquisitivo não muda no PATCH', () => {
    const base = { unitId: 'u', aquisitivoInicio: '2025-03-01', diasGozados: 30, fonte: 'ficha' };
    expect(ok(CreateFeriasImplantacaoSchema, base)).toBe(true);
    expect(ok(CreateFeriasImplantacaoSchema, { ...base, diasGozados: 31 })).toBe(false);
    expect(ok(CreateFeriasImplantacaoSchema, { ...base, diasGozados: -1 })).toBe(false);
    expect(ok(CreateFeriasImplantacaoSchema, { ...base, diasGozados: 1.5 })).toBe(false);
    expect(ok(CreateFeriasImplantacaoSchema, { ...base, fonte: ' ' })).toBe(false);
    expect(UpdateFeriasImplantacaoSchema.parse({ unitId: 'u', diasGozados: 0 })).toEqual({ unitId: 'u', diasGozados: 0 });
    expect(ok(UpdateFeriasImplantacaoSchema, { unitId: 'u', aquisitivoInicio: '2026-03-01' })).toBe(false);
    expect(ok(UpdateFeriasImplantacaoSchema, { unitId: 'u' })).toBe(false);
  });

  it('item 59 — a consulta de férias exige dataRef real', () => {
    expect(ok(DpFeriasQuerySchema, { unitId: 'u', dataRef: '2026-03-01' })).toBe(true);
    expect(ok(DpFeriasQuerySchema, { unitId: 'u' })).toBe(false);
    expect(ok(DpFeriasQuerySchema, { unitId: 'u', dataRef: '2026-13-01' })).toBe(false);
  });
});

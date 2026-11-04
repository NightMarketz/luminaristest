/**
 * BE-INCR-DP-F0-F1 itens 37, 39, 43, 45 e 46 (PR-4) — contrato dos DTOs do trabalhador, do vínculo e das versões:
 * `.strict()`, CPF com DV, `undSalFixo` fechado, teto de centavos e PATCH parcial SEM default.
 */
import { MAX_CENTS } from '../../../accounting/models/money';
import {
  CorrigirVersaoSchema,
  CreateTrabalhadorSchema,
  CreateVersaoSchema,
  CreateVinculoSchema,
  UpdateTrabalhadorSchema,
} from '../DpVinculoDto';

const CUID = 'ckq1x2y3z0000abcd1234efgh';
const CPF = '52998224725';
const versao = { lotacaoId: CUID, cargoId: CUID, jornadaId: CUID, salarioCents: '300000', unidadeSalario: '5' };

describe('DpVinculoDto (PR-4)', () => {
  it('item 37 — trabalhador: CPF com DV, pcd default false no create, campo extra ⇒ falha', () => {
    const ok = CreateTrabalhadorSchema.parse({ unitId: 'u', cpf: CPF, nome: 'Ana', nascimento: '2000-01-31' });
    expect(ok.pcd).toBe(false);
    expect(CreateTrabalhadorSchema.safeParse({ unitId: 'u', cpf: '52998224724', nome: 'Ana', nascimento: '2000-01-31' }).success).toBe(false);
    expect(CreateTrabalhadorSchema.safeParse({ unitId: 'u', cpf: '529.982.247-25', nome: 'Ana', nascimento: '2000-01-31' }).success).toBe(false);
    expect(CreateTrabalhadorSchema.safeParse({ unitId: 'u', cpf: CPF, nome: 'Ana', nascimento: '2000-02-30' }).success).toBe(false);
    expect(CreateTrabalhadorSchema.safeParse({ unitId: 'u', cpf: CPF, nome: 'Ana', nascimento: '2000-01-31', origem: 'IMPORTADA_ESOCIAL' }).success).toBe(false);
  });

  it('item 45 — PATCH do trabalhador sem default: ausente fica ausente (pcd não volta a false); vazio ⇒ falha', () => {
    expect(UpdateTrabalhadorSchema.parse({ unitId: 'u', nome: 'Ana B' })).toEqual({ unitId: 'u', nome: 'Ana B' });
    expect(UpdateTrabalhadorSchema.parse({ unitId: 'u', employeeRef: null })).toEqual({ unitId: 'u', employeeRef: null });
    expect(UpdateTrabalhadorSchema.safeParse({ unitId: 'u' }).success).toBe(false);
  });

  it('item 39 — vínculo: matrícula 1–30, categoria de 3 dígitos (o núcleo é do serviço), término ≥ início, versão strict', () => {
    const base = { unitId: 'u', trabalhadorId: CUID, matricula: 'M-1', categoria: '104', dataInicio: '2026-01-01', versao };
    const ok = CreateVinculoSchema.parse(base);
    expect(ok.versao.salarioCents).toBe(300000n);
    expect(CreateVinculoSchema.safeParse({ ...base, matricula: 'x'.repeat(31) }).success).toBe(false);
    expect(CreateVinculoSchema.safeParse({ ...base, categoria: '1010' }).success).toBe(false);
    expect(CreateVinculoSchema.safeParse({ ...base, dataTermino: '2025-12-31' }).success).toBe(false);
    expect(CreateVinculoSchema.safeParse({ ...base, versao: { ...versao, vigenteDesde: '2026-01-01' } }).success).toBe(false);
  });

  it('item 43 — versão: undSalFixo fechado (1–7), salário > 0 e ≤ MAX_CENTS', () => {
    const base = { unitId: 'u', vigenteDesde: '2026-06-01', ...versao };
    expect(CreateVersaoSchema.safeParse(base).success).toBe(true);
    expect(CreateVersaoSchema.safeParse({ ...base, unidadeSalario: '8' }).success).toBe(false);
    expect(CreateVersaoSchema.safeParse({ ...base, salarioCents: '0' }).success).toBe(false);
    expect(CreateVersaoSchema.safeParse({ ...base, salarioCents: String(BigInt(MAX_CENTS) + 1n) }).success).toBe(false);
  });

  it('item 45 — correção da versão: parcial sem default, null tira cargo/jornada/sindicato, sem vigenteDesde', () => {
    expect(CorrigirVersaoSchema.parse({ unitId: 'u', salarioCents: '310000' })).toEqual({ unitId: 'u', salarioCents: 310000n });
    expect(CorrigirVersaoSchema.parse({ unitId: 'u', sindicatoId: null })).toEqual({ unitId: 'u', sindicatoId: null });
    expect(CorrigirVersaoSchema.safeParse({ unitId: 'u', vigenteDesde: '2026-01-01' }).success).toBe(false);
    expect(CorrigirVersaoSchema.safeParse({ unitId: 'u' }).success).toBe(false);
  });
});

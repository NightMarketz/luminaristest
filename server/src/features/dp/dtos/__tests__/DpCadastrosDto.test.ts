/**
 * BE-INCR-DP-F0-F1 itens 28–33 e 35 (PR-3) — fronteira dos DTOs dos cadastros de estrutura (FEATURE_TEMPLATE §10 nível 2).
 */
import {
  CreateCargoSchema,
  CreateConvencaoParametroSchema,
  CreateConvencaoSchema,
  CreateJornadaSchema,
  CreateLotacaoSchema,
  CreateSindicatoSchema,
  DpListQuerySchema,
  UpdateJornadaSchema,
  UpdateLotacaoSchema,
} from '../DpCadastrosDto';

const CUID = 'ckq1x2y3z0000abcd1234efgh';
const CNPJ_OK = '11222333000181';

describe('DpCadastrosDto', () => {
  it('item 28 — lotação: código de 1 a 30, campo extra recusado', () => {
    expect(CreateLotacaoSchema.safeParse({ unitId: 'u1', codigo: 'LOJA-1', descricao: 'Loja' }).success).toBe(true);
    expect(CreateLotacaoSchema.safeParse({ unitId: 'u1', codigo: 'x'.repeat(31), descricao: 'Loja' }).success).toBe(false);
    expect(CreateLotacaoSchema.safeParse({ unitId: 'u1', codigo: '', descricao: 'Loja' }).success).toBe(false);
    expect(CreateLotacaoSchema.safeParse({ unitId: 'u1', codigo: 'A', descricao: 'Loja', userId: 'x' }).success).toBe(false);
  });

  it('item 29 — CBO com 5 dígitos ⇒ inválido; 6 ⇒ ok', () => {
    expect(CreateCargoSchema.safeParse({ unitId: 'u1', nome: 'Cabeleireiro', cbo: '516110' }).success).toBe(true);
    expect(CreateCargoSchema.safeParse({ unitId: 'u1', nome: 'Cabeleireiro', cbo: '51611' }).success).toBe(false);
    expect(CreateCargoSchema.safeParse({ unitId: 'u1', nome: 'Cabeleireiro', cbo: '51611A' }).success).toBe(false);
  });

  it('item 30 — jornada: minutos > 0 e tpJornada do domínio (1 e 8 não existem)', () => {
    const j = { unitId: 'u1', nome: '44h', minutosSemanais: 2640, tipoJornada: '4' };
    expect(CreateJornadaSchema.safeParse(j).success).toBe(true);
    expect(CreateJornadaSchema.safeParse({ ...j, minutosSemanais: 0 }).success).toBe(false);
    expect(CreateJornadaSchema.safeParse({ ...j, tipoJornada: '1' }).success).toBe(false);
    expect(CreateJornadaSchema.safeParse({ ...j, tipoJornada: '8' }).success).toBe(false);
  });

  it('item 31 — sindicato: CNPJ com DV válido', () => {
    expect(CreateSindicatoSchema.safeParse({ unitId: 'u1', cnpj: CNPJ_OK, nome: 'Sindicato' }).success).toBe(true);
    expect(CreateSindicatoSchema.safeParse({ unitId: 'u1', cnpj: '11222333000182', nome: 'Sindicato' }).success).toBe(false);
    expect(CreateSindicatoSchema.safeParse({ unitId: 'u1', cnpj: '1122233300018', nome: 'Sindicato' }).success).toBe(false);
  });

  it('item 32 — convenção: fonte obrigatória, data de calendário, fim ≥ início', () => {
    const c = { unitId: 'u1', sindicatoId: CUID, identificacao: 'MR000001/2026', vigenteDesde: '2026-03-01', fonte: 'Mediador MTE' };
    expect(CreateConvencaoSchema.safeParse(c).success).toBe(true);
    expect(CreateConvencaoSchema.safeParse({ ...c, fonte: undefined }).success).toBe(false);
    expect(CreateConvencaoSchema.safeParse({ ...c, vigenteDesde: '2026-02-30' }).success).toBe(false);
    expect(CreateConvencaoSchema.safeParse({ ...c, vigenteAte: '2026-02-28' }).success).toBe(false);
  });

  it('item 33 — parâmetro: chave fechada, discriminador cuid, valor positivo até MAX_CENTS, cláusula obrigatória', () => {
    const p = { unitId: 'u1', chave: 'PISO_SALARIAL_CENTS', discriminador: CUID, valorInt: '180000', clausula: 'Cláusula 3ª', vigenteDesde: '2026-03-01' };
    const ok = CreateConvencaoParametroSchema.safeParse(p);
    expect(ok.success && ok.data.valorInt).toBe(180000n);
    expect(CreateConvencaoParametroSchema.safeParse({ ...p, chave: 'ADICIONAL_NOTURNO_BP' }).success).toBe(false);
    expect(CreateConvencaoParametroSchema.safeParse({ ...p, valorInt: '0' }).success).toBe(false);
    expect(CreateConvencaoParametroSchema.safeParse({ ...p, valorInt: '2147483648' }).success).toBe(false);
    expect(CreateConvencaoParametroSchema.safeParse({ ...p, clausula: '' }).success).toBe(false);
    expect(CreateConvencaoParametroSchema.safeParse({ ...p, discriminador: undefined }).success).toBe(false);
  });

  it('item 35 — update parcial sem default: campo ausente não aparece; corpo vazio ⇒ inválido', () => {
    const u = UpdateLotacaoSchema.safeParse({ unitId: 'u1', descricao: 'Nova' });
    expect(u.success && u.data).toEqual({ unitId: 'u1', descricao: 'Nova' });
    expect(UpdateLotacaoSchema.safeParse({ unitId: 'u1' }).success).toBe(false);
    const j = UpdateJornadaSchema.safeParse({ unitId: 'u1', nome: 'Nova' });
    expect(j.success && Object.keys(j.data).sort()).toEqual(['nome', 'unitId']);
  });

  it('item 35 — limit com teto 200 e default 50', () => {
    expect(DpListQuerySchema.parse({ unitId: 'u1' }).limit).toBe(50);
    expect(DpListQuerySchema.safeParse({ unitId: 'u1', limit: '201' }).success).toBe(false);
    expect(DpListQuerySchema.safeParse({ unitId: 'u1', limit: '0' }).success).toBe(false);
  });
});

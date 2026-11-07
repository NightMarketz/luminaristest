/**
 * BE-INCR-DP-F2 PR-1 itens 13, 16, 20 e 77 — contrato dos DTOs do dependente, do lançamento e da outra remuneração:
 * `.strict()`, PATCH sem default (campo ausente não é reescrito), CPF/CNPJ com DV, documento obrigatório.
 */
import { CreateDependenteSchema, UpdateDependenteSchema } from '../DpDependenteDto';
import { CreateLancamentoSchema, CreateOutraRemuneracaoSchema, DpLancamentoQuerySchema, UpdateLancamentoSchema, UpdateOutraRemuneracaoSchema } from '../DpLancamentoDto';

const dep = { unitId: 'u', nome: 'Caio', nascimento: '2015-05-20', tipo: '03', deduzIrrf: true, salarioFamilia: true, vigenteDesde: '2026-03-01' };
const lanc = { unitId: 'u', competencia: '2026-03', rubrica: 'HORA_EXTRA_50', quantidadeMin: 120 };
const outra = {
  unitId: 'u',
  competencia: '2026-03',
  remuneracaoCents: '300000',
  contribuicaoCents: '0',
  ordem: 'ANTES',
  categoriaOutraFonte: 'EMPREGADO',
  cnpjOutroEmpregador: '11222333000181',
  documento: 'declaração',
};

describe('DTO do dependente', () => {
  it('cria com invalido false por padrão; strict; CPF com DV; vigência em ordem', () => {
    expect(CreateDependenteSchema.parse(dep).invalido).toBe(false);
    expect(CreateDependenteSchema.safeParse({ ...dep, cid: 'x' }).success).toBe(false);
    expect(CreateDependenteSchema.safeParse({ ...dep, cpf: '11144477736' }).success).toBe(false);
    expect(CreateDependenteSchema.safeParse({ ...dep, cpf: '11144477735' }).success).toBe(true);
    expect(CreateDependenteSchema.safeParse({ ...dep, vigenteAte: '2026-02-28' }).success).toBe(false);
    expect(CreateDependenteSchema.safeParse({ ...dep, tipo: '3' }).success).toBe(false);
  });
  it('PATCH não aplica default (invalido ausente fica ausente) e recusa corpo vazio', () => {
    expect(UpdateDependenteSchema.parse({ unitId: 'u', nome: 'X' })).toEqual({ unitId: 'u', nome: 'X' });
    expect(UpdateDependenteSchema.safeParse({ unitId: 'u' }).success).toBe(false);
    expect(UpdateDependenteSchema.parse({ unitId: 'u', cpf: null, vigenteAte: null })).toEqual({ unitId: 'u', cpf: null, vigenteAte: null });
  });
});

describe('DTO do lançamento', () => {
  it('cria com minutos ou centavos (bigint); sem origem; quantidade positiva; competência AAAA-MM', () => {
    expect(CreateLancamentoSchema.parse({ ...lanc, quantidadeMin: undefined, valorCents: '150000' }).valorCents).toBe(150000n);
    expect(CreateLancamentoSchema.safeParse({ ...lanc, origem: 'MANUAL' }).success).toBe(false);
    expect(CreateLancamentoSchema.safeParse({ ...lanc, quantidadeMin: 0 }).success).toBe(false);
    expect(CreateLancamentoSchema.safeParse({ ...lanc, competencia: '2026-13' }).success).toBe(false);
    expect(DpLancamentoQuerySchema.parse({ unitId: 'u' })).toEqual({ unitId: 'u' });
  });
  it('PATCH aceita null para trocar a unidade e recusa corpo vazio', () => {
    expect(UpdateLancamentoSchema.parse({ unitId: 'u', quantidadeMin: null })).toEqual({ unitId: 'u', quantidadeMin: null });
    expect(UpdateLancamentoSchema.safeParse({ unitId: 'u' }).success).toBe(false);
  });
});

describe('DTO da outra remuneração (item 77)', () => {
  it('documento obrigatório e não vazio; CNPJ com DV; ordem e categoria fechadas', () => {
    expect(CreateOutraRemuneracaoSchema.parse(outra).remuneracaoCents).toBe(300000n);
    const { documento: _d, ...semDoc } = outra;
    expect(CreateOutraRemuneracaoSchema.safeParse(semDoc).success).toBe(false);
    expect(CreateOutraRemuneracaoSchema.safeParse({ ...outra, documento: '   ' }).success).toBe(false);
    expect(CreateOutraRemuneracaoSchema.safeParse({ ...outra, cnpjOutroEmpregador: '11222333000180' }).success).toBe(false);
    expect(CreateOutraRemuneracaoSchema.safeParse({ ...outra, ordem: 'DURANTE' }).success).toBe(false);
    expect(CreateOutraRemuneracaoSchema.safeParse({ ...outra, categoriaOutraFonte: 'AVULSO' }).success).toBe(false);
    expect(CreateOutraRemuneracaoSchema.safeParse({ ...outra, remuneracaoCents: '0' }).success).toBe(false);
  });
  it('PATCH parcial sem reescrever o resto', () => {
    expect(UpdateOutraRemuneracaoSchema.parse({ unitId: 'u', ordem: 'DEPOIS' })).toEqual({ unitId: 'u', ordem: 'DEPOIS' });
    expect(UpdateOutraRemuneracaoSchema.safeParse({ unitId: 'u', documento: '' }).success).toBe(false);
  });
});

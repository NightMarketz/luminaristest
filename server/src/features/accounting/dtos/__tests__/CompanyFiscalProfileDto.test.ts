/**
 * BE-INCR-FISCAL-OBLIGATION-PROFILE (nó X13, BRIEF itens 5 e 8) — regras finas dos DTOs que o snapshot de shape não
 * enxerga (`superRefine`/`refine`, ver dtoShapeSnapshot.test.ts "LIMITES DECLARADOS").
 */
import { CompanyFiscalProfileCopyParamSchema, UpsertCompanyFiscalProfileSchema } from '../CompanyFiscalProfileDto';
import { CreateCompanySignerSchema } from '../CompanySignerDto';

const base = { unitId: 'u1' };
const ok = (b: Record<string, unknown>) => UpsertCompanyFiscalProfileSchema.safeParse({ ...base, ...b }).success;

describe('UpsertCompanyFiscalProfileSchema (item 5)', () => {
  it('aceita os 4 regimes (F-OBP-2 a) e recusa regime fora da lista', () => {
    for (const regime of ['MEI', 'SIMPLES', 'PRESUMIDO', 'REAL']) expect(ok({ regime })).toBe(true);
    expect(ok({ regime: 'ARBITRADO' })).toBe(false);
  });

  it('recusa bloco ecf em MEI e SIMPLES (IN 2.004 art. 1º §1º I); aceita em PRESUMIDO/REAL', () => {
    const ecf = { indAliqCsll: '1', indRecReceita: '2' };
    expect(ok({ regime: 'MEI', ecf })).toBe(false);
    expect(ok({ regime: 'SIMPLES', ecf })).toBe(false);
    expect(ok({ regime: 'PRESUMIDO', ecf })).toBe(true);
    expect(ok({ regime: 'REAL', ecf })).toBe(true);
  });

  it('livroCaixaSemEscrituracao/distribuicaoAcimaBase só no PRESUMIDO (IN 2.003 art. 3º §1º V e §3º)', () => {
    for (const k of ['livroCaixaSemEscrituracao', 'distribuicaoAcimaBase']) {
      expect(ok({ regime: 'PRESUMIDO', condicoes: { [k]: true } })).toBe(true);
      expect(ok({ regime: 'REAL', condicoes: { [k]: false } })).toBe(false);
      expect(ok({ regime: 'SIMPLES', condicoes: { [k]: true } })).toBe(false);
    }
    expect(ok({ regime: 'SIMPLES', condicoes: { aporteInvestidorAnjo: true } })).toBe(true);
  });

  it("nire só com indNire = '1'", () => {
    const ecd = { numOrd: '1', natLivr: 'DIARIO GERAL' };
    expect(ok({ regime: 'REAL', ecd: { ...ecd, indNire: '1', nire: '35200000000' } })).toBe(true);
    expect(ok({ regime: 'REAL', ecd: { ...ecd, indNire: '0', nire: '35200000000' } })).toBe(false);
  });

  it('declarante (F-XP-2 a): campos opcionais, formato validado, chave desconhecida recusada (.strict)', () => {
    expect(ok({ regime: 'REAL', declarante: {} })).toBe(true);
    expect(ok({ regime: 'REAL', declarante: { codMun: '3550308', uf: 'SP' } })).toBe(true);
    expect(ok({ regime: 'REAL', declarante: { codMun: '355' } })).toBe(false);
    expect(ok({ regime: 'REAL', declarante: { cnpj: '12.345.678/0001-90' } })).toBe(false);
    expect(ok({ regime: 'REAL', declarante: { razao: 'x' } })).toBe(false);
  });

  it('defaults: condições null, inativa false, grandePorte null; chave extra no corpo → recusada', () => {
    const r = UpsertCompanyFiscalProfileSchema.parse({ ...base, regime: 'MEI' });
    expect(r).toMatchObject({ grandePorte: null, inativa: false, condicoes: { aporteInvestidorAnjo: null, livroCaixaSemEscrituracao: null, distribuicaoAcimaBase: null } });
    expect(ok({ regime: 'MEI', foo: 1 })).toBe(false);
  });

  it('cópia: anoAnterior diferente de ano; ano ≥ 2014 (ECF desde 2014)', () => {
    expect(CompanyFiscalProfileCopyParamSchema.safeParse({ ano: '2026', anoAnterior: '2025' }).success).toBe(true);
    expect(CompanyFiscalProfileCopyParamSchema.safeParse({ ano: '2026', anoAnterior: '2026' }).success).toBe(false);
    expect(CompanyFiscalProfileCopyParamSchema.safeParse({ ano: '2013', anoAnterior: '2014' }).success).toBe(false);
  });
});

describe('CreateCompanySignerSchema (item 8)', () => {
  const signer = { unitId: 'u1', nome: 'Maria Sócia', cpf: '529.982.247-25', qualifEcd: '203', qualifEcf: '203', email: 'm@x.com', fone: '(11) 98765-4321' };

  it('aceita signatário válido e normaliza CPF e fone', () => {
    const r = CreateCompanySignerSchema.parse(signer);
    expect(r.cpf).toBe('52998224725');
    expect(r.fone).toBe('11987654321');
  });

  it("recusa '900' (Contador) nas duas tabelas — contador mora em AccountingContact", () => {
    expect(CreateCompanySignerSchema.safeParse({ ...signer, qualifEcd: '900' }).success).toBe(false);
    expect(CreateCompanySignerSchema.safeParse({ ...signer, qualifEcf: '900' }).success).toBe(false);
  });

  it('recusa CPF com DV errado e qualificação fora da tabela', () => {
    expect(CreateCompanySignerSchema.safeParse({ ...signer, cpf: '529.982.247-26' }).success).toBe(false);
    expect(CreateCompanySignerSchema.safeParse({ ...signer, qualifEcd: '305' }).success).toBe(false); // 305 não existe (a tabela da p. 202 prevalece sobre o exemplo 9)
  });
});

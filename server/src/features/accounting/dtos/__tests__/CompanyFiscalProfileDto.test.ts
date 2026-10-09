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

  it('CSLL-LC224 F-CA-3 (b): indAliqCsll aceita 1/3/4/7/8 (ECF leiaute 12, 0020) e recusa 2', () => {
    for (const indAliqCsll of ['1', '3', '4', '7', '8']) expect(ok({ regime: 'REAL', ecf: { indAliqCsll, indRecReceita: '2' } })).toBe(true);
    expect(ok({ regime: 'REAL', ecf: { indAliqCsll: '2', indRecReceita: '2' } })).toBe(false);
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

  it('X7 Fase B item 3b: prestadoraExclusivaServicos boolean, default false; ANUAL liberado no PR-4 (F-TB-8.1)', () => {
    expect(UpsertCompanyFiscalProfileSchema.parse({ ...base, regime: 'REAL' }).prestadoraExclusivaServicos).toBe(false);
    expect(ok({ regime: 'REAL', prestadoraExclusivaServicos: true })).toBe(true);
    expect(ok({ regime: 'REAL', prestadoraExclusivaServicos: 'sim' })).toBe(false);
    expect(ok({ regime: 'REAL', formaApuracaoIrpjCsll: 'ANUAL', prestadoraExclusivaServicos: true })).toBe(true);
  });

  it('PRESUMIDO-16 F-P16-1 (a): no PRESUMIDO a flag exige declaraNaoProfissaoRegulamentada (Lei 9.250 art. 40 p.ú.)', () => {
    const r = UpsertCompanyFiscalProfileSchema.safeParse({ ...base, regime: 'PRESUMIDO', prestadoraExclusivaServicos: true });
    expect(r.success).toBe(false);
    expect(JSON.stringify(r.error?.issues)).toContain('art. 40 parágrafo único');
    expect(ok({ regime: 'PRESUMIDO', prestadoraExclusivaServicos: true, declaraNaoProfissaoRegulamentada: true })).toBe(true);
    expect(UpsertCompanyFiscalProfileSchema.parse({ ...base, regime: 'PRESUMIDO' }).declaraNaoProfissaoRegulamentada).toBe(false);
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

describe('UpsertCompanyFiscalProfileSchema — X7 Fase A (BRIEF itens 1, 2, 2b)', () => {
  it('forma: SIMPLES/MEI com forma ⇒ recusa; PRESUMIDO + ANUAL ⇒ recusa; REAL + ANUAL ok (Fase B PR-4, item 1); TRIMESTRAL ok', () => {
    expect(ok({ regime: 'SIMPLES', formaApuracaoIrpjCsll: 'TRIMESTRAL' })).toBe(false);
    expect(ok({ regime: 'MEI', formaApuracaoIrpjCsll: 'TRIMESTRAL' })).toBe(false);
    expect(ok({ regime: 'SIMPLES', formaApuracaoIrpjCsll: 'ANUAL' })).toBe(false);
    const presumidoAnual = UpsertCompanyFiscalProfileSchema.safeParse({ ...base, regime: 'PRESUMIDO', formaApuracaoIrpjCsll: 'ANUAL' });
    expect(presumidoAnual.success).toBe(false);
    expect(JSON.stringify(presumidoAnual.error?.issues)).toContain('Lucro Presumido é só trimestral');
    expect(ok({ regime: 'REAL', formaApuracaoIrpjCsll: 'ANUAL' })).toBe(true);
    expect(ok({ regime: 'REAL', formaApuracaoIrpjCsll: 'TRIMESTRAL' })).toBe(true);
    expect(ok({ regime: 'PRESUMIDO', formaApuracaoIrpjCsll: 'TRIMESTRAL' })).toBe(true);
    expect(ok({ regime: 'REAL' })).toBe(true); // nula ⇒ TRIMESTRAL efetivo (no service)
  });

  it('lucroRealObrigatorio só no REAL', () => {
    expect(ok({ regime: 'REAL', lucroRealObrigatorio: true })).toBe(true);
    expect(ok({ regime: 'PRESUMIDO', lucroRealObrigatorio: false })).toBe(false);
  });

  it('datas de atividade: date-only com calendário validado (regex sozinho não basta)', () => {
    expect(ok({ regime: 'PRESUMIDO', inicioAtividadeEm: '2026-05-10', encerramentoAtividadeEm: '2026-11-30' })).toBe(true);
    expect(ok({ regime: 'PRESUMIDO', inicioAtividadeEm: '2026-02-30' })).toBe(false);
    expect(ok({ regime: 'PRESUMIDO', encerramentoAtividadeEm: '30/11/2026' })).toBe(false);
  });

  it('liminar LC 224 (F-TA-5 a): suspenso sem processo ⇒ "informe o processo da liminar"; processo ≤ 60 caracteres', () => {
    const r = UpsertCompanyFiscalProfileSchema.safeParse({ ...base, regime: 'PRESUMIDO', lc224AcrescimoSuspenso: true });
    expect(r.success).toBe(false);
    expect(JSON.stringify(r.error?.issues)).toContain('informe o processo da liminar');
    expect(ok({ regime: 'PRESUMIDO', lc224AcrescimoSuspenso: true, lc224LiminarReferencia: '5001234-56.2026.4.03.6100' })).toBe(true);
    expect(ok({ regime: 'PRESUMIDO', lc224AcrescimoSuspenso: true, lc224LiminarReferencia: 'x'.repeat(61) })).toBe(false);
    expect(UpsertCompanyFiscalProfileSchema.parse({ ...base, regime: 'PRESUMIDO' })).toMatchObject({
      formaApuracaoIrpjCsll: null, lucroRealObrigatorio: null, lc224AcrescimoSuspenso: false, lc224LiminarReferencia: null,
    });
  });
});

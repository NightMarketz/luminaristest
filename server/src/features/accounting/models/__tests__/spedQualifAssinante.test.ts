/**
 * spedQualifAssinante — teste-guarda da transcrição (checklist item 1, BE-INCR-SPED-IDENTITY-MASKS).
 * Não confere o manual (isso é o PVA); confere que a const é bem-formada e que a exceção de emissão
 * do F-C12-5 → (i) está isolada em uma linha nomeada.
 */
import {
  SPED_ECD_QUALIF_ASSINANTE,
  SPED_ECD_QUALIF_ASSINANTE_CODES,
  SPED_ECF_QUALIF_ASSINANTE,
  SPED_ECF_QUALIF_ASSINANTE_CODES,
  ecdIdentQualifParaEmissao,
} from '../spedQualifAssinante';

describe('SPED_ECD_QUALIF_ASSINANTE (J930, Manual ECD L9 pp. 201-202)', () => {
  it("tem '900' → 'Contador/Contabilista' (transcrição literal)", () => {
    expect(SPED_ECD_QUALIF_ASSINANTE['900']).toBe('Contador/Contabilista');
  });

  it('todo código é 3 dígitos e não está vazia', () => {
    expect(SPED_ECD_QUALIF_ASSINANTE_CODES.length).toBeGreaterThan(0);
    for (const code of SPED_ECD_QUALIF_ASSINANTE_CODES) expect(code).toMatch(/^\d{3}$/);
  });

  it('sem duplicata de código (19 chaves)', () => {
    expect(new Set(SPED_ECD_QUALIF_ASSINANTE_CODES).size).toBe(SPED_ECD_QUALIF_ASSINANTE_CODES.length);
    expect(SPED_ECD_QUALIF_ASSINANTE_CODES).toHaveLength(19);
  });

  it("'305' (código do exemplo 9, p. 200) NÃO está na tabela — a tabela (p. 202) prevalece", () => {
    expect((SPED_ECD_QUALIF_ASSINANTE_CODES as readonly string[]).includes('305')).toBe(false);
  });
});

describe('SPED_ECF_QUALIF_ASSINANTE (0930, Manual ECF L12 p. 105)', () => {
  it("tem '900' presente e 17 códigos únicos (duas linhas do manual colapsam numa chave)", () => {
    expect(SPED_ECF_QUALIF_ASSINANTE['900']).toBeTruthy();
    expect(new Set(SPED_ECF_QUALIF_ASSINANTE_CODES).size).toBe(SPED_ECF_QUALIF_ASSINANTE_CODES.length);
    expect(SPED_ECF_QUALIF_ASSINANTE_CODES).toHaveLength(17);
  });

  it('todo código é 3 dígitos', () => {
    for (const code of SPED_ECF_QUALIF_ASSINANTE_CODES) expect(code).toMatch(/^\d{3}$/);
  });
});

describe('ECD × ECF — tabelas NÃO são idênticas (fecha F-C12-2 → a)', () => {
  it('001 (Pessoa Jurídica) e 940 (Auditor Independente) só existem na ECD', () => {
    expect('001' in SPED_ECD_QUALIF_ASSINANTE).toBe(true);
    expect('940' in SPED_ECD_QUALIF_ASSINANTE).toBe(true);
    expect((SPED_ECF_QUALIF_ASSINANTE_CODES as readonly string[]).includes('001')).toBe(false);
    expect((SPED_ECF_QUALIF_ASSINANTE_CODES as readonly string[]).includes('940')).toBe(false);
  });
});

describe('ecdIdentQualifParaEmissao — F-C12-5 → (i)', () => {
  it("900 emite 'Contador' (não o literal 'Contador/Contabilista' da const)", () => {
    expect(ecdIdentQualifParaEmissao('900')).toBe('Contador');
  });

  it('demais códigos emitem a descrição da tabela sem alteração', () => {
    expect(ecdIdentQualifParaEmissao('309')).toBe('Procurador');
    expect(ecdIdentQualifParaEmissao('001')).toBe('Pessoa Jurídica (e-CNPJ ou e-PJ)');
  });
});

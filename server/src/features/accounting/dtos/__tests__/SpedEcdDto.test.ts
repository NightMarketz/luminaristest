/**
 * SpedEcdDto — barreira do achado R3 F3 (`fronteira-de-dto-quase-nao-testada`).
 *
 * `dtExSocial` (encerramento do exercício social, I030/J900) é data-only por
 * `isValidDateOnly` e é OBRIGATÓRIA — uma data que rola para frente entra no arquivo
 * entregue à Receita, que é a superfície de menor tolerância a erro deste repositório.
 *
 * Junto com ela, o superRefine J930 (exatamente um responsável legal; um contador 900 e um
 * não-900) é a regra que uma checagem de forma não alcança: uma lista de signatários
 * estruturalmente perfeita e regulatoriamente inválida passaria.
 */
import { SpedEcdRequestSchema, UF_CODES } from '../SpedEcdDto';

const declarant = {
  nome: 'Salão Luminaris ME',
  cnpj: '12345678000199',
  uf: 'SP' as const,
  codMun: '3550308',
  indNire: '0' as const,
  indGrandePorte: '0' as const,
};

const book = { numOrd: '1', natLivr: 'Livro Diário', dtExSocial: '2026-12-31' };

const signers = [
  { identNom: 'Contador', identCpfCnpj: '11122233344', identQualif: 'Contador', codAssin: '900', indRespLegal: 'N' as const },
  { identNom: 'Sócio', identCpfCnpj: '55566677788', identQualif: 'Sócio', codAssin: '309', indRespLegal: 'S' as const },
];

const valid = { unitId: 'unit-1', mappingVersion: 'RFB-2024', year: 2026, declarant, book, signers };

describe('SpedEcdRequestSchema — data-only obrigatória', () => {
  it('accepts a well-formed request (CONTROLE — sem isto os negativos abaixo são vazios)', () => {
    expect(SpedEcdRequestSchema.safeParse(valid).success).toBe(true);
  });

  it('rejects dtExSocial non-calendar (round-trip, não regex nu)', () => {
    expect(
      SpedEcdRequestSchema.safeParse({ ...valid, book: { ...book, dtExSocial: '2026-02-30' } }).success,
    ).toBe(false);
    expect(
      SpedEcdRequestSchema.safeParse({ ...valid, book: { ...book, dtExSocial: '2026-11-31' } }).success,
    ).toBe(false);
  });

  it('rejects dtExSocial ausente (termo de encerramento sem data não é ECD)', () => {
    const { dtExSocial: _omit, ...bookNoDate } = book;
    expect(SpedEcdRequestSchema.safeParse({ ...valid, book: bookNoDate }).success).toBe(false);
  });

  it('rejects datas OPCIONAIS non-calendar quando fornecidas (dtArq, dtArqConv)', () => {
    expect(
      SpedEcdRequestSchema.safeParse({ ...valid, book: { ...book, dtArq: '2026-04-31' } }).success,
    ).toBe(false);
    // CONTROLE: a mesma chave com data real passa — a rejeição é do calendário, não da chave.
    expect(
      SpedEcdRequestSchema.safeParse({ ...valid, book: { ...book, dtArq: '2026-04-30' } }).success,
    ).toBe(true);
  });

  it('rejects dtCrc non-calendar no signatário', () => {
    const bad = [signers[0], { ...signers[1], dtCrc: '2026-02-30' }];
    expect(SpedEcdRequestSchema.safeParse({ ...valid, signers: bad }).success).toBe(false);
  });
});

describe('SpedEcdRequestSchema — J930 (superRefine)', () => {
  it('rejects zero responsáveis legais e dois responsáveis legais', () => {
    const none = signers.map((s) => ({ ...s, indRespLegal: 'N' as const }));
    const two = signers.map((s) => ({ ...s, indRespLegal: 'S' as const }));
    for (const set of [none, two]) {
      const parsed = SpedEcdRequestSchema.safeParse({ ...valid, signers: set });
      expect(parsed.success).toBe(false);
      if (!parsed.success) expect(parsed.error.issues.some((i) => i.path[0] === 'signers')).toBe(true);
    }
  });

  it('rejects lista sem contador (900) e lista só de contadores', () => {
    const noContador = [
      { ...signers[0], codAssin: '309' },
      signers[1],
    ];
    const onlyContador = [
      signers[0],
      { ...signers[1], codAssin: '900' },
    ];
    expect(SpedEcdRequestSchema.safeParse({ ...valid, signers: noContador }).success).toBe(false);
    expect(SpedEcdRequestSchema.safeParse({ ...valid, signers: onlyContador }).success).toBe(false);
  });

  it('rejects lista vazia de signatários', () => {
    expect(SpedEcdRequestSchema.safeParse({ ...valid, signers: [] }).success).toBe(false);
  });
});

describe('SpedEcdRequestSchema — formas fechadas do registro 0000', () => {
  it('rejects CNPJ que não tem 14 dígitos e CPF/CNPJ fora de 11|14', () => {
    expect(SpedEcdRequestSchema.safeParse({ ...valid, declarant: { ...declarant, cnpj: '1234567800019' } }).success).toBe(false);
    expect(SpedEcdRequestSchema.safeParse({ ...valid, declarant: { ...declarant, cnpj: '12.345.678/0001-99' } }).success).toBe(false);
    const badDoc = [{ ...signers[0], identCpfCnpj: '123' }, signers[1]];
    expect(SpedEcdRequestSchema.safeParse({ ...valid, signers: badDoc }).success).toBe(false);
  });

  it('rejects código IBGE fora de 7 dígitos e COD_ASSIN fora de 3 dígitos', () => {
    expect(SpedEcdRequestSchema.safeParse({ ...valid, declarant: { ...declarant, codMun: '355030' } }).success).toBe(false);
    const badAssin = [{ ...signers[0], codAssin: '9000' }, signers[1]];
    expect(SpedEcdRequestSchema.safeParse({ ...valid, signers: badAssin }).success).toBe(false);
  });

  it('UF é a tabela fechada de 27 unidades da federação', () => {
    expect(UF_CODES).toHaveLength(27);
    expect(SpedEcdRequestSchema.safeParse({ ...valid, declarant: { ...declarant, uf: 'XX' } }).success).toBe(false);
  });

  it('year fica dentro de 2000..2100 e é inteiro', () => {
    expect(SpedEcdRequestSchema.safeParse({ ...valid, year: 1999 }).success).toBe(false);
    expect(SpedEcdRequestSchema.safeParse({ ...valid, year: 2101 }).success).toBe(false);
    expect(SpedEcdRequestSchema.safeParse({ ...valid, year: 2026.5 }).success).toBe(false);
  });

  it('rejects unknown keys (.strict) no topo e dentro do declarante', () => {
    expect(SpedEcdRequestSchema.safeParse({ ...valid, dtIni: '2026-01-01' }).success).toBe(false);
    expect(SpedEcdRequestSchema.safeParse({ ...valid, declarant: { ...declarant, razaoSocial: 'x' } }).success).toBe(false);
  });

  it('aplica os defaults do MVP (identMf=N, indFinEsc=0 original, tipEcd=0)', () => {
    const parsed = SpedEcdRequestSchema.safeParse(valid);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.declarant.identMf).toBe('N');
      expect(parsed.data.declarant.indFinEsc).toBe('0');
      expect(parsed.data.declarant.tipEcd).toBe('0');
      expect(parsed.data.declarant.indSitIniPer).toBe('0');
    }
  });
});

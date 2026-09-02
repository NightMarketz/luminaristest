/**
 * SpedEcfRealDto — teste de contrato do DTO do Lucro Real (ADR-INCR-SPED-ECF-FASE3, esqueleto).
 *
 * Duas invariantes que o snapshot de shape (`dtoShapeSnapshot.test.ts`) NÃO cobre:
 *  1. `.superRefine` dos signatários (0930) — invisível ao `z.toJSONSchema()`; molde:
 *     `SpedEcfDto.test.ts`.
 *  2. A AUSÊNCIA de default em `formaTrib`/`formaTribPer` é a decisão de não chutar o dígito do
 *     regime (BRIEF §4 item 6). O snapshot registra `required`, mas só um teste prova que o
 *     schema não injeta valor algum quando o campo falta — e que o `'5'`/`'PPPP'` do Presumido
 *     nunca nascem aqui por default.
 *
 * REUSO (BRIEF item 3): o teste importa `DeclarantSchema`/`SignerSchema` do DTO Presumido e
 * afirma que o DTO Real aceita exatamente o que eles aceitam — não redeclara os campos.
 */
import { SpedEcfRealRequestSchema } from '../SpedEcfRealDto';
import { DeclarantSchema, SignerSchema } from '../SpedEcfDto';

const declarant = {
  cnpj: '12345678000199',
  nome: 'Indústria Luminaris LTDA',
  codNat: '2062',
  cnaeFiscal: '9602501',
  endereco: 'Rua das Flores',
  bairro: 'Centro',
  uf: 'SP' as const,
  codMun: '3550308',
  cep: '01310100',
  email: 'contato@luminaris.com.br',
};

const contador = {
  identNom: 'Contador Responsável',
  identCpfCnpj: '11122233344',
  identQualif: '900',
  indCrc: 'SP-123456/O-1',
  email: 'contador@escritorio.com.br',
  fone: '1133334444',
};

const socio = {
  identNom: 'Sócia Administradora',
  identCpfCnpj: '55566677788',
  identQualif: '309',
  email: 'socia@luminaris.com.br',
  fone: '1199998888',
};

/** `formaTribPer` é placeholder de teste (sem default); `formaTrib` default '1' é o ratificado. */
const fiscal = { formaTrib: '1', formaTribPer: 'XXXX' };

const valid = { unitId: 'unit-1', year: 2026, declarant, fiscal, signers: [contador, socio] };

const failsOn = (payload: unknown, pathHead: string) => {
  const parsed = SpedEcfRealRequestSchema.safeParse(payload);
  expect(parsed.success).toBe(false);
  if (!parsed.success) {
    expect(parsed.error.issues.some((i) => i.path[0] === pathHead)).toBe(true);
  }
};

describe('SpedEcfRealRequestSchema — contrato de entrada', () => {
  it('accepts o payload mínimo válido (CONTROLE — sem isto todo negativo abaixo é vazio)', () => {
    expect(SpedEcfRealRequestSchema.safeParse(valid).success).toBe(true);
  });

  it('reusa DeclarantSchema/SignerSchema do Presumido: o que eles aceitam, o DTO Real aceita', () => {
    // O shape do declarante/signatário é o MESMO objeto de domínio — a asserção é por REUSO
    // (parse pelos schemas importados), não por redeclaração de campo.
    expect(DeclarantSchema.safeParse(declarant).success).toBe(true);
    expect(SignerSchema.safeParse(contador).success).toBe(true);
    expect(SignerSchema.safeParse(socio).success).toBe(true);
    const parsed = SpedEcfRealRequestSchema.safeParse(valid);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.declarant).toEqual(DeclarantSchema.parse(declarant));
      expect(parsed.data.signers).toEqual([SignerSchema.parse(contador), SignerSchema.parse(socio)]);
    }
  });

  it('rejects chave desconhecida no topo e em fiscal (.strict())', () => {
    // Chave desconhecida no topo: issue `unrecognized_keys` com path [] e a chave em `keys`.
    const rejectsUnknownTopKey = (key: string) => {
      const parsed = SpedEcfRealRequestSchema.safeParse({ ...valid, [key]: 'x' });
      expect(parsed.success).toBe(false);
      if (!parsed.success) {
        expect(parsed.error.issues.some((i) => i.code === 'unrecognized_keys' && (i as { keys?: string[] }).keys?.includes(key))).toBe(true);
      }
    };
    rejectsUnknownTopKey('regime');
    // Fork 2 (hashEcfAnterior) e Fork 4 (lalurAdjustments) NÃO existem no esqueleto.
    rejectsUnknownTopKey('hashEcfAnterior');
    rejectsUnknownTopKey('lalurAdjustments');
    failsOn({ ...valid, fiscal: { ...fiscal, mesBalRed: '01' } }, 'fiscal');
  });
});

describe('SpedEcfRealRequestSchema — 0010 parametrizado, sem dígito de regime no servidor', () => {
  it('rejects fiscal ausente — o bloco não tem default porque formaTribPer não tem', () => {
    const { fiscal: _omit, ...semFiscal } = valid;
    failsOn(semFiscal, 'fiscal');
  });

  it("formaTrib ausente → default '1' (Lucro Real, ratificado 2026-09-02; transcription.md:85); fora de 1 dígito rejeita", () => {
    const { formaTrib: _omit, ...semTrib } = fiscal;
    const parsed = SpedEcfRealRequestSchema.safeParse({ ...valid, fiscal: semTrib });
    expect(parsed.success).toBe(true);
    if (parsed.success) expect(parsed.data.fiscal.formaTrib).toBe('1');
    failsOn({ ...valid, fiscal: { ...fiscal, formaTrib: '10' } }, 'fiscal');
    failsOn({ ...valid, fiscal: { ...fiscal, formaTrib: 'R' } }, 'fiscal');
  });

  it('rejects formaTribPer ausente (sem default) e fora de 4 posições', () => {
    const { formaTribPer: _omit, ...semPer } = fiscal;
    failsOn({ ...valid, fiscal: semPer }, 'fiscal');
    failsOn({ ...valid, fiscal: { ...fiscal, formaTribPer: 'XXX' } }, 'fiscal');
    failsOn({ ...valid, fiscal: { ...fiscal, formaTribPer: 'XXXXX' } }, 'fiscal');
  });

  it('repassa formaTrib/formaTribPer EXATAMENTE como informados (o default só supre a ausência)', () => {
    for (const formaTrib of ['0', '1', '9']) {
      const parsed = SpedEcfRealRequestSchema.safeParse({ ...valid, fiscal: { ...fiscal, formaTrib } });
      expect(parsed.success).toBe(true);
      if (parsed.success) expect(parsed.data.fiscal.formaTrib).toBe(formaTrib);
    }
  });

  it('formaApur: Fork 5→(a) Trimestral — default T, e só T é aceito', () => {
    const parsed = SpedEcfRealRequestSchema.safeParse(valid);
    expect(parsed.success).toBe(true);
    if (parsed.success) expect(parsed.data.fiscal.formaApur).toBe('T');
    // Anual (Fork 5→(b)) não foi ratificado: qualquer outro código é 400.
    failsOn({ ...valid, fiscal: { ...fiscal, formaApur: 'A' } }, 'fiscal');
  });

  it('indAliqCsll/indRecReceita: mesmos defaults do Presumido (1 = 9% / 2 = competência)', () => {
    const parsed = SpedEcfRealRequestSchema.safeParse(valid);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.fiscal.indAliqCsll).toBe('1');
      expect(parsed.data.fiscal.indRecReceita).toBe('2');
    }
  });
});

describe('SpedEcfRealRequestSchema — 0930 (superRefine, mesma regra do Presumido)', () => {
  it('rejects lista SEM contador (900)', () => {
    failsOn({ ...valid, signers: [socio, { ...socio, identNom: 'Outro Sócio' }] }, 'signers');
  });

  it('rejects lista SÓ de contadores', () => {
    failsOn({ ...valid, signers: [contador, { ...contador, identNom: 'Segundo Contador' }] }, 'signers');
  });

  it('rejects contador com CNPJ (14) em vez de CPF (11)', () => {
    failsOn({ ...valid, signers: [{ ...contador, identCpfCnpj: '12345678000199' }, socio] }, 'signers');
  });

  it('rejects contador SEM IND_CRC; a mesma ausência num não-contador é válida', () => {
    const { indCrc: _omit, ...contadorSemCrc } = contador;
    failsOn({ ...valid, signers: [contadorSemCrc, socio] }, 'signers');
    expect(SpedEcfRealRequestSchema.safeParse(valid).success).toBe(true);
  });

  it('rejects um único signatário, seja ele contador ou não', () => {
    failsOn({ ...valid, signers: [contador] }, 'signers');
    failsOn({ ...valid, signers: [socio] }, 'signers');
  });
});

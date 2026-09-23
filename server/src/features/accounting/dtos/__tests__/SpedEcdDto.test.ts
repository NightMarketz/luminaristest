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

// CPFs com DV válido (item 5) — '11122233344'/'55566677788' (antigos) tinham DV inválido e só
// passavam porque o campo era regex de forma; F-C12-1 → (a) também remove `identQualif` do input.
const signers = [
  {
    identNom: 'Contador',
    identCpfCnpj: '11122233396',
    codAssin: '900',
    indCrc: 'SP-123456/O-1',
    email: 'contador@escritorio.com.br',
    fone: '1133334444',
    ufCrc: 'SP' as const,
    indRespLegal: 'N' as const,
  },
  { identNom: 'Sócio', identCpfCnpj: '55566677720', codAssin: '309', indRespLegal: 'S' as const },
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

describe('SpedEcdRequestSchema — CNPJ alfanumérico (BE-INCR-CNPJ-ALFA, F-CNPJ-1 → b, F-CNPJ-2 → a)', () => {
  it('aceita CNPJ alfanumérico MAIÚSCULO no declarante, no codScp e no signatário NÃO-contador (só formato, sem DV)', () => {
    expect(SpedEcdRequestSchema.safeParse({ ...valid, declarant: { ...declarant, cnpj: '12ABC34501DE35' } }).success).toBe(true);
    expect(SpedEcdRequestSchema.safeParse({ ...valid, declarant: { ...declarant, codScp: '12ABC34501DE35' } }).success).toBe(true);
    // signers[0] é o contador (900) — F-C12-6 → a exige CPF-11 dele; o CNPJ alfanumérico vai no
    // signatário NÃO-contador (signers[1]).
    expect(SpedEcdRequestSchema.safeParse({ ...valid, signers: [signers[0], { ...signers[1], identCpfCnpj: '12ABC34501DE35' }] }).success).toBe(true);
    // DV NÃO é conferido na fronteira (F-CNPJ-2 → a): o PVA é o oráculo
    expect(SpedEcdRequestSchema.safeParse({ ...valid, declarant: { ...declarant, cnpj: '12ABC34501DE36' } }).success).toBe(true);
  });

  it('rejeita minúscula, 12 posições, letra nos DV e máscara (forma canônica é obrigatória)', () => {
    for (const cnpj of ['12abc34501de35', '12ABC34501DE', '12ABC34501DEAB', '12.ABC.345/01-DE35']) {
      expect(SpedEcdRequestSchema.safeParse({ ...valid, declarant: { ...declarant, cnpj } }).success).toBe(false);
    }
  });

  it('CPF do signatário não-contador continua estritamente numérico (11 dígitos)', () => {
    expect(SpedEcdRequestSchema.safeParse({ ...valid, signers: [signers[0], { ...signers[1], identCpfCnpj: '1234567890A' }] }).success).toBe(false);
  });
});

describe('SpedEcdRequestSchema — C12 item 2/4: COD_ASSIN fechado na Tabela de Qualificação (Manual ECD L9 pp. 201-202)', () => {
  it("aceita '900' (controle) e rejeita '305' (código do exemplo 9 da p. 200 — a TABELA da p. 202 prevalece e não o tem)", () => {
    expect(SpedEcdRequestSchema.safeParse(valid).success).toBe(true);
    expect(
      SpedEcdRequestSchema.safeParse({ ...valid, signers: [signers[0], { ...signers[1], codAssin: '305' }] })
        .success,
    ).toBe(false);
  });

  it('IDENT_QUALIF (campo 04) não é mais aceito no payload — .strict() recusa a chave (F-C12-1 → a)', () => {
    const withIdentQualif = { ...signers[0], identQualif: 'Contador' };
    const parsed = SpedEcdRequestSchema.safeParse({ ...valid, signers: [withIdentQualif, signers[1]] });
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(
        parsed.error.issues.some(
          (i) => i.code === 'unrecognized_keys' && (i as { keys?: string[] }).keys?.includes('identQualif'),
        ),
      ).toBe(true);
    }
  });
});

describe('SpedEcdRequestSchema — C12 item 5: CPF com DV no signatário (REGRA_VALIDA_CPF)', () => {
  it('CPF com DV inválido é 400; CPF válido passa; CNPJ alfanumérico (não-contador) passa', () => {
    expect(
      SpedEcdRequestSchema.safeParse({ ...valid, signers: [signers[0], { ...signers[1], identCpfCnpj: '11111111111' }] }).success,
    ).toBe(false);
    expect(SpedEcdRequestSchema.safeParse(valid).success).toBe(true);
    expect(
      SpedEcdRequestSchema.safeParse({ ...valid, signers: [signers[0], { ...signers[1], identCpfCnpj: '12ABC34501DE35' }] }).success,
    ).toBe(true);
  });
});

describe('SpedEcdRequestSchema — C12 item 6: COD_ASSIN=900 ⇒ CPF-11 + IND_CRC + EMAIL + FONE + UF_CRC (REGRA_OBRIGATORIO_CONTADOR, p. 202)', () => {
  it('contador (900) sem FONE é 400 nomeando J930.FONE', () => {
    const { fone: _omit, ...contadorSemFone } = signers[0];
    const parsed = SpedEcdRequestSchema.safeParse({ ...valid, signers: [contadorSemFone, signers[1]] });
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(parsed.error.issues.some((i) => i.message.includes('J930.FONE'))).toBe(true);
    }
  });

  it('contador sem IND_CRC, sem EMAIL ou sem UF_CRC também é 400; o mesmo campo ausente no não-contador é válido', () => {
    const { indCrc: _c, ...semCrc } = signers[0];
    expect(SpedEcdRequestSchema.safeParse({ ...valid, signers: [semCrc, signers[1]] }).success).toBe(false);
    const { email: _e, ...semEmail } = signers[0];
    expect(SpedEcdRequestSchema.safeParse({ ...valid, signers: [semEmail, signers[1]] }).success).toBe(false);
    const { ufCrc: _u, ...semUf } = signers[0];
    expect(SpedEcdRequestSchema.safeParse({ ...valid, signers: [semUf, signers[1]] }).success).toBe(false);
    // CONTROLE: signers[1] (não-contador) já não tem nenhum destes campos e o payload passa.
    expect(SpedEcdRequestSchema.safeParse(valid).success).toBe(true);
  });

  it('contador com CNPJ (14) em vez de CPF (11) é 400 (F-C12-6 → a: o contador é pessoa física)', () => {
    const parsed = SpedEcdRequestSchema.safeParse({
      ...valid,
      signers: [{ ...signers[0], identCpfCnpj: '12ABC34501DE35' }, signers[1]],
    });
    expect(parsed.success).toBe(false);
  });
});

describe('SpedEcdRequestSchema — C12 item 7: máscara CRC (IND_CRC, NUM_SEQ_CRC, cruzamento com UF_CRC)', () => {
  it('normaliza grafias usuais de IND_CRC para UF-NNNNNN/O-D', () => {
    const parsed = SpedEcdRequestSchema.safeParse({
      ...valid,
      signers: [{ ...signers[0], indCrc: '1SP123456/O-1' }, signers[1]],
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      const contador = parsed.data.signers.find((s) => s.codAssin === '900');
      expect(contador?.indCrc).toBe('SP-123456/O-1');
    }
  });

  it('rejeita IND_CRC fora do formato do CRC', () => {
    expect(
      SpedEcdRequestSchema.safeParse({ ...valid, signers: [{ ...signers[0], indCrc: 'não é um crc' }, signers[1]] }).success,
    ).toBe(false);
  });

  it("UF_CRC divergente da UF embutida em IND_CRC é 400 ('UF do CRC não bate')", () => {
    const parsed = SpedEcdRequestSchema.safeParse({
      ...valid,
      signers: [{ ...signers[0], ufCrc: 'RJ' as const }, signers[1]],
    });
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(parsed.error.issues.some((i) => i.message.includes('UF_CRC'))).toBe(true);
    }
  });

  it('NUM_SEQ_CRC no formato UF/AAAA/NÚMERO é aceito e normalizado; fora do formato é 400', () => {
    const ok = SpedEcdRequestSchema.safeParse({ ...valid, signers: [{ ...signers[0], numSeqCrc: 'sp/2012/001' }, signers[1]] });
    expect(ok.success).toBe(true);
    if (ok.success) {
      const contador = ok.data.signers.find((s) => s.codAssin === '900');
      expect(contador?.numSeqCrc).toBe('SP/2012/001');
    }
    expect(
      SpedEcdRequestSchema.safeParse({ ...valid, signers: [{ ...signers[0], numSeqCrc: '2012/001' }, signers[1]] }).success,
    ).toBe(false);
  });
});

describe('SpedEcdRequestSchema — C12 item 11: REGRA_QUALIF_INV_RESP_LEGAL + REGRA_IDENT_CPF_CNPJ_COD_ASSIN_DUPLICIDADE (p. 202)', () => {
  it('contador (900) marcado como responsável legal é 400 — é o próprio exemplo oficial (p. 203) que viola a regra', () => {
    const parsed = SpedEcdRequestSchema.safeParse({
      ...valid,
      signers: [{ ...signers[0], indRespLegal: 'S' as const }, { ...signers[1], indRespLegal: 'N' as const }],
    });
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(parsed.error.issues.some((i) => i.message.includes('REGRA_QUALIF_INV_RESP_LEGAL'))).toBe(true);
    }
  });

  it('dois signatários com a mesma dupla CPF+COD_ASSIN é 400; o mesmo CPF com códigos diferentes (900 e 309, "assinatura como procurador") é válido', () => {
    // 3 signatários (contador + sócio + duplicata do sócio) para isolar a regra de duplicidade das
    // regras "exatamente um responsável legal" / "um contador e um não-contador", que já passam.
    const duplicated = SpedEcdRequestSchema.safeParse({
      ...valid,
      signers: [signers[0], signers[1], { ...signers[1], identNom: 'Sócio (dup)', indRespLegal: 'N' as const }],
    });
    expect(duplicated.success).toBe(false);
    if (!duplicated.success) {
      expect(
        duplicated.error.issues.some((i) => i.message.includes('REGRA_IDENT_CPF_CNPJ_COD_ASSIN_DUPLICIDADE')),
      ).toBe(true);
    }

    const sameCpfAsProcurador = SpedEcdRequestSchema.safeParse({
      ...valid,
      signers: [signers[0], { ...signers[1], identCpfCnpj: signers[0].identCpfCnpj, codAssin: '309' }],
    });
    expect(sameCpfAsProcurador.success).toBe(true);
  });
});

// BE-INCR-FIXED-ASSETS PR-4 (Passo 19) — retificação versionada: indFinEsc='1' (substituta) exige
// codHashSub (40 hex) + supersedesJobId + verificationTerm (J801+J932); '0' proíbe os três.
describe('SpedEcdRequestSchema — retificação versionada (indFinEsc=1)', () => {
  const verificationTerm = {
    codMotSubs: '001' as const,
    signers: [
      {
        identNom: 'Contador Termo',
        identCpfCnpj: '11122233396',
        codAssin: '910' as const,
        indCrc: 'SP-123456/O-1',
        email: 'termo@escritorio.com.br',
        fone: '1133334444',
        ufCrc: 'SP' as const,
      },
    ],
  };

  it('IND_FIN_ESC=0 (original) rejeita codHashSub/supersedesJobId/verificationTerm', () => {
    const withExtras = SpedEcdRequestSchema.safeParse({
      ...valid,
      declarant: { ...declarant, indFinEsc: '0' as const, codHashSub: 'a'.repeat(40) },
      supersedesJobId: 'job-1',
      verificationTerm,
    });
    expect(withExtras.success).toBe(false);
  });

  it('IND_FIN_ESC=1 sem codHashSub/supersedesJobId/verificationTerm é 400', () => {
    const missingAll = SpedEcdRequestSchema.safeParse({
      ...valid,
      declarant: { ...declarant, indFinEsc: '1' as const },
    });
    expect(missingAll.success).toBe(false);
  });

  it('codHashSub com 39 caracteres (não 40 hex) é 400 (adversarial ratificado)', () => {
    const short = SpedEcdRequestSchema.safeParse({
      ...valid,
      declarant: { ...declarant, indFinEsc: '1' as const, codHashSub: 'a'.repeat(39) },
      supersedesJobId: 'job-1',
      verificationTerm,
    });
    expect(short.success).toBe(false);
  });

  it('IND_FIN_ESC=1 com os três campos completos e válidos passa', () => {
    const ok = SpedEcdRequestSchema.safeParse({
      ...valid,
      declarant: { ...declarant, indFinEsc: '1' as const, codHashSub: 'a'.repeat(40) },
      supersedesJobId: 'job-1',
      verificationTerm,
    });
    expect(ok.success).toBe(true);
  });

  it('verificationTerm.signers só aceita codAssin=910 (920/Auditor Independente fora do escopo)', () => {
    const with920 = SpedEcdRequestSchema.safeParse({
      ...valid,
      declarant: { ...declarant, indFinEsc: '1' as const, codHashSub: 'a'.repeat(40) },
      supersedesJobId: 'job-1',
      verificationTerm: { ...verificationTerm, signers: [{ ...verificationTerm.signers[0], codAssin: '920' as unknown as '910' }] },
    });
    expect(with920.success).toBe(false);
  });

  it('COD_MOT_SUBS fora da tabela (001..005, 099) é 400', () => {
    const badCode = SpedEcdRequestSchema.safeParse({
      ...valid,
      declarant: { ...declarant, indFinEsc: '1' as const, codHashSub: 'a'.repeat(40) },
      supersedesJobId: 'job-1',
      verificationTerm: { ...verificationTerm, codMotSubs: '007' as unknown as '001' },
    });
    expect(badCode.success).toBe(false);
  });
});

/**
 * SpedEcfDto — a invariante IRMÃ da J930 do `SpedEcdDto.test.ts`, que estava descoberta.
 *
 * O gate de forma (`dtoShapeSnapshot.test.ts`) NÃO alcança este arquivo: `z.toJSONSchema()`
 * não representa `.superRefine`, então uma lista de signatários estruturalmente perfeita e
 * regulatoriamente inválida (sem contador, ou com contador sem CRC) passava pelo snapshot
 * inteiro sem nenhum teste olhando. O destino do erro é o `.txt` entregue à Receita —
 * a superfície de menor tolerância a erro deste repositório.
 *
 * Regra coberta (0930, REGRA_OBRIGATORIO_ASSIN_CONTADOR, manual p. 104):
 *   ≥1 signatário contador (IDENT_QUALIF='900', com CPF de 11 dígitos E IND_CRC)
 *   E ≥1 signatário não-contador.
 *
 * Molde: SpedEcdDto.test.ts. Todo caso negativo vem com o controle positivo — um teste que
 * espera falha passa por qualquer falha, inclusive por payload base quebrado.
 */
import { SpedEcfRequestSchema } from '../SpedEcfDto';

const declarant = {
  cnpj: '12345678000199',
  nome: 'Salão Luminaris ME',
  codNat: '2062',
  cnaeFiscal: '9602501',
  endereco: 'Rua das Flores',
  bairro: 'Centro',
  uf: 'SP' as const,
  codMun: '3550308',
  cep: '01310100',
  email: 'contato@luminaris.com.br',
};

// CPFs com DV válido (item 5, C12) — '11122233344'/'55566677788' (antigos) tinham DV inválido e só
// passavam porque o campo era regex de forma, não `isValidCpf`.
/** Contador: IDENT_QUALIF='900' ⇒ CPF (11) + IND_CRC obrigatórios. */
const contador = {
  identNom: 'Contador Responsável',
  identCpfCnpj: '11122233396',
  identQualif: '900',
  indCrc: 'SP-123456/O-1',
  email: 'contador@escritorio.com.br',
  fone: '1133334444',
};

/** Não-contador (sócio, IDENT_QUALIF='309') — sem exigência de CRC. */
const socio = {
  identNom: 'Sócia Administradora',
  identCpfCnpj: '55566677720',
  identQualif: '309',
  email: 'socia@luminaris.com.br',
  fone: '1199998888',
};

// BE-INCR-ECF-Y600 item 4: `socios` é obrigatório (lista vazia é forma válida; o serviço exige ≥ 1 ocorrência).
const valid = { unitId: 'unit-1', year: 2026, declarant, signers: [contador, socio], socios: [] };

/** Toda issue do superRefine é emitida em path ['signers'] — a asserção prova QUAL regra caiu. */
const failsOnSigners = (payload: unknown) => {
  const parsed = SpedEcfRequestSchema.safeParse(payload);
  expect(parsed.success).toBe(false);
  if (!parsed.success) {
    expect(parsed.error.issues.some((i) => i.path[0] === 'signers')).toBe(true);
  }
};

describe('SpedEcfRequestSchema — 0930 (superRefine)', () => {
  it('accepts um contador + um não-contador (CONTROLE — sem isto todo negativo abaixo é vazio)', () => {
    expect(SpedEcfRequestSchema.safeParse(valid).success).toBe(true);
  });

  it('rejects lista SEM contador (900) — a ECF exige assinatura de contador', () => {
    failsOnSigners({ ...valid, signers: [socio, { ...socio, identNom: 'Outro Sócio' }] });
  });

  it('rejects lista SÓ de contadores — falta o não-contador (representante legal)', () => {
    failsOnSigners({ ...valid, signers: [contador, { ...contador, identNom: 'Segundo Contador' }] });
  });

  it('rejects contador assinando com CNPJ (14) em vez de CPF (11)', () => {
    // O CNPJ passa no regex de campo (cpfOrCnpj aceita 11|14) — só o superRefine barra.
    failsOnSigners({
      ...valid,
      signers: [{ ...contador, identCpfCnpj: '12345678000199' }, socio],
    });
  });

  it('rejects contador SEM IND_CRC (registro no CRC é obrigatório para a qualificação 900)', () => {
    const { indCrc: _omit, ...contadorSemCrc } = contador;
    failsOnSigners({ ...valid, signers: [contadorSemCrc, socio] });
    // CONTROLE: a mesma ausência num NÃO-contador é válida — a regra é escopada ao 900.
    expect(SpedEcfRequestSchema.safeParse(valid).success).toBe(true);
  });

  // Desde o F-4 (máscara do CFC no 0930) o '' cai na máscara do CAMPO, antes da regra de presença do
  // superRefine — a asserção prova qual das duas caiu (revisão independente do #426).
  it("rejects indCrc '' no contador — pela máscara do CRC (F-4), em signers.0.indCrc", () => {
    const parsed = SpedEcfRequestSchema.safeParse({ ...valid, signers: [{ ...contador, indCrc: '' }, socio] });
    expect(parsed.success).toBe(false);
    expect(
      parsed.error?.issues.some((i) => i.path.join('.') === 'signers.0.indCrc' && i.message.startsWith('0930.IND_CRC')),
    ).toBe(true);
  });

  // BE-INCR-CRC-CFC-FOLLOWUPS F-4 → a: mesma máscara CFC do J930 (o leiaute ECF não declara formato,
  // Manual ECF L12 pp. 103-105 — escolha da casa, coerência ECD × ECF).
  it('IND_CRC do 0930 passa pela máscara CFC: normaliza, e fora do formato é 400 com prefixo 0930', () => {
    const ok = SpedEcfRequestSchema.safeParse({ ...valid, signers: [{ ...contador, indCrc: 'crc-sp 123456/o-1' }, socio] });
    expect(ok.success).toBe(true);
    expect(ok.data?.signers[0].indCrc).toBe('SP-123456/O-1');
    const bad = SpedEcfRequestSchema.safeParse({ ...valid, signers: [{ ...contador, indCrc: '1DF123' }, socio] });
    expect(bad.success).toBe(false);
    expect(JSON.stringify(bad.error?.issues)).toContain('0930.IND_CRC');
  });

  it('rejects um único signatário, seja ele contador ou não', () => {
    failsOnSigners({ ...valid, signers: [contador] });
    failsOnSigners({ ...valid, signers: [socio] });
  });

  it('aplica o default de fiscal quando o bloco é omitido (Presumido 9% / competência)', () => {
    const parsed = SpedEcfRequestSchema.safeParse(valid);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.fiscal).toEqual({ indAliqCsll: '1', indRecReceita: '2' });
    }
  });
});

describe('SpedEcfRequestSchema — CNPJ alfanumérico (BE-INCR-CNPJ-ALFA, F-CNPJ-1 → b, F-CNPJ-2 → a)', () => {
  it('aceita CNPJ alfanumérico MAIÚSCULO no declarante e no signatário não-contador (só formato)', () => {
    expect(SpedEcfRequestSchema.safeParse({ ...valid, declarant: { ...declarant, cnpj: '12ABC34501DE35' } }).success).toBe(true);
    expect(SpedEcfRequestSchema.safeParse({ ...valid, signers: [contador, { ...socio, identCpfCnpj: '12ABC34501DE35' }] }).success).toBe(true);
  });

  it('rejeita minúscula, 12 posições e máscara no declarante', () => {
    for (const cnpj of ['12abc34501de35', '12ABC34501DE', '12.ABC.345/01-DE35']) {
      expect(SpedEcfRequestSchema.safeParse({ ...valid, declarant: { ...declarant, cnpj } }).success).toBe(false);
    }
  });

  it('contador (900) continua exigindo CPF de 11 dígitos — CNPJ alfanumérico não passa pelo refine', () => {
    expect(SpedEcfRequestSchema.safeParse({ ...valid, signers: [{ ...contador, identCpfCnpj: '12ABC34501DE35' }, socio] }).success).toBe(false);
  });
});

describe('SpedEcfRequestSchema — C12 item 4: IDENT_QUALIF fechado na tabela SPEDECF_QUALIF_ASSINANTE (Manual ECF L12 p. 105)', () => {
  it('rejeita código fora da tabela (mesmo mantendo o shape de 3 dígitos)', () => {
    expect(SpedEcfRequestSchema.safeParse({ ...valid, signers: [contador, { ...socio, identQualif: '305' }] }).success).toBe(false);
  });
});

describe('SpedEcfRequestSchema — C12 item 5: CPF com DV no signatário (REGRA_VALIDA_CPF_CNPJ)', () => {
  it('CPF com DV inválido no não-contador é 400; CPF válido passa (CONTROLE já coberto acima)', () => {
    expect(SpedEcfRequestSchema.safeParse({ ...valid, signers: [contador, { ...socio, identCpfCnpj: '11111111111' }] }).success).toBe(false);
  });
});

// BE-INCR-FIXED-ASSETS PR-4 (Passo 19) — retificação versionada: RETIFICADORA='S' exige numRec
// (40 chars) + supersedesJobId; 'N' proíbe os dois. 'F' não existe na tabela do manual — 400 de
// propósito, adversarial ratificado.
describe('SpedEcfRequestSchema — retificação versionada (RETIFICADORA)', () => {
  it('RETIFICADORA=F (fora da tabela) é 400', () => {
    expect(SpedEcfRequestSchema.safeParse({ ...valid, retificadora: 'F' }).success).toBe(false);
  });

  it('RETIFICADORA=S sem numRec/supersedesJobId é 400', () => {
    expect(SpedEcfRequestSchema.safeParse({ ...valid, retificadora: 'S' }).success).toBe(false);
  });

  it('RETIFICADORA=S com numRec de 39 caracteres é 400', () => {
    expect(
      SpedEcfRequestSchema.safeParse({
        ...valid,
        retificadora: 'S',
        numRec: 'a'.repeat(39),
        supersedesJobId: 'job-1',
      }).success,
    ).toBe(false);
  });

  it('RETIFICADORA=S com numRec (40) + supersedesJobId passa', () => {
    expect(
      SpedEcfRequestSchema.safeParse({
        ...valid,
        retificadora: 'S',
        numRec: 'a'.repeat(40),
        supersedesJobId: 'job-1',
      }).success,
    ).toBe(true);
  });

  it('RETIFICADORA=N (default) com numRec informado é 400', () => {
    expect(SpedEcfRequestSchema.safeParse({ ...valid, numRec: 'a'.repeat(40) }).success).toBe(false);
  });
});

// ─── Y600 (BE-INCR-ECF-Y600 itens 4–6; Manual ECF L12 pp. 570–574) ─────────────────────────────────────────

const zeros = { remTrabCents: 0, lucDivCents: 0, jurCapCents: 0, demRendCents: 0, irRetCents: 0 };
const socioY600 = { partnerId: 'p-1', qualif: '02', valores: zeros };
const dirigente = { nome: 'Diretora Não Sócia', cpf: '52998224725', qualif: '10', dtAltSoc: '2024-03-01', valores: zeros };
const comY600 = { ...valid, socios: [socioY600], dirigentes: [dirigente] };

const issuePaths = (payload: unknown): string[] => {
  const parsed = SpedEcfRequestSchema.safeParse(payload);
  expect(parsed.success).toBe(false);
  return parsed.success ? [] : parsed.error.issues.map((i) => i.path.join('.'));
};

describe('SpedEcfRequestSchema — Y600: socios e dirigentes', () => {
  it('accepts socios + dirigentes válidos (CONTROLE); dirigentes ausente vira [] (item 5)', () => {
    expect(SpedEcfRequestSchema.safeParse(comY600).success).toBe(true);
    const semDirigentes = SpedEcfRequestSchema.parse({ ...valid, socios: [socioY600] });
    expect(semDirigentes.dirigentes).toEqual([]);
  });

  it('item 4: socios é obrigatório (sem default)', () => {
    const { socios: _s, ...semSocios } = valid;
    expect(issuePaths(semSocios)).toContain('socios');
  });

  it('item 4 (F-Y600-3): os 5 valores são obrigatórios, sem default zero; centavos inteiros ≥ 0', () => {
    for (const k of Object.keys(zeros) as Array<keyof typeof zeros>) {
      const falta: Record<string, number> = { ...zeros };
      delete falta[k];
      expect(issuePaths({ ...comY600, socios: [{ ...socioY600, valores: falta }] })).toContain(`socios.0.valores.${k}`);
    }
    expect(issuePaths({ ...comY600, socios: [{ ...socioY600, valores: { ...zeros, lucDivCents: -1 } }] })).toContain('socios.0.valores.lucDivCents');
    expect(issuePaths({ ...comY600, socios: [{ ...socioY600, valores: { ...zeros, lucDivCents: 1.5 } }] })).toContain('socios.0.valores.lucDivCents');
  });

  it('item 4: partnerId repetido → 400; chave desconhecida no complemento → 400 (.strict())', () => {
    expect(issuePaths({ ...comY600, socios: [socioY600, { ...socioY600, qualif: '01' }] })).toContain('socios.1.partnerId');
    expect(issuePaths({ ...comY600, socios: [{ ...socioY600, nome: 'X' }] })).toContain('socios.0');
  });

  it('item 6 (F-Y600-9): QUALIF 18 recusado; fora de 01..17 recusado', () => {
    expect(issuePaths({ ...comY600, socios: [{ ...socioY600, qualif: '18' }] })).toContain('socios.0.qualif');
    expect(issuePaths({ ...comY600, socios: [{ ...socioY600, qualif: '00' }] })).toContain('socios.0.qualif');
  });

  it('item 6 (F-Y600-10): pais = 3 dígitos e ≠ 105; percCapVotBp em 0..10000', () => {
    expect(SpedEcfRequestSchema.safeParse({ ...comY600, socios: [{ ...socioY600, pais: '249' }] }).success).toBe(true);
    expect(issuePaths({ ...comY600, socios: [{ ...socioY600, pais: '105' }] })).toContain('socios.0.pais');
    expect(issuePaths({ ...comY600, socios: [{ ...socioY600, pais: '24' }] })).toContain('socios.0.pais');
    expect(issuePaths({ ...comY600, socios: [{ ...socioY600, percCapVotBp: 10001 }] })).toContain('socios.0.percCapVotBp');
  });

  it('item 6 (M12): representante legal com CPF de DV válido e QUALIF_REP_LEG 01..06, os dois juntos', () => {
    const rep = { cpf: '52998224725', qualif: '03' };
    expect(SpedEcfRequestSchema.safeParse({ ...comY600, socios: [{ ...socioY600, representanteLegal: rep }] }).success).toBe(true);
    expect(issuePaths({ ...comY600, socios: [{ ...socioY600, representanteLegal: { cpf: '52998224725' } }] })).toContain('socios.0.representanteLegal.qualif');
    expect(issuePaths({ ...comY600, socios: [{ ...socioY600, representanteLegal: { qualif: '01' } }] })).toContain('socios.0.representanteLegal.cpf');
    expect(issuePaths({ ...comY600, socios: [{ ...socioY600, representanteLegal: { ...rep, cpf: '52998224726' } }] })).toContain('socios.0.representanteLegal.cpf');
    expect(issuePaths({ ...comY600, socios: [{ ...socioY600, representanteLegal: { ...rep, qualif: '07' } }] })).toContain('socios.0.representanteLegal.qualif');
  });

  it('item 5: dirigente com CPF de DV válido e QUALIF 10..17 (sócio/titular fora)', () => {
    expect(issuePaths({ ...comY600, dirigentes: [{ ...dirigente, cpf: '52998224726' }] })).toContain('dirigentes.0.cpf');
    expect(issuePaths({ ...comY600, dirigentes: [{ ...dirigente, qualif: '01' }] })).toContain('dirigentes.0.qualif');
    expect(issuePaths({ ...comY600, dirigentes: [{ ...dirigente, dtAltSoc: '2024-02-30' }] })).toContain('dirigentes.0.dtAltSoc');
  });

  it('item 6: dtFimSoc ≥ dtAltSoc e dentro do ano (REGRA_DATA_FIM_SOC, p. 574)', () => {
    expect(SpedEcfRequestSchema.safeParse({ ...comY600, dirigentes: [{ ...dirigente, dtFimSoc: '2026-06-30' }] }).success).toBe(true);
    expect(issuePaths({ ...comY600, dirigentes: [{ ...dirigente, dtAltSoc: '2026-07-01', dtFimSoc: '2026-06-30' }] })).toContain('dirigentes.0.dtFimSoc');
    expect(issuePaths({ ...comY600, dirigentes: [{ ...dirigente, dtFimSoc: '2025-12-31' }] })).toContain('dirigentes.0.dtFimSoc');
    expect(issuePaths({ ...comY600, dirigentes: [{ ...dirigente, dtFimSoc: '2027-01-01' }] })).toContain('dirigentes.0.dtFimSoc');
  });
});

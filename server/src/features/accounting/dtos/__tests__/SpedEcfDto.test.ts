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

/** Contador: IDENT_QUALIF='900' ⇒ CPF (11) + IND_CRC obrigatórios. */
const contador = {
  identNom: 'Contador Responsável',
  identCpfCnpj: '11122233344',
  identQualif: '900',
  indCrc: 'SP-123456/O-1',
  email: 'contador@escritorio.com.br',
  fone: '1133334444',
};

/** Não-contador (sócio, IDENT_QUALIF='309') — sem exigência de CRC. */
const socio = {
  identNom: 'Sócia Administradora',
  identCpfCnpj: '55566677788',
  identQualif: '309',
  email: 'socia@luminaris.com.br',
  fone: '1199998888',
};

const valid = { unitId: 'unit-1', year: 2026, declarant, signers: [contador, socio] };

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

  it('rejects indCrc string vazia no contador (presença vazia não é presença)', () => {
    failsOnSigners({ ...valid, signers: [{ ...contador, indCrc: '' }, socio] });
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

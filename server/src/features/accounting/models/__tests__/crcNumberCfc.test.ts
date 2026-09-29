/**
 * Teste-guarda — número de registro no CRC no formato do CFC, inclusive TRANSFERIDO/SECUNDÁRIO.
 *
 * Fonte: Manual de Registro do Sistema CFC/CRCs, 2ª ed. (2009), pp. 13-14 — o mesmo documento que a
 * cédula F13 (10/09) cita como origem da máscara. O número básico é `UF-NNNNNN/O-D`; no registro
 * transferido "será acrescentada a letra T … acompanhada de um hífen e da sigla designativa da
 * jurisdição do CRC de destino" (ex. oficial `SP-123456/O-3 T-MG`), e no secundário a letra S
 * (`PI-111222/O-5 S-AC`). Res. CFC 1.494/2015 art. 5º mantém o transferido com a mesma forma.
 *
 * Decisão do dono (28/09/2026, questionário): a UF do CRC (J930 UF_CRC / contato crcUf) de um
 * registro com sufixo aceita a UF de ORIGEM **ou** a do sufixo; qualquer outra continua 400.
 */
import { normalizeCrcNumber, parseCrcNumber, CRC_NUMBER_RE } from '../AccountingContact.model';
import { SpedEcdRequestSchema } from '../../dtos/SpedEcdDto';
import { RegisterContactSchema } from '../../dtos/AccountingContactDto';

const ecd = (indCrc: string, ufCrc: string) => ({
  unitId: 'unit-1',
  mappingVersion: 'RFB-2024',
  year: 2026,
  declarant: {
    nome: 'Salão Luminaris ME',
    cnpj: '12345678000199',
    uf: 'SP',
    codMun: '3550308',
    indNire: '0',
    indGrandePorte: '0',
  },
  book: { numOrd: '1', natLivr: 'Livro Diário', dtExSocial: '2026-12-31' },
  signers: [
    {
      identNom: 'Contador',
      identCpfCnpj: '11122233396',
      codAssin: '900',
      indCrc,
      email: 'contador@escritorio.com.br',
      fone: '1133334444',
      ufCrc,
      indRespLegal: 'N',
    },
    { identNom: 'Sócio', identCpfCnpj: '55566677720', codAssin: '309', indRespLegal: 'S' },
  ],
});

const contact = (crcNumber: string, crcUf: string) => ({
  unitId: 'unit-1',
  name: 'Contador',
  email: 'contador@escritorio.com.br',
  cpf: '11122233396',
  crcNumber,
  crcUf,
});

describe('CRC no formato do CFC — registro transferido/secundário (Manual de Registro CFC pp. 13-14)', () => {
  it('CONTROLE: originário segue aceito e a UF divergente segue recusada', () => {
    expect(normalizeCrcNumber('SP-123456/O-3')).toBe('SP-123456/O-3');
    expect(SpedEcdRequestSchema.safeParse(ecd('SP-123456/O-3', 'SP')).success).toBe(true);
    expect(SpedEcdRequestSchema.safeParse(ecd('SP-123456/O-3', 'RJ')).success).toBe(false);
  });

  it('aceita e normaliza os exemplos oficiais com sufixo T-UF / S-UF', () => {
    const got = ['SP-123456/O-3 T-MG', 'sp123456/o-3 t-mg', 'PI-111222/O-5 S-AC'].map((v) => {
      const n = normalizeCrcNumber(v);
      return [v, n, n !== null && CRC_NUMBER_RE.test(n)];
    });
    expect(got).toEqual([
      ['SP-123456/O-3 T-MG', 'SP-123456/O-3 T-MG', true],
      ['sp123456/o-3 t-mg', 'SP-123456/O-3 T-MG', true],
      ['PI-111222/O-5 S-AC', 'PI-111222/O-5 S-AC', true],
    ]);
  });

  it('J930 e contato: transferido aceita UF de origem OU de destino; outra UF segue 400', () => {
    const verdicts = (['SP', 'MG', 'RJ'] as const).map((uf) => [
      uf,
      SpedEcdRequestSchema.safeParse(ecd('SP-123456/O-3 T-MG', uf)).success,
      RegisterContactSchema.safeParse(contact('SP-123456/O-3 T-MG', uf)).success,
    ]);
    expect(verdicts).toEqual([
      ['SP', true, true],
      ['MG', true, true],
      ['RJ', false, false],
    ]);
  });
});

/**
 * BE-INCR-CRC-CFC-FOLLOWUPS itens 1-3 (F-1..F-3 → a, dono 28/09/2026): só o tipo `O` é vigente
 * (Res. CFC 1.494/2015 arts. 3º e 36), a grafia compacta dos ERPs (6 dígitos + DV) normaliza, e
 * o número sem DV é recusado com motivo próprio.
 */
describe('CRC — tipo, provisório e grafia compacta (BE-INCR-CRC-CFC-FOLLOWUPS)', () => {
  it('item 1: `T` no lugar do `O` é 400 de formato; o transferido pelo sufixo segue aceito', () => {
    expect(parseCrcNumber('SP-123456/T-7')).toEqual({ ok: false, reason: 'formato' });
    expect(parseCrcNumber('SP-123456/O-3 T-MG')).toEqual({ ok: true, normalized: 'SP-123456/O-3 T-MG' });
  });

  it('item 2: provisório é recusado com o motivo próprio, e a mensagem cita a resolução', () => {
    expect(parseCrcNumber('TO-654321/P-8')).toEqual({ ok: false, reason: 'provisorio_extinto' });
    const r = SpedEcdRequestSchema.safeParse(ecd('TO-654321/P-8', 'TO'));
    expect(r.success).toBe(false);
    expect(JSON.stringify(r.error?.issues)).toContain('Res. CFC 1.494/2015 art. 36');
  });

  it('item 3: grafia compacta normaliza para o tipo O; sem DV é 400 com dica; 8 dígitos é formato', () => {
    expect(parseCrcNumber('SP1234567')).toEqual({ ok: true, normalized: 'SP-123456/O-7' });
    expect(parseCrcNumber('1sp1234567')).toEqual({ ok: true, normalized: 'SP-123456/O-7' });
    expect(parseCrcNumber('1SP123456')).toEqual({ ok: false, reason: 'sem_dv' });
    expect(parseCrcNumber('SP12345678')).toEqual({ ok: false, reason: 'formato' });
    const r = RegisterContactSchema.safeParse(contact('1SP123456', 'SP'));
    expect(r.success).toBe(false);
    expect(JSON.stringify(r.error?.issues)).toContain('falta o dígito verificador');
  });
});

describe('CRC — as siglas do número são UFs da tabela (revisão independente do #426, achado A)', () => {
  it('origem ou sufixo fora da Tabela de UF é formato inválido, mesmo com a outra sigla batendo com a UF do CRC', () => {
    expect(parseCrcNumber('ZZ-123456/O-3 T-MG')).toEqual({ ok: false, reason: 'formato' });
    expect(parseCrcNumber('SP-123456/O-3 T-ZZ')).toEqual({ ok: false, reason: 'formato' });
    expect(parseCrcNumber('ZZ1234567')).toEqual({ ok: false, reason: 'formato' });
    expect(parseCrcNumber('ZZ123456')).toEqual({ ok: false, reason: 'formato' });
    expect(RegisterContactSchema.safeParse(contact('ZZ-123456/O-3 T-MG', 'MG')).success).toBe(false);
    expect(SpedEcdRequestSchema.safeParse(ecd('SP-123456/O-3 T-ZZ', 'SP')).success).toBe(false);
    // controle: as mesmas formas com UF real passam
    expect(RegisterContactSchema.safeParse(contact('SP-123456/O-3 T-MG', 'MG')).success).toBe(true);
  });
});

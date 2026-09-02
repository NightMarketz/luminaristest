/**
 * SPED ECF (Fiscal · Lucro REAL, esqueleto) serializer (ADR-INCR-SPED-ECF-FASE3).
 *
 * Espelha a disciplina de `ecf.test.ts` (BRIEF item 12):
 *  - mesma entrada → arquivo byte-idêntico (sha256);
 *  - CRLF em toda linha, inclusive a última;
 *  - 9900 auto-referente, 9999 = total;
 *  - datas por slice literal (spedDate), valores por centavos (nenhum float);
 *  - 0010 parametrizado: FORMA_TRIB/FORMA_TRIB_PER/FORMA_APUR são repassados do input — o
 *    serializer não contém nenhum dígito de regime;
 *  - L/M/N (e P) são marcadores vazios — Fase 3, conteúdo pendente (Forks 2/3/4).
 */
import { createHash } from 'crypto';
import { buildEcfRealFile, type EcfRealFileInput } from '../ecfReal';
import { serializeEcf, build0010 } from '../ecf';

const sampleInput = (): EcfRealFileInput => ({
  declarant: {
    cnpj: '11111111000191',
    nome: 'INDUSTRIA TESTE LTDA',
    dtIni: '2025-01-01',
    dtFin: '2025-12-31',
    codNat: '2062',
    cnaeFiscal: '9602501',
    endereco: 'RUA DAS FLORES',
    num: '100',
    bairro: 'CENTRO',
    uf: 'DF',
    codMun: '5300108',
    cep: '70000000',
    numTel: '6133334444',
    email: 'industria@teste.com',
  },
  // Placeholders de teste — o dígito/código do regime vem do caller em produção.
  fiscal: { formaTrib: '1', formaTribPer: 'XXXX', formaApur: 'T', indRecReceita: '2' },
  params: { indAliqCsll: '1' },
  signers: [
    { identNom: 'CONTADOR TESTE', identCpfCnpj: '12345678900', identQualif: '900', indCrc: '1DF123456', email: 'contador@teste.com', fone: '6133334444' },
    { identNom: 'SOCIO TESTE', identCpfCnpj: '98765432100', identQualif: '205', email: 'socio@teste.com', fone: '6133335555' },
  ],
  quarters: [
    { perApur: 'T01', dtIni: '2025-01-01', dtFin: '2025-03-31', l100Source: { assetsCents: 100, liabilitiesCents: 40, equityCents: 60 }, l300Source: { ytdNetResultCents: 12345 } },
    { perApur: 'T02', dtIni: '2025-04-01', dtFin: '2025-06-30', l100Source: { assetsCents: 200, liabilitiesCents: 80, equityCents: 120 }, l300Source: { ytdNetResultCents: -500 } },
    { perApur: 'T03', dtIni: '2025-07-01', dtFin: '2025-09-30', l100Source: { assetsCents: 300, liabilitiesCents: 120, equityCents: 180 }, l300Source: { ytdNetResultCents: 0 } },
    { perApur: 'T04', dtIni: '2025-10-01', dtFin: '2025-12-31', l100Source: { assetsCents: 400, liabilitiesCents: 160, equityCents: 240 }, l300Source: { ytdNetResultCents: 99999 } },
  ],
});

const ALL_EMPTY_BLOCKS = ['C', 'E', 'J', 'K', 'L', 'M', 'N', 'P', 'Q', 'S', 'T', 'U', 'V', 'W', 'X', 'Y'];

describe('ecfReal file assembler — esqueleto', () => {
  it('is byte-deterministic (same input → same sha256)', () => {
    const a = serializeEcf(buildEcfRealFile(sampleInput()));
    const b = serializeEcf(buildEcfRealFile(sampleInput()));
    expect(sha(a)).toBe(sha(b));
  });

  it('ends every line with CRLF, including the last; every record is pipe-delimited', () => {
    const out = serializeEcf(buildEcfRealFile(sampleInput()));
    expect(out.endsWith('\r\n')).toBe(true);
    for (const line of out.split('\r\n').filter(Boolean)) {
      expect(line.startsWith('|')).toBe(true);
      expect(line.endsWith('|')).toBe(true);
    }
  });

  it('emits 0000 first and 9999 last, in canonical block order (Bloco 0 … 9)', () => {
    const lines = buildEcfRealFile(sampleInput());
    expect(lines[0].startsWith('|0000|')).toBe(true);
    expect(lines[lines.length - 1].startsWith('|9999|')).toBe(true);
    const regs = lines.map((l) => l.split('|')[1]);
    const openers = regs.filter((r) => /^(0001|C001|E001|J001|K001|L001|M001|N001|P001|Q001|S001|T001|U001|V001|W001|X001|Y001|9001)$/.test(r));
    expect(openers).toEqual([
      '0001', 'C001', 'E001', 'J001', 'K001', 'L001', 'M001', 'N001',
      'P001', 'Q001', 'S001', 'T001', 'U001', 'V001', 'W001', 'X001', 'Y001', '9001',
    ]);
  });

  it('0010 repassa FORMA_TRIB / FORMA_APUR / FORMA_TRIB_PER do input — nenhum dígito de regime é do serializer', () => {
    const lines = buildEcfRealFile(sampleInput());
    // REG|HASH(vazio, Fork 2)|OPT_REFIS|FORMA_TRIB|FORMA_APUR|COD_QUALIF|FORMA_TRIB_PER|MES_BAL_RED|TIP_ESC_PRE|TIP_ENT|FORMA_APUR_I|APUR_CSLL|IND_REC_RECEITA
    expect(lines).toContain('|0010||N|1|T|01|XXXX||C||||2|');
    // Troca o input ⇒ troca a linha (prova que é parâmetro, não constante).
    const other = sampleInput();
    other.fiscal = { ...other.fiscal, formaTrib: '7', formaTribPer: 'YYYY', indRecReceita: '1' };
    expect(buildEcfRealFile(other)).toContain('|0010||N|7|T|01|YYYY||C||||1|');
    // O default do Presumido (build0010 sem args = '5'/'PPPP') NUNCA aparece na saída do Real.
    expect(lines).not.toContain(build0010());
    expect(lines.some((l) => l.startsWith('|0010|') && l.includes('|5|'))).toBe(false);
    expect(lines.some((l) => l.includes('PPPP'))).toBe(false);
  });

  it('HASH_ECF_ANTERIOR sai vazio (Fork 2 pendente — mesmo comportamento do Presumido)', () => {
    const line0010 = buildEcfRealFile(sampleInput()).find((l) => l.startsWith('|0010|'))!;
    expect(line0010.split('|')[2]).toBe('');
  });

  it('0020 carries IND_ALIQ_CSLL from input (32 fields)', () => {
    const lines = buildEcfRealFile(sampleInput());
    const line0020 = lines.find((l) => l.startsWith('|0020|'))!;
    expect(line0020.startsWith('|0020|1|0|')).toBe(true);
    expect(line0020.split('|').length).toBe(34);
    const other = sampleInput();
    other.params = { indAliqCsll: '4' };
    expect(buildEcfRealFile(other).find((l) => l.startsWith('|0020|'))!.startsWith('|0020|4|0|')).toBe(true);
  });

  it('L/M/N (Fase 3, pendente) e todos os demais blocos entre 0 e 9 são marcadores vazios', () => {
    const lines = buildEcfRealFile(sampleInput());
    for (const b of ALL_EMPTY_BLOCKS) {
      expect(lines).toContain(`|${b}001|1|`);
      expect(lines).toContain(`|${b}990|2|`);
    }
    // Nenhuma linha de dado de L/M/N/P: nada além de abertura+encerramento por bloco.
    for (const b of ['L', 'M', 'N', 'P']) {
      const inBlock = lines.filter((l) => l.startsWith(`|${b}`));
      expect(inBlock).toEqual([`|${b}001|1|`, `|${b}990|2|`]);
    }
  });

  it('não emite nenhum valor dos trimestres (fontes L100/L300 chegam mas não saem — leiaute pendente)', () => {
    const lines = buildEcfRealFile(sampleInput());
    // Nenhum valor monetário dos quarters aparece no arquivo (nem como decimal SPED).
    for (const token of ['123,45', '999,99', '5,00', '1,00', '2,00', '3,00', '4,00', 'T01', 'T02', 'T03', 'T04']) {
      expect(lines.some((l) => l.includes(token))).toBe(false);
    }
    // E os quarters não mudam o arquivo: sem quarters ⇒ mesmo arquivo.
    const noQuarters = sampleInput();
    noQuarters.quarters = [];
    expect(serializeEcf(buildEcfRealFile(noQuarters))).toBe(serializeEcf(buildEcfRealFile(sampleInput())));
  });

  it('0990 conta as linhas do bloco 0 (auto-inclusivo); 9900 é auto-referente; 9999 = total', () => {
    const lines = buildEcfRealFile(sampleInput());
    const total = lines.length;
    expect(lines[lines.length - 1]).toBe(`|9999|${total}|`);
    // Bloco 0: 0000, 0001, 0010, 0020, 0030, 0930×2, 0990 = 8 linhas.
    expect(lines).toContain('|0990|8|');
    expect(lines.indexOf('|0990|8|')).toBe(7);
    // 9900 para 0000 = 1; uma 9900 por tipo presente, contando 9900/9990/9999.
    expect(lines).toContain('|9900|0000|1|||');
    expect(lines).toContain('|9900|0930|2|||');
    const nine900 = lines.filter((l) => l.startsWith('|9900|'));
    const typesInFile = new Set(lines.map((l) => l.split('|')[1]));
    expect(nine900).toHaveLength(typesInFile.size);
    expect(lines).toContain(`|9900|9900|${typesInFile.size}|||`);
    // 9990 = linhas do bloco 9 (9001 + 9900s + 9990 + 9999).
    const nine990 = lines.find((l) => l.startsWith('|9990|'))!;
    expect(Number(nine990.split('|')[2])).toBe(1 + nine900.length + 2);
  });

  it('datas do declarante saem por slice literal (DDMMAAAA), nunca por Date/locale', () => {
    const line0000 = buildEcfRealFile(sampleInput()).find((l) => l.startsWith('|0000|'))!;
    expect(line0000).toContain('|01012025|31122025|');
  });
});

function sha(s: string): string {
  return createHash('sha256').update(Buffer.from(s, 'latin1')).digest('hex');
}

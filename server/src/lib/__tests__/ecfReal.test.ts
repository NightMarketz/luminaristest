/**
 * SPED ECF (Fiscal · Lucro REAL) serializer — ADR-INCR-SPED-ECF-FASE3 + BRIEF 3B (Blocos L/M/N).
 *
 * GATE VERMELHO→VERDE do item 6 (protocolo de conserto de gate): a versão anterior deste arquivo
 * cravava que "nenhum valor dos trimestres chega ao arquivo" sobre `quarters.l100Source/l300Source`
 * — contrato que o Manual diz não alimentar L100/L300 (pp.224/232, Fork 6→b). Aquele teste ficou
 * VERMELHO quando `quarters` saiu do contrato (tsc) e é reescrito aqui sobre `periods/lalur/parteB`.
 *
 * Espelha a disciplina de `ecf.test.ts` (item 16): mesma entrada → byte-idêntico (sha256); CRLF em
 * toda linha; 9900 auto-referente contando os registros novos; datas por slice literal; valores por
 * centavos; 0010 parametrizado (nenhum dígito de regime é do serializer).
 */
import { createHash } from 'crypto';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import {
  buildEcfRealFile,
  buildM010,
  buildParteALine,
  buildParteBChild,
  buildContabilChild,
  buildNLine,
  buildPeriodReg,
  indVlCtaContabil,
  indVlCtaParteB,
  type EcfRealFileInput,
  type EcfRealLalurLine,
} from '../ecfReal';
import { serializeEcf, build0010 } from '../ecf';
import { ECF_L12_CATALOG, linhasDoLivro } from '../../features/accounting/models/Lalur.model';

const periods: EcfRealFileInput['periods'] = [
  { perApur: 'T01', dtIni: '2025-01-01', dtFin: '2025-03-31' },
  { perApur: 'T02', dtIni: '2025-04-01', dtFin: '2025-06-30' },
  { perApur: 'T03', dtIni: '2025-07-01', dtFin: '2025-09-30' },
  { perApur: 'T04', dtIni: '2025-10-01', dtFin: '2025-12-31' },
];

/** Uma adição (M300/7, IND_RELACAO=4) + uma exclusão (M300 com conta contábil) que NÃO se cancelam. */
const lalurLines = (): EcfRealLalurLine[] => [
  { livro: 'lalur', perApur: 'T01', codigo: '7', descricao: 'Custos não dedutíveis', tipoLancamento: 'A', indRelacao: '4', valorCents: 123456, hist: 'Custos do T1' },
  { livro: 'lalur', perApur: 'T01', codigo: '166', descricao: 'Exclusão teste', tipoLancamento: 'E', indRelacao: '2', valorCents: 50000, codCta: '3.1.1', codNat: '04' },
  { livro: 'lalur', perApur: 'T02', codigo: '175', descricao: 'Compensação teste', tipoLancamento: 'P', indRelacao: '1', valorCents: 700, codCtaB: 'PF-2024' },
  { livro: 'lacs', perApur: 'T01', codigo: '7', descricao: 'Custos não dedutíveis', tipoLancamento: 'A', indRelacao: '3', valorCents: 999, codCtaB: 'BC-2024', codCta: '1.1.1', codNat: '01' },
  { livro: 'n630', perApur: 'T04', codigo: '4', descricao: 'PAT', valorCents: 1000 },
  { livro: 'n500', perApur: 'T03', codigo: '2', descricao: 'Estimativa', valorCents: 2500 },
];

const sampleInput = (over: Partial<EcfRealFileInput> = {}): EcfRealFileInput => ({
  declarant: {
    cnpj: '11111111000191', nome: 'INDUSTRIA TESTE LTDA', dtIni: '2025-01-01', dtFin: '2025-12-31',
    codNat: '2062', cnaeFiscal: '9602501', endereco: 'RUA DAS FLORES', num: '100', bairro: 'CENTRO',
    uf: 'DF', codMun: '5300108', cep: '70000000', numTel: '6133334444', email: 'industria@teste.com',
  },
  fiscal: { formaTrib: '1', formaTribPer: 'RRRR', formaApur: 'T', indRecReceita: '2' },
  params: { indAliqCsll: '1' },
  signers: [
    { identNom: 'CONTADOR TESTE', identCpfCnpj: '12345678900', identQualif: '900', indCrc: '1DF123456', email: 'contador@teste.com', fone: '6133334444' },
    { identNom: 'SOCIO TESTE', identCpfCnpj: '98765432100', identQualif: '205', email: 'socio@teste.com', fone: '6133335555' },
  ],
  periods,
  lalur: lalurLines(),
  parteB: [
    { codCtaB: 'PF-2024', descricao: 'Prejuízo fiscal 2024', dtApLal: '2024-12-31', codPbRfb: '1000', codTributo: 'I', saldoIniCents: 500000, indSaldoIni: 'D' },
    { codCtaB: 'BC-2024', descricao: 'BC negativa 2024', dtApLal: '2025-03-31', codPbRfb: '1003', dtLimLal: '2030-12-31', codTributo: 'C', saldoIniCents: 0, indSaldoIni: 'D', cnpjSitEsp: '11111111000191' },
  ],
  codVer: '0012',
  ...over,
});

const regsOf = (lines: string[]) => lines.map((l) => l.split('|')[1]);
const sha = (s: string) => createHash('sha256').update(Buffer.from(s, 'latin1')).digest('hex');

describe('ecfReal — Bloco 0 (itens 2/3/4 + Fork 7)', () => {
  it('0000.COD_VER vem de `codVer` (resolvido por ano fora do serializer) — nunca constante', () => {
    expect(buildEcfRealFile(sampleInput())[0]).toMatch(/^\|0000\|LECF\|0012\|/);
    expect(buildEcfRealFile(sampleInput({ codVer: '0013' }))[0]).toMatch(/^\|0000\|LECF\|0013\|/);
  });

  it('0010 repassa FORMA_TRIB / FORMA_APUR / FORMA_TRIB_PER do input; o default do Presumido nunca sai', () => {
    const lines = buildEcfRealFile(sampleInput());
    expect(lines).toContain('|0010||N|1|T|01|RRRR||C||||2|');
    const other = sampleInput();
    other.fiscal = { ...other.fiscal, formaTrib: '7', formaTribPer: 'PPRR', indRecReceita: '1' };
    expect(buildEcfRealFile(other)).toContain('|0010||N|7|T|01|PPRR||C||||1|');
    expect(lines).not.toContain(build0010());
  });

  it('item 3 (Fork 2→d): HASH_ECF_ANTERIOR sai VAZIO — Manual p.70, campo 2 "preenchido automaticamente pelo sistema"', () => {
    const line0010 = buildEcfRealFile(sampleInput()).find((l) => l.startsWith('|0010|'))!;
    expect(line0010.split('|')[2]).toBe('');
  });
});

describe('ecfReal — Bloco L (item 5, Fork 6→b)', () => {
  it('L001(IND_DAD=0) + L030 × 4 com as janelas + L990=6; nenhuma L100/L300', () => {
    const lines = buildEcfRealFile(sampleInput());
    const L = lines.filter((l) => l.startsWith('|L'));
    expect(L).toEqual([
      '|L001|0|',
      '|L030|01012025|31032025|T01|',
      '|L030|01042025|30062025|T02|',
      '|L030|01072025|30092025|T03|',
      '|L030|01102025|31122025|T04|',
      '|L990|6|',
    ]);
    expect(lines.some((l) => /^\|L(100|200|210|300)\|/.test(l))).toBe(false);
  });
});

describe('ecfReal — Bloco M (itens 7/8/13, Fork 4→b)', () => {
  it('item 7: sem ajustes e sem Parte B, M001=0 + M030 × 4 + M990=6 — a estrutura de períodos vem do Bloco 0 (p.241)', () => {
    const lines = buildEcfRealFile(sampleInput({ lalur: [], parteB: [] }));
    const M = lines.filter((l) => l.startsWith('|M'));
    expect(M[0]).toBe('|M001|0|');
    expect(M.filter((l) => l.startsWith('|M030|'))).toHaveLength(4);
    expect(M[M.length - 1]).toBe('|M990|6|');
    expect(M).toHaveLength(6);
  });

  it('item 8: M300 = |M300|CODIGO|DESCRICAO(catálogo)|TIPO(derivado)|IND_RELACAO|VALOR|HIST| sob o M030 do trimestre', () => {
    const lines = buildEcfRealFile(sampleInput());
    expect(lines).toContain('|M300|7|Custos não dedutíveis|A|4|1234,56|Custos do T1|');
    const iM030T01 = lines.indexOf('|M030|01012025|31032025|T01|');
    const iM030T02 = lines.indexOf('|M030|01042025|30062025|T02|');
    const i7 = lines.indexOf('|M300|7|Custos não dedutíveis|A|4|1234,56|Custos do T1|');
    expect(i7).toBeGreaterThan(iM030T01);
    expect(i7).toBeLessThan(iM030T02);
    // A compensação (T02) fica sob o M030 de T02.
    const iP = lines.indexOf('|M300|175|Compensação teste|P|1|7,00||');
    expect(iP).toBeGreaterThan(iM030T02);
  });

  it('filhos por IND_RELACAO (REGRA_RELACAO_INEXISTENTE p.247) com sinal DERIVADO (REGRA_PEA p.250 / conversão p.246)', () => {
    const lines = buildEcfRealFile(sampleInput());
    // indRelacao=2 (conta contábil) ⇒ só M310; exclusão em conta de resultado ⇒ 'C'
    const i166 = lines.indexOf('|M300|166|Exclusão teste|E|2|500,00||');
    expect(lines[i166 + 1]).toBe('|M310|3.1.1||500,00|C|');
    expect(lines[i166 + 2].startsWith('|M305|')).toBe(false);
    // indRelacao=1 (Parte B) ⇒ só M305; compensação ⇒ 'C' (credita a Parte B)
    const i175 = lines.indexOf('|M300|175|Compensação teste|P|1|7,00||');
    expect(lines[i175 + 1]).toBe('|M305|PF-2024|7,00|C|');
    expect(lines[i175 + 2].startsWith('|M310|')).toBe(false);
    // lacs, indRelacao=3 ⇒ M355 + M360; adição ⇒ Parte B 'D'; conta patrimonial (01) em adição ⇒ 'C'
    const iLacs = lines.indexOf('|M350|7|Custos não dedutíveis|A|3|9,99||');
    expect(lines[iLacs + 1]).toBe('|M355|BC-2024|9,99|D|');
    expect(lines[iLacs + 2]).toBe('|M360|1.1.1||9,99|C|');
    // indRelacao=4 ⇒ nenhum filho (a próxima linha é outro M300)
    const i7 = lines.indexOf('|M300|7|Custos não dedutíveis|A|4|1234,56|Custos do T1|');
    expect(lines[i7 + 1].startsWith('|M300|')).toBe(true);
  });

  it('tabela de sinais dos filhos (p.246/p.250) — exaustiva sobre TIPO × natureza', () => {
    expect(indVlCtaParteB('A')).toBe('D');
    expect(indVlCtaParteB('L')).toBe('D');
    expect(indVlCtaParteB('E')).toBe('C');
    expect(indVlCtaParteB('P')).toBe('C');
    for (const tipo of ['A', 'L'] as const) {
      expect(indVlCtaContabil(tipo, '04')).toBe('D');
      for (const nat of ['01', '02', '03']) expect(indVlCtaContabil(tipo, nat)).toBe('C');
    }
    for (const tipo of ['E', 'P'] as const) {
      expect(indVlCtaContabil(tipo, '04')).toBe('C');
      for (const nat of ['01', '02', '03']) expect(indVlCtaContabil(tipo, nat)).toBe('D');
    }
  });

  it('item 8 (tabela-dirigido): para TODO código E do catálogo M300A/M350A, TIPO_LANCAMENTO no arquivo == TIPO LANÇ do XLSX', () => {
    for (const [livro, reg] of [['lalur', 'M300'], ['lacs', 'M350']] as const) {
      for (const r of linhasDoLivro(livro)) {
        if (r.tipo !== 'E') continue;
        const line = buildParteALine(reg, { livro, perApur: 'T01', codigo: r.codigo, descricao: r.descricao, tipoLancamento: r.tipoLanc!, indRelacao: '4', valorCents: 100 });
        expect(line.split('|')[4]).toBe(r.tipoLanc);
        expect(line.split('|')[3]).toBe(r.descricao);
      }
    }
  });

  it('item 13 (M010): |M010|COD_CTA_B|DESC|DT_AP_LAL|COD_PB_RFB|DT_LIM_LAL|COD_TRIBUTO|VL_SALDO_INI|IND|CNPJ_SIT_ESP| antes do 1º M030', () => {
    const lines = buildEcfRealFile(sampleInput());
    expect(lines).toContain('|M010|PF-2024|Prejuízo fiscal 2024|31122024|1000||I|5000,00|D||');
    expect(lines).toContain('|M010|BC-2024|BC negativa 2024|31032025|1003|31122030|C|0,00|D|11111111000191|');
    expect(lines.indexOf('|M010|PF-2024|Prejuízo fiscal 2024|31122024|1000||I|5000,00|D||')).toBeLessThan(lines.indexOf('|M030|01012025|31032025|T01|'));
    expect(buildM010({ codCtaB: 'X', descricao: 'Y', dtApLal: '2025-03-31', codPbRfb: '1005', codTributo: 'C', saldoIniCents: 1, indSaldoIni: 'C' })).toBe('|M010|X|Y|31032025|1005||C|0,01|C||');
  });

  it('M990 conta as linhas do bloco (auto-inclusivo)', () => {
    const lines = buildEcfRealFile(sampleInput());
    const M = lines.filter((l) => l.startsWith('|M'));
    expect(M[M.length - 1]).toBe(`|M990|${M.length}|`);
  });
});

describe('ecfReal — Bloco N (itens 14/15, Fork 3→a)', () => {
  it('item 15: sem deduções, N tem só 001/030×4/990', () => {
    const lines = buildEcfRealFile(sampleInput({ lalur: [] }));
    const N = lines.filter((l) => l.startsWith('|N'));
    expect(N).toEqual(['|N001|0|', '|N030|01012025|31032025|T01|', '|N030|01042025|30062025|T02|', '|N030|01072025|30092025|T03|', '|N030|01102025|31122025|T04|', '|N990|6|']);
  });

  it('linhas E de N500/N630 saem sob o N030 do trimestre: |N630|CODIGO|DESCRICAO|VALOR|', () => {
    const lines = buildEcfRealFile(sampleInput());
    const iT03 = lines.indexOf('|N030|01072025|30092025|T03|');
    const iT04 = lines.indexOf('|N030|01102025|31122025|T04|');
    expect(lines.indexOf('|N500|2|Estimativa|25,00|')).toBeGreaterThan(iT03);
    expect(lines.indexOf('|N500|2|Estimativa|25,00|')).toBeLessThan(iT04);
    expect(lines.indexOf('|N630|4|PAT|10,00|')).toBeGreaterThan(iT04);
    expect(buildNLine('N670', { livro: 'n670', perApur: 'T01', codigo: '9', descricao: 'X', valorCents: 5 })).toBe('|N670|9|X|0,05|');
  });

  it('item 14 (tabela-dirigido): NENHUM código CNA/CA/R de N500/N630A/N670 aparece no arquivo, mesmo com todas as linhas E preenchidas', () => {
    const all: EcfRealLalurLine[] = [];
    for (const livro of ['n500', 'n630', 'n670'] as const) {
      for (const r of linhasDoLivro(livro)) if (r.tipo === 'E') all.push({ livro, perApur: 'T01', codigo: r.codigo, descricao: r.descricao, valorCents: 100 });
    }
    const lines = buildEcfRealFile(sampleInput({ lalur: all }));
    for (const [livro, reg] of [['n500', 'N500'], ['n630', 'N630'], ['n670', 'N670']] as const) {
      for (const r of linhasDoLivro(livro)) {
        if (r.tipo === 'E') expect(lines.some((l) => l.startsWith(`|${reg}|${r.codigo}|`))).toBe(true);
        else expect(lines.some((l) => l.startsWith(`|${reg}|${r.codigo}|`))).toBe(false);
      }
    }
    expect(ECF_L12_CATALOG.abas.N630A.filter((r) => r.tipo === 'CNA')).toHaveLength(15);
  });

  it('disciplina: nenhuma alíquota/adicional literal em ecfReal.ts (0,15 · 0,09 · 20000 · 15% · 9%)', () => {
    const src = readFileSync(resolve(__dirname, '..', 'ecfReal.ts'), 'utf8');
    for (const token of ['0.15', '0,15', '0.09', '0,09', '20000', '15%', '9%', '240000']) {
      expect(src.includes(token)).toBe(false);
    }
  });
});

describe('ecfReal — transversais (item 16)', () => {
  it('is byte-deterministic (same input → same sha256) e CRLF em toda linha', () => {
    const a = serializeEcf(buildEcfRealFile(sampleInput()));
    const b = serializeEcf(buildEcfRealFile(sampleInput()));
    expect(sha(a)).toBe(sha(b));
    expect(a.endsWith('\r\n')).toBe(true);
    for (const line of a.split('\r\n').filter(Boolean)) {
      expect(line.startsWith('|')).toBe(true);
      expect(line.endsWith('|')).toBe(true);
    }
  });

  it('ordem canônica dos blocos; C/E/J/K/P/Q/S/T/U/V/W/X/Y seguem marcadores vazios', () => {
    const lines = buildEcfRealFile(sampleInput());
    const openers = regsOf(lines).filter((r) => /^[0-9A-Z]001$/.test(r));
    expect(openers).toEqual(['0001', 'C001', 'E001', 'J001', 'K001', 'L001', 'M001', 'N001', 'P001', 'Q001', 'S001', 'T001', 'U001', 'V001', 'W001', 'X001', 'Y001', '9001']);
    for (const b of ['C', 'E', 'J', 'K', 'P', 'Q', 'S', 'T', 'U', 'V', 'W', 'X', 'Y']) {
      expect(lines.filter((l) => l.startsWith(`|${b}`))).toEqual([`|${b}001|1|`, `|${b}990|2|`]);
    }
  });

  it('9900 é auto-referente e conta os registros novos (L030 M010 M030 M300 M305 M310 M350 M355 M360 N030 N500 N630); 9999 = total', () => {
    const lines = buildEcfRealFile(sampleInput());
    expect(lines[lines.length - 1]).toBe(`|9999|${lines.length}|`);
    const count = (reg: string) => lines.filter((l) => l.startsWith(`|${reg}|`)).length;
    for (const reg of ['L030', 'M010', 'M030', 'M300', 'M305', 'M310', 'M350', 'M355', 'M360', 'N030', 'N500', 'N630']) {
      expect(count(reg)).toBeGreaterThan(0);
      expect(lines).toContain(`|9900|${reg}|${count(reg)}|||`);
    }
    const nine900 = lines.filter((l) => l.startsWith('|9900|'));
    const types = new Set(regsOf(lines));
    expect(nine900).toHaveLength(types.size);
    expect(lines).toContain(`|9900|9900|${types.size}|||`);
    expect(lines).toContain('|0990|8|');
  });

  it('datas por slice literal (DDMMAAAA) e valores por centavos — nunca Date/locale nem float', () => {
    expect(buildPeriodReg('N030', { perApur: 'T02', dtIni: '2025-04-01', dtFin: '2025-06-30' })).toBe('|N030|01042025|30062025|T02|');
    expect(buildParteBChild('M305', { livro: 'lalur', perApur: 'T01', codigo: '7', descricao: 'x', tipoLancamento: 'A', indRelacao: '1', valorCents: 1, codCtaB: 'B' })).toBe('|M305|B|0,01|D|');
    expect(buildContabilChild('M360', { livro: 'lacs', perApur: 'T01', codigo: '7', descricao: 'x', tipoLancamento: 'E', indRelacao: '2', valorCents: 123456789, codCta: 'C', codNat: '04' })).toBe('|M360|C||1234567,89|C|');
    expect(() => buildParteBChild('M305', { livro: 'lalur', perApur: 'T01', codigo: '7', descricao: 'x', tipoLancamento: 'A', valorCents: 1 })).toThrow(/codCtaB/);
  });
});

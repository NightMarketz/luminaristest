/**
 * SPED ECF (Fiscal · Lucro Presumido) serializer (ADR-INCR-SPED-ECF, FASE 2).
 *
 * Pure, format-critical logic. Pins the manual-ratified rules (Leiaute 12, ADE
 * Cofis 02/2026):
 *  - money reuses the ECD primitive: comma-decimal, NO thousands sep, no float;
 *  - date YYYY-MM-DD -> DDMMYYYY by literal slice (no UTC day-shift);
 *  - Luminaris emits ONLY receita-bruta `E`-lines (P200/P400); the PVA computes
 *    every presunção/tax line (ADR D2 invertido) — no tax math here;
 *  - block open carries IND_DAD ('0' com dados / '1' vazio);
 *  - 9900 is 5-field (VERSAO/ID_TAB_DIN empty); counting is self-referential;
 *  - same input -> byte-identical file (sha256 pin).
 */
import { createHash } from 'crypto';
import {
  buildBlockOpen,
  buildBlockClose,
  buildP030,
  buildPLine,
  build9900,
  build0010,
  build0020,
  buildEcfFile,
  serializeEcf,
  __selfCheck,
  P_LINE,
  resolveEcfCodVer,
  buildY600,
  ordenarY600,
  Y600_MAX_VIGENTES,
  Y600_MAX_ALTERACOES,
  type EcfFileInput,
  type Y600Row,
} from '../ecf';
import { LEGAIS_SEMENTE } from '@test/helpers/legalParams';

const sampleInput = (): EcfFileInput => ({
  declarant: {
    codVer: resolveEcfCodVer(2025, LEGAIS_SEMENTE), // BE-INCR-LEGAL-PARAMS PR-2: tabela LEIAUTE_SPED
    cnpj: '11111111000191',
    nome: 'SALAO TESTE LTDA',
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
    email: 'salao@teste.com',
  },
  signers: [
    { identNom: 'CONTADOR TESTE', identCpfCnpj: '12345678900', identQualif: '900', indCrc: '1DF123456', email: 'contador@teste.com', fone: '6133334444' },
    { identNom: 'SOCIO TESTE', identCpfCnpj: '98765432100', identQualif: '205', email: 'socio@teste.com', fone: '6133335555' },
  ],
  quarters: [
    { perApur: 'T01', dtIni: '2025-01-01', dtFin: '2025-03-31', servicoCents: 15000000, revendaCents: 5000000 },
    { perApur: 'T02', dtIni: '2025-04-01', dtFin: '2025-06-30', servicoCents: 18000000, revendaCents: 0 },
    { perApur: 'T03', dtIni: '2025-07-01', dtFin: '2025-09-30', servicoCents: 20000000, revendaCents: 7000000 },
    { perApur: 'T04', dtIni: '2025-10-01', dtFin: '2025-12-31', servicoCents: 22000000, revendaCents: 8000000 },
  ],
  y600: [],
});

describe('ecf serializer — self-check', () => {
  it('__selfCheck passes', () => {
    expect(() => __selfCheck()).not.toThrow();
  });
});

describe('ecf primitives', () => {
  it('P030 emits the trimester period, dates by literal slice', () => {
    expect(buildP030('2025-01-01', '2025-03-31', 'T01')).toBe('|P030|01012025|31032025|T01|');
  });

  it('P200/P400 receita-bruta lines: REG|CODIGO|(desc vazia)|VALOR, no float', () => {
    // 320.055,99 → integer cents, comma decimal, no thousands sep.
    expect(buildPLine('P200', '8', 32005599)).toBe('|P200|8||320055,99|');
    expect(buildPLine('P400', '2', 100)).toBe('|P400|2||1,00|');
  });

  it('activity→line map segregates 3.1 (serviço) vs 3.3 (revenda)', () => {
    expect(P_LINE.servico).toEqual({ p200: '8', p400: '4' }); // 32% IRPJ & 32% CSLL
    expect(P_LINE.revenda).toEqual({ p200: '4', p400: '2' }); // 8% IRPJ & 12% CSLL
  });

  it('9900 is 5-field with empty VERSAO/ID_TAB_DIN', () => {
    expect(build9900('P200', 4)).toBe('|9900|P200|4|||');
  });

  it('block open carries IND_DAD; empty block = 1, data block = 0', () => {
    expect(buildBlockOpen('C001', false)).toBe('|C001|1|');
    expect(buildBlockOpen('P001', true)).toBe('|P001|0|');
    expect(buildBlockClose('P990', 7)).toBe('|P990|7|');
  });

  it('0010 defaults to Lucro Presumido trimestral, TIP_ESC_PRE=C', () => {
    // REG|HASH|OPT_REFIS|FORMA_TRIB(5)|FORMA_APUR(T)|COD_QUALIF(01)|FORMA_TRIB_PER(PPPP)|MES_BAL_RED|TIP_ESC_PRE(C)|TIP_ENT|FORMA_APUR_I|APUR_CSLL|IND_REC_RECEITA(2)
    expect(build0010()).toBe('|0010||N|5|T|01|PPPP||C||||2|');
  });

  it('0020 defaults to IND_ALIQ_CSLL=1 (9%), all flags N, CEBAS empty', () => {
    const line = build0020();
    expect(line.startsWith('|0020|1|0|')).toBe(true);
    expect(line.endsWith('|N||')).toBe(true); // POSSUI_CEBAS=N, CEBAS empty
    // 32 fields → 33 pipes.
    expect(line.split('|').length).toBe(34);
  });

  it('COD_VER 2025 = 0012 (leiaute 12), lido da tabela LEIAUTE_SPED; 2026 sem linha ⇒ throw', () => {
    expect(resolveEcfCodVer(2025, LEGAIS_SEMENTE)).toBe('0012');
    expect(() => resolveEcfCodVer(2026, LEGAIS_SEMENTE)).toThrow(/LEIAUTE_SPED/);
  });
});

describe('ecf file assembler', () => {
  it('is byte-deterministic (same input → same sha256)', () => {
    const a = serializeEcf(buildEcfFile(sampleInput()));
    const b = serializeEcf(buildEcfFile(sampleInput()));
    expect(sha(a)).toBe(sha(b));
  });

  it('ends every line with CRLF, including the last', () => {
    const out = serializeEcf(buildEcfFile(sampleInput()));
    expect(out.endsWith('\r\n')).toBe(true);
    for (const line of out.split('\r\n').filter(Boolean)) {
      expect(line.startsWith('|')).toBe(true);
      expect(line.endsWith('|')).toBe(true);
    }
  });

  it('emits 0000 first and 9999 last, in canonical block order', () => {
    const lines = buildEcfFile(sampleInput());
    expect(lines[0].startsWith('|0000|')).toBe(true);
    expect(lines[lines.length - 1].startsWith('|9999|')).toBe(true);
    const regs = lines.map((l) => l.split('|')[1]);
    // canonical order of block openers
    const openers = regs.filter((r) => /^(0001|C001|E001|J001|K001|L001|M001|N001|P001|Q001|S001|T001|U001|V001|W001|X001|Y001|9001)$/.test(r));
    expect(openers).toEqual([
      '0001', 'C001', 'E001', 'J001', 'K001', 'L001', 'M001', 'N001',
      'P001', 'Q001', 'S001', 'T001', 'U001', 'V001', 'W001', 'X001', 'Y001', '9001',
    ]);
  });

  it('recovered/irrelevant blocks are empty markers (IND_DAD=1, close qty 2)', () => {
    const lines = buildEcfFile(sampleInput());
    for (const b of ['C', 'E', 'J', 'K', 'L', 'M', 'N', 'Q', 'S', 'T', 'U', 'V', 'W', 'X', 'Y']) {
      expect(lines).toContain(`|${b}001|1|`);
      expect(lines).toContain(`|${b}990|2|`);
    }
  });

  it('segregates receita bruta per trimester: 3.1→P200(8)/P400(4), 3.3→P200(4)/P400(2)', () => {
    const lines = buildEcfFile(sampleInput());
    // T01 serviço 150.000,00 and revenda 50.000,00
    expect(lines).toContain('|P200|8||150000,00|'); // serviço IRPJ 32%
    expect(lines).toContain('|P400|4||150000,00|'); // serviço CSLL 32%
    expect(lines).toContain('|P200|4||50000,00|'); // revenda IRPJ 8%
    expect(lines).toContain('|P400|2||50000,00|'); // revenda CSLL 12%
  });

  it('L10: dentro de cada P030, todos os P200 vêm antes de qualquer P400', () => {
    // PVA ECF 12.2.7, 22/10 (RUNBOOK-H1 passo 6, tentativa 1): com P200 e P400 intercalados por atividade, as 8 linhas
    // de revenda (P200 depois de um P400) deram "Organização hierárquica ... fora dos padrões" (esperado: P500).
    const lines = buildEcfFile(sampleInput());
    const regs = lines.map((l) => l.split('|')[1]);
    const periods = regs.flatMap((r, i) => (r === 'P030' ? [i] : []));
    const p990 = regs.indexOf('P990');
    const bad = periods.flatMap((start, k) => {
      const block = regs.slice(start + 1, periods[k + 1] ?? p990);
      const firstP400 = block.indexOf('P400');
      return firstP400 >= 0 && block.lastIndexOf('P200') > firstP400 ? [`${lines[start]} → ${block.join(',')}`] : [];
    });
    expect(bad).toEqual([]);
  });

  it('omits receita lines when the activity has zero movement (0:N)', () => {
    const lines = buildEcfFile(sampleInput());
    const t02Idx = lines.indexOf('|P030|01042025|30062025|T02|');
    const t03Idx = lines.indexOf('|P030|01072025|30092025|T03|');
    const t02Block = lines.slice(t02Idx, t03Idx);
    // T02 has revenda=0 → no revenda lines (P200(4)/P400(2)) in this period.
    expect(t02Block.some((l) => l === '|P200|4||0,00|')).toBe(false);
    expect(t02Block.some((l) => l.startsWith('|P200|8|'))).toBe(true); // serviço present
  });

  it('9900 counts every register type present, self-referentially', () => {
    const lines = buildEcfFile(sampleInput());
    const total = lines.length;
    // 9999 records the grand total (self-inclusive).
    expect(lines[lines.length - 1]).toBe(`|9999|${total}|`);
    // 9900 for 0000 must exist and equal 1.
    expect(lines).toContain('|9900|0000|1|||');
    // block-close counters are consistent: P990 count == lines in block P.
    const p001 = lines.indexOf('|P001|0|');
    const p990Line = lines.find((l) => l.startsWith('|P990|'))!;
    const p990Count = Number(p990Line.split('|')[2]);
    const p990Idx = lines.indexOf(p990Line);
    expect(p990Count).toBe(p990Idx - p001 + 1);
  });
});

function sha(s: string): string {
  return createHash('sha256').update(Buffer.from(s, 'latin1')).digest('hex');
}

// ─── L11 (RUNBOOK-H1): Y600 — BE-INCR-ECF-Y600 itens 1–3; Manual ECF L12 (maio/2026) pp. 570–575 ───────────

/** Linha do exemplo da p. 575 (FULANO SÓCIO, 60%, valores do exemplo). */
const fulano = (over: Partial<Y600Row> = {}): Y600Row => ({
  dtAltSoc: '2012-01-01',
  pais: '105',
  indQualifSocio: 'PF',
  cpfCnpj: '00000000000',
  nome: 'FULANO SÓCIO',
  qualif: '01',
  percCapTotBp: 6000,
  percCapVotBp: 6000,
  remTrabCents: 10000000,
  lucDivCents: 1000000,
  jurCapCents: 500000,
  demRendCents: 300000,
  irRetCents: 900000,
  ...over,
});

describe('L11: Y600', () => {
  it('item 1: exemplo da p. 575 acrescido do campo 3 (DT_FIM_SOC) vazio — 17 campos na ordem da tabela (P1 do BRIEF)', () => {
    // Exemplo do Manual (16 campos): |Y600|01012012|105|PF|00000000000|FULANO SÓCIO|01|60,00|60,00|||100000,00|10000,00|5000,00|3000,00|9000,00|
    const line = buildY600(fulano());
    expect(line).toBe('|Y600|01012012||105|PF|00000000000|FULANO SÓCIO|01|60,00|60,00|||100000,00|10000,00|5000,00|3000,00|9000,00|');
    expect(line.split('|').length - 2).toBe(17);
  });

  it('item 1: saída no ano preenche DT_FIM_SOC (campo 3) em ddmmaaaa', () => {
    expect(buildY600(fulano({ dtFimSoc: '2025-07-31' })).split('|')[3]).toBe('31072025');
  });

  it('item 1: 100% sai "100" (pp. 572–573) nos dois percentuais; valores zero saem 0,00 (p. 570)', () => {
    const f = buildY600(
      fulano({ percCapTotBp: 10000, percCapVotBp: 10000, remTrabCents: 0, lucDivCents: 0, jurCapCents: 0, demRendCents: 0, irRetCents: 0 }),
    ).split('|');
    expect(f[9]).toBe('100');
    expect(f[10]).toBe('100');
    expect(f.slice(13, 18)).toEqual(['0,00', '0,00', '0,00', '0,00', '0,00']);
  });

  it('item 1: não residente sai com o PAIS informado e CPF_CNPJ vazio (REGRA_OBRIGATORIO_BRASIL, p. 574)', () => {
    const f = buildY600(fulano({ pais: '249', qualif: '05', cpfCnpj: '52998224725' })).split('|');
    expect(f[4]).toBe('249');
    expect(f[6]).toBe('');
  });

  it('item 1: CPF_REP_LEG e QUALIF_REP_LEG saem juntos ou nenhum (REGRA_QUALIF_REP_LEG_OBRIGATORIO, p. 574)', () => {
    const com = buildY600(fulano({ cpfRepLeg: '52998224725', qualifRepLeg: '01' })).split('|');
    expect([com[11], com[12]]).toEqual(['52998224725', '01']);
    const meio = buildY600(fulano({ cpfRepLeg: '52998224725' })).split('|');
    expect([meio[11], meio[12]]).toEqual(['', '']);
  });

  it('item 2: com Y600, Y001 IND_DAD=0, Y990 auto-inclusivo, 9900|Y600 e 9999 consistentes; Y sai depois de X', () => {
    const rows = [fulano(), fulano({ nome: 'BELTRANA', cpfCnpj: '52998224725', percCapTotBp: 4000, percCapVotBp: 4000 })];
    const lines = buildEcfFile({ ...sampleInput(), y600: rows });
    const y001 = lines.indexOf('|Y001|0|');
    expect(y001).toBe(lines.indexOf('|X990|2|') + 1);
    expect(lines.slice(y001 + 1, y001 + 3)).toEqual(rows.map(buildY600));
    expect(lines[y001 + 3]).toBe('|Y990|4|');
    expect(lines).not.toContain('|Y001|1|');
    expect(lines).toContain('|9900|Y600|2|||');
    expect(lines[lines.length - 1]).toBe(`|9999|${lines.length}|`);
    const types = lines.filter((l) => l.startsWith('|9900|')).length;
    expect(lines).toContain(`|9900|9900|${types}|||`);
  });

  it('item 2: determinismo estendido com Y600 (mesma entrada ⇒ mesmo sha256)', () => {
    const input = (): EcfFileInput => ({ ...sampleInput(), y600: [fulano(), fulano({ nome: 'BELTRANA', cpfCnpj: '52998224725' })] });
    expect(sha(serializeEcf(buildEcfFile(input())))).toBe(sha(serializeEcf(buildEcfFile(input()))));
  });

  it('item 3 (F-Y600-6): vigentes por total decrescente, depois as demais por DT_ALT_SOC decrescente; desempate NOM_EMP, CPF_CNPJ', () => {
    const zero = { remTrabCents: 0, lucDivCents: 0, jurCapCents: 0, demRendCents: 0, irRetCents: 0 };
    const a = fulano({ ...zero, nome: 'A', cpfCnpj: '2', remTrabCents: 100 });
    const b = fulano({ ...zero, nome: 'B', cpfCnpj: '1', lucDivCents: 300, irRetCents: 999999 }); // IR não entra no total
    const c1 = fulano({ ...zero, nome: 'C', cpfCnpj: '2', jurCapCents: 100 });
    const c0 = fulano({ ...zero, nome: 'C', cpfCnpj: '1', demRendCents: 100 });
    const velha = fulano({ ...zero, nome: 'Z', dtAltSoc: '2020-01-01', remTrabCents: 999999 });
    const nova = fulano({ ...zero, nome: 'Y', dtAltSoc: '2025-03-01' });
    const novaB = fulano({ ...zero, nome: 'X', dtAltSoc: '2025-03-01' });
    const out = ordenarY600([
      { row: velha, vigenteNoFim: false },
      { row: c1, vigenteNoFim: true },
      { row: a, vigenteNoFim: true },
      { row: nova, vigenteNoFim: false },
      { row: b, vigenteNoFim: true },
      { row: novaB, vigenteNoFim: false },
      { row: c0, vigenteNoFim: true },
    ]);
    expect(out).toEqual([b, a, c0, c1, novaB, nova, velha]);
  });

  it('item 3 (F-Y600-6): acima de 500 vigentes ou 499 demais lança ECF_Y600_LIMITE — nunca trunca', () => {
    const n = (k: number, vigenteNoFim: boolean) => Array.from({ length: k }, (_, i) => ({ row: fulano({ nome: `S${i}` }), vigenteNoFim }));
    expect(ordenarY600([...n(Y600_MAX_VIGENTES, true), ...n(Y600_MAX_ALTERACOES, false)])).toHaveLength(999);
    expect(() => ordenarY600(n(Y600_MAX_VIGENTES + 1, true))).toThrow(/ECF_Y600_LIMITE/);
    expect(() => ordenarY600(n(Y600_MAX_ALTERACOES + 1, false))).toThrow(/ECF_Y600_LIMITE/);
  });
});
